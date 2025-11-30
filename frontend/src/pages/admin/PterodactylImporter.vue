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

import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useSettingsStore } from '@/stores/settings';
import axios from 'axios';
import DashboardLayout, { type BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Database,
    AlertTriangle,
    CheckCircle,
    Loader2,
    XCircle,
    RefreshCw,
    Plus,
    Key,
    BookOpen,
    MessageCircle,
    ExternalLink,
} from 'lucide-vue-next';

const toast = useToast();
const router = useRouter();
const settingsStore = useSettingsStore();

const breadcrumbs: BreadcrumbEntry[] = [
    { text: 'Dashboard', href: '/admin' },
    {
        text: 'Pterodactyl Importer',
        href: '/admin/pterodactyl-importer',
        isCurrent: true,
    },
];

const isCheckingPrerequisites = ref(false);
const selectedApiKey = ref<string | null>(null);
const showWarningDialog = ref(true);
const showCreateApiKeyModal = ref(false);
const loadingApiKeys = ref(false);
const newApiKeyName = ref('');
const isCreatingApiKey = ref(false);

interface ApiClient {
    id: number;
    user_uuid: string;
    name: string;
    public_key?: string;
    private_key?: string;
    created_at: string;
    updated_at: string;
}

const apiClients = ref<ApiClient[]>([]);

interface PrerequisitesCheck {
    users_count: number;
    nodes_count: number;
    locations_count: number;
    realms_count: number;
    spells_count: number;
    servers_count: number;
    databases_count: number;
    allocations_count: number;
    panel_clean: boolean;
}

const prerequisites = ref<PrerequisitesCheck | null>(null);

const prerequisitesPassed = computed(() => {
    if (!prerequisites.value) return false;
    return (
        prerequisites.value.users_count <= 1 &&
        prerequisites.value.nodes_count === 0 &&
        prerequisites.value.locations_count === 0 &&
        prerequisites.value.realms_count === 0 &&
        prerequisites.value.spells_count === 0 &&
        prerequisites.value.servers_count === 0 &&
        prerequisites.value.databases_count === 0 &&
        prerequisites.value.allocations_count === 0 &&
        prerequisites.value.panel_clean
    );
});

const panelUrl = computed(() => {
    // Use settings store URL, fallback to window location
    if (settingsStore.appUrl) {
        return settingsStore.appUrl;
    }
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'https://panel.example.com';
});

async function fetchPrerequisites(): Promise<void> {
    isCheckingPrerequisites.value = true;
    try {
        const response = await axios.get<{ success: boolean; data: PrerequisitesCheck }>(
            '/api/admin/pterodactyl-importer/prerequisites',
        );
        if (response.data && response.data.success) {
            prerequisites.value = response.data.data;
        } else {
            toast.error('Failed to check prerequisites');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to check prerequisites';
        toast.error(errorMessage);
    } finally {
        isCheckingPrerequisites.value = false;
    }
}

async function fetchApiClients(): Promise<void> {
    loadingApiKeys.value = true;
    try {
        const response = await axios.get<{ success: boolean; data: { api_clients: ApiClient[] } }>(
            '/api/user/api-clients',
        );
        if (response.data && response.data.success) {
            apiClients.value = response.data.data.api_clients || [];
            // Auto-select first API key if available and none selected
            if (apiClients.value.length > 0 && !selectedApiKey.value) {
                const firstClient = apiClients.value[0];
                if (firstClient) {
                    // Get full details to get the public key
                    await selectApiClient(firstClient.id);
                }
            }
        } else {
            toast.error('Failed to fetch API keys');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch API keys';
        toast.error(errorMessage);
    } finally {
        loadingApiKeys.value = false;
    }
}

async function selectApiClient(clientId: number): Promise<void> {
    try {
        const response = await axios.get<{ success: boolean; data: ApiClient }>(`/api/user/api-clients/${clientId}`);
        if (response.data && response.data.success) {
            const client = response.data.data;
            // Note: private_key is only available on creation, so we use public_key for existing keys
            // The migration agent can use either public_key or private_key for authentication
            selectedApiKey.value = client.public_key || null;
        } else {
            toast.error('Failed to load API key details');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to load API key details';
        toast.error(errorMessage);
    }
}

async function createApiKey(): Promise<void> {
    if (!newApiKeyName.value.trim()) {
        toast.error('Please enter a name for the API key');
        return;
    }

    isCreatingApiKey.value = true;
    try {
        const response = await axios.post<{ success: boolean; data: ApiClient }>('/api/user/api-clients', {
            name: newApiKeyName.value.trim(),
        });
        if (response.data && response.data.success) {
            const newClient = response.data.data;
            toast.success('API key created successfully!');
            // Refresh API clients list to include the newly created client
            await fetchApiClients();
            // Find and select the newly created client by ID
            // This ensures the Select dropdown shows the correct selection
            const createdClient = apiClients.value.find((c) => c.id === newClient.id);
            if (createdClient) {
                // Select the newly created client - this will fetch full details and set the public_key
                // Note: The migration agent can use either public_key or private_key for authentication
                await selectApiClient(createdClient.id);
            } else {
                // Fallback: if client not found, use the private key from creation response
                // (private_key is only available on creation, public_key works for authentication)
                selectedApiKey.value = newClient.private_key || newClient.public_key || null;
            }
            // Close modal and reset form
            showCreateApiKeyModal.value = false;
            newApiKeyName.value = '';
        } else {
            toast.error('Failed to create API key');
        }
    } catch (error: unknown) {
        const errorMessage =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create API key';
        toast.error(errorMessage);
    } finally {
        isCreatingApiKey.value = false;
    }
}

onMounted(async () => {
    // Ensure settings are loaded for panel URL
    if (!settingsStore.loaded) {
        await settingsStore.fetchSettings();
    }
    void fetchPrerequisites();
    void fetchApiClients();
});
</script>

<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen space-y-10 pb-12">
            <!-- Hero Section -->
            <section
                class="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-10 shadow-xl shadow-primary/10"
            >
                <div class="absolute inset-0 pointer-events-none">
                    <div class="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent"></div>
                </div>
                <div class="relative z-10">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                            <Database class="h-10 w-10 text-primary" />
                        </div>
                        <div class="flex-1">
                            <Badge variant="secondary" class="mb-3 border-primary/30 bg-primary/10 text-primary">
                                Data Migration
                            </Badge>
                            <h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                                Pterodactyl Importer
                            </h1>
                            <p class="max-w-2xl text-base text-muted-foreground sm:text-lg mt-2">
                                Import Pterodactyl data inside FeatherPanel. Upload your SQL dump and .env file to
                                migrate your existing Pterodactyl installation.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Prerequisites Checklist -->
            <Card class="border border-border/70 shadow-lg">
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <div>
                            <CardTitle>Prerequisites Checklist</CardTitle>
                            <CardDescription>
                                Verify that your panel meets the requirements before importing Pterodactyl data
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="isCheckingPrerequisites"
                            class="gap-2"
                            @click="fetchPrerequisites"
                        >
                            <RefreshCw :class="['h-4 w-4', isCheckingPrerequisites && 'animate-spin']" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div v-if="isCheckingPrerequisites" class="flex items-center justify-center py-8">
                        <div class="flex items-center gap-3">
                            <Loader2 class="h-5 w-5 animate-spin text-primary" />
                            <span class="text-muted-foreground">Checking prerequisites...</span>
                        </div>
                    </div>
                    <div v-else-if="prerequisites" class="space-y-4">
                        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <!-- Users Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.users_count <= 1
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle v-if="prerequisites.users_count <= 1" class="h-5 w-5 text-green-500" />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Users Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.users_count <= 1
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.users_count }} user{{
                                            prerequisites.users_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.users_count <= 1" class="block mt-1">
                                            ✓ Must have no more than 1 user
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">
                                            ✗ Must have no more than 1 user
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Nodes Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.nodes_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.nodes_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Nodes Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.nodes_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.nodes_count }} node{{
                                            prerequisites.nodes_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.nodes_count === 0" class="block mt-1">
                                            ✓ Must have no nodes
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no nodes</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Locations Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.locations_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.locations_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Locations Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.locations_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.locations_count }} location{{
                                            prerequisites.locations_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.locations_count === 0" class="block mt-1">
                                            ✓ Must have no locations
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no locations</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Realms Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.realms_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.realms_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Realms Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.realms_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.realms_count }} realm{{
                                            prerequisites.realms_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.realms_count === 0" class="block mt-1">
                                            ✓ Must have no realms
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no realms</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Spells Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.spells_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.spells_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Spells Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.spells_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.spells_count }} spell{{
                                            prerequisites.spells_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.spells_count === 0" class="block mt-1">
                                            ✓ Must have no spells
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no spells</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Servers Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.servers_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.servers_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Servers Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.servers_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.servers_count }} server{{
                                            prerequisites.servers_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.servers_count === 0" class="block mt-1">
                                            ✓ Must have no servers
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no servers</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Databases Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.databases_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.databases_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Databases Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.databases_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.databases_count }} database{{
                                            prerequisites.databases_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.databases_count === 0" class="block mt-1">
                                            ✓ Must have no databases
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no databases</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Allocations Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.allocations_count === 0
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle
                                        v-if="prerequisites.allocations_count === 0"
                                        class="h-5 w-5 text-green-500"
                                    />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Allocations Count</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.allocations_count === 0
                                                ? 'text-muted-foreground'
                                                : 'text-destructive'
                                        "
                                    >
                                        Current: {{ prerequisites.allocations_count }} allocation{{
                                            prerequisites.allocations_count !== 1 ? 's' : ''
                                        }}
                                        <span v-if="prerequisites.allocations_count === 0" class="block mt-1">
                                            ✓ Must have no allocations
                                        </span>
                                        <span v-else class="block mt-1 font-semibold">✗ Must have no allocations</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Panel Clean Check -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border"
                                :class="
                                    prerequisites.panel_clean
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-destructive/10 border-destructive/30'
                                "
                            >
                                <div class="mt-0.5">
                                    <CheckCircle v-if="prerequisites.panel_clean" class="h-5 w-5 text-green-500" />
                                    <XCircle v-else class="h-5 w-5 text-destructive" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="font-semibold text-sm mb-1">Panel Status</div>
                                    <div
                                        class="text-xs"
                                        :class="
                                            prerequisites.panel_clean ? 'text-muted-foreground' : 'text-destructive'
                                        "
                                    >
                                        <span v-if="prerequisites.panel_clean" class="block">
                                            ✓ Panel is clean and ready
                                        </span>
                                        <span v-else class="block font-semibold">✗ Panel must be clean</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Overall Status -->
                        <div
                            class="p-4 rounded-lg border"
                            :class="
                                prerequisitesPassed
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-amber-500/10 border-amber-500/30'
                            "
                        >
                            <div class="flex items-center gap-3">
                                <CheckCircle v-if="prerequisitesPassed" class="h-5 w-5 text-green-500 shrink-0" />
                                <AlertTriangle v-else class="h-5 w-5 text-amber-500 shrink-0" />
                                <div class="flex-1">
                                    <div
                                        class="font-semibold text-sm mb-1"
                                        :class="
                                            prerequisitesPassed
                                                ? 'text-green-600 dark:text-green-500'
                                                : 'text-amber-600 dark:text-amber-500'
                                        "
                                    >
                                        {{ prerequisitesPassed ? 'All prerequisites met!' : 'Prerequisites not met' }}
                                    </div>
                                    <div class="text-xs text-muted-foreground">
                                        {{
                                            prerequisitesPassed
                                                ? 'Your panel is ready for Pterodactyl data import.'
                                                : 'Please ensure all checks above pass before proceeding with the import.'
                                        }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-8 text-muted-foreground">
                        Failed to load prerequisites. Please refresh the page.
                    </div>
                </CardContent>
            </Card>

            <!-- FeatherPanel CLI Instructions -->
            <Card
                v-if="prerequisitesPassed"
                class="border border-blue-500/50 bg-linear-to-br from-blue-500/10 via-blue-500/5 to-transparent"
            >
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <Database class="h-5 w-5 text-blue-500" />
                        <CardTitle class="text-blue-600 dark:text-blue-500">FeatherPanel CLI</CardTitle>
                    </div>
                    <CardDescription>
                        Use the FeatherPanel CLI to manage your servers and migrate from Pterodactyl. The CLI can be
                        used for server management, migrations, and other administrative tasks.
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-6">
                    <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p class="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                            Quick Overview - Follow these steps in order:
                        </p>
                        <ol class="text-xs text-blue-600 dark:text-blue-400 list-decimal list-inside space-y-1 ml-2">
                            <li>Install the CLI using the installer command</li>
                            <li>Select or create an API key (shown below)</li>
                            <li>
                                Run
                                <code class="bg-blue-500/20 px-1 py-0.5 rounded font-mono"
                                    >feathercli config setup</code
                                >
                                to configure the CLI
                            </li>
                            <li>
                                Run
                                <code class="bg-blue-500/20 px-1 py-0.5 rounded font-mono">feathercli migrate</code>
                                to start migration
                            </li>
                        </ol>
                    </div>
                    <div class="space-y-3">
                        <h3 class="font-semibold text-foreground">Step 1: Install FeatherPanel CLI</h3>
                        <p class="text-sm text-muted-foreground">
                            First, you must install the FeatherPanel CLI on your server. Run the following command in
                            your terminal:
                        </p>
                        <div class="bg-background rounded-lg p-3 border border-border/50">
                            <code class="text-xs text-foreground font-mono block whitespace-pre-wrap"
                                >curl -sSL https://get.featherpanel.com/beta.sh | bash</code
                            >
                        </div>
                        <p class="text-xs text-muted-foreground">
                            This will download and install the FeatherPanel CLI tool on your system. Wait for the
                            installation to complete before proceeding to the next step.
                        </p>
                    </div>

                    <div class="space-y-3">
                        <h3 class="font-semibold text-foreground">Step 2: Select or Create an API Key</h3>
                        <p class="text-sm text-muted-foreground">
                            After installing the CLI, you need an API key to authenticate with your FeatherPanel
                            instance. Select an existing API key or create a new one below.
                        </p>

                        <div class="bg-muted/50 rounded-lg p-4 border border-border/50 space-y-4">
                            <div class="space-y-2">
                                <Label for="api-key-select">Select API Key</Label>
                                <div class="flex gap-2">
                                    <Select
                                        id="api-key-select"
                                        :model-value="
                                            apiClients
                                                .find((c) => {
                                                    const key = c.private_key || c.public_key;
                                                    return key === selectedApiKey;
                                                })
                                                ?.id?.toString()
                                        "
                                        :disabled="loadingApiKeys"
                                        @update:model-value="(value) => selectApiClient(Number(value))"
                                    >
                                        <SelectTrigger class="flex-1">
                                            <SelectValue
                                                :placeholder="
                                                    loadingApiKeys
                                                        ? 'Loading API keys...'
                                                        : apiClients.length === 0
                                                          ? 'No API keys found'
                                                          : 'Select an API key'
                                                "
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="client in apiClients"
                                                :key="client.id"
                                                :value="client.id.toString()"
                                            >
                                                {{ client.name }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" @click="showCreateApiKeyModal = true">
                                        <Plus class="h-4 w-4 mr-2" />
                                        Create New
                                    </Button>
                                </div>
                                <p class="text-xs text-muted-foreground">
                                    Select an existing API key from the list above, or create a new one specifically for
                                    the CLI.
                                </p>
                            </div>

                            <div v-if="selectedApiKey" class="space-y-4 pt-2 border-t border-border/50">
                                <div class="space-y-3">
                                    <p class="text-xs font-semibold text-foreground">Panel URL:</p>
                                    <p
                                        class="text-xs font-mono break-all bg-background px-2 py-1 rounded border border-border"
                                    >
                                        {{ panelUrl }}
                                    </p>
                                </div>

                                <div class="space-y-3">
                                    <p class="text-xs font-semibold text-foreground">API Key:</p>
                                    <p
                                        class="text-xs font-mono break-all bg-background px-2 py-1 rounded border border-border"
                                    >
                                        {{ selectedApiKey }}
                                    </p>
                                </div>

                                <div class="space-y-2 pt-2 border-t border-border/50">
                                    <p class="text-xs font-semibold text-foreground">Step 3: Configure the CLI</p>
                                    <p class="text-sm text-muted-foreground">
                                        <strong>After the CLI is installed</strong>, you must configure it with your
                                        panel URL and API key. Run the following command:
                                    </p>
                                    <div class="bg-background rounded p-3 border border-border/50">
                                        <code class="text-xs text-foreground font-mono block whitespace-pre-wrap"
                                            >feathercli config setup</code
                                        >
                                    </div>
                                    <p class="text-xs text-muted-foreground mt-2">
                                        When prompted by the CLI, enter the following values:
                                    </p>
                                    <ul class="text-xs text-muted-foreground list-disc list-inside ml-2 space-y-1 mt-1">
                                        <li>
                                            <strong>Panel URL:</strong>
                                            <code class="bg-muted px-1 py-0.5 rounded font-mono">{{ panelUrl }}</code>
                                        </li>
                                        <li>
                                            <strong>API Key:</strong>
                                            <code class="bg-muted px-1 py-0.5 rounded font-mono break-all">{{
                                                selectedApiKey
                                            }}</code>
                                        </li>
                                    </ul>
                                    <p class="text-xs text-amber-600 dark:text-amber-500 mt-2 font-medium">
                                        ⚠️ Important: You must complete the installation (Step 1) before running this
                                        configuration command.
                                    </p>
                                </div>

                                <div class="space-y-2 pt-2 border-t border-border/50">
                                    <p class="text-xs font-semibold text-foreground">Step 4: Run Migration</p>
                                    <p class="text-sm text-muted-foreground">
                                        <strong>After configuring the CLI</strong> (Step 3), you can now run the
                                        Pterodactyl migration:
                                    </p>
                                    <div class="bg-background rounded p-3 border border-border/50">
                                        <code class="text-xs text-foreground font-mono block whitespace-pre-wrap"
                                            >feathercli migrate</code
                                        >
                                    </div>
                                    <p class="text-xs text-muted-foreground mt-2">
                                        This command will start the migration process. Make sure you have completed
                                        Steps 1-3 before running this command.
                                    </p>
                                </div>
                            </div>
                            <div
                                v-else-if="!loadingApiKeys && apiClients.length === 0"
                                class="bg-amber-500/10 rounded-lg p-3 border border-amber-500/30 space-y-2 text-xs text-amber-700 dark:text-amber-400"
                            >
                                <p class="font-semibold text-foreground">No API keys found.</p>
                                <p class="text-xs text-muted-foreground">
                                    Click "Create New" above to create an API key for the CLI.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-600 dark:text-blue-500"
                    >
                        <strong>Note:</strong> The CLI will handle exporting your Pterodactyl database and configuration
                        automatically. You do not need to manually create SQL dumps or upload your
                        <code class="bg-muted px-1 py-0.5 rounded text-foreground font-mono text-xs">.env</code> file.
                        The CLI can also be used for general server management tasks beyond migration.
                    </div>
                </CardContent>
            </Card>

            <!-- Help & Support Card -->
            <Card
                v-if="prerequisitesPassed"
                class="border border-primary/50 bg-linear-to-br from-primary/10 via-primary/5 to-transparent"
            >
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <MessageCircle class="h-5 w-5 text-primary" />
                        <CardTitle class="text-primary">Help & Support</CardTitle>
                    </div>
                    <CardDescription>
                        Need help with the migration process? Check out our documentation or join our Discord community.
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid gap-3 sm:grid-cols-2">
                        <!-- Documentation Link -->
                        <a
                            href="https://docs.mythical.systems/docs/featherpanel/migration"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="group flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card hover:bg-accent hover:border-primary/50 transition-colors"
                        >
                            <div
                                class="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20"
                            >
                                <BookOpen class="h-5 w-5 text-primary" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <p class="font-semibold text-sm text-foreground">Migration Documentation</p>
                                    <ExternalLink class="h-3 w-3 text-muted-foreground shrink-0" />
                                </div>
                                <p class="text-xs text-muted-foreground mt-1 truncate">
                                    Complete guide and tutorial for migrating from Pterodactyl
                                </p>
                            </div>
                        </a>

                        <!-- Discord Link -->
                        <a
                            href="https://discord.mythical.systems"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="group flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-card hover:bg-accent hover:border-primary/50 transition-colors"
                        >
                            <div
                                class="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20"
                            >
                                <MessageCircle class="h-5 w-5 text-primary" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <p class="font-semibold text-sm text-foreground">MythicalSystems Discord</p>
                                    <ExternalLink class="h-3 w-3 text-muted-foreground shrink-0" />
                                </div>
                                <p class="text-xs text-muted-foreground mt-1 truncate">
                                    Get support from our community and team
                                </p>
                            </div>
                        </a>
                    </div>
                </CardContent>
            </Card>

            <!-- Information Card -->
            <Card class="border border-amber-500/50 bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent">
                <CardHeader>
                    <div class="flex items-center gap-2">
                        <AlertTriangle class="h-5 w-5 text-amber-500" />
                        <CardTitle class="text-amber-600 dark:text-amber-500">Important Information</CardTitle>
                    </div>
                    <CardDescription>
                        Please read the following information before importing your Pterodactyl data
                    </CardDescription>
                </CardHeader>
                <CardContent class="space-y-3">
                    <div class="pt-4 border-t border-amber-500/30">
                        <div class="flex items-start gap-2 mb-2">
                            <AlertTriangle class="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <strong class="text-foreground">Data Not Imported:</strong>
                        </div>
                        <p class="text-sm text-muted-foreground ml-6">
                            To save time and storage, and to reduce unnecessary data, the following items will
                            <strong class="text-foreground">not</strong> be imported:
                        </p>
                        <ul class="mt-2 ml-6 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                            <li>Server activity logs and audit logs</li>
                            <li>API keys and API tokens</li>
                            <li>Activity logs and activity tracking data</li>
                            <li>Temporary session data</li>
                            <li>Cache and queue data</li>
                        </ul>
                        <p class="text-xs text-muted-foreground mt-3 ml-6 italic">
                            This helps ensure a cleaner import process and reduces storage usage for non-essential data.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <!-- Create API Key Modal -->
            <Dialog :open="showCreateApiKeyModal" @update:open="showCreateApiKeyModal = $event">
                <DialogContent class="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle class="flex items-center gap-2">
                            <Key class="h-5 w-5" />
                            Create New API Key
                        </DialogTitle>
                        <DialogDescription>
                            Create a new API key for the Pterodactyl Migration Agent. This key will be used to
                            authenticate the migration agent with your FeatherPanel instance.
                        </DialogDescription>
                    </DialogHeader>
                    <div class="space-y-4 py-4">
                        <div class="space-y-2">
                            <Label for="api-key-name">API Key Name</Label>
                            <Input
                                id="api-key-name"
                                v-model="newApiKeyName"
                                placeholder="e.g., Pterodactyl Migration Agent"
                                :disabled="isCreatingApiKey"
                            />
                            <p class="text-xs text-muted-foreground">
                                Choose a descriptive name to identify this API key (e.g., "Pterodactyl Migration
                                Agent").
                            </p>
                        </div>
                        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                            <div class="flex items-start gap-2">
                                <AlertTriangle class="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <div class="text-xs text-amber-700 dark:text-amber-300">
                                    <p class="font-medium mb-1">Important:</p>
                                    <p>
                                        The private key will only be shown once when the API key is created. Make sure
                                        to copy it immediately as it cannot be retrieved later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter class="flex gap-2">
                        <Button variant="outline" :disabled="isCreatingApiKey" @click="showCreateApiKeyModal = false">
                            Cancel
                        </Button>
                        <Button :disabled="isCreatingApiKey || !newApiKeyName.trim()" @click="createApiKey">
                            <Loader2 v-if="isCreatingApiKey" class="h-4 w-4 mr-2 animate-spin" />
                            <Plus v-else class="h-4 w-4 mr-2" />
                            {{ isCreatingApiKey ? 'Creating...' : 'Create API Key' }}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <!-- Warning Dialog -->
            <Dialog v-model:open="showWarningDialog">
                <DialogContent class="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle class="text-2xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle class="h-6 w-6" />
                            ⚠️ WOAHH BUDDY DON'T SHOW THIS PAGE ON STREAM ⚠️
                        </DialogTitle>
                        <DialogDescription class="text-base mt-4 space-y-3">
                            <p class="font-semibold text-red-700 dark:text-red-400">
                                This page contains sensitive information that can be used to completely nuke your panel!
                            </p>
                            <p class="text-foreground">
                                <strong>DO NOT:</strong>
                            </p>
                            <ul class="list-disc list-inside space-y-1 text-foreground ml-2">
                                <li>Share your screen while on this page</li>
                                <li>Stream or record this page</li>
                                <li>Take screenshots that include sensitive information</li>
                                <li>Show the API key to anyone</li>
                            </ul>
                            <p class="text-sm text-muted-foreground mt-4">
                                The information on this page (especially the API key) can be used by malicious actors to
                                gain full access to your FeatherPanel instance and potentially destroy your entire
                                installation.
                            </p>
                            <div
                                class="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-700 dark:text-red-400"
                            >
                                <strong>⚠️ SECURITY WARNING:</strong> If you're streaming, recording, or sharing your
                                screen, close this page immediately or switch to a different window/tab!
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter class="mt-6 flex gap-2">
                        <Button variant="outline" @click="router.push('/admin')"> Go Back to Safety </Button>
                        <Button variant="destructive" @click="showWarningDialog = false">
                            I Understand - Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </DashboardLayout>
</template>
