// 4 примера, ровно по одному на пересечение "тип задания × зона политики":
//
// 1. EMAIL,       guided (A2)  — текст проще, но структура письма идентична строгой зоне.
// 2. EMAIL,       strict (B2)  — тот же формат письма, лексика/тема сложнее.
// 3. DISCUSSION,  strict (B1)  — обязательные discussionPeerResponses (ровно как на экране теста).
// 4. DISCUSSION,  guided (A2+) — тот же формат обсуждения, упрощённые реплики "одноклассников".
//
// ВАЖНО: minWords/maxWords/timeLimitSec НЕ указаны намеренно. resolveWritingPolicy()
// в backend/src/constants/writing-constants.ts всегда подставляет свои цифры —
// GUIDED_WRITING_POLICY для guided-уровней, EMAIL_STRICT_POLICY/DISCUSSION_STRICT_POLICY
// для strict — авторские значения на самом промпте сейчас ни на что не влияют для этих
// двух типов. Не заполняйте их, чтобы не создавать ложное впечатление, что это настраивается.
//
// type: 'BUILD_A_SENTENCE' сюда никогда не идёт — эти задачи создаются только в Scramble.

export const WRITING_PROMPTS_EXAMPLES = [
  {
    _comment: '1) EMAIL — guided (A2): текст проще, структура письма как у взрослых',
    type: 'EMAIL',
    level: 'A2',
    topic: 'Making Plans',
    prompt:
      'You want to invite your friend Jamie to a weekend hiking trip. Write an email to Jamie. In your email:\n' +
      '- Explain where you want to go and when\n' +
      '- Say why you think Jamie would enjoy it\n' +
      '- Ask if Jamie can come',
  },
  {
    _comment: '2) EMAIL — strict (B2): тот же формат, сложнее тема и регистр',
    type: 'EMAIL',
    level: 'B2',
    topic: 'Workplace Communication',
    prompt:
      'You recently registered for a training session organized by your company, but a scheduling conflict prevented you from attending. Write an email to your manager. In your email:\n' +
      '- Explain what happened\n' +
      '- Apologize for the inconvenience\n' +
      '- Ask about rescheduling options',
  },
  {
    _comment: '3) ACADEMIC_DISCUSSION — strict (B1): обязательные 2 реплики "одноклассников"',
    type: 'ACADEMIC_DISCUSSION',
    level: 'B1',
    topic: 'Education',
    prompt:
      'Your professor is teaching a class on education policy. Write a post responding to the professor\'s question below.\n\n' +
      'Professor Rivera: "Some people believe that university students should be required to attend every class, while others think attendance should be optional as long as students pass their exams. What is your opinion, and why?"',
    discussionPeerResponses: [
      {
        authorName: 'Daniela',
        text: "I think attendance should be mandatory. When students skip class regularly, they miss discussions and explanations that aren't always in the textbook, and it usually shows in their exam results.",
      },
      {
        authorName: 'Marcus',
        text: "I disagree with Daniela. Some students learn better on their own, and forcing everyone to sit in a room doesn't guarantee they're actually paying attention. What matters is the final result, not how they got there.",
      },
    ],
  },
  {
    _comment: '4) ACADEMIC_DISCUSSION — guided (A2+): та же структура, упрощённые реплики',
    type: 'ACADEMIC_DISCUSSION',
    level: 'A2_PLUS',
    topic: 'Daily Life',
    prompt:
      'Your teacher asked a question in an online class discussion. Write a post responding to the question below.\n\n' +
      'Teacher: "Do you think it\'s better to study alone or study with friends? Why?"',
    discussionPeerResponses: [
      { authorName: 'Sofia', text: "I like studying with friends because we can ask each other questions and it's not boring." },
      { authorName: 'Leo', text: 'I prefer studying alone. I can focus better and go at my own speed.' },
    ],
  },
];