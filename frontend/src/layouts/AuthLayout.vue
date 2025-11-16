<template>
    <div
        class="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6 md:p-10"
    >
        <!-- Decorative background elements - pointer-events-none to prevent blocking -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
            <div
                class="absolute -top-1/2 -right-1/2 h-[800px] w-[800px] rounded-full bg-primary/5 blur-3xl transition-all duration-1000"
            />
            <div
                class="absolute -bottom-1/2 -left-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl transition-all duration-1000 delay-300"
            />
            <div
                class="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-3xl transition-all duration-1000 delay-150"
            />
        </div>

        <!-- Theme toggle button -->
        <div class="pointer-events-auto absolute top-4 right-4 z-50">
            <Button
                variant="ghost"
                size="icon"
                class="h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 hover:shadow-lg transition-all duration-200"
                :title="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
                @click="toggleTheme"
            >
                <Sun v-if="isDarkTheme" class="h-4 w-4" />
                <Moon v-else class="h-4 w-4" />
            </Button>
        </div>

        <!-- Main content -->
        <div class="pointer-events-auto relative z-10 w-full max-w-md">
            <!-- Logo and title section -->
            <div class="mb-6 flex flex-col items-center gap-4">
                <router-link
                    to="/"
                    class="group flex flex-col items-center gap-3 font-medium transition-all duration-300 hover:scale-105"
                >
                    <div class="relative">
                        <img
                            v-if="settingsStore.appLogo && isDarkTheme"
                            :src="String(settingsStore.appLogo)"
                            :alt="String(settingsStore.appName)"
                            class="size-20 rounded-2xl transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30 ring-2 ring-border/50 group-hover:ring-primary/30"
                        />
                        <img
                            v-else-if="settingsStore.appLogoWhite && !isDarkTheme"
                            :src="String(settingsStore.appLogoWhite)"
                            :alt="String(settingsStore.appName)"
                            class="size-20 rounded-2xl transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30 ring-2 ring-border/50 group-hover:ring-primary/30"
                        />
                        <div
                            v-else
                            class="size-20 rounded-2xl bg-linear-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-primary/30 ring-2 ring-primary/20 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/40 group-hover:scale-105 group-hover:ring-primary/40"
                        >
                            {{ String(settingsStore.appName).charAt(0) || 'F' }}
                        </div>
                        <!-- Glow effect -->
                        <div
                            class="pointer-events-none absolute inset-0 rounded-2xl bg-primary/20 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        />
                    </div>
                    <h1
                        class="text-3xl font-bold bg-linear-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent transition-all duration-300"
                    >
                        {{ $t('auth.welcome', { appName: settingsStore.appName }) }}
                    </h1>
                    <span class="sr-only">{{ settingsStore.appName }}</span>
                </router-link>
            </div>

            <!-- Auth form with card styling -->
            <div class="relative">
                <div
                    class="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/10 transition-all duration-300"
                >
                    <transition name="auth-form" mode="in-out" appear>
                        <div class="relative z-10">
                            <router-view />
                        </div>
                    </transition>
                </div>
            </div>

            <!-- Footer -->
            <div class="mt-6 text-center text-xs text-muted-foreground transition-all duration-200">
                <p class="mb-2 font-medium">
                    {{ $t('auth.runningOn', { version: 'v' + settingsStore.appVersion }) }}
                </p>
                <a
                    href="https://featherpanel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 text-primary transition-all duration-200 hover:text-primary/80 hover:underline underline-offset-4 font-medium"
                >
                    {{ $t('auth.mythicalSystems') }}
                    <ExternalLink class="h-3.5 w-3.5" />
                </a>
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

import { onMounted, onUnmounted, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { Sun, Moon, ExternalLink } from 'lucide-vue-next';

const settingsStore = useSettingsStore();

// Theme management
const isDarkTheme = ref(true);
let themeMediaQuery: MediaQueryList | null = null;

// Apply theme to document
const applyTheme = (dark: boolean) => {
    if (dark) {
        document.body.classList.add('dark');
        document.body.classList.remove('light');
    } else {
        document.body.classList.add('light');
        document.body.classList.remove('dark');
    }
};

// Toggle theme
const toggleTheme = () => {
    isDarkTheme.value = !isDarkTheme.value;
    localStorage.setItem('theme', isDarkTheme.value ? 'dark' : 'light');
    applyTheme(isDarkTheme.value);
};

// Handle system theme changes
const handleThemeChange = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem('theme')) {
        // Only auto-update if no manual preference
        isDarkTheme.value = e.matches;
        applyTheme(e.matches);
    }
};

// Initialize theme on mount
onMounted(async () => {
    await settingsStore.fetchSettings();

    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Use saved theme or system preference, default to dark
    isDarkTheme.value = savedTheme ? savedTheme === 'dark' : prefersDark;
    applyTheme(isDarkTheme.value);

    // Listen for system theme changes
    themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    themeMediaQuery.addEventListener('change', handleThemeChange);
});

// Cleanup on unmount
onUnmounted(() => {
    if (themeMediaQuery) {
        themeMediaQuery.removeEventListener('change', handleThemeChange);
    }
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
    transform: translateY(8px) scale(0.99);
}

.auth-form-leave-to {
    opacity: 0;
    transform: translateY(-8px) scale(1.01);
}

/* Ensure buttons and interactive elements are clickable */
:deep(button),
:deep(a),
:deep(input),
:deep(select),
:deep(textarea) {
    pointer-events: auto;
    position: relative;
    z-index: 1;
}

/* Card styling improvements */
.rounded-2xl {
    position: relative;
    isolation: isolate;
}

/* Responsive adjustments */
@media (max-width: 640px) {
    .rounded-2xl {
        padding: 1.25rem;
    }
}
</style>
