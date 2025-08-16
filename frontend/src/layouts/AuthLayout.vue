<template>
    <div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div class="w-full max-w-sm">
            <div class="flex flex-col items-center gap-4">
                <router-link
                    to="/"
                    class="flex flex-col items-center gap-2 font-medium transition-all duration-300 hover:scale-105"
                >
                    <img
                        :src="String(settingsStore.appLogo)"
                        alt="MythicalPanel Logo"
                        class="size-10 transition-all duration-300"
                    />
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
                {{ $t('auth.runningOn', { version: '1.0.0' }) }} <br />
                <a
                    href="https://mythical.systems"
                    class="text-primary transition-colors duration-200 hover:text-primary/80"
                    >{{ $t('auth.mythicalSystems') }}</a
                >
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

onMounted(async () => {
    await settingsStore.fetchSettings();
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
</style>
