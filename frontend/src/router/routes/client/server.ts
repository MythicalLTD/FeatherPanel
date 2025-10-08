import type { RouteRecordRaw } from 'vue-router';

const clientRoutes: RouteRecordRaw[] = [
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
        component: () => import('@/pages/dashboard/server/ServerAllocations.vue'),
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
        component: () => import('@/pages/dashboard/server/ServerSubusers.vue'),
    },
    {
        path: '/server/:uuidShort/databases',
        name: 'ServerDatabases',
        component: () => import('@/pages/dashboard/server/ServerDatabases.vue'),
    },
    {
        path: '/server/:uuidShort/:pathMatch(.*)*',
        component: () => import('@/pages/dashboard/PluginRenderedPage.vue'),
    },
];

export default clientRoutes;
