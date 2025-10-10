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

import type { NavigationItem } from '@/composables/useNavigation';
import { useNavigation } from '@/composables/useNavigation';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

const { handlePluginClick } = useNavigation();

defineProps<{
    name: string;
    items: NavigationItem[];
}>();

const handleItemClick = (item: NavigationItem, event: Event) => {
    if (item.isPlugin && (item.pluginJs || item.pluginRedirect)) {
        // Prevent navigation for plugin items
        event.preventDefault();
        // Execute plugin JavaScript or redirect
        handlePluginClick(item.pluginJs, item.pluginRedirect);
    }
    // For non-plugin items, let the normal navigation happen
};
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
                    :to="item.isPlugin ? undefined : item.url"
                    :href="item.isPlugin ? '#' : undefined"
                    goto
                    :is-active="item.isActive"
                    class="text-sm sm:text-base px-2 py-2 sm:py-2.5"
                    @click="handleItemClick(item, $event)"
                >
                    <component :is="item.icon" v-if="item.icon" class="h-4 w-4 sm:h-5 sm:w-5" />
                    <div class="flex items-center justify-between w-full min-w-0">
                        <span class="truncate">{{ item.title }}</span>
                        <span
                            v-if="item.pluginTag"
                            class="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium flex-shrink-0 ml-2"
                        >
                            {{ item.pluginTag }}
                        </span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    </SidebarGroup>
</template>
