import type { RouteRecordRaw } from 'vue-router';

const adminRoutes: RouteRecordRaw[] = [
    {
        path: '/admin/users',
        name: 'AdminUsers',
        component: () => import('@/pages/admin/users/Index.vue'),
    },
];

export default adminRoutes;
