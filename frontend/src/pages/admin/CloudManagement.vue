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
import { Input } from '@/components/ui/input';
import { useToast } from 'vue-toastification';
import {
    AlertTriangle,
    BarChart3,
    Brain,
    Copy,
    Eye,
    EyeOff,
    Key,
    LockKeyhole,
    PlugZap,
    RefreshCw,
    ShieldCheck,
    Store,
    X,
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
const showPrivateKey = ref<boolean>(false);
const showCloudPrivateKey = ref<boolean>(false);
const manualPanelKeys = reactive({
    publicKey: '',
    privateKey: '',
});
const manualCloudKeys = reactive({
    publicKey: '',
    privateKey: '',
});
const revealManualPanel = ref<boolean>(false);
const revealManualCloud = ref<boolean>(false);
const isSavingManual = ref<boolean>(false);
const isSavingCloud = ref<boolean>(false);
const showExperimentalDialog = ref<boolean>(false);

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
        toast.success('Cloud credentials rotated');
    } catch (error) {
        toast.error('Failed to rotate cloud credentials');
        console.error(error);
    } finally {
        isRegenerating.value = false;
    }
};

const copyToClipboard = async (value: string, label: string) => {
    try {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copied to clipboard`);
    } catch (error) {
        toast.error(`Failed to copy ${label.toLowerCase()}`);
        console.error(error);
    }
};

const savePanelKeys = async (): Promise<void> => {
    const trimmedPublic = manualPanelKeys.publicKey.trim();
    const trimmedPrivate = manualPanelKeys.privateKey.trim();

    if (!trimmedPublic || !trimmedPrivate) {
        toast.error('Please provide both the panel-side public and private keys.');
        return;
    }

    isSavingManual.value = true;
    try {
        const response = await axios.put('/api/admin/cloud/credentials/panel', {
            public_key: trimmedPublic,
            private_key: trimmedPrivate,
        });
        const payload = response.data?.data;
        const panel = payload?.panel_credentials;
        keys.panelCredentials.publicKey = panel?.public_key ?? trimmedPublic;
        keys.panelCredentials.privateKey = panel?.private_key ?? trimmedPrivate;
        keys.panelCredentials.lastRotatedAt = panel?.last_rotated_at ?? keys.panelCredentials.lastRotatedAt;
        if (payload?.cloud_credentials) {
            keys.cloudCredentials.publicKey = payload.cloud_credentials.public_key ?? keys.cloudCredentials.publicKey;
            keys.cloudCredentials.privateKey =
                payload.cloud_credentials.private_key ?? keys.cloudCredentials.privateKey;
            keys.cloudCredentials.lastRotatedAt =
                payload.cloud_credentials.last_rotated_at ?? keys.cloudCredentials.lastRotatedAt;
        }
        toast.success('Panel credentials saved');
    } catch (error) {
        toast.error('Failed to save panel credentials');
        console.error(error);
    } finally {
        isSavingManual.value = false;
    }
};

const saveCloudKeys = async (): Promise<void> => {
    const trimmedPublic = manualCloudKeys.publicKey.trim();
    const trimmedPrivate = manualCloudKeys.privateKey.trim();

    if (!trimmedPublic || !trimmedPrivate) {
        toast.error('Please provide both the FeatherCloud public and private keys.');
        return;
    }

    isSavingCloud.value = true;
    try {
        const response = await axios.put('/api/admin/cloud/credentials/cloud', {
            public_key: trimmedPublic,
            private_key: trimmedPrivate,
        });
        const payload = response.data?.data;
        const cloud = payload?.cloud_credentials;
        keys.cloudCredentials.publicKey = cloud?.public_key ?? trimmedPublic;
        keys.cloudCredentials.privateKey = cloud?.private_key ?? trimmedPrivate;
        keys.cloudCredentials.lastRotatedAt = cloud?.last_rotated_at ?? keys.cloudCredentials.lastRotatedAt;
        if (payload?.panel_credentials) {
            keys.panelCredentials.publicKey = payload.panel_credentials.public_key ?? keys.panelCredentials.publicKey;
            keys.panelCredentials.privateKey =
                payload.panel_credentials.private_key ?? keys.panelCredentials.privateKey;
            keys.panelCredentials.lastRotatedAt =
                payload.panel_credentials.last_rotated_at ?? keys.panelCredentials.lastRotatedAt;
        }
        toast.success('FeatherCloud credentials saved');
    } catch (error) {
        toast.error('Failed to save FeatherCloud credentials');
        console.error(error);
    } finally {
        isSavingCloud.value = false;
    }
};

const EXPERIMENTAL_DIALOG_DISMISSED_KEY = 'feathercloud-experimental-dialog-dismissed';

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

    // Show experimental dialog if not dismissed
    const isDismissed = localStorage.getItem(EXPERIMENTAL_DIALOG_DISMISSED_KEY);
    if (!isDismissed) {
        showExperimentalDialog.value = true;
    }

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

const dismissExperimentalDialog = () => {
    localStorage.setItem(EXPERIMENTAL_DIALOG_DISMISSED_KEY, 'true');
    showExperimentalDialog.value = false;
};

watch(
    () => keys.panelCredentials.publicKey,
    (value) => {
        manualPanelKeys.publicKey = value ?? '';
    },
    { immediate: true },
);

watch(
    () => keys.panelCredentials.privateKey,
    (value) => {
        manualPanelKeys.privateKey = value ?? '';
    },
    { immediate: true },
);

watch(
    () => keys.cloudCredentials.publicKey,
    (value) => {
        manualCloudKeys.publicKey = value ?? '';
    },
    { immediate: true },
);

watch(
    () => keys.cloudCredentials.privateKey,
    (value) => {
        manualCloudKeys.privateKey = value ?? '';
    },
    { immediate: true },
);
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <!-- Full-Screen Experimental Dialog -->
        <Teleport to="body">
            <Transition name="fade">
                <div
                    v-if="showExperimentalDialog"
                    class="fixed inset-0 z-9999 overflow-y-auto"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="experimental-dialog-title"
                >
                    <!-- Dark Overlay Background -->
                    <div class="fixed inset-0 bg-black/80" @click="dismissExperimentalDialog"></div>
                    <!-- Full Screen Content -->
                    <div class="relative min-h-screen w-full bg-background flex flex-col">
                        <!-- Header -->
                        <div
                            class="sticky top-0 z-10 border-b border-border/70 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
                        >
                            <div class="container mx-auto px-6 py-4 flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
                                        <AlertTriangle class="h-6 w-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                class="bg-amber-500/20 text-amber-600 border-amber-500/40"
                                            >
                                                Experimental Feature
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                class="bg-blue-500/20 text-blue-600 border-blue-500/40"
                                            >
                                                Coming Soon
                                            </Badge>
                                        </div>
                                        <h2 class="text-xl font-bold text-foreground mt-1">
                                            FeatherCloud Cloud Management - Experimental
                                        </h2>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="rounded-xs opacity-70 transition-opacity hover:opacity-100 hover:cursor-pointer"
                                    @click="dismissExperimentalDialog"
                                >
                                    <X class="h-5 w-5" />
                                    <span class="sr-only">Close</span>
                                </Button>
                            </div>
                        </div>

                        <!-- Content -->
                        <div class="flex-1 container mx-auto px-6 py-10 space-y-8">
                            <div class="max-w-4xl mx-auto space-y-8">
                                <!-- Welcome Message -->
                                <Card
                                    class="border-2 border-primary/50 bg-linear-to-br from-primary/10 via-primary/5 to-transparent"
                                >
                                    <CardContent class="p-6">
                                        <div class="space-y-4">
                                            <h3 class="text-2xl font-bold text-foreground">
                                                Welcome to FeatherCloud Cloud Management
                                            </h3>
                                            <p class="text-base text-muted-foreground">
                                                Connect your FeatherPanel instance to FeatherCloud using secure
                                                credentials that identify your deployment to its owner. These
                                                credentials enable access to powerful cloud services including Premium
                                                Plugins, FeatherAI, and the Cloud Intelligence Database.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Key Features Overview -->
                                <div>
                                    <h3 class="text-xl font-bold text-foreground mb-6">Cloud Services Access</h3>
                                    <div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
                                        <Card class="border border-border/70 bg-background/95">
                                            <CardContent class="p-6">
                                                <div class="flex items-start gap-4">
                                                    <div class="p-3 rounded-xl bg-blue-500/10">
                                                        <Brain class="h-6 w-6 text-blue-500" />
                                                    </div>
                                                    <div class="flex-1">
                                                        <Badge
                                                            variant="outline"
                                                            class="mb-2 bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs"
                                                        >
                                                            Coming Soon
                                                        </Badge>
                                                        <h4 class="font-semibold text-foreground mb-2">FeatherAI</h4>
                                                        <p class="text-sm text-muted-foreground">
                                                            Access FeatherPanel's built-in AI model for intelligent
                                                            automation, analysis, and assistance without external API
                                                            keys.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card class="border border-border/70 bg-background/95">
                                            <CardContent class="p-6">
                                                <div class="flex items-start gap-4">
                                                    <div class="p-3 rounded-xl bg-amber-500/10">
                                                        <Store class="h-6 w-6 text-amber-500" />
                                                    </div>
                                                    <div class="flex-1">
                                                        <Badge
                                                            variant="outline"
                                                            class="mb-2 bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs"
                                                        >
                                                            Premium
                                                        </Badge>
                                                        <h4 class="font-semibold text-foreground mb-2">
                                                            Premium Plugins
                                                        </h4>
                                                        <p class="text-sm text-muted-foreground">
                                                            Download and install paid plugins directly from the
                                                            FeatherCloud marketplace through your panel interface.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card class="border border-border/70 bg-background/95">
                                            <CardContent class="p-6">
                                                <div class="flex items-start gap-4">
                                                    <div class="p-3 rounded-xl bg-green-500/10">
                                                        <ShieldCheck class="h-6 w-6 text-green-500" />
                                                    </div>
                                                    <div class="flex-1">
                                                        <Badge
                                                            variant="outline"
                                                            class="mb-2 bg-green-500/10 text-green-600 border-green-500/30 text-xs"
                                                        >
                                                            Active
                                                        </Badge>
                                                        <h4 class="font-semibold text-foreground mb-2">
                                                            Cloud Intelligence Database
                                                        </h4>
                                                        <p class="text-sm text-muted-foreground">
                                                            Protect your host from abuse with real-time threat
                                                            intelligence from across the FeatherCloud network.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                <!-- Instance Identification Explanation -->
                                <Card class="border border-primary/30 bg-primary/5">
                                    <CardContent class="p-6">
                                        <div class="space-y-3">
                                            <h4 class="font-semibold text-foreground flex items-center gap-2">
                                                <Key class="h-5 w-5 text-primary" />
                                                Instance Identification & Ownership
                                            </h4>
                                            <p class="text-sm text-muted-foreground">
                                                Your credentials serve as a unique identifier that links your
                                                FeatherPanel instance to its owner. This secure identification enables
                                                FeatherCloud to verify your instance's authenticity and provide access
                                                to owner-specific services like premium plugins, AI features, and threat
                                                intelligence data.
                                            </p>
                                            <p class="text-sm text-muted-foreground">
                                                The Cloud Intelligence Database uses this identification to share abuse
                                                reports and threat information across the network, helping protect all
                                                FeatherPanel instances from malicious users and activities.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Action Buttons -->
                                <div class="flex justify-end gap-3 pt-6 border-t">
                                    <Button variant="outline" @click="dismissExperimentalDialog">
                                        Remind Me Later
                                    </Button>
                                    <Button @click="dismissExperimentalDialog"> Got It, Continue </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

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
                            <Button size="lg" :disabled="isRegenerating" class="gap-2" @click="regenerateKeys">
                                <RefreshCw :class="['h-4 w-4', isRegenerating && 'animate-spin']" />
                                Rotate Keys
                            </Button>
                            <Button
                                variant="secondary"
                                size="lg"
                                :disabled="isLoading"
                                class="gap-2"
                                @click="fetchKeys"
                            >
                                <PlugZap class="h-4 w-4" />
                                Refresh Values
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

                            <div class="rounded-xl border border-border/70 bg-muted/30 p-4">
                                <div class="flex items-center justify-between gap-2">
                                    <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        FeatherCloud → Panel
                                    </p>
                                    <Badge v-if="hasCloudKeys" variant="outline" class="border-primary/30 text-xs">
                                        Active
                                    </Badge>
                                </div>
                                <p class="text-sm text-foreground">
                                    {{ keys.cloudCredentials.publicKey || 'No public key stored' }}
                                </p>
                                <div class="mt-2 flex items-center gap-2">
                                    <Input
                                        class="border-0 bg-transparent px-0 text-sm text-foreground focus-visible:ring-0"
                                        :type="showCloudPrivateKey ? 'text' : 'password'"
                                        :value="keys.cloudCredentials.privateKey"
                                        readonly
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-8 w-8 text-muted-foreground hover:text-primary"
                                        @click="showCloudPrivateKey = !showCloudPrivateKey"
                                    >
                                        <LockKeyhole class="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-8 w-8 text-muted-foreground hover:text-primary"
                                        :disabled="!showCloudPrivateKey || !keys.cloudCredentials.privateKey"
                                        @click="
                                            copyToClipboard(
                                                keys.cloudCredentials.privateKey,
                                                'FeatherCloud private key',
                                            )
                                        "
                                    >
                                        <Copy class="h-4 w-4" />
                                    </Button>
                                </div>
                                <p class="text-[11px] text-muted-foreground">
                                    Updated:
                                    {{
                                        keys.cloudCredentials.lastRotatedAt
                                            ? new Date(keys.cloudCredentials.lastRotatedAt).toLocaleString()
                                            : 'Never'
                                    }}
                                </p>
                            </div>
                            <div class="space-y-5">
                                <div class="rounded-xl border border-border/70 bg-muted/30 p-4">
                                    <div class="flex items-center justify-between gap-2">
                                        <p
                                            class="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                                        >
                                            Panel → FeatherCloud
                                        </p>
                                        <Badge v-if="hasPanelKeys" variant="outline" class="border-primary/30 text-xs">
                                            Active
                                        </Badge>
                                    </div>
                                    <p class="text-sm text-foreground">
                                        {{ keys.panelCredentials.publicKey || 'No public key stored' }}
                                    </p>
                                    <div class="mt-2 flex items-center gap-2">
                                        <Input
                                            class="border-0 bg-transparent px-0 text-sm text-foreground focus-visible:ring-0"
                                            :type="showPrivateKey ? 'text' : 'password'"
                                            :value="keys.panelCredentials.privateKey"
                                            readonly
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            class="h-8 w-8 text-muted-foreground hover:text-primary"
                                            @click="showPrivateKey = !showPrivateKey"
                                        >
                                            <LockKeyhole class="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            class="h-8 w-8 text-muted-foreground hover:text-primary"
                                            :disabled="!showPrivateKey || !keys.panelCredentials.privateKey"
                                            @click="
                                                copyToClipboard(keys.panelCredentials.privateKey, 'Panel private key')
                                            "
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p class="text-[11px] text-muted-foreground">
                                        Rotated:
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

            <!-- Credential Management Section -->
            <section class="space-y-6">
                <div class="text-center space-y-2">
                    <h2 class="text-2xl font-bold text-foreground">Manage Your Credentials</h2>
                    <p class="text-muted-foreground">
                        Configure and manage the credentials that identify your instance and enable cloud services
                    </p>
                </div>
                <div class="grid gap-6 lg:grid-cols-2">
                    <Card class="border border-border/70 bg-background/95">
                        <CardHeader>
                            <CardTitle class="text-xl font-semibold text-foreground">
                                FeatherCloud → Panel credentials
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                Synchronise the keypair that FeatherCloud presents when calling this panel. Keep these
                                values aligned with the ones issued in your FeatherCloud workspace.
                            </CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-4">
                            <div class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    FeatherCloud public key
                                </label>
                                <Input
                                    v-model="manualCloudKeys.publicKey"
                                    placeholder="FCCLOUDPUB-..."
                                    class="text-sm"
                                    autocomplete="off"
                                />
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    FeatherCloud private key
                                </label>
                                <div class="flex items-center gap-2">
                                    <Input
                                        v-model="manualCloudKeys.privateKey"
                                        :type="revealManualCloud ? 'text' : 'password'"
                                        placeholder="Paste the private key issued by FeatherCloud"
                                        class="text-sm"
                                        autocomplete="off"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-9 w-9 text-muted-foreground hover:text-primary"
                                        @click="revealManualCloud = !revealManualCloud"
                                    >
                                        <Eye v-if="revealManualCloud" class="h-4 w-4" />
                                        <EyeOff v-else class="h-4 w-4" />
                                    </Button>
                                </div>
                                <p class="text-[11px] text-muted-foreground">
                                    Keep this value secret. Rotating keys here immediately invalidates old integrations.
                                </p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <Button :disabled="isSavingCloud" class="gap-2" @click="saveCloudKeys">
                                    <span v-if="isSavingCloud">Saving…</span>
                                    <span v-else>Save FeatherCloud Keys</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="isSavingCloud"
                                    @click="
                                        () => {
                                            manualCloudKeys.publicKey = keys.cloudCredentials.publicKey;
                                            manualCloudKeys.privateKey = keys.cloudCredentials.privateKey;
                                        }
                                    "
                                >
                                    Reset to stored FeatherCloud keys
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="border border-border/70 bg-background/95">
                        <CardHeader>
                            <CardTitle class="text-xl font-semibold text-foreground">
                                Panel → FeatherCloud credentials
                            </CardTitle>
                            <CardDescription class="text-sm text-muted-foreground">
                                Provide these keys to FeatherCloud so it can authenticate when talking back to this
                                panel.
                            </CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-4">
                            <div class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Panel public key
                                </label>
                                <Input
                                    v-model="manualPanelKeys.publicKey"
                                    placeholder="FCPUB-..."
                                    class="text-sm"
                                    autocomplete="off"
                                />
                            </div>
                            <div class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Panel private key
                                </label>
                                <div class="flex items-center gap-2">
                                    <Input
                                        v-model="manualPanelKeys.privateKey"
                                        :type="revealManualPanel ? 'text' : 'password'"
                                        placeholder="Paste or regenerate the private key shared with FeatherCloud"
                                        class="text-sm"
                                        autocomplete="off"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-9 w-9 text-muted-foreground hover:text-primary"
                                        @click="revealManualPanel = !revealManualPanel"
                                    >
                                        <Eye v-if="revealManualPanel" class="h-4 w-4" />
                                        <EyeOff v-else class="h-4 w-4" />
                                    </Button>
                                </div>
                                <p class="text-[11px] text-muted-foreground">
                                    Rotating these keys immediately invalidates any existing authentication sessions
                                    with FeatherCloud.
                                </p>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <Button :disabled="isSavingManual" class="gap-2" @click="savePanelKeys">
                                    <span v-if="isSavingManual">Saving…</span>
                                    <span v-else>Save Panel Keys</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    :disabled="isSavingManual"
                                    @click="
                                        () => {
                                            manualPanelKeys.publicKey = keys.panelCredentials.publicKey;
                                            manualPanelKeys.privateKey = keys.panelCredentials.privateKey;
                                        }
                                    "
                                >
                                    Reset to stored panel keys
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>
        </div>
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
