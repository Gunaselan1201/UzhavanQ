import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ta from './locales/ta.json'

const storedLanguage = sessionStorage.getItem('farmerLanguage')

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ta: { translation: ta },
        },
        lng: storedLanguage || 'ta',
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
    })

i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng
})
document.documentElement.lang = i18n.language

export default i18n
