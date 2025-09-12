<script setup lang="ts">
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
import { computed, onMounted, watchEffect } from 'vue';
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
}));

// Debug: Log active states
watchEffect(() => {
    console.log(
        'Dashboard items active states:',
        data.value.navMain.map((item) => ({ title: item.title, isActive: item.isActive })),
    );
    if (data.value.navAdmin.length > 0) {
        console.log(
            'Admin items active states:',
            data.value.navAdmin.map((item) => ({ title: item.title, isActive: item.isActive })),
        );
    }
    if (data.value.navServer.length > 0) {
        console.log(
            'Server items active states:',
            data.value.navServer.map((item) => ({ title: item.title, isActive: item.isActive })),
        );
    }
});

const user = computed(() => {
    return {
        name: sessionStore.user?.username || '',
        email: sessionStore.user?.email || '',
        avatar: sessionStore.user?.avatar || '',
        avatar_alt: sessionStore.user?.username?.charAt(0) || '',
        hasAdminPanel: sessionStore.hasPermission('ADMIN_DASHBOARD_VIEW') || false,
    };
});

// Determine if sidebar should be visible
const isSidebarVisible = computed(() => {
    return sidebarVisibility.value !== 'hidden';
});
</script>

<template>
    <Sidebar v-if="isSidebarVisible" v-bind="props">
        <SidebarHeader class="flex-shrink-0">
            <div class="flex items-center justify-center px-4 py-3">
                <div class="flex items-center gap-2 min-w-0 cursor-pointer flex-shrink-0" @click="router.push('/')">
                    <img
                        v-if="settingsStore.appLogo"
                        :src="String(settingsStore.appLogo || '')"
                        :alt="String(settingsStore.appName || '')"
                        class="h-8 w-8 object-contain flex-shrink-0"
                    />
                    <div
                        v-else
                        class="h-8 w-8 bg-primary rounded flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    >
                        {{ String(settingsStore.appName || '').charAt(0) || 'M' }}
                    </div>
                    <span v-if="state === 'expanded'" class="font-medium text-lg truncate ml-2">
                        {{ settingsStore.appName || '' }}
                    </span>
                </div>
            </div>
        </SidebarHeader>
        <SidebarContent>
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
                v-if="router.currentRoute.value.path.startsWith('/admin') && user.hasAdminPanel"
                :name="t('nav.adminPanel')"
                :items="data.navAdmin"
            />
        </SidebarContent>
        <SidebarFooter>
            <NavUser :user="user" />
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
</template>
