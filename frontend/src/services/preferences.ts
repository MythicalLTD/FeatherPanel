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

import axios from 'axios';

class PreferencesService {
    /**
     * Get user preferences from the backend
     */
    async getPreferences(): Promise<Record<string, string>> {
        try {
            const response = await axios.get('/api/user/preferences');
            if (response.data && response.data.success && response.data.data) {
                return response.data.data.preferences || {};
            }
            return {};
        } catch (error) {
            console.error('Failed to fetch user preferences:', error);
            return {};
        }
    }

    /**
     * Update user preferences on the backend (merges with existing)
     */
    async updatePreferences(preferences: Record<string, string>): Promise<boolean> {
        try {
            const response = await axios.patch('/api/user/preferences', preferences);
            return response.data && response.data.success;
        } catch (error) {
            console.error('Failed to update user preferences:', error);
            return false;
        }
    }

    /**
     * Get the entire localStorage as a plain object
     */
    getLocalStorage(): Record<string, string> {
        const storage: Record<string, string> = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    storage[key] = value;
                }
            }
        }

        return storage;
    }

    /**
     * Save the entire localStorage to the backend
     */
    async saveLocalStorage(): Promise<boolean> {
        const storage = this.getLocalStorage();
        return await this.updatePreferences(storage);
    }

    /**
     * Load preferences from backend and restore to localStorage
     */
    async loadAndRestoreLocalStorage(): Promise<boolean> {
        try {
            const preferences = await this.getPreferences();

            // Clear existing localStorage
            localStorage.clear();

            // Restore all preferences
            for (const [key, value] of Object.entries(preferences)) {
                localStorage.setItem(key, value);
            }

            // Apply any DOM updates that depend on localStorage
            this.applyLocalStorageEffects();

            return true;
        } catch (error) {
            console.error('Failed to load and restore localStorage:', error);
            return false;
        }
    }

    /**
     * Sync a single localStorage item to backend
     */
    async syncItem(key: string, value: string): Promise<boolean> {
        return await this.updatePreferences({ [key]: value });
    }

    /**
     * Apply localStorage effects to the DOM (theme, background, dock, etc.)
     */
    private applyLocalStorageEffects(): void {
        // Theme
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        }

        // Background
        const backgroundImage = localStorage.getItem('background_image');
        const backgroundOpacity = localStorage.getItem('background_opacity');
        const backgroundBlur = localStorage.getItem('background_blur');

        if (backgroundImage) {
            document.body.style.setProperty('--background-image', `url(${backgroundImage})`);
            document.body.classList.add('has-custom-background');
        }
        if (backgroundOpacity) {
            document.documentElement.style.setProperty('--background-opacity', `${parseInt(backgroundOpacity) / 100}`);
        }
        if (backgroundBlur) {
            document.documentElement.style.setProperty('--background-blur', `${backgroundBlur}px`);
        }

        // Dock
        const dockVisible = localStorage.getItem('dock-visible');
        const dockSize = localStorage.getItem('dock-size');
        const dockOpacity = localStorage.getItem('dock-opacity');

        if (dockVisible) {
            document.documentElement.style.setProperty('--dock-display', dockVisible === 'true' ? 'flex' : 'none');
        }
        if (dockSize) {
            document.documentElement.style.setProperty('--dock-item-size', `${dockSize}px`);
        }
        if (dockOpacity) {
            document.documentElement.style.setProperty('--dock-opacity', `${parseInt(dockOpacity) / 100}`);
        }

        // Dispatch custom events for context menu and other features
        const contextMenuEnabled = localStorage.getItem('custom-context-menu-enabled');
        if (contextMenuEnabled) {
            window.dispatchEvent(
                new CustomEvent('custom-context-menu-toggle', {
                    detail: { enabled: contextMenuEnabled === 'true' },
                }),
            );
        }

        const showNavigation = localStorage.getItem('context-menu-show-navigation');
        const showClipboard = localStorage.getItem('context-menu-show-clipboard');
        const showQuickActions = localStorage.getItem('context-menu-show-quick-actions');

        if (showNavigation || showClipboard || showQuickActions) {
            window.dispatchEvent(
                new CustomEvent('context-menu-options-change', {
                    detail: {
                        showNavigation: showNavigation === 'true',
                        showClipboard: showClipboard === 'true',
                        showQuickActions: showQuickActions === 'true',
                    },
                }),
            );
        }
    }

    /**
     * Clear all preferences (both localStorage and backend)
     */
    async clearAllPreferences(): Promise<boolean> {
        try {
            // Clear localStorage
            localStorage.clear();

            // Send empty object to backend to clear
            return await this.updatePreferences({});
        } catch (error) {
            console.error('Failed to clear preferences:', error);
            return false;
        }
    }
}

export const preferencesService = new PreferencesService();
