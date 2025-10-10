/*
MIT License

Copyright (c) 2025 MythicalSystems
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
