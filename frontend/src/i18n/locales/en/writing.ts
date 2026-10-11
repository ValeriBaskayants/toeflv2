export const writing = {
  hub: {
    title: 'Writing',
    subtitle: 'Every TOEFL Writing task, plus extra practice for grammar and vocabulary',
    types: {
      scramble: { name: 'Build a Sentence', desc: 'Assemble grammatically correct sentences under a timer' },
      email: { name: 'Write an Email', desc: 'Respond to a real-life situation in 80–120 words' },
      discussion: { name: 'Academic Discussion', desc: 'Join a class discussion and respond to two classmates' },
      vocabulary: { name: 'Vocabulary', desc: 'Build your word bank with spaced repetition' },
      quiz: { name: 'Quiz', desc: 'Quick multiple-choice practice' },
    },
  },

  loading: 'Loading…',
  error: 'Could not load prompts',
  retry: 'Try again',
  words: 'words',
  backToPrompts: 'Back to Writing',
  prompt: 'Prompt',
  submit: 'Submit',
  submitting: 'Submitting…',
  wordCountLive: '{{count}} / {{min}} words',

  status: { completed: 'Done', inProgress: 'In progress' },
  empty: { title: 'No prompts available', hint: 'Try a different level' },

  analyzing: 'Analysing your writing…',
  analyzingHint: 'Usually takes 10–30 seconds.',
  analysisError: 'Analysis failed',
  analysisErrorHint: 'The analysis service is temporarily unavailable. Please try again in a moment.',

  email: {
    title: 'Write an Email',
    subtitle: 'Respond to everyday situations — invitations, requests, workplace messages',
    toeflCardTitle: 'TOEFL Email Task',
    toeflCardDesc: '~7 minutes, 80–120 words — one click picks a task and starts the timer, exactly like the real test.',
    sectionLabel: 'Write an Email',
    placeholder: 'Dear…',
  },
  discussion: {
    title: 'Academic Discussion',
    subtitle: "Respond to a professor's question and engage with two classmates' posts",
    toeflCardTitle: 'TOEFL Academic Discussion Task',
    toeflCardDesc: '10 minutes, at least 100 words — one click picks a topic and starts the timer, exactly like the real test.',
    sectionLabel: 'Academic Discussion',
    peerLabel: 'Classmates already posted',
    placeholder: 'I agree/disagree because…',
  },

  analysis: {
    grammar: 'Grammar',
    task: 'Task completion',
    vocabulary: 'Vocabulary',
    coherence: 'Coherence',
    engagement: 'Discussion engagement',
    conventions: 'Email conventions',
    errors: 'errors',
    feedback: 'Feedback',
  },
};