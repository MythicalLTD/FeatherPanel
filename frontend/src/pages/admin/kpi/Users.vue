<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Analytics', href: '/admin/kpi/analytics' },
            { text: 'Users', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading user analytics...</span>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-12">
                <p class="text-red-500">{{ error }}</p>
                <Button class="mt-4" data-umami-event="Retry user analytics" @click="fetchAnalytics">Try Again</Button>
            </div>

            <!-- Content -->
            <div v-else class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">User Analytics</h1>
                        <p class="text-muted-foreground">Comprehensive insights into user behavior and statistics</p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" data-umami-event="Refresh user analytics" @click="fetchAnalytics">
                            <RefreshCw :size="16" class="mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <!-- Overview Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Total Users</CardTitle>
                            <Users class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ overview.total.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ overview.active.toLocaleString() }} active users
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Banned Users</CardTitle>
                            <UserX class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ overview.banned.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">{{ overview.percentage_banned }}% of total</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Verified Users</CardTitle>
                            <CheckCircle class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ overview.verified.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ overview.percentage_verified }}% verified
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">2FA Enabled</CardTitle>
                            <Shield class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ overview.two_fa_enabled.toLocaleString() }}</div>
                            <p class="text-xs text-muted-foreground mt-1">{{ overview.percentage_two_fa }}% with 2FA</p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row 1 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Registration Trend Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Registration Trend (30 Days)</CardTitle>
                            <CardDescription>Daily user registrations over the last 30 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Line
                                    v-if="registrationChartData"
                                    :data="registrationChartData"
                                    :options="lineChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Role Distribution Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>User Distribution by Role</CardTitle>
                            <CardDescription>Breakdown of users across different roles</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Doughnut v-if="roleChartData" :data="roleChartData" :options="doughnutChartOptions" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row 2 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Security Stats Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Statistics</CardTitle>
                            <CardDescription>2FA and email verification breakdown</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Pie v-if="securityChartData" :data="securityChartData" :options="pieChartOptions" />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Growth Rate Chart -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Growth Rate</CardTitle>
                            <CardDescription>Comparison of user growth periods</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px]">
                                <Bar v-if="growthChartData" :data="growthChartData" :options="barChartOptions" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Top Users Table -->
                <Card>
                    <CardHeader>
                        <CardTitle>Top Users by Server Count</CardTitle>
                        <CardDescription>Users with the most servers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="space-y-3">
                            <div
                                v-for="(user, index) in topUsers"
                                :key="user.uuid"
                                class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div class="flex items-center gap-3">
                                    <div
                                        class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold"
                                    >
                                        {{ index + 1 }}
                                    </div>
                                    <div>
                                        <p class="font-medium">{{ user.username }}</p>
                                        <p class="text-sm text-muted-foreground">{{ user.email }}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        <Server :size="12" class="mr-1" />
                                        {{ user.server_count }} servers
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Activity Summary -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity (24h)</CardTitle>
                            <CardDescription>User activity in the last 24 hours</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">New Users</span>
                                    <span class="font-semibold">{{ activity24h.new_users }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">Active Users</span>
                                    <span class="font-semibold">{{ activity24h.active_users }}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Growth Metrics</CardTitle>
                            <CardDescription>User growth comparison</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">7-Day Growth</span>
                                    <Badge :variant="growth.growth_rate_7d >= 0 ? 'default' : 'destructive'">
                                        <TrendingUp v-if="growth.growth_rate_7d >= 0" :size="12" class="mr-1" />
                                        <TrendingDown v-else :size="12" class="mr-1" />
                                        {{ growth.growth_rate_7d }}%
                                    </Badge>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-muted-foreground">30-Day Growth</span>
                                    <Badge :variant="growth.growth_rate_30d >= 0 ? 'default' : 'destructive'">
                                        <TrendingUp v-if="growth.growth_rate_30d >= 0" :size="12" class="mr-1" />
                                        <TrendingDown v-else :size="12" class="mr-1" />
                                        {{ growth.growth_rate_30d }}%
                                    </Badge>
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
import { Users, UserX, CheckCircle, Shield, Server, RefreshCw, TrendingUp, TrendingDown } from 'lucide-vue-next';
import axios from 'axios';
import { Line, Doughnut, Pie, Bar } from 'vue-chartjs';
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

// Types
interface OverviewStats {
    total: number;
    active: number;
    banned: number;
    verified: number;
    two_fa_enabled: number;
    unverified: number;
    percentage_verified: number;
    percentage_banned: number;
    percentage_two_fa: number;
}

interface RoleDistribution {
    role_id: number;
    role_name: string;
    role_display_name: string;
    role_color: string;
    user_count: number;
    percentage: number;
}

interface RegistrationDataPoint {
    date: string;
    count: number;
}

interface TopUser {
    id: number;
    uuid: string;
    username: string;
    email: string;
    server_count: number;
}

interface ActivityStats {
    period_hours: number;
    new_users: number;
    active_users: number;
}

interface GrowthStats {
    last_7_days: number;
    previous_7_days: number;
    growth_rate_7d: number;
    last_30_days: number;
    previous_30_days: number;
    growth_rate_30d: number;
}

interface SecurityStats {
    total_users: number;
    two_fa_enabled: number;
    email_verified: number;
    fully_secured: number;
    not_secured: number;
}

// State
const loading = ref(true);
const error = ref<string | null>(null);
const overview = ref<OverviewStats>({
    total: 0,
    active: 0,
    banned: 0,
    verified: 0,
    two_fa_enabled: 0,
    unverified: 0,
    percentage_verified: 0,
    percentage_banned: 0,
    percentage_two_fa: 0,
});
const roleDistribution = ref<RoleDistribution[]>([]);
const registrationTrend = ref<RegistrationDataPoint[]>([]);
const topUsers = ref<TopUser[]>([]);
const activity24h = ref<ActivityStats>({ period_hours: 24, new_users: 0, active_users: 0 });
const growth = ref<GrowthStats>({
    last_7_days: 0,
    previous_7_days: 0,
    growth_rate_7d: 0,
    last_30_days: 0,
    previous_30_days: 0,
    growth_rate_30d: 0,
});
const securityStats = ref<SecurityStats>({
    total_users: 0,
    two_fa_enabled: 0,
    email_verified: 0,
    fully_secured: 0,
    not_secured: 0,
});

// Chart Data
const registrationChartData = computed(() => {
    if (!registrationTrend.value.length) return null;

    return {
        labels: registrationTrend.value.map((d) =>
            new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ),
        datasets: [
            {
                label: 'New Users',
                data: registrationTrend.value.map((d) => d.count),
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
            },
        ],
    };
});

const roleChartData = computed(() => {
    if (!roleDistribution.value.length) return null;

    return {
        labels: roleDistribution.value.map((r) => r.role_display_name),
        datasets: [
            {
                label: 'Users by Role',
                data: roleDistribution.value.map((r) => r.user_count),
                backgroundColor: roleDistribution.value.map((r) => r.role_color || '#666666'),
            },
        ],
    };
});

const securityChartData = computed(() => {
    if (!securityStats.value.total_users) return null;

    return {
        labels: ['Fully Secured', '2FA Only', 'Email Only', 'Not Secured'],
        datasets: [
            {
                data: [
                    securityStats.value.fully_secured,
                    securityStats.value.two_fa_enabled - securityStats.value.fully_secured,
                    securityStats.value.email_verified - securityStats.value.fully_secured,
                    securityStats.value.not_secured,
                ],
                backgroundColor: ['rgb(34, 197, 94)', 'rgb(59, 130, 246)', 'rgb(251, 146, 60)', 'rgb(239, 68, 68)'],
            },
        ],
    };
});

const growthChartData = computed(() => {
    return {
        labels: ['Last 7 Days', 'Previous 7 Days', 'Last 30 Days', 'Previous 30 Days'],
        datasets: [
            {
                label: 'New Users',
                data: [
                    growth.value.last_7_days,
                    growth.value.previous_7_days,
                    growth.value.last_30_days,
                    growth.value.previous_30_days,
                ],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(99, 102, 241, 0.4)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(34, 197, 94, 0.4)',
                ],
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

const pieChartOptions = {
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

// Fetch analytics data
const fetchAnalytics = async () => {
    loading.value = true;
    error.value = null;

    try {
        const [overviewRes, rolesRes, trendRes, topUsersRes, activityRes, growthRes, securityRes] = await Promise.all([
            axios.get('/api/admin/analytics/users/overview'),
            axios.get('/api/admin/analytics/users/by-role'),
            axios.get('/api/admin/analytics/users/registration-trend?days=30'),
            axios.get('/api/admin/analytics/users/top-by-servers?limit=10'),
            axios.get('/api/admin/analytics/users/activity?hours=24'),
            axios.get('/api/admin/analytics/users/growth'),
            axios.get('/api/admin/analytics/users/security'),
        ]);

        if (overviewRes.data?.success) {
            overview.value = overviewRes.data.data;
        }

        if (rolesRes.data?.success) {
            roleDistribution.value = rolesRes.data.data.roles;
        }

        if (trendRes.data?.success) {
            registrationTrend.value = trendRes.data.data.data;
        }

        if (topUsersRes.data?.success) {
            topUsers.value = topUsersRes.data.data.users;
        }

        if (activityRes.data?.success) {
            activity24h.value = activityRes.data.data;
        }

        if (growthRes.data?.success) {
            growth.value = growthRes.data.data;
        }

        if (securityRes.data?.success) {
            securityStats.value = securityRes.data.data;
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
