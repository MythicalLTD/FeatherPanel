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

<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card class="border-l-4 border-l-blue-500">
            <CardContent class="p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Memory</p>
                        <p class="text-2xl font-bold mt-1">{{ formatBytes(node.memory * 1024 * 1024, true) }}</p>
                    </div>
                    <div class="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                            />
                        </svg>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card class="border-l-4 border-l-green-500">
            <CardContent class="p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Disk</p>
                        <p class="text-2xl font-bold mt-1">{{ formatBytes(node.disk * 1024 * 1024, true) }}</p>
                    </div>
                    <div class="h-10 w-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card class="border-l-4 border-l-purple-500">
            <CardContent class="p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upload Limit</p>
                        <p class="text-2xl font-bold mt-1">
                            {{ formatBytes(node.upload_size * 1024 * 1024, true) }}
                        </p>
                    </div>
                    <div class="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <svg class="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card class="border-l-4 border-l-orange-500">
            <CardContent class="p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                        <p class="text-lg font-bold mt-1">
                            <span
                                :class="
                                    systemInfoError
                                        ? 'text-red-500'
                                        : systemInfoData
                                          ? 'text-green-500'
                                          : 'text-gray-500'
                                "
                            >
                                {{ systemInfoError ? 'Unhealthy' : systemInfoData ? 'Healthy' : 'Unknown' }}
                            </span>
                        </p>
                    </div>
                    <div class="h-10 w-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <svg class="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card';
import { formatBytes } from '@/lib/format';
import type { Node, SystemInfoResponse } from '../types';

defineProps<{
    node: Node;
    systemInfoData: SystemInfoResponse | null;
    systemInfoError: string | null;
}>();
</script>
