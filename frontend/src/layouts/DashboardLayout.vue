<script lang="ts">
export const description = 'A sidebar that collapses to icons.';
export const iframeHeight = '800px';
export const containerClass = 'w-full h-full';
</script>

<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue';
import AppFooter from '@/components/AppFooter.vue';
import MacDock from '@/components/MacDock.vue';
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
import { computed } from 'vue';

export interface BreadcrumbEntry {
    text: string;
    href?: string;
    isCurrent?: boolean;
}

defineProps<{ breadcrumbs?: BreadcrumbEntry[] }>();

const isSidebarVisible = computed(() => useLocalStorage('sidebar-visibility', 'visible').value !== 'hidden');
</script>

<template>
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <header
                class="flex h-14 sm:h-16 shrink-0 items-center gap-2 transition-all duration-300 ease-out group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
                <div class="flex items-center gap-2 px-3 sm:px-4 w-full">
                    <SidebarTrigger
                        v-if="isSidebarVisible"
                        class="-ml-1 transition-transform duration-200 hover:scale-105 flex-shrink-0"
                    />
                    <Separator
                        v-if="isSidebarVisible"
                        orientation="vertical"
                        class="mr-2 h-4 transition-opacity duration-200 flex-shrink-0"
                    />
                    <Breadcrumb class="min-w-0 flex-1">
                        <BreadcrumbList class="flex-wrap">
                            <template v-for="(crumb, i) in breadcrumbs" :key="i">
                                <BreadcrumbItem v-if="!crumb.isCurrent" class="flex-shrink-0">
                                    <router-link
                                        :to="crumb.href || '#'"
                                        class="transition-colors duration-200 hover:text-primary text-sm sm:text-base truncate"
                                    >
                                        {{ crumb.text }}
                                    </router-link>
                                </BreadcrumbItem>
                                <BreadcrumbItem v-else class="flex-shrink-0">
                                    <BreadcrumbPage
                                        class="transition-colors duration-200 text-sm sm:text-base font-medium truncate"
                                    >
                                        {{ crumb.text }}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator v-if="i < (breadcrumbs?.length || 0) - 1" class="flex-shrink-0" />
                            </template>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>
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
