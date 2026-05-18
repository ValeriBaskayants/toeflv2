import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildInitialProgress } from '../../constants/level-requirements';
import type { AnswerPlacementDto } from './dto/placement.dto';
import { AbilityDimension, DimensionTheta, DimensionSE, PRIOR_MEAN, PRIOR_SD, THETA_GRID, p2PL, MAX_QUESTIONS, MIN_QUESTIONS, SE_CONVERGENCE, INITIAL_SE, FETCH_WINDOW, info2PL, CONTENT_TARGET, LEVEL_BOUNDARIES, GRID_MIN, eapForDimension } from 'src/constants/placement-constants';



interface QuestionSnapshot {
  sourceId:        string;
  dimension:       AbilityDimension;
  text:            string;
  options:         string[];
  correctIndex:    number;
  difficulty:      number;  
  discrimination:  number;   
}

interface AnswerRecord {
  questionIndex:  number;
  selectedIndex:  number;
  isCorrect:      boolean;
  answeredAt:     string;
  thetaSnapshot:  DimensionTheta;
  seSnapshot:     DimensionSE;
}



@Injectable()
export class PlacementService {
  private readonly logger = new Logger(PlacementService.name);

  constructor(private readonly prisma: PrismaService) {}


  async getOrCreate(userId: string) {
    const existing = await this.prisma.placementTest.findUnique({ where: { userId } });
    if (existing !== null) { return existing; }

    return this.prisma.placementTest.create({
      data: {
        userId,
        status:        'PENDING',
        theta:         this.initialTheta(),
        standardError: this.initialSE(),
        questions:     [],
        answers:       [],
      },
    });
  }


  async start(userId: string) {
    const test = await this.getOrCreate(userId);

    if (test.status === 'COMPLETED') {
      throw new BadRequestException(
        'You have already completed the placement test. Your level has been set.',
      );
    }

    const theta = this.initialTheta();
    const firstQuestion = await this.fetchNextQuestion([], theta, {
      GRAMMAR: 0, VOCABULARY: 0, READING: 0,
    });

    if (firstQuestion === null) {
      throw new BadRequestException(
        'Not enough placement questions available. Please contact support.',
      );
    }

    const updated = await this.prisma.placementTest.update({
      where: { userId },
      data: {
        status:          'IN_PROGRESS',
        theta,
        standardError:   this.initialSE(),
        questions:       [firstQuestion],
        answers:         [],
        startedAt:       new Date(),
        completedAt:     null,
        detectedLevel:   null,
        confidenceScore: null,
      },
    });

    return {
      test:         updated,
      nextQuestion: this.publicQuestion(firstQuestion, 0),
      maxQuestions: MAX_QUESTIONS,
    };
  }


  async answer(userId: string, dto: AnswerPlacementDto) {
    const test = await this.prisma.placementTest.findUnique({ where: { userId } });

    if (test === null || test.status !== 'IN_PROGRESS') {
      throw new BadRequestException('No active placement test.');
    }

    const questions = test.questions as QuestionSnapshot[];
    const answers   = test.answers   as AnswerRecord[];
    const question  = questions[dto.questionIndex];

    if (question === undefined) {
      throw new BadRequestException(`Question ${dto.questionIndex} not found.`);
    }

    if (answers.some((a) => a.questionIndex === dto.questionIndex)) {
      throw new BadRequestException('Question already answered.');
    }

    const isCorrect = dto.selectedIndex === question.correctIndex;

    const allAnswers: AnswerRecord[] = [
      ...answers,
      {
        questionIndex: dto.questionIndex,
        selectedIndex: dto.selectedIndex,
        isCorrect,
        answeredAt:    new Date().toISOString(),
        thetaSnapshot: this.initialTheta(),
        seSnapshot:    this.initialSE(),
      },
    ];

    const { theta, standardError } = this.estimateAll(allAnswers, questions);

    const last = allAnswers[allAnswers.length - 1];
    if (last !== undefined) {
      last.thetaSnapshot = theta;
      last.seSnapshot    = standardError;
    }

    const answeredCount = allAnswers.length;
    const maxSE = Math.max(
      standardError.grammar,
      standardError.vocabulary,
      standardError.reading,
    );

    const converged =
      answeredCount >= MIN_QUESTIONS &&
      (maxSE <= SE_CONVERGENCE || answeredCount >= MAX_QUESTIONS);

    if (converged) {
      return this.finalize(userId, test.id, theta, standardError, questions, allAnswers);
    }

    const typeCounts   = this.countByDimension(allAnswers, questions);
    const excludedIds  = questions.slice(0, answeredCount).map((q) => q.sourceId);
    const nextQuestion = await this.fetchNextQuestion(excludedIds, theta, typeCounts);

    if (nextQuestion === null) {
      return this.finalize(userId, test.id, theta, standardError, questions, allAnswers);
    }

    await this.prisma.placementTest.update({
      where: { id: test.id },
      data: {
        theta,
        standardError,
        answers:   allAnswers,
        questions: [...questions, nextQuestion],
      },
    });

    return {
      converged:         false,
      isCorrect,
      questionsAnswered: answeredCount,
      nextQuestion:      this.publicQuestion(nextQuestion, questions.length),
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

    await this.applyLevel(userId, 'A1');
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

  async getStatus(userId: string) {
    const test = await this.getOrCreate(userId);

    const showBanner =
      test.status === 'PENDING' ||
      test.status === 'IN_PROGRESS' ||
      (test.status === 'REMIND_LATER' &&
        (test.remindAfter === null || test.remindAfter <= new Date()));

    return {
      status:          test.status,
      showBanner,
      detectedLevel:   test.detectedLevel,
      confidenceScore: test.confidenceScore,
    };
  }


  private async finalize(
    userId:        string,
    testId:        string,
    theta:         DimensionTheta,
    standardError: DimensionSE,
    questions:     QuestionSnapshot[],
    answers:       AnswerRecord[],
  ) {
    const aggregate =
      theta.grammar    * 0.40 +
      theta.vocabulary * 0.35 +
      theta.reading    * 0.25;

    const detectedLevel = this.thetaToLevel(aggregate);

    const avgSE = (standardError.grammar + standardError.vocabulary + standardError.reading) / 3;
    const confidenceScore = Math.round(
      Math.max(0, Math.min(100, (1 - avgSE / INITIAL_SE) * 100)),
    );

    await this.prisma.placementTest.update({
      where: { id: testId },
      data: {
        status:          'COMPLETED',
        theta,
        standardError,
        detectedLevel,
        confidenceScore,
        questions,
        answers,
        completedAt:     new Date(),
        lastCompletedAt: new Date(),
      },
    });

    await this.applyLevel(userId, detectedLevel);

    this.logger.log('PLACEMENT_COMPLETED', {
      userId,
      detectedLevel,
      aggregate:         aggregate.toFixed(2),
      theta:             {
        grammar:    theta.grammar.toFixed(2),
        vocabulary: theta.vocabulary.toFixed(2),
        reading:    theta.reading.toFixed(2),
      },
      se:                {
        grammar:    standardError.grammar.toFixed(3),
        vocabulary: standardError.vocabulary.toFixed(3),
        reading:    standardError.reading.toFixed(3),
      },
      confidenceScore,
      questionsAnswered: answers.length,
    });

    return {
      converged:         true,
      detectedLevel,
      confidenceScore,
      theta,
      standardError,
      questionsAnswered: answers.length,
    };
  }

  private estimateAll(
    answers:   AnswerRecord[],
    questions: QuestionSnapshot[],
  ): { theta: DimensionTheta; standardError: DimensionSE } {
    const dims: AbilityDimension[] = ['GRAMMAR', 'VOCABULARY', 'READING'];
    const theta         = this.initialTheta();
    const standardError = this.initialSE();

    for (const dim of dims) {
      const responses = answers
        .map((a) => {
          const q = questions[a.questionIndex];
          if (q === undefined || q.dimension !== dim) { return null; }
          return { difficulty: q.difficulty, discrimination: q.discrimination, correct: a.isCorrect };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const { estimate, se } = eapForDimension(responses);
      const key = dim.toLowerCase() as keyof DimensionTheta;
      theta[key]         = estimate;
      standardError[key] = se;
    }

    return { theta, standardError };
  }

  private async fetchNextQuestion(
    excludeIds:  string[],
    theta:       DimensionTheta,
    typeCounts:  Record<AbilityDimension, number>,
  ): Promise<QuestionSnapshot | null> {
    const dim      = this.selectDimension(typeCounts);
    const thetaVal = theta[dim.toLowerCase() as keyof DimensionTheta];

    const candidates = await this.fetchCandidates(
      excludeIds, dim, thetaVal, FETCH_WINDOW,
    );

    if (candidates.length === 0) {
      const widened = await this.fetchCandidates(excludeIds, dim, thetaVal, Infinity);
      if (widened.length === 0) { return null; }
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
    const diffWhere =
      window === Infinity
        ? {}
        : { gte: thetaVal - window, lte: thetaVal + window };

    const [exercises, mcqs] = await Promise.all([
      dim === 'GRAMMAR'
        ? this.prisma.exercise.findMany({
            where: {
              id:                      { notIn: excludeIds },
              isAvailableForPlacement: true,
              ...(window !== Infinity && { difficultyRating: diffWhere }),
            },
            select: {
              id: true, sentence: true, blanks: true,
              difficultyRating: true, discriminationRating: true,
            },
            take: 15,
          })
        : Promise.resolve([]),

      dim !== 'GRAMMAR'
        ? this.prisma.multipleChoice.findMany({
            where: {
              id:                      { notIn: excludeIds },
              isAvailableForPlacement: true,
              category:                dim,
              ...(window !== Infinity && { difficultyRating: diffWhere }),
            },
            select: {
              id: true, question: true, options: true, correctIndex: true,
              difficultyRating: true, discriminationRating: true,
            },
            take: 15,
          })
        : Promise.resolve([]),
    ]);

    const result: Array<QuestionSnapshot & { info: number }> = [];

    for (const ex of exercises) {
      const snapshot = this.exerciseToSnapshot(ex);
      if (snapshot === null) { continue; }
      result.push({ ...snapshot, info: info2PL(thetaVal, snapshot.difficulty, snapshot.discrimination) });
    }

    for (const mcq of mcqs) {
      const b = mcq.difficultyRating     ?? 0;
      const a = mcq.discriminationRating ?? 1;
      result.push({
        sourceId:       mcq.id,
        dimension:      dim,
        text:           mcq.question,
        options:        mcq.options,
        correctIndex:   mcq.correctIndex,
        difficulty:     b,
        discrimination: a,
        info:           info2PL(thetaVal, b, a),
      });
    }

    return result;
  }

  private selectDimension(typeCounts: Record<AbilityDimension, number>): AbilityDimension {
    const total = (Object.values(typeCounts) as number[]).reduce((s, n) => s + n, 0) + 1;
    const dims: AbilityDimension[] = ['GRAMMAR', 'VOCABULARY', 'READING'];

    const scored = dims.map((dim) => {
      const count        = typeCounts[dim];
      const actual       = count / total;
      const uncertainty  = 1.0 / (count + 1);
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
    const counts: Record<AbilityDimension, number> = { GRAMMAR: 0, VOCABULARY: 0, READING: 0 };

    for (const a of answers) {
      const q = questions[a.questionIndex];
      if (q !== undefined) { counts[q.dimension]++; }
    }

    return counts;
  }

  private exerciseToSnapshot(ex: {
    id:                   string;
    sentence:             string;
    blanks:               unknown;
    difficultyRating:     number | null;
    discriminationRating: number | null;
  }): QuestionSnapshot | null {
    type BlankShape = { answer: string; options: string[] };
    const blanks = ex.blanks as BlankShape[];
    if (blanks.length === 0) { return null; }

    const first = blanks[0];
    if (first === undefined) { return null; }

    const distractors = first.options.filter((o) => o !== first.answer).slice(0, 3);
    if (distractors.length < 3) { return null; }

    const shuffled = this.deterministicShuffle([first.answer, ...distractors], ex.id);

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

  private async applyLevel(userId: string, level: Level) {
    await this.prisma.user.update({
      where: { id: userId },
      data:  { currentLevel: level },
    });

    const existing = await this.prisma.levelProgress.findUnique({ where: { userId } });
    const data     = { ...buildInitialProgress(level), isReadyForTest: false, testUnlockedAt: null };

    if (existing !== null) {
      await this.prisma.levelProgress.update({ where: { userId }, data });
    } else {
      await this.prisma.levelProgress.create({ data: { userId, ...data } });
    }
  }

  private thetaToLevel(theta: number): Level {
    for (const b of LEVEL_BOUNDARIES) {
      if (theta >= b.min && theta < b.max) { return b.level; }
    }
    return theta <= GRID_MIN ? 'A1' : 'C2';
  }

  private publicQuestion(q: QuestionSnapshot, index: number) {
    return {
      index,
      dimension: q.dimension,
      text:      q.text,
      options:   q.options,
    };
  }

  private initialTheta(): DimensionTheta {
    return { grammar: PRIOR_MEAN, vocabulary: PRIOR_MEAN, reading: PRIOR_MEAN };
  }

  private initialSE(): DimensionSE {
    return { grammar: INITIAL_SE, vocabulary: INITIAL_SE, reading: INITIAL_SE };
  }
}
