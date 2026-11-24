export const SPEAKING_REPEAT_EXAMPLES: string = String.raw`// ═══════════════════════════════════════════════════════════════════════════
// SPEAKING · LISTEN AND REPEAT — a set = several sentences about ONE situation.
// The learner hears each sentence ONCE, then repeats it once after the beep.
// There is no preparation time and no replay (as on the real test).
//
// REAL TEST FORMAT: 7 sentences, getting longer and harder, about 8–12 seconds to answer each.
//
// RULES THE IMPORT ENFORCES / THE SCREENS RELY ON
//  • "isExamSet": true  → the set must contain EXACTLY 7 items and the difficulty must never
//    go down (SHORT → MEDIUM → LONG). Otherwise the whole set is rejected with a reason.
//    "isExamSet": false (or omitted) → any 3–12 items, any order.
//  • "difficulty" guideline (approximate): SHORT ≈ 3–6 words, MEDIUM ≈ 7–10 words,
//    LONG ≈ 11–16 words (real long items are 15+ syllables).
//  • "recordingWindowSec": in an exam set it is set by the system from difficulty
//    (SHORT 8 s, MEDIUM 10 s, LONG 12 s) — your value is ignored. In a normal set it is
//    optional (3–20 s); the default also follows difficulty.
//  • "orderIndex": items are sorted by it and renumbered 0, 1, 2…; the learner gets them in that order.
//  • "text" is compared word by word with what the learner says. Write numbers as words
//    ("seven", not "7") and avoid abbreviations and symbols, or correct speech will be marked wrong.
//  • "level" decides the rules:
//        A1–A2+  slowed-down voice and an instant score after every sentence
//        B1–C2 + "isExamSet": true   natural speed, scores are hidden until the end (real-test behavior)
//  • TOEFL button pool: "isExamSet": true AND level B1–C2. Everything else is opened manually.
//  • "voiceId" is an Azure neural voice id (default en-US-AndrewNeural). The real test uses
//    several accents (American, British, Australian, New Zealand) — vary the voice between sets.
//    Check the id exists in your Azure region; a wrong id fails when the audio is requested.
//  • "imageUrl" (optional, must be a valid URL): one picture for the whole set.
//    The real test shows a simple picture with every sentence.
//  • "scenario" + "level" must be unique: an existing pair is skipped.
// ═══════════════════════════════════════════════════════════════════════════
[
  {
    // ── 1) EXAM SET (strict level) ── exactly 7 sentences: 2 SHORT, 3 MEDIUM, 2 LONG.
    // All sentences belong to one situation (here: a tour of a campus fitness center).
    "scenario": "Tour of the campus fitness center",
    "level": "B2",
    "isExamSet": true,
    "voiceId": "en-GB-RyanNeural",
    // "imageUrl": "https://example.com/campus-fitness-center.jpg",
    "items": [
      { "orderIndex": 0, "difficulty": "SHORT", "text": "Welcome to the fitness center." },
      { "orderIndex": 1, "difficulty": "SHORT", "text": "The lockers are on your left." },
      { "orderIndex": 2, "difficulty": "MEDIUM", "text": "You need a student card to enter the gym." },
      { "orderIndex": 3, "difficulty": "MEDIUM", "text": "The swimming pool opens at seven every morning." },
      { "orderIndex": 4, "difficulty": "MEDIUM", "text": "Please wipe the equipment after you use it." },
      { "orderIndex": 5, "difficulty": "LONG", "text": "Group classes are free for students, but you must reserve a spot online." },
      { "orderIndex": 6, "difficulty": "LONG", "text": "If you have any questions about your membership, please ask the staff at the front desk." }
    ]
  },
  {
    // ── 2) PRACTICE SET (guided level) ── "isExamSet" is false, so the count is flexible (3–12)
    // and one item overrides the recording window. Level A2 → slowed voice + instant feedback.
    // It is not in the TOEFL button pool (not an exam set, and the level is below B1).
    "scenario": "Ordering at a cafe",
    "level": "A2",
    "isExamSet": false,
    "voiceId": "en-US-AriaNeural",
    "items": [
      { "orderIndex": 0, "difficulty": "SHORT", "text": "I would like a coffee, please." },
      { "orderIndex": 1, "difficulty": "SHORT", "text": "Is the cake fresh today?" },
      // Custom window: only allowed because this is NOT an exam set.
      { "orderIndex": 2, "difficulty": "MEDIUM", "recordingWindowSec": 12, "text": "Can I pay with a card, or only with cash?" },
      { "orderIndex": 3, "difficulty": "MEDIUM", "text": "I will sit by the window and wait for my friend." }
    ]
  }
]
`;