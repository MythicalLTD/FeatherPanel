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
        path: '/dashboard/knowledgebase',
        name: 'Knowledgebase',
        component: () => import('@/pages/dashboard/knowledgebase/Categories.vue'),
    },
    {
        path: '/dashboard/knowledgebase/category/:id',
        name: 'KnowledgebaseCategory',
        component: () => import('@/pages/dashboard/knowledgebase/CategoryArticles.vue'),
    },
    {
        path: '/dashboard/knowledgebase/article/:id',
        name: 'KnowledgebaseArticle',
        component: () => import('@/pages/dashboard/knowledgebase/ArticleView.vue'),
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
