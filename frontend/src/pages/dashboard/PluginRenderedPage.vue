<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div v-if="loading" class="flex items-center justify-center h-full">
            <div class="text-gray-500">{{ t('common.loading') }}...</div>
        </div>
        <div v-else-if="error" class="flex items-center justify-center h-full">
            <div class="text-red-500">{{ error }}</div>
        </div>
        <div v-else-if="iframeSrc" class="relative w-full h-[calc(100vh-120px)] overflow-hidden">
            <!-- Developer Mode: Floating Reload Button -->
            <div v-if="settingsStore.appDeveloperMode" class="absolute bottom-6 right-6 z-30">
                <button
                    class="flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-2 sm:gap-2 bg-linear-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full sm:rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110 font-medium text-sm"
                    :title="t('plugins.reloadIframe')"
                    data-umami-event="Plugin reload"
                    :data-umami-event-plugin="pluginData?.plugin || 'unknown'"
                    @click="retryLoad"
                >
                    <svg
                        class="w-5 h-5"
                        :class="{ 'animate-spin': iframeLoading }"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        ></path>
                    </svg>
                    <span class="hidden sm:inline sm:ml-2">{{ t('plugins.reloadIframe') }}</span>
                </button>
            </div>

            <!-- Loading overlay -->
            <div v-if="iframeLoading" class="absolute inset-0 flex items-center justify-center z-20">
                <div class="flex flex-col items-center space-y-6">
                    <div class="relative">
                        <div
                            class="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-blue-500"
                        ></div>
                        <div class="absolute inset-0 animate-pulse rounded-full h-16 w-16 bg-blue-500/20"></div>
                    </div>
                    <div class="text-center">
                        <p class="text-slate-300 text-lg font-medium mb-2">{{ t('plugins.loadingContent') }}</p>
                        <div class="flex space-x-1">
                            <div
                                class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                style="animation-delay: 0ms"
                            ></div>
                            <div
                                class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                style="animation-delay: 150ms"
                            ></div>
                            <div
                                class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                                style="animation-delay: 300ms"
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Iframe -->
            <iframe
                ref="iframeRef"
                :src="iframeSrc"
                class="w-full h-full border-0 transition-all duration-500 ease-out plugin-iframe"
                :class="{ 'opacity-0 scale-95': iframeLoading, 'opacity-100 scale-100': !iframeLoading }"
                @load="onIframeLoad"
                @error="onIframeError"
            ></iframe>

            <!-- Error overlay -->
            <div v-if="iframeError" class="absolute inset-0 flex items-center justify-center z-20">
                <div class="text-center p-8 max-w-md">
                    <div class="relative mb-6">
                        <div class="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                                ></path>
                            </svg>
                        </div>
                        <div
                            class="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                        >
                            <span class="text-white text-xs font-bold">!</span>
                        </div>
                    </div>
                    <h3 class="text-slate-200 font-semibold text-xl mb-3">{{ t('plugins.failedToLoadContent') }}</h3>
                    <p class="text-slate-400 text-sm mb-6 leading-relaxed">{{ iframeError }}</p>
                    <button
                        class="px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                        data-umami-event="Plugin retry"
                        :data-umami-event-plugin="pluginData?.plugin || 'unknown'"
                        @click="retryLoad"
                    >
                        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            ></path>
                        </svg>
                        {{ t('plugins.retry') }}
                    </button>
                </div>
            </div>
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

import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { useRoute, useRouter } from 'vue-router';
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { useSettingsStore } from '@/stores/settings';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const settingsStore = useSettingsStore();

const loading = ref(true);
const error = ref<string | null>(null);
const iframeError = ref<string | null>(null);
const iframeLoading = ref(true);
const serverName = ref<string | null>(null);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const pluginData = ref<{
    name: string;
    plugin: string;
    component?: string;
} | null>(null);

type PluginContext = 'admin' | 'client' | 'server';

const context = computed<PluginContext>(() => {
    const path = route.path;
    if (path.startsWith('/admin')) {
        return 'admin';
    } else if (path.startsWith('/server')) {
        return 'server';
    } else {
        return 'client';
    }
});

const iframeSrc = computed(() => {
    if (!pluginData.value || !pluginData.value.component) {
        return null;
    }

    const src = `/components/${pluginData.value.plugin}/${pluginData.value.component}`;
    return src;
});

const breadcrumbs = computed(() => {
    const pageName = pluginData.value?.name || t('plugins.pluginPage');
    const crumbs = [];

    if (context.value === 'admin') {
        crumbs.push({ text: 'Admin', href: '/admin' }, { text: pageName, isCurrent: true });
    } else if (context.value === 'server') {
        crumbs.push(
            { text: t('common.dashboard'), href: '/dashboard' },
            { text: t('common.servers'), href: '/dashboard' },
            { text: serverName.value || t('common.server'), href: `/server/${route.params.uuidShort}` },
            { text: pageName, isCurrent: true },
        );
    } else {
        // client/dashboard context
        crumbs.push({ text: t('common.dashboard'), href: '/dashboard' }, { text: pageName, isCurrent: true });
    }

    return crumbs;
});

const fetchServerName = async () => {
    // Only fetch server name if we're in server context
    if (context.value !== 'server' || !route.params.uuidShort) {
        return;
    }

    try {
        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (response.data?.success && response.data?.data) {
            serverName.value = response.data.data.name;
        }
    } catch (error) {
        console.error('Failed to fetch server name:', error);
        // Non-blocking error, just use fallback in breadcrumbs
    }
};

const fetchPluginSidebar = async () => {
    try {
        loading.value = true;
        error.value = null;

        // Fetch the plugin sidebar data from the backend
        const response = await axios.get('/api/system/plugin-sidebar');

        if (response.data.success && response.data.data.sidebar) {
            const sidebar = response.data.data.sidebar;

            // Get the appropriate sidebar section based on context
            let sidebarSection: Record<
                string,
                {
                    name: string;
                    plugin: string;
                    redirect?: string;
                    component?: string;
                }
            > = {};

            if (context.value === 'admin') {
                sidebarSection = sidebar.admin || {};
            } else if (context.value === 'server') {
                sidebarSection = sidebar.server || {};
            } else {
                sidebarSection = sidebar.client || {};
            }

            // Extract the plugin path from the current route
            const fullPath = route.path;
            let pluginPath = '';

            if (context.value === 'admin') {
                pluginPath = fullPath.replace('/admin', '');
            } else if (context.value === 'server') {
                const serverPrefix = `/server/${route.params.uuidShort}`;
                pluginPath = fullPath.replace(serverPrefix, '');
            } else {
                pluginPath = fullPath.replace('/dashboard', '');
            }

            // Find the matching sidebar item
            let matchingItem = sidebarSection[pluginPath];

            // If not found, try to find by matching redirect or other close patterns
            if (!matchingItem) {
                // Try to match using redirect or key equality before any looser matching
                for (const [key, value] of Object.entries(sidebarSection)) {
                    const sidebarItem = value;
                    if (
                        // Exact key match (e.g. "/billingcore/invoices")
                        key === pluginPath ||
                        // Exact redirect match (e.g. "/billingcore/invoices")
                        (sidebarItem.redirect && pluginPath === sidebarItem.redirect) ||
                        // Fallback: pluginPath ends with the redirect (handles prefixed routes)
                        (sidebarItem.redirect && pluginPath.endsWith(sidebarItem.redirect))
                    ) {
                        matchingItem = sidebarItem;
                        break;
                    }
                }
            }

            // If we found a matching item but it doesn't have a component,
            // try to find another entry with the same plugin that has a component
            if (matchingItem && !matchingItem.component) {
                for (const [key, value] of Object.entries(sidebarSection)) {
                    const sidebarItem = value;
                    if (
                        sidebarItem.component &&
                        (key.includes(pluginPath) ||
                            pluginPath.includes(key) ||
                            (sidebarItem.plugin && pluginPath.includes(sidebarItem.plugin)))
                    ) {
                        matchingItem = sidebarItem;
                        break;
                    }
                }
            }

            if (matchingItem) {
                pluginData.value = {
                    name: matchingItem.name,
                    plugin: matchingItem.plugin,
                    component: matchingItem.component,
                };
            } else {
                // Redirect to 404 page when plugin page is not found
                router.push('/404');
                return;
            }
        } else {
            error.value = t('plugins.failedToLoadPluginData');
        }
    } catch (err) {
        console.error('Error fetching plugin sidebar:', err);
        error.value = t('plugins.failedToLoadPluginData');
    } finally {
        loading.value = false;
    }
};

const injectScrollbarStyles = () => {
    if (!iframeRef.value) return;

    try {
        const iframe = iframeRef.value;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (!iframeDoc) return;

        // Check if styles already injected
        if (iframeDoc.getElementById('featherpanel-custom-scrollbar')) return;

        // Create style element
        const style = iframeDoc.createElement('style');
        style.id = 'featherpanel-custom-scrollbar';
        style.textContent = `
            /* Custom Scrollbar Styles */
            * {
                scrollbar-width: thin;
                scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
            }

            /* Webkit browsers (Chrome, Safari, Edge) */
            *::-webkit-scrollbar {
                width: 10px;
                height: 10px;
            }

            *::-webkit-scrollbar-track {
                background: transparent;
                border-radius: 10px;
            }

            *::-webkit-scrollbar-thumb {
                background: rgba(148, 163, 184, 0.5);
                border-radius: 10px;
                border: 2px solid transparent;
                background-clip: padding-box;
            }

            *::-webkit-scrollbar-thumb:hover {
                background: rgba(148, 163, 184, 0.7);
                background-clip: padding-box;
            }

            *::-webkit-scrollbar-thumb:active {
                background: rgba(148, 163, 184, 0.9);
                background-clip: padding-box;
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                * {
                    scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
                }

                *::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.5);
                    background-clip: padding-box;
                }

                *::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 116, 139, 0.7);
                    background-clip: padding-box;
                }

                *::-webkit-scrollbar-thumb:active {
                    background: rgba(100, 116, 139, 0.9);
                    background-clip: padding-box;
                }
            }

            /* Light mode specific */
            @media (prefers-color-scheme: light) {
                * {
                    scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
                }

                *::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.4);
                    background-clip: padding-box;
                }

                *::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.6);
                    background-clip: padding-box;
                }

                *::-webkit-scrollbar-thumb:active {
                    background: rgba(148, 163, 184, 0.8);
                    background-clip: padding-box;
                }
            }
        `;

        // Inject into iframe head
        if (iframeDoc.head) {
            iframeDoc.head.appendChild(style);
        } else {
            // Fallback: wait for head to be available
            setTimeout(() => {
                if (iframeDoc.head) {
                    iframeDoc.head.appendChild(style);
                }
            }, 100);
        }
    } catch (err) {
        // Cross-origin or other error - silently fail
        console.debug('Could not inject scrollbar styles into iframe:', err);
    }
};

const onIframeLoad = () => {
    iframeError.value = null;
    iframeLoading.value = false;
    // Inject custom scrollbar styles after iframe loads
    setTimeout(() => {
        injectScrollbarStyles();
    }, 100);
};

const onIframeError = (event: Event) => {
    console.error('Iframe failed to load:', event);
    iframeError.value = 'Failed to load iframe content';
    iframeLoading.value = false;
};

const retryLoad = () => {
    iframeError.value = null;
    iframeLoading.value = true;
    // Force iframe reload by updating the src
    const currentSrc = iframeSrc.value;
    if (currentSrc) {
        // Small delay to ensure the retry is visible
        setTimeout(() => {
            const iframe = document.querySelector('iframe');
            if (iframe) {
                iframe.src = '';
                setTimeout(() => {
                    iframe.src = currentSrc;
                }, 100);
            }
        }, 100);
    }
};

onMounted(async () => {
    // Fetch settings for debug mode and other configuration
    await settingsStore.fetchSettings();

    // Fetch server name if in server context
    await fetchServerName();

    // Fetch plugin data
    await fetchPluginSidebar();
});

// Watch for route changes to reload plugin data when navigating between plugin pages
watch(
    () => route.path,
    async () => {
        // Reset iframe loading state
        iframeLoading.value = true;
        iframeError.value = null;
        // Fetch server name if in server context
        await fetchServerName();
        // Fetch new plugin data
        await fetchPluginSidebar();
    },
);
</script>

<style scoped>
/* Custom scrollbar for iframe container (fallback) */
.plugin-iframe-container {
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.plugin-iframe-container::-webkit-scrollbar {
    width: 10px;
    height: 10px;
}

.plugin-iframe-container::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
}

.plugin-iframe-container::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: padding-box;
}

.plugin-iframe-container::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.7);
    background-clip: padding-box;
}

.plugin-iframe-container::-webkit-scrollbar-thumb:active {
    background: rgba(148, 163, 184, 0.9);
    background-clip: padding-box;
}

/* Dark mode support */
.dark .plugin-iframe-container {
    scrollbar-color: rgba(100, 116, 139, 0.5) transparent;
}

.dark .plugin-iframe-container::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.5);
    background-clip: padding-box;
}

.dark .plugin-iframe-container::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 116, 139, 0.7);
    background-clip: padding-box;
}

.dark .plugin-iframe-container::-webkit-scrollbar-thumb:active {
    background: rgba(100, 116, 139, 0.9);
    background-clip: padding-box;
}
</style>