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
    CheckCircle2,
    Cloud,
    Copy,
    CreditCard,
    Download,
    Eye,
    EyeOff,
    Key,
    Link2,
    LockKeyhole,
    LogIn,
    Package,
    PlugZap,
    RefreshCw,
    Rocket,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Unlink,
    X,
    Zap,
} from 'lucide-vue-next';

interface CredentialPair {
    publicKey: string;
    privateKey: string;
    lastRotatedAt?: string;
}

interface CredentialResponse {
    panelCredentials: CredentialPair;
    cloudCredentials: CredentialPair;
}

interface CloudAccount {
    provider: 'featherpanel' | 'mythicalcloud';
    email?: string;
    username?: string;
    connected: boolean;
    lastConnectedAt?: string;
    apiToken?: string;
}

interface AIUsage {
    totalRequests: number;
    totalTokens: number;
    currentPeriodCost: number;
    currency: string;
    periodStart: string;
    periodEnd: string;
}

interface PremiumPlugin {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    version: string;
    author: string;
    installed: boolean;
    icon?: string;
}

const breadcrumbs: BreadcrumbEntry[] = [
    { text: 'Dashboard', href: '/admin' },
    {
        text: 'Cloud Management',
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

// Cloud account management
const featherPanelAccount = reactive<CloudAccount>({
    provider: 'featherpanel',
    connected: false,
});
const mythicalCloudAccount = reactive<CloudAccount>({
    provider: 'mythicalcloud',
    connected: false,
});

const featherPanelLogin = reactive({
    email: '',
    password: '',
    apiToken: '',
    useApiToken: false,
});
const mythicalCloudLogin = reactive({
    email: '',
    password: '',
    apiToken: '',
    useApiToken: false,
});

const isConnectingFeatherPanel = ref<boolean>(false);
const isConnectingMythicalCloud = ref<boolean>(false);
const isDisconnectingFeatherPanel = ref<boolean>(false);
const isDisconnectingMythicalCloud = ref<boolean>(false);

// AI Usage billing
const aiUsage = ref<AIUsage | null>(null);
const isLoadingAIUsage = ref<boolean>(false);

// Premium plugins
const premiumPlugins = ref<PremiumPlugin[]>([]);
const isLoadingPlugins = ref<boolean>(false);
const installingPluginId = ref<string | null>(null);

const hasPanelKeys = computed(() => Boolean(keys.panelCredentials.publicKey && keys.panelCredentials.privateKey));
const hasCloudKeys = computed(() => Boolean(keys.cloudCredentials.publicKey && keys.cloudCredentials.privateKey));

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

const connectFeatherPanelAccount = async (): Promise<void> => {
    if (
        !featherPanelLogin.email ||
        (!featherPanelLogin.useApiToken && !featherPanelLogin.password) ||
        (featherPanelLogin.useApiToken && !featherPanelLogin.apiToken)
    ) {
        toast.error('Please provide email and password or API token');
        return;
    }

    isConnectingFeatherPanel.value = true;
    try {
        const response = await axios.put('/api/admin/cloud/accounts/featherpanel', {
            email: featherPanelLogin.email,
            password: featherPanelLogin.useApiToken ? undefined : featherPanelLogin.password,
            api_token: featherPanelLogin.useApiToken ? featherPanelLogin.apiToken : undefined,
        });

        if (response.data && response.data.success) {
            const data = response.data.data;
            featherPanelAccount.email = data.email;
            featherPanelAccount.username = data.username;
            featherPanelAccount.connected = true;
            featherPanelAccount.lastConnectedAt = data.last_connected_at;
            featherPanelLogin.password = '';
            featherPanelLogin.apiToken = '';
            toast.success('FeatherPanel Cloud account connected successfully');
            await fetchAIUsage();
            await fetchPremiumPlugins();
        }
    } catch (error) {
        toast.error('Failed to connect FeatherPanel Cloud account');
        console.error(error);
    } finally {
        isConnectingFeatherPanel.value = false;
    }
};

const connectMythicalCloudAccount = async (): Promise<void> => {
    if (
        !mythicalCloudLogin.email ||
        (!mythicalCloudLogin.useApiToken && !mythicalCloudLogin.password) ||
        (mythicalCloudLogin.useApiToken && !mythicalCloudLogin.apiToken)
    ) {
        toast.error('Please provide email and password or API token');
        return;
    }

    isConnectingMythicalCloud.value = true;
    try {
        const response = await axios.put('/api/admin/cloud/accounts/mythicalcloud', {
            email: mythicalCloudLogin.email,
            password: mythicalCloudLogin.useApiToken ? undefined : mythicalCloudLogin.password,
            api_token: mythicalCloudLogin.useApiToken ? mythicalCloudLogin.apiToken : undefined,
        });

        if (response.data && response.data.success) {
            const data = response.data.data;
            mythicalCloudAccount.email = data.email;
            mythicalCloudAccount.username = data.username;
            mythicalCloudAccount.connected = true;
            mythicalCloudAccount.lastConnectedAt = data.last_connected_at;
            mythicalCloudLogin.password = '';
            mythicalCloudLogin.apiToken = '';
            toast.success('MythicalCloud account connected successfully');
            await fetchAIUsage();
            await fetchPremiumPlugins();
        }
    } catch (error) {
        toast.error('Failed to connect MythicalCloud account');
        console.error(error);
    } finally {
        isConnectingMythicalCloud.value = false;
    }
};

const disconnectFeatherPanelAccount = async (): Promise<void> => {
    isDisconnectingFeatherPanel.value = true;
    try {
        await axios.delete('/api/admin/cloud/accounts/featherpanel');
        featherPanelAccount.connected = false;
        featherPanelAccount.email = undefined;
        featherPanelAccount.username = undefined;
        featherPanelAccount.lastConnectedAt = undefined;
        toast.success('FeatherPanel Cloud account disconnected');
        aiUsage.value = null;
        premiumPlugins.value = [];
    } catch (error) {
        toast.error('Failed to disconnect FeatherPanel Cloud account');
        console.error(error);
    } finally {
        isDisconnectingFeatherPanel.value = false;
    }
};

const disconnectMythicalCloudAccount = async (): Promise<void> => {
    isDisconnectingMythicalCloud.value = true;
    try {
        await axios.delete('/api/admin/cloud/accounts/mythicalcloud');
        mythicalCloudAccount.connected = false;
        mythicalCloudAccount.email = undefined;
        mythicalCloudAccount.username = undefined;
        mythicalCloudAccount.lastConnectedAt = undefined;
        toast.success('MythicalCloud account disconnected');
        aiUsage.value = null;
        premiumPlugins.value = [];
    } catch (error) {
        toast.error('Failed to disconnect MythicalCloud account');
        console.error(error);
    } finally {
        isDisconnectingMythicalCloud.value = false;
    }
};

const fetchAIUsage = async (): Promise<void> => {
    if (!featherPanelAccount.connected && !mythicalCloudAccount.connected) {
        return;
    }

    isLoadingAIUsage.value = true;
    try {
        const response = await axios.get('/api/admin/cloud/ai-usage');
        if (response.data && response.data.success) {
            aiUsage.value = response.data.data;
        }
    } catch (error) {
        console.error('Failed to fetch AI usage:', error);
    } finally {
        isLoadingAIUsage.value = false;
    }
};

const fetchPremiumPlugins = async (): Promise<void> => {
    if (!featherPanelAccount.connected && !mythicalCloudAccount.connected) {
        return;
    }

    isLoadingPlugins.value = true;
    try {
        const response = await axios.get('/api/admin/cloud/plugins');
        if (response.data && response.data.success) {
            premiumPlugins.value = response.data.data.plugins || [];
        }
    } catch (error) {
        console.error('Failed to fetch premium plugins:', error);
    } finally {
        isLoadingPlugins.value = false;
    }
};

const installPlugin = async (pluginId: string): Promise<void> => {
    installingPluginId.value = pluginId;
    try {
        const response = await axios.post(`/api/admin/cloud/plugins/${pluginId}/install`);
        if (response.data && response.data.success) {
            toast.success('Plugin installed successfully');
            await fetchPremiumPlugins();
        }
    } catch (error) {
        toast.error('Failed to install plugin');
        console.error(error);
    } finally {
        installingPluginId.value = null;
    }
};

const fetchAccountStatus = async (): Promise<void> => {
    try {
        const response = await axios.get('/api/admin/cloud/accounts');
        if (response.data && response.data.success) {
            const data = response.data.data;
            if (data.featherpanel) {
                Object.assign(featherPanelAccount, data.featherpanel);
            }
            if (data.mythicalcloud) {
                Object.assign(mythicalCloudAccount, data.mythicalcloud);
            }
        }
    } catch (error) {
        console.error('Failed to fetch account status:', error);
    }
};

onMounted(() => {
    void fetchKeys();
    void fetchAccountStatus();
    void fetchAIUsage();
    void fetchPremiumPlugins();

    // Show experimental dialog if not dismissed
    const isDismissed = localStorage.getItem(EXPERIMENTAL_DIALOG_DISMISSED_KEY);
    if (!isDismissed) {
        showExperimentalDialog.value = true;
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
                                <!-- Warning Message -->
                                <Card
                                    class="border-2 border-amber-500/50 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent"
                                >
                                    <CardContent class="p-6">
                                        <div class="space-y-4">
                                            <h3 class="text-2xl font-bold text-foreground">
                                                This page is experimental - Full features are not yet implemented
                                            </h3>
                                            <p class="text-base text-muted-foreground">
                                                FeatherCloud Cloud Management is currently in active development. The
                                                features listed below are planned and will be available soon.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <!-- Coming Soon Features -->
                                <div>
                                    <h3 class="text-xl font-bold text-foreground mb-6">Coming Soon Features</h3>
                                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <Card class="border border-border/70 bg-background/95">
                                            <CardContent class="p-6">
                                                <div class="flex items-start gap-4">
                                                    <div class="p-3 rounded-xl bg-primary/10">
                                                        <Zap class="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div class="flex-1">
                                                        <h4 class="font-semibold text-foreground mb-2">
                                                            Paid Plugin Marketplace
                                                        </h4>
                                                        <p class="text-sm text-muted-foreground">
                                                            Download and install paid plugins directly from the panel
                                                            through FeatherCloud integration.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card class="border border-border/70 bg-background/95">
                                            <CardContent class="p-6">
                                                <div class="flex items-start gap-4">
                                                    <div class="p-3 rounded-xl bg-primary/10">
                                                        <ShieldCheck class="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div class="flex-1">
                                                        <h4 class="font-semibold text-foreground mb-2">
                                                            Thread Intelligence Database
                                                        </h4>
                                                        <p class="text-sm text-muted-foreground">
                                                            Access online threat intelligence databases for enhanced
                                                            security and threat detection across your infrastructure.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card class="border border-border/70 bg-background/95">
                                            <CardContent class="p-6">
                                                <div class="flex items-start gap-4">
                                                    <div class="p-3 rounded-xl bg-amber-500/10">
                                                        <AlertTriangle class="h-6 w-6 text-amber-500" />
                                                    </div>
                                                    <div class="flex-1">
                                                        <h4 class="font-semibold text-foreground mb-2">
                                                            Cross-Host Reporting
                                                        </h4>
                                                        <p class="text-sm text-muted-foreground">
                                                            See warnings when users or servers are reported by other
                                                            hosts for suspicious activity (e.g., crypto mining, abuse).
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card class="border border-border/70 bg-background/95">
                                            <CardContent class="p-6">
                                                <div class="flex items-start gap-4">
                                                    <div class="p-3 rounded-xl bg-primary/10">
                                                        <Sparkles class="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div class="flex-1">
                                                        <h4 class="font-semibold text-foreground mb-2">
                                                            FeatherAI Integration
                                                        </h4>
                                                        <p class="text-sm text-muted-foreground">
                                                            Use FeatherPanel's built-in AI model instead of external API
                                                            keys for intelligent automation and analysis.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card
                                            class="border border-border/70 bg-background/95 sm:col-span-2 lg:col-span-1"
                                        >
                                            <CardContent class="p-6">
                                                <div class="flex items-start gap-4">
                                                    <div class="p-3 rounded-xl bg-primary/10">
                                                        <Rocket class="h-6 w-6 text-primary" />
                                                    </div>
                                                    <div class="flex-1">
                                                        <h4 class="font-semibold text-foreground mb-2">
                                                            And Much More
                                                        </h4>
                                                        <p class="text-sm text-muted-foreground">
                                                            Additional cloud-powered features, integrations, and
                                                            services coming soon to enhance your panel experience.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                <!-- Example Explanation -->
                                <Card class="border border-primary/30 bg-primary/5">
                                    <CardContent class="p-6">
                                        <div class="space-y-3">
                                            <h4 class="font-semibold text-foreground flex items-center gap-2">
                                                <AlertTriangle class="h-5 w-5 text-amber-500" />
                                                Cross-Host Reporting Example
                                            </h4>
                                            <p class="text-sm text-muted-foreground">
                                                If Host X reports a user with email, username, first name, or last name
                                                for crypto mining, you'll see a warning when viewing that user's page
                                                indicating that 1 or more hosts have reported this user for crypto
                                                mining activity. This helps protect your infrastructure by sharing
                                                threat intelligence across the FeatherCloud network.
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
                                Cloud Management
                            </h1>
                            <p class="max-w-2xl text-base text-muted-foreground sm:text-lg">
                                Connect your FeatherPanel Cloud and MythicalCloud accounts to access premium plugins,
                                track AI usage billing, and manage cloud credentials—all without logging in every time.
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
                                <ShieldCheck class="mt-0.5 h-4 w-4 text-primary" />
                                <p class="text-sm text-muted-foreground">
                                    Keys are scoped to your environment and are required for FeatherCloud API access.
                                </p>
                            </div>
                            <div
                                class="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4"
                            >
                                <LockKeyhole class="mt-0.5 h-4 w-4 text-primary" />
                                <p class="text-sm text-muted-foreground">
                                    Rotate keys whenever infrastructure changes or if you suspect key exposure.
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
                                Public & private keypair for FeatherCloud integrations
                            </p>
                            <p class="text-sm text-muted-foreground">
                                Provide these credentials to FeatherCloud services and infrastructure components to
                                grant authenticated access back to your panel.
                            </p>

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

                                <div class="rounded-xl border border-border/70 bg-muted/30 p-4">
                                    <div class="flex items-center justify-between gap-2">
                                        <p
                                            class="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                                        >
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
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Cloud Account Connections -->
            <section class="grid gap-6 lg:grid-cols-2">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <div class="flex items-center justify-between">
                            <div>
                                <CardTitle class="text-xl font-semibold text-foreground flex items-center gap-2">
                                    <Cloud class="h-5 w-5 text-primary" />
                                    FeatherPanel Cloud
                                </CardTitle>
                                <CardDescription class="text-sm text-muted-foreground mt-1">
                                    Connect your FeatherPanel Cloud account to access premium plugins and AI services.
                                </CardDescription>
                            </div>
                            <Badge
                                v-if="featherPanelAccount.connected"
                                variant="outline"
                                class="border-green-500/30 bg-green-500/10 text-green-600"
                            >
                                <CheckCircle2 class="h-3 w-3 mr-1" />
                                Connected
                            </Badge>
                            <Badge v-else variant="outline" class="border-muted-foreground/30"> Disconnected </Badge>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div v-if="featherPanelAccount.connected" class="space-y-3">
                            <div class="rounded-lg border border-border/60 bg-muted/30 p-3">
                                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Account
                                </p>
                                <p class="text-sm font-medium text-foreground">
                                    {{ featherPanelAccount.email || featherPanelAccount.username }}
                                </p>
                                <p
                                    v-if="featherPanelAccount.lastConnectedAt"
                                    class="text-[11px] text-muted-foreground mt-1"
                                >
                                    Connected: {{ new Date(featherPanelAccount.lastConnectedAt).toLocaleString() }}
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                :disabled="isDisconnectingFeatherPanel"
                                class="w-full"
                                @click="disconnectFeatherPanelAccount"
                            >
                                <Unlink class="h-4 w-4 mr-2" />
                                <span v-if="isDisconnectingFeatherPanel">Disconnecting...</span>
                                <span v-else>Disconnect Account</span>
                            </Button>
                        </div>
                        <div v-else class="space-y-4">
                            <div class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Email
                                </label>
                                <Input
                                    v-model="featherPanelLogin.email"
                                    type="email"
                                    placeholder="your@email.com"
                                    class="text-sm"
                                    autocomplete="off"
                                />
                            </div>
                            <div class="flex items-center gap-2">
                                <input
                                    id="fp-use-token"
                                    v-model="featherPanelLogin.useApiToken"
                                    type="checkbox"
                                    class="h-4 w-4 rounded border-border"
                                />
                                <label for="fp-use-token" class="text-sm text-muted-foreground cursor-pointer">
                                    Use API token instead of password
                                </label>
                            </div>
                            <div v-if="!featherPanelLogin.useApiToken" class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Password
                                </label>
                                <Input
                                    v-model="featherPanelLogin.password"
                                    type="password"
                                    placeholder="Enter your password"
                                    class="text-sm"
                                    autocomplete="off"
                                />
                            </div>
                            <div v-else class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    API Token
                                </label>
                                <Input
                                    v-model="featherPanelLogin.apiToken"
                                    type="password"
                                    placeholder="Enter your API token"
                                    class="text-sm"
                                    autocomplete="off"
                                />
                            </div>
                            <Button
                                :disabled="isConnectingFeatherPanel"
                                class="w-full"
                                @click="connectFeatherPanelAccount"
                            >
                                <LogIn class="h-4 w-4 mr-2" />
                                <span v-if="isConnectingFeatherPanel">Connecting...</span>
                                <span v-else>Connect Account</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <div class="flex items-center justify-between">
                            <div>
                                <CardTitle class="text-xl font-semibold text-foreground flex items-center gap-2">
                                    <Sparkles class="h-5 w-5 text-primary" />
                                    MythicalCloud
                                </CardTitle>
                                <CardDescription class="text-sm text-muted-foreground mt-1">
                                    Connect your MythicalCloud account for additional services and integrations.
                                </CardDescription>
                            </div>
                            <Badge
                                v-if="mythicalCloudAccount.connected"
                                variant="outline"
                                class="border-green-500/30 bg-green-500/10 text-green-600"
                            >
                                <CheckCircle2 class="h-3 w-3 mr-1" />
                                Connected
                            </Badge>
                            <Badge v-else variant="outline" class="border-muted-foreground/30"> Disconnected </Badge>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div v-if="mythicalCloudAccount.connected" class="space-y-3">
                            <div class="rounded-lg border border-border/60 bg-muted/30 p-3">
                                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Account
                                </p>
                                <p class="text-sm font-medium text-foreground">
                                    {{ mythicalCloudAccount.email || mythicalCloudAccount.username }}
                                </p>
                                <p
                                    v-if="mythicalCloudAccount.lastConnectedAt"
                                    class="text-[11px] text-muted-foreground mt-1"
                                >
                                    Connected: {{ new Date(mythicalCloudAccount.lastConnectedAt).toLocaleString() }}
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                :disabled="isDisconnectingMythicalCloud"
                                class="w-full"
                                @click="disconnectMythicalCloudAccount"
                            >
                                <Unlink class="h-4 w-4 mr-2" />
                                <span v-if="isDisconnectingMythicalCloud">Disconnecting...</span>
                                <span v-else>Disconnect Account</span>
                            </Button>
                        </div>
                        <div v-else class="space-y-4">
                            <div class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Email
                                </label>
                                <Input
                                    v-model="mythicalCloudLogin.email"
                                    type="email"
                                    placeholder="your@email.com"
                                    class="text-sm"
                                    autocomplete="off"
                                />
                            </div>
                            <div class="flex items-center gap-2">
                                <input
                                    id="mc-use-token"
                                    v-model="mythicalCloudLogin.useApiToken"
                                    type="checkbox"
                                    class="h-4 w-4 rounded border-border"
                                />
                                <label for="mc-use-token" class="text-sm text-muted-foreground cursor-pointer">
                                    Use API token instead of password
                                </label>
                            </div>
                            <div v-if="!mythicalCloudLogin.useApiToken" class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    Password
                                </label>
                                <Input
                                    v-model="mythicalCloudLogin.password"
                                    type="password"
                                    placeholder="Enter your password"
                                    class="text-sm"
                                    autocomplete="off"
                                />
                            </div>
                            <div v-else class="space-y-2">
                                <label class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                    API Token
                                </label>
                                <Input
                                    v-model="mythicalCloudLogin.apiToken"
                                    type="password"
                                    placeholder="Enter your API token"
                                    class="text-sm"
                                    autocomplete="off"
                                />
                            </div>
                            <Button
                                :disabled="isConnectingMythicalCloud"
                                class="w-full"
                                @click="connectMythicalCloudAccount"
                            >
                                <LogIn class="h-4 w-4 mr-2" />
                                <span v-if="isConnectingMythicalCloud">Connecting...</span>
                                <span v-else>Connect Account</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <!-- AI Usage Billing -->
            <section v-if="featherPanelAccount.connected || mythicalCloudAccount.connected">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground flex items-center gap-2">
                            <TrendingUp class="h-5 w-5 text-primary" />
                            AI Usage & Billing
                        </CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            Track your AI usage and billing information across connected cloud accounts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div v-if="isLoadingAIUsage" class="flex items-center justify-center py-8">
                            <div class="flex items-center gap-3">
                                <div
                                    class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                                ></div>
                                <span class="text-sm text-muted-foreground">Loading usage data...</span>
                            </div>
                        </div>
                        <div v-else-if="aiUsage" class="grid gap-4 md:grid-cols-3">
                            <div class="rounded-xl border border-border/60 bg-muted/30 p-4">
                                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                                    Total Requests
                                </p>
                                <p class="text-2xl font-bold text-foreground">
                                    {{ aiUsage.totalRequests.toLocaleString() }}
                                </p>
                            </div>
                            <div class="rounded-xl border border-border/60 bg-muted/30 p-4">
                                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                                    Total Tokens
                                </p>
                                <p class="text-2xl font-bold text-foreground">
                                    {{ aiUsage.totalTokens.toLocaleString() }}
                                </p>
                            </div>
                            <div class="rounded-xl border border-border/60 bg-muted/30 p-4">
                                <p class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                                    Current Period Cost
                                </p>
                                <p class="text-2xl font-bold text-foreground">
                                    {{ aiUsage.currency }}{{ aiUsage.currentPeriodCost.toFixed(2) }}
                                </p>
                                <p class="text-[11px] text-muted-foreground mt-1">
                                    {{ new Date(aiUsage.periodStart).toLocaleDateString() }} -
                                    {{ new Date(aiUsage.periodEnd).toLocaleDateString() }}
                                </p>
                            </div>
                        </div>
                        <div v-else class="text-center py-8">
                            <p class="text-sm text-muted-foreground">No usage data available</p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <!-- Premium Plugins -->
            <section v-if="featherPanelAccount.connected || mythicalCloudAccount.connected">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <div class="flex items-center justify-between">
                            <div>
                                <CardTitle class="text-xl font-semibold text-foreground flex items-center gap-2">
                                    <Package class="h-5 w-5 text-primary" />
                                    Premium Plugins
                                </CardTitle>
                                <CardDescription class="text-sm text-muted-foreground">
                                    Browse and install premium plugins from the marketplace.
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                :disabled="isLoadingPlugins"
                                @click="fetchPremiumPlugins"
                            >
                                <RefreshCw :class="['h-4 w-4', isLoadingPlugins && 'animate-spin']" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div v-if="isLoadingPlugins" class="flex items-center justify-center py-8">
                            <div class="flex items-center gap-3">
                                <div
                                    class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                                ></div>
                                <span class="text-sm text-muted-foreground">Loading plugins...</span>
                            </div>
                        </div>
                        <div v-else-if="premiumPlugins.length > 0" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <Card
                                v-for="plugin in premiumPlugins"
                                :key="plugin.id"
                                class="border border-border/70 bg-background/95 hover:border-primary/50 transition-colors"
                            >
                                <CardHeader>
                                    <div class="flex items-start justify-between">
                                        <div class="flex-1">
                                            <CardTitle class="text-lg font-semibold text-foreground">
                                                {{ plugin.name }}
                                            </CardTitle>
                                            <CardDescription class="text-sm text-muted-foreground mt-1">
                                                {{ plugin.description }}
                                            </CardDescription>
                                        </div>
                                        <Badge v-if="plugin.installed" variant="outline" class="border-green-500/30">
                                            Installed
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent class="space-y-3">
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">Version</span>
                                        <span class="font-medium text-foreground">{{ plugin.version }}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">Author</span>
                                        <span class="font-medium text-foreground">{{ plugin.author }}</span>
                                    </div>
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">Price</span>
                                        <span class="font-bold text-foreground">
                                            {{ plugin.currency }}{{ plugin.price.toFixed(2) }}
                                        </span>
                                    </div>
                                    <Button
                                        v-if="!plugin.installed"
                                        :disabled="installingPluginId === plugin.id"
                                        class="w-full"
                                        @click="installPlugin(plugin.id)"
                                    >
                                        <Download class="h-4 w-4 mr-2" />
                                        <span v-if="installingPluginId === plugin.id">Installing...</span>
                                        <span v-else>Install Plugin</span>
                                    </Button>
                                    <Button v-else variant="outline" class="w-full" disabled>
                                        <CheckCircle2 class="h-4 w-4 mr-2" />
                                        Installed
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                        <div v-else class="text-center py-8">
                            <p class="text-sm text-muted-foreground">No premium plugins available</p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <!-- Credential Management Section -->
            <section class="grid gap-6 lg:grid-cols-2">
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
                        <CardTitle class="text-xl font-semibold text-foreground">Handshake expectations</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            FeatherCloud calls the panel using your keys via the <code>/api/cloud/v1/handshake</code>
                            endpoint.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-3 text-sm text-muted-foreground">
                        <p>
                            Every request must include the headers <code>X-Panel-Public-Key</code>,
                            <code>X-Panel-Private-Key</code>, <code>X-Cloud-Public-Key</code>, and
                            <code>X-Cloud-Private-Key</code>. The middleware validates all four values before any action
                            runs.
                        </p>
                        <p>
                            Successful requests receive a 200 response confirming the connection. Missing or invalid
                            keys return descriptive errors so you can diagnose configuration issues quickly.
                        </p>
                        <p>
                            Use the handshake endpoint first to confirm connectivity, then wire the same authentication
                            headers into your automation workflows.
                        </p>
                    </CardContent>
                </Card>
            </section>

            <section class="grid gap-6 lg:grid-cols-2">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">
                            Panel → FeatherCloud credentials
                        </CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            Provide these keys to FeatherCloud so it can authenticate when talking back to this panel.
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
                                Rotating these keys immediately invalidates any existing authentication sessions with
                                FeatherCloud.
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

                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground">Implementation checklist</CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            Confirm your integration is using the new two-way authentication flow correctly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-3 text-sm text-muted-foreground">
                        <ul class="space-y-2">
                            <li class="flex items-start gap-2">
                                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>Store both keypairs securely within your infrastructure secrets manager.</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>Send all four headers on every FeatherCloud → FeatherPanel request.</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>Rotate panel keys here after major infrastructure events.</span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>
                                    Update FeatherCloud whenever you rotate keys to keep the bidirectional handshake
                                    valid.
                                </span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </section>

            <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card
                    v-for="block in [
                        {
                            id: 'accounts',
                            title: 'Cloud Accounts',
                            description:
                                'Connect FeatherPanel Cloud and MythicalCloud accounts to access premium features without logging in every time.',
                            icon: Cloud,
                        },
                        {
                            id: 'plugins',
                            title: 'Premium Plugins',
                            description:
                                'Browse and install premium plugins directly from the marketplace with automatic updates and support.',
                            icon: Package,
                        },
                        {
                            id: 'billing',
                            title: 'AI Usage Billing',
                            description:
                                'Track your AI usage, token consumption, and billing information in real-time across all connected accounts.',
                            icon: CreditCard,
                        },
                        {
                            id: 'security',
                            title: 'Secure Storage',
                            description:
                                'Account credentials are encrypted and stored securely, allowing seamless access without repeated logins.',
                            icon: ShieldCheck,
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

            <section class="grid gap-6 lg:grid-cols-2">
                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground flex items-center gap-2">
                            <Link2 class="h-5 w-5 text-primary" />
                            Getting Started
                        </CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            Follow these steps to connect your cloud accounts and start using premium features.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <ol class="space-y-3 text-sm text-muted-foreground">
                            <li class="flex items-start gap-2">
                                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                <span>
                                    <strong class="text-foreground">Connect your accounts:</strong> Use your email and
                                    password or API token to connect FeatherPanel Cloud and/or MythicalCloud accounts.
                                </span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                <span>
                                    <strong class="text-foreground">Browse premium plugins:</strong> Once connected, you
                                    can browse and install premium plugins directly from the marketplace.
                                </span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                <span>
                                    <strong class="text-foreground">Track AI usage:</strong> Monitor your AI usage,
                                    token consumption, and billing information in real-time.
                                </span>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                                <span>
                                    <strong class="text-foreground">No repeated logins:</strong> Your credentials are
                                    stored securely, so you won't need to log in every time you use cloud features.
                                </span>
                            </li>
                        </ol>
                    </CardContent>
                </Card>

                <Card class="border border-border/70 bg-background/95">
                    <CardHeader>
                        <CardTitle class="text-xl font-semibold text-foreground flex items-center gap-2">
                            <ShieldCheck class="h-5 w-5 text-primary" />
                            Security & Privacy
                        </CardTitle>
                        <CardDescription class="text-sm text-muted-foreground">
                            Your account credentials are encrypted and stored securely.
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4 text-sm text-muted-foreground">
                        <p>
                            All account credentials are encrypted at rest and transmitted over secure connections. API
                            tokens are preferred over passwords for enhanced security.
                        </p>
                        <p>
                            You can disconnect your accounts at any time, which will immediately revoke access and clear
                            stored credentials. Reconnect when needed to restore access to premium features.
                        </p>
                        <p>
                            AI usage data and billing information are fetched in real-time from your connected accounts
                            and are not stored locally.
                        </p>
                    </CardContent>
                </Card>
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
