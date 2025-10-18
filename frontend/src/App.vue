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

import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import DebugPanel from './components/DebugPanel.vue';
import GlobalContextMenu from './components/GlobalContextMenu.vue';

export default defineComponent({
    name: 'App',
    components: {
        DebugPanel,
        GlobalContextMenu,
    },
    setup() {
        const debugPanel = ref<InstanceType<typeof DebugPanel> | null>(null);
        const globalContextMenu = ref<InstanceType<typeof GlobalContextMenu> | null>(null);
        const customContextMenuEnabled = ref(true);

        const handleGlobalContextMenu = (event: MouseEvent) => {
            // Check if custom context menu is disabled
            if (!customContextMenuEnabled.value) {
                return;
            }

            // Check if the click is on an element that has its own context menu
            const target = event.target as HTMLElement;

            // Don't prevent context menu on input fields, textareas, or elements with contenteditable
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.closest('[data-radix-context-menu-trigger]') // Don't interfere with shadcn context menus
            ) {
                return;
            }

            // Prevent default browser context menu
            event.preventDefault();

            // Show our custom global context menu
            if (globalContextMenu.value) {
                globalContextMenu.value.show(event.clientX, event.clientY);
            }
        };

        const handleContextMenuToggle = (event: CustomEvent) => {
            customContextMenuEnabled.value = event.detail.enabled;
        };

        onMounted(() => {
            // Load custom context menu setting from localStorage
            const savedSetting = localStorage.getItem('custom-context-menu-enabled');
            if (savedSetting !== null) {
                customContextMenuEnabled.value = savedSetting === 'true';
            }

            document.addEventListener('contextmenu', handleGlobalContextMenu);
            window.addEventListener('custom-context-menu-toggle', handleContextMenuToggle as EventListener);
        });

        onUnmounted(() => {
            document.removeEventListener('contextmenu', handleGlobalContextMenu);
            window.removeEventListener('custom-context-menu-toggle', handleContextMenuToggle as EventListener);
        });

        return {
            debugPanel,
            globalContextMenu,
        };
    },
});
</script>
<template>
    <div class="app-container">
        <!-- Router view without global transitions - layouts handle their own content transitions -->
        <router-view v-slot="{ Component }">
            <component :is="Component" />
        </router-view>

        <!-- Debug Panel -->
        <DebugPanel ref="debugPanel" />

        <!-- Global Context Menu -->
        <GlobalContextMenu ref="globalContextMenu" />
    </div>
</template>
