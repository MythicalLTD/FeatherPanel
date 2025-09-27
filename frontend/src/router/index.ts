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

export default router;
