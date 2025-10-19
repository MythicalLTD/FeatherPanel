<template>
    <div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <!-- Theme Toggle Button - Top Right -->
        <div class="absolute top-4 right-4 flex gap-2">
            <button
                class="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-all duration-200 hover:scale-105"
                :title="isDarkTheme ? $t('user.switchToLight') : $t('user.switchToDark')"
                @click="toggleTheme"
            >
                <Sun v-if="isDarkTheme" class="size-5 text-foreground" />
                <Moon v-else class="size-5 text-foreground" />
            </button>
        </div>

        <div class="w-full max-w-sm">
            <div class="flex flex-col items-center gap-4">
                <router-link
                    to="/"
                    class="flex flex-col items-center gap-2 font-medium transition-all duration-300 hover:scale-105"
                >
                    <img
                        v-if="settingsStore.appLogo && isDarkTheme"
                        :src="String(settingsStore.appLogo)"
                        :alt="String(settingsStore.appName)"
                        class="size-10 transition-all duration-300"
                    />
                    <img
                        v-else-if="settingsStore.appLogoWhite && !isDarkTheme"
                        :src="String(settingsStore.appLogoWhite)"
                        :alt="String(settingsStore.appName)"
                        class="size-10 transition-all duration-300"
                    />
                    <div
                        v-else
                        class="size-10 bg-primary rounded flex items-center justify-center text-white font-bold text-lg transition-all duration-300"
                    >
                        {{ String(settingsStore.appName).charAt(0) || 'F' }}
                    </div>
                    <span class="sr-only">{{ settingsStore.appName }}</span>
                </router-link>
                <h1 class="text-xl font-bold transition-all duration-300">
                    {{ $t('auth.welcome', { appName: settingsStore.appName }) }}
                </h1>
            </div>
            <br />
            <transition name="auth-form" mode="in-out" appear>
                <router-view />
            </transition>
            <br />
            <div
                class="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4 transition-all duration-200"
            >
                {{ $t('auth.runningOn', { version: 'v' + settingsStore.appVersion }) }} <br />
                <a
                    href="https://featherpanel.com"
                    class="text-primary transition-colors duration-200 hover:text-primary/80"
                    >{{ $t('auth.mythicalSystems') }}</a
                >
            </div>
        </div>
    </div>
</template>

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

import { onMounted, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { Sun, Moon } from 'lucide-vue-next';

const settingsStore = useSettingsStore();

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
    location.reload();
};

// Initialize theme on mount
onMounted(async () => {
    await settingsStore.fetchSettings();

    // Initialize theme
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

<style scoped>
/* Auth form transitions */
.auth-form-enter-active,
.auth-form-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.auth-form-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
}

.auth-form-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(1.05);
}

/* Logo hover effects */
img {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

img:hover {
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
}

/* Smooth text transitions */
h1 {
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Link hover effects */
a:hover {
    transform: translateY(-1px);
}

/* Theme toggle button styles */
button {
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

button:hover {
    border-color: rgba(255, 255, 255, 0.2);
}

/* Dark mode specific button styles */
:deep(.dark) button {
    border-color: rgba(255, 255, 255, 0.1);
}

:deep(.dark) button:hover {
    border-color: rgba(255, 255, 255, 0.2);
}

/* Light mode specific button styles */
:deep(.light) button {
    border-color: rgba(0, 0, 0, 0.1);
}

:deep(.light) button:hover {
    border-color: rgba(0, 0, 0, 0.2);
}
</style>
