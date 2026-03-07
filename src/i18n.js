import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ne from './locales/ne.json';

const LANG_KEY = 'app_language';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ne: { translation: ne },
  },
  lng: localStorage.getItem(LANG_KEY) || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANG_KEY, lng);
});

export default i18n;
