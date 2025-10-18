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

const authRoutes: RouteRecordRaw[] = [
    {
        path: '/auth',
        component: () => import('@/layouts/AuthLayout.vue'),
        children: [
            { path: 'login', name: 'Login', component: () => import('@/pages/auth/Login.vue') },
            { path: 'register', name: 'Register', component: () => import('@/pages/auth/Register.vue') },
            {
                path: 'forgot-password',
                name: 'ForgotPassword',
                component: () => import('@/pages/auth/ForgotPassword.vue'),
            },
            {
                path: 'reset-password',
                name: 'ResetPassword',
                component: () => import('@/pages/auth/ResetPassword.vue'),
            },
            {
                path: 'setup-two-factor',
                name: 'SetupTwoFactor',
                component: () => import('@/pages/auth/SetupTwoFactor.vue'),
            },
            {
                path: 'verify-two-factor',
                name: 'VerifyTwoFactor',
                component: () => import('@/pages/auth/VerifyTwoFactor.vue'),
            },
            {
                path: 'logout',
                name: 'Logout',
                component: () => import('@/pages/auth/Logout.vue'),
            },
        ],
    },
];

export default authRoutes;
