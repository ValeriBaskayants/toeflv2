import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ══════════════════════════  EN  ══════════════════════════
const listeningEN = {
  title: 'Listening',
  subtitle: 'Train your ear with real-world conversations and lectures',
  loading: 'Loading materials…',
  error: 'Could not load listening materials',
  retry: 'Try again',
  materialsCount: 'materials',
  questionsLabel: 'questions', // Переименовано для устранения конфликта
  modes: 'modes',

  type: {
    lecture:      'Lecture',
    conversation: 'Conversation',
  },

  filters: {
    searchPlaceholder: 'Search by title or topic…',
    allTypes:    'All',
    allLevels:   'All levels',
  },

  empty: {
    title: 'No materials found',
    hint:  'Try changing the filters or check back later',
  },

  modeSelect: {
    title:    'Choose your practice mode',
    subtitle: 'Different modes offer different challenges and XP rewards',
  },

  player: {
    backToList:     'Back to library',
    transcript:     'Transcript',
    transcriptHidden:
      'Transcript hidden — complete the session to reveal it',
    restart:        'Restart from beginning',
    noPlaysLeft:    'No plays remaining',
    completing:     'Saving results…',
    complete:       'Complete session',
    voicePremium:   'Premium voice',
    voiceStandard:  'Standard voice',
    voiceBasic:     'Basic voice — open Chrome for better audio',
    voiceNone:      'No voice — browser not supported',
    voiceWarnBasic:
      'Your browser uses a basic voice. For the best experience open this page in Chrome.',
    ttsNotSupported:
      'Text-to-speech is not supported in this browser. Please use Chrome or Safari.',
  },

  questions: {
    title:       'Questions',
    listenFirst: 'Listen at least once before answering the questions',
    why:         'Why?',
  },

  notes: {
    label:       'Notes',
    placeholder: 'Jot something down… (Ctrl+Enter to save)',
    add:         'Add',
    empty:       'No notes yet',
  },

  results: {
    finalScore:      'Final score',
    accuracy:        'Accuracy',
    xpEarned:        'XP earned',
    correct:         'Correct',
    questions:       'Question breakdown',
    showTranscript:  'View full transcript',
    backToLibrary:   'Back to library',
  },
};

// ══════════════════════════  RU  ══════════════════════════
const listeningRU = {
  title: 'Аудирование',
  subtitle:
    'Тренируйте восприятие на слух с реальными диалогами и лекциями',
  loading: 'Загружаем материалы…',
  error: 'Не удалось загрузить материалы',
  retry: 'Повторить',
  materialsCount: 'материалов',
  questionsLabel: 'вопросов', // Переименовано для устранения конфликта
  modes: 'режима',

  type: {
    lecture:      'Лекция',
    conversation: 'Диалог',
  },

  filters: {
    searchPlaceholder: 'Поиск по названию или теме…',
    allTypes:  'Все',
    allLevels: 'Все уровни',
  },

  empty: {
    title: 'Материалы не найдены',
    hint:  'Попробуйте изменить фильтры',
  },

  modeSelect: {
    title:    'Выберите режим практики',
    subtitle: 'Разные режимы — разные задачи и награды XP',
  },

  player: {
    backToList:    'Назад к библиотеке',
    transcript:    'Транскрипт',
    transcriptHidden:
      'Транскрипт скрыт — завершите сессию, чтобы его увидеть',
    restart:       'Начать сначала',
    noPlaysLeft:   'Прослушивания закончились',
    completing:    'Сохраняем результаты…',
    complete:      'Завершить сессию',
    voicePremium:  'Премиум-голос',
    voiceStandard: 'Стандартный голос',
    voiceBasic:    'Базовый голос — откройте Chrome для лучшего звука',
    voiceNone:     'Голос недоступен — браузер не поддерживается',
    voiceWarnBasic:
      'Ваш browser использует базовый голос. Для лучшего опыта откройте страницу в Chrome.',
    ttsNotSupported:
      'Синтез речи не поддерживается в этом браузере. Используйте Chrome или Safari.',
  },

  questions: {
    title:       'Вопросы',
    listenFirst: 'Прослушайте material хотя бы раз, прежде чем отвечать',
    why:         'Почему?',
  },

  notes: {
    label:       'Заметки',
    placeholder: 'Запишите что-нибудь… (Ctrl+Enter — сохранить)',
    add:         'Добавить',
    empty:       'Заметок пока нет',
  },

  results: {
    finalScore:     'Итоговый балл',
    accuracy:       'Точность',
    xpEarned:       'Получено XP',
    correct:        'Верных',
    questions:      'Разбор вопросов',
    showTranscript: 'Показать транскрипт',
    backToLibrary:  'Вернуться в библиотеку',
  },
};

// ══════════════════════════  HY  ══════════════════════════
const listeningHY = {
  title: 'Լսողություն',
  subtitle: 'Մարզեք ձեր ականջը իրական երկխոսությունների և դասախոսությունների վրա',
  loading: 'Բեռնվում են նյութեր…',
  error: 'Չhajhogvets bervyl nyutery',
  retry: 'Կrkin փordzel',
  materialsCount: 'nyuter',
  questionsLabel: 'harc', // Переименовано для устранения конфликта
  modes: 'rezhim',

  type: {
    lecture:      'Դasakhosowtyown',
    conversation: 'Erkhaghowtyown',
  },

  filters: {
    searchPlaceholder: 'Orononel anvannov kam themayov…',
    allTypes:  'Bolor',
    allLevels: 'Bolor makardownery',
  },

  empty: {
    title: 'Nyuterchyen gtanvhel',
    hint:  'Pordzeq phokhokhel filtery',
  },

  modeSelect: {
    title:    'Entreq практики rezhim',
    subtitle: 'Taparhakan rezhimner — taparhakan ardyownqner ev XP payghater',
  },

  player: {
    backToList:    'Verenadardz գraderan',
    transcript:    'Transkript',
    transcriptHidden:
      'Transkript-y thaqnvatsvats e — avartecheq sessian bacehelow hamar',
    restart:       'Sksel hnoc',
    noPlaysLeft:   'Lsumner spaservhel en',
    completing:    'Pahpanvum en ardyownqner…',
    complete:      'Avaretnel session',
    voicePremium:  'Premium dzayn',
    voiceStandard: 'Standarty dzayn',
    voiceBasic:    'Havet dzayn — Chrome bacheq lav dzayni hamar',
    voiceNone:     'Dzayn chka — brauzery chi shtakarel',
    voiceWarnBasic:
      'Dzez brauzer-y ogtagordzovm e havet dzayn. Chrome-owm bacheq lav tesambirowtyown vayelelov.',
    ttsNotSupported:
      'Xosk-y sentez-y chi shtakarel ayds brauzer-owm. Ogtagordzeq Chrome kam Safari.',
  },

  questions: {
    title:       'Harcer',
    listenFirst: 'Lsheq nyuter-y goneaz mek angam, minchev pataskhanem harcerow',
    why:         'Inc-ow?',
  },

  notes: {
    label:       'Grosher',
    placeholder: 'Grosheq inch-or… (Ctrl+Enter — pahpanel)',
    add:         'Avelacnel',
    empty:       'Grosher chenk gtnhel',
  },

  results: {
    finalScore:     'Verjnakan miav',
    accuracy:       'Chshtowtyown',
    xpEarned:       'Stacvats XP',
    correct:        'Chisht',
    questions:      'Harcer',
    showTranscript: 'Tesnel transkript',
    backToLibrary:  'Verenadardz graderan',
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

export { listeningEN, listeningRU, listeningHY };
export default i18n;