<script setup lang="ts">
import { type LucideIcon } from 'lucide-vue-next';
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
        icon?: LucideIcon;
        isActive?: boolean;
    }[];
}>();
</script>

<template>
    <SidebarGroup>
        <SidebarGroupLabel>{{ name }}</SidebarGroupLabel>
        <SidebarMenu>
            <SidebarMenuItem v-for="item in items" :key="item.title">
                <SidebarMenuButton :tooltip="item.title" :to="item.url" goto :is-active="item.isActive">
                    <component :is="item.icon" v-if="item.icon" />
                    <span>{{ item.title }}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    </SidebarGroup>
</template>
