import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Import route modules
import authRoutes from './routes/client/auth';
import clientRoutes from './routes/client/client';
import errorRoutes from './routes/errors';
import adminRoutes from './routes/admin/home';

// Combine all routes
const routes: RouteRecordRaw[] = [...authRoutes, ...clientRoutes, ...errorRoutes, ...adminRoutes];

// Add catch-all route for 404 (with redirect check)
routes.push({
    path: '/:pathMatch(.*)*',
    component: () => import('@/pages/errors/NotFound.vue'),
});

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Add debug logging for route changes
router.beforeEach((to, from, next) => {
    console.log('[REDIRECT DEBUG] Router: Navigating from', from.path, 'to', to.path);
    next();
});

router.afterEach((to) => {
    console.log('[REDIRECT DEBUG] Router: Navigation completed to', to.path);
});

export default router;
