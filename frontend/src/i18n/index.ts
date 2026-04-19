import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      auth: {
        signIn: 'Continue with Google',
        signOut: 'Sign out',
        welcome: 'Welcome back',
        tagline: 'Master TOEFL with adaptive AI learning',
        brandDesc:
          'Adaptive exercises, spaced repetition, and real-time feedback tailored to your level.',
        cardSubtitle: 'Sign in to track your progress and start practising.',
        freeBadge: 'Free · No credit card',
        disclaimer:
          'By continuing you agree to our Terms of Service and Privacy Policy.',
        sessionRestored: 'Restoring your session…',
        redirecting: 'Signing you in…',
        statLevels: 'Levels',
        statSkills: 'Skills',
        statRange: 'CEFR Range',
      },
      navigation: {
        overview: 'Overview',
        dashboard: 'Dashboard',
        practiceTitle: 'Practice',
        writing: 'Writing',
        reading: 'Reading',
        listening: 'Listening',
        speaking: 'Speaking',
        grammar: 'Grammar',
        vocabulary: 'Vocabulary',
        analyticsTitle: 'Analytics',
        progress: 'Progress',
      },
      dashboard: {
        morning: 'Good morning',
        afternoon: 'Good afternoon',
        evening: 'Good evening',
        subtitle: 'Your TOEFL journey continues.',
        admin: 'Admin',
        statLevel: 'Current level',
        statStreak: 'Day streak',
        statGoal: 'Weekly goal',
        weeklyGoal: 'Weekly activity',
        days: 'days',
        practiceAreas: 'Practice areas',
        comingSoon: 'Coming soon',
        features: {
          writing: 'Writing',
          reading: 'Reading',
          listening: 'Listening',
          speaking: 'Speaking',
          grammar: 'Grammar',
          vocabulary: 'Vocabulary',
        },
      },
      settings: {
        darkMode: 'Dark mode',
        lightMode: 'Light mode',
      },
      features: {
        spaced: 'Spaced repetition flashcards',
        ai: 'AI writing & grammar feedback',
        levels: '10 proficiency levels (A1 → C2)',
        progress: 'Detailed progress analytics',
        multilingual: 'EN / RU / HY interface',
      },
    },
  },

  ru: {
    translation: {
      auth: {
        signIn: 'Войти через Google',
        signOut: 'Выйти',
        welcome: 'С возвращением',
        tagline: 'Подготовка к TOEFL с адаптивным ИИ',
        brandDesc:
          'Адаптивные задания, интервальное повторение и обратная связь в реальном времени.',
        cardSubtitle: 'Войдите, чтобы отслеживать прогресс и начать практику.',
        freeBadge: 'Бесплатно · Без карты',
        disclaimer:
          'Продолжая, вы соглашаетесь с Условиями использования и Политикой конфиденциальности.',
        sessionRestored: 'Восстанавливаем сессию…',
        redirecting: 'Выполняется вход…',
        statLevels: 'Уровней',
        statSkills: 'Навыков',
        statRange: 'Диапазон CEFR',
      },
      navigation: {
        overview: 'Обзор',
        dashboard: 'Главная',
        practiceTitle: 'Практика',
        writing: 'Письмо',
        reading: 'Чтение',
        listening: 'Аудирование',
        speaking: 'Говорение',
        grammar: 'Грамматика',
        vocabulary: 'Словарный запас',
        analyticsTitle: 'Аналитика',
        progress: 'Прогресс',
      },
      dashboard: {
        morning: 'Доброе утро',
        afternoon: 'Добрый день',
        evening: 'Добрый вечер',
        subtitle: 'Ваш путь к TOEFL продолжается.',
        admin: 'Администратор',
        statLevel: 'Текущий уровень',
        statStreak: 'Дней подряд',
        statGoal: 'Цель недели',
        weeklyGoal: 'Активность за неделю',
        days: 'дней',
        practiceAreas: 'Разделы практики',
        comingSoon: 'Скоро',
        features: {
          writing: 'Письмо',
          reading: 'Чтение',
          listening: 'Аудирование',
          speaking: 'Говорение',
          grammar: 'Грамматика',
          vocabulary: 'Словарный запас',
        },
      },
      settings: {
        darkMode: 'Тёмная тема',
        lightMode: 'Светлая тема',
      },
      features: {
        spaced: 'Карточки с интервальным повторением',
        ai: 'ИИ-проверка письма и грамматики',
        levels: '10 уровней владения (A1 → C2)',
        progress: 'Подробная аналитика прогресса',
        multilingual: 'Интерфейс EN / RU / HY',
      },
    },
  },

  hy: {
    translation: {
      auth: {
        signIn: 'Մուտք Google-ով',
        signOut: 'Ելք',
        welcome: 'Բարի վերադարձ',
        tagline: 'TOEFL-ի նախապատրաստում ադապտիվ ԱԲ-ով',
        brandDesc:
          'Հարմարվողական վարժություններ, ինտերվալային կրկնություն և անմիջական հետադարձ կապ։',
        cardSubtitle: 'Մուտք գործեք, որպեսզի հետևեք ձեր առաջընթացին։',
        freeBadge: 'Անվճար · Առանց քարտի',
        disclaimer: 'Շարունակելով՝ դուք համաձայն եք Ծառայության պայմաններին։',
        sessionRestored: 'Վերականգնվում է նիստը…',
        redirecting: 'Մուտք գործում…',
        statLevels: 'Մակարդակ',
        statSkills: 'Հմտություն',
        statRange: 'CEFR Շրջանակ',
      },
      navigation: {
        overview: 'Ակնարկ',
        dashboard: 'Գլխավոր',
        practiceTitle: 'Պրակտիկա',
        writing: 'Գրություն',
        reading: 'Ընթերցում',
        listening: 'Լսողություն',
        speaking: 'Խոսք',
        grammar: 'Քերականություն',
        vocabulary: 'Բառապաշար',
        analyticsTitle: 'Վերլուծություն',
        progress: 'Առաջընթաց',
      },
      dashboard: {
        morning: 'Բարի լույս',
        afternoon: 'Բարի օր',
        evening: 'Բարի երեկո',
        subtitle: 'Ձեր TOEFL-ի ճանապարհը շարունակվում է։',
        admin: 'Ադմին',
        statLevel: 'Ընթացիկ մակարդակ',
        statStreak: 'Անընդմեջ օր',
        statGoal: 'Շաբաթական նպատակ',
        weeklyGoal: 'Շաբաթական ակտիվություն',
        days: 'օր',
        practiceAreas: 'Պրակտիկայի բաժիններ',
        comingSoon: 'Շուտով',
        features: {
          writing: 'Գրություն',
          reading: 'Ընթերցում',
          listening: 'Լսողություն',
          speaking: 'Խոսք',
          grammar: 'Քերականություն',
          vocabulary: 'Բառապաշար',
        },
      },
      settings: {
        darkMode: 'Մուգ ռեժիմ',
        lightMode: 'Լույս ռեժիմ',
      },
      features: {
        spaced: 'Ինտերվալային կրկնության քարտեր',
        ai: 'ԱԲ գրավոր ստուգում',
        levels: '10 մակարդակ (A1 → C2)',
        progress: 'Մանրամասն վերլուծություն',
        multilingual: 'EN / RU / HY ինտերֆեյս',
      },
    },
  },
};

const savedLang = localStorage.getItem('toefl_lang') ?? 'en';

// void: in-memory resources init never rejects in practice,
// but we still catch to satisfy no-floating-promises
void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
  .catch((err: unknown) => {
    console.error('[i18n] init failed:', err);
  });

// Persist language choice across sessions (non-sensitive data — localStorage is fine)
i18n.on('languageChanged', (lng: string) => {
  localStorage.setItem('toefl_lang', lng);
});

export default i18n;