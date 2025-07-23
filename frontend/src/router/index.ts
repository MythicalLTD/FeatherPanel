import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Import route modules
import authRoutes from './routes/auth';
import clientRoutes from './routes/client';
import errorRoutes from './routes/errors';

// Combine all routes
const routes: RouteRecordRaw[] = [...authRoutes, ...clientRoutes, ...errorRoutes];

// Add catch-all route for 404
routes.push({
    path: '/:pathMatch(.*)*',
    redirect: '/404',
});

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
