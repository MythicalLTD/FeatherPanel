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

import { ref, onMounted, onUnmounted } from 'vue';

export interface RefreshWarningOptions {
    showDialog: boolean;
    dontAskAgain: boolean;
}

export function useRefreshWarning() {
    const showRefreshDialog = ref(false);
    const refreshWarningEnabled = ref(true);
    const dontAskAgain = ref(false);

    // Initialize settings from localStorage
    const initializeSettings = () => {
        const savedSettings = localStorage.getItem('refresh-warning-settings');
        if (savedSettings) {
            try {
                const settings: RefreshWarningOptions = JSON.parse(savedSettings);
                refreshWarningEnabled.value = !settings.dontAskAgain;
                dontAskAgain.value = settings.dontAskAgain;
            } catch (error) {
                console.warn('Failed to parse refresh warning settings:', error);
            }
        }
    };

    // Save settings to localStorage
    const saveSettings = (options: RefreshWarningOptions) => {
        try {
            localStorage.setItem('refresh-warning-settings', JSON.stringify(options));
            dontAskAgain.value = options.dontAskAgain;
            refreshWarningEnabled.value = !options.dontAskAgain;
        } catch (error) {
            console.warn('Failed to save refresh warning settings:', error);
        }
    };

    // Handle keyboard refresh attempts
    const handleKeyboardRefresh = (event: KeyboardEvent) => {
        // Check if warning is disabled
        if (!refreshWarningEnabled.value) {
            return;
        }

        const isCtrlR = (event.ctrlKey || event.metaKey) && event.key === 'r';
        const isF5 = event.key === 'F5';

        if (isCtrlR || isF5) {
            console.log('Refresh warning triggered by keyboard shortcut');
            event.preventDefault();
            showRefreshDialog.value = true;
            return false;
        }
    };

    // Handle beforeunload events (browser refresh button, navigation)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        // Check if warning is disabled
        if (!refreshWarningEnabled.value) {
            return;
        }

        // Show browser's native confirmation dialog
        event.preventDefault();
        return 'Are you sure you want to refresh? This is a live application and refreshing may not be necessary.';
    };

    // Handle refresh confirmation
    const confirmRefresh = () => {
        showRefreshDialog.value = false;
        window.location.reload();
    };

    // Handle refresh with "don't ask again"
    const confirmRefreshAndDontAsk = () => {
        saveSettings({ showDialog: false, dontAskAgain: true });
        showRefreshDialog.value = false;
        window.location.reload();
    };

    // Handle cancel refresh
    const cancelRefresh = () => {
        showRefreshDialog.value = false;
    };

    // Reset settings (for testing or user preference changes)
    const resetSettings = () => {
        localStorage.removeItem('refresh-warning-settings');
        refreshWarningEnabled.value = true;
        dontAskAgain.value = false;
    };

    // Setup event listeners
    const setupEventListeners = () => {
        // Keyboard events
        document.addEventListener('keydown', handleKeyboardRefresh);

        // Before unload events (browser refresh, navigation)
        window.addEventListener('beforeunload', handleBeforeUnload);
    };

    // Cleanup event listeners
    const cleanupEventListeners = () => {
        document.removeEventListener('keydown', handleKeyboardRefresh);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };

    // Initialize on mount
    onMounted(() => {
        initializeSettings();
        setupEventListeners();
    });

    // Cleanup on unmount
    onUnmounted(() => {
        cleanupEventListeners();
    });

    return {
        showRefreshDialog,
        refreshWarningEnabled,
        dontAskAgain,
        confirmRefresh,
        confirmRefreshAndDontAsk,
        cancelRefresh,
        resetSettings,
        saveSettings,
    };
}
