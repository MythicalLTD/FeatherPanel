<script lang="ts">
export const description = 'A sidebar that collapses to icons.';
export const iframeHeight = '800px';
export const containerClass = 'w-full h-full';
</script>

<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import BackgroundPicker from '@/components/BackgroundPicker.vue';

export interface BreadcrumbEntry {
    text: string;
    href?: string;
    isCurrent?: boolean;
}

defineProps<{ breadcrumbs?: BreadcrumbEntry[] }>();
</script>

<template>
    <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
            <header
                class="flex h-16 shrink-0 items-center gap-2 transition-all duration-300 ease-out group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
            >
                <div class="flex items-center gap-2 px-4">
                    <SidebarTrigger class="-ml-1 transition-transform duration-200 hover:scale-105" />
                    <Separator orientation="vertical" class="mr-2 h-4 transition-opacity duration-200" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <template v-for="(crumb, i) in breadcrumbs" :key="i">
                                <BreadcrumbItem v-if="!crumb.isCurrent">
                                    <router-link
                                        :to="crumb.href || '#'"
                                        class="transition-colors duration-200 hover:text-primary"
                                    >
                                        {{ crumb.text }}
                                    </router-link>
                                </BreadcrumbItem>
                                <BreadcrumbItem v-else>
                                    <BreadcrumbPage class="transition-colors duration-200">
                                        {{ crumb.text }}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator v-if="i < (breadcrumbs?.length || 0) - 1" />
                            </template>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <!-- Background Picker - Right side of header -->
                <div class="ml-auto mr-4">
                    <BackgroundPicker />
                </div>
            </header>
            <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
                <slot />
            </div>
        </SidebarInset>
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
