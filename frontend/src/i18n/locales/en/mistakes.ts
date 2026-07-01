// src/i18n/locales/en/mistakes.ts
export const mistakes = {
  title:    'My Mistakes',
  subtitle: 'Review your errors and track which topics need more practice',
  loading:  'Loading mistakes…',
  error:    'Could not load mistakes',
  retry:    'Try again',
  total:    'mistakes',

  stats: {
    total:     'Total',
    dueReview: 'Due for review',
    mastered:  'Mastered',
    accuracy:  'Accuracy',
  },

  dates: {
    today:     'Today',
    yesterday: 'Yesterday',
    daysAgo:   '{{count}}d ago',
    dueNow:    'Due now',
    tomorrow:  'Tomorrow',
    inDays:    'In {{count}} days',
  },

  banner: {
    one:   '{{count}} mistake ready for review',
    other: '{{count}} mistakes ready for review',
    cta:   'Start review →',
  },

  weakSpots: {
    title:        'Weak spots',
    errors:       'errors',
    showHeatmap:  'Show heatmap',
    hideHeatmap:  'Hide heatmap',
    heatmapLabel: 'Topic × level error density',
    heatmapEmpty: 'No heatmap data yet',
  },

  filters: {
    source:            'Source',
    category:          'Category',
    status:            'Status',
    all:               'All',
    reset:             'Reset filters',
    searchPlaceholder: 'Search by topic…',
    noResults:         'No mistakes match the current filters',
    sources: {
      QUIZ:      'Quiz',
      WRITING:   'Writing',
      READING:   'Reading',
      LISTENING: 'Listening',
    },
    categories: {
      GRAMMAR:    'Grammar',
      VOCABULARY: 'Vocabulary',
      SPELLING:   'Spelling',
      LOGIC:      'Logic',
    },
    statuses: {
      LEARNING:  'Learning',
      REVIEWING: 'Reviewing',
      MASTERED:  'Mastered',
    },
  },

  card: {
    dueNow:          'Due now',
    recentAttempts:  'Recent attempts',
    noAttempts:      'No attempts recorded yet',
    easeFactor:      'Ease factor',
    totalAttempts:   'Total attempts',
    firstSeen:       'First seen',
    practiceTopic:   'Practice topic',
    markMastered:    'Mark mastered',
    savingMastered:  'Saving…',
    masteredNote:    'Mastered — great work!',
  },

  empty: {
    title: 'No mistakes yet — keep it up!',
    hint:  'Errors from quizzes, writing, reading and listening will appear here as you practise.',
  },
};