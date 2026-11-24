export const SCRAMBLE_EXAMPLES: string = String.raw`// ═══════════════════════════════════════════════════════════════════════════
// BUILD A SENTENCE — each item = a context line ("prompt") + chunks that the learner
// arranges into ONE correct sentence. Scoring is all-or-nothing.
//
// REAL TEST FORMAT: about 5–7 chunks (single words or short phrases), sometimes with one
// extra chunk that must NOT be used (a "decoy").
//
// RULES THE IMPORT ENFORCES / THE SCREENS RELY ON
//  • "words" are the chunks. A chunk may be several words ("by Friday") — real chunks often are.
//  • "isDistractor": true marks a decoy. Keep exam items at ONE decoy at most. You may store
//    more decoys than a mode shows: EASY shows 0, MEDIUM 1, HARD 2, EXPERT 1.
//  • "position" = place in the correct sentence (0, 1, 2…) for real chunks; for decoys use any
//    number (99). "id" must be unique inside the item.
//  • "role" (a GrammarRole) is required for every chunk. It is shown to the learner as a hint
//    only at A1–A2+ and never in the exam-style mode (B1+).
//  • "sentence" must equal the chunks joined in order — this is NOT checked automatically, so verify it.
//  • "prompt" is what the learner sees above the chunks (the line they are answering).
//  • Practice sets by level pick ANY item of that level and choose the mode themselves:
//        A1 / A1+ → EASY     A2 / A2+ → MEDIUM     B1 and above → EXPERT (identical to the real test)
//    so for guided items "allowedModes" only documents intent.
//  • EXAM / TOEFL button pool: level B1–C2 AND "EXPERT" in allowedModes AND at most one decoy.
//    HARD mode is not used by the current screens — no need to list it.
//  • "sentence" must be unique: an existing sentence is skipped.
//  • "topicSlugs" (optional) are slugs of existing grammar rules; "explanation" is optional.
//  • DO NOT use "requiresUserInput" yet: the backend accepts it, but the current screens have no
//    typing field, so such an item could never be answered correctly.
// ═══════════════════════════════════════════════════════════════════════════
[
  {
    // ── 1) GUIDED (A1) ── the smallest useful item: 4 chunks, no decoy. Roles are shown as hints.
    "prompt": "What does Maria do every morning?",
    "sentence": "She drinks coffee every morning.",
    "level": "A1",
    "topic": "present-simple",
    "topicSlugs": ["present-simple"],
    "allowedModes": ["EASY", "MEDIUM"],
    "words": [
      { "id": "w1", "word": "She", "role": "SUBJECT", "position": 0, "isDistractor": false },
      { "id": "w2", "word": "drinks", "role": "VERB", "position": 1, "isDistractor": false },
      { "id": "w3", "word": "coffee", "role": "OBJECT", "position": 2, "isDistractor": false },
      { "id": "w4", "word": "every morning", "role": "ADVERB", "position": 3, "isDistractor": false }
    ]
  },
  {
    // ── 2) GUIDED (A2+) ── a pool of TWO decoys. Each mode shows only as many as it allows:
    // EASY shows none, MEDIUM shows one — the system picks from this pool automatically.
    "prompt": "Why was Tom late for class?",
    "sentence": "He missed the bus because it was raining.",
    "level": "A2_PLUS",
    "topic": "past-simple",
    "topicSlugs": ["past-simple"],
    "allowedModes": ["EASY", "MEDIUM"],
    "explanation": "Use the past form 'missed' and the connector 'because' to give a reason.",
    "words": [
      { "id": "w1", "word": "He", "role": "SUBJECT", "position": 0, "isDistractor": false },
      { "id": "w2", "word": "missed", "role": "VERB", "position": 1, "isDistractor": false },
      { "id": "w3", "word": "the bus", "role": "OBJECT", "position": 2, "isDistractor": false },
      { "id": "w4", "word": "because", "role": "CONJUNCTION", "position": 3, "isDistractor": false },
      { "id": "w5", "word": "it", "role": "SUBJECT", "position": 4, "isDistractor": false },
      { "id": "w6", "word": "was raining", "role": "VERB", "position": 5, "isDistractor": false },
      // Decoys: a wrong verb form and a wrong connector. position is ignored for decoys.
      { "id": "w7", "word": "misses", "role": "VERB", "position": 99, "isDistractor": true },
      { "id": "w8", "word": "when", "role": "CONJUNCTION", "position": 99, "isDistractor": true }
    ]
  },
  {
    // ── 3) EXAM-READY (B2) ── phrase chunks, ONE decoy, "EXPERT" allowed: this is what a real
    // test item looks like. No hints are ever shown at this level.
    "prompt": "Did the client accept our proposal?",
    "sentence": "The client said they would review it by Friday.",
    "level": "B2",
    "topic": "reported-speech",
    "topicSlugs": ["reported-speech"],
    "allowedModes": ["MEDIUM", "HARD", "EXPERT"],
    "words": [
      { "id": "w1", "word": "The client", "role": "SUBJECT", "position": 0, "isDistractor": false },
      { "id": "w2", "word": "said", "role": "VERB", "position": 1, "isDistractor": false },
      { "id": "w3", "word": "they", "role": "SUBJECT", "position": 2, "isDistractor": false },
      { "id": "w4", "word": "would review", "role": "VERB", "position": 3, "isDistractor": false },
      { "id": "w5", "word": "it", "role": "OBJECT", "position": 4, "isDistractor": false },
      { "id": "w6", "word": "by Friday", "role": "ADVERB", "position": 5, "isDistractor": false },
      { "id": "w7", "word": "will reviewed", "role": "VERB", "position": 99, "isDistractor": true }
    ]
  },
  {
    // ── 4) EXAM-READY (C1) ── an advanced structure (negative inversion) with ONE decoy that
    // tempts the wrong connector. Same format as above; only the language is harder.
    "prompt": "When did the committee announce its decision?",
    "sentence": "Not until the committee reviewed every proposal did they announce a decision.",
    "level": "C1",
    "topic": "inversion-emphasis",
    "topicSlugs": ["inversion-emphasis"],
    "allowedModes": ["HARD", "EXPERT"],
    "explanation": "Negative inversion: 'Not until X did Y'. The decoy 'when' tempts a wrong connector.",
    "words": [
      { "id": "w1", "word": "Not until", "role": "CONJUNCTION", "position": 0, "isDistractor": false },
      { "id": "w2", "word": "the committee", "role": "SUBJECT", "position": 1, "isDistractor": false },
      { "id": "w3", "word": "reviewed", "role": "VERB", "position": 2, "isDistractor": false },
      { "id": "w4", "word": "every proposal", "role": "OBJECT", "position": 3, "isDistractor": false },
      { "id": "w5", "word": "did they", "role": "SUBJECT", "position": 4, "isDistractor": false },
      { "id": "w6", "word": "announce", "role": "VERB", "position": 5, "isDistractor": false },
      { "id": "w7", "word": "a decision", "role": "OBJECT", "position": 6, "isDistractor": false },
      { "id": "w8", "word": "when", "role": "CONJUNCTION", "position": 99, "isDistractor": true }
    ]
  }
]
`;