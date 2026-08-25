import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Level, Prisma, PlacementSectionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AzureSpeechService, AzureQuotaExceededError } from '../azure-speech/azure-speech.service';
import { buildInitialProgress } from '../../constants/level-requirements';
import type { AnswerPlacementDto } from './dto/placement.dto';
import {
  AbilityDimension,
  PRIOR_MEAN,
  SE_CONVERGENCE,
  INITIAL_SE,
  FETCH_WINDOW,
  EXPOSURE_CONTROL_POOL_SIZE,
  RETAKE_COOLDOWN_MS,
  ABANDON_THRESHOLD_MS,
  LOCK_STALE_MS,
  SECTION_ORDER,
  SECTION_QUESTION_LIMITS,
  SECTION_WEIGHTS,
  SPEAKING_ITEM_COUNT,
  info2PL,
  CONTENT_TARGET,
  LEVEL_BOUNDARIES,
  GRID_MIN,
  GRID_MAX,
  eapForDimension,
} from '../../constants/placement-constants';

interface QuestionSnapshot {
  sourceId: string;
  dimension: AbilityDimension;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
  discrimination: number;
}

type QuestionWithTiming = QuestionSnapshot & { shownAt?: string };

interface AnswerRecord {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  answeredAt: string;
  questionStartAt: string;
  thetaSnapshot: number;
  seSnapshot: number;
}

interface CATSectionState {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  theta: number;
  se: number;
  questions: QuestionWithTiming[];
  answers: AnswerRecord[];
  resultTheta: number | null;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
}

interface SpeakingItemAttempt {
  itemId: string;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
}

interface SpeakingSectionState {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  itemIds: string[];
  attempts: SpeakingItemAttempt[];
  resultScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

type SectionsMap = {
  READING: CATSectionState;
  LISTENING: CATSectionState;
  WRITING: CATSectionState;
  SPEAKING: SpeakingSectionState;
};

interface BestSectionScore {
  score: number;
  level: Level;
  achievedAt: string;
}

type BestSectionScoresMap = Partial<Record<PlacementSectionType, BestSectionScore>>;

const SECTION_DIMENSIONS: Record<'READING' | 'LISTENING' | 'WRITING', AbilityDimension[]> = {
  READING: ['READING', 'VOCABULARY'],
  LISTENING: ['LISTENING'],
  WRITING: ['GRAMMAR'],
};

@Injectable()
export class PlacementService {
  private readonly logger = new Logger(PlacementService.name);

  private readonly questionCache = new Map<
    string,
    { data: Array<QuestionSnapshot & { info: number }>; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly azureSpeech: AzureSpeechService,
  ) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.placementTest.findUnique({ where: { userId } });
    if (existing !== null) return existing;

    return this.prisma.placementTest.create({
      data: { userId, status: 'PENDING', sections: this.freshSections() as object },
    });
  }

  async getStatus(userId: string) {
    const test = await this.getOrCreate(userId);
    const now = new Date();

    const canRetake =
      test.status === 'COMPLETED' &&
      test.lastCompletedAt !== null &&
      now.getTime() - test.lastCompletedAt.getTime() >= RETAKE_COOLDOWN_MS;

    const daysUntilRetake =
      test.status === 'COMPLETED' && test.lastCompletedAt !== null && !canRetake
        ? Math.ceil((RETAKE_COOLDOWN_MS - (now.getTime() - test.lastCompletedAt.getTime())) / 86400000)
        : 0;

    const sections = test.sections as unknown as SectionsMap;
    const currentSection = test.status === 'IN_PROGRESS' ? this.firstIncompleteSection(sections) : null;

    return {
      status: test.status,
      currentSection,
      sectionStatuses: SECTION_ORDER.reduce(
        (acc, s) => ({ ...acc, [s]: sections[s]?.status ?? 'NOT_STARTED' }),
        {} as Record<PlacementSectionType, string>,
      ),
      detectedLevel: test.detectedLevel,
      confidenceScore: test.confidenceScore,
      attemptCount: test.attemptCount,
      canRetake,
      daysUntilRetake,
      lastCompletedAt: test.lastCompletedAt,
    };
  }

  async getResultCard(userId: string) {
    const test = await this.prisma.placementTest.findUnique({ where: { userId } });

    if (test === null || test.detectedLevel === null) {
      throw new NotFoundException('No completed placement result yet.');
    }

    const best = test.bestSectionScores as unknown as BestSectionScoresMap;
    const now = new Date();

    const canRetake =
      test.lastCompletedAt !== null && now.getTime() - test.lastCompletedAt.getTime() >= RETAKE_COOLDOWN_MS;

    const daysUntilRetake = canRetake
      ? 0
      : test.lastCompletedAt !== null
        ? Math.ceil((RETAKE_COOLDOWN_MS - (now.getTime() - test.lastCompletedAt.getTime())) / 86400000)
        : 0;

    return {
      overallLevel: test.detectedLevel,
      confidenceScore: test.confidenceScore,
      attemptCount: test.attemptCount,
      lastCompletedAt: test.lastCompletedAt,
      canRetake,
      daysUntilRetake,
      sections: SECTION_ORDER.map((type) => ({
        type,
        score: best[type]?.score ?? null,
        level: best[type]?.level ?? null,
        achievedAt: best[type]?.achievedAt ?? null,
      })),
    };
  }

  async start(userId: string) {
    const test = await this.getOrCreate(userId);
    const now = new Date();

    if (test.status === 'IN_PROGRESS') {
      const isStale =
        test.lastActivityAt !== null &&
        now.getTime() - test.lastActivityAt.getTime() > ABANDON_THRESHOLD_MS;

      if (!isStale) {
        return { currentSection: this.firstIncompleteSection(test.sections as unknown as SectionsMap) };
      }

      this.logger.log('PLACEMENT_ABANDONED_RESTART', { userId });
    }

    if (test.status === 'COMPLETED') {
      const canRetake =
        test.lastCompletedAt !== null && now.getTime() - test.lastCompletedAt.getTime() >= RETAKE_COOLDOWN_MS;

      if (!canRetake) {
        const daysLeft = test.lastCompletedAt
          ? Math.ceil((RETAKE_COOLDOWN_MS - (now.getTime() - test.lastCompletedAt.getTime())) / 86400000)
          : 30;
        throw new BadRequestException(
          `You can retake the placement test in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
        );
      }

      this.logger.log('PLACEMENT_RETAKE_STARTED', {
        userId,
        previousLevel: test.detectedLevel,
        attemptCount: test.attemptCount,
      });
    }

    await this.prisma.placementTest.update({
      where: { userId },
      data: {
        status: 'IN_PROGRESS',
        sections: this.freshSections() as object,
        startedAt: now,
        lastActivityAt: now,
        detectedLevel: null,
        confidenceScore: null,
        processingLock: false,
      },
    });

    return { currentSection: 'READING' as PlacementSectionType };
  }

  async startSection(userId: string, sectionType: PlacementSectionType) {
    const test = await this.getInProgressTest(userId);
    const sections = test.sections as unknown as SectionsMap;

    this.assertSectionUnlocked(sections, sectionType);

    if (sectionType === 'SPEAKING') {
      return this.startSpeakingSection(test.id, sections);
    }

    return this.startCatSection(test.id, sections, sectionType);
  }

  private async startCatSection(
    testId: string,
    sections: SectionsMap,
    sectionType: 'READING' | 'LISTENING' | 'WRITING',
  ) {
    const section = sections[sectionType];

    if (section.status === 'IN_PROGRESS') {
      const nextIndex = section.answers.length;
      const nextQuestion = section.questions[nextIndex];
      if (nextQuestion === undefined) {
        throw new BadRequestException('Inconsistent section state. Please contact support.');
      }
      return {
        section: sectionType,
        resumed: true,
        question: this.publicQuestion(nextQuestion, nextIndex, section.answers.length, sectionType),
      };
    }

    const theta = PRIOR_MEAN;
    const firstQuestion = await this.fetchNextQuestion([], theta, SECTION_DIMENSIONS[sectionType], {});

    if (firstQuestion === null) {
      throw new BadRequestException(`Not enough ${sectionType} placement questions available.`);
    }

    const now = new Date();
    section.status = 'IN_PROGRESS';
    section.theta = theta;
    section.se = INITIAL_SE;
    section.questions = [{ ...firstQuestion, shownAt: now.toISOString() }];
    section.answers = [];
    section.startedAt = now.toISOString();
    section.lastActivityAt = now.toISOString();

    sections[sectionType] = section;

    await this.prisma.placementTest.update({
      where: { id: testId },
      data: { sections: sections as object, lastActivityAt: now },
    });

    return {
      section: sectionType,
      resumed: false,
      question: this.publicQuestion(firstQuestion, 0, 0, sectionType),
    };
  }

  async answerSection(userId: string, sectionType: PlacementSectionType, dto: AnswerPlacementDto) {
    if (sectionType === 'SPEAKING') {
      throw new BadRequestException('Use the speaking-specific endpoint for this section.');
    }

    const test = await this.getInProgressTest(userId);

    const claimed = await this.prisma.placementTest.updateMany({
      where: {
        id: test.id,
        OR: [{ processingLock: false }, { updatedAt: { lt: new Date(Date.now() - LOCK_STALE_MS) } }],
      },
      data: { processingLock: true },
    });

    if (claimed.count === 0) {
      throw new BadRequestException('Your previous answer is still being processed. Please try again shortly.');
    }

    try {
      return await this.processSectionAnswer(userId, test.id, sectionType, dto);
    } finally {
      await this.prisma.placementTest.updateMany({
        where: { id: test.id },
        data: { processingLock: false },
      });
    }
  }

  private async processSectionAnswer(
    userId: string,
    testId: string,
    sectionType: 'READING' | 'LISTENING' | 'WRITING',
    dto: AnswerPlacementDto,
  ) {
    const test = await this.prisma.placementTest.findUniqueOrThrow({ where: { id: testId } });
    const sections = test.sections as unknown as SectionsMap;
    const section = sections[sectionType];

    if (section.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Section ${sectionType} is not in progress.`);
    }

    const question = section.questions[dto.questionIndex];
    if (question === undefined) {
      throw new BadRequestException(`Question ${dto.questionIndex} not found.`);
    }

    const existing = section.answers.find((a) => a.questionIndex === dto.questionIndex);
    if (existing !== undefined) {
      return this.buildSectionAnswerReplay(section, sectionType, dto.questionIndex);
    }

    if (dto.selectedIndex >= question.options.length) {
      throw new BadRequestException(
        `Invalid option index ${dto.selectedIndex} — question has ${question.options.length} options.`,
      );
    }

    const isCorrect = dto.selectedIndex === question.correctIndex;
    const now = new Date();
    const dims = SECTION_DIMENSIONS[sectionType];

    const { theta: newTheta, se: newSE } = this.estimateSectionTheta(
      section.answers,
      section.questions,
      dto.questionIndex,
      isCorrect,
      dims,
    );

    const answerRecord: AnswerRecord = {
      questionIndex: dto.questionIndex,
      selectedIndex: dto.selectedIndex,
      isCorrect,
      answeredAt: now.toISOString(),
      questionStartAt: question.shownAt ?? new Date(now.getTime() - 30000).toISOString(),
      thetaSnapshot: newTheta,
      seSnapshot: newSE,
    };

    section.answers = [...section.answers, answerRecord];
    section.theta = newTheta;
    section.se = newSE;
    section.lastActivityAt = now.toISOString();

    const limits = SECTION_QUESTION_LIMITS[sectionType];
    const answeredCount = section.answers.length;
    const converged = answeredCount >= limits.min && (newSE <= SE_CONVERGENCE || answeredCount >= limits.max);

    if (converged) {
      return this.completeCatSection(userId, testId, sections, sectionType, newTheta, newSE, isCorrect);
    }

    const excludedIds = section.questions.map((q) => q.sourceId);
    const typeCounts = this.countByDimension(section.answers, section.questions, dims);
    const nextQuestion = await this.fetchNextQuestion(excludedIds, newTheta, dims, typeCounts);

    if (nextQuestion === null) {
      return this.completeCatSection(userId, testId, sections, sectionType, newTheta, newSE, isCorrect);
    }

    section.questions = [...section.questions, { ...nextQuestion, shownAt: now.toISOString() }];
    sections[sectionType] = section;

    await this.prisma.placementTest.update({
      where: { id: testId },
      data: { sections: sections as object, lastActivityAt: now },
    });

    return {
      sectionCompleted: false,
      isCorrect,
      question: this.publicQuestion(nextQuestion, section.questions.length - 1, answeredCount, sectionType),
    };
  }

  private async completeCatSection(
    userId: string,
    testId: string,
    sections: SectionsMap,
    sectionType: 'READING' | 'LISTENING' | 'WRITING',
    theta: number,
    se: number,
    isCorrect: boolean,
  ) {
    const section = sections[sectionType];
    const now = new Date();

    section.status = 'COMPLETED';
    section.completedAt = now.toISOString();
    section.resultTheta = theta;
    sections[sectionType] = section;

    await this.updateBestScoreAndPersist(testId, sections, sectionType, theta);

    const allDone = SECTION_ORDER.every((s) => sections[s].status === 'COMPLETED');
    if (allDone) {
      return this.finalizeAttempt(userId, testId, sections);
    }

    return {
      sectionCompleted: true,
      section: sectionType,
      nextSection: this.firstIncompleteSection(sections),
      isCorrect,
    };
  }

  private buildSectionAnswerReplay(
    section: CATSectionState,
    sectionType: PlacementSectionType,
    questionIndex: number,
  ) {
    if (section.questions.length > questionIndex + 1) {
      return {
        sectionCompleted: false,
        isCorrect: section.answers[questionIndex]?.isCorrect ?? false,
        question: this.publicQuestion(
          section.questions[questionIndex + 1]!,
          questionIndex + 1,
          section.answers.length,
          sectionType,
        ),
      };
    }
    return {
      sectionCompleted: section.status === 'COMPLETED',
      isCorrect: section.answers[questionIndex]?.isCorrect ?? false,
      question: null,
    };
  }

  private async startSpeakingSection(testId: string, sections: SectionsMap) {
    const section = sections.SPEAKING;

    if (section.status === 'IN_PROGRESS' && section.itemIds.length > 0) {
      const items = await this.prisma.speakingRepeatItem.findMany({
        where: { id: { in: section.itemIds } },
      });
      return {
        section: 'SPEAKING' as const,
        items,
        attemptedItemIds: section.attempts.map((a) => a.itemId),
      };
    }

    const items = await this.prisma.speakingRepeatItem.findMany({
      where: { isAvailableForPlacement: true },
      orderBy: { placementDifficultyRank: 'asc' },
      take: SPEAKING_ITEM_COUNT,
    });

    if (items.length < SPEAKING_ITEM_COUNT) {
      throw new BadRequestException('Not enough speaking placement items configured.');
    }

    section.status = 'IN_PROGRESS';
    section.itemIds = items.map((i) => i.id);
    section.attempts = [];
    section.startedAt = new Date().toISOString();
    sections.SPEAKING = section;

    await this.prisma.placementTest.update({
      where: { id: testId },
      data: { sections: sections as object, lastActivityAt: new Date() },
    });

    return { section: 'SPEAKING' as const, items, attemptedItemIds: [] };
  }

  async submitSpeakingAttempt(userId: string, itemId: string, audioBuffer: Buffer) {
    const test = await this.getInProgressTest(userId);
    const sections = test.sections as unknown as SectionsMap;
    const section = sections.SPEAKING;

    if (section.status !== 'IN_PROGRESS' || !section.itemIds.includes(itemId)) {
      throw new BadRequestException('Item is not part of the active speaking section.');
    }
    if (section.attempts.some((a) => a.itemId === itemId)) {
      throw new BadRequestException('This item has already been answered.');
    }

    const item = await this.prisma.speakingRepeatItem.findUniqueOrThrow({ where: { id: itemId } });

    let scores;
    try {
      scores = await this.azureSpeech.assessPronunciation(audioBuffer, item.text);
    } catch (err: unknown) {
      if (err instanceof AzureQuotaExceededError) {
        throw new BadRequestException(
          'Monthly speech assessment quota reached. Please retry the speaking section later.',
        );
      }
      throw err;
    }

    section.attempts = [
      ...section.attempts,
      {
        itemId,
        accuracyScore: scores.accuracyScore,
        fluencyScore: scores.fluencyScore,
        completenessScore: scores.completenessScore,
      },
    ];

    const isSectionDone = section.attempts.length === section.itemIds.length;

    if (isSectionDone) {
      const avgComposite =
        section.attempts.reduce(
          (s, a) => s + (a.accuracyScore * 0.4 + a.fluencyScore * 0.3 + a.completenessScore * 0.3),
          0,
        ) / section.attempts.length;

      section.status = 'COMPLETED';
      section.completedAt = new Date().toISOString();
      section.resultScore = Math.round(avgComposite);
      sections.SPEAKING = section;

      const speakingLevel = this.speakingScoreToLevel(section.resultScore);
      await this.updateBestScoreAndPersistDirect(test.id, sections, 'SPEAKING', section.resultScore, speakingLevel);

      const allDone = SECTION_ORDER.every((s) => sections[s].status === 'COMPLETED');
      if (allDone) {
        return this.finalizeAttempt(userId, test.id, sections);
      }

      return {
        sectionCompleted: true,
        section: 'SPEAKING' as const,
        nextSection: this.firstIncompleteSection(sections),
      };
    }

    sections.SPEAKING = section;
    await this.prisma.placementTest.update({
      where: { id: test.id },
      data: { sections: sections as object, lastActivityAt: new Date() },
    });

    return {
      sectionCompleted: false,
      itemsAnswered: section.attempts.length,
      totalItems: section.itemIds.length,
    };
  }

  async skip(userId: string) {
    const test = await this.getOrCreate(userId);

    if (test.status === 'COMPLETED') {
      throw new BadRequestException('Placement test already completed.');
    }

    await this.prisma.placementTest.update({
      where: { userId },
      data: { status: 'SKIPPED' },
    });

    await this.applyLevel(userId, 'A1').catch((err) =>
      this.logger.error('Error applying A1 level after skip', { userId, err }),
    );

    return { skipped: true, assignedLevel: 'A1' };
  }

  async remindLater(userId: string) {
    const remindAfter = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    await this.prisma.placementTest.update({
      where: { userId },
      data: { status: 'REMIND_LATER', remindAfter },
    });
    return { remindAfter };
  }

  private async updateBestScoreAndPersist(
    testId: string,
    sections: SectionsMap,
    sectionType: 'READING' | 'LISTENING' | 'WRITING',
    theta: number,
  ) {
    const score = this.thetaToNormalizedScore(theta);
    const level = this.thetaToLevel(theta);
    await this.updateBestScoreAndPersistDirect(testId, sections, sectionType, score, level);
  }

  private async updateBestScoreAndPersistDirect(
    testId: string,
    sections: SectionsMap,
    sectionType: PlacementSectionType,
    score: number,
    level: Level,
  ) {
    const test = await this.prisma.placementTest.findUniqueOrThrow({ where: { id: testId } });
    const best = test.bestSectionScores as unknown as BestSectionScoresMap;
    const current = best[sectionType];

    if (current === undefined || score > current.score) {
      best[sectionType] = { score, level, achievedAt: new Date().toISOString() };
    }

    await this.prisma.placementTest.update({
      where: { id: testId },
      data: {
        sections: sections as object,
        bestSectionScores: best as object,
        lastActivityAt: new Date(),
      },
    });
  }

  private async finalizeAttempt(userId: string, testId: string, sections: SectionsMap) {
    const test = await this.prisma.placementTest.findUniqueOrThrow({ where: { id: testId } });
    const best = test.bestSectionScores as unknown as BestSectionScoresMap;

    const readingTheta = this.levelScoreToTheta(best.READING?.score ?? 0);
    const listeningTheta = this.levelScoreToTheta(best.LISTENING?.score ?? 0);
    const writingTheta = this.levelScoreToTheta(best.WRITING?.score ?? 0);
    const speakingTheta = this.levelScoreToTheta(best.SPEAKING?.score ?? 0);

    const aggregate =
      readingTheta * SECTION_WEIGHTS.READING +
      listeningTheta * SECTION_WEIGHTS.LISTENING +
      writingTheta * SECTION_WEIGHTS.WRITING +
      speakingTheta * SECTION_WEIGHTS.SPEAKING;

    const detectedLevel = this.thetaToLevel(aggregate);
    const confidenceScore = Math.round(
      ([best.READING, best.LISTENING, best.WRITING, best.SPEAKING].filter(Boolean).length / 4) * 100,
    );

    const isFirstCompletion = test.completedAt === null;
    const currentAttemptCount = (test.attemptCount ?? 0) + 1;

    await this.prisma.$transaction(async (tx) => {
      await tx.placementTest.update({
        where: { id: testId },
        data: {
          status: 'COMPLETED',
          sections: sections as object,
          detectedLevel,
          confidenceScore,
          completedAt: isFirstCompletion ? new Date() : undefined,
          lastCompletedAt: new Date(),
          attemptCount: currentAttemptCount,
          processingLock: false,
        },
      });

      await this.applyLevelTx(tx, userId, detectedLevel);
    });

    this.logger.log('PLACEMENT_COMPLETED', {
      userId,
      detectedLevel,
      confidenceScore,
      attemptCount: currentAttemptCount,
      bestSectionScores: best,
    });

    return {
      testCompleted: true,
      detectedLevel,
      confidenceScore,
      sections: SECTION_ORDER.map((type) => ({
        type,
        score: best[type]?.score ?? null,
        level: best[type]?.level ?? null,
      })),
    };
  }

  private async applyLevel(userId: string, level: Level): Promise<void> {
    await this.prisma.$transaction(async (tx) => this.applyLevelTx(tx, userId, level));
  }

  private async applyLevelTx(tx: Prisma.TransactionClient, userId: string, level: Level): Promise<void> {
    await tx.user.update({ where: { id: userId }, data: { currentLevel: level } });

    const progressData = { ...buildInitialProgress(level), isReadyForTest: false, testUnlockedAt: null };

    await tx.levelProgress.upsert({
      where: { userId },
      update: progressData,
      create: { userId, ...progressData },
    });

    await tx.userTopicMastery.deleteMany({ where: { userId } });

    this.logger.log('PLACEMENT_LEVEL_APPLIED', { userId, level });
  }

  private freshSections(): SectionsMap {
    const emptyCat = (): CATSectionState => ({
      status: 'NOT_STARTED',
      theta: PRIOR_MEAN,
      se: INITIAL_SE,
      questions: [],
      answers: [],
      resultTheta: null,
      startedAt: null,
      completedAt: null,
      lastActivityAt: null,
    });

    return {
      READING: emptyCat(),
      LISTENING: emptyCat(),
      WRITING: emptyCat(),
      SPEAKING: {
        status: 'NOT_STARTED',
        itemIds: [],
        attempts: [],
        resultScore: null,
        startedAt: null,
        completedAt: null,
      },
    };
  }

  private firstIncompleteSection(sections: SectionsMap): PlacementSectionType | null {
    for (const type of SECTION_ORDER) {
      if (sections[type].status !== 'COMPLETED') return type;
    }
    return null;
  }

  private assertSectionUnlocked(sections: SectionsMap, sectionType: PlacementSectionType) {
    const idx = SECTION_ORDER.indexOf(sectionType);
    for (let i = 0; i < idx; i++) {
      if (sections[SECTION_ORDER[i]!].status !== 'COMPLETED') {
        throw new BadRequestException(`Complete the ${SECTION_ORDER[i]} section first.`);
      }
    }
  }

  private async getInProgressTest(userId: string) {
    const test = await this.prisma.placementTest.findUnique({ where: { userId } });

    if (test === null || test.status !== 'IN_PROGRESS') {
      throw new BadRequestException('No active placement test.');
    }

    if (test.lastActivityAt !== null && Date.now() - test.lastActivityAt.getTime() > ABANDON_THRESHOLD_MS) {
      throw new BadRequestException('Your test session expired due to inactivity. Please start again.');
    }

    return test;
  }

  private estimateSectionTheta(
    answers: AnswerRecord[],
    questions: QuestionSnapshot[],
    newAnswerIndex: number,
    isCorrect: boolean,
    dims: AbilityDimension[],
  ): { theta: number; se: number } {
    const responses = answers
      .map((a) => {
        const q = questions[a.questionIndex];
        if (q === undefined || !dims.includes(q.dimension)) return null;
        return { difficulty: q.difficulty, discrimination: q.discrimination, correct: a.isCorrect };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const newQ = questions[newAnswerIndex];
    if (newQ !== undefined && dims.includes(newQ.dimension)) {
      responses.push({ difficulty: newQ.difficulty, discrimination: newQ.discrimination, correct: isCorrect });
    }

    const { estimate, se } = eapForDimension(responses);
    return { theta: estimate, se };
  }

  private countByDimension(
    answers: AnswerRecord[],
    questions: QuestionSnapshot[],
    dims: AbilityDimension[],
  ): Record<AbilityDimension, number> {
    const counts = Object.fromEntries(dims.map((d) => [d, 0])) as Record<AbilityDimension, number>;
    for (const a of answers) {
      const q = questions[a.questionIndex];
      if (q !== undefined && dims.includes(q.dimension)) counts[q.dimension]++;
    }
    return counts;
  }

  private async fetchNextQuestion(
    excludeIds: string[],
    theta: number,
    dims: AbilityDimension[],
    typeCounts: Partial<Record<AbilityDimension, number>>,
  ): Promise<QuestionSnapshot | null> {
    const ranked = this.rankDimensions(dims, typeCounts);

    for (const dim of ranked) {
      let candidates = await this.fetchCandidates(excludeIds, dim, theta, FETCH_WINDOW);
      if (candidates.length === 0) {
        candidates = await this.fetchCandidates(excludeIds, dim, theta, Infinity);
      }
      if (candidates.length > 0) {
        return this.pickWithExposureControl(candidates);
      }
    }

    return null;
  }

  private rankDimensions(
    dims: AbilityDimension[],
    typeCounts: Partial<Record<AbilityDimension, number>>,
  ): AbilityDimension[] {
    if (dims.length === 1) return dims;

    const total = dims.reduce((s, d) => s + (typeCounts[d] ?? 0), 0) + 1;

    return [...dims]
      .map((dim) => {
        const count = typeCounts[dim] ?? 0;
        const actual = count / total;
        const uncertainty = 1.0 / (count + 1);
        const balanceBonus = Math.max(0, CONTENT_TARGET[dim] - actual) * 2.0;
        return { dim, score: uncertainty + balanceBonus };
      })
      .sort((a, b) => b.score - a.score)
      .map((s) => s.dim);
  }

  private pickWithExposureControl(candidates: Array<QuestionSnapshot & { info: number }>): QuestionSnapshot {
    candidates.sort((a, b) => b.info - a.info);
    const poolSize = Math.min(candidates.length, EXPOSURE_CONTROL_POOL_SIZE);
    const pick = Math.floor(Math.random() * poolSize);
    return candidates[pick]!;
  }

  private async fetchCandidates(
    excludeIds: string[],
    dim: AbilityDimension,
    thetaVal: number,
    window: number,
  ): Promise<Array<QuestionSnapshot & { info: number }>> {
    const cacheKey = this.getCacheKey(dim, thetaVal, window);
    const cached = this.getFromCache(cacheKey);

    const result =
      cached ??
      (await (async () => {
        const fresh = await this.fetchCandidatesFromDB(dim, thetaVal, window);
        this.setCache(cacheKey, fresh);
        return fresh;
      })());

    return result.filter((q) => !excludeIds.includes(q.sourceId));
  }

  private async fetchCandidatesFromDB(
    dim: AbilityDimension,
    thetaVal: number,
    window: number,
  ): Promise<Array<QuestionSnapshot & { info: number }>> {
    const diffWhere = window === Infinity ? {} : { gte: thetaVal - window, lte: thetaVal + window };

    const [exercises, scrambles, mcqs, listeningQuestions] = await Promise.all([
      dim === 'GRAMMAR'
        ? this.prisma.exercise.findMany({
            where: { isAvailableForPlacement: true, ...(window !== Infinity && { difficultyRating: diffWhere }) },
            select: { id: true, sentence: true, blanks: true, difficultyRating: true, discriminationRating: true },
            take: 15,
          })
        : Promise.resolve([]),

      dim === 'GRAMMAR'
        ? this.prisma.scrambleExercise.findMany({
            where: { isAvailableForPlacement: true, ...(window !== Infinity && { difficultyRating: diffWhere }) },
            select: { id: true, sentence: true, words: true, difficultyRating: true, discriminationRating: true },
            take: 15,
          })
        : Promise.resolve([]),

      dim !== 'GRAMMAR' && dim !== 'LISTENING'
        ? this.prisma.multipleChoice.findMany({
            where: {
              isAvailableForPlacement: true,
              category: dim,
              ...(window !== Infinity && { difficultyRating: diffWhere }),
            },
            select: {
              id: true,
              question: true,
              options: true,
              correctIndex: true,
              difficultyRating: true,
              discriminationRating: true,
            },
            take: 15,
          })
        : Promise.resolve([]),

      dim === 'LISTENING'
        ? this.prisma.listeningQuestion.findMany({
            where: {
              listeningMaterial: {
                isAvailableForPlacement: true,
                ...(window !== Infinity && { difficultyRating: diffWhere }),
              },
            },
            select: {
              id: true,
              question: true,
              options: true,
              correctIndex: true,
              listeningMaterial: { select: { id: true, difficultyRating: true, discriminationRating: true } },
            },
            take: 15,
          })
        : Promise.resolve([]),
    ]);

    const result: Array<QuestionSnapshot & { info: number }> = [];

    for (const ex of exercises) {
      const snap = this.exerciseToSnapshot(ex);
      if (snap !== null) {
        result.push({ ...snap, info: info2PL(thetaVal, snap.difficulty, snap.discrimination) });
      }
    }

    for (const sc of scrambles) {
      const snap = this.scrambleToSnapshot(sc);
      if (snap !== null) {
        result.push({ ...snap, info: info2PL(thetaVal, snap.difficulty, snap.discrimination) });
      }
    }

    for (const mcq of mcqs) {
      const b = mcq.difficultyRating ?? 0;
      const a = mcq.discriminationRating ?? 1;
      result.push({
        sourceId: mcq.id,
        dimension: dim,
        text: mcq.question,
        options: mcq.options,
        correctIndex: mcq.correctIndex,
        difficulty: b,
        discrimination: a,
        info: info2PL(thetaVal, b, a),
      });
    }

    for (const lq of listeningQuestions) {
      const b = lq.listeningMaterial?.difficultyRating ?? 0;
      const a = lq.listeningMaterial?.discriminationRating ?? 1;
      result.push({
        sourceId: lq.id,
        dimension: 'LISTENING',
        text: lq.question,
        options: lq.options,
        correctIndex: lq.correctIndex,
        difficulty: b,
        discrimination: a,
        info: info2PL(thetaVal, b, a),
      });
    }

    return result;
  }

  private exerciseToSnapshot(ex: {
    id: string;
    sentence: string;
    blanks: unknown;
    difficultyRating: number | null;
    discriminationRating: number | null;
  }): QuestionSnapshot | null {
    type BlankShape = { answer: string; options: string[] };
    const blanks = ex.blanks as BlankShape[];
    const first = blanks[0];
    if (first === undefined) return null;

    const distractors = first.options.filter((o) => o !== first.answer);
    while (distractors.length < 3) {
      const g = `Option ${distractors.length + 2}`;
      if (!distractors.includes(g)) distractors.push(g);
      else break;
    }
    if (distractors.length < 3) return null;

    const shuffled = this.deterministicShuffle([first.answer, ...distractors.slice(0, 3)], ex.id);

    return {
      sourceId: ex.id,
      dimension: 'GRAMMAR',
      text: ex.sentence,
      options: shuffled,
      correctIndex: shuffled.indexOf(first.answer),
      difficulty: ex.difficultyRating ?? 0,
      discrimination: ex.discriminationRating ?? 1,
    };
  }

  private scrambleToSnapshot(ex: {
    id: string;
    sentence: string;
    words: unknown;
    difficultyRating: number | null;
    discriminationRating: number | null;
  }): QuestionSnapshot | null {
    type WordShape = { word: string; position: number; isDistractor: boolean };
    const words = ex.words as WordShape[];
    const correctWords = words.filter((w) => !w.isDistractor).sort((a, b) => a.position - b.position);
    if (correctWords.length < 3) return null;

    const wrongVariants = this.generateWrongOrderVariants(correctWords, ex.id);
    if (wrongVariants.length < 3) return null;

    const options = this.deterministicShuffle([ex.sentence, ...wrongVariants.slice(0, 3)], ex.id);

    return {
      sourceId: ex.id,
      dimension: 'GRAMMAR',
      text: 'Which sentence is grammatically correct?',
      options,
      correctIndex: options.indexOf(ex.sentence),
      difficulty: ex.difficultyRating ?? 0,
      discrimination: ex.discriminationRating ?? 1,
    };
  }

  private generateWrongOrderVariants(correctWords: Array<{ word: string }>, seed: string): string[] {
    const base = correctWords.map((w) => w.word);
    const correctSentence = base.join(' ');
    const variants = new Set<string>();

    for (let i = 0; i < base.length - 1; i++) {
      const swapped = [...base];
      [swapped[i], swapped[i + 1]] = [swapped[i + 1]!, swapped[i]!];
      const candidate = swapped.join(' ');
      if (candidate !== correctSentence) variants.add(candidate);
    }

    return this.deterministicShuffle([...variants], seed).slice(0, 3);
  }

  private deterministicShuffle<T>(arr: T[], seed: string): T[] {
    const copy = [...arr];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + (seed.codePointAt(i) ?? 0)) >>> 0;
    }
    for (let i = copy.length - 1; i > 0; i--) {
      hash = (hash * 1664525 + 1013904223) >>> 0;
      const j = hash % (i + 1);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  }

  private thetaToNormalizedScore(theta: number): number {
    return Math.round(((theta - GRID_MIN) / (GRID_MAX - GRID_MIN)) * 100);
  }

  private levelScoreToTheta(score: number): number {
    return GRID_MIN + (score / 100) * (GRID_MAX - GRID_MIN);
  }

  private speakingScoreToLevel(score: number): Level {
    return this.thetaToLevel(this.levelScoreToTheta(score));
  }

  private thetaToLevel(theta: number): Level {
    for (const b of LEVEL_BOUNDARIES) {
      if (theta >= b.min && theta < b.max) return b.level;
    }
    return theta <= GRID_MIN ? 'A1' : 'C2';
  }

  private publicQuestion(q: QuestionSnapshot, index: number, answered: number, section: PlacementSectionType) {
    return {
      index,
      section,
      dimension: q.dimension,
      text: q.text,
      options: q.options,
      questionsAnswered: answered,
    };
  }

  private getCacheKey(dim: AbilityDimension, thetaVal: number, window: number): string {
    return `${dim}:${thetaVal.toFixed(2)}:${window === Infinity ? 'INF' : window.toFixed(1)}`;
  }

  private getFromCache(key: string): Array<QuestionSnapshot & { info: number }> | null {
    const cached = this.questionCache.get(key);
    if (cached === undefined) return null;
    if (Date.now() - cached.timestamp > this.CACHE_TTL_MS) {
      this.questionCache.delete(key);
      return null;
    }
    return cached.data;
  }

  private setCache(key: string, data: Array<QuestionSnapshot & { info: number }>): void {
    if (this.questionCache.size >= 100) {
      const firstKey = this.questionCache.keys().next().value;
      if (typeof firstKey === 'string') this.questionCache.delete(firstKey);
    }
    this.questionCache.set(key, { data, timestamp: Date.now() });
  }
}
