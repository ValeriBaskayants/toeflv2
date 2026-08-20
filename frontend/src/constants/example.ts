import type { ContentType } from "../types/admin/Admin.types";
const SCRAMBLE_EXAMPLE = [
  {
    sentence: 'She quickly finished her homework before dinner.',
    level: 'A2',
    topic: 'past-simple',
    allowedModes: ['EASY', 'MEDIUM'],
    translation: 'Она быстро закончила домашнюю работу перед ужином.',
    explanation: 'Adverb "quickly" goes between subject and verb.',
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
];
const GRAMMAR_RULES_EXAMPLE = [
  {
    topic: 'Future Simple Tense (will)',
    slug: 'future-simple-tense',
    level: 'B1',
    tier: 'FOUNDATION',
    order: 40,
    isCore: true,
    prerequisiteSlugs: ['present-simple'],
    summary: 'The simple future tense expresses an action or state that will begin and end in the future. It is formed with will and the base form of the verb, and it never changes for person or number.',
    coreConcept: 'will + base verb, the same for every subject — English verbs do not conjugate in the future tense.',
    structure: 'Subject + will + base verb | Subject + will not (won\'t) + base verb | Will + subject + base verb?',
    usages: [
      {
        title: 'Statements: plans, expectations, predictions',
        explanation: 'We use [[will]] + base verb to state that something is scheduled, planned, expected, or predicted.',
        examples: [
          { sentence: 'The package [[will]] arrive next Tuesday.', translation: 'Посылка прибудет в следующий вторник.' },
          { sentence: 'It [[will]] rain before long.', translation: 'Скоро пойдёт дождь.' },
          { sentence: 'Mei thinks she [[will]] hear back about the job she just applied for.', translation: 'Мэй думает, что ей ответят насчёт работы, на которую она только что подала заявку.' },
        ],
      },
      {
        title: 'Negative form',
        explanation: 'To say something will not happen, use [[will not]] (short form [[won\'t]]) + base verb.',
        examples: [
          { sentence: 'The package [[will not]] arrive in time for the party.', translation: 'Посылка не успеет прибыть к вечеринке.' },
          { sentence: 'Safiya [[won\'t]] quit before she reaches her goal.', translation: 'Сафия не сдастся, пока не достигнет цели.' },
        ],
      },
      {
        title: 'Questions',
        explanation: 'To ask about the future, put [[will]] before the subject: Will + subject + base verb?',
        examples: [
          { sentence: '[[Will]] Safiya finish reading forty books by the end of the year?', translation: 'Успеет ли Сафия прочитать сорок книг до конца года?' },
          { sentence: 'What [[will]] Arif do with the money he got for his birthday?', translation: 'Что Ариф сделает с деньгами, которые получил на день рождения?' },
        ],
      },
    ],
    sections: [
      {
        title: 'Alternative: be going to',
        content: '[[Be going to]] is another very common way to talk about the future: am/is/are + going to + base verb. It is generally more informal and conversational, and it is often used to emphasise a decision that has already been made.',
        examples: [
          { sentence: 'I am [[going to]] learn a new language.', translation: 'Я собираюсь выучить новый язык.' },
          { sentence: 'Safiya is [[going to]] read that book.', translation: 'Сафия собирается прочитать эту книгу.' },
          { sentence: 'My brothers are [[going to]] sleep until noon if no one wakes them up.', translation: 'Мои братья проспят до полудня, если их никто не разбудит.' },
        ],
      },
      {
        title: 'Other ways to talk about the future',
        content: 'English also uses the present simple and present continuous for scheduled events, the future continuous for an action in progress at a specific future time, and the future perfect for an action expected to be completed before a future point.',
        examples: [
          { sentence: 'My favorite television show [[airs]] in half an hour.', translation: 'Моё любимое шоу выходит через полчаса. (Present Simple — расписание)' },
          { sentence: 'Vera [[is having]] dinner with Xavier next week.', translation: 'Вера ужинает с Ксавье на следующей неделе. (Present Continuous — договорённость)' },
          { sentence: 'By the time you read this letter, I [[will be boarding]] my train.', translation: 'К тому времени, как ты прочитаешь это письмо, я буду садиться на поезд. (Future Continuous)' },
          { sentence: 'The train [[will have arrived]] at the station by five o\'clock.', translation: 'Поезд уже прибудет на станцию к пяти часам. (Future Perfect)' },
        ],
      },
    ],
    commonMistakes: [
      'She wills go. ✗ → She will go. ✓ — will never takes -s, even with he/she/it.',
      'I will to help you. ✗ → I will help you. ✓ — no "to" directly after will.',
    ],
    signalWords: ['tomorrow', 'next week', 'soon', 'in the future', 'by the time'],
    relatedTopics: ['will-and-be-going-to', 'future-continuous', 'future-perfect'],
    crossReferences: [
      { label: 'Advanced: Will vs Be Going To — nuances', targetSlug: 'will-and-be-going-to' },
    ],
    practiceTargets: {
      grammarRequired: 6,
      grammarAccuracyMin: 65,
      quizRequired: 2,
      readingRequired: 1,
      listeningRequired: 1,
    },
  },
  {
    topic: 'Will and Be Going To — Predictions, Decisions and Formality',
    slug: 'will-and-be-going-to',
    level: 'B2',
    tier: 'ADVANCED',
    order: 41,
    isCore: false,
    prerequisiteSlugs: ['future-simple-tense'],
    sourceAttribution: 'Based on Advanced Grammar in Use — Martin Hewings, Cambridge University Press',
    summary: 'We can use either will or be going to to talk about something planned or likely — but the choice shifts with predictions, spontaneous decisions, formality, and conditional sentences.',
    coreConcept: 'will and be going to are often interchangeable, but each has contexts where only one is natural.',
    structure: 'will + base verb | am/is/are + going to + base verb',
    sections: [
      {
        letter: 'A',
        title: 'Predictions: opinion vs present evidence',
        content: 'We use [[will]] rather than [[be going to]] to make a prediction based on our opinion or experience. We use [[be going to]] rather than [[will]] when the prediction is based on some present evidence we can see right now.',
        examples: [
          { sentence: 'Why not come over at the weekend? The children [[will]] enjoy seeing you again.', translation: 'Приезжай в выходные — дети будут рады тебя видеть.' },
          { sentence: '\'Shall I ask Lamar?\' \'No, she [[won\'t]] want to be disturbed.\'', translation: '«Спросить у Ламар?» — «Нет, ей не захочется, чтобы её беспокоили».' },
          { sentence: 'The sky\'s gone really dark. There\'s [[going to]] be a storm.', translation: 'Небо совсем потемнело. Будет гроза.' },
          { sentence: '\'What\'s the matter with him?\' \'It looks like he\'s [[going to]] faint.\'', translation: '«Что с ним?» — «Похоже, он сейчас упадёт в обморок».' },
        ],
      },
      {
        letter: 'B',
        title: 'Prediction verbs',
        content: 'To predict the future we often use [[will]] together with prediction verbs: I bet (informal), I expect, I hope, I imagine, I reckon (informal), I think, I wonder, I\'m sure. We also use will in questions about predictions with think and reckon.',
        register: 'mixed',
        examples: [
          { sentence: 'I imagine the stadium [[will]] be full for the match on Saturday.', translation: 'Полагаю, стадион будет полон на субботнем матче.' },
          { sentence: 'That cheese smells awful. I bet nobody [[will]] eat it.', translation: 'Этот сыр ужасно пахнет. Готов поспорить, никто его не съест.' },
          { sentence: 'When do you think you\'[[ll]] finish work?', translation: 'Как думаешь, когда ты закончишь работу?' },
          { sentence: 'Do you reckon he\'[[ll]] say yes?', translation: 'Думаешь, он согласится?' },
        ],
      },
      {
        letter: 'C',
        title: 'Decisions: at the moment of speaking vs already planned',
        content: 'We use [[will]] when we make a decision at the moment of speaking, and [[be going to]] for decisions about the future that have already been made.',
        register: 'informal',
        examples: [
          { sentence: 'I\'[[ll]] pick him up at eight.', translation: 'Я заеду за ним в восемь. (предложение, решение прямо сейчас)' },
          { sentence: 'I\'m [[going to]] collect the children at eight.', translation: 'Я забираю детей в восемь. (уже было запланировано заранее)' },
          { sentence: '\'Pineapples are on special offer this week.\' \'In that case, I\'[[ll]] buy two.\'', translation: '«На ананасы скидка на этой неделе». — «Тогда куплю два».' },
          { sentence: 'When I\'ve saved up enough money, I\'m [[going to]] buy a smartphone.', translation: 'Когда накоплю достаточно денег, куплю смартфон.' },
        ],
      },
      {
        letter: 'D',
        title: 'Conditional if-sentences',
        content: 'We can use [[will]] or [[be going to]] with little difference in meaning in the main clause of an if-sentence, when something (often negative) is conditional on something else. But when the future event does not depend on the action in the if-clause, we use [[be going to]], not will — this is mainly found in spoken English.',
        register: 'spoken',
        examples: [
          { sentence: 'You\'[[ll]]/You\'re [[going to]] knock that glass over if you\'re not careful.', translation: 'Ты сейчас уронишь этот стакан, если не будешь осторожен.' },
          { sentence: 'I\'m [[going to]] open a bottle of lemonade, if you want some.', translation: 'Я собираюсь открыть бутылку лимонада — хочешь? (открою в любом случае)' },
          { sentence: 'I\'[[ll]] open a bottle of lemonade if you want some.', translation: 'Если хочешь лимонада, я открою бутылку. (открою, только если ты скажешь да)' },
        ],
      },
      {
        letter: 'E',
        title: 'Offers, promises, requests, ability and logical consequence',
        content: 'We use [[will]], not [[be going to]], when the main clause refers to offers, requests, promises, ability, or when one thing is the logical consequence of another.',
        examples: [
          { sentence: 'If Erik phones, I\'[[ll]] let you know.', translation: 'Если позвонит Эрик, я тебе сообщу. (обещание/предложение)' },
          { sentence: 'If you look to your left, you\'[[ll]] see the lake.', translation: 'Если посмотришь налево, увидишь озеро. (способность увидеть)' },
          { sentence: 'If you don\'t switch on the monitor first, the computer [[won\'t]] come on.', translation: 'Если сначала не включишь монитор, компьютер не запустится. (логическое следствие)' },
        ],
      },
    ],
    comparisons: [
      {
        letter: 'F',
        compareWith: 'Formal announcements',
        explanation: 'In a formal style, we use [[will]] rather than [[be going to]] to talk about future events that have already been arranged in detail — schedules, agendas, official notices.',
        examples: [
          { sentence: 'Are you [[going to]] talk at the meeting tonight?', translation: 'Ты выступишь на сегодняшнем собрании? (нейтрально/неформально)' },
          { sentence: 'The meeting [[will]] begin at 9 am. Refreshments [[will]] be available from 8:30 onwards.', translation: 'Собрание начнётся в 9:00. Угощение будет доступно с 8:30. (формальное объявление)' },
        ],
      },
    ],
    commonMistakes: [
      'I\'m going to let you know when Erik phones. ✗ → I\'ll let you know when Erik phones. ✓ — offers and promises always use will, not be going to.',
      'Using be going to for something that only makes sense as a logical consequence: If you don\'t save the file, you\'re not going to lose your work. ✗ → ... you won\'t lose your work. ✓',
    ],
    signalWords: ['I bet', 'I expect', 'I hope', 'I imagine', 'I reckon', 'I think', 'I wonder', "I'm sure"],
    relatedTopics: ['future-simple-tense', 'conditional-sentences-type-1'],
    crossReferences: [
      { label: 'Reminder: Foundation — Future Simple Tense', targetSlug: 'future-simple-tense' },
      { label: 'see also: point D', targetAnchor: 'D' },
    ],
    practiceTargets: {
      grammarRequired: 8,
      grammarAccuracyMin: 75,
      quizRequired: 3,
      readingRequired: 1,
      listeningRequired: 1,
    },
  },
];
export const EXAMPLES: Record<ContentType, string> = {
  scramble: JSON.stringify(SCRAMBLE_EXAMPLE, null, 2),
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

  grammarRules: JSON.stringify(GRAMMAR_RULES_EXAMPLE, null, 2),

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