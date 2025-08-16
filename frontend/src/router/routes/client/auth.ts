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
