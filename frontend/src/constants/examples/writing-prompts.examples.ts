export const WRITING_PROMPTS_EXAMPLES: string = String.raw`// ═══════════════════════════════════════════════════════════════════════════
// WRITING · EMAIL and ACADEMIC DISCUSSION prompts.
// ("Build a Sentence" is a separate task: create it in the Build a Sentence tab.)
//
// REAL TEST FORMAT
//   • Write an Email: about 7 minutes, roughly 80–120 words. A situation, who you write to,
//     and what the email must cover.
//   • Academic Discussion: 10 minutes, at least 100 words. A professor's question plus
//     two classmates' posts that the learner can respond to.
//
// RULES THE IMPORT ENFORCES / THE SCREENS RELY ON
//  • "type" is EMAIL or ACADEMIC_DISCUSSION. Anything else is rejected.
//  • The task instructions belong INSIDE "prompt" (there is no separate instructions field).
//    For an email: the situation, the recipient and 2–3 points to cover, each on its own line
//    ("\n- ..."). The prompt can be up to 2000 characters.
//  • ACADEMIC_DISCUSSION: ALWAYS add exactly two "discussionPeerResponses" (authorName + text).
//    Validation does not force it, but the real test always shows two classmate posts and the
//    screen shows them next to the question. Each text is limited to 1000 characters.
//  • Do NOT set minWords / maxWords / timeLimitSec. The system decides them from the task type
//    and the level, so values you write are ignored:
//        B1–C2   real-test values: Email ≈ 7 min, 80–140 words · Discussion 10 min, 100–180 words
//        A1–A2+  easier built-in values that grow step by step toward the real ones
//  • "level" is yours to choose freely (A1–C2). Language difficulty changes with the level;
//    the structure of the task never does.
//  • TOEFL buttons: Email and Discussion have separate buttons. A prompt is picked by them
//    only if its level is B1–C2. Prompts of any level can still be opened manually.
//  • "topic" is optional (up to 100 characters). A prompt with the same text as an existing one is skipped.
// ═══════════════════════════════════════════════════════════════════════════
[
  {
    // ── 1) EMAIL, guided level (A2): everyday situation, simple language,
    // the same three-point structure as a real email task.
    "type": "EMAIL",
    "level": "A2",
    "topic": "Making plans",
    "prompt": "You want to invite your friend Jamie to a weekend hiking trip. Write an email to Jamie. In your email:\n- Explain where you want to go and when\n- Say why you think Jamie would enjoy it\n- Ask if Jamie can come"
  },
  {
    // ── 2) EMAIL, strict level (B2): same format, more formal register and a harder situation.
    "type": "EMAIL",
    "level": "B2",
    "topic": "Workplace communication",
    "prompt": "You recently registered for a training session organized by your company, but a scheduling conflict prevented you from attending. Write an email to your manager. In your email:\n- Explain what happened\n- Apologize for the inconvenience\n- Ask about rescheduling options"
  },
  {
    // ── 3) ACADEMIC_DISCUSSION, strict level (B1): professor's question + exactly two classmate
    // posts that take different positions, so the learner has something to respond to.
    "type": "ACADEMIC_DISCUSSION",
    "level": "B1",
    "topic": "Education",
    "prompt": "Your professor is teaching a class on education policy. Write a post responding to the professor's question below.\n\nProfessor Rivera: \"Some people believe that university students should be required to attend every class, while others think attendance should be optional as long as students pass their exams. What is your opinion, and why?\"",
    "discussionPeerResponses": [
      {
        "authorName": "Daniela",
        "text": "I think attendance should be mandatory. When students skip class regularly, they miss discussions and explanations that are not always in the textbook, and it usually shows in their exam results."
      },
      {
        "authorName": "Marcus",
        "text": "I disagree with Daniela. Some students learn better on their own, and forcing everyone to sit in a room does not guarantee they are paying attention. What matters is the final result, not how they got there."
      }
    ]
  },
  {
    // ── 4) ACADEMIC_DISCUSSION, guided level (A2+): identical structure, much simpler language.
    "type": "ACADEMIC_DISCUSSION",
    "level": "A2_PLUS",
    "topic": "Daily life",
    "prompt": "Your teacher asked a question in an online class discussion. Write a post responding to the question below.\n\nTeacher: \"Do you think it is better to study alone or to study with friends? Why?\"",
    "discussionPeerResponses": [
      {
        "authorName": "Sofia",
        "text": "I like studying with friends because we can ask each other questions and it is not boring."
      },
      {
        "authorName": "Leo",
        "text": "I prefer studying alone. I can focus better and go at my own speed."
      }
    ]
  }
]
`;