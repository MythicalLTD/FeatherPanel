/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
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
import Cookie from 'js-cookie';

const clientRoutes: RouteRecordRaw[] = [
    {
        path: '/server/:uuidShort',
        name: 'ServerConsole',
        component: () => import('@/pages/dashboard/server/ServerConsole.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/logs',
        name: 'ServerLogs',
        component: () => import('@/pages/dashboard/server/ServerLogs.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/logs/install',
        name: 'ServerInstallLogs',
        component: () => import('@/pages/dashboard/server/ServerInstallLogs.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/settings',
        name: 'ServerSettings',
        component: () => import('@/pages/dashboard/server/ServerSettings.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/startup',
        name: 'ServerStartup',
        component: () => import('@/pages/dashboard/server/ServerStartup.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/activities',
        name: 'ServerActivities',
        component: () => import('@/pages/dashboard/server/ServerActivities.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/allocations',
        name: 'ServerAllocations',
        component: () => import('@/pages/dashboard/server/ServerAllocations.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/subdomains',
        name: 'ServerSubdomains',
        component: () => import('@/pages/dashboard/server/ServerSubdomains.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/backups',
        name: 'ServerBackups',
        component: () => import('@/pages/dashboard/server/ServerBackups.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/schedules',
        name: 'ServerSchedules',
        component: () => import('@/pages/dashboard/server/ServerSchedules.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/schedules/:scheduleId/tasks',
        name: 'ServerTasks',
        component: () => import('@/pages/dashboard/server/ServerTasks.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/files',
        name: 'ServerFiles',
        component: () => import('@/pages/dashboard/server/ServerFiles.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/files/edit',
        name: 'ServerFileEditor',
        component: () => import('@/pages/dashboard/server/ServerFileEditor.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/users',
        name: 'ServerSubusers',
        component: () => import('@/pages/dashboard/server/ServerSubusers.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/databases',
        name: 'ServerDatabases',
        component: () => import('@/pages/dashboard/server/ServerDatabases.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/firewall',
        name: 'ServerFirewall',
        component: () => import('@/pages/dashboard/server/ServerFirewall.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
    {
        path: '/server/:uuidShort/:pathMatch(.*)*',
        component: () => import('@/pages/dashboard/PluginRenderedPage.vue'),
        beforeEnter: (to, from, next) => {
            Cookie.set('serverUuid', to.params.uuidShort as string);
            next();
        },
    },
];

export default clientRoutes;
