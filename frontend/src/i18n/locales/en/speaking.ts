export const speaking = {
  hub: {
    title: 'Speaking',
    subtitle: 'Practice speaking tasks that mirror the real TOEFL test',
    types: {
      listenAndRepeat: {
        name: 'Listen and Repeat',
        desc: 'Hear a sentence once, then repeat it exactly as spoken',
      },
    },
  },
  listenRepeat: {
    title: 'Listen and Repeat',
    subtitle: 'Choose a set and practice under real test conditions',
    loading: 'Loading sets...',
    items: 'phrases',
    start: 'Start Practice',
    filters: {
      level: 'Level',
    },
    empty: {
      title: 'No sets available',
      hint: 'Try a different level',
    },
  },
  session: {
    exitConfirm: 'Are you sure you want to exit? Your progress in this session will be lost.',
    idle: {
      title: 'Ready to begin?',
      hint: 'You will hear each sentence once, then repeat it after a short beep. Make sure your microphone is on.',
      begin: 'Begin',
    },
    requestingMic: 'Requesting microphone access...',
    getReady: 'Get ready...',
    loadingAudio: 'Loading audio...',
    listen: 'Listen carefully',
    getReadyToSpeak: 'Get ready to speak',
    speakNow: 'Speak now',
    processing: 'Processing your response...',
    recorded: 'Recorded',
    finishing: 'Calculating your results...',
    retry: 'Try again',
    errors: {
      microphone_denied: 'Microphone access is required for this task',
      audio_load_failed: 'Could not load the audio. Please try again',
      audio_playback_failed: 'Audio playback failed. Please try again',
      submit_failed: 'Could not submit your answer. Please try again',
      finish_failed: 'Could not finalize your results. Please try again',
      quota_exceeded: 'Monthly speech assessment quota reached. It resets on the 1st of next month',
    },
    review: {
      title: 'Session Complete',
      taskScore: 'task score',
      overall: 'overall',
      backToList: 'Back to sets',
    },
  },
  repeat: {
  title: 'Speaking — Listen and Repeat',
  subtitle: 'Repeat sentences exactly as you hear them, just like on the TOEFL test',
  loading: 'Loading…',
  error: 'Something went wrong',
  retry: 'Try again',
  backToList: 'Back to library',
  itemCount: '{{count}} sentence',
  itemCount_other: '{{count}} sentences',
  itemOf: 'Sentence {{current}} of {{total}}',
  bestScore: 'Best: {{score}}%',

  filters: { allScenarios: 'All scenarios', allLevels: 'All levels' },
  empty: { title: 'No speaking sets found', hint: 'Try a different level or scenario' },

  status: { completed: 'Completed', inProgress: 'In progress', notStarted: 'Not started yet' },

  intro: {
    title: 'Before you start',
    rule1: 'You will hear {{count}} sentences, one at a time.',
    rule2: 'Each sentence plays only once — there is no replay.',
    rule3: 'After a short pause and a beep, repeat it exactly as you heard it.',
    rule4: 'Recording starts automatically and stops after a fixed time — just like the real test.',
    start: 'Start',
    starting: 'Starting…',
  },

  mic: {
    requesting: 'Requesting microphone access…',
    deniedTitle: 'Microphone access needed',
    reasons: {
      permission_denied: 'Please allow microphone access in your browser settings and reload the page.',
      no_microphone: 'No microphone was found on this device.',
      device_busy: 'Your microphone is being used by another application.',
      unknown: 'Could not access your microphone. Please check your device settings and try again.',
    },
  },

  unsupported: 'Your browser does not support audio recording. Please use a recent version of Chrome, Edge, Firefox, or Safari.',
  audioError: 'Could not load the audio for this sentence.',
  listen: 'Listen carefully…',
  getReady: 'Get ready…',
  speakNow: 'Speak now',
  recording: 'Recording',
  submitting: 'Saving your answer…',
  finishing: 'Calculating your results…',

  submitFailed: {
    title: 'Something went wrong',
    hint: "We couldn't save one of your answers after a few attempts. Let's start this task again.",
    restart: 'Start again',
  },

  results: {
    taskScore: 'Task score: {{score}} / 5',
    xpEarned: 'XP earned',
    itemsCompleted: 'Sentences completed',
    youSaid: 'You said',
    playYourAnswer: 'Play your answer',
    practiceAgain: 'Practice again',
  },
},
};