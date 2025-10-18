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

import { ChevronsUpDown, LogOut, Sparkles, User, Sun, Moon } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';

const { t } = useI18n();

defineProps<{
    user: {
        name: string;
        email: string;
        avatar: string;
        avatar_alt: string;
        hasAdminPanel: boolean;
    };
}>();

const { isMobile } = useSidebar();
const router = useRouter();
const { isDark, toggleTheme } = useTheme();

const isAdminRoute = computed(() => router.currentRoute.value?.path.startsWith('/admin'));
const isAccountRoute = computed(() => router.currentRoute.value?.path === '/dashboard/account');
</script>

<template>
    <SidebarMenu>
        <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <SidebarMenuButton
                        size="lg"
                        class="group data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 hover:scale-[0.98]"
                    >
                        <div class="relative">
                            <Avatar
                                class="h-8 w-8 rounded-lg ring-2 ring-transparent group-hover:ring-primary/20 transition-all duration-200"
                            >
                                <AvatarImage :src="user.avatar" :alt="user.name" />
                                <AvatarFallback
                                    class="rounded-lg bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold"
                                >
                                    {{ user.avatar_alt }}
                                </AvatarFallback>
                            </Avatar>
                            <div
                                v-if="user.hasAdminPanel"
                                class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
                            />
                        </div>
                        <div class="grid flex-1 text-left text-sm leading-tight">
                            <span class="truncate font-semibold">{{ user.name }}</span>
                            <span class="truncate text-xs text-muted-foreground">{{ user.email }}</span>
                        </div>
                        <ChevronsUpDown class="ml-auto size-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    class="w-64 rounded-xl p-2 shadow-lg border-border/50"
                    :side="isMobile ? 'bottom' : 'right'"
                    align="end"
                    :side-offset="8"
                >
                    <!-- User Info Header -->
                    <DropdownMenuLabel class="p-0 font-normal">
                        <div class="flex items-center gap-3 px-2 py-3 rounded-lg bg-muted/50">
                            <Avatar class="h-10 w-10 rounded-lg ring-2 ring-primary/10">
                                <AvatarImage :src="user.avatar" :alt="user.name" />
                                <AvatarFallback
                                    class="rounded-lg bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold"
                                >
                                    {{ user.avatar_alt }}
                                </AvatarFallback>
                            </Avatar>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="truncate font-semibold text-sm">{{ user.name }}</span>
                                    <Badge
                                        v-if="user.hasAdminPanel"
                                        variant="secondary"
                                        class="text-[10px] px-1.5 py-0 h-4"
                                    >
                                        Admin
                                    </Badge>
                                </div>
                                <span class="truncate text-xs text-muted-foreground block">{{ user.email }}</span>
                            </div>
                        </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator class="my-2" />

                    <!-- Navigation Items -->
                    <DropdownMenuGroup class="space-y-1">
                        <DropdownMenuItem
                            v-if="user.hasAdminPanel && !isAdminRoute"
                            class="cursor-pointer rounded-lg px-2 py-2.5 group hover:bg-primary/10"
                            @click="router.push('/admin')"
                        >
                            <Sparkles class="size-4 mr-2 text-primary group-hover:scale-110 transition-transform" />
                            <span class="font-medium">{{ t('user.adminPanel') }}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            v-if="!isAccountRoute"
                            class="cursor-pointer rounded-lg px-2 py-2.5 group"
                            @click="router.push('/dashboard/account')"
                        >
                            <User class="size-4 mr-2 group-hover:scale-110 transition-transform" />
                            <span class="font-medium">{{ t('user.account') }}</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator class="my-2" />

                    <!-- Settings -->
                    <DropdownMenuGroup class="space-y-1">
                        <DropdownMenuItem class="cursor-pointer rounded-lg px-2 py-2.5 group" @click="toggleTheme">
                            <div class="flex items-center justify-center w-4 h-4 mr-2 relative">
                                <transition name="theme-icon" mode="out-in">
                                    <Sun
                                        v-if="isDark"
                                        :key="'sun'"
                                        class="size-4 text-yellow-500 group-hover:rotate-90 transition-transform duration-300"
                                    />
                                    <Moon
                                        v-else
                                        :key="'moon'"
                                        class="size-4 text-blue-500 group-hover:-rotate-12 transition-transform duration-300"
                                    />
                                </transition>
                            </div>
                            <span class="font-medium">{{
                                isDark ? t('user.switchToLight') : t('user.switchToDark')
                            }}</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator class="my-2" />

                    <!-- Logout -->
                    <DropdownMenuItem
                        class="cursor-pointer rounded-lg px-2 py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10 group"
                        @click="router.push({ name: 'Logout' })"
                    >
                        <LogOut class="size-4 mr-2 group-hover:scale-110 transition-transform" />
                        <span class="font-medium">{{ t('user.logOut') }}</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    </SidebarMenu>
</template>

<style scoped>
.theme-icon-enter-active,
.theme-icon-leave-active {
    transition: all 0.2s ease;
}

.theme-icon-enter-from {
    opacity: 0;
    transform: scale(0.8) rotate(-90deg);
}

.theme-icon-leave-to {
    opacity: 0;
    transform: scale(0.8) rotate(90deg);
}
</style>
