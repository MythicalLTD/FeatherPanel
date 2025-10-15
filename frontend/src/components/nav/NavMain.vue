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
    <SidebarGroup class="py-1">
        <SidebarGroupLabel class="text-xs font-medium text-muted-foreground/70 px-2 py-1 mb-0.5">
            {{ name }}
        </SidebarGroupLabel>
        <SidebarMenu class="space-y-0.5">
            <SidebarMenuItem v-for="item in items" :key="item.title">
                <SidebarMenuButton
                    :tooltip="item.title"
                    :to="item.isPlugin ? undefined : item.url"
                    :href="item.isPlugin ? '#' : undefined"
                    goto
                    :is-active="item.isActive"
                    class="text-sm px-2 py-1.5 hover:bg-accent/50 transition-colors"
                    @click="handleItemClick(item, $event)"
                >
                    <!-- Render emoji if icon is a string, otherwise render Lucide icon component -->
                    <span
                        v-if="typeof item.icon === 'string'"
                        class="text-base flex items-center justify-center flex-shrink-0"
                        style="width: 1.125rem; height: 1.125rem"
                    >
                        {{ item.icon }}
                    </span>
                    <component :is="item.icon" v-else class="h-4 w-4 flex-shrink-0" />
                    <div class="flex items-center justify-between w-full min-w-0 ml-2">
                        <span class="truncate text-sm">{{ item.title }}</span>
                        <span
                            v-if="item.pluginTag && item.showBadge"
                            class="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium flex-shrink-0 ml-2"
                        >
                            {{ item.pluginTag }}
                        </span>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    </SidebarGroup>
</template>
