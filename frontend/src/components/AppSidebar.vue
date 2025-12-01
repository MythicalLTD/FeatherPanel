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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import axios from 'axios';
import { useNavigation } from '@/composables/useNavigation';
import { useSidebarState } from '@/composables/useSidebarState';
import { useServerContext } from '@/composables/useServerContext';
import { useWingsWebSocketServersList } from '@/composables/useWingsWebSocketServersList';
import { Copy, Check, Play, Square, RotateCw, Skull } from 'lucide-vue-next';

const { t } = useI18n();

const sessionStore = useSessionStore();
const router = useRouter();
const settingsStore = useSettingsStore();
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;
    await settingsStore.fetchSettings();
    // Connect to live status for current server
    const uuid = currentServer.value?.uuidShort;
    if (uuid) {
        await connectServer(uuid);
    }
});

const props = withDefaults(defineProps<SidebarProps>(), {
    collapsible: 'icon',
});

const { state } = useSidebar();
const { sidebarNavigation } = useNavigation();
const { sidebarVisibility } = useSidebarState();
const { currentServer } = useServerContext();

// Live status via servers-list websocket
const { connectServer, disconnectServer, getServerStatus, isServerConnecting } = useWingsWebSocketServersList();

const liveStatus = computed<string>(() => {
    const uuid = currentServer.value?.uuidShort;
    if (!uuid) return 'unknown';
    return getServerStatus(uuid) || (currentServer.value?.status as string) || 'unknown';
});

const isConnecting = computed<boolean>(() => {
    const uuid = currentServer.value?.uuidShort;
    if (!uuid) return false;
    return isServerConnecting(uuid);
});

// Server IP copy state
const ipCopied = ref(false);

// Use shared navigation data
const data = computed(() => ({
    user: {
        name: sessionStore.user?.username || '',
        email: sessionStore.user?.email || '',
        avatar: sessionStore.user?.avatar || '',
        avatar_alt: sessionStore.user?.username?.charAt(0) || '',
    },
    navMain: sidebarNavigation.value.navMain,
    navMainGrouped: sidebarNavigation.value.navMainGrouped,
    navAdmin: sidebarNavigation.value.navAdmin,
    navAdminGrouped: sidebarNavigation.value.navAdminGrouped,
    navServer: sidebarNavigation.value.navServer,
    navServerGrouped: sidebarNavigation.value.navServerGrouped,
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

// Reconnect when current server changes
watch(
    () => currentServer.value?.uuidShort,
    async (newUuid, oldUuid) => {
        if (oldUuid) disconnectServer(oldUuid);
        if (newUuid) await connectServer(newUuid);
    },
);

onUnmounted(() => {
    const uuid = currentServer.value?.uuidShort;
    if (uuid) disconnectServer(uuid);
});

// Determine if sidebar should be visible
const isSidebarVisible = computed(() => {
    return sidebarVisibility.value !== 'hidden';
});

// Server address for display
const serverAddress = computed(() => {
    if (!currentServer.value?.allocation) return '';
    const ip = currentServer.value.allocation.ip_alias || currentServer.value.allocation.ip;
    const port = currentServer.value.allocation.port;
    return `${ip}:${port}`;
});

// Status dot color
const statusDotClass = computed(() => {
    // Show blue while connecting and no known status yet
    if (isConnecting.value && (!liveStatus.value || liveStatus.value === 'unknown')) {
        return 'bg-blue-500';
    }
    switch (liveStatus.value) {
        case 'running':
            return 'bg-green-500';
        case 'starting':
            return 'bg-yellow-500';
        case 'stopping':
            return 'bg-orange-500';
        case 'offline':
        case 'stopped':
            return 'bg-red-500';
        default:
            return 'bg-muted-foreground/50';
    }
});

// Button guards
const canStart = computed(() => ['offline', 'stopped'].includes(liveStatus.value));
const canStop = computed(() => ['running', 'starting'].includes(liveStatus.value));
const canRestart = computed(() => liveStatus.value === 'running');
const canKill = computed(() => ['running', 'starting'].includes(liveStatus.value));

// Copy server IP to clipboard
const copyServerAddress = async (): Promise<void> => {
    if (!serverAddress.value) return;
    try {
        await navigator.clipboard.writeText(serverAddress.value);
        ipCopied.value = true;
        setTimeout(() => {
            ipCopied.value = false;
        }, 2000);
    } catch (error) {
        console.error('Failed to copy server address:', error);
    }
};

// Server control functions
const serverActionLoading = ref<string | null>(null);

const sendServerCommand = async (command: 'start' | 'stop' | 'restart' | 'kill'): Promise<void> => {
    if (!currentServer.value || serverActionLoading.value) return;

    serverActionLoading.value = command;
    try {
        await axios.post(`/api/user/servers/${currentServer.value.uuidShort}/power/${command}`);
    } catch (error) {
        console.error(`Failed to ${command} server:`, error);
    } finally {
        setTimeout(() => {
            serverActionLoading.value = null;
        }, 1000);
    }
};
</script>

<template>
    <Sidebar v-if="isSidebarVisible" v-bind="props" class="overflow-hidden">
        <SidebarHeader class="shrink-0 border-b border-border/50">
            <div
                class="flex items-center px-2 py-2.5 sm:py-3"
                :class="state === 'collapsed' ? 'justify-center' : 'px-3'"
            >
                <div
                    class="flex items-center gap-2.5 min-w-0 cursor-pointer shrink-0 transition-all"
                    :class="state === 'collapsed' ? 'justify-center' : ''"
                    @click="router.push('/')"
                >
                    <div
                        class="flex items-center justify-center rounded-lg bg-linear-to-br from-primary/10 to-primary/5 shrink-0 border border-primary/10"
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

                    <div v-if="state !== 'collapsed'" class="flex flex-col gap-1 min-w-0">
                        <span v-if="settingsStore.appName" class="font-semibold text-base truncate transition-opacity">
                            {{ settingsStore.appName }}
                        </span>
                        <div
                            v-if="router.currentRoute.value.path.startsWith('/admin')"
                            class="inline-flex items-center gap-1.5"
                        >
                            <span
                                class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                            >
                                v{{ settingsStore.appVersion }}
                            </span>
                            <span
                                class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            >
                                Admin Panel
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Server Info (Only on server routes) -->
            <div v-if="router.currentRoute.value.path.startsWith('/server') && currentServer && state !== 'collapsed'">
                <div class="px-3 py-2.5 space-y-2.5">
                    <!-- Server Name & Address -->
                    <div class="min-w-0">
                        <h3 class="text-xs font-semibold text-foreground truncate mb-1" :title="currentServer.name">
                            {{ currentServer.name }}
                        </h3>
                        <div class="flex items-center gap-1.5">
                            <code
                                class="text-[10px] font-mono text-muted-foreground/80 truncate flex-1"
                                :title="serverAddress"
                            >
                                {{ serverAddress }}
                            </code>
                            <button
                                class="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-0.5 rounded hover:bg-accent/50"
                                :title="t('common.copy')"
                                @click="copyServerAddress"
                            >
                                <Check v-if="ipCopied" :size="11" class="text-green-600 dark:text-green-400" />
                                <Copy v-else :size="11" />
                            </button>
                        </div>
                        <!-- Live status -->
                        <div class="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span class="inline-flex items-center gap-1">
                                <span class="h-2.5 w-2.5 rounded-full" :class="statusDotClass"></span>
                                <span class="capitalize">{{
                                    liveStatus && liveStatus !== 'unknown'
                                        ? liveStatus
                                        : isConnecting
                                          ? 'connecting'
                                          : 'unknown'
                                }}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Control Buttons -->
                    <div class="flex gap-1.5">
                        <button
                            class="flex-1 h-8 rounded-md flex items-center justify-center bg-green-500/10 hover:bg-green-500/15 text-green-600 dark:text-green-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                            :title="t('serverConsole.start')"
                            :disabled="serverActionLoading !== null || !canStart"
                            @click="sendServerCommand('start')"
                        >
                            <Play
                                :size="13"
                                :class="
                                    serverActionLoading === 'start' || liveStatus === 'starting' ? 'animate-pulse' : ''
                                "
                                fill="currentColor"
                            />
                        </button>
                        <button
                            class="flex-1 h-8 rounded-md flex items-center justify-center bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                            :title="t('serverConsole.stop')"
                            :disabled="serverActionLoading !== null || !canStop"
                            @click="sendServerCommand('stop')"
                        >
                            <Square
                                :size="13"
                                :class="
                                    serverActionLoading === 'stop' || liveStatus === 'stopping' ? 'animate-pulse' : ''
                                "
                                fill="currentColor"
                            />
                        </button>
                        <button
                            class="flex-1 h-8 rounded-md flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                            :title="t('serverConsole.restart')"
                            :disabled="serverActionLoading !== null || !canRestart"
                            @click="sendServerCommand('restart')"
                        >
                            <RotateCw :size="13" :class="serverActionLoading === 'restart' ? 'animate-spin' : ''" />
                        </button>
                        <button
                            class="flex-1 h-8 rounded-md flex items-center justify-center bg-orange-500/10 hover:bg-orange-500/15 text-orange-600 dark:text-orange-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                            :title="t('serverConsole.kill')"
                            :disabled="serverActionLoading !== null || !canKill"
                            @click="sendServerCommand('kill')"
                        >
                            <Skull :size="13" :class="serverActionLoading === 'kill' ? 'animate-pulse' : ''" />
                        </button>
                    </div>
                </div>
            </div>
        </SidebarHeader>
        <SidebarContent
            class="px-2 sm:px-0 overflow-y-auto! overflow-x-hidden! group-data-[collapsible=icon]:overflow-y-auto!"
        >
            <!-- Grouped Dashboard Navigation -->
            <template v-if="router.currentRoute.value.path.startsWith('/dashboard')">
                <template v-for="(group, index) in data.navMainGrouped" :key="group.name">
                    <SidebarSeparator v-if="index > 0" class="my-0.5" />
                    <NavMain :name="group.name" :items="group.items" />
                </template>
            </template>
            <!-- Grouped Server Navigation -->
            <template v-if="router.currentRoute.value.path.startsWith('/server')">
                <template v-for="(group, index) in data.navServerGrouped" :key="group.name">
                    <SidebarSeparator v-if="index > 0" class="my-0.5" />
                    <NavMain :name="group.name" :items="group.items" />
                </template>
            </template>
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
        <SidebarFooter class="px-2 py-2 shrink-0 border-t border-border/50">
            <NavUser :user="user" />
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
</template>
