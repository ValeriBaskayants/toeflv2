export const LISTENING_EXAMPLES =[
    {
      title: 'A Typical Day',
      topic: 'Daily Routines',
      level: 'A1',
      type: 'CONVERSATION',
      fullText: 'Good morning! My name is Anna. Every day I wake up at seven o\'clock. I always eat breakfast before I go to work. I usually have bread and coffee. I start work at nine. I finish at five. In the evening I watch TV or read a book.',
      segments: [
        { index: 0, text: 'Good morning! My name is Anna.', startSec: 0, endSec: 2.5, speaker: 'Anna' },
        { index: 1, text: 'Every day I wake up at seven o\'clock.', startSec: 2.5, endSec: 5.5, speaker: 'Anna' },
        { index: 2, text: 'I always eat breakfast before I go to work.', startSec: 5.5, endSec: 9.0, speaker: 'Anna' },
        { index: 3, text: 'I usually have bread and coffee.', startSec: 9.0, endSec: 11.5, speaker: 'Anna' },
      ],
      speakerRate: 0.65,
      speakerLang: 'en-US',
      speakerPitch: 1.0,
      allowedModes: ['EASY', 'MEDIUM', 'HARD'],
      grammarTopics: ['present-simple', 'adverbs-of-frequency'],
      questions: [
        {
          question: 'What time does Anna wake up?',
          options: ['At six o\'clock', 'At seven o\'clock', 'At eight o\'clock', 'At nine o\'clock'],
          correctIndex: 1,
          explanation: 'Anna says she wakes up at seven o\'clock every day.',
          referenceStartSec: 2.5,
          referenceEndSec: 5.5,
        },
        {
          question: 'What does Anna usually have for breakfast?',
          options: ['Eggs and juice', 'Cereal and milk', 'Bread and coffee', 'Toast and tea'],
          correctIndex: 2,
          explanation: 'Anna says she usually has bread and coffee.',
          referenceStartSec: 9.0,
          referenceEndSec: 11.5,
        },
      ],
    },
    {
      title: 'The History of Coffee',
      topic: 'History & Culture',
      level: 'B2',
      type: 'LECTURE',
      fullText: 'Coffee was first discovered in Ethiopia over a thousand years ago. According to legend, a goat herder named Kaldi noticed his goats became energetic after eating certain berries. From there, coffee cultivation spread to the Arabian Peninsula, and eventually across the entire world.',
      segments: [
        
        
        { index: 0, text: 'Coffee was first discovered in Ethiopia over a thousand years ago.', startSec: 0, endSec: 4.2 },
        { index: 1, text: 'According to legend, a goat herder named Kaldi noticed his goats became energetic after eating certain berries.', startSec: 4.2, endSec: 10.8 },
        { index: 2, text: 'From there, coffee cultivation spread to the Arabian Peninsula, and eventually across the entire world.', startSec: 10.8, endSec: 16.5 },
      ],
      speakerRate: 1.05,
      speakerLang: 'en-US',
      speakerPitch: 0.95,
      
      
      allowedModes: ['MEDIUM', 'HARD'],
      
      isAvailableForPlacement: true,
      difficultyRating: 1.4,
      discriminationRating: 1.1,
      questions: [
        {
          question: 'Where was coffee first discovered, according to the lecture?',
          options: ['Brazil', 'Ethiopia', 'Colombia', 'Yemen'],
          correctIndex: 1,
          
        },
        {
          question: 'Who first noticed the effect of coffee berries?',
          options: ['A merchant', 'A monk', 'A goat herder', 'A king'],
          correctIndex: 2,
          explanation: 'The lecture mentions a goat herder named Kaldi.',
          
        },
      ],
    },
    {
      title: 'Booking a Table at a Restaurant',
      topic: 'Everyday Situations',
      level: 'A2_PLUS',
      type: 'CONVERSATION',
      fullText: 'Hostess: Good evening, do you have a reservation? Customer: No, we don\'t. Is there a table available for two? Hostess: Let me check... Yes, we have one by the window. Customer: Perfect, thank you.',
      segments: [
        { index: 0, text: 'Good evening, do you have a reservation?', startSec: 0, endSec: 2.8, speaker: 'Hostess' },
        { index: 1, text: 'No, we don\'t. Is there a table available for two?', startSec: 2.8, endSec: 6.0, speaker: 'Customer' },
        { index: 2, text: 'Let me check... Yes, we have one by the window.', startSec: 6.0, endSec: 9.5, speaker: 'Hostess' },
        { index: 3, text: 'Perfect, thank you.', startSec: 9.5, endSec: 11.0, speaker: 'Customer' },
      ],
      speakerRate: 0.85,
      
      speakerLang: 'en-GB',
      speakerPitch: 1.05,
      
      allowedModes: ['EASY'],
      grammarTopics: ['there-is-there-are', 'polite-requests'],
      questions: [
        {
          question: 'Did the customers have a reservation?',
          options: ['Yes', 'No', 'They forgot', 'Not mentioned'],
          correctIndex: 1,
          
        },
      ],
    },
    {
      title: 'City Traffic Announcement',
      topic: 'Public Announcements',
      level: 'B1',
      type: 'LECTURE',
      fullText: 'Attention passengers. Due to roadworks on Main Street, bus route 12 will be diverted via Park Avenue until further notice. We apologize for any inconvenience.',
      segments: [
        { index: 0, text: 'Attention passengers.', startSec: 0, endSec: 1.2 },
        { index: 1, text: 'Due to roadworks on Main Street, bus route 12 will be diverted via Park Avenue until further notice.', startSec: 1.2, endSec: 6.5 },
        { index: 2, text: 'We apologize for any inconvenience.', startSec: 6.5, endSec: 8.3 },
      ],
      speakerRate: 0.95,
      speakerLang: 'en-US',
      speakerPitch: 1.0,
      allowedModes: ['EASY', 'MEDIUM'],
      
      
    },
  ]