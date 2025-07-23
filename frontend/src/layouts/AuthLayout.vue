<template>
    <div class="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
        <div class="w-full max-w-sm">
            <div class="flex flex-col items-center gap-4">
                <router-link to="/" class="flex flex-col items-center gap-2 font-medium">
                    <img :src="String(settingsStore.appLogo)" alt="MythicalPanel Logo" class="size-10" />
                    <span class="sr-only">{{ settingsStore.appName }}</span>
                </router-link>
                <h1 class="text-xl font-bold">{{ $t('auth.welcome', { appName: settingsStore.appName }) }}</h1>
            </div>
            <br />
            <router-view />
            <br />
            <div
                class="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4"
            >
                {{ $t('auth.runningOn', { version: '1.0.0' }) }} <br />
                <a href="https://mythical.systems" class="text-primary">{{ $t('auth.mythicalSystems') }}</a>
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
