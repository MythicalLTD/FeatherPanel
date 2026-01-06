/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

import api from '../api';

export const authApi = {
    login: async (data: {
        username_or_email?: string;
        password?: string;
        turnstile_token?: string;
        sso_token?: string;
        discord_token?: string;
    }) => {
        const response = await api.put('/user/auth/login', data);
        return response.data;
    },

    register: async (data: {
        first_name: string;
        last_name: string;
        email: string;
        username: string;
        password: string;
        turnstile_token?: string;
    }) => {
        const response = await api.put('/user/auth/register', data);
        return response.data;
    },

    logout: async () => {
        const response = await api.delete('/user/auth/logout');
        return response.data;
    },

    forgotPassword: async (email: string, turnstile_token?: string) => {
        const payload: { email: string; turnstile_token?: string } = { email };
        if (turnstile_token) {
            payload.turnstile_token = turnstile_token;
        }
        const response = await api.put('/user/auth/forgot-password', payload);
        return response.data;
    },

    resetPassword: async (data: { token: string; password: string }) => {
        const response = await api.post('/user/auth/reset-password', data);
        return response.data;
    },

    verify2FA: async (data: { username_or_email: string; code: string }) => {
        const response = await api.post('/user/auth/verify-2fa', data);
        return response.data;
    },

    setup2FA: async () => {
        const response = await api.get('/user/auth/setup-2fa');
        return response.data;
    },

    enable2FA: async (code: string) => {
        const response = await api.post('/user/auth/enable-2fa', { code });
        return response.data;
    },
};
