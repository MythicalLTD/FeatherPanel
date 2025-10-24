<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Analytics', isCurrent: true, href: '/admin/kpi/analytics' }]">
        <div class="min-h-screen bg-background p-6">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
                <p class="text-muted-foreground">Choose an analytics category to explore detailed insights</p>
            </div>

            <!-- Analytics Categories -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- User Analytics -->
                <Card
                    class="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
                    data-umami-event="Navigate to user analytics"
                    @click="navigateTo('/admin/kpi/users')"
                >
                    <CardHeader>
                        <div class="flex items-center gap-3 mb-2">
                            <div
                                class="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors"
                            >
                                <Users class="h-6 w-6 text-blue-500" />
                            </div>
                            <CardTitle>User Analytics</CardTitle>
                        </div>
                        <CardDescription>
                            Comprehensive user statistics including registrations, roles, security, and growth metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">View Details</span>
                            <ArrowRight
                                :size="16"
                                class="text-muted-foreground group-hover:text-primary transition-colors"
                            />
                        </div>
                    </CardContent>
                </Card>

                <!-- Activity Analytics -->
                <Card
                    class="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
                    data-umami-event="Navigate to activity analytics"
                    @click="navigateTo('/admin/kpi/activity')"
                >
                    <CardHeader>
                        <div class="flex items-center gap-3 mb-2">
                            <div
                                class="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors"
                            >
                                <Activity class="h-6 w-6 text-purple-500" />
                            </div>
                            <CardTitle>Activity Analytics</CardTitle>
                        </div>
                        <CardDescription>
                            Track user activities, trends, peak hours, and activity type distribution across your panel
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">View Details</span>
                            <ArrowRight
                                :size="16"
                                class="text-muted-foreground group-hover:text-primary transition-colors"
                            />
                        </div>
                    </CardContent>
                </Card>

                <!-- Infrastructure Analytics -->
                <Card
                    class="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
                    data-umami-event="Navigate to infrastructure analytics"
                    @click="navigateTo('/admin/kpi/infrastructure')"
                >
                    <CardHeader>
                        <div class="flex items-center gap-3 mb-2">
                            <div
                                class="flex items-center justify-center w-12 h-12 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors"
                            >
                                <Globe class="h-6 w-6 text-green-500" />
                            </div>
                            <CardTitle>Infrastructure Analytics</CardTitle>
                        </div>
                        <CardDescription>
                            Locations, nodes, allocations, and database host distribution and resource usage
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">View Details</span>
                            <ArrowRight
                                :size="16"
                                class="text-muted-foreground group-hover:text-primary transition-colors"
                            />
                        </div>
                    </CardContent>
                </Card>

                <!-- Server Analytics -->
                <Card
                    class="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
                    data-umami-event="Navigate to server analytics"
                    @click="navigateTo('/admin/kpi/servers')"
                >
                    <CardHeader>
                        <div class="flex items-center gap-3 mb-2">
                            <div
                                class="flex items-center justify-center w-12 h-12 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors"
                            >
                                <Server class="h-6 w-6 text-orange-500" />
                            </div>
                            <CardTitle>Server Analytics</CardTitle>
                        </div>
                        <CardDescription>
                            Server statistics, database usage per server, allocation patterns, and resource distribution
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">View Details</span>
                            <ArrowRight
                                :size="16"
                                class="text-muted-foreground group-hover:text-primary transition-colors"
                            />
                        </div>
                    </CardContent>
                </Card>

                <!-- Content Analytics -->
                <Card
                    class="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
                    data-umami-event="Navigate to content analytics"
                    @click="navigateTo('/admin/kpi/content')"
                >
                    <CardHeader>
                        <div class="flex items-center gap-3 mb-2">
                            <div
                                class="flex items-center justify-center w-12 h-12 rounded-lg bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors"
                            >
                                <Layers class="h-6 w-6 text-pink-500" />
                            </div>
                            <CardTitle>Content Analytics</CardTitle>
                        </div>
                        <CardDescription>
                            Realms, spells, images, redirect links, mail templates, and content management insights
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">View Details</span>
                            <ArrowRight
                                :size="16"
                                class="text-muted-foreground group-hover:text-primary transition-colors"
                            />
                        </div>
                    </CardContent>
                </Card>

                <!-- System Analytics -->
                <Card
                    class="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
                    data-umami-event="Navigate to system analytics"
                    @click="navigateTo('/admin/kpi/system')"
                >
                    <CardHeader>
                        <div class="flex items-center gap-3 mb-2">
                            <div
                                class="flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors"
                            >
                                <Mail class="h-6 w-6 text-cyan-500" />
                            </div>
                            <CardTitle>System Analytics</CardTitle>
                        </div>
                        <CardDescription>
                            Mail queue monitoring, email delivery statistics, and queue performance metrics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">View Details</span>
                            <ArrowRight
                                :size="16"
                                class="text-muted-foreground group-hover:text-primary transition-colors"
                            />
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

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Activity, ArrowRight, Globe, Server, Layers, Mail } from 'lucide-vue-next';
import axios from 'axios';

const router = useRouter();

// State
const quickStats = ref({
    users: 0,
    activitiesToday: 0,
    activeNow: 0,
});

const navigateTo = (path: string) => {
    router.push(path);
};

// Fetch quick stats
const fetchQuickStats = async () => {
    try {
        const [usersRes, activityRes] = await Promise.all([
            axios.get('/api/admin/analytics/users/overview'),
            axios.get('/api/admin/analytics/activity/stats'),
        ]);

        if (usersRes.data?.success) {
            quickStats.value.users = usersRes.data.data.total;
        }

        if (activityRes.data?.success) {
            quickStats.value.activitiesToday = activityRes.data.data.today;
            quickStats.value.activeNow = activityRes.data.data.active_users_today;
        }
    } catch (err) {
        console.error('Failed to fetch quick stats:', err);
    }
};

onMounted(() => {
    fetchQuickStats();
});
</script>
