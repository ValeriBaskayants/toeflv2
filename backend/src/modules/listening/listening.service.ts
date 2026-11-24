import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Level, ListeningMode, ListeningType, Prisma } from '@prisma/client';
import { PrismaService }       from '../prisma/prisma.service';
import { ProgressService }     from '../progress/progress.service';
import { TopicMasteryService } from '../topic-mastery/topic-mastery.service';
import { MistakesService }     from '../mistakes/mistakes.service';
import { AzureSpeechService }  from '../azure-speech/azure-speech.service';
import { computeXP, isSessionCountable } from '../../constants/level-requirements';
import { isGuidedLevel, resolvePracticePolicy, EXAM_LEVEL_RANGE } from '../../constants/level-policy';
import {
  STUDY_MODE_MAX_PLAYS, STUDY_MODE_BASE_XP, PRACTICE_MODE_BASE_XP, STRICT_ZONE_XP_BONUS_MULTIPLIER,
  LIST_SELECT, REQUIRED_QUESTION_COUNT, computeAnswerWindowSec, resolveVoiceForLang,
} from '../../constants/listening-constants';
import { computeSpacedWeight, weightedPickOne } from '../../common/utils/spaced-selection.util';
import type { CreateListeningMaterialDto } from './dto/bulk-create-listening.dto';
import type { StartSessionDto, SubmitAnswerDto, SaveNotesDto } from './dto/session.dto';

interface ListeningAnswerEntry {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  answeredAtSec: number | null;
}

interface ScoringParams {
  correctCount: number;
  totalCount:   number;
  mode:         ListeningMode;
  level:        Level;
  streak:       number;
}

interface ScoringResult {
  rawAccuracy: number;
  finalScore:  number;
  xpEarned:    number;
}


const TIMED_OUT_SELECTED_INDEX = -1;


const PUBLIC_QUESTION_SELECT = {
  id: true, question: true, options: true, orderIndex: true,
} satisfies Prisma.ListeningQuestionSelect;

function computeListeningScore(p: ScoringParams): ScoringResult {
  const rawAccuracy = p.totalCount > 0 ? Math.round((p.correctCount / p.totalCount) * 100) : 0;
  const finalScore = rawAccuracy;

  const isStrict = !isGuidedLevel(p.level);
  const baseXp = p.mode === 'STUDY' ? STUDY_MODE_BASE_XP : PRACTICE_MODE_BASE_XP;
  const strictBonus = p.mode === 'PRACTICE' && isStrict ? STRICT_ZONE_XP_BONUS_MULTIPLIER : 1.0;

  const xpEarned = computeXP({
    base: Math.max(1, Math.round(baseXp * strictBonus)),
    streak: p.streak,
    accuracy: rawAccuracy,
  });

  return { rawAccuracy, finalScore, xpEarned };
}

function buildListeningFeedback(accuracy: number, correctCount: number, totalCount: number, mode: ListeningMode): string {
  const wrong = totalCount - correctCount;
  const modeLabel = mode === 'PRACTICE' ? 'Practice (exam-like)' : 'Study';

  if (accuracy === 100) return `Perfect score on ${modeLabel} mode! ${correctCount}/${totalCount} correct.`;
  if (accuracy >= 80) return `Strong result — ${correctCount}/${totalCount} correct on ${modeLabel} mode. Review the ${wrong} missed question${wrong > 1 ? 's' : ''} below.`;
  if (accuracy >= 60) return `${correctCount}/${totalCount} correct on ${modeLabel} mode.`;
  if (accuracy >= 40) return `${correctCount}/${totalCount} correct. Check the transcript and detailed review below.`;
  return `${correctCount}/${totalCount} correct. Review the transcript and consider practicing this topic more before retrying.`;
}

@Injectable()
export class ListeningService {
  constructor(
    private readonly prisma:       PrismaService,
    private readonly progress:     ProgressService,
    private readonly topicMastery: TopicMasteryService,
    private readonly mistakes:     MistakesService,
    private readonly azureSpeech:  AzureSpeechService,
  ) {}

  async findAll(query: { level?: Level; type?: ListeningType; search?: string; userId?: string }) {
    const where: Prisma.ListeningMaterialWhereInput = {};
    if (query.level  !== undefined) where.level = query.level;
    if (query.type   !== undefined) where.type  = query.type;
    if (query.search !== undefined) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { topic: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const materials = await this.prisma.listeningMaterial.findMany({
      where, select: LIST_SELECT, orderBy: { createdAt: 'desc' }, take: 100,
    });

    if (materials.length === 0 || query.userId === undefined) return materials;

    const materialIds = materials.map((m) => m.id);

    const [completedSessions, inProgress] = await Promise.all([
      this.prisma.listeningSession.findMany({
        where: { userId: query.userId, materialId: { in: materialIds }, status: 'COMPLETED' },
        select: { materialId: true, finalScore: true },
        orderBy: { completedAt: 'desc' },
      }),
      this.prisma.listeningSession.findMany({
        where: { userId: query.userId, materialId: { in: materialIds }, status: 'IN_PROGRESS' },
        select: { materialId: true },
      }),
    ]);

    const bestScoreMap = new Map<string, number>();
    const completedIds = new Set<string>();
    for (const s of completedSessions) {
      completedIds.add(s.materialId);
      bestScoreMap.set(s.materialId, Math.max(bestScoreMap.get(s.materialId) ?? 0, s.finalScore ?? 0));
    }
    const inProgressIds = new Set(inProgress.map((s) => s.materialId));

    const enriched = materials.map((m) => {
      const status = inProgressIds.has(m.id) ? 'in_progress' : completedIds.has(m.id) ? 'completed' : 'not_started';
      return { ...m, userStatus: status, bestScore: bestScoreMap.get(m.id) ?? null };
    });

    const ORDER = { in_progress: 0, not_started: 1, completed: 2 };
    return enriched.sort((a, b) => ORDER[a.userStatus as keyof typeof ORDER] - ORDER[b.userStatus as keyof typeof ORDER]);
  }

  async findById(id: string, userId: string) {
    const [material, openSession] = await Promise.all([
      this.prisma.listeningMaterial.findUnique({
        where: { id },
        include: { questions: { orderBy: { orderIndex: 'asc' }, select: PUBLIC_QUESTION_SELECT } },
      }),
      this.prisma.listeningSession.findFirst({
        where: { userId, materialId: id, status: 'IN_PROGRESS' },
        select: { id: true, mode: true, playCount: true, maxAllowedPlays: true },
      }),
    ]);
    if (material === null) throw new NotFoundException(`Listening material ${id} not found`);

    
    const { fullText, segments, ...rest } = material;
    const transcriptVisible = openSession !== null && openSession.mode === 'STUDY';

    return {
      ...rest,
      transcript: transcriptVisible ? { fullText, segments } : null,
      transcriptVisible,
      openSession,
    };
  }

  async startSession(userId: string, dto: StartSessionDto) {
    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id: dto.materialId },
      select: {
        id: true, title: true, topic: true, type: true, level: true, speakerRate: true,
        allowedModes: true, fullText: true, segments: true,
        questions: { orderBy: { orderIndex: 'asc' }, select: PUBLIC_QUESTION_SELECT },
      },
    });
    if (material === null) throw new NotFoundException('Listening material not found');

    if (!material.allowedModes.includes(dto.mode)) {
      throw new BadRequestException(`Mode ${dto.mode} is not available for this material`);
    }

    const maxAllowedPlays = dto.mode === 'STUDY'
      ? STUDY_MODE_MAX_PLAYS
      : resolvePracticePolicy(material.level, material.speakerRate).maxPlays;

    await this.prisma.listeningSession.updateMany({
      where: { userId, materialId: dto.materialId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    });

    const session = await this.prisma.listeningSession.create({
      data: { userId, materialId: dto.materialId, mode: dto.mode, maxAllowedPlays, notes: [], answers: [] },
      select: { id: true, mode: true, maxAllowedPlays: true, playCount: true, startedAt: true },
    });

    const answerWindowSec = dto.mode === 'PRACTICE'
      ? computeAnswerWindowSec(material.type, material.questions.length)
      : null;

    
    return {
      ...session,
      answerWindowSec,
      material: {
        id: material.id,
        title: material.title,
        topic: material.topic,
        level: material.level,
        type: material.type,
        questions: material.questions,
        transcript: dto.mode === 'STUDY' ? { fullText: material.fullText, segments: material.segments } : null,
      },
    };
  }

  
  
  private async startToeflSessionForType(userId: string, type: ListeningType) {
    const materials = await this.prisma.listeningMaterial.findMany({
      where: { level: { in: [...EXAM_LEVEL_RANGE] }, type, allowedModes: { has: 'PRACTICE' } },
      select: { id: true },
    });
    if (materials.length === 0) {
      throw new BadRequestException(`No TOEFL-ready ${type} materials available yet.`);
    }

    const sessions = await this.prisma.listeningSession.findMany({
      where: { userId, materialId: { in: materials.map((m) => m.id) }, status: 'COMPLETED' },
      select: { materialId: true, rawAccuracy: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    const lastByMaterial = new Map<string, { rawAccuracy: number; completedAt: Date }>();
    for (const s of sessions) {
      if (!lastByMaterial.has(s.materialId)) {
        lastByMaterial.set(s.materialId, { rawAccuracy: s.rawAccuracy ?? 0, completedAt: s.completedAt! });
      }
    }

    const candidates = materials.map((m) => {
      const last = lastByMaterial.get(m.id);
      const weight = computeSpacedWeight({
        id: m.id,
        lastOutcome: last === undefined ? undefined : last.rawAccuracy >= 70 ? 'correct' : 'incorrect',
        lastAttemptAt: last?.completedAt,
      });
      return { id: m.id, weight };
    });

    const picked = weightedPickOne(candidates);
    if (picked === null) throw new BadRequestException('No materials available right now — try again later.');

    return this.startSession(userId, { materialId: picked.id, mode: 'PRACTICE' });
  }

  async startToeflChooseResponseSession(userId: string) {
    return this.startToeflSessionForType(userId, 'LISTEN_CHOOSE_RESPONSE');
  }

  async startToeflConversationSession(userId: string) {
    return this.startToeflSessionForType(userId, 'CONVERSATION');
  }

  async startToeflAnnouncementSession(userId: string) {
    return this.startToeflSessionForType(userId, 'ANNOUNCEMENT');
  }

  async startToeflAcademicTalkSession(userId: string) {
    return this.startToeflSessionForType(userId, 'ACADEMIC_TALK');
  }

  async getSessionAudio(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id: session.materialId },
      select: { fullText: true, speakerLang: true, level: true, speakerRate: true },
    });
    if (material === null) throw new NotFoundException('Material not found');

    const maxAllowedPlays = session.mode === 'STUDY'
      ? STUDY_MODE_MAX_PLAYS
      : resolvePracticePolicy(material.level, material.speakerRate).maxPlays;

    if (session.playCount >= maxAllowedPlays) {
      throw new ForbiddenException(`Maximum plays (${maxAllowedPlays}) reached for this session`);
    }

    const effectiveRate = session.mode === 'STUDY'
      ? material.speakerRate
      : resolvePracticePolicy(material.level, material.speakerRate).rate;

    const voiceId = resolveVoiceForLang(material.speakerLang);

    
    
    const synthesized = await this.azureSpeech.synthesize(material.fullText, voiceId, effectiveRate);

    const claim = await this.prisma.listeningSession.updateMany({
      where: { id: sessionId, playCount: { lt: maxAllowedPlays } },
      data: { playCount: { increment: 1 } },
    });
    if (claim.count === 0) {
      throw new ForbiddenException(`Maximum plays (${maxAllowedPlays}) reached for this session`);
    }

    const updated = await this.prisma.listeningSession.findUniqueOrThrow({ where: { id: sessionId }, select: { playCount: true } });
    return { audioBase64: synthesized.audioBase64, cached: synthesized.cached, playCount: updated.playCount, maxAllowedPlays };
  }

  async saveNotes(userId: string, sessionId: string, dto: SaveNotesDto) {
    await this.getOwnedInProgressSession(userId, sessionId);
    return this.prisma.listeningSession.update({
      where: { id: sessionId }, data: { notes: dto.notes }, select: { id: true, notes: true },
    });
  }

  async submitAnswer(userId: string, sessionId: string, dto: SubmitAnswerDto) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const question = await this.prisma.listeningQuestion.findUnique({
      where: { id: dto.questionId },
      select: { correctIndex: true, listeningMaterialId: true, options: true, orderIndex: true, explanation: true },
    });
    if (question === null) throw new NotFoundException('Question not found');
    if (session.materialId !== question.listeningMaterialId) {
      throw new BadRequestException('Question does not belong to this session');
    }
    if (dto.selectedIndex >= question.options.length) {
      throw new BadRequestException('Selected option does not exist');
    }

    const existingAnswers = (session.answers as unknown as ListeningAnswerEntry[]) ?? [];
    const alreadyAnswered = existingAnswers.some((a) => a.questionId === dto.questionId);

    if (session.mode === 'PRACTICE') {
      if (alreadyAnswered) {
        throw new BadRequestException('This question was already answered and cannot be changed — as on the real test.');
      }
      if (question.orderIndex !== existingAnswers.length) {
        throw new BadRequestException('Questions must be answered in order during exam simulation.');
      }
    }

    const isCorrect = dto.selectedIndex === question.correctIndex;
    const filtered: ListeningAnswerEntry[] = existingAnswers.filter((a) => a.questionId !== dto.questionId);

    const newAnswer: ListeningAnswerEntry = {
      questionId: dto.questionId,
      selectedIndex: dto.selectedIndex,
      isCorrect,
      answeredAtSec: dto.currentAudioSec ?? null,
    };

    await this.prisma.listeningSession.update({
      where: { id: sessionId },
      data: { answers: [...filtered, newAnswer] },
    });

    if (!isCorrect) {
      const material = await this.prisma.listeningMaterial.findUnique({
        where: { id: session.materialId }, select: { topic: true, level: true },
      });
      await this.mistakes.recordAttempt({
        userId,
        targetId: dto.questionId,
        source: 'LISTENING',
        category: 'LOGIC',
        topic: material?.topic ?? 'listening',
        level: material?.level ?? 'A1',
        isCorrect: false,
        userAnswer: question.options[dto.selectedIndex] ?? `option_${dto.selectedIndex}`,
        correctAnswer: question.options[question.correctIndex] ?? `option_${question.correctIndex}`,
      });
    }

    if (session.mode === 'PRACTICE') {
      return { recorded: true };
    }
    return { isCorrect, correctIndex: question.correctIndex, explanation: question.explanation ?? null };
  }

  
  
  async expireSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);
    if (session.mode !== 'PRACTICE') {
      throw new BadRequestException('Only exam-like PRACTICE sessions expire on a timer.');
    }

    const material = await this.prisma.listeningMaterial.findUnique({
      where: { id: session.materialId },
      select: { questions: { orderBy: { orderIndex: 'asc' } } },
    });
    if (material === null) throw new NotFoundException('Material not found');

    const existingAnswers = (session.answers as unknown as ListeningAnswerEntry[]) ?? [];
    const remaining = material.questions.slice(existingAnswers.length);

    if (remaining.length > 0) {
      const filledAnswers: ListeningAnswerEntry[] = remaining.map((q) => ({
        questionId: q.id, selectedIndex: TIMED_OUT_SELECTED_INDEX, isCorrect: false, answeredAtSec: null,
      }));

      
      await this.prisma.listeningSession.updateMany({
        where: { id: sessionId, status: 'IN_PROGRESS' },
        data: { answers: [...existingAnswers, ...filledAnswers] },
      });
    }

    return this.completeSession(userId, sessionId);
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.getOwnedInProgressSession(userId, sessionId);

    const [material, user, previousCompleted] = await Promise.all([
      this.prisma.listeningMaterial.findUnique({
        where: { id: session.materialId },
        select: { level: true, fullText: true, grammarTopics: true, questions: { orderBy: { orderIndex: 'asc' } } },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { streak: true } }),
      this.prisma.listeningSession.count({ where: { userId, materialId: session.materialId, status: 'COMPLETED' } }),
    ]);
    if (material === null) throw new NotFoundException('Material not found');

    const questionCount = material.questions.length;
    const answers = (session.answers as unknown as ListeningAnswerEntry[]) ?? [];

    if (session.mode === 'PRACTICE' && answers.length < questionCount) {
      throw new BadRequestException(
        `All ${questionCount} questions must be answered (or timed out) before finishing this task (${answers.length}/${questionCount}).`,
      );
    }

    const correctCount = answers.filter((a) => a.isCorrect).length;

    const { rawAccuracy, finalScore, xpEarned } = computeListeningScore({
      correctCount, totalCount: questionCount, mode: session.mode, level: material.level, streak: user?.streak ?? 0,
    });

    const claim = await this.prisma.listeningSession.updateMany({
      where: { id: sessionId, status: 'IN_PROGRESS' },
      data: {
        status: 'COMPLETED', completedAt: new Date(),
        correctCount, totalCount: questionCount, rawAccuracy, finalScore, xpEarned,
      },
    });
    if (claim.count === 0) throw new BadRequestException('Session was already completed');

    const completed = await this.prisma.listeningSession.findUniqueOrThrow({ where: { id: sessionId } });

    
    const isFirstCompletion = previousCompleted === 0;
    const countedAsCompleted = isFirstCompletion && isSessionCountable(rawAccuracy);

    if (countedAsCompleted) {
      await this.progress.recordListeningCompletion({ userId, accuracy: rawAccuracy, xpEarned });
    } else {
      await this.progress.recordActivity({
        userId,
        xpEarned: isFirstCompletion ? xpEarned : Math.max(1, Math.round(xpEarned * 0.3)),
        minutesSpent: 5,
      });
    }

    if (isFirstCompletion && material.grammarTopics.length > 0) {
      await this.topicMastery.recordPractice({ userId, topicSlugs: material.grammarTopics, kind: 'listening' });
    }

    const detailedReview = material.questions.map((q) => {
      const answer = answers.find((a) => a.questionId === q.id);
      return {
        questionId: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        selectedIndex: answer?.selectedIndex ?? null,
        timedOut: answer?.selectedIndex === TIMED_OUT_SELECTED_INDEX,
        isCorrect: answer?.isCorrect ?? false,
      };
    });

    return {
      ...completed,
      transcript: material.fullText,
      countedAsCompleted,
      detailedReview,
      feedback: buildListeningFeedback(rawAccuracy, correctCount, questionCount, session.mode),
    };
  }

  async getUserSessions(userId: string, materialId?: string) {
    const where: Prisma.ListeningSessionWhereInput = { userId };
    if (materialId !== undefined) where.materialId = materialId;

    return this.prisma.listeningSession.findMany({
      where,
      select: {
        id: true, mode: true, status: true, playCount: true,
        finalScore: true, xpEarned: true, rawAccuracy: true,
        startedAt: true, completedAt: true,
        material: { select: { id: true, title: true, level: true, type: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async bulkCreate(items: CreateListeningMaterialDto[]) {
    if (items.length === 0) return { totalProcessed: 0, inserted: 0, skipped: 0, errors: [] };

    const errors: Array<{ title: string; reason: string }> = [];

    const structurallyValid = items.filter((item) => {
      const required = REQUIRED_QUESTION_COUNT[item.type];
      const actual = item.questions?.length ?? 0;
      if (actual !== required) {
        errors.push({ title: item.title, reason: `${item.type} requires exactly ${required} question(s), got ${actual}` });
        return false;
      }
      return true;
    });

    const titles = structurallyValid.map((i) => i.title);
    const existing = await this.prisma.listeningMaterial.findMany({
      where: { title: { in: titles } }, select: { title: true },
    });
    const existingSet = new Set(existing.map((e) => e.title));
    const toInsert = structurallyValid.filter((i) => !existingSet.has(i.title));

    for (const item of toInsert) {
      const { questions, segments, ...materialData } = item;
      await this.prisma.listeningMaterial.create({
        data: {
          ...materialData,
          segments: segments ?? [],
          questions: { create: (questions ?? []).map((q, idx) => ({ ...q, orderIndex: idx })) },
        },
      });
    }

    return { totalProcessed: items.length, inserted: toInsert.length, skipped: existing.length, errors };
  }

  private async getOwnedInProgressSession(userId: string, sessionId: string) {
    const session = await this.prisma.listeningSession.findUnique({ where: { id: sessionId } });
    if (session === null) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new ForbiddenException('Access denied');
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is already ${session.status.toLowerCase()}`);
    }
    return session;
  }
}