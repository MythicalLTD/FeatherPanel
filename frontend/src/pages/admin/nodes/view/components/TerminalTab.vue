<template>
    <Card>
        <CardHeader>
            <CardTitle class="text-lg flex items-center gap-2">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
                Host Terminal
            </CardTitle>
            <CardDescription>
                Execute commands on the node's host system. Commands run with system privileges via the Wings daemon.
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
            <!-- Terminal Output Container -->
            <div class="rounded-lg border bg-black overflow-hidden">
                <div ref="terminalContainer" class="w-full h-[400px] bg-black"></div>
            </div>

            <!-- Command Input -->
            <form class="flex gap-2" @submit.prevent="$emit('execute', commandInput)">
                <Input
                    v-model="commandInput"
                    placeholder="Enter command (e.g., ls -la, whoami, df -h)"
                    class="flex-1 font-mono text-sm"
                    :disabled="isExecuting"
                />
                <Button type="submit" :loading="isExecuting" :disabled="!commandInput.trim()">
                    <svg v-if="!isExecuting" class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                    Execute
                </Button>
                <Button type="button" variant="outline" @click="$emit('clear')">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                </Button>
            </form>

            <!-- Warning -->
            <div class="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <div class="flex items-start gap-3">
                    <svg
                        class="h-5 w-5 text-yellow-500 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <div class="flex-1">
                        <div class="text-sm font-semibold text-yellow-200">Administrative Access Warning</div>
                        <p class="mt-1 text-xs text-yellow-100/90">
                            Commands execute with system privileges on the host. Use caution as operations can affect
                            server stability. Long-running commands may time out after 60 seconds.
                        </p>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
// MIT License
//
// Copyright (c) 2025 MythicalSystems and Contributors
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

import { ref } from 'vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const commandInput = ref('');
const terminalContainer = ref<HTMLElement | null>(null);

defineProps<{
    isExecuting: boolean;
}>();

defineEmits<{
    execute: [command: string];
    clear: [];
}>();

defineExpose({
    terminalContainer,
    commandInput,
});
</script>
