import type { Level } from '@prisma/client';


export const LEVEL_DISPLAY: Record<Level, string> = {
  A1:      'A1',
  A1_PLUS: 'A1+',
  A2:      'A2',
  A2_PLUS: 'A2+',
  B1:      'B1',
  B1_PLUS: 'B1+',
  B2:      'B2',
  B2_PLUS: 'B2+',
  C1:      'C1',
  C2:      'C2',
};


export const LEVEL_ORDER: Level[] = [
  'A1', 'A1_PLUS', 'A2', 'A2_PLUS',
  'B1', 'B1_PLUS', 'B2', 'B2_PLUS',
  'C1', 'C2',
];

export interface LevelRequirement {
  grammar:     { required: number; accuracyMin: number };
  vocabulary:  { required: number };
  reading:     { required: number; accuracyMin: number };
  writing:     { required: number; avgScoreMin: number };
  listening:   { required: number; accuracyMin: number };
  quiz:        { required: number; accuracyMin: number };
}

export const LEVEL_REQUIREMENTS: Record<Level, LevelRequirement> = {
  A1: {
    grammar:    { required: 60,   accuracyMin: 65 },
    vocabulary: { required: 600 },
    reading:    { required: 8,    accuracyMin: 65 },
    writing:    { required: 2,    avgScoreMin: 60 },
    listening:  { required: 6,    accuracyMin: 60 },
    quiz:       { required: 25,   accuracyMin: 65 },
  },
  A1_PLUS: {
    grammar:    { required: 110,  accuracyMin: 68 },
    vocabulary: { required: 1000 },
    reading:    { required: 15,   accuracyMin: 68 },
    writing:    { required: 5,    avgScoreMin: 62 },
    listening:  { required: 12,   accuracyMin: 63 },
    quiz:       { required: 45,   accuracyMin: 68 },
  },
  A2: {
    grammar:    { required: 180,  accuracyMin: 70 },
    vocabulary: { required: 1500 },
    reading:    { required: 25,   accuracyMin: 70 },
    writing:    { required: 10,   avgScoreMin: 65 },
    listening:  { required: 20,   accuracyMin: 66 },
    quiz:       { required: 70,   accuracyMin: 72 },
  },
  A2_PLUS: {
    grammar:    { required: 260,  accuracyMin: 72 },
    vocabulary: { required: 2200 },
    reading:    { required: 35,   accuracyMin: 72 },
    writing:    { required: 15,   avgScoreMin: 68 },
    listening:  { required: 30,   accuracyMin: 68 },
    quiz:       { required: 100,  accuracyMin: 75 },
  },
  B1: {
    grammar:    { required: 360,  accuracyMin: 75 },
    vocabulary: { required: 3000 },
    reading:    { required: 50,   accuracyMin: 75 },
    writing:    { required: 22,   avgScoreMin: 70 },
    listening:  { required: 45,   accuracyMin: 72 },
    quiz:       { required: 140,  accuracyMin: 78 },
  },
  B1_PLUS: {
    grammar:    { required: 480,  accuracyMin: 78 },
    vocabulary: { required: 4000 },
    reading:    { required: 70,   accuracyMin: 78 },
    writing:    { required: 30,   avgScoreMin: 73 },
    listening:  { required: 65,   accuracyMin: 75 },
    quiz:       { required: 190,  accuracyMin: 80 },
  },
  B2: {
    grammar:    { required: 620,  accuracyMin: 80 },
    vocabulary: { required: 5500 },
    reading:    { required: 95,   accuracyMin: 80 },
    writing:    { required: 40,   avgScoreMin: 76 },
    listening:  { required: 90,   accuracyMin: 78 },
    quiz:       { required: 250,  accuracyMin: 83 },
  },
  B2_PLUS: {
    grammar:    { required: 780,  accuracyMin: 82 },
    vocabulary: { required: 7000 },
    reading:    { required: 125,  accuracyMin: 82 },
    writing:    { required: 55,   avgScoreMin: 80 },
    listening:  { required: 120,  accuracyMin: 81 },
    quiz:       { required: 320,  accuracyMin: 85 },
  },
  C1: {
    grammar:    { required: 1000, accuracyMin: 85 },
    vocabulary: { required: 9000 },
    reading:    { required: 160,  accuracyMin: 85 },
    writing:    { required: 75,   avgScoreMin: 85 },
    listening:  { required: 160,  accuracyMin: 85 },
    quiz:       { required: 420,  accuracyMin: 88 },
  },
  C2: {
    grammar:    { required: 0, accuracyMin: 0 },
    vocabulary: { required: 0 },
    reading:    { required: 0, accuracyMin: 0 },
    writing:    { required: 0, avgScoreMin: 0 },
    listening:  { required: 0, accuracyMin: 0 },
    quiz:       { required: 0, accuracyMin: 0 },
  },
};


export function getNextLevel(current: Level): Level | null {
  const idx = LEVEL_ORDER.indexOf(current);
  if (idx === -1 || idx === LEVEL_ORDER.length - 1) {
    return null; 
  }
  return LEVEL_ORDER[idx + 1] ?? null;
}

export function buildInitialProgress(level: Level) {
  const req = LEVEL_REQUIREMENTS[level];
  return {
    grammar:    { required: req.grammar.required,    completed: 0, accuracy: 0 },
    vocabulary: { required: req.vocabulary.required, learned: 0 },
    reading:    { required: req.reading.required,    completed: 0, accuracy: 0 },
    writing:    { required: req.writing.required,    completed: 0, avgScore: 0 },
    listening:  { required: req.listening.required,  completed: 0, accuracy: 0 },
    quiz:       { required: req.quiz.required,       completed: 0, accuracy: 0 },
  };
}