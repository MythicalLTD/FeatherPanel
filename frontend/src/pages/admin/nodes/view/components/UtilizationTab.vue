<template>
    <div class="space-y-4">
        <div v-if="loading" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <div v-else-if="error" class="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg flex items-center gap-2">
                        <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                        Utilization Data Unavailable
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <div class="space-y-3">
                            <div class="font-medium">Failed to fetch utilization data</div>
                            <div class="text-sm">{{ error }}</div>
                        </div>
                    </Alert>
                </CardContent>
            </Card>
        </div>

        <div v-else-if="data" class="space-y-4">
            <!-- CPU Usage -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">CPU Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-muted-foreground">Current Usage</span>
                            <span class="text-sm font-medium">{{ data.utilization.cpu_percent.toFixed(2) }}%</span>
                        </div>
                        <div class="w-full bg-muted rounded-full h-2">
                            <div
                                class="bg-primary h-2 rounded-full transition-all duration-300"
                                :style="{ width: Math.min(100, data.utilization.cpu_percent) + '%' }"
                            ></div>
                        </div>
                        <div class="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <div class="text-muted-foreground">1m Load</div>
                                <div class="font-medium">{{ data.utilization.load_average1 }}</div>
                            </div>
                            <div>
                                <div class="text-muted-foreground">5m Load</div>
                                <div class="font-medium">{{ data.utilization.load_average5 }}</div>
                            </div>
                            <div>
                                <div class="text-muted-foreground">15m Load</div>
                                <div class="font-medium">{{ data.utilization.load_average15 }}</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Memory Usage -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-muted-foreground">Used / Total</span>
                            <span class="text-sm font-medium">
                                {{ formatBytes(data.utilization.memory_used, true) }} /
                                {{ formatBytes(data.utilization.memory_total, true) }}
                            </span>
                        </div>
                        <div class="w-full bg-muted rounded-full h-2">
                            <div
                                class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                :style="{
                                    width: (data.utilization.memory_used / data.utilization.memory_total) * 100 + '%',
                                }"
                            ></div>
                        </div>
                        <div class="text-sm text-center text-muted-foreground">
                            {{ ((data.utilization.memory_used / data.utilization.memory_total) * 100).toFixed(1) }}%
                            used
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Disk Usage -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Disk Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-muted-foreground">Used / Total</span>
                            <span class="text-sm font-medium">
                                {{ formatBytes(data.utilization.disk_used, true) }} /
                                {{ formatBytes(data.utilization.disk_total, true) }}
                            </span>
                        </div>
                        <div class="w-full bg-muted rounded-full h-2">
                            <div
                                class="bg-green-500 h-2 rounded-full transition-all duration-300"
                                :style="{
                                    width: (data.utilization.disk_used / data.utilization.disk_total) * 100 + '%',
                                }"
                            ></div>
                        </div>
                        <div class="text-sm text-center text-muted-foreground">
                            {{ ((data.utilization.disk_used / data.utilization.disk_total) * 100).toFixed(1) }}% used
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Swap Usage -->
            <Card v-if="data.utilization.swap_total > 0">
                <CardHeader>
                    <CardTitle class="text-lg">Swap Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-sm text-muted-foreground">Used / Total</span>
                            <span class="text-sm font-medium">
                                {{ formatBytes(data.utilization.swap_used, true) }} /
                                {{ formatBytes(data.utilization.swap_total, true) }}
                            </span>
                        </div>
                        <div class="w-full bg-muted rounded-full h-2">
                            <div
                                class="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                :style="{
                                    width: (data.utilization.swap_used / data.utilization.swap_total) * 100 + '%',
                                }"
                            ></div>
                        </div>
                        <div class="text-sm text-center text-muted-foreground">
                            {{ ((data.utilization.swap_used / data.utilization.swap_total) * 100).toFixed(1) }}% used
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { formatBytes } from '@/lib/format';
import type { UtilizationResponse } from '../types';

defineProps<{
    loading: boolean;
    data: UtilizationResponse | null;
    error: string | null;
}>();
</script>
