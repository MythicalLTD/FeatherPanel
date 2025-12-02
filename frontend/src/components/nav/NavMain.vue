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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-vue-next';
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

const { handlePluginClick } = useNavigation();
const router = useRouter();

const props = defineProps<{
    name: string;
    items: NavigationItem[];
}>();

// Check if we're on a server page
const isServerPage = computed(() => router.currentRoute.value.path.startsWith('/server'));

// Check if this group should be collapsible:
// - only on server pages
// - only when there are multiple items
// - and ONLY when all items in the group are plugin items
const isCollapsible = computed(() => {
    if (!isServerPage.value) return false;
    if (props.items.length <= 1) return false;

    return props.items.every((item) => item.isPlugin);
});

// Track open state for collapsible groups
// Default: open, but override from localStorage per group
const isOpen = ref(true);

// LocalStorage key per group name
const storageKey = computed(() => `featherpanel-sidebar-group-open-${props.name}`);

onMounted(() => {
    try {
        const stored = window.localStorage.getItem(storageKey.value);
        if (stored !== null) {
            isOpen.value = stored === 'true';
        }
    } catch {
        // Ignore storage errors (e.g., disabled storage)
    }
});

watch(
    isOpen,
    (value) => {
        try {
            window.localStorage.setItem(storageKey.value, value ? 'true' : 'false');
        } catch {
            // Ignore storage errors
        }
    },
    { flush: 'post' },
);

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
        <!-- Collapsible group for server pages with multiple items -->
        <Collapsible v-if="isCollapsible" v-model:open="isOpen" class="w-full">
            <CollapsibleTrigger as-child>
                <SidebarGroupLabel
                    class="text-xs font-medium text-muted-foreground/70 px-2 py-1 mb-0.5 cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                    <ChevronRight class="h-3 w-3 transition-transform duration-200" :class="{ 'rotate-90': isOpen }" />
                    {{ name }}
                </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
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
                                class="text-base flex items-center justify-center shrink-0"
                                style="width: 1.125rem; height: 1.125rem"
                            >
                                {{ item.icon }}
                            </span>
                            <component :is="item.icon" v-else class="h-4 w-4 shrink-0" />
                            <div class="flex items-center justify-between w-full min-w-0 ml-2">
                                <span class="truncate text-sm">{{ item.title }}</span>
                                <span
                                    v-if="item.pluginTag && item.showBadge"
                                    class="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium shrink-0 ml-2"
                                >
                                    {{ item.pluginTag }}
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </CollapsibleContent>
        </Collapsible>
        <!-- Non-collapsible group (default behavior) -->
        <template v-else>
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
                            class="text-base flex items-center justify-center shrink-0"
                            style="width: 1.125rem; height: 1.125rem"
                        >
                            {{ item.icon }}
                        </span>
                        <component :is="item.icon" v-else class="h-4 w-4 shrink-0" />
                        <div class="flex items-center justify-between w-full min-w-0 ml-2">
                            <span class="truncate text-sm">{{ item.title }}</span>
                            <span
                                v-if="item.pluginTag && item.showBadge"
                                class="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium shrink-0 ml-2"
                            >
                                {{ item.pluginTag }}
                            </span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </template>
    </SidebarGroup>
</template>
