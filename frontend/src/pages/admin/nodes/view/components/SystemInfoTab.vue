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
                        System Information Unavailable
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <div class="space-y-3">
                            <div class="font-medium">Failed to fetch system information</div>
                            <div class="text-sm">{{ error }}</div>
                            <Button size="sm" variant="outline" @click="$emit('retry')">Retry</Button>
                        </div>
                    </Alert>
                </CardContent>
            </Card>
        </div>

        <div v-else-if="data" class="space-y-4">
            <!-- Wings Information -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Wings Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Version</div>
                        <div class="text-sm font-mono">{{ data.wings.version }}</div>
                    </div>
                </CardContent>
            </Card>

            <!-- Docker Information -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">Docker Information</CardTitle>
                </CardHeader>
                <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Version</div>
                        <div class="text-sm">{{ data.wings.docker.version }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">CGroups Driver</div>
                        <div class="text-sm">{{ data.wings.docker.cgroups.driver }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">CGroups Version</div>
                        <div class="text-sm">{{ data.wings.docker.cgroups.version }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Storage Driver</div>
                        <div class="text-sm">{{ data.wings.docker.storage.driver }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Storage Filesystem</div>
                        <div class="text-sm">{{ data.wings.docker.storage.filesystem }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">RunC Version</div>
                        <div class="text-sm">{{ data.wings.docker.runc.version }}</div>
                    </div>
                    <div class="md:col-span-2">
                        <div class="text-sm font-medium text-muted-foreground">Containers</div>
                        <div class="text-sm">
                            Total: {{ data.wings.docker.containers.total }}, Running:
                            {{ data.wings.docker.containers.running }}, Paused:
                            {{ data.wings.docker.containers.paused }}, Stopped:
                            {{ data.wings.docker.containers.stopped }}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- System Information -->
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">System Information</CardTitle>
                </CardHeader>
                <CardContent class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Architecture</div>
                        <div class="text-sm">{{ data.wings.system.architecture }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">CPU Threads</div>
                        <div class="text-sm">{{ data.wings.system.cpu_threads }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Memory</div>
                        <div class="text-sm">{{ formatBytes(data.wings.system.memory_bytes, true) }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">Kernel Version</div>
                        <div class="text-sm">{{ data.wings.system.kernel_version }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">OS</div>
                        <div class="text-sm">{{ data.wings.system.os }}</div>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-muted-foreground">OS Type</div>
                        <div class="text-sm">{{ data.wings.system.os_type }}</div>
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
import { formatBytes } from '@/lib/format';
import type { SystemInfoResponse } from '../types';

defineProps<{
    loading: boolean;
    data: SystemInfoResponse | null;
    error: string | null;
}>();

defineEmits<{
    retry: [];
}>();
</script>
