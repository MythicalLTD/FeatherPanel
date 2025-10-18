<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems and Contributors
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

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import {
    ArrowLeft,
    ArrowRight,
    RefreshCw,
    Home,
    Copy,
    Scissors,
    Clipboard,
    Settings,
    HelpCircle,
} from 'lucide-vue-next';
import { useToast } from 'vue-toastification';

const router = useRouter();
const { t } = useI18n();
const settingsStore = useSettingsStore();
const toast = useToast();

const visible = ref(false);
const x = ref(0);
const y = ref(0);
const hasSelection = ref(false);
const canPaste = ref(false);

// Context menu options
const showNavigation = ref(true);
const showClipboard = ref(true);
const showQuickActions = ref(true);

const menuStyle = computed(() => ({
    position: 'fixed' as const,
    top: `${y.value}px`,
    left: `${x.value}px`,
    zIndex: 9999,
}));

const canGoBack = computed(() => window.history.length > 1);
const canGoForward = computed(() => false); // Browser doesn't expose forward state

const show = (clientX: number, clientY: number) => {
    x.value = clientX;
    y.value = clientY;
    visible.value = true;

    // Check if there's selected text
    const selection = window.getSelection();
    hasSelection.value = !!(selection && selection.toString().trim().length > 0);

    // Check if clipboard is available for paste
    checkClipboardAccess();

    // Adjust position if menu would go off-screen
    setTimeout(() => {
        const menu = document.querySelector('.global-context-menu') as HTMLElement;
        if (menu) {
            const rect = menu.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            if (rect.right > windowWidth) {
                x.value = windowWidth - rect.width - 10;
            }
            if (rect.bottom > windowHeight) {
                y.value = windowHeight - rect.height - 10;
            }
        }
    }, 0);
};

const checkClipboardAccess = async () => {
    try {
        // Check if clipboard API is available
        canPaste.value = !!(navigator.clipboard && typeof navigator.clipboard.readText === 'function');
    } catch {
        canPaste.value = false;
    }
};

const hide = () => {
    visible.value = false;
};

const goBack = () => {
    router.back();
    hide();
};

const goForward = () => {
    router.forward();
    hide();
};

const refresh = () => {
    window.location.reload();
    hide();
};

const goHome = () => {
    router.push('/dashboard');
    hide();
};

const copyUrl = async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(t('common.copiedToClipboard'));
    } catch (error) {
        console.error('Failed to copy URL:', error);
        toast.error(t('common.failedToCopy'));
    }
    hide();
};

const cutText = async () => {
    try {
        const selection = window.getSelection();
        if (selection && selection.toString()) {
            await navigator.clipboard.writeText(selection.toString());
            document.execCommand('delete');
            toast.success(t('common.copied'));
        }
    } catch (error) {
        console.error('Failed to cut text:', error);
        toast.error(t('common.failedToCopy'));
    }
    hide();
};

const copyText = async () => {
    try {
        const selection = window.getSelection();
        if (selection && selection.toString()) {
            await navigator.clipboard.writeText(selection.toString());
            toast.success(t('common.copiedToClipboard'));
        }
    } catch (error) {
        console.error('Failed to copy text:', error);
        toast.error(t('common.failedToCopy'));
    }
    hide();
};

const pasteText = async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.execCommand('insertText', false, text);
        hide();
    } catch (error) {
        console.error('Failed to paste text:', error);
        toast.error(t('common.failedToCopy'));
        hide();
    }
};

const openSettings = () => {
    router.push('/dashboard/account?tab=appearance');
    hide();
};

const openHelp = () => {
    const supportUrl = settingsStore.appSupport || 'https://discord.mythical.systems';
    window.open(supportUrl as string, '_blank');
    hide();
};

const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (visible.value && !target.closest('.global-context-menu')) {
        hide();
    }
};

const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && visible.value) {
        hide();
    }
};

const handleContextMenuOptionsChange = (event: CustomEvent) => {
    const { showNavigation: nav, showClipboard: clip, showQuickActions: quick } = event.detail;
    showNavigation.value = nav;
    showClipboard.value = clip;
    showQuickActions.value = quick;
};

onMounted(async () => {
    // Ensure settings are loaded
    await settingsStore.fetchSettings();

    // Load context menu options from localStorage
    const savedShowNavigation = localStorage.getItem('context-menu-show-navigation');
    if (savedShowNavigation !== null) {
        showNavigation.value = savedShowNavigation === 'true';
    }

    const savedShowClipboard = localStorage.getItem('context-menu-show-clipboard');
    if (savedShowClipboard !== null) {
        showClipboard.value = savedShowClipboard === 'true';
    }

    const savedShowQuickActions = localStorage.getItem('context-menu-show-quick-actions');
    if (savedShowQuickActions !== null) {
        showQuickActions.value = savedShowQuickActions === 'true';
    }

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('context-menu-options-change', handleContextMenuOptionsChange as EventListener);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleEscape);
    window.removeEventListener('context-menu-options-change', handleContextMenuOptionsChange as EventListener);
});

// Expose the show method to parent
defineExpose({
    show,
    hide,
});
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition-all duration-100 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-75 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div
                v-if="visible"
                class="global-context-menu min-w-[220px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
                :style="menuStyle"
                @click.stop
            >
                <!-- Clipboard Actions (show only when text is selected or paste is available AND enabled) -->
                <template v-if="showClipboard && (hasSelection || canPaste)">
                    <button
                        v-if="hasSelection"
                        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        @click="cutText"
                    >
                        <Scissors class="h-4 w-4 mr-2" />
                        {{ t('common.cut') }}
                    </button>

                    <button
                        v-if="hasSelection"
                        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        @click="copyText"
                    >
                        <Copy class="h-4 w-4 mr-2" />
                        {{ t('common.copy') }}
                    </button>

                    <button
                        v-if="canPaste"
                        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        @click="pasteText"
                    >
                        <Clipboard class="h-4 w-4 mr-2" />
                        {{ t('common.paste') }}
                    </button>

                    <div class="my-1 h-px bg-border"></div>
                </template>

                <!-- Navigation (conditional) -->
                <template v-if="showNavigation">
                    <button
                        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                        :disabled="!canGoBack"
                        @click="goBack"
                    >
                        <ArrowLeft class="h-4 w-4 mr-2" />
                        {{ t('common.back') }}
                    </button>

                    <button
                        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                        :disabled="!canGoForward"
                        @click="goForward"
                    >
                        <ArrowRight class="h-4 w-4 mr-2" />
                        {{ t('common.forward') }}
                    </button>

                    <button
                        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        @click="refresh"
                    >
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{ t('common.refresh') }}
                    </button>

                    <div class="my-1 h-px bg-border"></div>
                </template>

                <!-- Quick Actions (conditional) -->
                <template v-if="showQuickActions">
                    <button
                        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        @click="goHome"
                    >
                        <Home class="h-4 w-4 mr-2" />
                        {{ t('common.home') }}
                    </button>

                    <button
                        class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        @click="copyUrl"
                    >
                        <Copy class="h-4 w-4 mr-2" />
                        {{ t('common.copyUrl') }}
                    </button>

                    <div class="my-1 h-px bg-border"></div>
                </template>

                <!-- Settings & Help (always shown) -->
                <button
                    class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="openSettings"
                >
                    <Settings class="h-4 w-4 mr-2" />
                    {{ t('common.settings') }}
                </button>

                <button
                    class="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    @click="openHelp"
                >
                    <HelpCircle class="h-4 w-4 mr-2" />
                    {{ t('common.help') }}
                </button>
            </div>
        </Transition>
    </Teleport>
</template>
