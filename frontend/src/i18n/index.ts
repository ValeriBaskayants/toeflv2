import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const listeningEN = {
  title: 'Listening',
  subtitle: 'Train your ear with real-world conversations and lectures',
  loading: 'Loading materials…',
  error: 'Could not load listening materials',
  retry: 'Try again',
  materialsCount: 'materials',
  questionsLabel: 'questions',
  modes: 'modes',

  type: {
    lecture: 'Lecture',
    conversation: 'Conversation',
  },

  filters: {
    searchPlaceholder: 'Search by title or topic…',
    allTypes: 'All',
    allLevels: 'All levels',
  },

  empty: {
    title: 'No materials found',
    hint: 'Try changing the filters or check back later',
  },

  modeSelect: {
    title: 'Choose your practice mode',
    subtitle: 'Different modes offer different challenges and XP rewards',
  },

  player: {
    backToList: 'Back to library',
    transcript: 'Transcript',
    transcriptHidden: 'Transcript hidden — complete the session to reveal it',
    restart: 'Restart from beginning',
    noPlaysLeft: 'No plays remaining',
    completing: 'Saving results…',
    complete: 'Complete session',
    voicePremium: 'Premium voice',
    voiceStandard: 'Standard voice',
    voiceBasic: 'Basic voice — open Chrome for better audio',
    voiceNone: 'No voice — browser not supported',
    voiceWarnBasic:
      'Your browser uses a basic voice. For the best experience open this page in Chrome.',
    ttsNotSupported:
      'Text-to-speech is not supported in this browser. Please use Chrome or Safari.',
  },

  questions: {
    title: 'Questions',
    listenFirst: 'Listen at least once before answering the questions',
    why: 'Why?',
  },

  notes: {
    label: 'Notes',
    placeholder: 'Jot something down… (Ctrl+Enter to save)',
    add: 'Add',
    empty: 'No notes yet',
  },

  results: {
    finalScore: 'Final score',
    accuracy: 'Accuracy',
    xpEarned: 'XP earned',
    correct: 'Correct',
    questions: 'Question breakdown',
    showTranscript: 'View full transcript',
    backToLibrary: 'Back to library',
  },
};

export const listeningRU = {
  title: 'Аудирование',
  subtitle: 'Тренируйте восприятие на слух с реальными диалогами и лекциями',
  loading: 'Загружаем материалы…',
  error: 'Не удалось загрузить материалы',
  retry: 'Повторить',
  materialsCount: 'материалов',
  questionsLabel: 'вопросов',
  modes: 'режима',

  type: {
    lecture: 'Лекция',
    conversation: 'Диалог',
  },

  filters: {
    searchPlaceholder: 'Поиск по названию или теме…',
    allTypes: 'Все',
    allLevels: 'Все уровни',
  },

  empty: {
    title: 'Материалы не найдены',
    hint: 'Попробуйте изменить фильтры',
  },

  modeSelect: {
    title: 'Выберите режим практики',
    subtitle: 'Разные режимы — разные задачи и награды XP',
  },

  player: {
    backToList: 'Назад к библиотеке',
    transcript: 'Транскрипт',
    transcriptHidden: 'Транскрипт скрыт — завершите сессию, чтобы его увидеть',
    restart: 'Начать сначала',
    noPlaysLeft: 'Прослушивания закончились',
    completing: 'Сохраняем результаты…',
    complete: 'Завершить сессию',
    voicePremium: 'Премиум-голос',
    voiceStandard: 'Стандартный голос',
    voiceBasic: 'Базовый голос — откройте Chrome для лучшего звука',
    voiceNone: 'Голос недоступен — браузер не поддерживается',
    voiceWarnBasic:
      'Ваш browser использует базовый голос. Для лучшего опыта откройте страницу в Chrome.',
    ttsNotSupported:
      'Синтез речи не поддерживается в этом браузере. Используйте Chrome или Safari.',
  },

  questions: {
    title: 'Вопросы',
    listenFirst: 'Прослушайте material хотя бы раз, прежде чем отвечать',
    why: 'Почему?',
  },

  notes: {
    label: 'Заметки',
    placeholder: 'Запишите что-нибудь… (Ctrl+Enter — сохранить)',
    add: 'Добавить',
    empty: 'Заметок пока нет',
  },

  results: {
    finalScore: 'Итоговый балл',
    accuracy: 'Точность',
    xpEarned: 'Получено XP',
    correct: 'Верных',
    questions: 'Разбор вопросов',
    showTranscript: 'Показать транскрипт',
    backToLibrary: 'Вернуться в библиотеку',
  },
};

export const listeningHY = {
  title: 'Լսողություն',
  subtitle: 'Մարզեք ձեր ականջը իրական երկխոսությունների և դասախոսությունների վրա',
  loading: 'Բեռնվում են նյութեր…',
  error: 'Չhajhogvets bervyl nyutery',
  retry: 'Կrkin փordzel',
  materialsCount: 'nyuter',
  questionsLabel: 'harc',
  modes: 'rezhim',

  type: {
    lecture: 'Դasakhosowtyown',
    conversation: 'Erkhaghowtyown',
  },

  filters: {
    searchPlaceholder: 'Orononel anvannov kam themayov…',
    allTypes: 'Bolor',
    allLevels: 'Bolor makardownery',
  },

  empty: {
    title: 'Nyuterchyen gtanvhel',
    hint: 'Pordzeq phokhokhel filtery',
  },

  modeSelect: {
    title: 'Entreq практики rezhim',
    subtitle: 'Taparhakan rezhimner — taparhakan ardyownqner ev XP payghater',
  },

  player: {
    backToList: 'Verenadardz գraderan',
    transcript: 'Transkript',
    transcriptHidden: 'Transkript-y thaqnvatsvats e — avartecheq sessian bacehelow hamar',
    restart: 'Sksel hnoc',
    noPlaysLeft: 'Lsumner spaservhel en',
    completing: 'Pahpanvum en ardyownqner…',
    complete: 'Avaretnel session',
    voicePremium: 'Premium dzayn',
    voiceStandard: 'Standarty dzayn',
    voiceBasic: 'Havet dzayn — Chrome bacheq lav dzayni hamar',
    voiceNone: 'Dzayn chka — brauzery chi shtakarel',
    voiceWarnBasic:
      'Dzez brauzer-y ogtagordzovm e havet dzayn. Chrome-owm bacheq lav tesambirowtyown vayelelov.',
    ttsNotSupported:
      'Xosk-y sentez-y chi shtakarel ayds brauzer-owm. Ogtagordzeq Chrome kam Safari.',
  },

  questions: {
    title: 'Harcer',
    listenFirst: 'Lsheq nyuter-y goneaz mek angam, minchev pataskhanem harcerow',
    why: 'Inc-ow?',
  },

  notes: {
    label: 'Grosher',
    placeholder: 'Grosheq inch-or… (Ctrl+Enter — pahpanel)',
    add: 'Avelacnel',
    empty: 'Grosher chenk gtnhel',
  },

  results: {
    finalScore: 'Verjnakan miav',
    accuracy: 'Chshtowtyown',
    xpEarned: 'Stacvats XP',
    correct: 'Chisht',
    questions: 'Harcer',
    showTranscript: 'Tesnel transkript',
    backToLibrary: 'Verenadardz graderan',
  },
};

export const EN_ADDITIONS = {
  navigation: {
    quiz: 'Quiz',
  },
  grammar: {
    title: 'Grammar Quiz',
    subtitle: 'Test your knowledge, earn XP, track mistakes',
    level: 'Your level',
    difficulty: 'Difficulty',
    recommended: 'Recommended for',
    questionCount: 'Number of questions',
    topic: 'Topic',
    optional: 'optional',
    topicPlaceholder: 'e.g. Present Perfect, Modal Verbs…',
    loading: 'Loading questions…',
    start: 'Start Quiz',
    exit: 'Exit quiz',
    prev: 'Previous',
    next: 'Next',
    answered: 'answered',
    submit: 'Submit Quiz',
    submitting: 'Submitting…',
    accuracy: 'accuracy',
    correct: 'Correct',
    earned: 'earned',
    newQuiz: 'New Quiz',
    reviewTitle: 'Answer Review',
    yourAnswer: 'You',
    noQuestions: 'No questions found for these filters.',
  },
  reading: {
    title: 'Reading',
    subtitle: 'Improve comprehension across all CEFR levels',
    allLevels: 'All',
    searchPlaceholder: 'Search by topic or title…',
    retry: 'Retry',
    noResults: 'No readings found for this filter.',
    vocabulary: 'Vocabulary',
    questions: 'Comprehension Check',
    accuracy: 'accuracy',
    correct: 'correct',
    yourAnswer: 'Your answer',
    correctAnswer: 'Correct',
    tryAgain: 'Try Again',
    submit: 'Submit Answers',
    submitting: 'Submitting…',
    readyToSubmit: 'All questions answered',
    loading: 'Loading article…',
    notFound: 'Article not found.',
    backToList: 'Back',
  },
};

export const RU_ADDITIONS = {
  navigation: {
    quiz: 'Квиз',
  },
  grammar: {
    title: 'Грамматический квиз',
    subtitle: 'Проверьте знания, зарабатывайте XP, отслеживайте ошибки',
    level: 'Ваш уровень',
    difficulty: 'Сложность',
    recommended: 'Рекомендовано для',
    questionCount: 'Количество вопросов',
    topic: 'Тема',
    optional: 'необязательно',
    topicPlaceholder: 'Напр. Present Perfect, Modal Verbs…',
    loading: 'Загрузка вопросов…',
    start: 'Начать квиз',
    exit: 'Выйти',
    prev: 'Назад',
    next: 'Далее',
    answered: 'отвечено',
    submit: 'Отправить квиз',
    submitting: 'Отправка…',
    accuracy: 'точность',
    correct: 'Правильно',
    earned: 'заработано',
    newQuiz: 'Новый квиз',
    reviewTitle: 'Разбор ошибок',
    yourAnswer: 'Ваш ответ',
    noQuestions: 'Вопросы не найдены. Измените фильтры.',
  },
  reading: {
    title: 'Чтение',
    subtitle: 'Улучшите понимание текста на всех уровнях CEFR',
    allLevels: 'Все',
    searchPlaceholder: 'Поиск по теме или названию…',
    retry: 'Повторить',
    noResults: 'Ничего не найдено.',
    vocabulary: 'Словарь',
    questions: 'Проверка понимания',
    accuracy: 'точность',
    correct: 'правильно',
    yourAnswer: 'Вы',
    correctAnswer: 'Правильно',
    tryAgain: 'Попробовать снова',
    submit: 'Отправить ответы',
    submitting: 'Отправка…',
    readyToSubmit: 'Все вопросы отвечены',
    loading: 'Загрузка статьи…',
    notFound: 'Статья не найдена.',
    backToList: 'Назад',
  },
};

export const HY_ADDITIONS = {
  navigation: {
    quiz: 'Քվիզ',
  },
  grammar: {
    title: 'Քերականական Քվիզ',
    subtitle: 'Ստուգեք գիտելիքները, վաստակեք XP',
    level: 'Ձեր մակարդակը',
    difficulty: 'Բարդություն',
    recommended: 'Առաջարկվում է',
    questionCount: 'Հարցերի քանակ',
    topic: 'Թեմա',
    optional: 'կամընտիր',
    topicPlaceholder: 'Օրինակ՝ Present Perfect…',
    loading: 'Բեռնվում է…',
    start: 'Սկսել Քվիզ',
    exit: 'Ելք',
    prev: 'Հետ',
    next: 'Հաջորդ',
    answered: 'պատասխանված',
    submit: 'Ուղարկել',
    submitting: 'Ուղարկվում է…',
    accuracy: 'ճշտություն',
    correct: 'Ճիշտ',
    earned: 'վաստակված',
    newQuiz: 'Նոր Քվիզ',
    reviewTitle: 'Սխալների վերլուծություն',
    yourAnswer: 'Ձեր',
    noQuestions: 'Հարցեր չեն գտնվել։',
  },
  reading: {
    title: 'Ընթերցում',
    subtitle: 'Բարձրացրեք ըմբռնումը բոլոր մակարդակներում',
    allLevels: 'Բոլոր',
    searchPlaceholder: 'Որոնել թեմայով կամ անվամբ…',
    retry: 'Կրկնել',
    noResults: 'Ոչինչ չի գտնվել։',
    vocabulary: 'Բառապաշար',
    questions: 'Ըմբռնման ստուգում',
    accuracy: 'ճշտություն',
    correct: 'ճիշտ',
    yourAnswer: 'Դուք',
    correctAnswer: 'Ճիշտ',
    tryAgain: 'Կրկին փորձել',
    submit: 'Ուղարկել',
    submitting: 'Ուղարկվում է…',
    readyToSubmit: 'Բոլոր հարցերը պատասխանված են',
    loading: 'Բեռնվում է…',
    notFound: 'Հոդվածը չի գտնվել։',
    backToList: 'Հետ',
  },
};

export const writingEN = {
  title: 'Writing',
  subtitle: 'Practise written English and get instant AI feedback',
  loading: 'Loading prompts…',
  error: 'Could not load writing prompts',
  retry: 'Try again',
  promptsCount: 'prompts',
  words: 'words',
  hasInstructions: 'Has instructions',
  backToPrompts: 'Back to prompts',
  submissionError: 'Analysis failed',

  prompt: 'Your prompt',
  instructions: 'Instructions',
  target: 'Target',
  yourResponse: 'Your response',
  placeholder: 'Start writing here… Take your time and write clearly.',
  submit: 'Submit for feedback',
  submitting: 'Submitting…',
  analyzing: 'Analysing your writing…',
  analyzingHint:
    'This usually takes 10–30 seconds. The AI is checking grammar, vocabulary, coherence and task completion.',
  analysisError: 'Analysis failed',
  analysisErrorHint:
    'The analysis service is temporarily unavailable. Please try again in a moment.',
  analyzed: 'Feedback ready',
  writeAgain: 'Write again',
  tryAgain: 'Try again',

  wordCount: {
    tooShort: 'Too short — aim for at least {{min}} words',
    belowMin: '{{count}} words — you need {{min}} to submit',
    inRange: '{{count}} words ✓',
    tooLong: 'Over the limit of {{max}} words',
  },

  filters: {
    level: 'Level',
    type: 'Type',
    allLevels: 'All',
    allTypes: 'All',
  },

  history: {
    title: 'My recent submissions',
  },

  analysis: {
    overallScore: 'Overall score',
    grammar: 'Grammar',
    task: 'Task completion',
    vocabulary: 'Vocabulary',
    coherence: 'Coherence',
    errors: 'errors',
    noErrors: 'No critical errors found — great work!',
    feedback: 'Feedback',
    suggestions: 'Suggestions',
    hoverErrors: 'Hover over highlighted words to see suggestions.',
    tab: {
      scores: 'Scores',
      errors: 'Errors',
      text: 'Annotated text',
    },
  },

  empty: {
    title: 'No prompts available',
    hint: 'Try a different level or check back later',
  },
};

export const writingRU = {
  title: 'Письмо',
  subtitle: 'Практикуйте письменный английский и получайте мгновенную обратную связь',
  loading: 'Загружаем задания…',
  error: 'Не удалось загрузить задания',
  retry: 'Повторить',
  promptsCount: 'заданий',
  words: 'слов',
  hasInstructions: 'Есть инструкции',
  backToPrompts: 'К списку заданий',
  submissionError: 'Ошибка анализа',

  prompt: 'Задание',
  instructions: 'Инструкции',
  target: 'Цель',
  yourResponse: 'Ваш ответ',
  placeholder: 'Начните писать здесь… Пишите чётко и связно.',
  submit: 'Отправить на проверку',
  submitting: 'Отправляем…',
  analyzing: 'Анализируем вашу работу…',
  analyzingHint:
    'Обычно это занимает 10–30 секунд. ИИ проверяет грамматику, словарный запас, связность и выполнение задания.',
  analysisError: 'Анализ не выполнен',
  analysisErrorHint: 'Сервис анализа временно недоступен. Попробуйте снова через момент.',
  analyzed: 'Обратная связь готова',
  writeAgain: 'Написать заново',
  tryAgain: 'Попробовать снова',

  wordCount: {
    tooShort: 'Слишком коротко — напишите хотя бы {{min}} слов',
    belowMin: '{{count}} слов — нужно {{min}} для отправки',
    inRange: '{{count}} слов ✓',
    tooLong: 'Превышен лимит {{max}} слов',
  },

  filters: {
    level: 'Уровень',
    type: 'Тип',
    allLevels: 'Все',
    allTypes: 'Все',
  },

  history: {
    title: 'Последние работы',
  },

  analysis: {
    overallScore: 'Общий балл',
    grammar: 'Грамматика',
    task: 'Выполнение задания',
    vocabulary: 'Словарный запас',
    coherence: 'Связность',
    errors: 'ошибок',
    noErrors: 'Критических ошибок не найдено — отличная работа!',
    feedback: 'Обратная связь',
    suggestions: 'Исправления',
    hoverErrors: 'Наведите на выделенные слова, чтобы увидеть подсказки.',
    tab: {
      scores: 'Оценки',
      errors: 'Ошибки',
      text: 'Текст с пометками',
    },
  },

  empty: {
    title: 'Заданий пока нет',
    hint: 'Попробуйте другой уровень или зайдите позже',
  },
};

export const writingHY = {
  title: 'Գrrowtyown',
  subtitle: 'Marzheq grvakan angleren ev stacek ANI arajanin kardziqayin ardzagankh',
  loading: 'Bervum en andradzagrery…',
  error: 'Chhajhoghvets bervyl andradzagrery',
  retry: 'Noric pordzel',
  promptsCount: 'andradzager',
  words: 'barer',
  hasInstructions: 'Kanon-ner ka',
  backToPrompts: 'Andradzagrer verenadardz',
  submissionError: 'Verclutyuny chstacvec',

  prompt: 'Andradzager',
  instructions: 'Kanon-ner',
  target: 'Npatakaketer',
  yourResponse: 'Dzez pataskhan',
  placeholder: 'Sksel grel ayste… Greq hast ev kapaktsabar.',
  submit: 'Ukharkol verclutyyan hamar',
  submitting: 'Ukharkolvum e…',
  analyzing: 'Vercloghowme dzez ashkhataynqy…',
  analyzingHint:
    'Sader e 10–30 vayrkyan. ABI-n stugowm e qerakanowthowthoyn, barashowthowthoyn, kapaktsabarowthowthoyn ev andradzagri katarowmowthowthoyn.',
  analysisError: 'Verclutyuny chstacvec',
  analysisErrorHint:
    'Vercloghowme hamakargichhy jobov anhetagayelye e. Pordzeq noric mek vayrkyan anc.',
  analyzed: 'Ardzagankhe patrastel e',
  writeAgain: 'Greq noric',
  tryAgain: 'Noric pordzel',

  wordCount: {
    tooShort: 'Karr e — greq goneaz {{min}} bar',
    belowMin: '{{count}} bar — petq e {{min}} ukharkeli hamar',
    inRange: '{{count}} bar ✓',
    tooLong: 'Antsnel e {{max}} bari serrnagordzakan sirrry',
  },

  filters: {
    level: 'Makardownak',
    type: 'Taresar',
    allLevels: 'Bolor',
    allTypes: 'Bolor',
  },

  history: {
    title: 'Verjin ashkhataynqery',
  },

  analysis: {
    overallScore: 'Ynthanur miav',
    grammar: 'Qerakanowthowthoyn',
    task: 'Andradzagri katarwowthowthoyn',
    vocabulary: 'Barashowthowthoyn',
    coherence: 'Kapaktsabarowthowthoyn',
    errors: 'sahman',
    noErrors: 'Karevagayin sahmanyer chyen gnacvel — gagecaneli ashkhataynq!',
    feedback: 'Ardzagankh',
    suggestions: 'Kshownmner',
    hoverErrors: 'Mnaceq nnshvats bari vray andradzel kshownmner tesnelow hamar.',
    tab: {
      scores: 'Miavner',
      errors: 'Sahmanvatsner',
      text: 'Nshvats text',
    },
  },

  empty: {
    title: 'Andradzagrer chka',
    hint: 'Pordzeq ayl makardownak kam verelan ayceq',
  },
};

const resources = {
  en: {
    translation: {
      auth: {
        signIn: 'Continue with Google',
        signOut: 'Sign out',
        welcome: 'Welcome back',
        tagline: 'Master TOEFL with adaptive AI learning',
        brandDesc:
          'Adaptive exercises, spaced repetition, and real-time feedback tailored to your level.',
        cardSubtitle: 'Sign in to track your progress and start practising.',
        freeBadge: 'Free · No credit card',
        disclaimer: 'By continuing you agree to our Terms of Service and Privacy Policy.',
        sessionRestored: 'Restoring your session…',
        redirecting: 'Signing you in…',
        statLevels: 'Levels',
        statSkills: 'Skills',
        statRange: 'CEFR Range',
      },
      navigation: {
        overview: 'Overview',
        dashboard: 'Dashboard',
        practiceTitle: 'Practice',
        writing: 'Writing',
        reading: 'Reading',
        listening: 'Listening',
        speaking: 'Speaking',
        grammar: 'Grammar',
        vocabulary: 'Vocabulary',
        analyticsTitle: 'Analytics',
        progress: 'Progress',
        bookmarks: 'Bookmarks',
        quiz: 'Quiz',
      },
      dashboard: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
        subtitle: 'Your TOEFL journey continues.',
        admin: 'Admin',
        statLevel: 'Current level',
        statStreak: 'Day streak',
        statGoal: 'Weekly goal',
        weeklyGoal: 'Weekly activity',
        days: 'days',
        practiceAreas: 'Practice areas',
        comingSoon: 'Coming soon',
        features: {
          writing: 'Writing',
          reading: 'Reading',
          listening: 'Listening',
          speaking: 'Speaking',
          grammar: 'Grammar',
          vocabulary: 'Vocabulary',
        },
      },
      settings: {
        darkMode: 'Dark mode',
        lightMode: 'Light mode',
      },
      features: {
        spaced: 'Spaced repetition flashcards',
        ai: 'AI writing & grammar feedback',
        levels: '10 proficiency levels (A1 → C2)',
        progress: 'Detailed progress analytics',
        multilingual: 'EN / RU / HY interface',
      },
      listening: listeningEN,
      grammar: EN_ADDITIONS.grammar,
      reading: EN_ADDITIONS.reading,
      writing: writingEN,
    },
  },

  ru: {
    translation: {
      auth: {
        signIn: 'Войти через Google',
        signOut: 'Выйти',
        welcome: 'С возвращением',
        tagline: 'Подготовка к TOEFL с адаптивным ИИ',
        brandDesc:
          'Адаптивные задания, интервальное повторение и обратная связь в реальном времени.',
        cardSubtitle: 'Войдите, чтобы отслеживать прогресс и начать практику.',
        freeBadge: 'Бесплатно · Без карты',
        disclaimer:
          'Продолжая, вы соглашаетесь с Условиями использования и Политикой конфиденциальности.',
        sessionRestored: 'Восстанавливаем сессию…',
        redirecting: 'Выполняется вход…',
        statLevels: 'Уровней',
        statSkills: 'Навыков',
        statRange: 'Диапазон CEFR',
      },
      navigation: {
        overview: 'Обзор',
        dashboard: 'Главная',
        practiceTitle: 'Практика',
        writing: 'Письмо',
        reading: 'Чтение',
        listening: 'Аудирование',
        speaking: 'Говорение',
        grammar: 'Грамматика',
        vocabulary: 'Словарный запас',
        analyticsTitle: 'Аналитика',
        progress: 'Прогресс',
        bookmarks: 'Закладки',
        quiz: 'Квиз',
      },
      dashboard: {
        morning: 'Доброе утро',
        afternoon: 'Добрый день',
        evening: 'Добрый вечер',
        subtitle: 'Ваш путь к TOEFL продолжается.',
        admin: 'Администратор',
        statLevel: 'Текущий уровень',
        statStreak: 'Дней подряд',
        statGoal: 'Цель недели',
        weeklyGoal: 'Активность за неделю',
        days: 'дней',
        practiceAreas: 'Разделы практики',
        comingSoon: 'Скоро',
        features: {
          writing: 'Письмо',
          reading: 'Чтение',
          listening: 'Аудирование',
          speaking: 'Говорение',
          grammar: 'Грамматика',
          vocabulary: 'Словарный запас',
        },
      },
      settings: {
        darkMode: 'Тёмная тема',
        lightMode: 'Светлая тема',
      },
      features: {
        spaced: 'Карточки с интервальным повторением',
        ai: 'ИИ-проверка письма и грамматики',
        levels: '10 уровней владения (A1 → C2)',
        progress: 'Подробная аналитика прогресса',
        multilingual: 'Интерфейс EN / RU / HY',
      },
      listening: listeningRU,
      grammar: RU_ADDITIONS.grammar,
      reading: RU_ADDITIONS.reading,
      writing: writingRU,
    },
  },

  hy: {
    translation: {
      auth: {
        signIn: 'Մուտք Google-ով',
        signOut: 'Ելք',
        welcome: 'Բարի վերադարձ',
        tagline: 'TOEFL-ի նախապատրաստում ադապտիվ ԱԲ-ով',
        brandDesc:
          'Հարմարվողական վարժություններ, ինտերվալային կրկնություն և անմիջական հետադարձ կապ։',
        cardSubtitle: 'Մուտք գործեք, որպեսզի հետևեք ձեր առաջընթացին։',
        freeBadge: 'Անվճար · Առանց քարտի',
        disclaimer: 'Շարունակելով՝ դուք համաձայն եք Ծառայության պայմաններին։',
        sessionRestored: 'Վերականգնվում է նիստը…',
        redirecting: 'Մուտք գործում…',
        statLevels: 'Մակարդակ',
        statSkills: 'Հմտություն',
        statRange: 'CEFR Շրջանակ',
      },
      navigation: {
        overview: 'Ակնարկ',
        dashboard: 'Գլխավոր',
        practiceTitle: 'Պրակտիկա',
        writing: 'Գրություն',
        reading: 'Ընթերցում',
        listening: 'Լսողություն',
        speaking: 'Խոսք',
        grammar: 'Քերականություն',
        vocabulary: 'Բառապաշար',
        analyticsTitle: 'Վերլուծություն',
        progress: 'Առաջընթաց',
        bookmarks: 'Պահպանած',
        quiz: 'Քվիզ',
      },
      dashboard: {
        morning: 'Բարի լույս',
        afternoon: 'Բարի օր',
        evening: 'Բարի երեկո',
        subtitle: 'Ձեր TOEFL-ի ճանապարհը շարունակվում է։',
        admin: 'Ադմին',
        statLevel: 'Ընթացիկ մակարդակ',
        statStreak: 'Անընդմեջ օր',
        statGoal: 'Շաբաթական նպատակ',
        weeklyGoal: 'Շաբաթական ակտիվություն',
        days: 'օր',
        practiceAreas: 'Պրակտիկայի բաժիններ',
        comingSoon: 'Շուտով',
        features: {
          writing: 'Գրություն',
          reading: 'Ընթերցում',
          listening: 'Լսողություն',
          speaking: 'Խոսք',
          grammar: 'Քերականություն',
          vocabulary: 'Բառապաշար',
        },
      },
      settings: {
        darkMode: 'Մուգ ռեժիմ',
        lightMode: 'Լույս ռեժիմ',
      },
      features: {
        spaced: 'Ինտերվալային կրկնության քարտեր',
        ai: 'ԱԲ գրավոր ստուգում',
        levels: '10 մակարդակ (A1 → C2)',
        progress: 'Մանրամասն վերլուծություն',
        multilingual: 'EN / RU / HY ինտերֆեյս',
      },
      listening: listeningHY,
      grammar: HY_ADDITIONS.grammar,
      reading: HY_ADDITIONS.reading,
      writing: writingHY,
    },
  },
};

const savedLang = localStorage.getItem('toefl_lang') ?? 'en';

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
  .catch((err: unknown) => {
    console.error('[i18n] init failed:', err);
  });

i18n.on('languageChanged', (lng: string) => {
  localStorage.setItem('toefl_lang', lng);
});

export default i18n;
