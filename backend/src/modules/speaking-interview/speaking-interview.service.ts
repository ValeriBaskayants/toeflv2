import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { AzureSpeechService } from '../azure-speech/azure-speech.service';
import { mapAzureError } from '../../common/utils/map-azure-error.util';
import { prepareSpeechAudio } from '../speaking-repeat/utils/transcode-audio';
import { countGrammarIssues } from './utils/grammar-check';
import {
  INTERVIEW_QUESTION_COUNT,
  INTERVIEW_TIMING,
  MAX_ITEM_SCORE,
  MIN_SPEECH_DURATION_SEC,
  TOEFL_PICK_MASTERY_PERCENT,
} from '../../constants/speaking-constants';
import { buildEmptyInterviewResult, computeInterviewItemScore } from '../../constants/interview-scoring';
import { computeXP, isSessionCountable, XP_BASE } from '../../constants/level-requirements';
import { EXAM_LEVEL_RANGE, isGuidedLevel, resolvePracticePolicy } from '../../constants/level-policy';
import { computeSpacedWeight, weightedPickOne } from '../../common/utils/spaced-selection.util';
import type { CreateInterviewSetDto, GetInterviewSetsDto } from './dto/interview.dto';

interface InterviewItemResultEntity {
  questionId: string;
  questionText: string;
  recognizedText: string;
  durationSec: number;
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  vocabularyDiversity: number;
  grammarIssueCount: number | null;
  fluencyScore: number;
  intelligibilityScore: number;
  languageUseScore: number;
  organizationScore: number;
  estimatedScore: number;
  userAudioBase64: string;
  userAudioMimeType: string;
  attemptedAt: string;
}

interface OrderedQuestion {
  id: string;
  text: string;
}

@Injectable()
export class SpeakingInterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly azureSpeech: AzureSpeechService,
  ) {}

  async findAll(query: GetInterviewSetsDto) {
    const where: Prisma.SpeakingInterviewSetWhereInput = {};
    if (query.level !== undefined) where.level = query.level;

    return this.prisma.speakingInterviewSet.findMany({
      where,
      select: { id: true, topic: true, level: true, createdAt: true, _count: { select: { questions: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async startSession(userId: string, setId: string) {
    const set = await this.findSetWithQuestionsOrThrow(setId);

    if (set.questions.length !== INTERVIEW_QUESTION_COUNT) {
      throw new BadRequestException(`Interview set must contain exactly ${INTERVIEW_QUESTION_COUNT} questions`);
    }

    await this.prisma.speakingInterviewSession.updateMany({
      where: { userId, setId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const session = await this.prisma.speakingInterviewSession.create({
      data: { userId, setId, results: [], playedItemIds: [] },
      select: { id: true, startedAt: true },
    });

    return {
      session,
      topic: set.topic,
      responseWindowSec: INTERVIEW_TIMING.recordingWindowSec,
      // 'end-only' — оценки скрыты до конца (строгая зона); 'per-item' — обучающее послабление.
      feedbackMode: isGuidedLevel(set.level) ? 'per-item' : 'end-only',
      timing: { pauseBeforeBeepMs: INTERVIEW_TIMING.pauseBeforeBeepMs, beepDurationMs: INTERVIEW_TIMING.beepDurationMs },
      questions: set.questions.map((q) => ({ id: q.id, orderIndex: q.orderIndex })),
    };
  }

  // Кнопка TOEFL Take an Interview: сама выбирает набор строгой зоны, без выбора уровня.
  async startToeflModeSession(userId: string) {
    const sets = await this.prisma.speakingInterviewSet.findMany({
      where: { level: { in: [...EXAM_LEVEL_RANGE] } },
      select: { id: true },
    });
    if (sets.length === 0) {
      throw new BadRequestException('No TOEFL-format Take an Interview sets available yet.');
    }

    const sessions = await this.prisma.speakingInterviewSession.findMany({
      where: { userId, setId: { in: sets.map((s) => s.id) }, status: 'COMPLETED' },
      select: { setId: true, finalScore: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    const lastBySet = new Map<string, { finalScore: number; completedAt: Date }>();
    for (const s of sessions) {
      if (!lastBySet.has(s.setId)) lastBySet.set(s.setId, { finalScore: s.finalScore ?? 0, completedAt: s.completedAt! });
    }

    const candidates = sets.map((s) => {
      const last = lastBySet.get(s.id);
      const weight = computeSpacedWeight({
        id: s.id,
        lastOutcome: last === undefined ? undefined : last.finalScore >= TOEFL_PICK_MASTERY_PERCENT ? 'correct' : 'incorrect',
        lastAttemptAt: last?.completedAt,
      });
      return { id: s.id, weight };
    });

    const picked = weightedPickOne(candidates);
    if (picked === null) throw new BadRequestException('No sets available right now — try again later.');

    return this.startSession(userId, picked.id);
  }

  async getQuestionAudio(userId: string, sessionId: string, questionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const [set, questions] = await Promise.all([
      this.prisma.speakingInterviewSet.findUnique({ where: { id: session.setId }, select: { voiceId: true, level: true } }),
      this.getOrderedQuestions(session.setId),
    ]);
    if (set === null) throw new NotFoundException('Interview set not found');

    const index = questions.findIndex((q) => q.id === questionId);
    const question = questions[index];
    if (question === undefined) throw new BadRequestException("Question does not belong to this session's set");

    // Интервью линейное: следующий вопрос — только после ответа на предыдущий.
    if (index !== this.readResults(session.results).length) {
      throw new BadRequestException('Questions must be played in order — as on the real test.');
    }
    if (session.playedItemIds.includes(questionId)) {
      throw new ForbiddenException('This question can only be played once, as on the real TOEFL test.');
    }

    // Синтез — ДО списания единственного прослушивания. Guided — замедленная речь, с B1 — естественный темп.
    const rate = resolvePracticePolicy(set.level, 1.0).rate;
    let audioBase64: string;
    try {
      audioBase64 = (await this.azureSpeech.synthesize(question.text, set.voiceId, rate)).audioBase64;
    } catch (err: unknown) {
      throw mapAzureError(err);
    }

    const claim = await this.prisma.speakingInterviewSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS', NOT: { playedItemIds: { has: questionId } } },
      data: { playedItemIds: { push: questionId } },
    });
    if (claim.count === 0) {
      throw new ForbiddenException('This question can only be played once, as on the real TOEFL test.');
    }

    return {
      audioBase64,
      responseWindowSec: INTERVIEW_TIMING.recordingWindowSec,
      pauseBeforeBeepMs: INTERVIEW_TIMING.pauseBeforeBeepMs,
      beepDurationMs: INTERVIEW_TIMING.beepDurationMs,
    };
  }

  async submitAnswer(userId: string, sessionId: string, questionId: string, rawAudioBuffer: Buffer, mimeType: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const [set, questions] = await Promise.all([
      this.prisma.speakingInterviewSet.findUnique({ where: { id: session.setId }, select: { level: true } }),
      this.getOrderedQuestions(session.setId),
    ]);
    if (set === null) throw new NotFoundException('Interview set not found');

    const index = questions.findIndex((q) => q.id === questionId);
    const question = questions[index];
    if (question === undefined) throw new BadRequestException('Question does not belong to this session');

    const results = this.readResults(session.results);
    if (index !== results.length) {
      throw new BadRequestException('Questions must be answered in order, each exactly once — as on the real test.');
    }
    if (!session.playedItemIds.includes(questionId)) {
      throw new BadRequestException('Listen to the question before answering.');
    }

    const audio = await prepareSpeechAudio(rawAudioBuffer, INTERVIEW_TIMING.recordingWindowSec);

    const entry = audio.durationSec < MIN_SPEECH_DURATION_SEC
      ? this.buildBlankEntry(question, audio.durationSec, rawAudioBuffer.toString('base64'), mimeType)
      : await this.scoreAnswer(question, audio, rawAudioBuffer, mimeType);

    const claim = await this.prisma.speakingInterviewSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS', NOT: { results: { some: { questionId } } } },
      data: { results: { push: entry } },
    });
    if (claim.count === 0) {
      throw new BadRequestException('This question was already answered and cannot be changed — as on the real test.');
    }

    const progress = { questionsAnswered: results.length + 1, totalQuestions: questions.length };

    // Строгая зона: оценка скрыта до конца интервью, как на реальном тесте.
    if (!isGuidedLevel(set.level)) return { recorded: true, ...progress };

    return {
      ...progress,
      estimatedScore: entry.estimatedScore,
      recognizedText: entry.recognizedText,
      wordsPerMinute: entry.wordsPerMinute,
      fillerWordCount: entry.fillerWordCount,
      fluencyScore: entry.fluencyScore,
      intelligibilityScore: entry.intelligibilityScore,
      languageUseScore: entry.languageUseScore,
      organizationScore: entry.organizationScore,
    };
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);
    const results = this.readResults(session.results);

    if (results.length < INTERVIEW_QUESTION_COUNT) {
      throw new BadRequestException(
        `All ${INTERVIEW_QUESTION_COUNT} questions must be answered before completing this session (${results.length}/${INTERVIEW_QUESTION_COUNT} answered).`,
      );
    }

    return this.finalizeSession(userId, session.id, session.setId, results, false);
  }

  // Завершить досрочно: неотвеченные вопросы считаются без ответа (0 баллов).
  async expireSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const questions = await this.getOrderedQuestions(session.setId);
    const results = this.readResults(session.results);
    const blanks = questions.slice(results.length).map((q) => this.buildBlankEntry(q, 0, '', 'audio/webm'));

    return this.finalizeSession(userId, session.id, session.setId, [...results, ...blanks], blanks.length > 0);
  }

  async getSessionReview(userId: string, sessionId: string) {
    const session = await this.prisma.speakingInterviewSession.findUnique({ where: { id: sessionId } });
    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    return session;
  }

  async bulkCreate(sets: CreateInterviewSetDto[]) {
    if (sets.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0 };

    const existing = await this.prisma.speakingInterviewSet.findMany({
      where: { OR: sets.map((s) => ({ level: s.level, topic: s.topic })) },
      select: { level: true, topic: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.level}:${e.topic}`));
    const toInsert = sets.filter((s) => !existingKeys.has(`${s.level}:${s.topic}`));

    for (const set of toInsert) {
      const questions = [...set.questions].sort((a, b) => a.orderIndex - b.orderIndex);
      await this.prisma.speakingInterviewSet.create({
        data: {
          topic: set.topic,
          level: set.level,
          voiceId: set.voiceId,
          // нормализуем: позиция == orderIndex
          questions: { create: questions.map((q, idx) => ({ text: q.text, orderIndex: idx })) },
        },
      });
    }

    return { totalProcessed: sets.length, inserted: toInsert.length, skipped: sets.length - toInsert.length };
  }

  // ─────────────── private ───────────────

  private readResults(raw: unknown): InterviewItemResultEntity[] {
    return (raw as InterviewItemResultEntity[] | null) ?? [];
  }

  private async scoreAnswer(
    question: OrderedQuestion,
    audio: { wav: Buffer; durationSec: number },
    rawAudio: Buffer,
    mimeType: string,
  ): Promise<InterviewItemResultEntity> {
    let recognizedText: string;
    try {
      recognizedText = (await this.azureSpeech.transcribe(audio.wav)).recognizedText;
    } catch (err: unknown) {
      throw mapAzureError(err);
    }

    if (recognizedText.trim() === '') {
      return this.buildBlankEntry(question, audio.durationSec, rawAudio.toString('base64'), mimeType);
    }

    // Акустика (разборчивость, беглость) — Azure Pronunciation Assessment по собственной расшифровке
    // ответа (приём для спонтанной речи; тратит квоту STT второй раз). Грамматика — параллельно.
    let acoustic;
    let grammarIssueCount: number | null;
    try {
      [acoustic, grammarIssueCount] = await Promise.all([
        this.azureSpeech.assessPronunciation(audio.wav, recognizedText),
        countGrammarIssues(recognizedText),
      ]);
    } catch (err: unknown) {
      throw mapAzureError(err);
    }

    const scored = computeInterviewItemScore({
      recognizedText,
      durationSec: audio.durationSec,
      azureFluencyScore: acoustic.fluencyScore,
      azureAccuracyScore: acoustic.accuracyScore,
      grammarIssueCount,
    });

    return {
      questionId: question.id,
      questionText: question.text,
      recognizedText,
      durationSec: Math.round(audio.durationSec * 10) / 10,
      wordCount: scored.wordCount,
      wordsPerMinute: scored.wordsPerMinute,
      fillerWordCount: scored.fillerWordCount,
      vocabularyDiversity: scored.vocabularyDiversity,
      grammarIssueCount,
      fluencyScore: scored.fluencyScore,
      intelligibilityScore: scored.intelligibilityScore,
      languageUseScore: scored.languageUseScore,
      organizationScore: scored.organizationScore,
      estimatedScore: scored.estimatedScore,
      userAudioBase64: rawAudio.toString('base64'),
      userAudioMimeType: mimeType,
      attemptedAt: new Date().toISOString(),
    };
  }

  private buildBlankEntry(
    question: OrderedQuestion,
    durationSec: number,
    audioBase64: string,
    mimeType: string,
  ): InterviewItemResultEntity {
    const empty = buildEmptyInterviewResult(durationSec);
    return {
      questionId: question.id,
      questionText: question.text,
      recognizedText: '',
      durationSec: Math.round(empty.durationSec * 10) / 10,
      wordCount: empty.wordCount,
      wordsPerMinute: empty.wordsPerMinute,
      fillerWordCount: empty.fillerWordCount,
      vocabularyDiversity: empty.vocabularyDiversity,
      grammarIssueCount: null,
      fluencyScore: empty.fluencyScore,
      intelligibilityScore: empty.intelligibilityScore,
      languageUseScore: empty.languageUseScore,
      organizationScore: empty.organizationScore,
      estimatedScore: empty.estimatedScore,
      userAudioBase64: audioBase64,
      userAudioMimeType: mimeType,
      attemptedAt: new Date().toISOString(),
    };
  }

  private async finalizeSession(
    userId: string,
    sessionId: string,
    setId: string,
    results: InterviewItemResultEntity[],
    persistResults: boolean,
  ) {
    const taskScore = Math.round((results.reduce((s, r) => s + r.estimatedScore, 0) / results.length) * 10) / 10;
    const finalScore = Math.round((taskScore / MAX_ITEM_SCORE) * 100);

    const [user, previousCompleted] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true } }),
      this.prisma.speakingInterviewSession.count({ where: { userId, setId, status: 'COMPLETED' } }),
    ]);
    const xpEarned = computeXP({ base: XP_BASE.SPEAKING_BASE, streak: user?.streak ?? 0, accuracy: finalScore });

    const claim = await this.prisma.speakingInterviewSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        taskScore,
        finalScore,
        xpEarned,
        ...(persistResults ? { results } : {}),
      },
    });
    if (claim.count === 0) throw new BadRequestException('Session was already completed');

    // Засчитываем в прогресс только первое прохождение набора — повторы не фармят требования уровня.
    const isFirstCompletion = previousCompleted === 0;
    if (isFirstCompletion && isSessionCountable(finalScore)) {
      await this.progress.recordSkillCompletion({ userId, skill: 'speaking', accuracy: finalScore, xpEarned });
    } else {
      await this.progress.recordActivity({
        userId,
        xpEarned: isFirstCompletion ? xpEarned : Math.max(1, Math.round(xpEarned * 0.3)),
        minutesSpent: 3,
      });
    }

    const completed = await this.prisma.speakingInterviewSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { id: true, status: true, taskScore: true, finalScore: true, xpEarned: true, startedAt: true, completedAt: true },
    });

    return {
      ...completed,
      rawPoints: results.reduce((sum, r) => sum + r.estimatedScore, 0),
      maxPoints: results.length * MAX_ITEM_SCORE,
    };
  }

  private async getOrderedQuestions(setId: string): Promise<OrderedQuestion[]> {
    return this.prisma.speakingInterviewQuestion.findMany({
      where: { setId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true, text: true },
    });
  }

  private async findSetWithQuestionsOrThrow(id: string) {
    const set = await this.prisma.speakingInterviewSet.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    if (set === null) throw new NotFoundException('Interview set not found');
    return set;
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.speakingInterviewSession.findUnique({ where: { id: sessionId } });
    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    }
    return session;
  }
}