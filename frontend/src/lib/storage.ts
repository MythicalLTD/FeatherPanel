/**
 * Comprehensive storage cleanup utilities
 * Handles all types of browser storage and data
 */

/**
 * Clears all localStorage items
 */
export const clearLocalStorage = (): void => {
    try {
        localStorage.clear();
    } catch (error) {
        console.error('Error clearing localStorage:', error);
    }
};

/**
 * Clears all sessionStorage items
 */
export const clearSessionStorage = (): void => {
    try {
        sessionStorage.clear();
    } catch (error) {
        console.error('Error clearing sessionStorage:', error);
    }
};

/**
 * Clears all cookies
 */
export const clearCookies = (): void => {
    try {
        const cookies = document.cookie.split(';');
        cookies.forEach((cookie) => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name) {
                // Clear cookie for all possible paths and domains
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
            }
        });
    } catch (error) {
        console.error('Error clearing cookies:', error);
    }
};

/**
 * Clears IndexedDB databases
 */
export const clearIndexedDB = async (): Promise<void> => {
    try {
        if (window.indexedDB) {
            const databases = await indexedDB.databases();
            for (const db of databases) {
                if (db.name) {
                    await indexedDB.deleteDatabase(db.name);
                }
            }
        }
    } catch (error) {
        console.error('Error clearing IndexedDB:', error);
    }
};

/**
 * Clears service worker registrations
 */
export const clearServiceWorkers = async (): Promise<void> => {
    try {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }
    } catch (error) {
        console.error('Error clearing service workers:', error);
    }
};

/**
 * Clears cache storage
 */
export const clearCacheStorage = async (): Promise<void> => {
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
        }
    } catch (error) {
        console.error('Error clearing cache storage:', error);
    }
};

/**
 * Clears all browser storage and data
 * This is the main function to call for complete cleanup
 */
export const clearAllStorage = async (): Promise<void> => {
    // Clear all storage types
    clearLocalStorage();
    clearSessionStorage();
    clearCookies();

    // Clear async storage types
    await Promise.all([clearIndexedDB(), clearServiceWorkers(), clearCacheStorage()]);

    // Clear any other potential storage
    try {
        // Clear any remaining auth-related items
        const authKeys = [
            'auth_token',
            'refresh_token',
            'user',
            'token',
            'auth',
            'session',
            'featherpanel_token',
            'featherpanel_user',
            'featherpanel_session',
        ];

        authKeys.forEach((key) => {
            if (localStorage.getItem(key)) localStorage.removeItem(key);
            if (sessionStorage.getItem(key)) sessionStorage.removeItem(key);
        });
    } catch (error) {
        console.error('Error during final cleanup:', error);
    }
};

/**
 * Clears only authentication-related storage
 * Use this for logout without clearing all app data
 */
export const clearAuthStorage = (): void => {
    try {
        const authKeys = [
            'auth_token',
            'refresh_token',
            'user',
            'token',
            'auth',
            'session',
            'featherpanel_token',
            'featherpanel_user',
            'featherpanel_session',
        ];

        authKeys.forEach((key) => {
            if (localStorage.getItem(key)) localStorage.removeItem(key);
            if (sessionStorage.getItem(key)) sessionStorage.removeItem(key);
        });

        // Clear cookies
        clearCookies();
    } catch (error) {
        console.error('Error clearing auth storage:', error);
    }
};
