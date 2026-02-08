import { createI18n } from 'vue-i18n';
import { EnglishLocale } from './locales/en';
import { VietnameseLocale } from './locales/vi';

// TODO: Change locale opt
const getInitialLocale = (): string => {
  const browserLang = chrome.i18n.getUILanguage().split('-')[0]; 
  
  const supportedLangs = ['en', 'vi'];
  return supportedLangs.includes(browserLang) ? browserLang : 'en';
};

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: {
    en: EnglishLocale,
    vi: VietnameseLocale
  },
});