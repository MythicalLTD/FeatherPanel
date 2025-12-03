<template>
    <div class="space-y-4">
        <Card>
            <CardHeader>
                <CardTitle class="text-lg">Generate Diagnostics Report</CardTitle>
                <CardDescription>
                    Create a comprehensive diagnostics bundle for troubleshooting node issues
                </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
                <!-- Format Selection -->
                <div class="space-y-3">
                    <label class="text-sm font-medium">Output Format</label>
                    <div class="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            :class="[
                                'relative flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                                options.format === 'text'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50',
                            ]"
                            @click="options.format = 'text'"
                        >
                            <div
                                :class="[
                                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                                    options.format === 'text' ? 'border-primary' : 'border-muted-foreground',
                                ]"
                            >
                                <div v-if="options.format === 'text'" class="h-2.5 w-2.5 rounded-full bg-primary"></div>
                            </div>
                            <div class="text-left">
                                <div class="text-sm font-medium">Raw Text</div>
                                <div class="text-xs text-muted-foreground">View report directly</div>
                            </div>
                        </button>
                        <button
                            type="button"
                            :class="[
                                'relative flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all',
                                options.format === 'url'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50',
                            ]"
                            @click="options.format = 'url'"
                        >
                            <div
                                :class="[
                                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                                    options.format === 'url' ? 'border-primary' : 'border-muted-foreground',
                                ]"
                            >
                                <div v-if="options.format === 'url'" class="h-2.5 w-2.5 rounded-full bg-primary"></div>
                            </div>
                            <div class="text-left">
                                <div class="text-sm font-medium">Upload URL</div>
                                <div class="text-xs text-muted-foreground">Get shareable link</div>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Options -->
                <div class="space-y-4">
                    <label class="text-sm font-medium">Report Options</label>

                    <!-- Include Endpoints -->
                    <div
                        class="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        @click="options.includeEndpoints = !options.includeEndpoints"
                    >
                        <div class="flex items-center h-5">
                            <div
                                :class="[
                                    'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                    options.includeEndpoints ? 'bg-primary border-primary' : 'border-muted-foreground',
                                ]"
                            >
                                <svg
                                    v-if="options.includeEndpoints"
                                    class="h-3 w-3 text-primary-foreground"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="3"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="text-sm font-medium">Include HTTP Endpoints</div>
                            <div class="text-xs text-muted-foreground mt-0.5">
                                Add API endpoint metadata to the diagnostics report
                            </div>
                        </div>
                    </div>

                    <!-- Include Logs -->
                    <div
                        class="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        @click="options.includeLogs = !options.includeLogs"
                    >
                        <div class="flex items-center h-5">
                            <div
                                :class="[
                                    'flex h-5 w-5 items-center justify-center rounded border-2 transition-all',
                                    options.includeLogs ? 'bg-primary border-primary' : 'border-muted-foreground',
                                ]"
                            >
                                <svg
                                    v-if="options.includeLogs"
                                    class="h-3 w-3 text-primary-foreground"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="3"
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div class="flex-1">
                            <div class="text-sm font-medium">Include Daemon Logs</div>
                            <div class="text-xs text-muted-foreground mt-0.5">
                                Attach recent Wings daemon logs for debugging
                            </div>
                        </div>
                    </div>

                    <!-- Log Lines (conditional) -->
                    <div v-if="options.includeLogs" class="ml-8 space-y-2">
                        <label class="text-sm font-medium">Number of Log Lines</label>
                        <Input
                            v-model.number="options.logLines"
                            type="number"
                            min="1"
                            max="500"
                            placeholder="200"
                            class="max-w-xs"
                        />
                        <p class="text-xs text-muted-foreground">Between 1 and 500 lines</p>
                    </div>

                    <!-- Upload API URL (conditional) -->
                    <div v-if="options.format === 'url'" class="space-y-2">
                        <label class="text-sm font-medium">Custom Upload API URL (Optional)</label>
                        <Input
                            v-model="options.uploadApiUrl"
                            type="url"
                            placeholder="https://api.example.com/upload"
                            class="font-mono text-sm"
                        />
                        <p class="text-xs text-muted-foreground">
                            Override the default upload endpoint for the diagnostics report
                        </p>
                    </div>
                </div>

                <!-- Generate Button -->
                <div class="pt-4 border-t">
                    <Button type="button" class="w-full" :loading="loading" @click="$emit('generate')">
                        <svg v-if="!loading" class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        Generate Diagnostics Report
                    </Button>
                </div>
            </CardContent>
        </Card>

        <!-- Diagnostics Result -->
        <Card v-if="result">
            <CardHeader>
                <CardTitle class="text-lg">Diagnostics Report</CardTitle>
                <CardDescription>
                    {{ result.format === 'url' ? 'Your report has been uploaded' : 'Raw diagnostics output' }}
                </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
                <!-- URL Result -->
                <div v-if="result.format === 'url' && result.url" class="space-y-3">
                    <div
                        class="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                        <svg
                            class="h-5 w-5 text-green-600 dark:text-green-400 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span class="text-sm font-medium text-green-900 dark:text-green-100">
                            Report uploaded successfully
                        </span>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm font-medium">Report URL</label>
                        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div
                                class="w-full rounded-lg border bg-muted px-3 py-2 font-mono text-xs sm:text-sm sm:leading-6"
                            >
                                <span class="break-all">{{ result.url }}</span>
                            </div>
                            <Button type="button" variant="outline" size="sm" @click="$emit('copy', result.url)">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                as="a"
                                :href="result.url"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                </svg>
                            </Button>
                        </div>
                    </div>
                </div>

                <!-- Text Result -->
                <div v-if="result.format === 'text' && result.content" class="space-y-3">
                    <div class="flex items-center justify-between">
                        <label class="text-sm font-medium">Diagnostics Output</label>
                        <Button type="button" variant="outline" size="sm" @click="$emit('copy', result.content)">
                            <svg class="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                            </svg>
                            Copy
                        </Button>
                    </div>
                    <pre
                        class="p-4 bg-muted rounded-lg border text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto"
                        >{{ result.content }}</pre
                    >
                </div>
            </CardContent>
        </Card>

        <!-- Error State -->
        <Card v-if="error">
            <CardHeader>
                <CardTitle class="text-lg flex items-center gap-2">
                    <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                    Diagnostics Failed
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <div class="space-y-3">
                        <div class="font-medium">Failed to generate diagnostics report</div>
                        <div class="text-sm">{{ error }}</div>
                    </div>
                </Alert>
            </CardContent>
        </Card>
    </div>
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

import { reactive } from 'vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import type { DiagnosticsResult } from '../types';

const options = reactive({
    format: 'text' as 'text' | 'url',
    includeEndpoints: false,
    includeLogs: false,
    logLines: 200,
    uploadApiUrl: '',
});

defineProps<{
    loading: boolean;
    result: DiagnosticsResult | null;
    error: string | null;
}>();

defineEmits<{
    generate: [];
    copy: [value: string];
}>();

defineExpose({
    options,
});
</script>
