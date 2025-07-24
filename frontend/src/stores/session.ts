import { defineStore } from 'pinia';
import axios from 'axios';
import type { Router } from 'vue-router';

export interface UserInfo {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role: number;
    external_id: number | null;
    password: string;
    remember_token: string;
    mail_verify: string | null;
    avatar: string;
    uuid: string;
    first_ip: string;
    last_ip: string;
    banned: string;
    ['2fa_enabled']: string;
    ['2fa_key']: string;
    ['2fa_blocked']: string;
    deleted: string;
    locked: string;
    last_seen: string;
    first_seen: string;
}

export const useSessionStore = defineStore('session', {
    state: () => ({
        user: null as UserInfo | null,
        isSessionChecked: false,
    }),
    actions: {
        async checkSessionOrRedirect(router?: Router) {
            try {
                const res = await axios.get('/api/user/session');
                if (res.data && res.data.success && res.data.data && res.data.data.user_info) {
                    this.user = res.data.data.user_info as UserInfo;
                    this.isSessionChecked = true;
                    return true;
                } else {
                    if (router)
                        router.replace({
                            name: 'Login',
                            query: { redirect: router.currentRoute.value.path, e: 'Invalid session' },
                        });
                    return false;
                }
            } catch {
                if (router)
                    router.replace({
                        name: 'Login',
                        query: { redirect: router.currentRoute.value.path, e: 'Invalid session' },
                    });
                return false;
            }
        },
        clearSession() {
            this.user = null;
            this.isSessionChecked = false;
        },
    },
});
