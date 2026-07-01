// src/i18n/locales/ru/mistakes.ts
export const mistakes = {
  title:    'Мои ошибки',
  subtitle: 'Разбирайте ошибки и следите за темами, которые требуют практики',
  loading:  'Загружаем ошибки…',
  error:    'Не удалось загрузить ошибки',
  retry:    'Повторить',
  total:    'ошибок',

  stats: {
    total:     'Всего',
    dueReview: 'На повторение',
    mastered:  'Освоено',
    accuracy:  'Точность',
  },

  dates: {
    today:     'Сегодня',
    yesterday: 'Вчера',
    daysAgo:   '{{count}} дн. назад',
    dueNow:    'Пора повторить',
    tomorrow:  'Завтра',
    inDays:    'Через {{count}} дн.',
  },

  banner: {
    one:   '{{count}} ошибка готова к повторению',
    other: '{{count}} ошибок готово к повторению',
    cta:   'Начать повторение →',
  },

  weakSpots: {
    title:        'Слабые места',
    errors:       'ошибок',
    showHeatmap:  'Показать тепловую карту',
    hideHeatmap:  'Скрыть тепловую карту',
    heatmapLabel: 'Плотность ошибок: тема × уровень',
    heatmapEmpty: 'Данных для карты пока нет',
  },

  filters: {
    source:            'Источник',
    category:          'Категория',
    status:            'Статус',
    all:               'Все',
    reset:             'Сбросить фильтры',
    searchPlaceholder: 'Поиск по теме…',
    noResults:         'По текущим фильтрам ошибок нет',
    sources: {
      QUIZ:      'Квиз',
      WRITING:   'Письмо',
      READING:   'Чтение',
      LISTENING: 'Аудирование',
    },
    categories: {
      GRAMMAR:    'Грамматика',
      VOCABULARY: 'Лексика',
      SPELLING:   'Правописание',
      LOGIC:      'Логика',
    },
    statuses: {
      LEARNING:  'Изучается',
      REVIEWING: 'Повторяется',
      MASTERED:  'Освоено',
    },
  },

  card: {
    dueNow:          'Пора повторить',
    recentAttempts:  'Последние попытки',
    noAttempts:      'Попыток пока нет',
    easeFactor:      'Коэф. лёгкости',
    totalAttempts:   'Всего попыток',
    firstSeen:       'Впервые встречено',
    practiceTopic:   'Практиковать тему',
    markMastered:    'Отметить освоенным',
    savingMastered:  'Сохранение…',
    masteredNote:    'Освоено — отличная работа!',
  },

  empty: {
    title: 'Ошибок пока нет — отличный результат!',
    hint:  'Ошибки из квизов, письма, чтения и аудирования будут появляться здесь по мере практики.',
  },
};