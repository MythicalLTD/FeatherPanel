<script setup lang="ts">
import { type Component } from 'vue';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

defineProps<{
    name: string;
    items: {
        title: string;
        url: string;
        icon?: Component;
        isActive?: boolean;
    }[];
}>();
</script>

<template>
    <SidebarGroup>
        <SidebarGroupLabel class="text-xs sm:text-sm font-medium text-muted-foreground px-2 py-1.5">
            {{ name }}
        </SidebarGroupLabel>
        <SidebarMenu class="space-y-1">
            <SidebarMenuItem v-for="item in items" :key="item.title">
                <SidebarMenuButton
                    :tooltip="item.title"
                    :to="item.url"
                    goto
                    :is-active="item.isActive"
                    class="text-sm sm:text-base px-2 py-2 sm:py-2.5"
                >
                    <component :is="item.icon" v-if="item.icon" class="h-4 w-4 sm:h-5 sm:w-5" />
                    <span class="truncate">{{ item.title }}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    </SidebarGroup>
</template>
