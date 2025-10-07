<template>
    <div class="space-y-4">
        <!-- HTTP Warning -->
        <div
            v-if="typeof appUrl === 'string' && appUrl.startsWith('http://')"
            class="w-full flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-red-600 bg-red-950 shadow-2xl border-opacity-80"
        >
            <div class="flex items-center gap-3">
                <span class="text-4xl">🔒</span>
                <span class="text-2xl font-extrabold text-red-300 uppercase tracking-wide drop-shadow">
                    Insecure Connection
                </span>
            </div>
            <p class="text-lg text-red-200 font-semibold text-center">
                <strong class="text-red-300">Warning!</strong> Your panel is running over <b>HTTP</b> instead of
                <b>HTTPS</b>.<br />
                This is <span class="text-red-400 font-bold">not secure</span> and may expose sensitive data.
            </p>
            <p class="text-base text-red-400 text-center mt-2">
                Please configure your panel to use <b>HTTPS</b> for secure communication and to protect your users'
                data.
            </p>
        </div>

        <!-- Developer Mode Warning -->
        <div
            v-if="developerMode"
            class="w-full flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-red-700 bg-[#1a1a1a] shadow-2xl border-opacity-80"
        >
            <div class="flex items-center gap-3">
                <span class="text-4xl">🚨</span>
                <span class="text-2xl font-extrabold text-red-400 uppercase tracking-wide drop-shadow">
                    Developer Mode Active
                </span>
            </div>
            <p class="text-lg text-red-300 font-semibold text-center">
                <strong class="text-red-400">Warning:</strong> This panel is currently running in
                <span class="underline text-red-400">Developer Mode</span>.
                <br />
                <span class="block mt-2">
                    <b>This mode is <span class="text-red-400">intended for developers only</span>!</b>
                </span>
            </p>
            <ul class="text-base text-red-400 list-disc pl-6 text-left">
                <li>Experimental and unstable features may be visible.</li>
                <li>Additional debug logs and error details are enabled.</li>
                <li>Security restrictions may be relaxed for testing purposes.</li>
                <li>Performance and stability are <b>not guaranteed</b>.</li>
                <li>
                    <b
                        >Do <span class="underline text-red-300">NOT</span> use Developer Mode in production
                        environments!</b
                    >
                </li>
            </ul>
            <p class="text-base text-red-400 text-center mt-2">
                <strong>For developers and testers only.</strong> Disable Developer Mode before deploying to production
                for best security and user experience.
            </p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

const appUrl = computed(() => settingsStore.appUrl);
const developerMode = computed(() => settingsStore.appDeveloperMode);
</script>
