import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Level, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { AzureSpeechService, AzureQuotaExceededError, AzureSttRequestError, AzureTtsRequestError } from '../azure-speech/azure-speech.service';
import { transcodeToWav16kMono } from '../speaking-repeat/utils/transcode-audio';
import { computeInterviewHeuristic, INTERVIEW_QUESTION_COUNT, INTERVIEW_RESPONSE_WINDOW_SEC } from '../../constants/interview-heuristics';
import { computeXP, isSessionCountable } from '../../constants/level-requirements';
import type { CreateInterviewSetDto, GetInterviewSetsDto } from './dto/interview.dto';
import { getListenRepeatTiming, INTERVIEW_TIMING } from 'src/constants/speaking-constants';

interface InterviewItemResultEntity {
  questionId: string;
  questionText: string;
  recognizedText: string;
  wordCount: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  vocabularyDiversity: number;
  estimatedScore: number;
  userAudioBase64: string;
  userAudioMimeType: string;
  attemptedAt: string;
}

@Injectable()
export class SpeakingInterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressService,
    private readonly azureSpeech: AzureSpeechService,
  ) { }

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
      responseWindowSec: INTERVIEW_RESPONSE_WINDOW_SEC,
      questions: set.questions.map((q) => ({ id: q.id, orderIndex: q.orderIndex })),
    };
  }

async getQuestionAudio(userId: string, sessionId: string, questionId: string) {
  const session = await this.getOwnedInProgressSession(userId, sessionId);

  const claim = await this.prisma.speakingInterviewSession.updateMany({
    where: { id: sessionId, NOT: { playedItemIds: { has: questionId } } },
    data: { playedItemIds: { push: questionId } },
  });
  if (claim.count === 0) {
    throw new ForbiddenException('This question can only be played once, as on the real TOEFL test.');
  }

  const [set, question] = await Promise.all([
    this.prisma.speakingInterviewSet.findUnique({ where: { id: session.setId }, select: { voiceId: true } }),
    this.prisma.speakingInterviewQuestion.findUnique({ where: { id: questionId } }),
  ]);
  if (set === null || question === null) throw new NotFoundException('Question not found');
  if (question.setId !== session.setId) throw new BadRequestException("Question does not belong to this session's set");

  try {
    const synthesized = await this.azureSpeech.synthesize(question.text, set.voiceId);
    return {
      audioBase64: synthesized.audioBase64,
      responseWindowSec: INTERVIEW_TIMING.recordingWindowSec,
      pauseBeforeBeepMs: INTERVIEW_TIMING.pauseBeforeBeepMs,
      beepDurationMs: INTERVIEW_TIMING.beepDurationMs,
    };
  } catch (err: unknown) {
    throw this.mapAzureError(err);
  }
}

  async submitAnswer(
    userId: string, sessionId: string, questionId: string,
    rawAudioBuffer: Buffer, mimeType: string, durationUsedSec: number,
  ) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const question = await this.prisma.speakingInterviewQuestion.findUnique({ where: { id: questionId } });
    if (question === null) throw new NotFoundException('Question not found');
    if (question.setId !== session.setId) throw new BadRequestException('Question does not belong to this session');

    const existingResults = session.results as unknown as InterviewItemResultEntity[];
    if (existingResults.some((r) => r.questionId === questionId)) {
      throw new BadRequestException('This question was already answered and cannot be changed — as on the real test.');
    }

    let wavBuffer: Buffer;
    try {
      wavBuffer = await transcodeToWav16kMono(rawAudioBuffer);
    } catch {
      throw new BadRequestException('Could not process the audio recording. Please try again.');
    }

    let transcript;
    try {
      transcript = await this.azureSpeech.transcribe(wavBuffer);
    } catch (err: unknown) {
      throw this.mapAzureError(err);
    }

    const heuristic = computeInterviewHeuristic({
      recognizedText: transcript.recognizedText,
      durationUsedSec: Math.min(durationUsedSec, INTERVIEW_RESPONSE_WINDOW_SEC),
      windowSec: INTERVIEW_RESPONSE_WINDOW_SEC,
    });

    const newResult: InterviewItemResultEntity = {
      questionId,
      questionText: question.text,
      recognizedText: transcript.recognizedText,
      wordCount: heuristic.wordCount,
      wordsPerMinute: heuristic.wordsPerMinute,
      fillerWordCount: heuristic.fillerWordCount,
      vocabularyDiversity: heuristic.vocabularyDiversity,
      estimatedScore: heuristic.estimatedScore,
      userAudioBase64: rawAudioBuffer.toString('base64'),
      userAudioMimeType: mimeType,
      attemptedAt: new Date().toISOString(),
    };

    await this.prisma.speakingInterviewSession.update({
      where: { id: sessionId },
      data: { results: [...existingResults, newResult] },
    });

    return {
      estimatedScore: heuristic.estimatedScore,
      recognizedText: transcript.recognizedText,
      wordsPerMinute: heuristic.wordsPerMinute,
      fillerWordCount: heuristic.fillerWordCount,
    };
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);
    const results = session.results as unknown as InterviewItemResultEntity[];

    if (results.length < INTERVIEW_QUESTION_COUNT) {
      throw new BadRequestException(
        `All ${INTERVIEW_QUESTION_COUNT} questions must be answered before completing this session (${results.length}/${INTERVIEW_QUESTION_COUNT} answered).`,
      );
    }

    const taskScore = Math.round((results.reduce((s, r) => s + r.estimatedScore, 0) / results.length) * 10) / 10;
    const finalScore = Math.round((taskScore / 5) * 100);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true } });
    const xpEarned = computeXP({ base: 40, streak: user?.streak ?? 0, accuracy: finalScore });

    const claim = await this.prisma.speakingInterviewSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED', completedAt: new Date(), taskScore, finalScore, xpEarned },
    });
    if (claim.count === 0) throw new BadRequestException('Session was already completed');

    if (isSessionCountable(finalScore)) {
      await this.progress.recordSkillCompletion({ userId, skill: 'speaking', accuracy: finalScore, xpEarned });
    } else {
      await this.progress.recordActivity({ userId, xpEarned: Math.max(1, Math.round(xpEarned * 0.3)), minutesSpent: 3 });
    }

    return this.prisma.speakingInterviewSession.findUniqueOrThrow({ where: { id: sessionId } });
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
      await this.prisma.speakingInterviewSet.create({
        data: {
          topic: set.topic, level: set.level, voiceId: set.voiceId,
          questions: { create: set.questions.map((q) => ({ text: q.text, orderIndex: q.orderIndex })) },
        },
      });
    }

    return { totalProcessed: sets.length, inserted: toInsert.length, skipped: sets.length - toInsert.length };
  }

  private async findSetWithQuestionsOrThrow(id: string) {
    const set = await this.prisma.speakingInterviewSet.findUnique({
      where: { id }, include: { questions: { orderBy: { orderIndex: 'asc' } } },
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

  private mapAzureError(err: unknown): HttpException {
    if (err instanceof AzureQuotaExceededError) {
      return new ForbiddenException('Monthly speech quota reached. It resets on the 1st of next month.');
    }
    if (err instanceof AzureTtsRequestError || err instanceof AzureSttRequestError) {
      if (err.status === 429) return new HttpException('Azure Speech is rate-limited. Try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
      return new HttpException('Speech service temporarily unavailable.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return new HttpException('Speech service temporarily unavailable.', HttpStatus.SERVICE_UNAVAILABLE);
  }
}