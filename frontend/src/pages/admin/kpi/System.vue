<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Analytics', href: '/admin/kpi/analytics' },
            { text: 'System', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading system analytics...</span>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-12">
                <p class="text-red-500">{{ error }}</p>
                <Button class="mt-4" @click="fetchAnalytics">Try Again</Button>
            </div>

            <!-- Content -->
            <div v-else class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">System Analytics</h1>
                        <p class="text-muted-foreground">Mail queue monitoring and statistics</p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" @click="fetchAnalytics">
                            <RefreshCw :size="16" class="mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <!-- Overview Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Queued</CardTitle>
                            <Mail class="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ mailQueue.total_queued }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Pending emails</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Sent</CardTitle>
                            <Mail class="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ mailQueue.total_sent }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Successfully delivered</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Failed</CardTitle>
                            <Mail class="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ mailQueue.total_failed }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Delivery errors</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Success Rate</CardTitle>
                            <Mail class="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ mailQueue.success_rate }}%</div>
                            <p class="text-xs text-muted-foreground mt-1">Delivery rate</p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Mail Queue Chart -->
                <Card>
                    <CardHeader>
                        <CardTitle>Mail Queue Status</CardTitle>
                        <CardDescription>Email queue distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="h-[300px] flex items-center justify-center">
                            <Doughnut
                                v-if="mailQueueChartData"
                                :data="mailQueueChartData"
                                :options="doughnutChartOptions"
                            />
                        </div>
                    </CardContent>
                </Card>

                <!-- Mail Queue Details -->
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Mail Queue Activity</CardTitle>
                        <CardDescription>Latest email processing status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            v-if="!mailQueue.recent_queued || mailQueue.recent_queued.length === 0"
                            class="text-center py-8 text-muted-foreground"
                        >
                            No recent mail queue activity
                        </div>
                        <div v-else class="space-y-3">
                            <div
                                v-for="mail in mailQueue.recent_queued.slice(0, 10)"
                                :key="mail.id"
                                class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div class="flex-1">
                                    <p class="font-medium">{{ mail.subject }}</p>
                                    <p class="text-sm text-muted-foreground">To: {{ mail.email }}</p>
                                </div>
                                <Badge v-if="mail.status === 'sent'" variant="default">Sent</Badge>
                                <Badge v-else-if="mail.status === 'failed'" variant="destructive">Failed</Badge>
                                <Badge v-else variant="secondary">Queued</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
/*
MIT License

Copyright (c) 2025 MythicalSystems
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
*/

import { ref, onMounted, computed } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, RefreshCw } from 'lucide-vue-next';
import axios from 'axios';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Title, Tooltip, Legend);

interface MailQueueItem {
    id: number;
    email: string;
    subject: string;
    status: string;
    created_at: string;
}

// State
const loading = ref(false);
const error = ref<string | null>(null);
const mailQueue = ref({
    total_queued: 0,
    total_sent: 0,
    total_failed: 0,
    success_rate: 0,
    recent_queued: [] as MailQueueItem[],
});

// Chart Data
const mailQueueChartData = computed(() => {
    const total = mailQueue.value.total_queued + mailQueue.value.total_sent + mailQueue.value.total_failed;
    if (total === 0) return null;

    return {
        labels: ['Queued', 'Sent', 'Failed'],
        datasets: [
            {
                data: [mailQueue.value.total_queued, mailQueue.value.total_sent, mailQueue.value.total_failed],
                backgroundColor: ['rgb(251, 146, 60)', 'rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
            },
        ],
    };
});

// Chart Options
const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
        },
    },
};

// Fetch analytics data
const fetchAnalytics = async () => {
    loading.value = true;
    error.value = null;

    try {
        const mailRes = await axios.get('/api/admin/analytics/mail-queue/stats');

        if (mailRes.data?.success) {
            mailQueue.value = mailRes.data.data;
        }
    } catch (err) {
        console.error('Failed to fetch system analytics:', err);
        error.value = 'Failed to load system analytics data';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchAnalytics();
});
</script>
