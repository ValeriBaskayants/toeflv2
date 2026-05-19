import type { ContentType } from '../types/admin/Admin.types';

export const EXAMPLES: Record<ContentType, string> = {
  exercises: JSON.stringify(
    [
      {
        topic: 'Present Simple',
        level: 'A1',
        difficulty: 'EASY',
        sentence: 'She _____ to school every day.',
        blanks: [{ position: 0, answer: 'goes', options: ['go', 'goes', 'going', 'gone'] }],
        explanation: 'Use -s/-es with he/she/it in Present Simple.',
        tags: ['a1', 'present-simple'],
      },
      {
        topic: 'Past Simple',
        level: 'A2',
        difficulty: 'MEDIUM',
        sentence: 'They _____ dinner before the movie started.',
        blanks: [{ position: 0, answer: 'ate', options: ['eat', 'ate', 'eaten', 'eating'] }],
        explanation: 'Past Simple uses the past form of the verb.',
        tags: ['a2', 'past-simple'],
      },
    ],
    null,
    2,
  ),

  grammarRules: JSON.stringify(
    [
      {
        topic: 'Present Simple',
        slug: 'present-simple',
        level: 'A1',
        summary: 'Used for habits, routines, facts and general truths.',
        coreConcept: 'Subject + base verb (+ s/es for he/she/it)',
        structure: 'I/You/We/They + V1 | He/She/It + V1+s/es',
        usages: [
          {
            title: 'Habits & Routines',
            explanation: 'Actions that happen regularly or repeatedly.',
            examples: [
              {
                sentence: 'She drinks coffee every morning.',
                translation: 'Она пьёт кофе каждое утро.',
              },
            ],
          },
          {
            title: 'General Truths',
            explanation: 'Facts that are always true.',
            examples: [{ sentence: 'Water boils at 100°C.' }],
          },
        ],
        sections: [
          {
            title: 'Negative form',
            content: "Use do not (don't) or does not (doesn't) + base verb.",
            examples: [
              { sentence: 'He does not play tennis.' },
              { sentence: "They don't watch TV." },
            ],
          },
        ],
        commonMistakes: [
          'She go to school. ✗ → She goes to school. ✓',
          "He don't like it. ✗ → He doesn't like it. ✓",
        ],
        signalWords: ['always', 'usually', 'often', 'every day', 'never'],
        relatedTopics: ['present-continuous', 'past-simple'],
      },
    ],
    null,
    2,
  ),

  vocabulary: JSON.stringify(
    [
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
      {
        word: 'innovative',
        level: 'B2',
        type: 'ADJECTIVE',
        pronunciation: '/ˈɪnəveɪtɪv/',
        definition: 'Featuring new methods; advanced and original.',
        definitionRu: 'Инновационный, передовой',
        examples: ['The company is known for its innovative products.'],
        synonyms: ['creative', 'original', 'pioneering'],
        antonyms: ['conventional', 'traditional'],
      },
    ],
    null,
    2,
  ),

  readings: JSON.stringify(
    [
      {
        title: 'The Water Cycle',
        level: 'A2',
        topic: 'Science',
        description: 'A short passage about how water moves through nature.',
        content:
          'Water is constantly moving around Earth in a process called the water cycle. The sun heats water in rivers, lakes, and oceans, causing it to evaporate and rise into the atmosphere. As the water vapor rises, it cools and condenses to form clouds. When enough droplets gather, precipitation occurs as rain or snow.',
        tags: ['science', 'nature'],
        questions: [
          {
            text: 'What causes water to evaporate?',
            explanation: 'The sun provides heat energy that turns liquid water into vapor.',
            options: [
              { text: 'Heat from the sun', isCorrect: true },
              { text: 'Strong winds', isCorrect: false },
              { text: 'Cold temperatures', isCorrect: false },
              { text: 'Ocean currents', isCorrect: false },
            ],
          },
        ],
        vocabulary: [
          {
            word: 'evaporate',
            translation: 'испаряться',
            contextSentence: 'Water evaporates when heated.',
          },
          { word: 'precipitation', translation: 'осадки' },
        ],
      },
    ],
    null,
    2,
  ),

  multipleChoice: JSON.stringify(
    [
      {
        question: 'Which tense describes an action happening right now?',
        options: ['Present Simple', 'Past Simple', 'Present Continuous', 'Future Simple'],
        correctIndex: 2,
        explanation:
          'Present Continuous (am/is/are + -ing) describes actions currently in progress.',
        topic: 'Tenses',
        level: 'A1',
        difficulty: 'EASY',
      },
      {
        question: 'Choose the correct sentence:',
        options: [
          "She don't like coffee.",
          "She doesn't likes coffee.",
          "She doesn't like coffee.",
          'She not like coffee.',
        ],
        correctIndex: 2,
        explanation: 'With he/she/it use "doesn\'t" + base verb.',
        topic: 'Present Simple',
        level: 'A1',
        difficulty: 'EASY',
      },
    ],
    null,
    2,
  ),

  writingPrompts: JSON.stringify(
    [
      {
        prompt:
          'Describe your daily routine in detail. What do you do in the morning, afternoon, and evening?',
        level: 'A2',
        type: 'PARAGRAPH',
        minWords: 80,
        maxWords: 150,
        topic: 'Daily Life',
        instructions: 'Use Present Simple. Include at least 3 time expressions.',
      },
      {
        prompt:
          'Do you think social media has a positive or negative impact on society? Give reasons and examples.',
        level: 'B2',
        type: 'ESSAY',
        minWords: 250,
        maxWords: 400,
        topic: 'Technology & Society',
        instructions:
          'Write a balanced argument. Use discourse markers. Include two specific examples.',
      },
    ],
    null,
    2,
  ),

  listening: JSON.stringify(
    [
      {
        title: 'Campus Tour',
        topic: 'University Life',
        level: 'B1',
        type: 'CONVERSATION',
        fullText:
          'Welcome to the university. My name is Sarah and I will be your guide today. On your left is the library, open from 8am to 10pm. Straight ahead is the main lecture hall for first-year classes.',
        segments: [
          {
            index: 0,
            text: 'Welcome to the university.',
            startSec: 0,
            endSec: 2.5,
            speaker: 'Sarah',
          },
          {
            index: 1,
            text: 'My name is Sarah and I will be your guide today.',
            startSec: 2.5,
            endSec: 6.0,
            speaker: 'Sarah',
          },
          {
            index: 2,
            text: 'On your left is the library, open from 8am to 10pm.',
            startSec: 6.0,
            endSec: 10.5,
            speaker: 'Sarah',
          },
        ],
        speakerRate: 0.95,
        speakerLang: 'en-US',
        speakerPitch: 1.0,
        allowedModes: ['EASY', 'MEDIUM', 'HARD'],
        questions: [
          {
            question: 'What is the name of the tour guide?',
            options: ['Sarah', 'Emma', 'Laura', 'Kate'],
            correctIndex: 0,
            explanation: 'Sarah introduces herself at the beginning.',
            referenceStartSec: 2.5,
            referenceEndSec: 6.0,
          },
          {
            question: 'Until what time is the library open?',
            options: ['8pm', '9pm', '10pm', '11pm'],
            correctIndex: 2,
            explanation: 'The library is open until 10pm.',
            referenceStartSec: 6.0,
            referenceEndSec: 10.5,
          },
        ],
      },
    ],
    null,
    2,
  ),
};
