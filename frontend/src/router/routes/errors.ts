import type { RouteRecordRaw } from 'vue-router';

const errorRoutes: RouteRecordRaw[] = [
    {
        path: '/404',
        name: '404',
        component: () => import('@/pages/errors/NotFound.vue'),
    },
    {
        path: '/403',
        name: '403',
        component: () => import('@/pages/errors/NotAllowed.vue'),
    },
    {
        path: '/500',
        name: '500',
        component: () => import('@/pages/errors/ServerError.vue'),
    },
    {
        path: '/redirect/:slug',
        name: 'Redirect',
        component: () => import('@/pages/Redirect.vue'),
    },
];

export default errorRoutes;
