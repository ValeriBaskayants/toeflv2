export const LISTENING_EXAMPLES: string = String.raw`// ═══════════════════════════════════════════════════════════════════════════
// LISTENING — each entry is ONE independent exercise of ONE task type.
//
// RULES THE IMPORT ENFORCES / THE SCREENS RELY ON
//  • "type" decides how many questions are REQUIRED — any other count is rejected:
//        LISTEN_CHOOSE_RESPONSE = 1    CONVERSATION = 2    ANNOUNCEMENT = 2    ACADEMIC_TALK = 5
//  • "fullText" is read aloud word for word by ONE synthetic voice. Never put speaker
//    names in it ("Anna: ...") — they would be spoken. Names go in segments[].speaker,
//    which is shown in the transcript only. Multi-voice dialogue is not supported yet.
//  • "segments" feed the transcript (Study mode and the result screen). startSec/endSec
//    are required by validation but are NOT used to sync audio — rough values are fine.
//    "segments": [] is allowed: the transcript then falls back to fullText.
//  • "level" decides the rules automatically:
//        A1–A2+  guided: speech is slowed down by the system, 2–3 plays in Exam mode,
//                (your speakerRate is ignored there; it is still used in Study mode)
//        B1–C2   strict, identical to the real test: ONE play, speakerRate is used as written
//  • "allowedModes":  "PRACTICE" = exam simulation (answers hidden until the end, one timer)
//                     "STUDY"    = replays + transcript + instant feedback
//                     Use one or both. A material with only "STUDY" has no Exam button.
//  • TOEFL button pool: a material is picked by the TOEFL button only if its level is
//    B1–C2 AND "PRACTICE" is in allowedModes. Every other material is reachable manually.
//  • "title" must be unique: an existing title is skipped, never updated.
//  • "correctIndex" is 0-based (0 = first option). Use 4 options, as on the real test.
//  • "speakerLang": en-US, en-GB or en-AU (anything else falls back to the en-US voice).
//    "speakerPitch" is accepted but currently not applied — leave it out.
//  • "grammarTopics" (optional) are slugs of EXISTING grammar rules; unknown slugs are ignored.
//  • "isAvailableForPlacement", "difficultyRating", "discriminationRating" (optional) are
//    reserved for the Placement test; the exercise screens do not use them.
//  • "referenceStartSec"/"referenceEndSec" on a question are stored but not used by the
//    current screens.
// ═══════════════════════════════════════════════════════════════════════════
[
  {
    // ── 1) LISTEN_CHOOSE_RESPONSE ── real format: ONE short remark (about 5 seconds of
    // audio), then pick the best reply. The best reply is often the indirect one.
    // Strict level (B2) + "PRACTICE" → part of the TOEFL button pool.
    "title": "Moving the project meeting",
    "topic": "Workplace",
    "level": "B2",
    "type": "LISTEN_CHOOSE_RESPONSE",
    "fullText": "I was hoping we could move tomorrow's meeting, since the data still hasn't come in.",
    "segments": [
      { "index": 0, "text": "I was hoping we could move tomorrow's meeting, since the data still hasn't come in.", "startSec": 0, "endSec": 5 }
    ],
    "speakerRate": 1.0,
    "speakerLang": "en-US",
    "allowedModes": ["STUDY", "PRACTICE"],
    "questions": [
      {
        "question": "Choose the best reply.",
        "options": [
          "Sure, let's push it to Thursday so the data is ready.",
          "Great, I'm glad the data has finally arrived.",
          "I agree, last week's meeting went very well.",
          "No problem, I'll book a table for lunch tomorrow."
        ],
        "correctIndex": 0,
        // "explanation" is optional; it is shown in Study mode and on the result screen.
        "explanation": "The speaker asks to postpone the meeting because the data is missing. Only the first reply accepts the change and fits the reason."
      }
    ]
  },
  {
    // ── 2) CONVERSATION ── a short dialogue, then exactly 2 questions.
    // fullText has NO speaker names (they would be read aloud); the names live in segments.
    // Different accent (en-GB) and an optional grammarTopics link.
    "title": "Printing an essay at the library",
    "topic": "Campus life",
    "level": "B1",
    "type": "CONVERSATION",
    "fullText": "Excuse me, do you know where I can print my essay? Sure. The printers are on the second floor, next to the study rooms. Do I need a card? I left mine in my dorm. You can use your student ID, but you have to add some money to it first. Where can I do that? There's a machine by the main entrance. It only takes a minute. Great, thanks. I have a deadline in an hour. Then you'd better hurry. The line gets long before noon.",
    "segments": [
      { "index": 0, "speaker": "Student", "text": "Excuse me, do you know where I can print my essay?", "startSec": 0, "endSec": 3 },
      { "index": 1, "speaker": "Librarian", "text": "Sure. The printers are on the second floor, next to the study rooms.", "startSec": 3, "endSec": 8 },
      { "index": 2, "speaker": "Student", "text": "Do I need a card? I left mine in my dorm.", "startSec": 8, "endSec": 11 },
      { "index": 3, "speaker": "Librarian", "text": "You can use your student ID, but you have to add some money to it first.", "startSec": 11, "endSec": 16 },
      { "index": 4, "speaker": "Student", "text": "Where can I do that?", "startSec": 16, "endSec": 18 },
      { "index": 5, "speaker": "Librarian", "text": "There's a machine by the main entrance. It only takes a minute.", "startSec": 18, "endSec": 23 },
      { "index": 6, "speaker": "Student", "text": "Great, thanks. I have a deadline in an hour.", "startSec": 23, "endSec": 27 },
      { "index": 7, "speaker": "Librarian", "text": "Then you'd better hurry. The line gets long before noon.", "startSec": 27, "endSec": 31 }
    ],
    "speakerRate": 1.0,
    "speakerLang": "en-GB",
    "allowedModes": ["STUDY", "PRACTICE"],
    "grammarTopics": ["modal-verbs"],
    "questions": [
      {
        "question": "Why does the student need to print something?",
        "options": [
          "He lost his student card.",
          "He has an essay due soon.",
          "He wants to buy a book.",
          "He is looking for a study room."
        ],
        "correctIndex": 1
      },
      {
        "question": "What must the student do before he can print?",
        "options": [
          "Go back to his dorm",
          "Ask the librarian for a card",
          "Add money to his student ID",
          "Wait until noon"
        ],
        "correctIndex": 2,
        "explanation": "The librarian says he can use his student ID after adding some money to it."
      }
    ]
  },
  {
    // ── 3) ANNOUNCEMENT ── ONE speaker, 2 questions. Guided level (A2+): the system slows
    // the speech (speakerRate below is ignored in Exam mode) and allows 2 plays.
    // Level is below B1, so the TOEFL button never picks it — learners open it manually.
    "title": "Library closes early on Friday",
    "topic": "Campus announcements",
    "level": "A2_PLUS",
    "type": "ANNOUNCEMENT",
    "fullText": "Attention, students. The campus library will close early this Friday at four o'clock because of a staff meeting. If you need to borrow books for the weekend, please come before three thirty. The study rooms on the first floor will stay open until six. Thank you, and have a nice weekend.",
    "segments": [
      { "index": 0, "text": "Attention, students. The campus library will close early this Friday at four o'clock because of a staff meeting.", "startSec": 0, "endSec": 9 },
      { "index": 1, "text": "If you need to borrow books for the weekend, please come before three thirty.", "startSec": 9, "endSec": 15 },
      { "index": 2, "text": "The study rooms on the first floor will stay open until six. Thank you, and have a nice weekend.", "startSec": 15, "endSec": 23 }
    ],
    "speakerRate": 1.0,
    "speakerLang": "en-US",
    "allowedModes": ["STUDY", "PRACTICE"],
    "questions": [
      {
        "question": "When will the library close on Friday?",
        "options": ["At three thirty", "At four o'clock", "At five o'clock", "At six o'clock"],
        "correctIndex": 1
      },
      {
        "question": "Why is the library closing early?",
        "options": [
          "Because of a holiday",
          "Because of bad weather",
          "Because of a staff meeting",
          "Because of repairs"
        ],
        "correctIndex": 2
      }
    ]
  },
  {
    // ── 4) ACADEMIC_TALK ── a short lecture excerpt (aim for roughly 100–250 words), exactly
    // 5 questions. Mix question kinds: main idea, detail, purpose, inference.
    // "PRACTICE" only = exam-only material (no Study button, no transcript during the task).
    // The optional Placement fields are shown for completeness — safe to omit.
    "title": "The urban heat island effect",
    "topic": "Environmental science",
    "level": "C1",
    "type": "ACADEMIC_TALK",
    "fullText": "Today I'd like to talk about the urban heat island effect. Cities are often several degrees warmer than the countryside around them. One reason is materials. Asphalt and concrete absorb sunlight during the day and release it slowly at night, so urban areas never cool down completely. A second factor is the lack of vegetation. Trees and grass cool the air through evapotranspiration, a process in which plants release water vapor, but in dense cities there is simply less green space. Finally, buildings and traffic release waste heat. Researchers have found that adding reflective roofs and planting trees along streets can reduce local temperatures by as much as two degrees. However, the benefits depend on how many trees survive, which is why maintenance matters as much as planting.",
    "segments": [],
    "speakerRate": 1.0,
    "speakerLang": "en-GB",
    "allowedModes": ["PRACTICE"],
    "isAvailableForPlacement": true,
    "difficultyRating": 1.8,
    "discriminationRating": 1.2,
    "questions": [
      {
        "question": "What is the main topic of the talk?",
        "options": [
          "Why cities are warmer than the surrounding countryside",
          "How trees grow in crowded cities",
          "The history of modern city planning",
          "How reflective roofs are manufactured"
        ],
        "correctIndex": 0
      },
      {
        "question": "According to the speaker, why do cities stay warm at night?",
        "options": [
          "Because streetlights produce heat",
          "Because asphalt and concrete release stored heat slowly",
          "Because there is less wind at night",
          "Because tall buildings block the moonlight"
        ],
        "correctIndex": 1
      },
      {
        "question": "Why does the speaker mention evapotranspiration?",
        "options": [
          "To compare cities with deserts",
          "To describe a problem caused by traffic",
          "To explain how plants cool the air",
          "To introduce a new building material"
        ],
        "correctIndex": 2
      },
      {
        "question": "What does the speaker say can lower local temperatures by up to two degrees?",
        "options": [
          "Banning cars from city centers",
          "Painting buildings in dark colors",
          "Building taller skyscrapers",
          "Reflective roofs and trees along streets"
        ],
        "correctIndex": 3
      },
      {
        "question": "What does the speaker imply about tree-planting programs?",
        "options": [
          "They work only if the trees are looked after",
          "They are too expensive for most cities",
          "They matter less than reflective roofs",
          "Researchers no longer recommend them"
        ],
        "correctIndex": 0,
        "explanation": "The speaker says the benefits depend on how many trees survive, so maintenance matters as much as planting."
      }
    ]
  }
]
`;