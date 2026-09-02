export const listening = {
  title: 'Listening',
  subtitle: 'Train your ear with real-world conversations and lectures',
  loading: 'Loading materials…',
  error: 'Could not load listening materials',
  retry: 'Try again',
  materialsCount: 'materials',
  questionss: 'questions',
  modess: 'modes',

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


  modes: {
    EASY: {
      name: 'Easy',
      plays: '∞ plays',
      xp: '×0.7 XP',
      desc: 'Transcript visible. Replay as many times as you need.',
    },
    MEDIUM: {
      name: 'Medium',
      plays: '3 plays',
      xp: '×1.0 XP',
      desc: 'No transcript during playback. Revealed on completion.',
    },
    HARD: {
      name: 'Hard',
      plays: '1 play',
      xp: '×1.3 XP',
      desc: 'One chance only. Maximum XP reward.',
    },
  },

  player: {
    backToList: 'Back to library',
    transcript: 'Transcript',
    transcriptHidden: 'Transcript hidden — complete the session to reveal it',
    restart: 'Restart from beginning',
    noPlaysLeft: 'No plays remaining',
    completing: 'Saving results…',
    complete: 'Complete session',


    playsUnlimited: '{{count}} plays',
    playsCount: '{{used}} / {{max}} plays',


    voiceGoogle: 'Google Neural2',
    voiceBrowser: 'Browser voice',

    paused: 'Paused',
    ttsError: 'Audio unavailable',
    voiceWarnBasic: 'For the best audio quality, open this page in Chrome or Edge.',
    ttsNotSupported: 'Text-to-speech is not supported in this browser. Please use Chrome or Safari.',
    voiceAzure: 'Azure Neural',
    voiceLoading: 'Loading audio…',
    voiceNone: 'Voice unavailable',
    noContent: 'No audio content available for this material.',
    playbackFailed: 'Playback failed. Click play again.',
    audioPlaybackError: 'Audio playback error. Try reloading the page.',
    ttsFallbackReasons: {
      api_key_not_configured: 'Audio service is not configured. Please contact support.',
      rate_limited: 'Audio service is temporarily busy. Please try again shortly.',
      unauthorized: 'Audio service configuration error. Please contact support.',
      timeout: 'Audio request timed out. Please try again.',
      network_error: 'Network error while loading audio. Check your connection.',
      default: 'Audio is temporarily unavailable. Please try again later.',
    },
  },

  questions: {
    title: 'Questions',
    listenFirst: 'Listen at least once before answering',
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