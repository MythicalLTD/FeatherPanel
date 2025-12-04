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
                <CardContent class="space-y-4">
                    <div>
                        <div class="text-sm font-medium text-muted-foreground mb-1">Version</div>
                        <div class="text-sm font-mono">{{ data.wings.version }}</div>
                    </div>

                    <!-- Version Status Check -->
                    <div v-if="versionStatusLoading" class="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                        <div
                            class="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-sm text-muted-foreground">Checking for updates...</span>
                    </div>

                    <!-- Update Available -->
                    <div
                        v-else-if="versionStatus && versionStatus.update_available"
                        class="flex items-start gap-3 p-4 rounded-lg border bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                    >
                        <div
                            class="h-8 w-8 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center shrink-0"
                        >
                            <AlertTriangle class="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-sm text-orange-900 dark:text-orange-100 mb-1">
                                Update Available
                            </div>
                            <div class="text-sm text-orange-800 dark:text-orange-200">
                                <p>
                                    Current:
                                    <span class="font-mono font-medium">{{ versionStatus.current_version }}</span> →
                                    Latest:
                                    <span class="font-mono font-medium">v{{ versionStatus.latest_version }}</span>
                                </p>
                                <p class="mt-1.5 text-orange-700 dark:text-orange-300">
                                    A new FeatherWings version is available. Please update for the latest features and
                                    security improvements.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Up to Date -->
                    <div
                        v-else-if="versionStatus && versionStatus.is_up_to_date"
                        class="flex items-start gap-3 p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    >
                        <div
                            class="h-8 w-8 rounded-lg bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center shrink-0"
                        >
                            <Check class="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-sm text-green-900 dark:text-green-100 mb-1">Up to Date</div>
                            <div class="text-sm text-green-800 dark:text-green-200">
                                Running the latest version
                                <span class="font-mono font-medium">{{ versionStatus.current_version }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- GitHub Error -->
                    <div
                        v-else-if="versionStatus && versionStatus.github_error"
                        class="flex items-start gap-3 p-4 rounded-lg border bg-muted/50 border-border"
                    >
                        <div class="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <AlertTriangle class="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm text-muted-foreground">
                                Unable to check for updates. {{ versionStatus.github_error }}
                            </div>
                        </div>
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

import { ref, onMounted, watch } from 'vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { AlertTriangle, Check } from 'lucide-vue-next';
import { formatBytes } from '@/lib/format';
import axios from 'axios';
import type { SystemInfoResponse } from '../types';

const props = defineProps<{
    loading: boolean;
    data: SystemInfoResponse | null;
    error: string | null;
    nodeId?: number;
}>();

defineEmits<{
    retry: [];
}>();

const versionStatus = ref<{
    current_version: string;
    latest_version: string | null;
    is_up_to_date: boolean;
    update_available: boolean;
    github_error: string | null;
} | null>(null);
const versionStatusLoading = ref(false);

async function fetchVersionStatus() {
    if (!props.nodeId || !props.data) return;

    versionStatusLoading.value = true;
    try {
        const { data } = await axios.get(`/api/admin/nodes/${props.nodeId}/version-status`);
        if (data.success) {
            versionStatus.value = data.data;
        }
    } catch {
        // Silently fail - version check is not critical
        versionStatus.value = null;
    } finally {
        versionStatusLoading.value = false;
    }
}

// Fetch version status when data is loaded
watch(
    () => [props.data, props.nodeId],
    ([newData, newNodeId]) => {
        if (newData && newNodeId) {
            fetchVersionStatus();
        }
    },
    { immediate: true },
);

onMounted(() => {
    if (props.data && props.nodeId) {
        fetchVersionStatus();
    }
});
</script>
