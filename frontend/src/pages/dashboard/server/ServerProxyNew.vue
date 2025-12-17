<!--
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
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
-->

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Reverse Proxy</h1>
                        <p class="text-sm text-muted-foreground">
                            Configure reverse proxy domains for your server
                            <span v-if="proxyEnabled" class="font-medium">
                                ({{ proxies.length }}/{{ settingsStore.serverProxyMaxPerServer }})
                            </span>
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="handleRefresh"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>Refresh</span>
                        </Button>
                        <Button
                            v-if="canManageProxy && proxyEnabled"
                            size="sm"
                            :disabled="loading || isMaxProxiesReached"
                            class="flex items-center gap-2"
                            @click="handleOpenCreateDrawer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>Create Proxy</span>
                        </Button>
                    </div>
                </div>

                <!-- Info Banner -->
                <div
                    class="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border-2 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
                >
                    <div class="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Info class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div class="flex-1 min-w-0 space-y-1">
                        <h3 class="font-semibold text-blue-800 dark:text-blue-200">Reverse Proxy Configuration</h3>
                        <p class="text-sm text-blue-700 dark:text-blue-300">
                            Configure custom domains to point to your server's ports. SSL certificates can be
                            automatically generated using Let's Encrypt or manually uploaded.
                        </p>
                    </div>
                </div>
            </div>

            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Feature Disabled State -->
            <Alert v-if="!proxyEnabled" variant="destructive" class="border-2">
                <AlertTitle>Proxy Management Disabled</AlertTitle>
                <AlertDescription>
                    Proxy management has been disabled for this server. Please contact an administrator if you need this
                    feature enabled.
                </AlertDescription>
            </Alert>

            <!-- Loading State -->
            <div v-else-if="loading && proxies.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">Loading...</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && proxies.length === 0"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
                                <ArrowRightLeft class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">No Proxy Configurations</h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            You haven't configured any reverse proxy domains yet. Create your first proxy configuration
                            to get started.
                        </p>
                    </div>
                    <Button
                        v-if="canManageProxy && proxyEnabled"
                        size="lg"
                        class="gap-2 shadow-lg"
                        :disabled="isMaxProxiesReached"
                        @click="handleOpenCreateDrawer"
                    >
                        <Plus class="h-5 w-5" />
                        Create Proxy
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: Before Proxies List -->
            <WidgetRenderer
                v-if="!loading && proxies.length > 0 && widgetsBeforeTable.length > 0"
                :widgets="widgetsBeforeTable"
            />

            <!-- Proxies List -->
            <Card v-if="!loading && proxies.length > 0" class="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ArrowRightLeft class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">Proxy Configurations</CardTitle>
                            <CardDescription class="text-sm">
                                Manage your reverse proxy domain configurations
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" class="text-xs">
                            {{ proxies.length }}
                            {{ proxies.length === 1 ? 'proxy' : 'proxies' }}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="proxy in proxies"
                            :key="proxy.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                        :class="proxy.ssl ? 'bg-green-500/10' : 'bg-muted'"
                                    >
                                        <component
                                            :is="proxy.ssl ? CheckCircle : ArrowRightLeft"
                                            class="h-5 w-5"
                                            :class="proxy.ssl ? 'text-green-500' : 'text-muted-foreground'"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-0 space-y-1">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="font-mono font-semibold text-sm break-all">
                                                {{ proxy.domain }}
                                            </span>
                                            <Badge v-if="proxy.ssl" variant="default" class="text-xs">
                                                {{ getSslTypeLabel(proxy.use_lets_encrypt) }}
                                            </Badge>
                                            <Badge variant="secondary" class="text-xs font-mono">
                                                {{ proxy.ip }}:{{ proxy.port }}
                                            </Badge>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span> Created: {{ formatDate(proxy.created_at) }} </span>
                                            <span v-if="proxy.use_lets_encrypt && proxy.client_email">
                                                Email: {{ proxy.client_email }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="canManageProxy" class="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        :disabled="deletingProxyId === proxy.id || loading"
                                        @click="handleDeleteProxy(proxy)"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">Delete</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Plugin Widgets: After Proxies List -->
            <WidgetRenderer
                v-if="!loading && proxies.length > 0 && widgetsAfterTable.length > 0"
                :widgets="widgetsAfterTable"
            />

            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
    </DashboardLayout>

    <!-- Create/Edit Proxy Drawer -->
    <Drawer
        :open="drawerOpen"
        @update:open="
            (val) => {
                if (!val) handleCloseDrawer();
            }
        "
    >
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Create Reverse Proxy</DrawerTitle>
                <DrawerDescription> Configure a new reverse proxy domain for your server </DrawerDescription>
            </DrawerHeader>
            <div class="px-4 pb-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                <form class="space-y-4" @submit.prevent="handleSaveProxy">
                    <!-- Domain -->
                    <div class="space-y-2">
                        <Label for="domain">Domain</Label>
                        <Input id="domain" v-model="form.domain" placeholder="example.com" :disabled="saving" />
                        <p v-if="errors.domain" class="text-sm text-destructive">{{ errors.domain }}</p>
                        <p class="text-xs text-muted-foreground">
                            Enter the domain name you want to use for this proxy (e.g., example.com or
                            subdomain.example.com)
                        </p>
                    </div>

                    <!-- Port -->
                    <div class="space-y-2">
                        <Label for="port">Target Port</Label>
                        <Select v-model="form.port" :disabled="saving || loadingAllocations">
                            <SelectTrigger>
                                <SelectValue placeholder="Select a port" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="allocation in allocations"
                                    :key="allocation.id"
                                    :value="String(allocation.port)"
                                >
                                    {{ allocation.ip }}:{{ allocation.port }}
                                    <span v-if="allocation.is_primary" class="ml-2 text-xs text-muted-foreground">
                                        (Primary)
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p v-if="errors.port" class="text-sm text-destructive">{{ errors.port }}</p>
                        <p class="text-xs text-muted-foreground">
                            Select the server port that this domain should proxy to
                        </p>
                    </div>

                    <!-- SSL Toggle -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <Label for="ssl">Enable SSL</Label>
                            <Button
                                type="button"
                                :variant="sslButtonVariant"
                                size="sm"
                                :disabled="saving"
                                class="min-w-[80px]"
                                @click="handleToggleSsl"
                            >
                                {{ sslButtonText }}
                            </Button>
                        </div>
                        <p class="text-xs text-muted-foreground">Enable SSL/TLS encryption for this proxy domain</p>
                    </div>

                    <!-- DNS Instructions (shown when SSL/Let's Encrypt is enabled) -->
                    <div v-if="showDnsInstructions" class="space-y-4">
                        <Card class="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                            <CardHeader class="pb-3">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0"
                                    >
                                        <Network class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div class="flex-1">
                                        <CardTitle class="text-base text-blue-900 dark:text-blue-100">
                                            DNS Verification Required
                                        </CardTitle>
                                        <CardDescription class="text-blue-700 dark:text-blue-300 mt-1">
                                            Before creating the proxy, you must configure a DNS A record pointing your
                                            domain to the server's IP address.
                                            <span v-if="form.ssl && form.use_lets_encrypt">
                                                This is required for Let's Encrypt certificate issuance.
                                            </span>
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent class="space-y-4">
                                <!-- DNS Records Display -->
                                <div v-if="targetIp" class="space-y-3">
                                    <div class="text-sm font-medium text-foreground">A Record</div>
                                    <div class="rounded-lg border-2 bg-card p-4 space-y-3">
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div class="space-y-1.5">
                                                <Label class="text-xs font-medium text-muted-foreground"> Type </Label>
                                                <div
                                                    class="flex items-center gap-2 px-3 py-2 rounded-md bg-muted font-mono text-sm"
                                                >
                                                    <Badge variant="secondary" class="font-mono">A</Badge>
                                                </div>
                                            </div>
                                            <div class="space-y-1.5">
                                                <Label class="text-xs font-medium text-muted-foreground"> Name </Label>
                                                <div class="px-3 py-2 rounded-md bg-muted font-mono text-sm break-all">
                                                    {{ displayDomain }}
                                                </div>
                                            </div>
                                            <div class="space-y-1.5">
                                                <Label class="text-xs font-medium text-muted-foreground"> Value </Label>
                                                <div class="px-3 py-2 rounded-md bg-muted font-mono text-sm break-all">
                                                    {{ targetIp }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Verification Status -->
                                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                                    <Button
                                        type="button"
                                        :disabled="!canVerifyDns || verifyingDns || saving"
                                        variant="default"
                                        class="shrink-0"
                                        @click="handleVerifyDns"
                                    >
                                        <Network v-if="!verifyingDns && !dnsVerified" class="h-4 w-4 mr-2" />
                                        <CheckCircle v-else-if="dnsVerified" class="h-4 w-4 mr-2 text-green-500" />
                                        <span v-if="verifyingDns" class="flex items-center gap-2">
                                            <span
                                                class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                                            ></span>
                                            Verifying...
                                        </span>
                                        <span v-else-if="dnsVerified"> DNS Verified </span>
                                        <span v-else> Verify DNS </span>
                                    </Button>
                                    <div class="flex-1 min-w-0">
                                        <Alert v-if="dnsVerificationError" variant="destructive" class="border-2">
                                            <AlertTriangle class="h-4 w-4" />
                                            <AlertDescription class="text-sm">
                                                {{ dnsVerificationError }}
                                            </AlertDescription>
                                        </Alert>
                                        <Alert
                                            v-else-if="dnsVerified"
                                            class="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                                        >
                                            <CheckCircle class="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <AlertDescription class="text-sm text-green-800 dark:text-green-200">
                                                DNS record is correctly configured
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- SSL Options (shown when SSL is enabled) -->
                    <div v-if="form.ssl" class="space-y-4 border-l-2 border-primary/20 pl-4">
                        <!-- Use Let's Encrypt -->
                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <Label for="use_lets_encrypt">Use Let's Encrypt</Label>
                                <Button
                                    type="button"
                                    :variant="letsEncryptButtonVariant"
                                    size="sm"
                                    :disabled="saving"
                                    class="min-w-[80px]"
                                    @click="handleToggleLetsEncrypt"
                                >
                                    {{ letsEncryptButtonText }}
                                </Button>
                            </div>
                            <p class="text-xs text-muted-foreground">
                                Automatically obtain and renew SSL certificates from Let's Encrypt
                            </p>
                        </div>

                        <!-- Let's Encrypt Email (shown when using Let's Encrypt) -->
                        <div v-if="form.use_lets_encrypt" class="space-y-2">
                            <Label for="client_email">Email Address</Label>
                            <Input
                                id="client_email"
                                v-model="form.client_email"
                                type="email"
                                placeholder="your@email.com"
                                :disabled="saving"
                            />
                            <p v-if="errors.client_email" class="text-sm text-destructive">
                                {{ errors.client_email }}
                            </p>
                            <p class="text-xs text-muted-foreground">
                                Email address used for Let's Encrypt certificate notifications and account recovery
                            </p>
                        </div>

                        <!-- Custom SSL Certificate (shown when NOT using Let's Encrypt) -->
                        <div v-if="!form.use_lets_encrypt" class="space-y-4">
                            <div class="space-y-2">
                                <Label for="ssl_cert">SSL Certificate</Label>
                                <Textarea
                                    id="ssl_cert"
                                    v-model="form.ssl_cert"
                                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                                    :disabled="saving"
                                    rows="6"
                                    class="font-mono text-xs"
                                />
                                <p v-if="errors.ssl_cert" class="text-sm text-destructive">
                                    {{ errors.ssl_cert }}
                                </p>
                                <p class="text-xs text-muted-foreground">
                                    Paste your SSL certificate (including the BEGIN and END lines)
                                </p>
                            </div>

                            <div class="space-y-2">
                                <Label for="ssl_key">SSL Private Key</Label>
                                <Textarea
                                    id="ssl_key"
                                    v-model="form.ssl_key"
                                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                                    :disabled="saving"
                                    rows="6"
                                    class="font-mono text-xs"
                                />
                                <p v-if="errors.ssl_key" class="text-sm text-destructive">
                                    {{ errors.ssl_key }}
                                </p>
                                <p class="text-xs text-muted-foreground">
                                    Paste your SSL private key (including the BEGIN and END lines)
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Error Message -->
                    <Alert v-if="formError" variant="destructive" class="border-2">
                        <AlertTitle>Failed to Create Proxy</AlertTitle>
                        <AlertDescription>{{ formError }}</AlertDescription>
                    </Alert>
                </form>
            </div>
            <DrawerFooter>
                <Button variant="outline" :disabled="saving" @click="handleCloseDrawer"> Cancel </Button>
                <Button :disabled="saving || loadingAllocations" @click="handleSaveProxy">
                    <span v-if="saving">Saving...</span>
                    <span v-else>Create Proxy</span>
                </Button>
            </DrawerFooter>
        </DrawerContent>
    </Drawer>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import type { BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { useToast } from 'vue-toastification';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Info, ArrowRightLeft, Plus, Network, CheckCircle, AlertTriangle, Trash2, RefreshCw } from 'lucide-vue-next';

const route = useRoute();
const toast = useToast();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();

const serverUuid = computed(() => route.params.uuidShort as string);
const proxyEnabled = computed(() => settingsStore.serverAllowUserMadeProxy);

interface ServerInfo {
    id: number;
    name: string;
    uuid: string;
}

interface ServerAllocation {
    id: number;
    node_id: number;
    ip: string;
    port: number;
    ip_alias?: string;
    notes?: string;
    is_primary?: boolean;
}

interface Proxy {
    id: number;
    server_id: number;
    domain: string;
    ip: string;
    port: number;
    ssl: boolean;
    use_lets_encrypt: boolean;
    client_email?: string | null;
    ssl_cert?: string | null;
    ssl_key?: string | null;
    created_at: string;
    updated_at: string;
}

const serverInfo = ref<ServerInfo | null>(null);
const allocations = ref<ServerAllocation[]>([]);
const loadingAllocations = ref<boolean>(false);
const proxies = ref<Proxy[]>([]);
const loading = ref<boolean>(false);
const deletingProxyId = ref<number | null>(null);

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-proxy');
const widgetsTopOfPage = computed(() => getWidgets('server-proxy', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-proxy', 'after-header'));
const widgetsBeforeTable = computed(() => getWidgets('server-proxy', 'before-proxies-list'));
const widgetsAfterTable = computed(() => getWidgets('server-proxy', 'after-proxies-list'));
const widgetsBottomOfPage = computed(() => getWidgets('server-proxy', 'bottom-of-page'));

const breadcrumbs = computed<BreadcrumbEntry[]>(() => [
    { text: 'Dashboard', href: '/dashboard' },
    { text: 'Servers', href: '/dashboard' },
    { text: serverInfo.value?.name || 'Server', href: `/server/${route.params.uuidShort}` },
    { text: 'Reverse Proxy', isCurrent: true, href: `/server/${route.params.uuidShort}/proxy` },
]);

const drawerOpen = ref<boolean>(false);
const saving = ref<boolean>(false);
const formError = ref<string | null>(null);
const dnsVerified = ref<boolean>(false);
const verifyingDns = ref<boolean>(false);
const dnsVerificationError = ref<string | null>(null);
const targetIp = ref<string | null>(null);

const form = reactive<{
    domain: string;
    port: string;
    ssl: boolean;
    use_lets_encrypt: boolean;
    client_email: string;
    ssl_cert: string;
    ssl_key: string;
}>({
    domain: '',
    port: '',
    ssl: false,
    use_lets_encrypt: false,
    client_email: '',
    ssl_cert: '',
    ssl_key: '',
});

const errors = reactive<{
    domain: string;
    port: string;
    client_email: string;
    ssl_cert: string;
    ssl_key: string;
}>({
    domain: '',
    port: '',
    client_email: '',
    ssl_cert: '',
    ssl_key: '',
});

const canManageProxy = computed<boolean>(() => {
    return sessionStore.hasPermission('proxy.manage');
});

const isMaxProxiesReached = computed<boolean>(() => {
    return proxies.value.length >= settingsStore.serverProxyMaxPerServer;
});

const sslButtonText = computed<string>(() => {
    return form.ssl ? 'On' : 'Off';
});

const sslButtonVariant = computed<'default' | 'outline'>(() => {
    return form.ssl ? 'default' : 'outline';
});

const letsEncryptButtonText = computed<string>(() => {
    return form.use_lets_encrypt ? 'On' : 'Off';
});

const letsEncryptButtonVariant = computed<'default' | 'outline'>(() => {
    return form.use_lets_encrypt ? 'default' : 'outline';
});

const showDnsInstructions = computed<boolean>(() => {
    return Boolean(form.domain.trim() && form.port);
});

const displayDomain = computed<string>(() => {
    return form.domain.trim() || 'yourdomain.com';
});

const canVerifyDns = computed<boolean>(() => {
    return Boolean(form.domain.trim() && form.port);
});

function getAxiosErrorMessage(err: unknown, fallback: string): string {
    return axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : fallback;
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

function getSslTypeLabel(useLetsEncrypt: boolean): string {
    return useLetsEncrypt ? "Let's Encrypt" : 'SSL';
}

async function fetchServerAllocations(): Promise<void> {
    if (!serverUuid.value) return;

    loadingAllocations.value = true;
    try {
        const { data } = await axios.get(`/api/user/servers/${serverUuid.value}/allocations`);

        if (!data.success) {
            toast.error(data.message || 'Failed to fetch server allocations');
            return;
        }

        serverInfo.value = {
            id: data.data.server.id,
            name: data.data.server.name,
            uuid: data.data.server.uuid,
        };
        allocations.value = data.data.allocations ?? [];

        // Set default port from primary allocation
        const primary = allocations.value.find((a) => a.is_primary);
        if (primary) {
            form.port = String(primary.port);
        } else if (allocations.value.length > 0) {
            const firstAllocation = allocations.value[0];
            if (firstAllocation) {
                form.port = String(firstAllocation.port);
            }
        }
    } catch (error) {
        console.error('Failed to fetch server allocations for proxy:', error);
        toast.error(getAxiosErrorMessage(error, 'Failed to fetch server allocations'));
    } finally {
        loadingAllocations.value = false;
    }
}

function resetForm(): void {
    form.domain = '';
    form.port = '';
    form.ssl = false;
    form.use_lets_encrypt = false;
    form.client_email = '';
    form.ssl_cert = '';
    form.ssl_key = '';
    formError.value = null;
    errors.domain = '';
    errors.port = '';
    errors.client_email = '';
    errors.ssl_cert = '';
    errors.ssl_key = '';
    dnsVerified.value = false;
    dnsVerificationError.value = null;
    targetIp.value = null;
}

async function calculateTargetIp(): Promise<void> {
    if (!form.domain.trim() || !form.port) {
        targetIp.value = null;
        return;
    }

    const portNum = parseInt(form.port, 10);
    const allocation = allocations.value.find((a) => a.port === portNum);

    if (!allocation) {
        targetIp.value = null;
        return;
    }

    targetIp.value = allocation.ip;
}

async function handleVerifyDns(): Promise<void> {
    if (!canVerifyDns.value) {
        dnsVerificationError.value = 'Domain and port are required';
        return;
    }

    verifyingDns.value = true;
    dnsVerificationError.value = null;
    dnsVerified.value = false;

    try {
        const { data } = await axios.post(`/api/user/servers/${serverUuid.value}/proxy/verify-dns`, {
            domain: form.domain.trim(),
            port: form.port.trim(),
        });

        if (data.success && data.data) {
            dnsVerified.value = data.data.verified === true;
            targetIp.value = data.data.expected_ip || null;

            if (data.data.verified) {
                dnsVerificationError.value = null;
                toast.success(data.data.message || 'DNS record is correctly configured');
            } else {
                dnsVerificationError.value = data.data.message || 'DNS record does not point to the correct IP address';
            }
        } else {
            dnsVerified.value = false;
            dnsVerificationError.value = data.message || 'DNS record does not point to the correct IP address';
        }
    } catch (error) {
        console.error('DNS verification failed:', error);
        dnsVerified.value = false;
        dnsVerificationError.value = getAxiosErrorMessage(error, 'DNS record does not point to the correct IP address');
    } finally {
        verifyingDns.value = false;
    }
}

function handleToggleSsl(): void {
    form.ssl = !form.ssl;
}

function handleToggleLetsEncrypt(): void {
    form.use_lets_encrypt = !form.use_lets_encrypt;
}

function handleOpenCreateDrawer(): void {
    resetForm();
    if (allocations.value.length > 0) {
        const primary = allocations.value.find((a) => a.is_primary);
        if (primary) {
            form.port = String(primary.port);
        } else {
            const firstAllocation = allocations.value[0];
            if (firstAllocation) {
                form.port = String(firstAllocation.port);
            }
        }
    }
    drawerOpen.value = true;
}

function handleCloseDrawer(): void {
    drawerOpen.value = false;
}

function validateForm(): boolean {
    let valid = true;
    errors.domain = '';
    errors.port = '';
    errors.client_email = '';
    errors.ssl_cert = '';
    errors.ssl_key = '';
    formError.value = null;

    const domainTrimmed = form.domain?.trim() || '';
    if (!domainTrimmed) {
        errors.domain = 'Domain is required';
        valid = false;
    } else {
        if (!domainTrimmed.includes('.')) {
            errors.domain = 'Invalid domain format';
            valid = false;
        } else {
            if (domainTrimmed.length > 253) {
                errors.domain = 'Invalid domain format';
                valid = false;
            } else {
                const domainRegex =
                    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
                if (!domainRegex.test(domainTrimmed)) {
                    errors.domain = 'Invalid domain format';
                    valid = false;
                } else {
                    const labels = domainTrimmed.split('.');
                    for (const label of labels) {
                        if (label.length > 63 || label.length === 0) {
                            errors.domain = 'Invalid domain format';
                            valid = false;
                            break;
                        }
                    }
                }
            }
        }
    }

    const portTrimmed = form.port?.trim() || '';
    if (!portTrimmed) {
        errors.port = 'Port is required';
        valid = false;
    } else {
        const portNum = parseInt(portTrimmed, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            errors.port = 'Port must be between 1 and 65535';
            valid = false;
        } else {
            const hasMatchingAllocation = allocations.value.some((a) => a.port === portNum);
            if (!hasMatchingAllocation) {
                errors.port = 'Port must be from available allocations';
                valid = false;
            }
        }
    }

    if (form.ssl === true) {
        if (form.use_lets_encrypt === true) {
            const emailTrimmed = form.client_email?.trim() || '';
            if (!emailTrimmed) {
                errors.client_email = "Email is required for Let's Encrypt";
                valid = false;
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailTrimmed)) {
                    errors.client_email = 'Invalid email format';
                    valid = false;
                }
            }
        } else {
            const certTrimmed = form.ssl_cert?.trim() || '';
            const keyTrimmed = form.ssl_key?.trim() || '';
            if (!certTrimmed) {
                errors.ssl_cert = 'SSL certificate is required';
                valid = false;
            }
            if (!keyTrimmed) {
                errors.ssl_key = 'SSL private key is required';
                valid = false;
            }
        }
    }

    return valid;
}

function getErrorMessage(err: unknown): string {
    if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;

        if (responseData) {
            if (responseData.error_message) {
                return responseData.error_message;
            }

            if (responseData.message) {
                const message = responseData.message;

                const responseMatch = message.match(/Response:\s*\{[^}]*"error":\s*"([^"]+)"/);
                if (responseMatch && responseMatch[1]) {
                    return responseMatch[1];
                }

                if (message.includes('Failed to request certificate')) {
                    const certErrorMatch = message.match(/Failed to request certificate[^:]*:\s*(.+?)(?:\n|$)/);
                    if (certErrorMatch && certErrorMatch[1]) {
                        return certErrorMatch[1].trim();
                    }
                    return "Failed to request certificate from Let's Encrypt";
                }

                return message;
            }

            if (responseData.error) {
                return responseData.error;
            }

            if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
                const firstError = responseData.errors[0];
                if (firstError.detail) {
                    return firstError.detail;
                }
                if (firstError.message) {
                    return firstError.message;
                }
            }
        }

        return err.message || 'An unknown error occurred';
    }

    if (err instanceof Error) {
        return err.message;
    }

    return 'An unknown error occurred';
}

async function handleSaveProxy(): Promise<void> {
    if (!serverUuid.value || !proxyEnabled.value || !validateForm()) {
        return;
    }

    if (!dnsVerified.value) {
        toast.error('You must verify DNS before creating a proxy');
        return;
    }

    saving.value = true;
    try {
        await axios.post(`/api/user/servers/${serverUuid.value}/proxy/create`, {
            domain: form.domain.trim(),
            port: form.port.trim(),
            ssl: form.ssl,
            use_lets_encrypt: form.use_lets_encrypt,
            client_email: form.use_lets_encrypt ? form.client_email.trim() : '',
            ssl_cert: form.use_lets_encrypt ? '' : form.ssl_cert.trim(),
            ssl_key: form.use_lets_encrypt ? '' : form.ssl_key.trim(),
        });

        toast.success('Proxy created successfully');

        handleCloseDrawer();
        await fetchProxies();
    } catch (error) {
        console.error('Failed to create proxy:', error);
        formError.value = getErrorMessage(error);
        toast.error(formError.value);
    } finally {
        saving.value = false;
    }
}

async function fetchProxies(): Promise<void> {
    if (!serverUuid.value) return;

    loading.value = true;
    try {
        const { data } = await axios.get(`/api/user/servers/${serverUuid.value}/proxy`);

        if (!data.success) {
            toast.error(data.message || 'Failed to fetch proxies');
            return;
        }

        proxies.value = data.data.proxies ?? [];
    } catch (error) {
        console.error('Failed to fetch proxies:', error);
        toast.error(getAxiosErrorMessage(error, 'Failed to fetch proxies'));
    } finally {
        loading.value = false;
    }
}

function handleRefresh(): void {
    void fetchProxies();
}

async function handleDeleteProxy(proxy: Proxy): Promise<void> {
    if (!serverUuid.value) return;

    deletingProxyId.value = proxy.id;
    try {
        await axios.post(`/api/user/servers/${serverUuid.value}/proxy/delete`, {
            id: proxy.id,
        });

        toast.success('Proxy deleted successfully');
        await fetchProxies();
    } catch (error) {
        console.error('Failed to delete proxy:', error);
        toast.error(getAxiosErrorMessage(error, 'Failed to delete proxy'));
    } finally {
        deletingProxyId.value = null;
    }
}

// Watch for domain/port changes to reset DNS verification
watch([() => form.domain, () => form.port], () => {
    dnsVerified.value = false;
    dnsVerificationError.value = null;
    void calculateTargetIp();
});

// Watch for SSL/Let's Encrypt changes
watch([() => form.ssl, () => form.use_lets_encrypt], () => {
    // Reset DNS verification when SSL settings change
    dnsVerified.value = false;
    dnsVerificationError.value = null;
    if (form.domain.trim() && form.port) {
        void calculateTargetIp();
    }
});

onMounted(async () => {
    await fetchPluginWidgets();
    // Settings are fetched once in App.vue - no need to fetch here

    if (settingsStore.serverAllowUserMadeProxy) {
        await Promise.all([fetchServerAllocations(), fetchProxies()]);
    }
});
</script>
