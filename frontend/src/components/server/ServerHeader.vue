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
                v-if="props.canStart"
                variant="default"
                size="sm"
                class="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                :disabled="isStartDisabled || loading"
                data-umami-event="Start server"
                @click="$emit('start')"
            >
                <Power class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">{{ t('serverConsole.start') }}</span>
                <span class="sm:hidden">{{ t('serverConsole.start') }}</span>
            </Button>
            <Button
                v-if="props.canRestart"
                variant="outline"
                size="sm"
                class="w-full sm:w-auto"
                :disabled="isRestartDisabled || loading"
                data-umami-event="Restart server"
                @click="$emit('restart')"
            >
                <RefreshCw class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">{{ t('serverConsole.restart') }}</span>
                <span class="sm:hidden">{{ t('serverConsole.restart') }}</span>
            </Button>
            <Button
                v-if="props.canStop"
                variant="destructive"
                size="sm"
                class="w-full sm:w-auto"
                :disabled="isStopDisabled || loading"
                data-umami-event="Stop server"
                @click="$emit('stop')"
            >
                <Square class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">{{ t('serverConsole.stop') }}</span>
                <span class="sm:hidden">{{ t('serverConsole.stop') }}</span>
            </Button>
            <Button
                v-if="props.canKill"
                variant="destructive"
                size="sm"
                class="bg-red-800 hover:bg-red-900 w-full sm:w-auto"
                :disabled="isKillDisabled || loading"
                data-umami-event="Kill server"
                @click="$emit('kill')"
            >
                <Zap class="h-4 w-4 mr-2" />
                <span class="hidden sm:inline">{{ t('serverConsole.kill') }}</span>
                <span class="sm:hidden">{{ t('serverConsole.kill') }}</span>
            </Button>
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

import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Power, RefreshCw, Square, Zap } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import type { Server } from '@/composables/types/server';

defineOptions({
    name: 'ServerHeader',
});

const { t } = useI18n();

const props = withDefaults(
    defineProps<{
        server: Server | null;
        loading: boolean;
        wingsState: string;
        canStart?: boolean;
        canStop?: boolean;
        canRestart?: boolean;
        canKill?: boolean;
    }>(),
    {
        canStart: true,
        canStop: true,
        canRestart: true,
        canKill: true,
    },
);

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
    const state = currentState.value?.toLowerCase() || 'unknown';
    return state === 'running' || state === 'starting' || state === 'stopping';
});

const isRestartDisabled = computed(() => {
    const state = currentState.value?.toLowerCase() || 'unknown';
    return state !== 'running';
});

const isStopDisabled = computed(() => {
    const state = currentState.value?.toLowerCase() || 'unknown';
    return state !== 'running';
});

const isKillDisabled = computed(() => {
    const state = currentState.value?.toLowerCase() || 'unknown';
    return state === 'stopped' || state === 'offline';
});
</script>
