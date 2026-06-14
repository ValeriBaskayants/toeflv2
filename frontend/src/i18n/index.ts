import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './locales/en';
import { ru } from './locales/ru';
import { hy } from './locales/hy';

const STORAGE_KEY = 'toefl_lang';
const SUPPORTED_LANGS = ['en', 'ru', 'hy'] as const;
type SupportedLang = typeof SUPPORTED_LANGS[number];

function getSavedLang(): SupportedLang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null && (SUPPORTED_LANGS as readonly string[]).includes(saved)) {
    return saved as SupportedLang;
  }
  return 'en';
}

void i18n
  .use(initReactI18next)
  .init({
    resources: { en, ru, hy },
    lng:         getSavedLang(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
  .catch((err: unknown) => {
    console.error('[i18n] init failed:', err);
  });

i18n.on('languageChanged', (lng: string) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
