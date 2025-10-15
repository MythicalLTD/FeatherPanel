<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Analytics', href: '/admin/kpi/analytics' },
            { text: 'Content', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading content analytics...</span>
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
                        <h1 class="text-3xl font-bold text-foreground mb-1">Content Analytics</h1>
                        <p class="text-muted-foreground">Realms, spells, images, and content management insights</p>
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
                            <CardTitle class="text-sm font-medium">Realms</CardTitle>
                            <Layers class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ realmsOverview.total_realms }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ realmsOverview.with_spells }} with spells
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Spells</CardTitle>
                            <Wand2 class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ spellsOverview.total_spells }}</div>
                            <p class="text-xs text-muted-foreground mt-1">
                                {{ spellsOverview.percentage_in_use }}% in use
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Images</CardTitle>
                            <ImageIcon class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ imagesOverview.total_images }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Image library</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle class="text-sm font-medium">Redirect Links</CardTitle>
                            <Link class="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div class="text-2xl font-bold">{{ redirectLinksOverview.total_links }}</div>
                            <p class="text-xs text-muted-foreground mt-1">Active links</p>
                        </CardContent>
                    </Card>
                </div>

                <!-- Charts Row -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Spells by Realm -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Spells by Realm</CardTitle>
                            <CardDescription>Spell distribution across realms</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Doughnut
                                    v-if="spellsByRealmChartData"
                                    :data="spellsByRealmChartData"
                                    :options="doughnutChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Spell Variable Types -->
                    <Card>
                        <CardHeader>
                            <CardTitle>Variable Field Types</CardTitle>
                            <CardDescription>Distribution of spell variable types</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="h-[300px] flex items-center justify-center">
                                <Pie
                                    v-if="variableFieldTypesChartData"
                                    :data="variableFieldTypesChartData"
                                    :options="pieChartOptions"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Spell Stats -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Spell Usage</CardTitle>
                            <CardDescription>Spell deployment statistics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                                    <span class="text-sm">In Use</span>
                                    <Badge variant="default">{{ spellsOverview.in_use }}</Badge>
                                </div>
                                <div class="flex items-center justify-between p-2 rounded-lg bg-gray-500/10">
                                    <span class="text-sm">Unused</span>
                                    <Badge variant="secondary">{{ spellsOverview.unused }}</Badge>
                                </div>
                                <div class="flex items-center justify-between p-2 rounded-lg border border-border">
                                    <span class="text-sm">With Variables</span>
                                    <Badge variant="outline">{{ spellsOverview.with_variables }}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Spell Variables</CardTitle>
                            <CardDescription>Variable configuration stats</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-muted-foreground">Total Variables</span>
                                    <span class="font-semibold">{{ spellVariables.total_variables }}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-muted-foreground">User Viewable</span>
                                    <Badge variant="default">{{ spellVariables.user_viewable }}</Badge>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-muted-foreground">User Editable</span>
                                    <Badge variant="secondary">{{ spellVariables.user_editable }}</Badge>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-muted-foreground">Avg per Spell</span>
                                    <Badge variant="outline">{{ spellVariables.avg_per_spell }}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Spell Configuration</CardTitle>
                            <CardDescription>Advanced spell settings</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-muted-foreground">Privileged Scripts</span>
                                    <Badge>{{ spellsOverview.privileged_scripts }}</Badge>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-sm text-muted-foreground">Config Inheritance</span>
                                    <Badge>{{ spellsOverview.using_config_inheritance }}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <!-- Realm Stats -->
                <Card>
                    <CardHeader>
                        <CardTitle>Realm Details</CardTitle>
                        <CardDescription>Spell count per realm</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div
                                v-for="realm in spellsByRealm"
                                :key="realm.realm_id"
                                class="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="font-medium">{{ realm.realm_name }}</p>
                                        <p class="text-xs text-muted-foreground mt-1">{{ realm.spell_count }} spells</p>
                                    </div>
                                    <Badge variant="secondary" class="text-lg">{{ realm.spell_count }}</Badge>
                                </div>
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
import { Layers, Wand2, ImageIcon, Link, RefreshCw } from 'lucide-vue-next';
import axios from 'axios';
import { Doughnut, Pie } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Title, Tooltip, Legend);

// State
const loading = ref(false);
const error = ref<string | null>(null);
const realmsOverview = ref({
    total_realms: 0,
    with_spells: 0,
    with_servers: 0,
    empty_realms: 0,
});
const spellsOverview = ref({
    total_spells: 0,
    in_use: 0,
    unused: 0,
    with_variables: 0,
    privileged_scripts: 0,
    using_config_inheritance: 0,
    percentage_in_use: 0,
});
const spellsByRealm = ref<{ realm_id: number; realm_name: string; spell_count: number }[]>([]);
const spellVariables = ref({
    total_variables: 0,
    user_viewable: 0,
    user_editable: 0,
    avg_per_spell: 0,
    by_field_type: [] as { field_type: string; count: number }[],
});
const imagesOverview = ref({
    total_images: 0,
});
const redirectLinksOverview = ref({
    total_links: 0,
    recent_links: [] as { name: string; slug: string; url: string; created_at: string }[],
});

// Chart Data
const spellsByRealmChartData = computed(() => {
    if (!spellsByRealm.value.length) return null;

    const colors = [
        'rgb(99, 102, 241)',
        'rgb(59, 130, 246)',
        'rgb(139, 92, 246)',
        'rgb(168, 85, 247)',
        'rgb(236, 72, 153)',
        'rgb(251, 146, 60)',
        'rgb(34, 197, 94)',
        'rgb(16, 185, 129)',
    ];

    return {
        labels: spellsByRealm.value.map((r) => r.realm_name),
        datasets: [
            {
                data: spellsByRealm.value.map((r) => r.spell_count),
                backgroundColor: colors,
            },
        ],
    };
});

const variableFieldTypesChartData = computed(() => {
    if (!spellVariables.value.by_field_type.length) return null;

    const colors = [
        'rgb(99, 102, 241)',
        'rgb(59, 130, 246)',
        'rgb(139, 92, 246)',
        'rgb(236, 72, 153)',
        'rgb(251, 146, 60)',
    ];

    return {
        labels: spellVariables.value.by_field_type.map((t) => t.field_type),
        datasets: [
            {
                data: spellVariables.value.by_field_type.map((t) => t.count),
                backgroundColor: colors,
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

const pieChartOptions = {
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
        const [realmsRes, spellsRes, spellsByRealmRes, variablesRes, imagesRes, linksRes] = await Promise.all([
            axios.get('/api/admin/analytics/realms/overview'),
            axios.get('/api/admin/analytics/spells/overview'),
            axios.get('/api/admin/analytics/spells/by-realm'),
            axios.get('/api/admin/analytics/spells/variables'),
            axios.get('/api/admin/analytics/images/overview'),
            axios.get('/api/admin/analytics/redirect-links/overview'),
        ]);

        if (realmsRes.data?.success) {
            realmsOverview.value = realmsRes.data.data;
        }

        if (spellsRes.data?.success) {
            spellsOverview.value = spellsRes.data.data;
        }

        if (spellsByRealmRes.data?.success) {
            spellsByRealm.value = spellsByRealmRes.data.data.realms;
        }

        if (variablesRes.data?.success) {
            spellVariables.value = variablesRes.data.data;
        }

        if (imagesRes.data?.success) {
            imagesOverview.value = imagesRes.data.data;
        }

        if (linksRes.data?.success) {
            redirectLinksOverview.value = linksRes.data.data;
        }
    } catch (err) {
        console.error('Failed to fetch content analytics:', err);
        error.value = 'Failed to load content analytics data';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchAnalytics();
});
</script>
