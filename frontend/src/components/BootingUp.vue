<!--
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();
const retryCount = ref(0);
const isRetrying = ref(false);
const retryInterval = ref<number | null>(null);
const logoUrl = 'https://cdn.mythical.systems/featherpanel/logo.png';
const discordUrl = 'https://discord.mythical.systems';

const checkIfReady = async () => {
    if (isRetrying.value) return;

    isRetrying.value = true;
    retryCount.value += 1;

    try {
        const res = await axios.get('/api/system/settings');
        const json = res.data;

        // If we get a successful response, the backend is ready
        if (json.success && json.data?.settings) {
            // Clear the booting state and reload settings
            settingsStore.setBooting(false);
            await settingsStore.fetchSettings();

            // Clear retry interval
            if (retryInterval.value) {
                clearInterval(retryInterval.value);
                retryInterval.value = null;
            }

            // Reload the page to ensure everything is properly initialized
            window.location.reload();
        }
    } catch {
        // Still getting errors, keep showing booting screen
        console.log(`FeatherPanel is still booting up... (attempt ${retryCount.value})`);
    } finally {
        isRetrying.value = false;
    }
};

onMounted(() => {
    // Start checking every 3 seconds if backend is ready
    retryInterval.value = window.setInterval(() => {
        void checkIfReady();
    }, 3000);

    // Also check immediately
    void checkIfReady();
});

onUnmounted(() => {
    if (retryInterval.value) {
        clearInterval(retryInterval.value);
        retryInterval.value = null;
    }
});
</script>

<template>
    <div
        class="fixed inset-0 z-9999 flex items-center justify-center bg-linear-to-br from-background via-background to-muted/20"
    >
        <!-- Animated background particles -->
        <div class="absolute inset-0 overflow-hidden">
            <div
                class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent_50%)]"
            ></div>
            <div
                v-for="i in 6"
                :key="i"
                class="absolute rounded-full bg-primary/5 animate-float"
                :style="{
                    width: `${20 + i * 10}px`,
                    height: `${20 + i * 10}px`,
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${3 + i * 0.5}s`,
                }"
            ></div>
        </div>

        <!-- Main content -->
        <div
            class="relative z-10 flex flex-col items-center justify-center space-y-10 px-6 text-center max-w-2xl mx-auto"
        >
            <!-- Logo with glow effect -->
            <div class="flex flex-col items-center space-y-6">
                <div class="relative">
                    <!-- Glow ring -->
                    <div
                        class="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl animate-pulse-slow"
                        style="transform: scale(1.2)"
                    ></div>
                    <!-- Logo container -->
                    <div
                        class="relative flex items-center justify-center rounded-3xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl p-8 ring-2 ring-primary/10"
                        style="width: 180px; height: 180px"
                    >
                        <img
                            :src="logoUrl"
                            alt="FeatherPanel"
                            class="w-full h-full object-contain animate-logo-float"
                            @error="
                                (e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }
                            "
                        />
                        <!-- Fallback if logo fails -->
                        <div
                            v-if="false"
                            class="absolute inset-0 flex items-center justify-center text-6xl font-bold text-primary"
                        >
                            FP
                        </div>
                    </div>
                </div>

                <!-- FeatherPanel Title -->
                <div class="space-y-2">
                    <h1
                        class="text-5xl font-bold bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-gradient"
                    >
                        FeatherPanel
                    </h1>
                    <p class="text-lg font-medium text-muted-foreground">by MythicalSystems</p>
                </div>
            </div>

            <!-- Booting Message Card -->
            <div
                class="relative w-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-8 shadow-xl space-y-6"
            >
                <!-- Loading indicator -->
                <div class="flex items-center justify-center space-x-3">
                    <div class="h-3 w-3 animate-pulse rounded-full bg-primary"></div>
                    <div class="h-3 w-3 animate-pulse rounded-full bg-primary delay-200"></div>
                    <div class="h-3 w-3 animate-pulse rounded-full bg-primary delay-400"></div>
                </div>

                <!-- Main message -->
                <div class="space-y-3">
                    <p class="text-2xl font-semibold text-foreground">
                        Wait a minute, FeatherPanel is still booting up...
                    </p>
                    <p class="text-base text-muted-foreground">
                        FeatherPanel is preparing everything for you. This should only take a moment. Please wait while
                        FeatherPanel completes its initialization process.
                    </p>
                </div>

                <!-- Status -->
                <div class="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                    <div class="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                    <span>
                        FeatherPanel is checking system status
                        <span v-if="retryCount > 0" class="font-medium text-primary"> (attempt {{ retryCount }})</span>
                    </span>
                </div>

                <!-- Progress bar -->
                <div class="space-y-2">
                    <div class="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
                        <div
                            class="h-full rounded-full bg-linear-to-r from-primary/50 via-primary to-primary/50 animate-progress-sweep"
                        ></div>
                    </div>
                    <p class="text-xs text-muted-foreground">FeatherPanel will automatically reload when ready</p>
                </div>
            </div>

            <!-- Help section -->
            <div class="w-full rounded-xl border border-border/30 bg-muted/30 backdrop-blur-sm p-6 space-y-3">
                <p class="text-sm font-medium text-foreground">Stuck on this screen?</p>
                <p class="text-sm text-muted-foreground">
                    If FeatherPanel seems to be taking longer than expected, join our Discord community for support.
                </p>
                <a
                    :href="discordUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                >
                    <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path
                            d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                        />
                    </svg>
                    Join Discord - discord.mythical.systems
                </a>
            </div>

            <!-- Footer branding -->
            <div class="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <span>Powered by</span>
                <span class="font-semibold text-foreground">MythicalSystems</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes float {
    0%,
    100% {
        transform: translateY(0px) translateX(0px);
    }
    33% {
        transform: translateY(-20px) translateX(10px);
    }
    66% {
        transform: translateY(10px) translateX(-10px);
    }
}

@keyframes logo-float {
    0%,
    100% {
        transform: translateY(0px) scale(1);
    }
    50% {
        transform: translateY(-10px) scale(1.02);
    }
}

@keyframes pulse-slow {
    0%,
    100% {
        opacity: 0.4;
    }
    50% {
        opacity: 0.6;
    }
}

@keyframes gradient {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}

@keyframes progress-sweep {
    0% {
        transform: translateX(-100%);
        opacity: 0.5;
    }
    50% {
        opacity: 1;
    }
    100% {
        transform: translateX(100%);
        opacity: 0.5;
    }
}

.animate-float {
    animation: float ease-in-out infinite;
}

.animate-logo-float {
    animation: logo-float 3s ease-in-out infinite;
}

.animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
}

.animate-gradient {
    background-size: 200% 200%;
    animation: gradient 3s ease infinite;
}

.animate-progress-sweep {
    animation: progress-sweep 2s ease-in-out infinite;
}

.delay-200 {
    animation-delay: 0.2s;
}

.delay-400 {
    animation-delay: 0.4s;
}
</style>
