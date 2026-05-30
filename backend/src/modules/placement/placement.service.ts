import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildInitialProgress } from '../../constants/level-requirements';
import type { AnswerPlacementDto } from './dto/placement.dto';
import {
  AbilityDimension,
  DimensionTheta,
  DimensionSE,
  PRIOR_MEAN,
  PRIOR_SD,
  THETA_GRID,
  p2PL,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  SE_CONVERGENCE,
  INITIAL_SE,
  FETCH_WINDOW,
  info2PL,
  CONTENT_TARGET,
  LEVEL_BOUNDARIES,
  GRID_MIN,
  eapForDimension,
} from 'src/constants/placement-constants';

interface QuestionSnapshot {
  sourceId: string;
  dimension: AbilityDimension;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: number;
  discrimination: number;
}

interface AnswerRecord {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  answeredAt: string;
  thetaSnapshot: DimensionTheta;
  seSnapshot: DimensionSE;
}

@Injectable()
export class PlacementService {
  private readonly logger = new Logger(PlacementService.name);
  private readonly questionCache = new Map<
    string,
    { data: Array<QuestionSnapshot & { info: number }>; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    try {
      const existing = await this.prisma.placementTest.findUnique({ where: { userId } });
      if (existing !== null) {
        return existing;
      }

      return this.prisma.placementTest.create({
        data: {
          userId,
          status: 'PENDING',
          theta: this.initialTheta() as any,
          standardError: this.initialSE() as any,
          questions: [] as any,
          answers: [] as any,
        },
      });
    } catch (error) {
      this.logger.error('Error in getOrCreate', { userId, error });
      throw error;
    }
  }

  async start(userId: string) {
    const test = await this.getOrCreate(userId);

    if (test.status === 'IN_PROGRESS') {
      throw new BadRequestException(
        'You have an active test in progress. Please complete or cancel it first.',
      );
    }

    if (test.status === 'COMPLETED') {
      throw new BadRequestException(
        'You have already completed the placement test. Your level has been set.',
      );
    }

    const theta = this.initialTheta();
    const firstQuestion = await this.fetchNextQuestion([], theta, {
      GRAMMAR: 0,
      VOCABULARY: 0,
      READING: 0,
      LISTENING: 0,
    });

    if (firstQuestion === null) {
      throw new BadRequestException(
        'Not enough placement questions available. Please contact support.',
      );
    }

    const updated = await this.prisma.placementTest.update({
      where: { userId },
      data: {
        status: 'IN_PROGRESS',
        theta: theta as any,
        standardError: this.initialSE() as any,
        questions: [firstQuestion] as any,
        answers: [] as any,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        completedAt: null,
        detectedLevel: null,
        confidenceScore: null,
      },
    });

    return {
      test: updated,
      nextQuestion: this.publicQuestion(firstQuestion, 0),
      maxQuestions: MAX_QUESTIONS,
    };
  }

  async answer(userId: string, dto: AnswerPlacementDto) {
    const test = await this.prisma.placementTest.findUnique({ where: { userId } });

    if (test === null || test.status !== 'IN_PROGRESS') {
      throw new BadRequestException('No active placement test.');
    }

    const questions = test.questions as unknown as QuestionSnapshot[];
    const answers = test.answers as unknown as AnswerRecord[];
    const question = questions[dto.questionIndex];

    if (question === undefined) {
      this.logger.warn('Question not found', { userId, questionIndex: dto.questionIndex });
      throw new BadRequestException(`Question ${dto.questionIndex} not found.`);
    }

    if (answers.some((a) => a.questionIndex === dto.questionIndex)) {
      this.logger.warn('Question already answered', { userId, questionIndex: dto.questionIndex });
      throw new BadRequestException('Question already answered.');
    }

    const isCorrect = dto.selectedIndex === question.correctIndex;

    const { theta: newTheta, standardError: newSE } = this.estimateAllWithNewAnswer(
      answers,
      questions,
      dto.questionIndex,
      isCorrect,
    );

    const answerRecord: AnswerRecord = {
      questionIndex: dto.questionIndex,
      selectedIndex: dto.selectedIndex,
      isCorrect,
      answeredAt: new Date().toISOString(),
      thetaSnapshot: newTheta,
      seSnapshot: newSE,
    };

    const allAnswers = [...answers, answerRecord];

    const answeredCount = allAnswers.length;
    const maxSE = Math.max(newSE.grammar, newSE.vocabulary, newSE.reading, newSE.listening);

    const converged =
      answeredCount >= MIN_QUESTIONS && (maxSE <= SE_CONVERGENCE || answeredCount >= MAX_QUESTIONS);

    if (converged) {
      return this.finalize(userId, test, newTheta, newSE, questions, allAnswers);
    }

    const typeCounts = this.countByDimension(allAnswers, questions);
    const excludedIds = questions.map((q) => q.sourceId);
    const nextQuestion = await this.fetchNextQuestion(excludedIds, newTheta, typeCounts);

    if (nextQuestion === null) {
      return this.finalize(userId, test, newTheta, newSE, questions, allAnswers);
    }

    await this.prisma.placementTest.update({
      where: { id: test.id },
      data: {
        theta: newTheta as any,
        standardError: newSE as any,
        answers: allAnswers as any,
        questions: [...questions, nextQuestion] as any,
        lastActivityAt: new Date(),
      },
    });

    return {
      converged: false,
      isCorrect,
      questionsAnswered: answeredCount,
      nextQuestion: this.publicQuestion(nextQuestion, questions.length),
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

    try {
      await this.applyLevel(userId, 'A1');
    } catch (error) {
      this.logger.error('Error applying A1 level after skip', { userId, error });
    }

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

  async getStatus(userId: string) {
    const test = await this.getOrCreate(userId);

    const showBanner =
      test.status === 'PENDING' ||
      test.status === 'IN_PROGRESS' ||
      (test.status === 'REMIND_LATER' &&
        (test.remindAfter === null || test.remindAfter <= new Date()));

    return {
      status: test.status,
      showBanner,
      detectedLevel: test.detectedLevel,
      confidenceScore: test.confidenceScore,
    };
  }

  private async finalize(
    userId: string,
    test: any,
    theta: DimensionTheta,
    standardError: DimensionSE,
    questions: QuestionSnapshot[],
    answers: AnswerRecord[],
  ) {
    const aggregate =
      theta.grammar * 0.3 + theta.vocabulary * 0.3 + theta.reading * 0.2 + theta.listening * 0.2;

    const detectedLevel = this.thetaToLevel(aggregate);

    const avgSE =
      (standardError.grammar +
        standardError.vocabulary +
        standardError.reading +
        standardError.listening) /
      4;
    const confidenceScore = Math.round(Math.max(0, Math.min(100, (1 - avgSE / INITIAL_SE) * 100)));

    const testDurationSeconds = this.calculateTestDuration(answers);
    const averageAnswerTime = answers.length > 0 ? testDurationSeconds / answers.length : 0;

    const currentAttemptCount = (test.attemptCount ?? 0) + 1;

    await this.prisma.placementTest.update({
      where: { id: test.id },
      data: {
        status: 'COMPLETED',
        theta: theta as any,
        standardError: standardError as any,
        detectedLevel,
        confidenceScore,
        questions: questions as any,
        answers: answers as any,
        completedAt: new Date(),
        lastCompletedAt: new Date(),
        testDurationSeconds,
        averageAnswerTimeSeconds: averageAnswerTime,
        attemptCount: currentAttemptCount,
      },
    });

    try {
      await this.applyLevel(userId, detectedLevel);
    } catch (error) {
      this.logger.error('Error applying level after completion', {
        userId,
        detectedLevel,
        error,
      });
    }

    this.logger.log('PLACEMENT_COMPLETED', {
      userId,
      detectedLevel,
      aggregate: aggregate.toFixed(2),
      theta: {
        grammar: theta.grammar.toFixed(2),
        vocabulary: theta.vocabulary.toFixed(2),
        reading: theta.reading.toFixed(2),
        listening: theta.listening.toFixed(2),
      },
      se: {
        grammar: standardError.grammar.toFixed(3),
        vocabulary: standardError.vocabulary.toFixed(3),
        reading: standardError.reading.toFixed(3),
        listening: standardError.listening.toFixed(3),
      },
      confidenceScore,
      questionsAnswered: answers.length,
      testDurationSeconds,
      averageAnswerTime: averageAnswerTime.toFixed(2),
    });

    return {
      converged: true,
      detectedLevel,
      confidenceScore,
      theta,
      standardError,
      questionsAnswered: answers.length,
    };
  }

  private estimateAllWithNewAnswer(
    answers: AnswerRecord[],
    questions: QuestionSnapshot[],
    newAnswerIndex: number,
    isCorrect: boolean,
  ): { theta: DimensionTheta; standardError: DimensionSE } {
    const dims: AbilityDimension[] = ['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING'];
    const theta = this.initialTheta();
    const standardError = this.initialSE();

    for (const dim of dims) {
      const responses = answers
        .map((a) => {
          const q = questions[a.questionIndex];
          if (q === undefined || q.dimension !== dim) {
            return null;
          }
          return {
            difficulty: q.difficulty,
            discrimination: q.discrimination,
            correct: a.isCorrect,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const newQ = questions[newAnswerIndex];
      if (newQ && newQ.dimension === dim) {
        responses.push({
          difficulty: newQ.difficulty,
          discrimination: newQ.discrimination,
          correct: isCorrect,
        });
      }

      const { estimate, se } = eapForDimension(responses);

      switch (dim) {
        case 'GRAMMAR':
          theta.grammar = estimate;
          standardError.grammar = se;
          break;
        case 'VOCABULARY':
          theta.vocabulary = estimate;
          standardError.vocabulary = se;
          break;
        case 'READING':
          theta.reading = estimate;
          standardError.reading = se;
          break;
        case 'LISTENING':
          theta.listening = estimate;
          standardError.listening = se;
          break;
      }
    }

    return { theta, standardError };
  }

  private async fetchNextQuestion(
    excludeIds: string[],
    theta: DimensionTheta,
    typeCounts: Record<AbilityDimension, number>,
  ): Promise<QuestionSnapshot | null> {
    const dim = this.selectDimension(typeCounts);
    let thetaVal: number;

    switch (dim) {
      case 'GRAMMAR':
        thetaVal = theta.grammar;
        break;
      case 'VOCABULARY':
        thetaVal = theta.vocabulary;
        break;
      case 'READING':
        thetaVal = theta.reading;
        break;
      case 'LISTENING':
        thetaVal = theta.listening;
        break;
    }

    const candidates = await this.fetchCandidates(excludeIds, dim, thetaVal, FETCH_WINDOW);

    if (candidates.length === 0) {
      const widened = await this.fetchCandidates(excludeIds, dim, thetaVal, Infinity);
      if (widened.length === 0) {
        return null;
      }
      widened.sort((a, b) => b.info - a.info);
      return widened[0] ?? null;
    }

    candidates.sort((a, b) => b.info - a.info);
    return candidates[0] ?? null;
  }

  private async fetchCandidates(
    excludeIds: string[],
    dim: AbilityDimension,
    thetaVal: number,
    window: number,
  ): Promise<Array<QuestionSnapshot & { info: number }>> {
    const cacheKey = this.getCacheKey(dim, thetaVal, window);
    const cached = this.getFromCache(cacheKey);

    let result: Array<QuestionSnapshot & { info: number }>;

    if (cached !== null) {
      result = cached;
    } else {
      result = await this.fetchCandidatesFromDB(dim, thetaVal, window);
      this.setCache(cacheKey, result);
    }

    return result.filter((q) => !excludeIds.includes(q.sourceId));
  }

  private getCacheKey(dim: AbilityDimension, thetaVal: number, window: number): string {
    const theta = thetaVal.toFixed(2);
    const w = window === Infinity ? 'INF' : window.toFixed(1);
    return `${dim}:${theta}:${w}`;
  }

  private getFromCache(key: string): Array<QuestionSnapshot & { info: number }> | null {
    const cached = this.questionCache.get(key);
    if (cached === undefined) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL_MS) {
      this.questionCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: Array<QuestionSnapshot & { info: number }>): void {
    if (this.questionCache.size > 100) {
      const firstKey = this.questionCache.keys().next().value;
      if (typeof firstKey === 'string') {
        this.questionCache.delete(firstKey);
      }
    }

    this.questionCache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchCandidatesFromDB(
    dim: AbilityDimension,
    thetaVal: number,
    window: number,
  ): Promise<Array<QuestionSnapshot & { info: number }>> {
    const diffWhere = window === Infinity ? {} : { gte: thetaVal - window, lte: thetaVal + window };

    const [exercises, mcqs, listeningQuestions] = await Promise.all([
      dim === 'GRAMMAR'
        ? this.prisma.exercise.findMany({
            where: {
              isAvailableForPlacement: true,
              ...(window !== Infinity && { difficultyRating: diffWhere }),
            },
            select: {
              id: true,
              sentence: true,
              blanks: true,
              difficultyRating: true,
              discriminationRating: true,
            },
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
              listeningMaterial: {
                select: {
                  id: true,
                  difficultyRating: true,
                  discriminationRating: true,
                },
              },
            },
            take: 15,
          })
        : Promise.resolve([]),
    ]);

    const result: Array<QuestionSnapshot & { info: number }> = [];

    for (const ex of exercises) {
      const snapshot = this.exerciseToSnapshot(ex);
      if (snapshot === null) {
        continue;
      }
      result.push({
        ...snapshot,
        info: info2PL(thetaVal, snapshot.difficulty, snapshot.discrimination),
      });
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

  private selectDimension(typeCounts: Record<AbilityDimension, number>): AbilityDimension {
    const total = (Object.values(typeCounts) as number[]).reduce((s, n) => s + n, 0) + 1;
    const dims: AbilityDimension[] = ['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING'];

    const scored = dims.map((dim) => {
      const count = typeCounts[dim];
      const actual = count / total;
      const uncertainty = 1.0 / (count + 1);
      const balanceBonus = Math.max(0, CONTENT_TARGET[dim] - actual) * 2.0;
      return { dim, score: uncertainty + balanceBonus };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.dim ?? 'GRAMMAR';
  }

  private countByDimension(
    answers: AnswerRecord[],
    questions: QuestionSnapshot[],
  ): Record<AbilityDimension, number> {
    const counts: Record<AbilityDimension, number> = {
      GRAMMAR: 0,
      VOCABULARY: 0,
      READING: 0,
      LISTENING: 0,
    };

    for (const a of answers) {
      const q = questions[a.questionIndex];
      if (q !== undefined) {
        counts[q.dimension]++;
      }
    }

    return counts;
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
    if (blanks.length === 0) {
      return null;
    }

    const first = blanks[0];
    if (first === undefined) {
      return null;
    }

    const distractors = first.options.filter((o) => o !== first.answer);

    // If not enough distractors, pad with generic options
    while (distractors.length < 3) {
      const generic = `Option ${distractors.length + 2}`;
      if (!distractors.includes(generic)) {
        distractors.push(generic);
      } else {
        break;
      }
    }

    if (distractors.length < 3) {
      return null;
    }

    const selectedDistractors = distractors.slice(0, 3);
    const shuffled = this.deterministicShuffle([first.answer, ...selectedDistractors], ex.id);

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

  private async applyLevel(userId: string, level: Level) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentLevel: level },
    });

    const progressData = {
      ...buildInitialProgress(level),
      isReadyForTest: false,
      testUnlockedAt: null,
    };

    await this.prisma.levelProgress.upsert({
      where: { userId },
      update: progressData,
      create: { userId, ...progressData },
    });
  }

  private thetaToLevel(theta: number): Level {
    for (const b of LEVEL_BOUNDARIES) {
      if (theta >= b.min && theta < b.max) {
        return b.level;
      }
    }
    return theta <= GRID_MIN ? 'A1' : 'C2';
  }

  private calculateTestDuration(answers: AnswerRecord[]): number {
    if (answers.length === 0) return 0;
    const first = answers[0];
    const last = answers[answers.length - 1];
    if (!first || !last) return 0;
    const firstTime = new Date(first.answeredAt).getTime();
    const lastTime = new Date(last.answeredAt).getTime();
    return Math.floor((lastTime - firstTime) / 1000);
  }

  private publicQuestion(q: QuestionSnapshot, index: number) {
    return {
      index,
      dimension: q.dimension,
      text: q.text,
      options: q.options,
    };
  }

  private initialTheta(): DimensionTheta {
    return {
      grammar: PRIOR_MEAN,
      vocabulary: PRIOR_MEAN,
      reading: PRIOR_MEAN,
      listening: PRIOR_MEAN,
    };
  }

  private initialSE(): DimensionSE {
    return {
      grammar: INITIAL_SE,
      vocabulary: INITIAL_SE,
      reading: INITIAL_SE,
      listening: INITIAL_SE,
    };
  }
}
