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

            <!-- APP_URL Misconfiguration Warning -->
            <AlertDialog
                :open="showAppUrlWarning"
                @update:open="
                    (val: boolean) => {
                        if (!val) dismissAppUrlWarning();
                    }
                "
            >
                <AlertDialogContent class="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle class="flex items-center gap-2 text-red-600 dark:text-red-500">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                            </svg>
                            WOAH! APP_URL Mismatch Detected
                        </AlertDialogTitle>
                        <AlertDialogDescription class="space-y-4 pt-4">
                            <p class="text-base font-semibold text-foreground">
                                Your panel is configured with the default APP_URL, which will cause serious issues!
                            </p>

                            <div
                                class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-4"
                            >
                                <p class="text-sm text-red-800 dark:text-red-400 font-medium mb-2">
                                    Current APP_URL:
                                    <code class="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">{{
                                        currentAppUrl
                                    }}</code>
                                </p>
                                <p class="text-sm text-red-800 dark:text-red-400">
                                    This is the default example URL and needs to be updated immediately!
                                </p>
                            </div>

                            <div class="space-y-3">
                                <p class="text-sm font-semibold text-foreground">This misconfiguration will cause:</p>
                                <ul class="list-disc list-inside space-y-2 text-sm text-muted-foreground pl-2">
                                    <li>
                                        <strong class="text-foreground">Wings Communication Failures:</strong> Wings
                                        daemon won't be able to properly communicate with your panel
                                    </li>
                                    <li>
                                        <strong class="text-foreground">Broken Email Links:</strong> Password resets,
                                        server notifications, and other emails will link to the wrong panel
                                    </li>
                                    <li>
                                        <strong class="text-foreground">OAuth/SSO Issues:</strong> Third-party
                                        authentication and integrations won't work correctly
                                    </li>
                                    <li>
                                        <strong class="text-foreground">Security Vulnerabilities:</strong> CORS and CSRF
                                        protections may not function properly
                                    </li>
                                </ul>
                            </div>

                            <div
                                class="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-4"
                            >
                                <p class="text-sm font-semibold text-blue-900 dark:text-blue-400 mb-2">
                                    How to fix this:
                                </p>
                                <ol
                                    class="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-400 pl-2"
                                >
                                    <li>Go to <strong>Settings → General</strong></li>
                                    <li>
                                        Update the <strong>Application URL</strong> field to your actual panel URL
                                        (e.g.,
                                        <code class="bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded">{{
                                            detectedAppUrl
                                        }}</code
                                        >)
                                    </li>
                                    <li>Make sure to include the protocol (https:// or http://)</li>
                                    <li>Do NOT include a trailing slash</li>
                                    <li>Click <strong>Save Changes</strong></li>
                                </ol>
                            </div>

                            <p class="text-sm text-muted-foreground">
                                <strong>Note:</strong> After updating, you may need to restart Wings daemons on all
                                nodes for the changes to take effect.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter class="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel @click="dismissAppUrlWarning">I'll Fix This Later</AlertDialogCancel>
                        <AlertDialogAction
                            class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                            @click="goToSettings"
                        >
                            Go to Settings
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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

import { computed, onMounted, ref } from 'vue';
import draggable from 'vuedraggable';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BookOpen, MessageCircle as Discord, Settings, Sparkles } from 'lucide-vue-next';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useDashboardStore } from '@/stores/dashboard';
import { useWidgetsStore } from '@/stores/widgets';
import { useRouter } from 'vue-router';

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
const router = useRouter();

onMounted(async () => {
    widgetsStore.loadWidgets();
    await settingsStore.fetchSettings();
    await sessionStore.checkSessionOrRedirect();
    await dashboardStore.fetchDashboardStats();

    // Check APP_URL after settings are loaded
    checkAppUrlConfiguration();
});

// User name
const userName = computed(() => sessionStore.user?.first_name + ' ' + sessionStore.user?.last_name);

// APP_URL Warning Logic
const showAppUrlWarning = ref(false);
const APP_URL_WARNING_DISMISSED_KEY = 'app-url-warning-dismissed';

const currentAppUrl = computed(() => settingsStore.appUrl || 'https://featherpanel.mythical.systems');
const detectedAppUrl = computed(() => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'https://your-panel.example.com';
});

const checkAppUrlConfiguration = () => {
    const defaultUrl = 'https://featherpanel.mythical.systems';
    const isDismissed = localStorage.getItem(APP_URL_WARNING_DISMISSED_KEY);

    // Show warning if APP_URL is the default and user hasn't dismissed it
    if (currentAppUrl.value === defaultUrl && !isDismissed) {
        showAppUrlWarning.value = true;
    }
};

const dismissAppUrlWarning = () => {
    // Store dismissal in localStorage (valid for this session until they fix it)
    localStorage.setItem(APP_URL_WARNING_DISMISSED_KEY, 'true');
    showAppUrlWarning.value = false;
};

const goToSettings = () => {
    showAppUrlWarning.value = false;
    router.push('/admin/setting');
};

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
