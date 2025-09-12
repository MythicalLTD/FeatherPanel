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
