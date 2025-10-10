/*
MIT License

Copyright (c) 2025 MythicalSystems
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

export function useBackground() {
    const currentBackground = ref('');
    const backgroundOpacity = ref(20);
    const backgroundBlur = ref(0);

    // Load background settings from localStorage
    const loadBackgroundSettings = () => {
        // Background image
        const savedBackground = localStorage.getItem('background_image');
        if (savedBackground) {
            currentBackground.value = savedBackground;
            applyBackground(savedBackground);
        }

        // Background opacity
        const savedOpacity = localStorage.getItem('background_opacity');
        if (savedOpacity) {
            backgroundOpacity.value = parseInt(savedOpacity);
            updateBackgroundOpacity();
        }

        // Background blur
        const savedBlur = localStorage.getItem('background_blur');
        if (savedBlur) {
            backgroundBlur.value = parseInt(savedBlur);
            updateBackgroundBlur();
        }
    };

    // Apply background to document
    const applyBackground = (url: string) => {
        const body = document.body;
        if (url) {
            body.style.setProperty('--background-image', `url(${url})`);
            body.classList.add('has-custom-background');
        } else {
            body.style.removeProperty('--background-image');
            body.classList.remove('has-custom-background');
        }
    };

    // Update background opacity
    const updateBackgroundOpacity = () => {
        document.documentElement.style.setProperty('--background-opacity', `${backgroundOpacity.value / 100}`);
        localStorage.setItem('background_opacity', backgroundOpacity.value.toString());
    };

    // Update background blur
    const updateBackgroundBlur = () => {
        document.documentElement.style.setProperty('--background-blur', `${backgroundBlur.value}px`);
        localStorage.setItem('background_blur', backgroundBlur.value.toString());
    };

    // Set background image
    const setBackground = (url: string) => {
        currentBackground.value = url;
        if (url) {
            localStorage.setItem('background_image', url);
        } else {
            localStorage.removeItem('background_image');
        }
        applyBackground(url);
    };

    // Set background opacity
    const setBackgroundOpacity = (opacity: number) => {
        backgroundOpacity.value = opacity;
        updateBackgroundOpacity();
    };

    // Set background blur
    const setBackgroundBlur = (blur: number) => {
        backgroundBlur.value = blur;
        updateBackgroundBlur();
    };

    // Reset background settings
    const resetBackground = () => {
        currentBackground.value = '';
        backgroundOpacity.value = 20;
        backgroundBlur.value = 0;
        localStorage.removeItem('background_image');
        localStorage.setItem('background_opacity', '20');
        localStorage.setItem('background_blur', '0');
        applyBackground('');
        updateBackgroundOpacity();
        updateBackgroundBlur();
    };

    // Initialize on mount
    onMounted(() => {
        loadBackgroundSettings();
    });

    return {
        currentBackground,
        backgroundOpacity,
        backgroundBlur,
        loadBackgroundSettings,
        applyBackground,
        updateBackgroundOpacity,
        updateBackgroundBlur,
        setBackground,
        setBackgroundOpacity,
        setBackgroundBlur,
        resetBackground,
    };
}
