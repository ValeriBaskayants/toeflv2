// 4 примера показывают 4 принципиально разных сценария Scramble/Build-a-Sentence:
//
// 1. "basic"        — без блэнков, дистракторов больше, чем реально покажет любой режим
//                      (EASY/MEDIUM), т.е. можно заранее описать «банк» лишних слов —
//                      система сама берёт по MODE_DISTRACTOR_COUNT для конкретного режима.
// 2. "fill-blank"    — requiresUserInput: слово не попадает в банк тайлов, вместо этого
//                      становится текстовым полем, которое пользователь печатает сам
//                      (гибрид drag+type — проверяет словоформу, а не только порядок).
// 3. "hard-only"     — 2 дистрактора, EXPERT сознательно НЕ указан в allowedModes,
//                      т.к. с 2 дистракторами упражнение всё равно никогда не попадёт
//                      в EXAM-пул (там жёсткий фильтр distractorCount <= 1) — это
//                      осознанный "сложнее реального теста" тренировочный режим.
// 4. "exam-ready"    — ровно 1 дистрактор, EXPERT разрешён — именно так должно выглядеть
//                      упражнение, которое реально может попасть в симуляцию экзамена.

export const SCRAMBLE_EXAMPLES = [
  {
    _comment: '1) BASIC — банк дистракторов больше, чем нужно любому режиму',
    prompt: 'Complete the sentence about Anna\'s evening.',
    sentence: 'She quickly finished her homework before dinner.',
    level: 'A2',
    topic: 'past-simple',
    topicSlugs: ['past-simple'],
    allowedModes: ['EASY', 'MEDIUM'],
    translation: 'Она быстро закончила домашнюю работу перед ужином.',
    explanation: 'Adverb "quickly" goes between subject and verb. EASY mode shows 0 distractors, MEDIUM shows 1 — the system picks from the pool below automatically.',
    words: [
      { id: 'w1', word: 'She', role: 'SUBJECT', position: 0, isDistractor: false },
      { id: 'w2', word: 'quickly', role: 'ADVERB', position: 1, isDistractor: false },
      { id: 'w3', word: 'finished', role: 'VERB', position: 2, isDistractor: false },
      { id: 'w4', word: 'her', role: 'DETERMINER', position: 3, isDistractor: false },
      { id: 'w5', word: 'homework', role: 'OBJECT', position: 4, isDistractor: false },
      { id: 'w6', word: 'before', role: 'PREPOSITION', position: 5, isDistractor: false },
      { id: 'w7', word: 'dinner', role: 'OBJECT', position: 6, isDistractor: false },
      { id: 'w8', word: 'slowly', role: 'ADVERB', position: 99, isDistractor: true },
      { id: 'w9', word: 'yesterday', role: 'ADVERB', position: 99, isDistractor: true },
    ],
  },
  {
    _comment: '2) FILL-BLANK — requiresUserInput проверяет словоформу, а не только порядок',
    prompt: 'Complete the sentence about an old family letter.',
    sentence: 'The letter was written by my grandmother in 1962.',
    level: 'B1',
    topic: 'passive-voice',
    topicSlugs: ['passive-voice'],
    allowedModes: ['MEDIUM', 'HARD', 'EXPERT'],
    translation: 'Письмо было написано моей бабушкой в 1962 году.',
    explanation: 'The word "written" is not draggable — the user must type the correct past participle of "write" themselves. Everything else is a normal drag tile.',
    words: [
      { id: 'w1', word: 'The', role: 'DETERMINER', position: 0, isDistractor: false },
      { id: 'w2', word: 'letter', role: 'SUBJECT', position: 1, isDistractor: false },
      { id: 'w3', word: 'was', role: 'VERB', position: 2, isDistractor: false },
      { id: 'w4', word: 'written', role: 'VERB', position: 3, isDistractor: false, requiresUserInput: true },
      { id: 'w5', word: 'by', role: 'PREPOSITION', position: 4, isDistractor: false },
      { id: 'w6', word: 'my', role: 'DETERMINER', position: 5, isDistractor: false },
      { id: 'w7', word: 'grandmother', role: 'OBJECT', position: 6, isDistractor: false },
      { id: 'w8', word: 'in', role: 'PREPOSITION', position: 7, isDistractor: false },
      { id: 'w9', word: '1962', role: 'OTHER', position: 8, isDistractor: false },
    ],
  },
  {
    _comment: '3) HARD-ONLY — 2 дистрактора = никогда не exam-eligible, EXPERT намеренно не указан',
    prompt: 'Complete the sentence about a football match.',
    sentence: 'Despite the heavy rain, the match continued until the final whistle.',
    level: 'B2',
    topic: 'concession-clauses',
    topicSlugs: ['concession-clauses'],
    allowedModes: ['MEDIUM', 'HARD'],
    translation: 'Несмотря на сильный дождь, матч продолжался до финального свистка.',
    explanation: 'Distractors "although" (wrong connector — takes a clause, not a noun phrase) and "stopped" (opposite meaning) make this a genuinely harder practice item than the real test ever presents — that is why it is excluded from EXPERT/exam sampling.',
    words: [
      { id: 'w1', word: 'Despite', role: 'PREPOSITION', position: 0, isDistractor: false },
      { id: 'w2', word: 'the', role: 'DETERMINER', position: 1, isDistractor: false },
      { id: 'w3', word: 'heavy', role: 'ADJECTIVE', position: 2, isDistractor: false },
      { id: 'w4', word: 'rain', role: 'OBJECT', position: 3, isDistractor: false },
      { id: 'w5', word: 'the', role: 'DETERMINER', position: 4, isDistractor: false },
      { id: 'w6', word: 'match', role: 'SUBJECT', position: 5, isDistractor: false },
      { id: 'w7', word: 'continued', role: 'VERB', position: 6, isDistractor: false },
      { id: 'w8', word: 'until', role: 'PREPOSITION', position: 7, isDistractor: false },
      { id: 'w9', word: 'the', role: 'DETERMINER', position: 8, isDistractor: false },
      { id: 'w10', word: 'final', role: 'ADJECTIVE', position: 9, isDistractor: false },
      { id: 'w11', word: 'whistle', role: 'OBJECT', position: 10, isDistractor: false },
      { id: 'w12', word: 'although', role: 'CONJUNCTION', position: 99, isDistractor: true },
      { id: 'w13', word: 'stopped', role: 'VERB', position: 99, isDistractor: true },
    ],
  },
  {
    _comment: '4) EXAM-READY — ровно 1 дистрактор, EXPERT разрешён: так должен выглядеть настоящий экзаменационный пункт',
    prompt: 'Complete the sentence about a committee decision.',
    sentence: 'Not until the committee reviewed every proposal did they announce a decision.',
    level: 'C1',
    topic: 'inversion-emphasis',
    topicSlugs: ['inversion-emphasis'],
    allowedModes: ['HARD', 'EXPERT'],
    translation: 'Только после того как комитет рассмотрел каждое предложение, они объявили решение.',
    explanation: 'Negative inversion ("Not until X did Y"). Distractor "when" tempts the wrong connector for this inversion pattern — exactly one decoy, so this item is eligible for the EXAM pool.',
    words: [
      { id: 'w1', word: 'Not', role: 'ADVERB', position: 0, isDistractor: false },
      { id: 'w2', word: 'until', role: 'CONJUNCTION', position: 1, isDistractor: false },
      { id: 'w3', word: 'the', role: 'DETERMINER', position: 2, isDistractor: false },
      { id: 'w4', word: 'committee', role: 'SUBJECT', position: 3, isDistractor: false },
      { id: 'w5', word: 'reviewed', role: 'VERB', position: 4, isDistractor: false },
      { id: 'w6', word: 'every', role: 'DETERMINER', position: 5, isDistractor: false },
      { id: 'w7', word: 'proposal', role: 'OBJECT', position: 6, isDistractor: false },
      { id: 'w8', word: 'did', role: 'VERB', position: 7, isDistractor: false },
      { id: 'w9', word: 'they', role: 'SUBJECT', position: 8, isDistractor: false },
      { id: 'w10', word: 'announce', role: 'VERB', position: 9, isDistractor: false },
      { id: 'w11', word: 'a', role: 'DETERMINER', position: 10, isDistractor: false },
      { id: 'w12', word: 'decision', role: 'OBJECT', position: 11, isDistractor: false },
      { id: 'w13', word: 'when', role: 'CONJUNCTION', position: 99, isDistractor: true },
    ],
  },
];