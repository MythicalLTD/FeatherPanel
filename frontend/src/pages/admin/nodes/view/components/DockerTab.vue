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
                        Docker Data Unavailable
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <div class="space-y-3">
                            <div class="font-medium">Failed to fetch Docker information</div>
                            <div class="text-sm">{{ error }}</div>
                        </div>
                    </Alert>
                </CardContent>
            </Card>
        </div>

        <div v-else-if="data" class="space-y-4">
            <!-- Docker Images -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Docker Images</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center">
                            <div class="text-2xl font-bold">{{ data.dockerDiskUsage.images_total }}</div>
                            <div class="text-sm text-muted-foreground">Total Images</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">
                                {{ data.dockerDiskUsage.images_active }}
                            </div>
                            <div class="text-sm text-muted-foreground">Active Images</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-orange-600">
                                {{ data.dockerDiskUsage.images_total - data.dockerDiskUsage.images_active }}
                            </div>
                            <div class="text-sm text-muted-foreground">Inactive Images</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold">
                                {{ formatBytes(data.dockerDiskUsage.images_size, true) }}
                            </div>
                            <div class="text-sm text-muted-foreground">Images Size</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Docker Disk Usage -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Docker Disk Usage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span class="text-sm font-medium">Containers</span>
                            <span class="text-sm">{{ formatBytes(data.dockerDiskUsage.containers_size, true) }}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span class="text-sm font-medium">Images</span>
                            <span class="text-sm">{{ formatBytes(data.dockerDiskUsage.images_size, true) }}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span class="text-sm font-medium">Build Cache</span>
                            <span class="text-sm">{{ formatBytes(data.dockerDiskUsage.build_cache_size) }}</span>
                        </div>
                        <div
                            class="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20"
                        >
                            <span class="text-sm font-bold">Total Docker Usage</span>
                            <span class="text-sm font-bold">
                                {{
                                    formatBytes(
                                        data.dockerDiskUsage.containers_size +
                                            data.dockerDiskUsage.images_size +
                                            data.dockerDiskUsage.build_cache_size,
                                        true,
                                    )
                                }}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Docker Management -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Docker Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="space-y-4">
                        <div
                            v-if="
                                data.dockerDiskUsage.images_total - data.dockerDiskUsage.images_active > 0 ||
                                data.dockerDiskUsage.build_cache_size > 0
                            "
                            class="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                        >
                            <div class="flex items-start gap-3">
                                <div class="flex-1">
                                    <div class="font-medium text-yellow-800 dark:text-yellow-200">
                                        Cleanup Recommendation
                                    </div>
                                    <div class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                        You have
                                        {{ data.dockerDiskUsage.images_total - data.dockerDiskUsage.images_active }}
                                        inactive Docker images. Pruning them could free up space.
                                    </div>
                                    <div class="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                        Build cache:
                                        {{ formatBytes(data.dockerDiskUsage.build_cache_size, true) }} could also be
                                        reclaimed.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            class="w-full"
                            :loading="pruning"
                            :disabled="data.dockerDiskUsage.images_total - data.dockerDiskUsage.images_active === 0"
                            @click="$emit('prune')"
                        >
                            <Trash2 :size="16" class="mr-2" />
                            Prune Unused Images
                        </Button>
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
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Trash2 } from 'lucide-vue-next';
import { formatBytes } from '@/lib/format';
import type { DockerResponse } from '../types';

defineProps<{
    loading: boolean;
    data: DockerResponse | null;
    error: string | null;
    pruning: boolean;
}>();

defineEmits<{
    prune: [];
}>();
</script>
