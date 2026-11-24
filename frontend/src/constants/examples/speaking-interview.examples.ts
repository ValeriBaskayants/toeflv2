export const SPEAKING_INTERVIEW_EXAMPLES: string = String.raw`// ═══════════════════════════════════════════════════════════════════════════
// SPEAKING · TAKE AN INTERVIEW — a set = EXACTLY 4 questions on one everyday topic.
// The learner hears each question once, then has 45 seconds to answer.
// There is no beep and no preparation time: recording starts right after the question.
//
// REAL TEST FORMAT: a simulated interview with a researcher about everyday or campus
// topics — your experiences and opinions. It is scored on Fluency, Intelligibility,
// Language Use and Organization, so good questions invite reasons and examples.
//
// RULES THE IMPORT ENFORCES / THE SCREENS RELY ON
//  • Exactly 4 questions (any other count is rejected). "orderIndex" 0–3; the learner gets them in that order.
//  • Questions are only HEARD, never shown, and played once. Write them to be understood by ear:
//    one idea per question, roughly 25 words or fewer, open-ended (no yes/no questions).
//  • Keep all 4 questions on the SAME topic, moving from easy and personal to a bit more reflective.
//  • "level" decides the rules:
//        A1–A2+  slowed-down voice and instant feedback after every answer
//        B1–C2   natural speed, scores hidden until the end (real-test behavior)
//  • TOEFL button pool: every set with level B1–C2 (there is no "isExamSet" flag here).
//  • "voiceId" is an Azure neural voice id (default en-US-AndrewNeural). The real interviewer may
//    have an American, British, Australian or New Zealand accent — vary the voice between sets.
//    Check the id exists in your Azure region; a wrong id fails when the audio is requested.
//  • "topic" + "level" must be unique: an existing pair is skipped.
// ═══════════════════════════════════════════════════════════════════════════
[
  {
    // ── 1) STRICT LEVEL (B2) ── longer, more reflective questions; British voice.
    "topic": "Study habits and time management",
    "level": "B2",
    "voiceId": "en-GB-RyanNeural",
    "questions": [
      { "orderIndex": 0, "text": "Tell me about how you usually organize your study time during a busy week." },
      { "orderIndex": 1, "text": "What is one study habit that has worked well for you, and why?" },
      { "orderIndex": 2, "text": "Some people study better alone, while others prefer working in groups. Which do you prefer, and what are your reasons?" },
      { "orderIndex": 3, "text": "If you could give one piece of advice to a new student about managing time at university, what would it be?" }
    ]
  },
  {
    // ── 2) GUIDED LEVEL (A2) ── same structure (exactly 4 questions), but simple everyday
    // language. Slowed voice and instant feedback apply automatically; not in the TOEFL button pool.
    "topic": "Free time and hobbies",
    "level": "A2",
    "questions": [
      { "orderIndex": 0, "text": "What do you like to do in your free time?" },
      { "orderIndex": 1, "text": "Who do you usually spend your weekends with?" },
      { "orderIndex": 2, "text": "Tell me about a hobby you would like to try. Why do you want to try it?" },
      { "orderIndex": 3, "text": "What did you do last weekend?" }
    ]
  }
]
`;