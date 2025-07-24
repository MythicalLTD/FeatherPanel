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
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

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
                class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
            >
                <div class="flex items-center gap-2 px-4">
                    <SidebarTrigger class="-ml-1" />
                    <Separator orientation="vertical" class="mr-2 h-4" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <template v-for="(crumb, i) in breadcrumbs" :key="i">
                                <BreadcrumbItem v-if="!crumb.isCurrent">
                                    <BreadcrumbLink :href="crumb.href || '#'">{{ crumb.text }}</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbItem v-else>
                                    <BreadcrumbPage>{{ crumb.text }}</BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator v-if="i < (breadcrumbs?.length || 0) - 1" />
                            </template>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>
            <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
                <slot />
            </div>
        </SidebarInset>
    </SidebarProvider>
</template>
