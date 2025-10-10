<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Dashboard', isCurrent: true, href: '/admin' }]">
        <main class="p-6 bg-background min-h-screen">
            <!-- Header & Actions -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-foreground mb-1">Welcome Back, {{ userName }}</h1>
                    <p class="text-muted-foreground">Here's what's happening with your panel today.</p>
                </div>
                <div class="flex gap-2 flex-wrap md:justify-end">
                    <Button
                        :variant="widgetsStore.isCustomizing ? 'default' : 'secondary'"
                        class="flex items-center gap-2"
                        @click="widgetsStore.toggleCustomizing()"
                    >
                        <Settings :size="16" />
                        {{ widgetsStore.isCustomizing ? 'Done' : 'Customize Dashboard' }}
                    </Button>
                    <Button variant="secondary" class="flex items-center gap-2" @click="openDocumentation">
                        <BookOpen :size="16" /> Documentation
                    </Button>
                    <Button variant="outline" class="flex items-center gap-2" @click="openDiscord">
                        <Discord :size="16" /> Discord
                    </Button>
                </div>
            </div>

            <!-- Error Message -->
            <div
                v-if="dashboardStore.hasError"
                class="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6"
            >
                <div class="flex items-center gap-2 text-destructive">
                    <span class="font-medium">Failed to load dashboard statistics</span>
                </div>
                <p class="text-sm text-muted-foreground mt-1">{{ dashboardStore.error }}</p>
                <Button variant="outline" size="sm" class="mt-2" @click="dashboardStore.fetchDashboardStats()">
                    Retry
                </Button>
            </div>

            <!-- Customization Hint -->
            <div
                v-if="widgetsStore.isCustomizing"
                class="mb-6 p-4 rounded-xl border border-border bg-muted/40 animate-in fade-in slide-in-from-top-2 duration-300"
            >
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Sparkles :size="20" class="text-muted-foreground" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-foreground mb-1">Customization Mode Active</h3>
                        <p class="text-sm text-muted-foreground">
                            Drag widgets by their header to reorder. Use the sidebar to show/hide widgets.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Widgets Grid -->
            <draggable
                v-model="sortedWidgets"
                :disabled="!widgetsStore.isCustomizing"
                item-key="id"
                class="space-y-6"
                handle=".widget-drag-handle"
                @end="onDragEnd"
            >
                <template #item="{ element: widget }">
                    <div v-show="widget.enabled || widgetsStore.isCustomizing" :key="widget.id" class="widget-item">
                        <WidgetContainer
                            :title="widget.name"
                            :enabled="widget.enabled"
                            :is-customizing="widgetsStore.isCustomizing"
                            @toggle-enabled="widgetsStore.toggleWidget(widget.id)"
                        >
                            <component :is="getWidgetComponent(widget.component)" />
                        </WidgetContainer>
                    </div>
                </template>
            </draggable>

            <!-- Customization Panel -->
            <WidgetCustomizationPanel
                :widgets="sortedWidgets"
                :is-open="widgetsStore.isCustomizing"
                @close="widgetsStore.toggleCustomizing()"
                @toggle-widget="widgetsStore.toggleWidget"
                @reset="resetWidgets"
            />

            <!-- First-time Tutorial -->
            <DashboardTutorial />
        </main>
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
import draggable from 'vuedraggable';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageCircle as Discord, Settings, Sparkles } from 'lucide-vue-next';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useDashboardStore } from '@/stores/dashboard';
import { useWidgetsStore } from '@/stores/widgets';

// Widget Components
import WidgetContainer from '@/components/admin/WidgetContainer.vue';
import WelcomeWidget from '@/components/admin/WelcomeWidget.vue';
import QuickStatsWidget from '@/components/admin/QuickStatsWidget.vue';
import SecurityAlertsWidget from '@/components/admin/SecurityAlertsWidget.vue';
import QuickLinksWidget from '@/components/admin/QuickLinksWidget.vue';
import SystemHealthWidget from '@/components/admin/SystemHealthWidget.vue';
import VersionInfoWidget from '@/components/admin/VersionInfoWidget.vue';
import CronStatusWidget from '@/components/admin/CronStatusWidget.vue';
import WidgetCustomizationPanel from '@/components/admin/WidgetCustomizationPanel.vue';
import DashboardTutorial from '@/components/admin/DashboardTutorial.vue';

const settingsStore = useSettingsStore();
const sessionStore = useSessionStore();
const dashboardStore = useDashboardStore();
const widgetsStore = useWidgetsStore();

onMounted(async () => {
    widgetsStore.loadWidgets();
    await settingsStore.fetchSettings();
    await sessionStore.checkSessionOrRedirect();
    await dashboardStore.fetchDashboardStats();
});

// User name
const userName = computed(() => sessionStore.user?.first_name + ' ' + sessionStore.user?.last_name);

// Widgets management
const sortedWidgets = computed({
    get: () => [...widgetsStore.widgets].sort((a, b) => a.order - b.order),
    set: (value) => {
        widgetsStore.reorderWidgets(value);
    },
});

const onDragEnd = () => {
    widgetsStore.saveWidgets();
};

const getWidgetComponent = (componentName: string) => {
    const components: Record<string, unknown> = {
        WelcomeWidget,
        QuickStatsWidget,
        SecurityAlertsWidget,
        QuickLinksWidget,
        SystemHealthWidget,
        VersionInfoWidget,
        CronStatusWidget,
    };
    return components[componentName];
};

const resetWidgets = () => {
    if (confirm('Are you sure you want to reset all widgets to their default positions?')) {
        widgetsStore.resetWidgets();
    }
};

const openDocumentation = () => {
    window.open('https://docs.mythical.systems', '_blank');
};

const openDiscord = () => {
    window.open('https://discord.mythical.systems', '_blank');
};
</script>

<style scoped>
.widget-item {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.widget-drag-handle {
    cursor: move;
    cursor: grab;
    user-select: none;
}

.widget-drag-handle:active {
    cursor: grabbing;
}

:deep(.sortable-ghost) {
    opacity: 0.4;
    background: linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.25)) !important;
    border: 3px dashed hsl(var(--primary)) !important;
    transform: scale(0.95);
}

:deep(.sortable-ghost) .widget-drag-handle {
    background: hsl(var(--primary) / 0.5) !important;
}

:deep(.sortable-drag) {
    opacity: 1;
    transform: rotate(3deg) scale(1.05);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    z-index: 9999 !important;
    transition: transform 0.2s ease-out;
}

:deep(.sortable-chosen) .widget-drag-handle {
    cursor: grabbing !important;
    background: hsl(var(--primary)) !important;
}
</style>
