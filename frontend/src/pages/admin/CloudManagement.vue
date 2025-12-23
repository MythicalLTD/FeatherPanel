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

import { computed, onMounted, reactive, ref, watch } from 'vue';
import axios from 'axios';
import DashboardLayout, { type BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from 'vue-toastification';
import {
    BarChart3,
    Brain,
    Key,
    LockKeyhole,
    PlugZap,
    RefreshCw,
    ShieldCheck,
    Store,
    Users,
    Coins,
} from 'lucide-vue-next';
import { useFeatherCloud, type CloudSummary, type CreditsData, type TeamData } from '@/composables/useFeatherCloud';
// Dialog removed - using Teleport for full-screen overlay

interface CredentialPair {
    publicKey: string;
    privateKey: string;
    lastRotatedAt?: string;
}

interface CredentialResponse {
    panelCredentials: CredentialPair;
    cloudCredentials: CredentialPair;
}

const breadcrumbs: BreadcrumbEntry[] = [
    { text: 'Dashboard', href: '/admin' },
    {
        text: 'FeatherCloud Cloud Management',
        href: '/admin/cloud-management',
        isCurrent: true,
    },
];

const toast = useToast();
const keys = reactive<CredentialResponse>({
    panelCredentials: {
        publicKey: '',
        privateKey: '',
        lastRotatedAt: undefined,
    },
    cloudCredentials: {
        publicKey: '',
        privateKey: '',
        lastRotatedAt: undefined,
    },
});
const isLoading = ref<boolean>(false);
const isRegenerating = ref<boolean>(false);
const isLinking = ref<boolean>(false);
const showRotateConfirmDialog = ref<boolean>(false);

const hasPanelKeys = computed(() => Boolean(keys.panelCredentials.publicKey && keys.panelCredentials.privateKey));
const hasCloudKeys = computed(() => Boolean(keys.cloudCredentials.publicKey && keys.cloudCredentials.privateKey));

// FeatherCloud data
const { fetchSummary, fetchCredits, fetchTeam, loading: cloudLoading } = useFeatherCloud();
const cloudSummary = ref<CloudSummary | null>(null);
const cloudCredits = ref<CreditsData | null>(null);
const cloudTeam = ref<TeamData | null>(null);
const isRefreshingCloudData = ref(false);

const fetchKeys = async () => {
    isLoading.value = true;
    try {
        const response = await axios.get('/api/admin/cloud/credentials');
        const data = response.data?.data;
        keys.panelCredentials.publicKey = data?.panel_credentials?.public_key ?? '';
        keys.panelCredentials.privateKey = data?.panel_credentials?.private_key ?? '';
        keys.panelCredentials.lastRotatedAt = data?.panel_credentials?.last_rotated_at;
        keys.cloudCredentials.publicKey = data?.cloud_credentials?.public_key ?? '';
        keys.cloudCredentials.privateKey = data?.cloud_credentials?.private_key ?? '';
        keys.cloudCredentials.lastRotatedAt = data?.cloud_credentials?.last_rotated_at;
    } catch (error) {
        toast.error('Failed to load cloud credentials');
        console.error(error);
    } finally {
        isLoading.value = false;
    }
};

const regenerateKeys = async () => {
    isRegenerating.value = true;
    try {
        const response = await axios.post('/api/admin/cloud/credentials/rotate');
        const data = response.data?.data;
        keys.panelCredentials.publicKey = data?.panel_credentials?.public_key ?? '';
        keys.panelCredentials.privateKey = data?.panel_credentials?.private_key ?? '';
        keys.panelCredentials.lastRotatedAt = data?.panel_credentials?.last_rotated_at;
        if (data?.cloud_credentials) {
            keys.cloudCredentials.publicKey = data.cloud_credentials.public_key ?? keys.cloudCredentials.publicKey;
            keys.cloudCredentials.privateKey = data.cloud_credentials.private_key ?? keys.cloudCredentials.privateKey;
            keys.cloudCredentials.lastRotatedAt =
                data.cloud_credentials.last_rotated_at ?? keys.cloudCredentials.lastRotatedAt;
        }

        // Check if cloud credentials are empty after rotation
        const cloudCredsEmpty = !keys.cloudCredentials.publicKey || !keys.cloudCredentials.privateKey;
        if (cloudCredsEmpty) {
            toast.warning(
                'Cloud credentials are empty. Premium plugins cannot be downloaded until FeatherCloud credentials are configured.',
            );
        } else {
            toast.success('Cloud credentials rotated');
        }
    } catch (error) {
        toast.error('Failed to rotate cloud credentials');
        console.error(error);
    } finally {
        isRegenerating.value = false;
    }
};

const linkWithFeatherCloud = async (): Promise<void> => {
    isLinking.value = true;
    try {
        const response = await axios.get('/api/admin/cloud/oauth2/link');
        const oauth2Url = response.data?.data?.oauth2_url;
        if (oauth2Url) {
            // Redirect to FeatherCloud OAuth2 page
            window.location.href = oauth2Url;
        } else {
            toast.error('Failed to generate OAuth2 link');
        }
    } catch (error) {
        toast.error('Failed to generate OAuth2 link');
        console.error(error);
    } finally {
        isLinking.value = false;
    }
};

const refreshCloudData = async () => {
    if (!hasCloudKeys.value) {
        return;
    }
    isRefreshingCloudData.value = true;
    try {
        const [summary, credits, team] = await Promise.all([fetchSummary(), fetchCredits(), fetchTeam()]);
        cloudSummary.value = summary;
        cloudCredits.value = credits;
        cloudTeam.value = team;
    } catch (error) {
        console.error('Failed to refresh cloud data:', error);
    } finally {
        isRefreshingCloudData.value = false;
    }
};

onMounted(async () => {
    await fetchKeys();

    // Fetch cloud data if credentials are configured
    if (hasCloudKeys.value) {
        await refreshCloudData();
    }
});

// Watch for credential changes and refresh cloud data
watch(hasCloudKeys, async (hasKeys) => {
    if (hasKeys) {
        await refreshCloudData();
    } else {
        cloudSummary.value = null;
        cloudCredits.value = null;
        cloudTeam.value = null;
    }
});
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen space-y-10 pb-12">
            <section
                class="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-10 shadow-xl shadow-primary/10"
            >
                <div class="absolute inset-0 pointer-events-none">
                    <span class="hero-blob hero-blob-one" aria-hidden="true"></span>
                    <span class="hero-blob hero-blob-two" aria-hidden="true"></span>
                    <span class="hero-grid" aria-hidden="true"></span>
                    <div class="keystream keystream-one" aria-hidden="true"></div>
                    <div class="keystream keystream-two" aria-hidden="true"></div>
                    <div class="floating-keys">
                        <span class="floating-key floating-key-a"></span>
                        <span class="floating-key floating-key-b"></span>
                        <span class="floating-key floating-key-c"></span>
                        <span class="floating-key floating-key-d"></span>
                    </div>
                </div>
                <div class="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div class="space-y-8">
                        <Badge variant="secondary" class="w-fit border-primary/30 bg-primary/10 text-primary">
                            Cloud Access
                        </Badge>
                        <div class="space-y-4">
                            <h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                                FeatherCloud Cloud Management
                            </h1>
                            <p class="max-w-2xl text-base text-muted-foreground sm:text-lg">
                                Connect your FeatherPanel instance to FeatherCloud using secure credentials that
                                identify your deployment to its owner. Enable access to premium plugins, FeatherAI, and
                                cloud-based threat intelligence to protect your infrastructure.
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <Button
                                size="lg"
                                :disabled="isLinking || isRegenerating"
                                class="gap-2"
                                @click="linkWithFeatherCloud"
                            >
                                <PlugZap :class="['h-4 w-4', isLinking && 'animate-spin']" />
                                {{
                                    isLinking
                                        ? 'Linking...'
                                        : hasCloudKeys
                                          ? 'Re-link with FeatherCloud'
                                          : 'Link with FeatherCloud'
                                }}
                            </Button>
                            <Button
                                size="lg"
                                variant="secondary"
                                :disabled="isRegenerating || isLinking"
                                class="gap-2"
                                @click="showRotateConfirmDialog = true"
                            >
                                <RefreshCw :class="['h-4 w-4', isRegenerating && 'animate-spin']" />
                                Rotate Keys
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                :disabled="isLoading || isLinking"
                                class="gap-2"
                                @click="fetchKeys"
                            >
                                <PlugZap class="h-4 w-4" />
                                Refresh Status
                            </Button>
                        </div>
                        <div class="grid gap-3 sm:grid-cols-2">
                            <div
                                class="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4"
                            >
                                <Key class="mt-0.5 h-4 w-4 text-primary" />
                                <p class="text-sm text-muted-foreground">
                                    These credentials uniquely identify your FeatherPanel instance to its owner,
                                    enabling secure access to cloud services.
                                </p>
                            </div>
                            <div
                                class="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4"
                            >
                                <LockKeyhole class="mt-0.5 h-4 w-4 text-primary" />
                                <p class="text-sm text-muted-foreground">
                                    Rotate keys whenever infrastructure changes or if you suspect key exposure to
                                    maintain security.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="relative">
                        <div
                            class="absolute -inset-8 bg-linear-to-br from-primary/20 via-transparent to-transparent blur-3xl"
                        />
                        <div
                            class="relative flex flex-col gap-5 rounded-3xl border border-border/60 bg-background/85 p-6 shadow-xl shadow-primary/10 backdrop-blur"
                        >
                            <div
                                class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1"
                            >
                                <Key class="h-4 w-4 text-primary" />
                                <span class="text-xs font-semibold uppercase tracking-widest text-primary">
                                    Current Credentials
                                </span>
                            </div>
                            <p class="text-lg font-semibold text-foreground">
                                Instance Identification & Cloud Access Credentials
                            </p>
                            <p class="text-sm text-muted-foreground">
                                These unique credentials identify your FeatherPanel instance to its owner and enable
                                access to Premium Plugins, FeatherAI, and the Cloud Intelligence Database for abuse
                                prevention.
                            </p>

                            <div class="space-y-4">
                                <div class="rounded-xl border border-border/70 bg-muted/30 p-4">
                                    <div class="flex items-center justify-between gap-2 mb-2">
                                        <p
                                            class="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                                        >
                                            Connection Status
                                        </p>
                                        <Badge
                                            v-if="hasCloudKeys && hasPanelKeys"
                                            variant="outline"
                                            class="border-green-500/30 text-green-600 dark:text-green-400 text-xs"
                                        >
                                            Connected
                                        </Badge>
                                        <Badge
                                            v-else
                                            variant="outline"
                                            class="border-yellow-500/30 text-yellow-600 dark:text-yellow-400 text-xs"
                                        >
                                            Not Connected
                                        </Badge>
                                    </div>
                                    <p class="text-sm text-muted-foreground mb-4">
                                        {{
                                            hasCloudKeys && hasPanelKeys
                                                ? 'Your panel is successfully linked with FeatherCloud. You can access premium plugins, FeatherAI, and cloud intelligence services.'
                                                : 'Link your panel with FeatherCloud to access premium features and services.'
                                        }}
                                    </p>
                                    <div
                                        v-if="hasCloudKeys && hasPanelKeys"
                                        class="space-y-2 text-xs text-muted-foreground"
                                    >
                                        <p>
                                            <span class="font-semibold">FeatherCloud → Panel:</span>
                                            {{
                                                keys.cloudCredentials.lastRotatedAt
                                                    ? new Date(keys.cloudCredentials.lastRotatedAt).toLocaleString()
                                                    : 'Never'
                                            }}
                                        </p>
                                        <p>
                                            <span class="font-semibold">Panel → FeatherCloud:</span>
                                            {{
                                                keys.panelCredentials.lastRotatedAt
                                                    ? new Date(keys.panelCredentials.lastRotatedAt).toLocaleString()
                                                    : 'Never'
                                            }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Key Features Section -->
            <section class="space-y-6">
                <div class="text-center space-y-2">
                    <h2 class="text-2xl font-bold text-foreground">Unlock Cloud-Powered Features</h2>
                    <p class="text-muted-foreground">
                        Your credentials enable access to these powerful FeatherCloud services
                    </p>
                </div>
                <div class="grid gap-6 md:grid-cols-3">
                    <Card
                        class="group relative overflow-hidden border-2 border-primary/30 bg-background/95 transition-all duration-300 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20"
                    >
                        <div
                            class="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-primary via-primary/60 to-primary/30"
                        />
                        <CardHeader class="space-y-4 pb-6">
                            <div
                                class="flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/10 text-primary transition-transform group-hover:scale-110"
                            >
                                <Brain class="h-7 w-7" />
                            </div>
                            <div>
                                <Badge
                                    variant="outline"
                                    class="mb-2 bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs"
                                >
                                    Coming Soon
                                </Badge>
                                <CardTitle class="text-xl font-semibold text-foreground">FeatherAI</CardTitle>
                            </div>
                            <CardDescription class="text-sm leading-relaxed text-muted-foreground">
                                Access FeatherPanel's built-in AI model for intelligent automation, analysis, and
                                assistance without requiring external API keys. Get AI-powered insights and
                                recommendations directly integrated into your panel.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card
                        class="group relative overflow-hidden border-2 border-primary/30 bg-background/95 transition-all duration-300 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20"
                    >
                        <div
                            class="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-primary via-primary/60 to-primary/30"
                        />
                        <CardHeader class="space-y-4 pb-6">
                            <div
                                class="flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/10 text-primary transition-transform group-hover:scale-110"
                            >
                                <Store class="h-7 w-7" />
                            </div>
                            <div>
                                <Badge
                                    variant="outline"
                                    class="mb-2 bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs"
                                >
                                    Premium
                                </Badge>
                                <CardTitle class="text-xl font-semibold text-foreground">Premium Plugins</CardTitle>
                            </div>
                            <CardDescription class="text-sm leading-relaxed text-muted-foreground">
                                Download and install paid plugins directly from the FeatherCloud marketplace. Browse
                                premium extensions, purchase licenses, and install them seamlessly without leaving your
                                panel interface.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card
                        class="group relative overflow-hidden border-2 border-primary/30 bg-background/95 transition-all duration-300 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20"
                    >
                        <div
                            class="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-primary via-primary/60 to-primary/30"
                        />
                        <CardHeader class="space-y-4 pb-6">
                            <div
                                class="flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-primary/10 text-primary transition-transform group-hover:scale-110"
                            >
                                <ShieldCheck class="h-7 w-7" />
                            </div>
                            <div>
                                <Badge
                                    variant="outline"
                                    class="mb-2 bg-green-500/10 text-green-600 border-green-500/30 text-xs"
                                >
                                    Active
                                </Badge>
                                <CardTitle class="text-xl font-semibold text-foreground">
                                    Cloud Intelligence Database
                                </CardTitle>
                            </div>
                            <CardDescription class="text-sm leading-relaxed text-muted-foreground">
                                Protect your host from abuse with real-time threat intelligence. Access a shared
                                database of reported users, suspicious activities, and abuse patterns from across the
                                FeatherCloud network to prevent malicious actors.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </section>

            <!-- Cloud Information Section -->
            <section v-if="hasCloudKeys" class="space-y-6">
                <div class="flex items-center justify-between">
                    <div class="text-center space-y-2 flex-1">
                        <h2 class="text-2xl font-bold text-foreground">Cloud Information</h2>
                        <p class="text-muted-foreground">Your FeatherCloud team and resource information</p>
                    </div>
                    <Button
                        variant="outline"
                        :disabled="isRefreshingCloudData || cloudLoading"
                        class="gap-2"
                        @click="refreshCloudData"
                    >
                        <RefreshCw :class="['h-4 w-4', (isRefreshingCloudData || cloudLoading) && 'animate-spin']" />
                        Refresh
                    </Button>
                </div>

                <div v-if="cloudLoading || isRefreshingCloudData" class="flex items-center justify-center py-12">
                    <div class="flex items-center gap-3">
                        <div
                            class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"
                        ></div>
                        <span class="text-muted-foreground">Loading cloud data...</span>
                    </div>
                </div>

                <div v-else-if="cloudSummary || cloudCredits || cloudTeam" class="grid gap-6 md:grid-cols-3">
                    <!-- Team Info Card -->
                    <Card v-if="cloudTeam" class="border border-border/70 bg-background/95">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-2 rounded-lg bg-blue-500/10">
                                    <Users class="h-5 w-5 text-blue-500" />
                                </div>
                                <CardTitle class="text-lg font-semibold text-foreground">Team</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-2">
                            <div>
                                <p class="text-sm text-muted-foreground">Team Name</p>
                                <p class="text-base font-medium text-foreground">{{ cloudTeam.team.name }}</p>
                            </div>
                            <div v-if="cloudTeam.team.description">
                                <p class="text-sm text-muted-foreground">Description</p>
                                <p class="text-sm text-foreground">{{ cloudTeam.team.description }}</p>
                            </div>
                            <div v-if="cloudSummary">
                                <p class="text-sm text-muted-foreground">Total Members</p>
                                <p class="text-base font-medium text-foreground">
                                    {{ cloudSummary.statistics.total_members }}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Credits Card -->
                    <Card v-if="cloudCredits" class="border border-border/70 bg-background/95">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-2 rounded-lg bg-amber-500/10">
                                    <Coins class="h-5 w-5 text-amber-500" />
                                </div>
                                <CardTitle class="text-lg font-semibold text-foreground">Credits</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-2">
                            <div>
                                <p class="text-sm text-muted-foreground">Total Credits</p>
                                <p class="text-2xl font-bold text-foreground">
                                    {{ cloudCredits.total_credits.toLocaleString() }}
                                </p>
                            </div>
                            <div>
                                <p class="text-sm text-muted-foreground">Team Members</p>
                                <p class="text-base font-medium text-foreground">{{ cloudCredits.member_count }}</p>
                            </div>
                            <div v-if="cloudCredits.member_credits.length > 0" class="pt-2 border-t">
                                <p class="text-xs text-muted-foreground mb-2">Top Contributors</p>
                                <div class="space-y-1">
                                    <div
                                        v-for="member in cloudCredits.member_credits.slice(0, 3)"
                                        :key="member.user_uuid"
                                        class="flex items-center justify-between text-sm"
                                    >
                                        <span class="text-foreground truncate">{{ member.username }}</span>
                                        <span class="font-medium text-foreground ml-2">
                                            {{ member.credits.toLocaleString() }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <!-- Statistics Card -->
                    <Card v-if="cloudSummary" class="border border-border/70 bg-background/95">
                        <CardHeader>
                            <div class="flex items-center gap-3">
                                <div class="p-2 rounded-lg bg-green-500/10">
                                    <BarChart3 class="h-5 w-5 text-green-500" />
                                </div>
                                <CardTitle class="text-lg font-semibold text-foreground">Statistics</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent class="space-y-3">
                            <div>
                                <p class="text-sm text-muted-foreground">Total Purchases</p>
                                <p class="text-2xl font-bold text-foreground">
                                    {{ cloudSummary.statistics.total_purchases }}
                                </p>
                            </div>
                            <div>
                                <p class="text-sm text-muted-foreground">Cloud Instance</p>
                                <p class="text-base font-medium text-foreground">{{ cloudSummary.cloud.cloud_name }}</p>
                            </div>
                            <div>
                                <p class="text-sm text-muted-foreground">Panel URL</p>
                                <p class="text-sm text-foreground break-all">
                                    {{ cloudSummary.cloud.featherpanel_url }}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div v-else-if="hasCloudKeys" class="text-center py-12">
                    <p class="text-muted-foreground">No cloud data available. Click refresh to load information.</p>
                </div>
            </section>

            <!-- Additional Benefits Section -->
            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card
                    v-for="block in [
                        {
                            id: 'identification',
                            title: 'Instance Identification',
                            description:
                                'Your credentials uniquely identify your FeatherPanel instance to its owner, enabling secure cloud services.',
                            icon: Key,
                        },
                        {
                            id: 'security',
                            title: 'Security & Privacy',
                            description:
                                'All credentials are encrypted and scoped to your environment. Rotate keys anytime to maintain security.',
                            icon: LockKeyhole,
                        },
                        {
                            id: 'scoped',
                            title: 'Permission-Based Access',
                            description:
                                'Keys inherit administrator permissions, ensuring granular control over cloud service access.',
                            icon: ShieldCheck,
                        },
                        {
                            id: 'observability',
                            title: 'Full Audit Trail',
                            description:
                                'Every cloud service interaction is logged within FeatherPanel for complete traceability and auditing.',
                            icon: BarChart3,
                        },
                    ]"
                    :key="block.id"
                    class="group relative overflow-hidden border border-border/70 bg-background/95 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                >
                    <div
                        class="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-primary/20 to-transparent"
                    />
                    <CardHeader class="space-y-4 pb-6">
                        <div
                            class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
                        >
                            <component :is="block.icon" class="h-5 w-5" />
                        </div>
                        <CardTitle class="text-lg font-semibold text-foreground">{{ block.title }}</CardTitle>
                        <CardDescription class="text-sm leading-relaxed text-muted-foreground">
                            {{ block.description }}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </section>

            <!-- Link with FeatherCloud Section -->
            <section class="space-y-6">
                <div class="text-center space-y-2">
                    <h2 class="text-2xl font-bold text-foreground">Link with FeatherCloud</h2>
                    <p class="text-muted-foreground">
                        Connect your panel to FeatherCloud using OAuth2 to automatically configure credentials and
                        enable cloud services
                    </p>
                </div>
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground"> OAuth2 Integration </CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            Click the button below to securely link your panel with FeatherCloud. This will redirect you
                            to FeatherCloud's OAuth2 page where you can authorize the connection. Your credentials will
                            be automatically configured.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="flex flex-wrap gap-3">
                            <Button size="lg" :disabled="isLinking" class="gap-2" @click="linkWithFeatherCloud">
                                <PlugZap :class="['h-4 w-4', isLinking && 'animate-spin']" />
                                {{
                                    isLinking
                                        ? 'Redirecting to FeatherCloud...'
                                        : hasCloudKeys && hasPanelKeys
                                          ? 'Re-link with FeatherCloud'
                                          : 'Link with FeatherCloud'
                                }}
                            </Button>
                        </div>
                        <div class="rounded-md border border-blue-500/30 bg-blue-500/10 p-4 space-y-2">
                            <p class="text-sm font-semibold text-blue-800 dark:text-blue-300">How it works:</p>
                            <ul class="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-400 pl-2">
                                <li>You'll be redirected to FeatherCloud's OAuth2 authorization page</li>
                                <li>Your panel information (name, logo, URL) will be securely shared</li>
                                <li>FeatherCloud will generate and store the necessary credentials</li>
                                <li>You'll be redirected back to your panel once the connection is established</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>

        <!-- Rotate Keys Confirmation Dialog -->
        <AlertDialog :open="showRotateConfirmDialog" @update:open="(val: boolean) => (showRotateConfirmDialog = val)">
            <AlertDialogContent class="max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2">
                        <RefreshCw class="h-5 w-5 text-primary" />
                        Confirm Key Rotation
                    </AlertDialogTitle>
                    <AlertDialogDescription class="space-y-3 pt-2">
                        <p class="text-sm text-foreground">
                            Are you sure you want to rotate your FeatherCloud credentials? This action will generate new
                            keys for your panel.
                        </p>
                        <div class="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-2">
                            <p class="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Important:</p>
                            <ul
                                class="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-400 pl-2"
                            >
                                <li>New keys will be generated immediately</li>
                                <li>You must update your FeatherCloud account with the new keys</li>
                                <li>Old keys will no longer work after rotation</li>
                                <li v-if="!hasCloudKeys" class="font-semibold">
                                    Cloud credentials are currently empty - premium plugins cannot be downloaded until
                                    FeatherCloud credentials are configured
                                </li>
                            </ul>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-primary hover:bg-primary/90"
                        :disabled="isRegenerating"
                        @click="
                            showRotateConfirmDialog = false;
                            regenerateKeys();
                        "
                    >
                        <RefreshCw :class="['h-4 w-4 mr-2', isRegenerating && 'animate-spin']" />
                        {{ isRegenerating ? 'Rotating...' : 'Rotate Keys' }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </DashboardLayout>
</template>

<style scoped>
.hero-blob {
    position: absolute;
    border-radius: 9999px;
    opacity: 0.6;
    animation: heroFloat 24s ease-in-out infinite;
    mix-blend-mode: screen;
}

.hero-blob-one {
    top: -25%;
    left: -18%;
    width: 420px;
    height: 420px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.55), rgba(56, 189, 248, 0.18));
    filter: blur(55px);
    animation-delay: 0s;
}

.hero-blob-two {
    bottom: -28%;
    right: -12%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.4), rgba(14, 165, 233, 0.2));
    filter: blur(65px);
    animation-delay: 8s;
}

.hero-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.16) 1px, transparent 0);
    background-size: 44px 44px;
    opacity: 0.35;
    transform: translate3d(0, 0, 0);
    animation: gridDrift 32s linear infinite;
}

.keystream {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0), rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0));
    opacity: 0.35;
    transform: skewY(-6deg);
    animation: keystreamFlow 18s linear infinite;
}

.keystream-two {
    transform: skewY(8deg);
    animation-delay: 6s;
}

.floating-keys {
    position: absolute;
    inset: 0;
}

.floating-key {
    position: absolute;
    width: 12px;
    height: 28px;
    border-radius: 999px 999px 999px 999px;
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.75), rgba(14, 165, 233, 0.4));
    transform-origin: center;
    animation: floatingKeys 26s ease-in-out infinite;
}

.floating-key::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(14, 165, 233, 0.6);
}

.floating-key-a {
    top: 18%;
    left: 28%;
    animation-delay: 0s;
}

.floating-key-b {
    top: 40%;
    left: 68%;
    animation-delay: 6s;
}

.floating-key-c {
    top: 62%;
    left: 24%;
    animation-delay: 12s;
}

.floating-key-d {
    top: 78%;
    left: 54%;
    animation-delay: 18s;
}

@keyframes heroFloat {
    0%,
    100% {
        transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
        transform: translate3d(0, -18px, 0) scale(1.08);
    }
}

@keyframes gridDrift {
    0% {
        transform: translate3d(0, 0, 0);
    }
    50% {
        transform: translate3d(-32px, -18px, 0);
    }
    100% {
        transform: translate3d(0, 0, 0);
    }
}

@keyframes keystreamFlow {
    0% {
        transform: translate3d(-10%, 0, 0) skewY(-6deg);
    }
    50% {
        transform: translate3d(8%, 0, 0) skewY(-6deg);
    }
    100% {
        transform: translate3d(-10%, 0, 0) skewY(-6deg);
    }
}

@keyframes floatingKeys {
    0%,
    100% {
        transform: translate3d(0, 0, 0) rotate(0deg);
        opacity: 0.6;
    }
    50% {
        transform: translate3d(6px, -26px, 0) rotate(12deg);
        opacity: 1;
    }
}

/* Full-screen dialog fade transition */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
