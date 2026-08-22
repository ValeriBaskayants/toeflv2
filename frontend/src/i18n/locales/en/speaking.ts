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
};