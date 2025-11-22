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
import { computed, onMounted, watch, watchEffect } from 'vue';
import { useSettingsStore } from '@/stores/settings'; // <-- Import settings store

export interface BreadcrumbEntry {
    text: string;
    href?: string;
    isCurrent?: boolean;
}

const props = defineProps<{ breadcrumbs?: BreadcrumbEntry[] }>();

const isSidebarVisible = computed(() => useLocalStorage('sidebar-visibility', 'visible').value !== 'hidden');

// Use the settings store to get appName for the title
const settingsStore = useSettingsStore();

// -- Fix: always use up-to-date settingsStore.appName instead of hardcoded fallback --
const getAppName = () => settingsStore.appName || 'FeatherPanel';

// Ensure appName is always loaded on mount
onMounted(async () => {
    await settingsStore.fetchSettings();

    // Always set document.title for the initial load
    let title = getAppName();
    if (props.breadcrumbs && props.breadcrumbs.length > 0) {
        const currentBreadcrumb = props.breadcrumbs.find((crumb) => crumb.isCurrent);
        if (currentBreadcrumb) {
            title = `${currentBreadcrumb.text} - ${getAppName()}`;
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
});

// Update page title and always use fresh settingsStore.appName
watch(
    [() => props.breadcrumbs, () => settingsStore.appName],
    ([breadcrumbs]) => {
        let title = getAppName();
        if (breadcrumbs && breadcrumbs.length > 0) {
            const currentBreadcrumb = breadcrumbs.find((crumb) => crumb.isCurrent);
            if (currentBreadcrumb) {
                title = `${currentBreadcrumb.text} - ${getAppName()}`;
            }
        }
        document.title = String(title);
    },
    { immediate: false },
);

// Dynamically update favicon whenever appLogo changes (force reloads for browsers that cache aggressively)
watchEffect(() => {
    const appLogo = settingsStore.appLogo;
    if (!appLogo) return;

    // Remove any existing favicon links to avoid browser confusion
    const existingIcons = Array.from(
        document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'),
    );
    existingIcons.forEach((el) => el.parentNode?.removeChild(el));

    // Helper to append a favicon link, with cache-busting query
    const appendFavicon = (rel: string, type: string, href: string) => {
        const link = document.createElement('link');
        link.rel = rel;
        if (type) link.type = type;
        // Add a cache-buster so browser reloads favicon (changes each time appLogo changes!)
        const cacheBust = `fpfcache=${Date.now()}`;
        // Don't double cache-bust
        link.href = href.includes('?') ? `${href}&${cacheBust}` : `${href}?${cacheBust}`;
        document.head.appendChild(link);
    };

    // Standard PNG favicon
    appendFavicon('icon', 'image/png', String(appLogo));
    // Legacy shortcut icon (for IE/Edge and some Firefox versions, can be PNG or ICO)
    appendFavicon('shortcut icon', 'image/png', String(appLogo));
    // Apple Touch icon for iOS
    appendFavicon('apple-touch-icon', '', String(appLogo));

    // If appLogo is already a .ico, add as x-icon explicitly for best browser support
    if (String(appLogo).toLowerCase().endsWith('.ico')) {
        appendFavicon('icon', 'image/x-icon', String(appLogo));
        appendFavicon('shortcut icon', 'image/x-icon', String(appLogo));
    }
    // If appLogo is a PNG, try to convert to ICO and add as favicon (in-memory conversion)
    // (This does not create a true ICO, just a fallback for some browsers.)
    else if (String(appLogo).toLowerCase().endsWith('.png')) {
        const image = new window.Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, 32, 32);
                    ctx.drawImage(image, 0, 0, 32, 32);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            appendFavicon('icon', 'image/x-icon', url);
                            appendFavicon('shortcut icon', 'image/x-icon', url);
                            // Revoke object URL after a short time
                            setTimeout(() => URL.revokeObjectURL(url), 4000);
                        }
                    }, 'image/png');
                }
            } catch {
                // If conversion fails, do nothing (already added PNG favicons above)
            }
        };
        // Force reload (in case src is the same as before)
        image.src = String(appLogo) + (String(appLogo).includes('?') ? '&' : '?') + `fpfcache=${Date.now()}`;
    }
});
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
