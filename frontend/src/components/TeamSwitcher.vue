<script setup lang="ts">
import { ChevronsUpDown, Plus } from 'lucide-vue-next';

import { ref } from 'vue';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';

const props = defineProps<{
    servers: {
        name: string;
        logo: string;
        plan: string;
    }[];
}>();

const { isMobile } = useSidebar();
const activeServer = ref(props.servers[0]);
</script>

<template>
    <SidebarMenu>
        <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <SidebarMenuButton
                        size="lg"
                        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                        <div
                            class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                        >
                            <img :src="activeServer.logo" :alt="activeServer.name" class="size-6" />
                        </div>
                        <div class="grid flex-1 text-left text-sm leading-tight">
                            <span class="truncate font-medium">
                                {{ activeServer.name }}
                            </span>
                            <span class="truncate text-xs">{{ activeServer.plan }}</span>
                        </div>
                        <ChevronsUpDown class="ml-auto" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    align="start"
                    :side="isMobile ? 'bottom' : 'right'"
                    :side-offset="4"
                >
                    <DropdownMenuLabel class="text-xs text-muted-foreground"> Servers </DropdownMenuLabel>
                    <DropdownMenuItem
                        v-for="(server, index) in servers.slice(1)"
                        :key="server.name"
                        class="gap-2 p-2"
                        @click="activeServer = server"
                    >
                        <div class="flex size-6 items-center justify-center rounded-sm border">
                            <img :src="server.logo" :alt="server.name" class="size-5 shrink-0" />
                        </div>
                        {{ server.name }}
                        <DropdownMenuShortcut>⌘{{ index + 2 }}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem class="gap-2 p-2">
                        <div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
                            <Plus class="size-4" />
                        </div>
                        <div class="font-medium text-muted-foreground">Create Server</div>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    </SidebarMenu>
</template>
