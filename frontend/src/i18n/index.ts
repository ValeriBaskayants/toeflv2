import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      auth: {
        login: 'Sign in with Google', register: 'Create Account', email: 'Email',
        password: 'Password', logout: 'Sign out', welcome: 'Welcome back',
        noAccount: "Don't have an account?", hasAccount: 'Already have an account?',
        signUpFree: 'Sign up free',
      },
    },
  },
  ru: {
    translation: {
      auth: {
        login: 'Войти с Google', register: 'Создать аккаунт', email: 'Электронная почта',
        password: 'Пароль', logout: 'Выйти', welcome: 'С возвращением',
        noAccount: 'Нет аккаунта?', hasAccount: 'Уже есть аккаунт?',
        signUpFree: 'Зарегистрироваться',
      },
    },
  },
  hy: {
    translation: {
      auth: {
        login: 'Մուտք գործել Google-ով', register: 'Գրանցվել', email: 'Էլ. փոստ',
        password: 'Գաղտնաբառ', logout: 'Ելք', welcome: 'Բարի վերադարձ',
        noAccount: 'Հաշիվ չկա՞', hasAccount: 'Արդեն հաշիվ կա՞',
        signUpFree: 'Գրանցվել անվճար',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('toefl_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => localStorage.setItem('toefl_lang', lng));

export default i18n;
