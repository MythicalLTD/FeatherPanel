import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

export interface Language {
    code: string;
    name: string;
    flag: string;
}

export const availableLanguages: Language[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
];

export function useLanguage() {
    const { locale } = useI18n();
    const currentLanguage = ref<Language | null>(null);

    // Find language by code
    const findLanguageByCode = (code: string): Language | null => {
        return availableLanguages.find((lang) => lang.code === code) || null;
    };

    // Load current language
    const loadCurrentLanguage = () => {
        const savedLanguage = localStorage.getItem('locale') || 'en';
        const language = findLanguageByCode(savedLanguage);
        if (language) {
            currentLanguage.value = language;
            locale.value = language.code.toUpperCase();
        } else {
            // Fallback to English
            currentLanguage.value = availableLanguages[0];
            locale.value = 'EN';
        }
    };

    // Change language
    const changeLanguage = async (language: Language) => {
        try {
            // Update locale
            locale.value = language.code.toUpperCase();

            // Update current language
            currentLanguage.value = language;

            // Save to localStorage
            localStorage.setItem('locale', language.code);

            // Reload page to apply new language
            window.location.reload();
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    };

    // Initialize on mount
    onMounted(() => {
        loadCurrentLanguage();
    });

    return {
        currentLanguage,
        availableLanguages,
        changeLanguage,
        findLanguageByCode,
    };
}
