<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import type { SidebarProps } from '@/components/ui/sidebar';
import { useI18n } from 'vue-i18n';

// Icons are now imported in the navigation composable
import NavMain from '@/components/nav/NavMain.vue';
import NavUser from '@/components/NavUser.vue';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
    useSidebar,
} from '@/components/ui/sidebar';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useNavigation } from '@/composables/useNavigation';
import { useSidebarState } from '@/composables/useSidebarState';

const { t } = useI18n();

const sessionStore = useSessionStore();
const router = useRouter();
const settingsStore = useSettingsStore();
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;
    await settingsStore.fetchSettings();
});

const props = withDefaults(defineProps<SidebarProps>(), {
    collapsible: 'icon',
});

const { state } = useSidebar();
const { sidebarNavigation } = useNavigation();
const { sidebarVisibility } = useSidebarState();

// Use shared navigation data
const data = computed(() => ({
    user: {
        name: sessionStore.user?.username || '',
        email: sessionStore.user?.email || '',
        avatar: sessionStore.user?.avatar || '',
        avatar_alt: sessionStore.user?.username?.charAt(0) || '',
    },
    navMain: sidebarNavigation.value.navMain,
    navAdmin: sidebarNavigation.value.navAdmin,
    navServer: sidebarNavigation.value.navServer,
    navDebug: sidebarNavigation.value.navDebug,
}));

const user = computed(() => {
    return {
        name: sessionStore.user?.username || '',
        email: sessionStore.user?.email || '',
        avatar: sessionStore.user?.avatar || '',
        avatar_alt: sessionStore.user?.username?.charAt(0) || '',
        hasAdminPanel: sessionStore.hasPermission('ADMIN_DASHBOARD_VIEW') || false,
    };
});

// Get current theme

const currentTheme = ref<string | null>(window.localStorage.getItem('theme'));

function updateTheme() {
    currentTheme.value = window.localStorage.getItem('theme');
}

onMounted(() => {
    updateTheme();
    window.addEventListener('storage', updateTheme);
    // Also watch for theme changes via custom events (if your app uses them)
    window.addEventListener('theme-changed', updateTheme as EventListener);
});

// Determine if sidebar should be visible
const isSidebarVisible = computed(() => {
    return sidebarVisibility.value !== 'hidden';
});
</script>

<template>
    <Sidebar v-if="isSidebarVisible" v-bind="props">
        <SidebarHeader class="flex-shrink-0">
            <div class="flex items-center justify-center px-3 py-3 sm:px-4">
                <div class="flex items-center gap-2 min-w-0 cursor-pointer flex-shrink-0" @click="router.push('/')">
                    <img
                        v-if="settingsStore.appLogo && currentTheme === 'dark'"
                        :src="String(settingsStore.appLogo || '')"
                        :alt="String(settingsStore.appName || '')"
                        class="h-6 w-6 sm:h-8 sm:w-8 object-contain flex-shrink-0"
                    />
                    <img
                        v-else-if="settingsStore.appLogoWhite && currentTheme === 'light'"
                        :src="String(settingsStore.appLogoWhite || '')"
                        :alt="String(settingsStore.appName || '')"
                        class="h-6 w-6 sm:h-8 sm:w-8 object-contain flex-shrink-0"
                    />
                    <div
                        v-else
                        class="h-6 w-6 sm:h-8 sm:w-8 bg-primary rounded flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0"
                    >
                        {{ String(settingsStore.appName || '').charAt(0) || 'M' }}
                    </div>
                    <span v-if="state === 'expanded'" class="font-medium text-base sm:text-lg truncate ml-2">
                        {{ settingsStore.appName || '' }}
                    </span>
                </div>
            </div>
        </SidebarHeader>
        <SidebarContent class="px-2 sm:px-0">
            <NavMain
                v-if="router.currentRoute.value.path.startsWith('/dashboard')"
                :name="t('nav.dashboard')"
                :items="data.navMain"
            />
            <NavMain
                v-if="router.currentRoute.value.path.startsWith('/server')"
                :name="t('nav.serverManagement')"
                :items="data.navServer"
            />
            <NavMain
                v-if="
                    router.currentRoute.value.path.startsWith('/admin') ||
                    (router.currentRoute.value.path.startsWith('/dashboard') && user.hasAdminPanel)
                "
                :name="t('nav.adminPanel')"
                :items="data.navAdmin"
            />
            <NavMain
                v-if="user.hasAdminPanel && settingsStore.appDeveloperMode"
                name="Developer Mode (Debug)"
                :items="data.navDebug"
            />
        </SidebarContent>
        <SidebarFooter class="px-2 sm:px-0">
            <NavUser :user="user" />
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
</template>
