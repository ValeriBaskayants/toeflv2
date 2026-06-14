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
} from '../../constants/placement-constants';









const DIMENSION_WEIGHTS: Readonly<Record<AbilityDimension, number>> = {
  GRAMMAR:    0.30,
  VOCABULARY: 0.30,
  READING:    0.20,
  LISTENING:  0.20,
} as const;


const RETAKE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;



const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;





interface QuestionSnapshot {
  sourceId:       string;
  dimension:      AbilityDimension;
  text:           string;
  options:        string[];
  correctIndex:   number;
  difficulty:     number;
  discrimination: number;
}

interface AnswerRecord {
  questionIndex:  number;
  selectedIndex:  number;
  isCorrect:      boolean;
  answeredAt:     string;    
  questionStartAt: string;   
  thetaSnapshot:  DimensionTheta;
  seSnapshot:     DimensionSE;
}





@Injectable()
export class PlacementService {
  private readonly logger = new Logger(PlacementService.name);

  
  
  private readonly questionCache = new Map<
    string,
    { data: Array<QuestionSnapshot & { info: number }>; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; 

  constructor(private readonly prisma: PrismaService) {}

  

  async getOrCreate(userId: string) {
    const existing = await this.prisma.placementTest.findUnique({ where: { userId } });
    if (existing !== null) return existing;

    return this.prisma.placementTest.create({
      data: {
        userId,
        status:        'PENDING',
        theta:         this.initialTheta() as object,
        standardError: this.initialSE() as object,
        questions:     [] as object,
        answers:       [] as object,
      },
    });
  }

  

  async getStatus(userId: string) {
    const test = await this.getOrCreate(userId);
    const now  = new Date();

    
    let status = test.status;
    if (
      status === 'IN_PROGRESS' &&
      test.lastActivityAt !== null &&
      now.getTime() - test.lastActivityAt.getTime() > INACTIVITY_TIMEOUT_MS
    ) {
      await this.prisma.placementTest.update({
        where: { id: test.id },
        data:  { status: 'PENDING' },
      });
      status = 'PENDING';
    }

    const showBanner =
      status === 'PENDING' ||
      status === 'IN_PROGRESS' ||
      (status === 'REMIND_LATER' &&
        (test.remindAfter === null || test.remindAfter <= now));

    
    const canRetake =
      status === 'COMPLETED' &&
      test.lastCompletedAt !== null &&
      now.getTime() - test.lastCompletedAt.getTime() >= RETAKE_COOLDOWN_MS;

    return {
      status,
      showBanner,
      detectedLevel:   test.detectedLevel,
      confidenceScore: test.confidenceScore,
      attemptCount:    test.attemptCount,
      canRetake,
      
      lastCompletedAt: test.lastCompletedAt,
    };
  }

  
  
  
  
  
  

  async start(userId: string) {
    const test = await this.getOrCreate(userId);
    const now  = new Date();

    if (test.status === 'IN_PROGRESS') {
      
      const isTimedOut =
        test.lastActivityAt !== null &&
        now.getTime() - test.lastActivityAt.getTime() > INACTIVITY_TIMEOUT_MS;

      if (!isTimedOut) {
        throw new BadRequestException(
          'You have an active test in progress. Please complete it or wait for the session to expire.',
        );
      }
      
      this.logger.log('PLACEMENT_TIMED_OUT_RESTART', { userId });
    }

    if (test.status === 'COMPLETED') {
      const canRetake =
        test.lastCompletedAt !== null &&
        now.getTime() - test.lastCompletedAt.getTime() >= RETAKE_COOLDOWN_MS;

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
        attemptCount:  test.attemptCount,
      });
    }

    const theta         = this.initialTheta();
    const firstQuestion = await this.fetchNextQuestion([], theta, {
      GRAMMAR: 0, VOCABULARY: 0, READING: 0, LISTENING: 0,
    });

    if (firstQuestion === null) {
      throw new BadRequestException(
        'Not enough placement questions available. Please contact support.',
      );
    }

    
    const firstWithTiming = { ...firstQuestion, shownAt: now.toISOString() };

    const updated = await this.prisma.placementTest.update({
      where: { userId },
      data: {
        status:        'IN_PROGRESS',
        theta:         theta as object,
        standardError: this.initialSE() as object,
        questions:     [firstWithTiming] as object,
        answers:       [] as object,
        startedAt:     now,
        lastActivityAt: now,
        
        detectedLevel:   null,
        confidenceScore: null,
      },
    });

    return {
      test:          updated,
      nextQuestion:  this.publicQuestion(firstQuestion, 0, 0, MAX_QUESTIONS),
      maxQuestions:  MAX_QUESTIONS,
    };
  }

  
  
  
  

  async answer(userId: string, dto: AnswerPlacementDto) {
    const test = await this.prisma.placementTest.findUnique({ where: { userId } });

    if (test === null || test.status !== 'IN_PROGRESS') {
      throw new BadRequestException('No active placement test.');
    }

    type QuestionWithTiming = QuestionSnapshot & { shownAt?: string };
    const questions = test.questions as unknown as QuestionWithTiming[];
    const answers   = test.answers   as unknown as AnswerRecord[];
    const question  = questions[dto.questionIndex];

    if (question === undefined) {
      throw new BadRequestException(`Question ${dto.questionIndex} not found.`);
    }

    
    const answeredIndices = new Set(answers.map((a) => a.questionIndex));
    if (answeredIndices.has(dto.questionIndex)) {
      throw new BadRequestException('Question already answered.');
    }

    
    if (dto.selectedIndex >= question.options.length) {
      throw new BadRequestException(
        `Invalid option index ${dto.selectedIndex} — question has ${question.options.length} options.`,
      );
    }

    const isCorrect = dto.selectedIndex === question.correctIndex;
    const now       = new Date();

    const { theta: newTheta, standardError: newSE } = this.estimateAllWithNewAnswer(
      answers,
      questions,
      dto.questionIndex,
      isCorrect,
    );

    
    const questionStartAt = question.shownAt ?? new Date(now.getTime() - 30000).toISOString();

    const answerRecord: AnswerRecord = {
      questionIndex:   dto.questionIndex,
      selectedIndex:   dto.selectedIndex,
      isCorrect,
      answeredAt:      now.toISOString(),
      questionStartAt, 
      thetaSnapshot:   newTheta,
      seSnapshot:      newSE,
    };

    const allAnswers    = [...answers, answerRecord];
    const answeredCount = allAnswers.length;
    const maxSE         = Math.max(newSE.grammar, newSE.vocabulary, newSE.reading, newSE.listening);

    const converged =
      answeredCount >= MIN_QUESTIONS &&
      (maxSE <= SE_CONVERGENCE || answeredCount >= MAX_QUESTIONS);

    if (converged) {
      return this.finalize(userId, test, newTheta, newSE, questions, allAnswers);
    }

    const typeCounts   = this.countByDimension(allAnswers, questions);
    const excludedIds  = questions.map((q) => q.sourceId);
    const nextQuestion = await this.fetchNextQuestion(excludedIds, newTheta, typeCounts);

    if (nextQuestion === null) {
      return this.finalize(userId, test, newTheta, newSE, questions, allAnswers);
    }

    
    const nextWithTiming = { ...nextQuestion, shownAt: now.toISOString() };

    await this.prisma.placementTest.update({
      where: { id: test.id },
      data: {
        theta:         newTheta as object,
        standardError: newSE    as object,
        answers:       allAnswers as object,
        questions:     [...questions, nextWithTiming] as object,
        lastActivityAt: now,
      },
    });

    return {
      converged:         false,
      isCorrect,
      questionsAnswered: answeredCount,
      
      nextQuestion: this.publicQuestion(nextQuestion, questions.length, answeredCount, MAX_QUESTIONS),
      
      progressHint: this.buildProgressHint(newTheta, newSE, answeredCount),
    };
  }

  

  async skip(userId: string) {
    const test = await this.getOrCreate(userId);

    if (test.status === 'COMPLETED') {
      throw new BadRequestException('Placement test already completed.');
    }

    await this.prisma.placementTest.update({
      where: { userId },
      data:  { status: 'SKIPPED' },
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
      data:  { status: 'REMIND_LATER', remindAfter },
    });

    return { remindAfter };
  }

  
  
  

  private async finalize(
    userId:        string,
    test:          { id: string; attemptCount: number; completedAt: Date | null },
    theta:         DimensionTheta,
    standardError: DimensionSE,
    questions:     QuestionSnapshot[],
    answers:       AnswerRecord[],
  ) {
    
    const aggregate =
      theta.grammar    * DIMENSION_WEIGHTS.GRAMMAR    +
      theta.vocabulary * DIMENSION_WEIGHTS.VOCABULARY +
      theta.reading    * DIMENSION_WEIGHTS.READING    +
      theta.listening  * DIMENSION_WEIGHTS.LISTENING;

    const detectedLevel = this.thetaToLevel(aggregate);

    
    
    
    
    
    const avgSE = (
      standardError.grammar + standardError.vocabulary +
      standardError.reading + standardError.listening
    ) / 4;

    const confidenceScore = Math.round(
      Math.max(0, Math.min(100,
        ((INITIAL_SE - avgSE) / (INITIAL_SE - SE_CONVERGENCE)) * 100,
      )),
    );

    
    const { testDurationSeconds, averageAnswerTimeSeconds } =
      this.calculateTestDuration(answers);

    const isFirstCompletion = test.completedAt === null;
    const currentAttemptCount = (test.attemptCount ?? 0) + 1;

    await this.prisma.placementTest.update({
      where: { id: test.id },
      data: {
        status:          'COMPLETED',
        theta:           theta as object,
        standardError:   standardError as object,
        detectedLevel,
        confidenceScore,
        questions:       questions as object,
        answers:         answers as object,
        
        completedAt:     isFirstCompletion ? new Date() : undefined,
        lastCompletedAt: new Date(),
        testDurationSeconds,
        averageAnswerTimeSeconds,
        attemptCount: currentAttemptCount,
      },
    });

    await this.applyLevel(userId, detectedLevel).catch((err) =>
      this.logger.error('Error applying level after completion', { userId, detectedLevel, err }),
    );

    this.logger.log('PLACEMENT_COMPLETED', {
      userId,
      detectedLevel,
      aggregate:       aggregate.toFixed(2),
      theta:           { g: theta.grammar.toFixed(2), v: theta.vocabulary.toFixed(2), r: theta.reading.toFixed(2), l: theta.listening.toFixed(2) },
      se:              { g: standardError.grammar.toFixed(3), v: standardError.vocabulary.toFixed(3), r: standardError.reading.toFixed(3), l: standardError.listening.toFixed(3) },
      confidenceScore,
      questionsAnswered: answers.length,
      testDurationSeconds,
      isRetake: !isFirstCompletion,
      attemptCount: currentAttemptCount,
    });

    return {
      converged:         true,
      detectedLevel,
      confidenceScore,
      theta,
      standardError,
      questionsAnswered: answers.length,
      testDurationSeconds,
      
      dimensionBreakdown: this.buildDimensionBreakdown(theta, standardError),
      isRetake: !isFirstCompletion,
    };
  }

  
  
  

  private estimateAllWithNewAnswer(
    answers:         AnswerRecord[],
    questions:       QuestionSnapshot[],
    newAnswerIndex:  number,
    isCorrect:       boolean,
  ): { theta: DimensionTheta; standardError: DimensionSE } {
    const dims: AbilityDimension[] = ['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING'];
    const theta         = this.initialTheta();
    const standardError = this.initialSE();

    for (const dim of dims) {
      const responses = answers
        .map((a) => {
          const q = questions[a.questionIndex];
          if (q === undefined || q.dimension !== dim) return null;
          return { difficulty: q.difficulty, discrimination: q.discrimination, correct: a.isCorrect };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const newQ = questions[newAnswerIndex];
      if (newQ !== undefined && newQ.dimension === dim) {
        responses.push({ difficulty: newQ.difficulty, discrimination: newQ.discrimination, correct: isCorrect });
      }

      const { estimate, se } = eapForDimension(responses);

      switch (dim) {
        case 'GRAMMAR':    theta.grammar    = estimate; standardError.grammar    = se; break;
        case 'VOCABULARY': theta.vocabulary = estimate; standardError.vocabulary = se; break;
        case 'READING':    theta.reading    = estimate; standardError.reading    = se; break;
        case 'LISTENING':  theta.listening  = estimate; standardError.listening  = se; break;
      }
    }

    return { theta, standardError };
  }

  
  
  

  private async fetchNextQuestion(
    excludeIds: string[],
    theta:      DimensionTheta,
    typeCounts: Record<AbilityDimension, number>,
  ): Promise<QuestionSnapshot | null> {
    const dim = this.selectDimension(typeCounts);
    const thetaVal = theta[dim.toLowerCase() as keyof DimensionTheta];

    const candidates = await this.fetchCandidates(excludeIds, dim, thetaVal, FETCH_WINDOW);

    if (candidates.length === 0) {
      
      const widened = await this.fetchCandidates(excludeIds, dim, thetaVal, Infinity);
      if (widened.length === 0) return null;
      widened.sort((a, b) => b.info - a.info);
      return widened[0] ?? null;
    }

    candidates.sort((a, b) => b.info - a.info);
    return candidates[0] ?? null;
  }

  private async fetchCandidates(
    excludeIds: string[],
    dim:        AbilityDimension,
    thetaVal:   number,
    window:     number,
  ): Promise<Array<QuestionSnapshot & { info: number }>> {
    const cacheKey = this.getCacheKey(dim, thetaVal, window);
    const cached   = this.getFromCache(cacheKey);

    const result = cached ?? await (async () => {
      const fresh = await this.fetchCandidatesFromDB(dim, thetaVal, window);
      this.setCache(cacheKey, fresh);
      return fresh;
    })();

    return result.filter((q) => !excludeIds.includes(q.sourceId));
  }

  private async fetchCandidatesFromDB(
    dim:      AbilityDimension,
    thetaVal: number,
    window:   number,
  ): Promise<Array<QuestionSnapshot & { info: number }>> {
    const diffWhere = window === Infinity
      ? {}
      : { gte: thetaVal - window, lte: thetaVal + window };

    const [exercises, mcqs, listeningQuestions] = await Promise.all([
      dim === 'GRAMMAR'
        ? this.prisma.exercise.findMany({
            where:  { isAvailableForPlacement: true, ...(window !== Infinity && { difficultyRating: diffWhere }) },
            select: { id: true, sentence: true, blanks: true, difficultyRating: true, discriminationRating: true },
            take:   15,
          })
        : Promise.resolve([]),

      dim !== 'GRAMMAR' && dim !== 'LISTENING'
        ? this.prisma.multipleChoice.findMany({
            where:  { isAvailableForPlacement: true, category: dim, ...(window !== Infinity && { difficultyRating: diffWhere }) },
            select: { id: true, question: true, options: true, correctIndex: true, difficultyRating: true, discriminationRating: true },
            take:   15,
          })
        : Promise.resolve([]),

      dim === 'LISTENING'
        ? this.prisma.listeningQuestion.findMany({
            where:  { listeningMaterial: { isAvailableForPlacement: true, ...(window !== Infinity && { difficultyRating: diffWhere }) } },
            select: { id: true, question: true, options: true, correctIndex: true, listeningMaterial: { select: { id: true, difficultyRating: true, discriminationRating: true } } },
            take:   15,
          })
        : Promise.resolve([]),
    ]);

    const result: Array<QuestionSnapshot & { info: number }> = [];

    for (const ex of exercises) {
      const snapshot = this.exerciseToSnapshot(ex);
      if (snapshot !== null) {
        result.push({ ...snapshot, info: info2PL(thetaVal, snapshot.difficulty, snapshot.discrimination) });
      }
    }

    for (const mcq of mcqs) {
      const b = mcq.difficultyRating     ?? 0;
      const a = mcq.discriminationRating ?? 1;
      result.push({ sourceId: mcq.id, dimension: dim, text: mcq.question, options: mcq.options, correctIndex: mcq.correctIndex, difficulty: b, discrimination: a, info: info2PL(thetaVal, b, a) });
    }

    for (const lq of listeningQuestions) {
      const b = lq.listeningMaterial?.difficultyRating     ?? 0;
      const a = lq.listeningMaterial?.discriminationRating ?? 1;
      result.push({ sourceId: lq.id, dimension: 'LISTENING', text: lq.question, options: lq.options, correctIndex: lq.correctIndex, difficulty: b, discrimination: a, info: info2PL(thetaVal, b, a) });
    }

    return result;
  }

  private selectDimension(typeCounts: Record<AbilityDimension, number>): AbilityDimension {
    const total = (Object.values(typeCounts) as number[]).reduce((s, n) => s + n, 0) + 1;
    const dims: AbilityDimension[] = ['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING'];

    const scored = dims.map((dim) => {
      const count      = typeCounts[dim];
      const actual     = count / total;
      const uncertainty = 1.0 / (count + 1);
      const balanceBonus = Math.max(0, CONTENT_TARGET[dim] - actual) * 2.0;
      return { dim, score: uncertainty + balanceBonus };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.dim ?? 'GRAMMAR';
  }

  private countByDimension(
    answers:   AnswerRecord[],
    questions: QuestionSnapshot[],
  ): Record<AbilityDimension, number> {
    const counts: Record<AbilityDimension, number> = { GRAMMAR: 0, VOCABULARY: 0, READING: 0, LISTENING: 0 };
    for (const a of answers) {
      const q = questions[a.questionIndex];
      if (q !== undefined) counts[q.dimension]++;
    }
    return counts;
  }

  
  
  

  private exerciseToSnapshot(ex: {
    id: string; sentence: string; blanks: unknown;
    difficultyRating: number | null; discriminationRating: number | null;
  }): QuestionSnapshot | null {
    type BlankShape = { answer: string; options: string[] };
    const blanks = ex.blanks as BlankShape[];
    const first  = blanks[0];
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
      sourceId:       ex.id,
      dimension:      'GRAMMAR',
      text:           ex.sentence,
      options:        shuffled,
      correctIndex:   shuffled.indexOf(first.answer),
      difficulty:     ex.difficultyRating     ?? 0,
      discrimination: ex.discriminationRating ?? 1,
    };
  }

  private deterministicShuffle<T>(arr: T[], seed: string): T[] {
    const copy = [...arr];
    let hash   = 0;
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

  private async applyLevel(userId: string, level: Level): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data:  { currentLevel: level },
    });

    const progressData = {
      ...buildInitialProgress(level),
      isReadyForTest: false,
      testUnlockedAt: null,
    };

    await this.prisma.levelProgress.upsert({
      where:  { userId },
      update: progressData,
      create: { userId, ...progressData },
    });
  }

  private thetaToLevel(theta: number): Level {
    for (const b of LEVEL_BOUNDARIES) {
      if (theta >= b.min && theta < b.max) return b.level;
    }
    return theta <= GRID_MIN ? 'A1' : 'C2';
  }

  
  
  
  private calculateTestDuration(answers: AnswerRecord[]): {
    testDurationSeconds:      number;
    averageAnswerTimeSeconds:  number;
  } {
    if (answers.length === 0) {
      return { testDurationSeconds: 0, averageAnswerTimeSeconds: 0 };
    }

    let totalMs = 0;
    for (const a of answers) {
      const start = new Date(a.questionStartAt).getTime();
      const end   = new Date(a.answeredAt).getTime();
      const delta = end - start;
      
      totalMs += Math.min(delta, 5 * 60 * 1000);
    }

    const testDurationSeconds     = Math.floor(totalMs / 1000);
    const averageAnswerTimeSeconds = answers.length > 0 ? testDurationSeconds / answers.length : 0;

    return { testDurationSeconds, averageAnswerTimeSeconds };
  }

  
  private publicQuestion(
    q:            QuestionSnapshot,
    index:        number,
    answered:     number,
    maxQuestions: number,
  ) {
    return {
      index,
      dimension:      q.dimension,
      text:           q.text,
      options:        q.options,
      
      questionsAnswered: answered,
      estimatedTotal:    maxQuestions,
      
      progressPercent: Math.round((answered / maxQuestions) * 100),
    };
  }

  
  private buildProgressHint(
    theta:         DimensionTheta,
    se:            DimensionSE,
    answeredCount: number,
  ): string {
    
    if (answeredCount < MIN_QUESTIONS) {
      return 'Keep going — we are still calibrating your level.';
    }

    const maxSE = Math.max(se.grammar, se.vocabulary, se.reading, se.listening);
    if (maxSE <= SE_CONVERGENCE * 1.5) {
      return 'Almost done — just a few more questions to confirm your level.';
    }

    return 'Good progress! Continue to improve accuracy of your result.';
  }

  
  private buildDimensionBreakdown(
    theta: DimensionTheta,
    se:    DimensionSE,
  ): Array<{ dimension: string; theta: number; se: number; level: Level; confidence: string }> {
    const dims: Array<{ key: AbilityDimension; label: string }> = [
      { key: 'GRAMMAR',    label: 'Grammar' },
      { key: 'VOCABULARY', label: 'Vocabulary' },
      { key: 'READING',    label: 'Reading' },
      { key: 'LISTENING',  label: 'Listening' },
    ];

    return dims.map(({ key, label }) => {
      const t = theta[key.toLowerCase() as keyof DimensionTheta];
      const s = se[key.toLowerCase() as keyof DimensionSE];
      return {
        dimension:  label,
        theta:      Math.round(t * 100) / 100,
        se:         Math.round(s * 100) / 100,
        level:      this.thetaToLevel(t),
        confidence: s <= SE_CONVERGENCE ? 'High' : s <= SE_CONVERGENCE * 1.5 ? 'Medium' : 'Low',
      };
    });
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

  
  
  

  private initialTheta(): DimensionTheta {
    return { grammar: PRIOR_MEAN, vocabulary: PRIOR_MEAN, reading: PRIOR_MEAN, listening: PRIOR_MEAN };
  }

  private initialSE(): DimensionSE {
    return { grammar: INITIAL_SE, vocabulary: INITIAL_SE, reading: INITIAL_SE, listening: INITIAL_SE };
  }
}