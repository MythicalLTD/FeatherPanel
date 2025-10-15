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
    SidebarSeparator,
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
    navAdminGrouped: sidebarNavigation.value.navAdminGrouped,
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

const currentTheme = ref<string>((window.localStorage.getItem('theme') as string) ?? 'dark');

function updateTheme() {
    currentTheme.value = (window.localStorage.getItem('theme') as string) ?? 'dark';
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
    <Sidebar v-if="isSidebarVisible" v-bind="props" class="overflow-hidden">
        <SidebarHeader class="flex-shrink-0 border-b border-border/50">
            <div
                class="flex items-center px-2 py-2.5 sm:py-3"
                :class="state === 'collapsed' ? 'justify-center' : 'px-3'"
            >
                <div
                    class="flex items-center gap-2.5 min-w-0 cursor-pointer flex-shrink-0 transition-all"
                    :class="state === 'collapsed' ? 'justify-center' : ''"
                    @click="router.push('/')"
                >
                    <div
                        class="flex items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex-shrink-0 border border-primary/10"
                        :class="state === 'collapsed' ? 'p-2' : 'p-1.5'"
                    >
                        <img
                            v-if="settingsStore.appLogo && currentTheme === 'dark'"
                            :src="String(settingsStore.appLogo || '')"
                            :alt="String(settingsStore.appName || '')"
                            :class="state === 'collapsed' ? 'h-6 w-6' : 'h-5 w-5 sm:h-6 sm:w-6'"
                            class="object-contain"
                        />
                        <img
                            v-else-if="settingsStore.appLogoWhite && currentTheme === 'light'"
                            :src="String(settingsStore.appLogoWhite || '')"
                            :alt="String(settingsStore.appName || '')"
                            :class="state === 'collapsed' ? 'h-6 w-6' : 'h-5 w-5 sm:h-6 sm:w-6'"
                            class="object-contain"
                        />
                    </div>

                    <span
                        v-if="settingsStore.appName && state !== 'collapsed'"
                        class="font-semibold text-base truncate transition-opacity"
                    >
                        {{ settingsStore.appName }}
                    </span>
                </div>
            </div>
        </SidebarHeader>
        <SidebarContent
            class="px-2 sm:px-0 !overflow-y-auto !overflow-x-hidden group-data-[collapsible=icon]:!overflow-y-auto"
        >
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
            <!-- Grouped Admin Navigation -->
            <template v-if="router.currentRoute.value.path.startsWith('/admin') && user.hasAdminPanel">
                <template v-for="(group, index) in data.navAdminGrouped" :key="group.name">
                    <SidebarSeparator v-if="index > 0" class="my-0.5" />
                    <NavMain :name="group.name" :items="group.items" />
                </template>
            </template>
            <template v-if="user.hasAdminPanel && settingsStore.appDeveloperMode">
                <SidebarSeparator class="my-0.5" />
                <NavMain name="Developer Mode (Debug)" :items="data.navDebug" />
            </template>
        </SidebarContent>
        <SidebarFooter class="px-2 py-2 flex-shrink-0 border-t border-border/50">
            <NavUser :user="user" />
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
</template>
