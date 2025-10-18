/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

export interface Language {
    code: string;
    name: string;
    flag: string;
}

export const availableLanguages: Language[] = [{ code: 'en', name: 'English', flag: '🇺🇸' }];

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
            const fallbackLanguage = availableLanguages[0];
            if (fallbackLanguage) {
                currentLanguage.value = fallbackLanguage;
                locale.value = 'EN';
            }
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
