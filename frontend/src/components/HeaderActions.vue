<!-- eslint-disable vue/no-v-html -->
<!-- eslint-disable vue/no-v-html -->
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

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
    Bell,
    User,
    LogOut,
    Sparkles,
    ExternalLink,
    MessageCircle,
    Github,
    Home,
    X,
    Zap,
    Globe,
    Share2,
    Linkedin,
    Send,
    Music,
    Twitter,
    MessageSquare,
    Youtube,
    Activity,
    Pin,
    PinOff,
} from 'lucide-vue-next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useLocalStorage } from '@vueuse/core';
import { useServerContext } from '@/composables/useServerContext';

const { t } = useI18n();
const router = useRouter();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { currentServer } = useServerContext();

interface Notification {
    id: number;
    title: string;
    message_markdown: string;
    type: 'info' | 'warning' | 'danger' | 'success' | 'error';
    is_dismissible: boolean;
    is_sticky: boolean;
    created_at: string;
    updated_at: string | null;
}

const notifications = ref<Notification[]>([]);
const loading = ref(true);
const notificationPopoverOpen = ref(false);
const dismissedNotifications = useLocalStorage<number[]>('dismissed-notifications', []);

const user = computed(() => ({
    name: sessionStore.user?.username || '',
    email: sessionStore.user?.email || '',
    avatar: sessionStore.user?.avatar || '',
    avatar_alt: sessionStore.user?.username?.charAt(0) || '',
    hasAdminPanel: sessionStore.hasPermission('ADMIN_DASHBOARD_VIEW') || false,
}));

const isAdminRoute = computed(() => router.currentRoute.value?.path.startsWith('/admin'));
const isAccountRoute = computed(() => router.currentRoute.value?.path === '/dashboard/account');

const visibleNotifications = computed(() => {
    return notifications.value.filter((notification) => {
        if (dismissedNotifications.value.includes(notification.id)) return false;
        return true;
    });
});

const unreadCount = computed(() => visibleNotifications.value.length);

const fetchNotifications = async () => {
    try {
        loading.value = true;
        const response = await axios.get('/api/user/notifications');
        notifications.value = response.data.data.notifications || [];

        dismissedNotifications.value = dismissedNotifications.value.filter((id) =>
            notifications.value.some((n) => n.id === id),
        );
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
    } finally {
        loading.value = false;
    }
};

const dismissNotification = async (notification: Notification) => {
    if (!notification.is_dismissible) return;

    const notificationId = notification.id;
    dismissedNotifications.value = [...dismissedNotifications.value, notificationId];

    try {
        await axios.post(`/api/user/notifications/${notificationId}/dismiss`);
    } catch (error) {
        console.warn('Failed to dismiss notification on backend:', error);
    }
};

const renderMarkdown = (markdown: string): string => {
    if (!markdown) return '';
    try {
        marked.setOptions({
            breaks: true,
            gfm: true,
        });
        const html = marked.parse(markdown) as string;
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'a'],
            ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
            ALLOW_DATA_ATTR: false,
        });
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return markdown;
    }
};

const getNotificationTypeColor = (type: Notification['type']) => {
    switch (type) {
        case 'success':
            return 'text-green-600 dark:text-green-400';
        case 'error':
        case 'danger':
            return 'text-red-600 dark:text-red-400';
        case 'warning':
            return 'text-yellow-600 dark:text-yellow-400';
        default:
            return 'text-blue-600 dark:text-blue-400';
    }
};

// Pinned pages
interface PinnedPage {
    id: string;
    name: string;
    path: string;
    icon?: string;
}

interface QuickAction {
    label: string;
    icon: unknown;
    action: () => void;
    isPinned?: boolean;
    pageId?: string;
}

const pinnedPages = useLocalStorage<PinnedPage[]>('pinned-pages', []);

const pinCurrentPage = () => {
    const route = router.currentRoute.value;
    const currentPath = route.path;

    // Get the page title from document.title
    // Document title format is usually: "Page Title - AppName"
    let pageTitle = document.title;

    // Remove the app name suffix if it exists
    const appName = settingsStore.appName || 'FeatherPanel';
    if (pageTitle.endsWith(` - ${appName}`)) {
        pageTitle = pageTitle.replace(` - ${appName}`, '').trim();
    }

    // Fallback to route meta title, route name, or path if document title is just app name
    if (!pageTitle || pageTitle === appName) {
        const metaTitle = route.meta?.title;
        const routeName = route.name?.toString() || '';
        const pathParts = currentPath.split('/').filter((p) => p);
        const lastPathPart = pathParts.length > 0 ? pathParts[pathParts.length - 1] : undefined;

        pageTitle = (typeof metaTitle === 'string' ? metaTitle : '') || routeName || lastPathPart || 'Page';
    }

    // For server routes, prepend server name to the title
    if (currentPath.startsWith('/server/') && currentServer.value?.name) {
        pageTitle = `${currentServer.value.name} - ${pageTitle}`;
    }

    // Check if already pinned
    if (pinnedPages.value.some((page) => page.path === currentPath)) {
        return;
    }

    pinnedPages.value.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: pageTitle,
        path: currentPath,
    });
};

const unpinPage = (pageId: string) => {
    pinnedPages.value = pinnedPages.value.filter((page) => page.id !== pageId);
};

const isCurrentPagePinned = computed(() => {
    const currentPath = router.currentRoute.value.path;
    return pinnedPages.value.some((page) => page.path === currentPath);
});

// Social media links
const socialLinks = computed(() => {
    const links = [];

    // Discord (from app_support_url)
    const appSupport = settingsStore.appSupport;
    if (appSupport && typeof appSupport === 'string' && appSupport.trim() !== '') {
        links.push({
            name: 'Discord',
            url: appSupport,
            icon: MessageCircle,
        });
    }

    // LinkedIn
    if (
        settingsStore.linkedinUrl &&
        typeof settingsStore.linkedinUrl === 'string' &&
        settingsStore.linkedinUrl.trim() !== ''
    ) {
        links.push({
            name: 'LinkedIn',
            url: settingsStore.linkedinUrl,
            icon: Linkedin,
        });
    }

    // Telegram
    if (
        settingsStore.telegramUrl &&
        typeof settingsStore.telegramUrl === 'string' &&
        settingsStore.telegramUrl.trim() !== ''
    ) {
        links.push({
            name: 'Telegram',
            url: settingsStore.telegramUrl,
            icon: Send,
        });
    }

    // TikTok
    if (
        settingsStore.tiktokUrl &&
        typeof settingsStore.tiktokUrl === 'string' &&
        settingsStore.tiktokUrl.trim() !== ''
    ) {
        links.push({
            name: 'TikTok',
            url: settingsStore.tiktokUrl,
            icon: Music,
        });
    }

    // Twitter/X
    if (
        settingsStore.twitterUrl &&
        typeof settingsStore.twitterUrl === 'string' &&
        settingsStore.twitterUrl.trim() !== ''
    ) {
        links.push({
            name: 'Twitter',
            url: settingsStore.twitterUrl,
            icon: Twitter,
        });
    }

    // WhatsApp
    if (
        settingsStore.whatsappUrl &&
        typeof settingsStore.whatsappUrl === 'string' &&
        settingsStore.whatsappUrl.trim() !== ''
    ) {
        links.push({
            name: 'WhatsApp',
            url: settingsStore.whatsappUrl,
            icon: MessageSquare,
        });
    }

    // YouTube
    if (
        settingsStore.youtubeUrl &&
        typeof settingsStore.youtubeUrl === 'string' &&
        settingsStore.youtubeUrl.trim() !== ''
    ) {
        links.push({
            name: 'YouTube',
            url: settingsStore.youtubeUrl,
            icon: Youtube,
        });
    }

    // Website
    if (
        settingsStore.websiteUrl &&
        typeof settingsStore.websiteUrl === 'string' &&
        settingsStore.websiteUrl.trim() !== ''
    ) {
        links.push({
            name: 'Website',
            url: settingsStore.websiteUrl,
            icon: Globe,
        });
    }

    // Status Page
    if (
        settingsStore.statusPageUrl &&
        typeof settingsStore.statusPageUrl === 'string' &&
        settingsStore.statusPageUrl.trim() !== ''
    ) {
        links.push({
            name: 'Status',
            url: settingsStore.statusPageUrl,
            icon: Activity,
        });
    }

    // GitHub - auto-detect from app_url if it contains github.com
    if (settingsStore.appUrl && typeof settingsStore.appUrl === 'string') {
        const githubMatch = settingsStore.appUrl.match(/github\.com\/([^/]+)/);
        if (githubMatch) {
            links.push({
                name: 'GitHub',
                url: `https://github.com/${githubMatch[1]}`,
                icon: Github,
            });
        }
    }

    return links;
});

const hasSocialLinks = computed(() => socialLinks.value.length > 0);

// Quick actions - only pinned pages
const quickActions = computed((): QuickAction[] => {
    const actions: QuickAction[] = [];

    // Only add pinned pages
    pinnedPages.value.forEach((page) => {
        actions.push({
            label: page.name,
            icon: Home, // Default icon, can be extended later
            action: () => router.push(page.path),
            isPinned: true,
            pageId: page.id,
        });
    });

    return actions;
});

const openExternalLink = (url: string | undefined): void => {
    if (url && typeof url === 'string') {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
};

let refreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    fetchNotifications();
    refreshInterval = setInterval(fetchNotifications, 5 * 60 * 1000);
});

onUnmounted(() => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
</script>

<template>
    <div class="hidden md:flex items-center gap-2 shrink-0">
        <!-- Quick Actions Dropdown -->
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="h-9 w-9" title="Quick Actions">
                    <Zap :size="18" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" align="end">
                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <!-- Pinned Pages -->
                <DropdownMenuGroup v-if="quickActions.length > 0" class="space-y-1">
                    <DropdownMenuItem
                        v-for="action in quickActions"
                        :key="action.label + (action.pageId || '')"
                        class="cursor-pointer rounded-lg px-2 py-2.5 group"
                        @click="action.action()"
                    >
                        <component :is="action.icon" :size="16" class="mr-2" />
                        <span class="font-medium flex-1">{{ action.label }}</span>
                        <Button
                            v-if="action.isPinned && action.pageId"
                            variant="ghost"
                            size="icon"
                            class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            @click.stop="unpinPage(action.pageId)"
                        >
                            <PinOff :size="12" class="text-muted-foreground" />
                        </Button>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <!-- Empty State -->
                <div v-else class="p-6 text-center">
                    <Pin :size="32" class="mx-auto mb-2 text-muted-foreground/50" />
                    <p class="text-sm text-muted-foreground mb-1">Looks like nothing is here...</p>
                    <p class="text-xs text-muted-foreground/70">Pin pages you visit frequently for quick access</p>
                </div>
                <!-- Pin Current Page -->
                <DropdownMenuSeparator
                    v-if="
                        !isCurrentPagePinned &&
                        router.currentRoute.value.path !== '/dashboard' &&
                        router.currentRoute.value.path !== '/admin'
                    "
                    class="my-2"
                />
                <DropdownMenuItem
                    v-if="
                        !isCurrentPagePinned &&
                        router.currentRoute.value.path !== '/dashboard' &&
                        router.currentRoute.value.path !== '/admin'
                    "
                    class="cursor-pointer rounded-lg px-2 py-2.5 text-primary"
                    @click="pinCurrentPage"
                >
                    <Pin :size="16" class="mr-2" />
                    <span class="font-medium">Pin This Page</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <!-- Social Media Dropdown -->
        <DropdownMenu v-if="hasSocialLinks">
            <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="h-9 w-9" title="Social Links">
                    <Share2 :size="18" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" align="end">
                <DropdownMenuLabel>Social Links</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup class="space-y-1">
                    <DropdownMenuItem
                        v-for="link in socialLinks"
                        :key="link.name"
                        class="cursor-pointer rounded-lg px-2 py-2.5"
                        @click="openExternalLink(link.url)"
                    >
                        <component :is="link.icon" :size="16" class="mr-2" />
                        <span class="font-medium">{{ link.name }}</span>
                        <ExternalLink :size="14" class="ml-auto text-muted-foreground" />
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>

        <!-- Notifications -->
        <Popover v-model:open="notificationPopoverOpen">
            <PopoverTrigger as-child>
                <Button variant="ghost" size="icon" class="h-9 w-9 relative">
                    <Bell :size="18" />
                    <Badge
                        v-if="unreadCount > 0"
                        class="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-semibold bg-red-500 text-white border-2 border-background"
                    >
                        {{ unreadCount > 9 ? '9+' : unreadCount }}
                    </Badge>
                </Button>
            </PopoverTrigger>
            <PopoverContent class="w-80 p-0" align="end">
                <div class="flex items-center justify-between p-4 border-b">
                    <h3 class="font-semibold text-sm">Notifications</h3>
                    <Button
                        v-if="visibleNotifications.length > 0 && user.hasAdminPanel"
                        variant="ghost"
                        size="sm"
                        class="h-7 text-xs"
                        @click="router.push('/admin/notifications')"
                    >
                        View All
                        <ExternalLink :size="12" class="ml-1" />
                    </Button>
                </div>
                <div class="max-h-[400px] overflow-y-auto">
                    <div v-if="loading" class="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    <div v-else-if="visibleNotifications.length === 0" class="p-8 text-center">
                        <Bell :size="32" class="mx-auto mb-2 text-muted-foreground/50" />
                        <p class="text-sm text-muted-foreground">No notifications</p>
                    </div>
                    <div v-else class="divide-y">
                        <div
                            v-for="notification in visibleNotifications.slice(0, 5)"
                            :key="notification.id"
                            class="p-4 hover:bg-muted/50 transition-colors"
                        >
                            <div class="flex items-start justify-between gap-2">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <h4
                                            class="font-semibold text-sm truncate"
                                            :class="getNotificationTypeColor(notification.type)"
                                        >
                                            {{ notification.title }}
                                        </h4>
                                    </div>
                                    <!-- eslint-disable vue/no-v-html -->
                                    <div
                                        class="text-xs text-muted-foreground line-clamp-2"
                                        v-html="renderMarkdown(notification.message_markdown)"
                                    ></div>
                                    <!-- eslint-enable vue/no-v-html -->
                                    <p class="text-[10px] text-muted-foreground/70 mt-1">
                                        {{ new Date(notification.created_at).toLocaleDateString() }}
                                    </p>
                                </div>
                                <Button
                                    v-if="notification.is_dismissible"
                                    variant="ghost"
                                    size="icon"
                                    class="h-6 w-6 shrink-0"
                                    @click="dismissNotification(notification)"
                                >
                                    <X :size="12" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>

        <!-- User Avatar -->
        <DropdownMenu>
            <DropdownMenuTrigger as-child>
                <Button variant="ghost" class="h-9 px-2 gap-2">
                    <Avatar class="h-7 w-7">
                        <AvatarImage :src="user.avatar" :alt="user.name" />
                        <AvatarFallback class="bg-primary text-primary-foreground text-xs font-semibold">
                            {{ user.avatar_alt }}
                        </AvatarFallback>
                    </Avatar>
                    <span class="hidden lg:inline-block text-sm font-medium max-w-[120px] truncate">
                        {{ user.name }}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-64" align="end">
                <DropdownMenuLabel class="p-0 font-normal">
                    <div class="flex items-center gap-3 px-2 py-3 rounded-lg bg-muted/50">
                        <Avatar class="h-10 w-10">
                            <AvatarImage :src="user.avatar" :alt="user.name" />
                            <AvatarFallback class="bg-primary text-primary-foreground font-semibold">
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

                <DropdownMenuGroup class="space-y-1">
                    <DropdownMenuItem
                        v-if="user.hasAdminPanel && !isAdminRoute"
                        class="cursor-pointer rounded-lg px-2 py-2.5"
                        @click="router.push('/admin')"
                    >
                        <Sparkles :size="16" class="mr-2" />
                        <span class="font-medium">{{ t('user.adminPanel') }}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        v-if="!isAccountRoute"
                        class="cursor-pointer rounded-lg px-2 py-2.5"
                        @click="router.push('/dashboard/account')"
                    >
                        <User :size="16" class="mr-2" />
                        <span class="font-medium">{{ t('user.account') }}</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator class="my-2" />

                <DropdownMenuItem
                    class="cursor-pointer rounded-lg px-2 py-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
                    @click="router.push({ name: 'Logout' })"
                >
                    <LogOut :size="16" class="mr-2" />
                    <span class="font-medium">{{ t('user.logOut') }}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</template>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
	line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
