<template>
    <DashboardLayout :breadcrumbs="[{ text: $t('dashboard.title'), isCurrent: true, href: '/dashboard' }]">
        <div class="flex flex-col gap-6">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <div class="flex items-center gap-4"></div>

            <!-- Plugin Widgets: Before Server List -->
            <WidgetRenderer v-if="widgetsBeforeServerList.length > 0" :widgets="widgetsBeforeServerList" />

            <!-- Server List Section -->
            <ServerList />

            <!-- Plugin Widgets: After Server List -->
            <WidgetRenderer v-if="widgetsAfterServerList.length > 0" :widgets="widgetsAfterServerList" />

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
    </DashboardLayout>
</template>

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

import { computed, onMounted } from 'vue';
import { useSessionStore } from '@/stores/session';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import ServerList from '@/components/dashboard/ServerList.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

const sessionStore = useSessionStore();

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('dashboard');
const widgetsTopOfPage = computed(() => getWidgets('dashboard', 'top-of-page'));
const widgetsBeforeServerList = computed(() => getWidgets('dashboard', 'before-server-list'));
const widgetsAfterServerList = computed(() => getWidgets('dashboard', 'after-server-list'));
const widgetsBottomOfPage = computed(() => getWidgets('dashboard', 'bottom-of-page'));

onMounted(async () => {
    await sessionStore.checkSessionOrRedirect();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});
</script>
