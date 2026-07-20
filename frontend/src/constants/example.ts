import type { ContentType } from "../types/admin/Admin.types";

export const EXAMPLES: Record<ContentType, string> = {
  exercises: JSON.stringify([
    {
      topic: 'Present Simple',
      level: 'A1',
      difficulty: 'EASY',
      sentence: 'She _____ to school every day.',
      blanks: [{ position: 0, answer: 'goes', options: ['go', 'goes', 'going', 'gone'] }],
      explanation: 'Use -s/-es with he/she/it in Present Simple.',
      tags: ['a1', 'present-simple'],
      topicSlugs: ['present-simple'],
    },
    {
      topic: 'Past Simple',
      level: 'A2',
      difficulty: 'MEDIUM',
      sentence: 'They _____ dinner before the movie started.',
      blanks: [{ position: 0, answer: 'ate', options: ['eat', 'ate', 'eaten', 'eating'] }],
      explanation: 'Past Simple uses the past form of the verb.',
      tags: ['a2', 'past-simple'],
      topicSlugs: ['past-simple-irregular'],
    },
  ], null, 2),

  grammarRules: JSON.stringify([
    {
      topic: 'Present Simple',
      slug: 'present-simple',
      level: 'A1',
      order: 11,
      isCore: true,
      prerequisiteSlugs: ['subject-pronouns'],
      summary: 'Used for habits, routines, facts and general truths.',
      coreConcept: 'Subject + base verb (+ s/es for he/she/it)',
      structure: 'I/You/We/They + V1 | He/She/It + V1+s/es',
      usages: [
        {
          title: 'Habits & Routines',
          explanation: 'Actions that happen regularly or repeatedly.',
          examples: [
            { sentence: 'She drinks coffee every morning.', translation: 'Она пьёт кофе каждое утро.' },
          ],
        },
      ],
      sections: [
        {
          title: 'Negative form',
          content: "Use do not (don't) or does not (doesn't) + base verb.",
          examples: [
            { sentence: "He does not play tennis." },
            { sentence: "They don't watch TV." },
          ],
        },
      ],
      commonMistakes: [
        "She go to school. ✗ → She goes to school. ✓",
        "He don't like it. ✗ → He doesn't like it. ✓",
      ],
      signalWords: ['always', 'usually', 'often', 'every day', 'never'],
      relatedTopics: ['present-simple-questions-negatives', 'adverbs-of-frequency'],
      practiceTargets: {
        grammarRequired: 5,
        grammarAccuracyMin: 60,
        quizRequired: 2,
        readingRequired: 1,
        listeningRequired: 1,
      },
      resources: [
        {
          title: 'Perfect English Grammar — Present Simple',
          url: 'https://www.perfect-english-grammar.com/present-simple.html',
          type: 'article',
          description: 'Full explanation + exercises',
        },
      ],
    },
  ], null, 2),

  vocabulary: JSON.stringify([
    {
      word: 'accomplish',
      level: 'B1',
      type: 'VERB',
      pronunciation: '/əˈkɒmplɪʃ/',
      definition: 'To succeed in doing something difficult.',
      definitionRu: 'Достигать, выполнять',
      examples: [
        'She accomplished her goal in record time.',
        'The team accomplished what seemed impossible.',
      ],
      synonyms: ['achieve', 'complete', 'fulfill'],
      antonyms: ['fail', 'abandon'],
      forms: {
        base: 'accomplish',
        past: 'accomplished',
        pastParticiple: 'accomplished',
        thirdPerson: 'accomplishes',
        presentParticiple: 'accomplishing',
      },
      isIrregularVerb: false,
    },
  ], null, 2),

  readings: JSON.stringify([
    {
      title: 'A Typical Morning',
      level: 'A1',
      topic: 'Daily Life',
      description: 'A short text about daily routines using Present Simple.',
      content: 'Every morning, Tom gets up at seven o\'clock. He brushes his teeth and washes his face. Then he goes to the kitchen and makes breakfast. He usually eats eggs and drinks orange juice. After breakfast, he takes the bus to work. He starts work at nine o\'clock.',
      tags: ['daily-life', 'routines'],
      grammarTopics: ['present-simple', 'adverbs-of-frequency', 'prepositions-of-time'],
      questions: [
        {
          text: 'What time does Tom get up?',
          explanation: 'The text says Tom gets up at seven o\'clock.',
          options: [
            { text: 'At six o\'clock',   isCorrect: false },
            { text: 'At seven o\'clock', isCorrect: true },
            { text: 'At eight o\'clock', isCorrect: false },
            { text: 'At nine o\'clock',  isCorrect: false },
          ],
        },
        {
          text: 'How does Tom get to work?',
          explanation: 'He takes the bus to work.',
          options: [
            { text: 'By car',  isCorrect: false },
            { text: 'By bus',  isCorrect: true },
            { text: 'On foot', isCorrect: false },
            { text: 'By bike', isCorrect: false },
          ],
        },
      ],
      vocabulary: [
        { word: 'brush', translation: 'чистить', contextSentence: 'He brushes his teeth.' },
        { word: 'usually', translation: 'обычно' },
      ],
    },
  ], null, 2),

  multipleChoice: JSON.stringify([
    {
      question: 'Which sentence uses Present Simple correctly?',
      options: [
        'She go to school every day.',
        'She going to school every day.',
        'She goes to school every day.',
        'She is go to school every day.',
      ],
      correctIndex: 2,
      explanation: 'With he/she/it in Present Simple, add -s/-es to the verb: goes.',
      topic: 'Present Simple',
      level: 'A1',
      difficulty: 'EASY',
      topicSlugs: ['present-simple', 'present-simple-questions-negatives'],
    },
    {
      question: 'Choose the correct negative form:',
      options: [
        "She don't like coffee.",
        "She doesn't likes coffee.",
        "She doesn't like coffee.",
        'She not like coffee.',
      ],
      correctIndex: 2,
      explanation: "With he/she/it use \"doesn't\" + base verb (not doesn't likes).",
      topic: 'Present Simple',
      level: 'A1',
      difficulty: 'EASY',
      topicSlugs: ['present-simple-questions-negatives'],
    },
  ], null, 2),

  writingPrompts: JSON.stringify([
    {
      prompt: 'Describe your daily routine in detail. What do you do in the morning, afternoon, and evening?',
      level: 'A2',
      type: 'PARAGRAPH',
      minWords: 80,
      maxWords: 150,
      topic: 'Daily Life',
      instructions: 'Use Present Simple. Include at least 3 time expressions.',
    },
    {
      prompt: 'Do you think social media has a positive or negative impact on society? Give reasons and examples.',
      level: 'B2',
      type: 'ESSAY',
      minWords: 250,
      maxWords: 400,
      topic: 'Technology & Society',
      instructions: 'Write a balanced argument. Use discourse markers. Include two specific examples.',
    },
  ], null, 2),

  listening: JSON.stringify([
    {
      title: 'A Typical Day',
      topic: 'Daily Routines',
      level: 'A1',
      type: 'CONVERSATION',
      fullText: 'Good morning! My name is Anna. Every day I wake up at seven o\'clock. I always eat breakfast before I go to work. I usually have bread and coffee. I start work at nine. I finish at five. In the evening I watch TV or read a book.',
      segments: [
        { index: 0, text: 'Good morning! My name is Anna.', startSec: 0, endSec: 2.5, speaker: 'Anna' },
        { index: 1, text: 'Every day I wake up at seven o\'clock.', startSec: 2.5, endSec: 5.5, speaker: 'Anna' },
        { index: 2, text: 'I always eat breakfast before I go to work.', startSec: 5.5, endSec: 9.0, speaker: 'Anna' },
        { index: 3, text: 'I usually have bread and coffee.', startSec: 9.0, endSec: 11.5, speaker: 'Anna' },
      ],
      speakerRate: 0.65,
      speakerLang: 'en-US',
      speakerPitch: 1.0,
      allowedModes: ['EASY', 'MEDIUM', 'HARD'],
      grammarTopics: ['present-simple', 'adverbs-of-frequency'],
      questions: [
        {
          question: 'What time does Anna wake up?',
          options: ['At six o\'clock', 'At seven o\'clock', 'At eight o\'clock', 'At nine o\'clock'],
          correctIndex: 1,
          explanation: 'Anna says she wakes up at seven o\'clock every day.',
          referenceStartSec: 2.5,
          referenceEndSec: 5.5,
        },
        {
          question: 'What does Anna usually have for breakfast?',
          options: ['Eggs and juice', 'Cereal and milk', 'Bread and coffee', 'Toast and tea'],
          correctIndex: 2,
          explanation: 'Anna says she usually has bread and coffee.',
          referenceStartSec: 9.0,
          referenceEndSec: 11.5,
        },
      ],
    },
  ], null, 2),
};