<script setup lang="ts">
import { ChevronsUpDown, LogOut, Sparkles, UserPenIcon, Sun, Moon } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { ref, onMounted } from 'vue';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

// Theme management
const isDarkTheme = ref(true);

// Toggle theme function
const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value;

    // Update body class
    if (isDarkTheme.value) {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        localStorage.setItem('theme', 'light');
    }

    // Dispatch custom event for other components to listen to
    window.dispatchEvent(
        new CustomEvent('theme-changed', {
            detail: { theme: isDarkTheme.value ? 'dark' : 'light' },
        }),
    );
};

// Initialize theme on mount
onMounted(() => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Use saved theme or system preference, default to dark
    isDarkTheme.value = savedTheme ? savedTheme === 'dark' : prefersDark;

    // Apply theme to body
    if (isDarkTheme.value) {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
    } else {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            // Only auto-update if no manual preference
            isDarkTheme.value = e.matches;
            if (e.matches) {
                document.body.classList.add('dark');
                document.body.classList.remove('light');
            } else {
                document.body.classList.add('light');
                document.body.classList.remove('dark');
            }
        }
    });
});
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
                        <Avatar class="h-8 w-8 rounded-lg">
                            <AvatarImage :src="user.avatar" :alt="user.name" />
                            <AvatarFallback class="rounded-lg">
                                {{ user.avatar_alt }}
                            </AvatarFallback>
                        </Avatar>
                        <div class="grid flex-1 text-left text-sm leading-tight">
                            <span class="truncate font-medium">{{ user.name }}</span>
                            <span class="truncate text-xs">{{ user.email }}</span>
                        </div>
                        <ChevronsUpDown class="ml-auto size-4" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    :side="isMobile ? 'bottom' : 'right'"
                    align="end"
                    :side-offset="4"
                >
                    <DropdownMenuLabel class="p-0 font-normal">
                        <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                            <Avatar class="h-8 w-8 rounded-lg">
                                <AvatarImage :src="user.avatar" :alt="user.name" />
                                <AvatarFallback class="rounded-lg">
                                    {{ user.avatar_alt }}
                                </AvatarFallback>
                            </Avatar>
                            <div class="grid flex-1 text-left text-sm leading-tight">
                                <span class="truncate font-semibold">{{ user.name }}</span>
                                <span class="truncate text-xs">{{ user.email }}</span>
                            </div>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator v-if="user.hasAdminPanel" />
                    <DropdownMenuGroup v-if="user.hasAdminPanel">
                        <DropdownMenuItem @click="router.push('/admin')">
                            <Sparkles />
                            {{ t('user.adminPanel') }}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem @click="router.push('/dashboard/account')">
                            <UserPenIcon />
                            {{ t('user.account') }}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem class="cursor-pointer" @click="toggleTheme">
                            <Sun v-if="isDarkTheme" class="size-4" />
                            <Moon v-else class="size-4" />
                            <span class="ml-2">
                                {{ isDarkTheme ? t('user.switchToLight') : t('user.switchToDark') }}
                            </span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem @click="router.push({ name: 'Logout' })">
                        <LogOut />
                        {{ t('user.logOut') }}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    </SidebarMenu>
</template>
