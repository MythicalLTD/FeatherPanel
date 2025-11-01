<template>
    <div class="flex flex-col items-center justify-center gap-6">
        <!-- Plugin Widgets: Top of Page -->
        <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />
        <div class="flex flex-col items-center gap-4 text-center">
            <!-- Logout Icon -->
            <div class="relative">
                <div class="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                <div class="relative bg-primary/10 rounded-full p-4">
                    <LogOutIcon class="size-12 text-primary" />
                </div>
            </div>

            <!-- Logout Message -->
            <div class="space-y-2">
                <h1 class="text-2xl font-bold text-foreground">
                    {{ $t('auth.loggingOut') }}
                </h1>
                <p class="text-muted-foreground max-w-sm">
                    {{ $t('auth.logoutMessage') }}
                </p>
            </div>

            <!-- Loading Animation -->
            <div class="flex items-center gap-2 mt-4">
                <div class="flex space-x-1">
                    <div
                        v-for="i in 3"
                        :key="i"
                        class="w-2 h-2 bg-primary rounded-full animate-bounce"
                        :style="{ animationDelay: `${(i - 1) * 0.1}s` }"
                    ></div>
                </div>
                <span class="text-sm text-muted-foreground ml-2">
                    {{ $t('auth.cleaningUp') }}
                </span>
            </div>
        </div>

        <!-- Progress Bar -->
        <div class="w-full max-w-xs">
            <div class="w-full bg-muted rounded-full h-1.5">
                <div
                    class="bg-primary h-1.5 rounded-full transition-all duration-1000 ease-out"
                    :style="{ width: `${logoutProgress}%` }"
                ></div>
            </div>
        </div>

        <!-- Manual Redirect Button (fallback) -->
        <div v-if="showManualRedirect" class="text-center">
            <p class="text-sm text-muted-foreground mb-3">
                {{ $t('auth.redirectDelay') }}
            </p>
            <Button variant="outline" size="sm" data-umami-event="Manual logout redirect" @click="manualRedirect">
                {{ $t('auth.continueToLogin') }}
            </Button>
        </div>

        <!-- Plugin Widgets: Bottom of Page -->
        <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
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

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';
import { LogOutIcon } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useI18n } from 'vue-i18n';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

const { t: $t } = useI18n();
const router = useRouter();
const sessionStore = useSessionStore();

const logoutProgress = ref(0);
const showManualRedirect = ref(false);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('auth-logout');
const widgetsTopOfPage = computed(() => getWidgets('auth-logout', 'top-of-page'));
const widgetsBottomOfPage = computed(() => getWidgets('auth-logout', 'bottom-of-page'));

// Clean up all stored data
const cleanupStorage = async () => {
    try {
        // Import and use the storage utility
        const { clearAllStorage } = await import('@/lib/storage');
        await clearAllStorage();
    } catch (error) {
        console.error('Error during storage cleanup:', error);
        // Fallback to manual cleanup
        try {
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(';').forEach((cookie) => {
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            });
        } catch (fallbackError) {
            console.error('Fallback cleanup also failed:', fallbackError);
        }
    }
};

// Simulate logout progress
const simulateProgress = () => {
    const interval = setInterval(() => {
        if (logoutProgress.value < 100) {
            logoutProgress.value += Math.random() * 15 + 5; // Random increment
        } else {
            clearInterval(interval);
            completeLogout();
        }
    }, 200);
};

// Complete logout process
const completeLogout = async () => {
    try {
        // Call the session store logout method
        await sessionStore.logout();

        // Small delay for smooth transition
        setTimeout(() => {
            router.replace({ name: 'Login' });
        }, 500);
    } catch (error) {
        console.error('Error during logout:', error);
        // Fallback: redirect anyway
        setTimeout(() => {
            router.replace({ name: 'Login' });
        }, 1000);
    }
};

// Manual redirect fallback
const manualRedirect = () => {
    router.replace({ name: 'Login' });
};

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    // Start cleanup immediately
    cleanupStorage();

    // Start progress animation
    simulateProgress();

    // Show manual redirect button after 5 seconds as fallback
    setTimeout(() => {
        showManualRedirect.value = true;
    }, 5000);
});
</script>

<style scoped>
/* Custom bounce animation */
@keyframes bounce {
    0%,
    20%,
    53%,
    80%,
    100% {
        transform: translate3d(0, 0, 0);
    }
    40%,
    43% {
        transform: translate3d(0, -8px, 0);
    }
    70% {
        transform: translate3d(0, -4px, 0);
    }
    90% {
        transform: translate3d(0, -2px, 0);
    }
}

.animate-bounce {
    animation: bounce 1s infinite;
}

/* Smooth progress bar transition */
.transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
