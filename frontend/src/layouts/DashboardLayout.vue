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

export const description = 'A sidebar that collapses to icons.';
export const iframeHeight = '800px';
export const containerClass = 'w-full h-full';
</script>

<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue';
import AppFooter from '@/components/AppFooter.vue';
import MacDock from '@/components/MacDock.vue';
import NotificationBanner from '@/components/NotificationBanner.vue';
import HeaderActions from '@/components/HeaderActions.vue';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useLocalStorage } from '@vueuse/core';
import { computed, onMounted, onUnmounted, watch, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';

export interface BreadcrumbEntry {
    text: string;
    href?: string;
    isCurrent?: boolean;
}

const props = defineProps<{ breadcrumbs?: BreadcrumbEntry[] }>();

const isSidebarVisible = computed(() => useLocalStorage('sidebar-visibility', 'visible').value !== 'hidden');

// Use the settings store to get appName for the title
const settingsStore = useSettingsStore();

// Memoize appName to avoid repeated getter calls
const appName = computed(() => settingsStore.appName || 'FeatherPanel');

// Track favicon resources for cleanup
const faviconBlobUrls = ref<Set<string>>(new Set());
const faviconImageLoaders = ref<Set<HTMLImageElement>>(new Set());
let faviconUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
let lastAppLogo: string | null = null;

// Debounced favicon update function
const updateFavicon = (appLogo: string) => {
    // Clear any pending updates
    if (faviconUpdateTimeout) {
        clearTimeout(faviconUpdateTimeout);
        faviconUpdateTimeout = null;
    }

    // Debounce favicon updates (only update if logo actually changed)
    if (lastAppLogo === appLogo) {
        return;
    }
    lastAppLogo = appLogo;

    // Clean up previous blob URLs
    faviconBlobUrls.value.forEach((url) => {
        try {
            URL.revokeObjectURL(url);
        } catch {
            // Ignore errors during cleanup
        }
    });
    faviconBlobUrls.value.clear();

    // Clean up previous image loaders
    faviconImageLoaders.value.forEach((img) => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
    });
    faviconImageLoaders.value.clear();

    // Remove existing favicon links
    const existingIcons = Array.from(
        document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'),
    );
    existingIcons.forEach((el) => el.parentNode?.removeChild(el));

    // Helper to append a favicon link with cache-busting
    const appendFavicon = (rel: string, type: string, href: string, isBlob = false) => {
        const link = document.createElement('link');
        link.rel = rel;
        if (type) link.type = type;
        const cacheBust = `fpfcache=${Date.now()}`;
        link.href = href.includes('?') ? `${href}&${cacheBust}` : `${href}?${cacheBust}`;
        document.head.appendChild(link);

        // Track blob URLs for cleanup
        if (isBlob) {
            faviconBlobUrls.value.add(href);
        }
    };

    const logoStr = String(appLogo);
    const logoLower = logoStr.toLowerCase();

    // Standard favicon links
    appendFavicon('icon', 'image/png', logoStr);
    appendFavicon('shortcut icon', 'image/png', logoStr);
    appendFavicon('apple-touch-icon', '', logoStr);

    // Handle ICO files
    if (logoLower.endsWith('.ico')) {
        appendFavicon('icon', 'image/x-icon', logoStr);
        appendFavicon('shortcut icon', 'image/x-icon', logoStr);
    }
    // Handle PNG files - only convert if necessary (skip heavy conversion for better performance)
    else if (logoLower.endsWith('.png')) {
        // For PNG files, browsers can handle them directly, so we skip the heavy canvas conversion
        // This significantly reduces memory usage and improves performance
        appendFavicon('icon', 'image/png', logoStr);
        appendFavicon('shortcut icon', 'image/png', logoStr);
    }
};

// Ensure appName is always loaded on mount
onMounted(async () => {
    // Settings are fetched once in App.vue - no need to fetch here
    // The store guards against duplicate fetches, so we can safely access settings

    // Always set document.title for the initial load
    let title = appName.value;
    if (props.breadcrumbs && props.breadcrumbs.length > 0) {
        const currentBreadcrumb = props.breadcrumbs.find((crumb) => crumb.isCurrent);
        if (currentBreadcrumb) {
            title = `${currentBreadcrumb.text} - ${appName.value}`;
        }
    }
    document.title = String(title);

    // Initialize MacDock settings from localStorage
    const savedShowDock = localStorage.getItem('dock-visible');
    const savedDockSize = localStorage.getItem('dock-size');
    const savedDockOpacity = localStorage.getItem('dock-opacity');

    // Apply dock visibility
    if (savedShowDock !== null) {
        document.documentElement.style.setProperty('--dock-display', savedShowDock === 'true' ? 'flex' : 'none');
    } else {
        // Default to hidden
        document.documentElement.style.setProperty('--dock-display', 'none');
    }

    // Apply dock size
    if (savedDockSize) {
        document.documentElement.style.setProperty('--dock-item-size', `${savedDockSize}px`);
    }

    // Apply dock opacity
    if (savedDockOpacity) {
        document.documentElement.style.setProperty('--dock-opacity', `${parseInt(savedDockOpacity) / 100}`);
    }

    // Initial favicon update
    const initialLogo = settingsStore.appLogo;
    if (initialLogo && typeof initialLogo === 'string') {
        updateFavicon(initialLogo);
    }
});

// Cleanup on unmount
onUnmounted(() => {
    // Clear pending timeout
    if (faviconUpdateTimeout) {
        clearTimeout(faviconUpdateTimeout);
        faviconUpdateTimeout = null;
    }

    // Clean up blob URLs
    faviconBlobUrls.value.forEach((url) => {
        try {
            URL.revokeObjectURL(url);
        } catch {
            // Ignore errors during cleanup
        }
    });
    faviconBlobUrls.value.clear();

    // Clean up image loaders
    faviconImageLoaders.value.forEach((img) => {
        img.onload = null;
        img.onerror = null;
        img.src = '';
    });
    faviconImageLoaders.value.clear();
});

// Update page title when breadcrumbs or appName changes
watch(
    [() => props.breadcrumbs, appName],
    ([breadcrumbs]) => {
        let title = appName.value;
        if (breadcrumbs && breadcrumbs.length > 0) {
            const currentBreadcrumb = breadcrumbs.find((crumb) => crumb.isCurrent);
            if (currentBreadcrumb) {
                title = `${currentBreadcrumb.text} - ${appName.value}`;
            }
        }
        document.title = String(title);
    },
    { immediate: false },
);

// Watch for appLogo changes with debouncing
watch(
    () => settingsStore.appLogo,
    (newLogo) => {
        if (!newLogo || typeof newLogo !== 'string') return;

        // Debounce favicon updates to avoid excessive DOM manipulation
        if (faviconUpdateTimeout) {
            clearTimeout(faviconUpdateTimeout);
        }

        faviconUpdateTimeout = setTimeout(() => {
            updateFavicon(newLogo);
            faviconUpdateTimeout = null;
        }, 100); // 100ms debounce
    },
    { immediate: false },
);
</script>

<template>
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <header
                class="flex h-14 sm:h-16 shrink-0 items-center gap-2 transition-all duration-300 ease-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
            >
                <div class="flex items-center gap-2 px-3 sm:px-4 w-full">
                    <SidebarTrigger
                        v-if="isSidebarVisible"
                        class="-ml-1 transition-transform duration-200 hover:scale-105 shrink-0"
                    />
                    <Separator
                        v-if="isSidebarVisible"
                        orientation="vertical"
                        class="mr-2 h-4 transition-opacity duration-200 shrink-0"
                    />
                    <Breadcrumb class="min-w-0 flex-1">
                        <BreadcrumbList class="flex-wrap">
                            <template v-for="(crumb, i) in breadcrumbs" :key="i">
                                <BreadcrumbItem v-if="!crumb.isCurrent" class="shrink-0">
                                    <router-link
                                        :to="crumb.href || '#'"
                                        class="transition-colors duration-200 hover:text-primary text-sm sm:text-base truncate"
                                    >
                                        {{ crumb.text }}
                                    </router-link>
                                </BreadcrumbItem>
                                <BreadcrumbItem v-else class="shrink-0">
                                    <BreadcrumbPage
                                        class="transition-colors duration-200 text-sm sm:text-base font-medium truncate"
                                    >
                                        {{ crumb.text }}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator v-if="i < (breadcrumbs?.length || 0) - 1" class="shrink-0" />
                            </template>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <HeaderActions />
                </div>
            </header>
            <br />
            <!-- Notification Banner - Above page content -->
            <NotificationBanner />
            <div class="flex flex-1 flex-col gap-4 p-3 sm:p-4 pt-0">
                <slot />
            </div>

            <!-- Footer -->
            <AppFooter />
        </SidebarInset>

        <!-- macOS Dock -->
        <MacDock />
    </SidebarProvider>
</template>

<style scoped>
/* Smooth sidebar transitions */
:deep(.sidebar) {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.sidebar-content) {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Header smooth transitions */
header {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Breadcrumb smooth transitions */
:deep(.breadcrumb-item) {
    transition: all 0.2s ease;
}

:deep(.breadcrumb-item:hover) {
    transform: translateY(-1px);
}
</style>
