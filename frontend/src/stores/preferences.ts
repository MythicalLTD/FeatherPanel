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

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { preferencesService } from '@/services/preferences';

export const usePreferencesStore = defineStore('preferences', () => {
    const isLoading = ref(false);
    const isSyncing = ref(false);
    const lastSyncTime = ref<number | null>(null);
    const autoSyncInterval = ref<number | null>(null);
    const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Load preferences from backend and restore to localStorage
     */
    async function loadPreferences(): Promise<boolean> {
        isLoading.value = true;
        try {
            const success = await preferencesService.loadAndRestoreLocalStorage();
            if (success) {
                lastSyncTime.value = Date.now();
            }
            return success;
        } catch (error) {
            console.error('Failed to load preferences:', error);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Save entire localStorage to backend
     */
    async function savePreferences(): Promise<boolean> {
        isSyncing.value = true;
        try {
            const success = await preferencesService.saveLocalStorage();
            if (success) {
                lastSyncTime.value = Date.now();
            }
            return success;
        } catch (error) {
            console.error('Failed to save preferences:', error);
            return false;
        } finally {
            isSyncing.value = false;
        }
    }

    /**
     * Start auto-sync interval (syncs entire localStorage every 5 minutes)
     */
    function startAutoSync(): void {
        // Clear any existing interval
        stopAutoSync();

        // Start new interval
        autoSyncInterval.value = window.setInterval(async () => {
            console.log('[Preferences] Auto-syncing localStorage to backend...');
            await savePreferences();
        }, AUTO_SYNC_INTERVAL_MS);

        console.log('[Preferences] Auto-sync enabled (every 5 minutes)');
    }

    /**
     * Stop auto-sync interval
     */
    function stopAutoSync(): void {
        if (autoSyncInterval.value !== null) {
            window.clearInterval(autoSyncInterval.value);
            autoSyncInterval.value = null;
            console.log('[Preferences] Auto-sync disabled');
        }
    }

    /**
     * Manually trigger a sync of entire localStorage
     */
    async function syncNow(): Promise<boolean> {
        console.log('[Preferences] Manual sync triggered');
        return await savePreferences();
    }

    /**
     * Check if localStorage has any data
     */
    function hasLocalStorage(): boolean {
        return localStorage.length > 0;
    }

    /**
     * Migrate localStorage to backend (for first-time users after login)
     */
    async function migrateLocalStorage(): Promise<boolean> {
        isSyncing.value = true;
        try {
            // Save current localStorage to backend
            const success = await preferencesService.saveLocalStorage();
            if (success) {
                lastSyncTime.value = Date.now();
            }
            return success;
        } catch (error) {
            console.error('Failed to migrate localStorage:', error);
            return false;
        } finally {
            isSyncing.value = false;
        }
    }

    /**
     * Clear all preferences
     */
    async function clearPreferences(): Promise<boolean> {
        isSyncing.value = true;
        try {
            const success = await preferencesService.clearAllPreferences();
            if (success) {
                lastSyncTime.value = null;
            }
            return success;
        } catch (error) {
            console.error('Failed to clear preferences:', error);
            return false;
        } finally {
            isSyncing.value = false;
        }
    }

    return {
        isLoading,
        isSyncing,
        lastSyncTime,
        loadPreferences,
        savePreferences,
        startAutoSync,
        stopAutoSync,
        syncNow,
        hasLocalStorage,
        migrateLocalStorage,
        clearPreferences,
    };
});
