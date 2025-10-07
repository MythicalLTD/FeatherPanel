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
        component: () => import('@/pages/dashboard/server/ServerConsoleNew.vue'),
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
        path: '/server/:uuidShort/schedules',
        name: 'ServerSchedules',
        component: () => import('@/pages/dashboard/server/ServerSchedules.vue'),
    },
    {
        path: '/server/:uuidShort/schedules/:scheduleId/tasks',
        name: 'ServerTasks',
        component: () => import('@/pages/dashboard/server/ServerTasks.vue'),
    },
    {
        path: '/server/:uuidShort/files',
        name: 'ServerFiles',
        component: () => import('@/pages/dashboard/server/ServerFiles.vue'),
    },
    {
        path: '/server/:uuidShort/files/edit',
        name: 'ServerFileEditor',
        component: () => import('@/pages/dashboard/server/ServerFileEditor.vue'),
    },
    {
        path: '/server/:uuidShort/users',
        name: 'ServerSubusers',
        component: () => import('@/pages/dashboard/server/Subusers.vue'),
    },
    {
        path: '/server/:uuidShort/databases',
        name: 'ServerDatabases',
        component: () => import('@/pages/dashboard/server/ServerDatabases.vue'),
    },
    {
        path: '/',
        redirect: '/dashboard',
    },
    {
        path: '/license',
        name: 'License',
        component: () => import('@/components/LicensingInfo.vue'),
    },
];

export default clientRoutes;
