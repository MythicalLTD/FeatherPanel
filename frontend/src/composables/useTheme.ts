/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

import { ref, onMounted, readonly } from 'vue';

// Global theme state
const isDark = ref(false);

export function useTheme() {
    // Initialize theme on first load
    const initializeTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Use saved theme or system preference, default to dark
        isDark.value = savedTheme ? savedTheme === 'dark' : prefersDark;

        // Apply theme to document
        applyTheme(isDark.value);
    };

    // Apply theme to document
    const applyTheme = (dark: boolean) => {
        if (dark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
            document.body.classList.add('dark');
            document.body.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
            document.body.classList.add('light');
            document.body.classList.remove('dark');
        }
    };

    // Toggle theme
    const toggleTheme = () => {
        isDark.value = !isDark.value;
        applyTheme(isDark.value);
        localStorage.setItem('theme', isDark.value ? 'dark' : 'light');

        // Dispatch custom event for other components to listen to
        window.dispatchEvent(
            new CustomEvent('theme-changed', {
                detail: { theme: isDark.value ? 'dark' : 'light' },
            }),
        );
    };

    // Set specific theme
    const setTheme = (dark: boolean) => {
        isDark.value = dark;
        applyTheme(dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');

        // Dispatch custom event
        window.dispatchEvent(
            new CustomEvent('theme-changed', {
                detail: { theme: dark ? 'dark' : 'light' },
            }),
        );
    };

    // Listen for system theme changes
    const setupSystemThemeListener = () => {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                // Only auto-update if no manual preference
                isDark.value = e.matches;
                applyTheme(e.matches);
            }
        });
    };

    // Initialize on mount
    onMounted(() => {
        initializeTheme();
        setupSystemThemeListener();
    });

    return {
        isDark: readonly(isDark),
        toggleTheme,
        setTheme,
        applyTheme,
    };
}
