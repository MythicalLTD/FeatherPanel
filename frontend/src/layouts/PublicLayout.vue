<template>
    <div class="min-h-screen bg-background flex flex-col">
        <!-- Simple header -->
        <header
            class="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50"
        >
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex h-16 items-center justify-between">
                    <router-link
                        to="/"
                        class="flex items-center gap-3 font-semibold hover:text-primary transition-colors"
                    >
                        <!-- Logo -->
                        <div class="flex items-center gap-2">
                            <div
                                v-if="settingsStore.appLogo && isDarkTheme"
                                class="flex h-8 w-8 shrink-0 items-center justify-center"
                            >
                                <img
                                    :src="String(settingsStore.appLogo)"
                                    :alt="String(settingsStore.appName)"
                                    class="h-8 w-8 rounded object-cover"
                                />
                            </div>
                            <div
                                v-else-if="settingsStore.appLogoWhite && !isDarkTheme"
                                class="flex h-8 w-8 shrink-0 items-center justify-center"
                            >
                                <img
                                    :src="String(settingsStore.appLogoWhite)"
                                    :alt="String(settingsStore.appName)"
                                    class="h-8 w-8 rounded object-cover"
                                />
                            </div>
                            <div
                                v-else
                                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm"
                            >
                                {{ String(settingsStore.appName).charAt(0) || 'F' }}
                            </div>
                        </div>
                        <span class="hidden sm:inline">{{ settingsStore.appName }}</span>
                    </router-link>
                    <!-- Navigation Links -->
                    <nav v-if="hasPublicPages" class="hidden md:flex items-center gap-4">
                        <router-link
                            v-if="settingsStore.knowledgebaseEnabled"
                            to="/knowledgebase"
                            class="text-sm text-muted-foreground hover:text-primary transition-colors"
                            active-class="text-primary font-medium"
                        >
                            {{ t('dashboard.knowledgebase.title') }}
                        </router-link>
                        <router-link
                            v-if="settingsStore.statusPageEnabled"
                            to="/status"
                            class="text-sm text-muted-foreground hover:text-primary transition-colors"
                            active-class="text-primary font-medium"
                        >
                            {{ t('dashboard.status.title') }}
                        </router-link>
                    </nav>
                    <div class="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-9 w-9"
                            :title="isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'"
                            @click="toggleTheme"
                        >
                            <Sun v-if="isDarkTheme" class="h-4 w-4" />
                            <Moon v-else class="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main content -->
        <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
            <slot />
        </main>

        <!-- Footer with app branding -->
        <footer class="border-t mt-auto py-6 bg-muted/30">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <!-- Left: App Logo and Name -->
                    <div class="flex items-center gap-3">
                        <div
                            v-if="settingsStore.appLogo && isDarkTheme"
                            class="flex h-8 w-8 shrink-0 items-center justify-center"
                        >
                            <img
                                :src="String(settingsStore.appLogo)"
                                :alt="String(settingsStore.appName)"
                                class="h-8 w-8 rounded object-cover"
                            />
                        </div>
                        <div
                            v-else-if="settingsStore.appLogoWhite && !isDarkTheme"
                            class="flex h-8 w-8 shrink-0 items-center justify-center"
                        >
                            <img
                                :src="String(settingsStore.appLogoWhite)"
                                :alt="String(settingsStore.appName)"
                                class="h-8 w-8 rounded object-cover"
                            />
                        </div>
                        <div
                            v-else
                            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm"
                        >
                            {{ String(settingsStore.appName).charAt(0) || 'F' }}
                        </div>
                        <div class="flex flex-col">
                            <span class="text-sm font-semibold">{{ settingsStore.appName }}</span>
                            <span class="text-xs text-muted-foreground">v{{ settingsStore.appVersion }}</span>
                        </div>
                    </div>

                    <!-- Right: Copyright -->
                    <div class="text-center sm:text-right text-sm text-muted-foreground">
                        <p>
                            &copy; {{ new Date().getFullYear() }} {{ settingsStore.appName }}.
                            <span class="hidden sm:inline">Powered by FeatherPanel.</span>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
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

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-vue-next';

const { t } = useI18n();
const settingsStore = useSettingsStore();

// Computed to check if there are any public pages available
const hasPublicPages = computed(() => {
    return settingsStore.knowledgebaseEnabled || settingsStore.statusPageEnabled;
});

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
    // Fetch settings first
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
