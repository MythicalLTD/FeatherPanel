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
import { preferencesService } from '@/lib/preferences';

const LOCALSTORAGE_LAST_MODIFIED_KEY = '__localStorage_lastModified';
const LAST_SYNC_TIME_KEY = '__lastSyncTime';

// Store original Storage methods to restore later
let originalSetItem: typeof Storage.prototype.setItem | null = null;
let originalRemoveItem: typeof Storage.prototype.removeItem | null = null;
let originalClear: typeof Storage.prototype.clear | null = null;
let isIntercepted = false;

export const usePreferencesStore = defineStore('preferences', () => {
    const isLoading = ref(false);
    const isSyncing = ref(false);
    const lastSyncTime = ref<number | null>(null);
    const autoSyncInterval = ref<number | null>(null);
    const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    let storageListener: ((e: StorageEvent) => void) | null = null;

    /**
     * Load lastSyncTime from localStorage
     */
    function loadLastSyncTime(): void {
        const stored = localStorage.getItem(LAST_SYNC_TIME_KEY);
        if (stored) {
            const timestamp = parseInt(stored, 10);
            if (!isNaN(timestamp)) {
                lastSyncTime.value = timestamp;
            }
        }
    }

    /**
     * Save lastSyncTime to localStorage
     */
    function saveLastSyncTime(timestamp: number): void {
        localStorage.setItem(LAST_SYNC_TIME_KEY, timestamp.toString());
        lastSyncTime.value = timestamp;
    }

    /**
     * Track localStorage modifications by updating a timestamp
     */
    function trackLocalStorageModification(): void {
        try {
            localStorage.setItem(LOCALSTORAGE_LAST_MODIFIED_KEY, Date.now().toString());
        } catch (error) {
            console.error('Failed to track localStorage modification:', error);
        }
    }

    /**
     * Get the last time localStorage was modified locally
     */
    function getLastLocalModification(): number | null {
        const timestamp = localStorage.getItem(LOCALSTORAGE_LAST_MODIFIED_KEY);
        return timestamp ? parseInt(timestamp, 10) : null;
    }

    /**
     * Check if localStorage has unsaved changes
     */
    function hasUnsavedChanges(): boolean {
        // Load lastSyncTime from localStorage if not already loaded
        if (lastSyncTime.value === null) {
            loadLastSyncTime();
        }

        const lastModified = getLastLocalModification();
        if (!lastModified) return false;
        if (!lastSyncTime.value) return true; // Never synced, so has changes
        return lastModified > lastSyncTime.value;
    }

    /**
     * Set up storage event listener to track localStorage changes
     */
    function setupStorageListener(): void {
        // Only set up once
        if (isIntercepted) return;

        // Listen for storage events (from other tabs/windows)
        storageListener = (e: StorageEvent) => {
            if (e.key && e.key !== LOCALSTORAGE_LAST_MODIFIED_KEY) {
                trackLocalStorageModification();
            }
        };
        window.addEventListener('storage', storageListener);

        // Store original methods if not already stored
        if (!originalSetItem) {
            originalSetItem = Storage.prototype.setItem;
            originalRemoveItem = Storage.prototype.removeItem;
            originalClear = Storage.prototype.clear;
        }

        // Intercept localStorage.setItem to track local changes
        Storage.prototype.setItem = function (key: string, value: string) {
            if (originalSetItem) {
                originalSetItem.call(this, key, value);
            }
            if (key !== LOCALSTORAGE_LAST_MODIFIED_KEY) {
                trackLocalStorageModification();
            }
        };

        // Intercept localStorage.removeItem
        Storage.prototype.removeItem = function (key: string) {
            if (originalRemoveItem) {
                originalRemoveItem.call(this, key);
            }
            if (key !== LOCALSTORAGE_LAST_MODIFIED_KEY) {
                trackLocalStorageModification();
            }
        };

        // Intercept localStorage.clear
        Storage.prototype.clear = function () {
            if (originalClear) {
                originalClear.call(this);
            }
            trackLocalStorageModification();
        };

        isIntercepted = true;
    }

    /**
     * Clean up storage listener and restore original methods
     */
    function cleanupStorageListener(): void {
        if (storageListener) {
            window.removeEventListener('storage', storageListener);
            storageListener = null;
        }

        // Restore original Storage methods
        if (isIntercepted && originalSetItem && originalRemoveItem && originalClear) {
            Storage.prototype.setItem = originalSetItem;
            Storage.prototype.removeItem = originalRemoveItem;
            Storage.prototype.clear = originalClear;
            isIntercepted = false;
        }
    }

    /**
     * Load preferences from backend and restore to localStorage
     * Will save unsaved changes first if they exist
     */
    async function loadPreferences(): Promise<boolean> {
        isLoading.value = true;
        try {
            // Check if there are unsaved changes
            if (hasUnsavedChanges()) {
                console.log('[Preferences] Unsaved changes detected, saving before load...');
                // Save current localStorage to backend first
                const saveSuccess = await preferencesService.saveLocalStorage();
                if (saveSuccess) {
                    const now = Date.now();
                    saveLastSyncTime(now);
                    // Update the last modified timestamp to match sync time
                    localStorage.setItem(LOCALSTORAGE_LAST_MODIFIED_KEY, now.toString());
                } else {
                    console.warn('[Preferences] Failed to save unsaved changes before load');
                }
            }

            // Now load from backend
            const success = await preferencesService.loadAndRestoreLocalStorage();
            if (success) {
                const now = Date.now();
                saveLastSyncTime(now);
                // Update the last modified timestamp to match sync time
                localStorage.setItem(LOCALSTORAGE_LAST_MODIFIED_KEY, now.toString());
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
                const now = Date.now();
                saveLastSyncTime(now);
                // Update the last modified timestamp to match sync time
                localStorage.setItem(LOCALSTORAGE_LAST_MODIFIED_KEY, now.toString());
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
                const now = Date.now();
                saveLastSyncTime(now);
                // Update the last modified timestamp to match sync time
                localStorage.setItem(LOCALSTORAGE_LAST_MODIFIED_KEY, now.toString());
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
                // Clear tracking keys
                localStorage.removeItem(LAST_SYNC_TIME_KEY);
                localStorage.removeItem(LOCALSTORAGE_LAST_MODIFIED_KEY);
            }
            return success;
        } catch (error) {
            console.error('Failed to clear preferences:', error);
            return false;
        } finally {
            isSyncing.value = false;
        }
    }

    /**
     * Initialize the store (set up storage listeners and load lastSyncTime)
     */
    function initialize(): void {
        loadLastSyncTime();
        setupStorageListener();
    }

    /**
     * Cleanup when store is destroyed
     */
    function cleanup(): void {
        cleanupStorageListener();
        stopAutoSync();
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
        hasUnsavedChanges,
        initialize,
        cleanup,
    };
});
