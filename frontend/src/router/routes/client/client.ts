import type { RouteRecordRaw } from 'vue-router';

const clientRoutes: RouteRecordRaw[] = [
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/dashboard/Dashboard.vue'),
    },
    {
        path: '/dashboard/account',
        name: 'Account',
        component: () => import('@/pages/dashboard/account/Account.vue'),
    },
    {
        path: '/',
        redirect: '/dashboard',
    },
    {
        path: '/dashboard/:pathMatch(.*)*',
        name: 'DashboardPluginRenderedPage',
        component: () => import('@/pages/dashboard/PluginRenderedPage.vue'),
    },
    {
        path: '/license',
        name: 'License',
        component: () => import('@/components/LicensingInfo.vue'),
    },
];

export default clientRoutes;
