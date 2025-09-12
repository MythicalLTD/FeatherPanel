<template>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 class="text-3xl font-bold tracking-tight">{{ server?.name || t('serverConsole.title') }}</h1>
            <p class="text-muted-foreground text-lg">
                {{ server?.description || t('serverConsole.description') }}
            </p>
        </div>

        <!-- Server Control Buttons -->
        <div class="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3">
            <Button
                variant="default"
                size="sm"
                class="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                :disabled="isStartDisabled || loading"
                @click="$emit('start')"
            >
                <Power class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">Start</span>
                <span class="sm:hidden">Start</span>
            </Button>
            <Button
                variant="outline"
                size="sm"
                class="w-full sm:w-auto"
                :disabled="isRestartDisabled || loading"
                @click="$emit('restart')"
            >
                <RefreshCw class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">Restart</span>
                <span class="sm:hidden">Restart</span>
            </Button>
            <Button
                variant="destructive"
                size="sm"
                class="w-full sm:w-auto"
                :disabled="isStopDisabled || loading"
                @click="$emit('stop')"
            >
                <Square class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">Stop</span>
                <span class="sm:hidden">Stop</span>
            </Button>
            <Button
                variant="destructive"
                size="sm"
                class="bg-red-800 hover:bg-red-900 w-full sm:w-auto"
                :disabled="isKillDisabled || loading"
                @click="$emit('kill')"
            >
                <Zap class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">Kill</span>
                <span class="sm:hidden">Kill</span>
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Power, RefreshCw, Square, Zap } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { Server } from '@/types/server';

const { t } = useI18n();

interface Props {
    server: Server | null;
    loading: boolean;
    wingsState?: string;
}

const props = defineProps<Props>();

defineEmits<{
    start: [];
    restart: [];
    stop: [];
    kill: [];
}>();

// Get the current server state (prefer Wings state over server status)
const currentState = computed(() => {
    return props.wingsState || props.server?.status || 'unknown';
});

// Button logic based on server state
const isStartDisabled = computed(() => {
    const state = currentState.value.toLowerCase();
    return state === 'running' || state === 'starting' || state === 'stopping';
});

const isRestartDisabled = computed(() => {
    const state = currentState.value.toLowerCase();
    return state !== 'running';
});

const isStopDisabled = computed(() => {
    const state = currentState.value.toLowerCase();
    return state !== 'running';
});

const isKillDisabled = computed(() => {
    const state = currentState.value.toLowerCase();
    return state === 'stopped' || state === 'offline';
});
</script>
