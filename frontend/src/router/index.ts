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

import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

/**
 * Auto-index all route files from the routes directory
 *
 * This function dynamically imports all .ts files in the routes directory structure
 * and combines their exported route arrays. This means you can add new route files
 * anywhere in the routes/ directory and they will be automatically included without
 * needing to manually import them here.
 *
 * Requirements for route files:
 * - Must be .ts files in the routes/ directory (any subdirectory)
 * - Must export a default array of RouteRecordRaw objects
 * - Example: export default authRoutes;
 */
async function loadRoutes(): Promise<RouteRecordRaw[]> {
    const routes: RouteRecordRaw[] = [];

    // Use Vite's glob import to get all route files
    const routeModules = import.meta.glob('./routes/**/*.ts', { eager: true });

    for (const path in routeModules) {
        const module = routeModules[path] as { default: RouteRecordRaw[] };
        if (module.default && Array.isArray(module.default)) {
            routes.push(...module.default);
        }
    }

    return routes;
}

// Load all routes dynamically
const routes = await loadRoutes();

// Add catch-all route for 404 (with redirect check)
routes.push({
    path: '/:pathMatch(.*)*',
    component: () => import('@/pages/errors/NotFound.vue'),
});

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Global navigation guard to load user preferences for authenticated users
router.beforeEach(async (to, from, next) => {
    // Check if user is authenticated
    const isAuthenticated = document.cookie.includes('remember_token');

    if (isAuthenticated && from.path === '/' && to.path !== from.path) {
        // User is authenticated and navigating from the initial route
        // This means it's likely the first page load after authentication
        try {
            // Dynamically import the preferences store to avoid circular dependencies
            const { usePreferencesStore } = await import('@/stores/preferences');
            const preferencesStore = usePreferencesStore();

            // Only load if not already synced recently (within last 5 minutes)
            const lastSync = preferencesStore.lastSyncTime;
            const fiveMinutes = 5 * 60 * 1000;
            if (!lastSync || Date.now() - lastSync > fiveMinutes) {
                await preferencesStore.loadPreferences();

                // Start auto-sync if not already running
                preferencesStore.startAutoSync();
                console.log('[Router] Auto-sync enabled for user preferences');
            }
        } catch (error) {
            console.error('Failed to load user preferences on navigation:', error);
            // Don't block navigation if preferences fail to load
        }
    }

    // Scroll to top of page
    window.scrollTo(0, 0);

    // Continue with navigation
    next();
});

export default router;
