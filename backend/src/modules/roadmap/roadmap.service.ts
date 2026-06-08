import { Injectable, NotFoundException } from '@nestjs/common';
import type { Level } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  LEVEL_ORDER,
  LEVEL_DISPLAY,
  LEVEL_REQUIREMENTS,
} from '../../constants/level-requirements';



interface ExternalResource {
  title:       string;
  url:         string;
  type:        'video' | 'website' | 'podcast';
  description: string;
}

const BONUS_RESOURCES: Readonly<Record<Level, ExternalResource[]>> = {
  A1:      [{ title: 'BBC Learning English — Beginners', url: 'https://www.bbc.co.uk/learningenglish', type: 'website', description: 'Extra reading and listening for A1' }],
  A1_PLUS: [{ title: '6 Minute English — BBC', url: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english', type: 'podcast', description: 'Short real English conversations' }],
  A2:      [{ title: 'British Council LearnEnglish A2', url: 'https://learnenglish.britishcouncil.org/grammar/a1-a2-grammar', type: 'website', description: 'Extra grammar practice' }],
  A2_PLUS: [{ title: 'VOA Learning English', url: 'https://learningenglish.voanews.com', type: 'podcast', description: 'Slow-speed real news for listening practice' }],
  B1:      [{ title: 'TED-Ed Short Talks', url: 'https://ed.ted.com', type: 'video', description: '5–10 min educational videos with subtitles' }],
  B1_PLUS: [{ title: 'British Council B1 Grammar', url: 'https://learnenglish.britishcouncil.org/grammar/b1-b2-grammar', type: 'website', description: 'Extra B1 grammar drills' }],
  B2:      [{ title: 'TED Talks', url: 'https://www.ted.com/talks', type: 'video', description: 'Full-speed native speaker talks' }],
  B2_PLUS: [{ title: 'BBC Sounds Podcasts', url: 'https://www.bbc.co.uk/sounds', type: 'podcast', description: 'Native BBC radio for advanced listening' }],
  C1:      [{ title: 'The Guardian Articles', url: 'https://www.theguardian.com', type: 'website', description: 'Authentic academic English reading' }],
  C2:      [{ title: 'ETS TOEFL Official Practice', url: 'https://www.ets.org/toefl', type: 'website', description: 'Official TOEFL practice tests' }],
};

const LEVEL_ESTIMATED_DAYS: Readonly<Record<Level, [number, number]>> = {
  A1:      [14,  21],
  A1_PLUS: [21,  35],
  A2:      [35,  56],
  A2_PLUS: [42,  70],
  B1:      [56,  90],
  B1_PLUS: [70,  112],
  B2:      [90,  140],
  B2_PLUS: [112, 168],
  C1:      [140, 210],
  C2:      [0,   0],
};

export interface SkillTask {
  skill:      string;
  label:      string;          
  required:   number;
  completed:  number;
  remaining:  number;
  accuracy:   number;            
  accuracyMin: number;          
  sms:        number;         
  route:      string;         
  cta:        string;            
  isBlocking: boolean;           
}

export interface RoadmapLevelNode {
  level:            Level;
  displayName:      string;
  status:           'completed' | 'current' | 'locked';
  readinessPercent: number;       
  isReadyForTest:   boolean;
  estimatedDays:    [number, number];
  skills:           SkillTask[];  
  bonusResources:   ExternalResource[];  
}

export interface RoadmapResponse {
  nodes:          RoadmapLevelNode[];
  currentLevel:   Level;
  totalProgress:  number;      
  projectedDate:  string | null; 
}

function buildRoute(skill: string, level: Level): string {
  const routes: Record<string, string> = {
    grammar:    `/grammar?level=${level}`,
    vocabulary: `/vocabulary?level=${level}`,
    reading:    `/reading?level=${level}`,
    writing:    `/writing?level=${level}`,
    listening:  `/listening?level=${level}`,
    quiz:       `/quiz?level=${level}`,
  };
  return routes[skill] ?? `/?level=${level}`;
}

function buildCTA(skill: string, remaining: number): string {
  if (remaining === 0) return `Review ${capitalize(skill)}`;
  const ctas: Record<string, string> = {
    grammar:    `Practice Grammar`,
    vocabulary: `Learn Words`,
    reading:    `Read & Answer`,
    writing:    `Write Essay`,
    listening:  `Listen & Respond`,
    quiz:       `Take Quiz`,
  };
  return ctas[skill] ?? `Practice ${capitalize(skill)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function computeSMS(completed: number, required: number, accuracy: number, accuracyMin: number): number {
  if (required === 0) return 100;
  const quantityGate     = Math.min(100, (completed / required) * 100);
  const qualityMultiplier = accuracyMin <= 0
    ? 1.0
    : Math.max(0.3, Math.min(1.0, accuracy / accuracyMin));
  return Math.round(quantityGate * qualityMultiplier);
}


@Injectable()
export class RoadmapService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoadmap(userId: string): Promise<RoadmapResponse> {
    const [user, progress, recentActivity] = await Promise.all([
      this.prisma.user.findUnique({
        where:  { id: userId },
        select: { currentLevel: true },
      }),
      this.prisma.levelProgress.findUnique({ where: { userId } }),
      this.prisma.dailyActivity.findMany({
        where:   { userId, date: { gte: this.daysAgoString(14) } },
        select:  { minutesSpent: true },
      }),
    ]);

    if (user === null)     throw new NotFoundException('User not found');
    if (progress === null) throw new NotFoundException('Progress not found');

    const currentLevel    = user.currentLevel;
    const currentLevelIdx = LEVEL_ORDER.indexOf(currentLevel);


    const avgMinutesPerDay = recentActivity.length > 0
      ? recentActivity.reduce((s: any, a: { minutesSpent: any; }) => s + a.minutesSpent, 0) / 14
      : 30;

    const nodes: RoadmapLevelNode[] = LEVEL_ORDER.map((level, idx) => {
      const status: RoadmapLevelNode['status'] =
        idx < currentLevelIdx  ? 'completed' :
        idx === currentLevelIdx ? 'current'   : 'locked';

      const req = LEVEL_REQUIREMENTS[level];

      type PS = { completed: number; accuracy: number };
      type VS = { required: number; learned: number };
      type WS = { completed: number; avgScore: number; required: number };

      const g  = progress.grammar    as PS;
      const r  = progress.reading    as PS;
      const l  = progress.listening  as PS;
      const q  = progress.quiz       as PS;
      const v  = progress.vocabulary as VS;
      const w  = progress.writing    as WS;

      const skills: SkillTask[] = status === 'current' ? [
        {
          skill:       'grammar',
          label:       'Grammar Exercises',
          required:    req.grammar.required,
          completed:   g.completed,
          remaining:   Math.max(0, req.grammar.required - g.completed),
          accuracy:    g.accuracy,
          accuracyMin: req.grammar.accuracyMin,
          sms:         computeSMS(g.completed, req.grammar.required, g.accuracy, req.grammar.accuracyMin),
          route:       buildRoute('grammar', level),
          cta:         buildCTA('grammar', Math.max(0, req.grammar.required - g.completed)),
          isBlocking:  computeSMS(g.completed, req.grammar.required, g.accuracy, req.grammar.accuracyMin) < 50,
        },
        {
          skill:       'vocabulary',
          label:       'Vocabulary Words',
          required:    req.vocabulary.required,
          completed:   v.learned,
          remaining:   Math.max(0, req.vocabulary.required - v.learned),
          accuracy:    100,
          accuracyMin: 0,
          sms:         req.vocabulary.required > 0
            ? Math.min(100, Math.round((v.learned / req.vocabulary.required) * 100))
            : 100,
          route:       buildRoute('vocabulary', level),
          cta:         buildCTA('vocabulary', Math.max(0, req.vocabulary.required - v.learned)),
          isBlocking:  req.vocabulary.required > 0 && v.learned < req.vocabulary.required * 0.5,
        },
        {
          skill:       'reading',
          label:       'Reading Materials',
          required:    req.reading.required,
          completed:   r.completed,
          remaining:   Math.max(0, req.reading.required - r.completed),
          accuracy:    r.accuracy,
          accuracyMin: req.reading.accuracyMin,
          sms:         computeSMS(r.completed, req.reading.required, r.accuracy, req.reading.accuracyMin),
          route:       buildRoute('reading', level),
          cta:         buildCTA('reading', Math.max(0, req.reading.required - r.completed)),
          isBlocking:  computeSMS(r.completed, req.reading.required, r.accuracy, req.reading.accuracyMin) < 50,
        },
        {
          skill:       'writing',
          label:       'Writing Submissions',
          required:    req.writing.required,
          completed:   w.completed,
          remaining:   Math.max(0, req.writing.required - w.completed),
          accuracy:    w.avgScore,
          accuracyMin: req.writing.avgScoreMin,
          sms:         computeSMS(w.completed, req.writing.required, w.avgScore, req.writing.avgScoreMin),
          route:       buildRoute('writing', level),
          cta:         buildCTA('writing', Math.max(0, req.writing.required - w.completed)),
          isBlocking:  computeSMS(w.completed, req.writing.required, w.avgScore, req.writing.avgScoreMin) < 50,
        },
        {
          skill:       'listening',
          label:       'Listening Sessions',
          required:    req.listening.required,
          completed:   l.completed,
          remaining:   Math.max(0, req.listening.required - l.completed),
          accuracy:    l.accuracy,
          accuracyMin: req.listening.accuracyMin,
          sms:         computeSMS(l.completed, req.listening.required, l.accuracy, req.listening.accuracyMin),
          route:       buildRoute('listening', level),
          cta:         buildCTA('listening', Math.max(0, req.listening.required - l.completed)),
          isBlocking:  computeSMS(l.completed, req.listening.required, l.accuracy, req.listening.accuracyMin) < 50,
        },
        {
          skill:       'quiz',
          label:       'Quiz Questions',
          required:    req.quiz.required,
          completed:   q.completed,
          remaining:   Math.max(0, req.quiz.required - q.completed),
          accuracy:    q.accuracy,
          accuracyMin: req.quiz.accuracyMin,
          sms:         computeSMS(q.completed, req.quiz.required, q.accuracy, req.quiz.accuracyMin),
          route:       buildRoute('quiz', level),
          cta:         buildCTA('quiz', Math.max(0, req.quiz.required - q.completed)),
          isBlocking:  computeSMS(q.completed, req.quiz.required, q.accuracy, req.quiz.accuracyMin) < 50,
        },
      ] : buildSkeletonSkills(level, status); 

      const readinessPercent =
        status === 'completed' ? 100 :
        status === 'locked'    ? 0   :
        computeReadinessFromSkills(skills);

      return {
        level,
        displayName:      LEVEL_DISPLAY[level],
        status,
        readinessPercent,
        isReadyForTest:   status === 'current' ? progress.isReadyForTest : status === 'completed',
        estimatedDays:    LEVEL_ESTIMATED_DAYS[level],
        skills,
        bonusResources:   BONUS_RESOURCES[level] ?? [],
      };
    });

    const totalLevels   = LEVEL_ORDER.length - 1; 
    const completedPart = currentLevelIdx / totalLevels * 100;
    const currentNode   = nodes[currentLevelIdx];
    const withinPart    = currentNode !== undefined
      ? (currentNode.readinessPercent / 100) * (1 / totalLevels) * 100
      : 0;
    const totalProgress = Math.min(100, Math.round(completedPart + withinPart));

    const projectedDate = this.computeProjectedDate(
      nodes,
      currentLevelIdx,
      avgMinutesPerDay,
    );

    return { nodes, currentLevel, totalProgress, projectedDate };
  }


  private computeProjectedDate(
    nodes:            RoadmapLevelNode[],
    currentLevelIdx:  number,
    avgMinutesPerDay: number,
  ): string | null {
    if (avgMinutesPerDay <= 0) return null;

    const speedRatio = avgMinutesPerDay / 30; 
    let totalDays    = 0;

    for (let i = currentLevelIdx; i < LEVEL_ORDER.length - 1; i++) {
      const node = nodes[i];
      if (node === undefined) continue;

      const [optimistic, realistic] = node.estimatedDays;
      if (realistic === 0) continue;

      const baseDays = speedRatio >= 1.5 ? optimistic : realistic;

      if (i === currentLevelIdx) {
        const remaining = 1 - node.readinessPercent / 100;
        totalDays += Math.round((baseDays / speedRatio) * remaining);
      } else {
        totalDays += Math.round(baseDays / speedRatio);
      }
    }

    const date = new Date();
    date.setDate(date.getDate() + totalDays);
    return date.toISOString().slice(0, 10);
  }

  private daysAgoString(days: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }
}

function buildSkeletonSkills(level: Level, status: 'completed' | 'locked'): SkillTask[] {
  const req    = LEVEL_REQUIREMENTS[level];
  const filled = status === 'completed'; 

  const SKILL_CONFIG = [
    { skill: 'grammar',    label: 'Grammar Exercises',   required: req.grammar.required,    accuracyMin: req.grammar.accuracyMin },
    { skill: 'vocabulary', label: 'Vocabulary Words',    required: req.vocabulary.required, accuracyMin: 0 },
    { skill: 'reading',    label: 'Reading Materials',   required: req.reading.required,    accuracyMin: req.reading.accuracyMin },
    { skill: 'writing',    label: 'Writing Submissions', required: req.writing.required,    accuracyMin: req.writing.avgScoreMin },
    { skill: 'listening',  label: 'Listening Sessions',  required: req.listening.required,  accuracyMin: req.listening.accuracyMin },
    { skill: 'quiz',       label: 'Quiz Questions',      required: req.quiz.required,       accuracyMin: req.quiz.accuracyMin },
  ];

  return SKILL_CONFIG.map(({ skill, label, required, accuracyMin }) => ({
    skill,
    label,
    required,
    completed:   filled ? required : 0,
    remaining:   filled ? 0        : required,
    accuracy:    filled ? accuracyMin : 0,
    accuracyMin,
    sms:         filled ? 100 : 0,
    route:       buildRoute(skill, level),
    cta:         buildCTA(skill, filled ? 0 : required),
    isBlocking:  false,
  }));
}

function computeReadinessFromSkills(skills: SkillTask[]): number {
  if (skills.length === 0) return 0;
  const smsList  = skills.map((s) => s.sms);
  const avgSMS   = smsList.reduce((a, v) => a + v, 0) / smsList.length;
  const hasWeak  = smsList.some((sms) => sms < 50);
  return hasWeak ? Math.min(80, Math.round(avgSMS)) : Math.round(avgSMS);
}