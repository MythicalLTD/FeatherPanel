<script lang="ts">
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

import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useSettingsStore } from './stores/settings';
import { useSessionStore } from './stores/session';
import { useNotificationsStore } from './stores/notifications';
import { usePluginSidebarStore } from './stores/pluginSidebar';
import ChatbotWidget from './components/ai/ChatbotWidget.vue';
import BootingUp from './components/BootingUp.vue';

// Conditionally import DebugPanel only in development
// Vite will tree-shake unused imports in production when the component is conditionally registered and rendered
// The import statement itself will be included, but Vite's production build will eliminate unused code
import DebugPanelModule from './components/DebugPanel.vue';
const DebugPanel = import.meta.env.DEV ? DebugPanelModule : null;

export default defineComponent({
    name: 'App',
    components: {
        ...(DebugPanel ? { DebugPanel } : {}),
        ChatbotWidget,
        BootingUp,
    },
    setup() {
        const settingsStore = useSettingsStore();
        const sessionStore = useSessionStore();
        const notificationsStore = useNotificationsStore();
        const pluginSidebarStore = usePluginSidebarStore();
        const debugPanel = ref<InstanceType<typeof DebugPanelModule> | null>(null);
        const isDevelopment = import.meta.env.DEV;
        let initializationPromise: Promise<void> | null = null;

        // Memoize booting screen state to avoid unnecessary re-computations
        const showBootingScreen = computed(() => settingsStore.booting);

        onMounted(async () => {
            // Initialize all core data once on app mount
            // These stores guard against duplicate fetches, so this is safe to call
            if (!initializationPromise) {
                initializationPromise = (async () => {
                    // Fetch settings first (needed for booting screen detection)
                    await settingsStore.fetchSettings();

                    // Only fetch session, notifications, and plugin sidebar if backend is ready
                    if (!settingsStore.booting) {
                        // Fetch session (needed for authenticated routes)
                        await sessionStore.fetchSession();

                        // Fetch notifications and start auto-refresh (only if authenticated)
                        if (sessionStore.user) {
                            await notificationsStore.fetchNotifications();
                            notificationsStore.startAutoRefresh();
                        }

                        // Fetch plugin sidebar (public endpoint, safe to call)
                        await pluginSidebarStore.fetchPluginSidebar();
                    }
                })().finally(() => {
                    initializationPromise = null;
                });
                await initializationPromise;
            }
        });

        // Cleanup on unmount
        onBeforeUnmount(() => {
            // Clear any pending promises
            initializationPromise = null;
            // Stop notification auto-refresh
            notificationsStore.stopAutoRefresh();
        });

        return {
            debugPanel,
            showBootingScreen,
            isDevelopment,
        };
    },
});
</script>
<template>
    <div class="app-container">
        <!-- Show booting screen if backend is still booting -->
        <BootingUp v-if="showBootingScreen" />

        <!-- Router view without global transitions - layouts handle their own content transitions -->
        <template v-else>
            <router-view v-slot="{ Component }">
                <component :is="Component" />
            </router-view>

            <!-- Debug Panel (development only) -->
            <DebugPanel v-if="isDevelopment" ref="debugPanel" />

            <!-- Global Context Menu -->
            <GlobalContextMenu ref="globalContextMenu" />

            <!-- AI Chatbot Widget -->
            <ChatbotWidget />
        </template>
    </div>
</template>
