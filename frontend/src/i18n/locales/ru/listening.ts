// frontend/src/i18n/locales/ru/listening.ts
// ПОЛНАЯ ЗАМЕНА

export const listening = {
  title:          'Аудирование',
  subtitle:       'Тренируйте восприятие на слух с реальными диалогами и лекциями',
  loading:        'Загружаем материалы…',
  error:          'Не удалось загрузить материалы',
  retry:          'Повторить',
  materialsCount: 'материалов',
  questionss:      'вопросов',
  modess:          'режима',

  type: {
    lecture:      'Лекция',
    conversation: 'Диалог',
  },

  filters: {
    searchPlaceholder: 'Поиск по названию или теме…',
    allTypes:          'Все',
    allLevels:         'Все уровни',
  },

  empty: {
    title: 'Материалы не найдены',
    hint:  'Попробуйте изменить фильтры',
  },

  modeSelect: {
    title:    'Выберите режим практики',
    subtitle: 'Разные режимы — разные задачи и награды XP',
  },

  modes: {
    EASY: {
      name:  'Лёгкий',
      plays: '∞ прослушиваний',
      xp:    '×0.7 XP',
      desc:  'Транскрипт виден. Слушайте сколько угодно раз.',
    },
    MEDIUM: {
      name:  'Средний',
      plays: '3 прослушивания',
      xp:    '×1.0 XP',
      desc:  'Транскрипт скрыт во время воспроизведения. Откроется после завершения.',
    },
    HARD: {
      name:  'Сложный',
      plays: '1 прослушивание',
      xp:    '×1.3 XP',
      desc:  'Один шанс. Максимальная награда XP.',
    },
  },

  player: {
    backToList:       'Назад к библиотеке',
    transcript:       'Транскрипт',
    transcriptHidden: 'Транскрипт скрыт — завершите сессию, чтобы его увидеть',
    restart:          'Начать сначала',
    noPlaysLeft:      'Прослушивания закончились',
    completing:       'Сохраняем результаты…',
    complete:         'Завершить сессию',

    playsUnlimited:  '{{count}} прослушиваний',
    playsCount:      '{{used}} / {{max}} прослушиваний',

    voiceGoogle:   'Google Neural2',
    voiceBrowser:  'Браузерный голос',
    voiceLoading:  'Загружаем аудио…',
    voiceNone:     'Голос недоступен',

    voiceWarnBasic:  'Для лучшего качества звука откройте страницу в Chrome или Edge.',
    ttsNotSupported: 'Синтез речи не поддерживается. Используйте Chrome или Safari.',
  },

  questions: {
    title:       'Вопросы',
    listenFirst: 'Прослушайте материал хотя бы раз перед ответом',
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