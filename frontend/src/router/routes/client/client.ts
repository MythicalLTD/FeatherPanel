import type { RouteRecordRaw } from 'vue-router';

const clientRoutes: RouteRecordRaw[] = [
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/dashboard/Dashboard.vue'),
    },
    {
        path: '/',
        redirect: '/dashboard',
    },
];

export default clientRoutes;
