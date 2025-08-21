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
        path: '/server/:uuidShort',
        name: 'ServerConsole',
        component: () => import('@/pages/dashboard/server/ServerConsole.vue'),
    },
    {
        path: '/server/:uuidShort/logs',
        name: 'ServerLogs',
        component: () => import('@/pages/dashboard/server/ServerLogs.vue'),
    },
    {
        path: '/server/:uuidShort/logs/install',
        name: 'ServerInstallLogs',
        component: () => import('@/pages/dashboard/server/ServerInstallLogs.vue'),
    },
    {
        path: '/server/:uuidShort/settings',
        name: 'ServerSettings',
        component: () => import('@/pages/dashboard/server/ServerSettings.vue'),
    },
    {
        path: '/server/:uuidShort/startup',
        name: 'ServerStartup',
        component: () => import('@/pages/dashboard/server/ServerStartup.vue'),
    },
    {
        path: '/server/:uuidShort/console-window',
        name: 'ServerConsoleWindow',
        component: () => import('@/pages/dashboard/server/ConsoleWindow.vue'),
    },
    {
        path: '/server/:uuidShort/console-popup',
        name: 'ServerConsolePopup',
        component: () => import('@/pages/dashboard/server/ConsolePopup.vue'),
    },
    {
        path: '/dashboard/activities',
        name: 'AllServerActivities',
        component: () => import('@/pages/dashboard/AllServerActivities.vue'),
    },
    {
        path: '/server/:uuidShort/activities',
        name: 'ServerActivities',
        component: () => import('@/pages/dashboard/server/ServerActivities.vue'),
    },
    {
        path: '/server/:uuidShort/allocations',
        name: 'ServerAllocations',
        component: () => import('@/pages/dashboard/server/Allocations.vue'),
    },
    {
        path: '/server/:uuidShort/backups',
        name: 'ServerBackups',
        component: () => import('@/pages/dashboard/server/ServerBackups.vue'),
    },
    {
        path: '/',
        redirect: '/dashboard',
    },
];

export default clientRoutes;
