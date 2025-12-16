<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems
// Copyright (c) 2025 Cassian Gherman (NaysKutzu)
// Copyright (c) 2025 FeatherPanel Contributors
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

import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { Button } from '@/components/ui/button';
import { MessageSquare, Maximize2 } from 'lucide-vue-next';
import ChatbotInterface from './ChatbotInterface.vue';
import ChatbotDialog from './ChatbotDialog.vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();
const isOpen = ref(false);
const isDialogOpen = ref(false);

// Hide chatbot on mobile devices (screens smaller than 768px)
const isMobile = useMediaQuery('(max-width: 767px)');
const isDesktop = computed(() => !isMobile.value);

// Check if chatbot is enabled
const isChatbotEnabled = computed(() => settingsStore.chatbotEnabled);

const toggleChat = () => {
    isOpen.value = !isOpen.value;
};

const openDialog = () => {
    isDialogOpen.value = true;
};

// Keyboard shortcut handler (Ctrl+K or Cmd+K)
const handleKeyboardShortcut = (event: KeyboardEvent) => {
    // Check if user is typing in an input field
    const target = event.target as HTMLElement;
    const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true';

    // Ctrl+K or Cmd+K to toggle chat
    if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !isInputField) {
        event.preventDefault();
        if (!isOpen.value) {
            toggleChat();
        }
    }
};

const shouldShowChatbot = computed(() => {
    return isDesktop.value && isChatbotEnabled.value && window.location.pathname.includes('/dashboard');
});

onMounted(async () => {
    // Settings are fetched once in App.vue - no need to fetch here
    // The store guards against duplicate fetches, so we can safely access settings
    document.addEventListener('keydown', handleKeyboardShortcut);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyboardShortcut);
});
</script>

<template>
    <!-- Only show chatbot widget on desktop devices, if chatbot is enabled, and on /dashboard pages -->
    <div v-if="shouldShowChatbot" class="fixed bottom-6 right-6 z-50">
        <!-- Floating Widget Button -->
        <div v-if="!isOpen" class="relative">
            <!-- Pulse animation ring -->
            <div class="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div class="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />

            <Button
                class="relative h-16 w-16 rounded-full shadow-2xl hover:shadow-primary/50 hover:scale-110 transition-all duration-300 bg-linear-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 border-2 border-primary/20"
                size="icon"
                @click="toggleChat"
            >
                <MessageSquare class="h-6 w-6 text-primary-foreground" />
                <span class="sr-only">{{ $t('chatbot.openChat') }}</span>
            </Button>
        </div>

        <!-- Chat Interface (Sheet) -->
        <ChatbotInterface v-model:open="isOpen" />

        <!-- Chat Dialog (Standalone Window) -->
        <ChatbotDialog v-model:open="isDialogOpen" />

        <!-- Open in Window Button (when sheet is open) -->
        <div v-if="isOpen" class="absolute bottom-24 right-6">
            <Button
                variant="outline"
                size="icon"
                class="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-background/95 backdrop-blur-sm border-2 border-border/50"
                @click="openDialog"
            >
                <Maximize2 class="h-5 w-5" />
                <span class="sr-only">Open in window</span>
            </Button>
        </div>
    </div>
</template>

<style scoped>
@keyframes ping {
    75%,
    100% {
        transform: scale(1.2);
        opacity: 0;
    }
}

.animate-ping {
    animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
