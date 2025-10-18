<template>
    <div v-if="cronRecent || cronSummary" class="p-6 space-y-4">
        <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold flex items-center gap-2">
                <CalendarSync :size="20" />
                Automation Tasks Status
            </h2>
            <div v-if="cronRecent" class="text-xs text-muted-foreground">Updated just now</div>
        </div>
        <div v-if="cronSummary" class="text-sm text-muted-foreground bg-muted/50 border rounded-md p-4">
            {{ cronSummary }}
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card v-for="item in cronRecent" :key="item.id" class="p-4 border hover:shadow-md transition-shadow">
                <div class="flex items-start gap-3">
                    <div
                        class="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
                        :class="
                            item.last_run_success
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-destructive/10 text-destructive'
                        "
                    >
                        <component :is="item.last_run_success ? CheckCircle2 : AlertTriangle" :size="18" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                            <div class="font-medium capitalize truncate">{{ prettyTaskName(item.task_name) }}</div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <span
                                    class="text-xs px-2 py-0.5 rounded-full"
                                    :class="
                                        item.last_run_success
                                            ? 'bg-emerald-500/10 text-emerald-600'
                                            : 'bg-destructive/10 text-destructive'
                                    "
                                >
                                    {{ item.last_run_success ? 'OK' : 'FAIL' }}
                                </span>
                                <span
                                    v-if="item.late"
                                    class="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600"
                                >
                                    Late
                                </span>
                            </div>
                        </div>
                        <div class="mt-1 text-sm text-muted-foreground">
                            Last run {{ formatAgo(item.last_run_at) }} • every ~{{
                                formatEvery(item.expected_interval_seconds)
                            }}
                        </div>
                        <div
                            v-if="item.last_run_message"
                            class="mt-2 text-xs rounded-md border bg-muted/40 p-2 text-muted-foreground break-words"
                            :title="item.last_run_message"
                        >
                            {{ truncate(item.last_run_message, 120) }}
                        </div>
                    </div>
                </div>
            </Card>
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
import { Card } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, CalendarSync } from 'lucide-vue-next';
import { useDashboardStore } from '@/stores/dashboard';

const dashboardStore = useDashboardStore();

const cronRecent = computed(() => dashboardStore.cronRecent);
const cronSummary = computed(() => dashboardStore.cronSummary);

function formatAgo(dateStr: string | null): string {
    if (!dateStr) return 'never';
    const d = new Date(dateStr.replace(' ', 'T'));
    const diffMs = Date.now() - d.getTime();
    if (Number.isNaN(diffMs)) return dateStr;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatEvery(seconds: number): string {
    if (!seconds || seconds <= 0) return 'n/a';
    if (seconds < 90) return `${Math.max(1, Math.round(seconds / 60))}m`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
}

function truncate(text: string, maxLen = 120): string {
    if (!text) return '';
    return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
}

function prettyTaskName(name: string): string {
    switch (name) {
        case 'server-schedule-processor':
            return 'Server Schedule Processor';
        case 'mail-sender':
            return 'Mail Sender';
        case 'update-env':
            return 'Update Env';
        default:
            return name.replace(/[-_]/g, ' ');
    }
}
</script>
