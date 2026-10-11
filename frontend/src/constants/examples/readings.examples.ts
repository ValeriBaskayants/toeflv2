export const READINGS_EXAMPLES = [
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
            { text: 'At six o\'clock', isCorrect: false },
            { text: 'At seven o\'clock', isCorrect: true },
            { text: 'At eight o\'clock', isCorrect: false },
            { text: 'At nine o\'clock', isCorrect: false },
          ],
        },
        {
          text: 'How does Tom get to work?',
          explanation: 'He takes the bus to work.',
          options: [
            { text: 'By car', isCorrect: false },
            { text: 'By bus', isCorrect: true },
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
  ]