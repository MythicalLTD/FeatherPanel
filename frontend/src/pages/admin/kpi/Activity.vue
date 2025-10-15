<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Analytics', href: '/admin/kpi/analytics' },
            { text: 'Activity', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading activity analytics...</span>
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
                        <h1 class="text-3xl font-bold text-foreground mb-1">Activity Analytics</h1>
                        <p class="text-muted-foreground">Track and analyze user activities across your panel</p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" @click="fetchAnalytics">
                            <RefreshCw :size="16" class="mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <!-- Activity Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Today's Activities</CardTitle>
                            <Activity class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ activityStats.today.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ activityStats.active_users_today }} active users
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">This Week</CardTitle>
                            <Calendar class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ activityStats.this_week.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Last 7 days</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">This Month</CardTitle>
                            <Clock class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ activityStats.this_month.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Last 30 days</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Peak Hour</CardTitle>
                            <TrendingUp class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">
                                {{ String(activityStats.peak_hour).padStart(2, '0') }}:00
                            </div>
                            <p class="text-xs text-muted-foreground mt-1">Most active time</p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Activity Charts Row -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Activity Trend Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Trend (7 Days)</CardTitle>
                            <CardDescription>Daily activity volume over the last week</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Line
                                    v-if="activityTrendChartData"
                                    :data="activityTrendChartData"
                                    :options="lineChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Activity Breakdown Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Breakdown</CardTitle>
                            <CardDescription>Distribution of activity types</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Doughnut
                                    v-if="activityBreakdownChartData"
                                    :data="activityBreakdownChartData"
                                    :options="doughnutChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Hourly Activity Chart -->
                <Card>
                    <CardHeader>
                        <CardTitle>Hourly Activity Distribution</CardTitle>
                        <CardDescription>Activity patterns by hour of day (last 7 days)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="h-[300px]">
                            <Bar
                                v-if="hourlyActivityChartData"
                                :data="hourlyActivityChartData"
                                :options="barChartOptions"
                            />
                        </div>
                    </CardContent>
                </Card>

                <!-- Top Activities & Recent Activities -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Top Activities -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Activity Types</CardTitle>
                            <CardDescription>Most common activities in your panel</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-2">
                                <div
                                    v-for="(activity, index) in topActivities"
                                    :key="activity.name"
                                    class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs"
                                        >
                                            {{ index + 1 }}
                                        </div>
                                        <span class="font-medium text-sm">{{ formatActivityName(activity.name) }}</span>
                                    </div>
                                    <Badge variant="secondary" class="font-mono">{{
                                        activity.count.toLocaleString()
                                    }}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Recent Activities -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activities</CardTitle>
                            <CardDescription>Latest user actions in real-time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                <div
                                    v-for="activity in recentActivities.slice(0, 15)"
                                    :key="activity.id"
                                    class="group relative p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all"
                                >
                                    <div class="flex items-start gap-3">
                                        <Avatar class="h-9 w-9 ring-2 ring-background">
                                            <AvatarImage
                                                :src="activity.avatar || ''"
                                                :alt="activity.username || 'User'"
                                            />
                                            <AvatarFallback class="text-xs">{{
                                                activity.username?.charAt(0).toUpperCase() || 'U'
                                            }}</AvatarFallback>
                                        </Avatar>
                                        <div class="flex-1 min-w-0 space-y-1">
                                            <div class="flex items-center gap-2">
                                                <p class="text-sm font-semibold truncate">
                                                    {{ activity.username || 'Unknown User' }}
                                                </p>
                                                <Badge
                                                    v-if="activity.role_name"
                                                    variant="outline"
                                                    class="text-xs px-1.5 py-0"
                                                    :style="{ borderColor: activity.role_color || '#666' }"
                                                >
                                                    {{ activity.role_name }}
                                                </Badge>
                                            </div>
                                            <p class="text-xs text-muted-foreground font-medium">
                                                {{ formatActivityName(activity.name) }}
                                            </p>
                                            <p
                                                v-if="activity.context"
                                                class="text-xs text-muted-foreground/80 line-clamp-1"
                                            >
                                                {{ activity.context }}
                                            </p>
                                            <div class="flex items-center gap-3 text-xs text-muted-foreground/60">
                                                <span class="flex items-center gap-1">
                                                    <Clock :size="10" />
                                                    {{ formatTimeAgo(activity.created_at) }}
                                                </span>
                                                <span v-if="activity.ip_address" class="flex items-center gap-1">
                                                    <Globe :size="10" />
                                                    {{ activity.ip_address }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="!recentActivities.length" class="text-center py-8 text-muted-foreground">
                                    No recent activities found
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Activity, Calendar, Clock, RefreshCw, TrendingUp, Globe } from 'lucide-vue-next';
import axios from 'axios';
import { Line, Doughnut, Bar } from 'vue-chartjs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
);

interface RecentActivity {
    id: number;
    name: string;
    context: string | null;
    ip_address: string | null;
    created_at: string;
    username: string | null;
    email: string | null;
    avatar: string | null;
    role_name: string | null;
    role_color: string | null;
}

// State
const loading = ref(false);
const error = ref<string | null>(null);
const activityStats = ref({
    total: 0,
    today: 0,
    this_week: 0,
    this_month: 0,
    active_users_today: 0,
    peak_hour: 0,
});
const activityTrend = ref<{ date: string; count: number }[]>([]);
const topActivities = ref<{ name: string; count: number }[]>([]);
const activityBreakdown = ref<{ name: string; count: number; percentage: number }[]>([]);
const recentActivities = ref<RecentActivity[]>([]);
const hourlyActivity = ref<{ hour: number; count: number; label: string }[]>([]);

// Chart Data
const activityTrendChartData = computed(() => {
    if (!activityTrend.value.length) return null;

    return {
        labels: activityTrend.value.map((d) =>
            new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ),
        datasets: [
            {
                label: 'Activities',
                data: activityTrend.value.map((d) => d.count),
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };
});

const activityBreakdownChartData = computed(() => {
    if (!activityBreakdown.value.length) return null;

    const colors = [
        'rgb(99, 102, 241)',
        'rgb(59, 130, 246)',
        'rgb(139, 92, 246)',
        'rgb(168, 85, 247)',
        'rgb(236, 72, 153)',
        'rgb(251, 146, 60)',
        'rgb(251, 191, 36)',
        'rgb(34, 197, 94)',
        'rgb(16, 185, 129)',
        'rgb(20, 184, 166)',
    ];

    return {
        labels: activityBreakdown.value.map((a) => formatActivityName(a.name)),
        datasets: [
            {
                label: 'Activities',
                data: activityBreakdown.value.map((a) => a.count),
                backgroundColor: colors.slice(0, activityBreakdown.value.length),
            },
        ],
    };
});

const hourlyActivityChartData = computed(() => {
    if (!hourlyActivity.value.length) return null;

    return {
        labels: hourlyActivity.value.map((h) => h.label),
        datasets: [
            {
                label: 'Activities',
                data: hourlyActivity.value.map((h) => h.count),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 4,
            },
        ],
    };
});

// Chart Options
const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                precision: 0,
            },
        },
    },
};

const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
        },
    },
};

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                precision: 0,
            },
        },
    },
};

// Utility functions
const formatActivityName = (name: string): string => {
    return name
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
};

// Fetch analytics data
const fetchAnalytics = async () => {
    loading.value = true;
    error.value = null;

    try {
        const [
            activityStatsRes,
            activityTrendRes,
            topActivitiesRes,
            activityBreakdownRes,
            recentActivitiesRes,
            hourlyActivityRes,
        ] = await Promise.all([
            axios.get('/api/admin/analytics/activity/stats'),
            axios.get('/api/admin/analytics/activity/trend?days=7'),
            axios.get('/api/admin/analytics/activity/top?limit=10'),
            axios.get('/api/admin/analytics/activity/breakdown'),
            axios.get('/api/admin/analytics/activity/recent?limit=50'),
            axios.get('/api/admin/analytics/activity/hourly?days=7'),
        ]);

        if (activityStatsRes.data?.success) {
            activityStats.value = activityStatsRes.data.data;
        }

        if (activityTrendRes.data?.success) {
            activityTrend.value = activityTrendRes.data.data.data;
        }

        if (topActivitiesRes.data?.success) {
            topActivities.value = topActivitiesRes.data.data.activities;
        }

        if (activityBreakdownRes.data?.success) {
            activityBreakdown.value = activityBreakdownRes.data.data.activities;
        }

        if (recentActivitiesRes.data?.success) {
            recentActivities.value = recentActivitiesRes.data.data.activities;
        }

        if (hourlyActivityRes.data?.success) {
            hourlyActivity.value = hourlyActivityRes.data.data.data;
        }
    } catch (err) {
        console.error('Failed to fetch analytics:', err);
        error.value = 'Failed to load analytics data';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchAnalytics();
});
</script>
