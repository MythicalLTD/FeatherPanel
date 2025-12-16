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

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-vue-next';
import { useLocalStorage } from '@vueuse/core';
import { useNotificationsStore, type Notification } from '@/stores/notifications';

// Store dismissed notification IDs in localStorage
const dismissedNotifications = useLocalStorage<number[]>('dismissed-notifications', []);

const notificationsStore = useNotificationsStore();
const dismissing = ref<Set<number>>(new Set());
const route = useRoute();

// Use notifications from store
const notifications = computed(() => notificationsStore.notifications);
const loading = computed(() => notificationsStore.loading);

// Check if user is in admin area - don't show notifications there
const isAdminArea = computed(() => {
    return route.path.startsWith('/admin');
});

const visibleNotifications = computed(() => {
    // Don't show notifications in admin area
    if (isAdminArea.value) return [];

    return notifications.value.filter((notification) => {
        // Don't show if dismissed locally
        if (dismissedNotifications.value.includes(notification.id)) return false;

        return true;
    });
});

// Watch for notifications changes and clean up localStorage
watch(
    notifications,
    (newNotifications) => {
        // Clean up localStorage - remove IDs that no longer exist
        dismissedNotifications.value = dismissedNotifications.value.filter((id) =>
            newNotifications.some((n) => n.id === id),
        );
    },
    { immediate: true },
);

const dismissNotification = async (notification: Notification) => {
    if (!notification.is_dismissible) return;

    const notificationId = notification.id;
    dismissing.value.add(notificationId);

    try {
        // Save to localStorage immediately for instant UI update
        dismissedNotifications.value = [...dismissedNotifications.value, notificationId];

        // Dismiss via store (handles backend call)
        await notificationsStore.dismissNotification(notificationId);
    } catch (error) {
        // If something goes wrong, remove from localStorage
        dismissedNotifications.value = dismissedNotifications.value.filter((id) => id !== notificationId);
        console.error('Failed to dismiss notification:', error);
    } finally {
        dismissing.value.delete(notificationId);
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
        // Sanitize HTML using DOMPurify
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                'p',
                'br',
                'strong',
                'em',
                'u',
                's',
                'code',
                'pre',
                'blockquote',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
                'ul',
                'ol',
                'li',
                'a',
                'img',
                'hr',
                'table',
                'thead',
                'tbody',
                'tr',
                'th',
                'td',
            ],
            ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'target', 'rel'],
            ALLOW_DATA_ATTR: false,
        });
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return markdown;
    }
};

const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
        case 'success':
            return CheckCircle2;
        case 'error':
        case 'danger':
            return XCircle;
        case 'warning':
            return AlertTriangle;
        default:
            return Info;
    }
};

const getTypeVariant = (type: Notification['type']): 'default' | 'destructive' => {
    return type === 'error' || type === 'danger' ? 'destructive' : 'default';
};

const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
        case 'success':
            return 'border-green-500/50 bg-green-500/20 dark:bg-green-500/25';
        case 'error':
        case 'danger':
            return 'border-red-500/50 bg-red-500/20 dark:bg-red-500/25';
        case 'warning':
            return 'border-yellow-500/50 bg-yellow-500/20 dark:bg-yellow-500/25';
        default:
            return 'border-blue-500/50 bg-blue-500/20 dark:bg-blue-500/25';
    }
};

// Notifications are fetched once in App.vue and auto-refreshed by the store
// No need to fetch or set up intervals here
</script>

<template>
    <div v-if="!loading && visibleNotifications.length > 0" class="px-3 sm:px-4 pt-4 pb-3 pointer-events-none">
        <TransitionGroup name="notification" tag="div" class="flex flex-col gap-3 max-w-[95%] mx-auto">
            <Alert
                v-for="notification in visibleNotifications"
                :key="notification.id"
                :variant="getTypeVariant(notification.type)"
                :class="['relative shadow-md pointer-events-auto border-2', getTypeStyles(notification.type)]"
            >
                <component :is="getTypeIcon(notification.type)" class="h-4 w-4" />

                <AlertTitle class="font-semibold mb-2 text-foreground pr-8">
                    {{ notification.title }}
                </AlertTitle>
                <AlertDescription class="markdown-notification-content text-foreground/90 pr-8">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div v-html="renderMarkdown(notification.message_markdown)"></div>
                </AlertDescription>

                <Button
                    v-if="notification.is_dismissible"
                    variant="ghost"
                    size="icon"
                    class="absolute top-2 right-2 h-6 w-6 opacity-70 hover:opacity-100 z-10"
                    :disabled="dismissing.has(notification.id)"
                    @click="dismissNotification(notification)"
                >
                    <X class="h-4 w-4" />
                </Button>
            </Alert>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
    transition: all 0.3s ease;
}

.notification-enter-from {
    opacity: 0;
    transform: translateY(-20px);
}

.notification-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}

.notification-move {
    transition: transform 0.3s ease;
}

.markdown-notification-content {
    color: inherit;
    line-height: 1.6;
    word-wrap: break-word;
}

.markdown-notification-content :deep(p) {
    margin: 0 0 0.75em 0;
}

.markdown-notification-content :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-notification-content :deep(h1),
.markdown-notification-content :deep(h2),
.markdown-notification-content :deep(h3),
.markdown-notification-content :deep(h4),
.markdown-notification-content :deep(h5),
.markdown-notification-content :deep(h6) {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.25;
    color: inherit;
}

.markdown-notification-content :deep(h1) {
    font-size: 1.5rem;
    margin-top: 0;
}

.markdown-notification-content :deep(h2) {
    font-size: 1.25rem;
}

.markdown-notification-content :deep(h3) {
    font-size: 1.125rem;
}

.markdown-notification-content :deep(h4) {
    font-size: 1rem;
}

.markdown-notification-content :deep(h5) {
    font-size: 0.875rem;
}

.markdown-notification-content :deep(h6) {
    font-size: 0.75rem;
}

.markdown-notification-content :deep(ul),
.markdown-notification-content :deep(ol) {
    margin: 0.75em 0;
    padding-left: 1.5em;
}

.markdown-notification-content :deep(ul) {
    list-style-type: disc;
}

.markdown-notification-content :deep(ol) {
    list-style-type: decimal;
}

.markdown-notification-content :deep(li) {
    margin: 0.25em 0;
}

.markdown-notification-content :deep(li > ul),
.markdown-notification-content :deep(li > ol) {
    margin: 0.25em 0;
}

.markdown-notification-content :deep(strong) {
    font-weight: 600;
    color: inherit;
}

.markdown-notification-content :deep(em) {
    font-style: italic;
}

.markdown-notification-content :deep(code) {
    background-color: hsl(var(--muted) / 0.8);
    color: hsl(var(--foreground));
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
    border: 1px solid hsl(var(--border) / 0.5);
}

.markdown-notification-content :deep(pre) {
    background-color: hsl(var(--muted));
    color: hsl(var(--foreground));
    padding: 0.875rem 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 0.75em 0;
    border: 1px solid hsl(var(--border));
}

.markdown-notification-content :deep(pre code) {
    background-color: transparent;
    color: inherit;
    padding: 0;
    font-size: 0.875em;
    border: none;
}

.markdown-notification-content :deep(blockquote) {
    border-left: 4px solid hsl(var(--border));
    padding-left: 1rem;
    margin: 0.75em 0;
    color: hsl(var(--muted-foreground));
    font-style: italic;
}

.markdown-notification-content :deep(a) {
    color: hsl(var(--primary));
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: opacity 0.2s;
}

.markdown-notification-content :deep(a:hover) {
    opacity: 0.8;
}

.markdown-notification-content :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 0.75em 0;
    display: block;
}

.markdown-notification-content :deep(hr) {
    border: none;
    border-top: 1px solid hsl(var(--border));
    margin: 1em 0;
}

.markdown-notification-content :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75em 0;
    font-size: 0.875em;
}

.markdown-notification-content :deep(th),
.markdown-notification-content :deep(td) {
    border: 1px solid hsl(var(--border));
    padding: 0.5rem 0.75rem;
    text-align: left;
}

.markdown-notification-content :deep(th) {
    background-color: hsl(var(--muted));
    font-weight: 600;
}

.markdown-notification-content :deep(tr:nth-child(even)) {
    background-color: hsl(var(--muted) / 0.3);
}
</style>
