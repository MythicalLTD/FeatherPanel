<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                            {{ t('serverFirewall.title') }}
                        </h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverFirewall.description') }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="fetchRules"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('serverFirewall.refresh') }}</span>
                        </Button>
                        <Button
                            v-if="firewallEnabled"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="openCreateDrawer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>{{ t('serverFirewall.createRule') }}</span>
                        </Button>
                        <Button
                            v-if="firewallEnabled"
                            variant="secondary"
                            size="sm"
                            :disabled="syncing || loading"
                            class="flex items-center gap-2"
                            @click="syncRules"
                        >
                            <ShieldCheck :class="['h-4 w-4', syncing && 'animate-pulse']" />
                            <span>{{ t('serverFirewall.syncRules') }}</span>
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
                        <h3 class="font-semibold text-blue-800 dark:text-blue-200">
                            {{ t('serverFirewall.rulesInfoTitle') }}
                        </h3>
                        <p class="text-sm text-blue-700 dark:text-blue-300">
                            {{ t('serverFirewall.rulesInfoDescription') }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Feature Disabled State -->
            <Alert v-if="!firewallEnabled" variant="destructive" class="border-2">
                <AlertTitle>{{ t('serverFirewall.featureDisabled') }}</AlertTitle>
                <AlertDescription>
                    {{ t('serverFirewall.featureDisabledDescription') }}
                </AlertDescription>
            </Alert>

            <!-- Loading State -->
            <div v-else-if="loading && rules.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && rules.length === 0"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
                                <Shield class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverFirewall.noRulesTitle') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{ t('serverFirewall.noRulesDescription') }}
                        </p>
                    </div>
                    <Button v-if="firewallEnabled" size="lg" class="gap-2 shadow-lg" @click="openCreateDrawer">
                        <Plus class="h-5 w-5" />
                        {{ t('serverFirewall.createRule') }}
                    </Button>
                </div>
            </div>

            <!-- Rules List -->
            <Card v-else-if="firewallEnabled" class="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Shield class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">{{ t('serverFirewall.rulesTitle') }}</CardTitle>
                            <CardDescription class="text-sm">
                                {{ t('serverFirewall.rulesDescription') }}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" class="text-xs">
                            {{ rules.length }}
                            {{ rules.length === 1 ? t('serverFirewall.rule') : t('serverFirewall.rules') }}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="rule in sortedRules"
                            :key="rule.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                        :class="[rule.type === 'allow' ? 'bg-green-500/10' : 'bg-red-500/10']"
                                    >
                                        <component
                                            :is="rule.type === 'allow' ? CheckCircle2 : XCircle"
                                            class="h-5 w-5"
                                            :class="[rule.type === 'allow' ? 'text-green-500' : 'text-red-500']"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-0 space-y-1">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="font-mono font-semibold text-sm">
                                                {{ rule.remote_ip }} → {{ rule.server_port }}/{{ rule.protocol }}
                                            </span>
                                            <Badge
                                                size="sm"
                                                :variant="rule.type === 'allow' ? 'outline' : 'destructive'"
                                            >
                                                {{
                                                    rule.type === 'allow'
                                                        ? t('serverFirewall.allow')
                                                        : t('serverFirewall.block')
                                                }}
                                            </Badge>
                                            <Badge variant="secondary" class="text-xs">
                                                {{ t('serverFirewall.priorityLabel', { priority: rule.priority }) }}
                                            </Badge>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span>
                                                {{ t('serverFirewall.createdAt') }}:
                                                {{ formatDate(rule.created_at) }}
                                            </span>
                                            <span v-if="rule.updated_at !== rule.created_at">
                                                {{ t('serverFirewall.updatedAt') }}:
                                                {{ formatDate(rule.updated_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex flex-wrap items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        @click="openEditDrawer(rule)"
                                    >
                                        <Pencil class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('common.edit') }}</span>
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        class="flex items-center gap-2"
                                        :disabled="deletingRuleId === rule.id"
                                        @click="deleteRule(rule)"
                                    >
                                        <Trash2 class="h-3.5 w-3.5" />
                                        <span class="hidden sm:inline">{{ t('common.delete') }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Create / Edit Drawer -->
        <Drawer
            class="w-full"
            :open="drawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeDrawer();
                }
            "
        >
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>
                        {{ isEditing ? t('serverFirewall.editRule') : t('serverFirewall.createRule') }}
                    </DrawerTitle>
                    <DrawerDescription>
                        {{ t('serverFirewall.drawerDescription') }}
                    </DrawerDescription>
                </DrawerHeader>
                <div class="px-4 pb-6 space-y-4">
                    <div class="grid md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <Label for="allocation">{{ t('serverFirewall.allocation') }}</Label>
                            <Select v-model="selectedAllocationIdString" :disabled="saving || !hasAllocations">
                                <SelectTrigger>
                                    <SelectValue
                                        :placeholder="
                                            hasAllocations
                                                ? t('serverFirewall.allocationPlaceholder')
                                                : t('serverFirewall.noAllocations')
                                        "
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        v-for="allocation in allocations"
                                        :key="allocation.id"
                                        :value="String(allocation.id)"
                                    >
                                        <span class="font-mono"> {{ allocation.ip }}:{{ allocation.port }} </span>
                                        <span v-if="allocation.is_primary" class="ml-2 text-xs text-primary">
                                            ({{ t('serverAllocations.primary') }})
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-xs text-muted-foreground">
                                {{ t('serverFirewall.allocationHelp') }}
                            </p>
                            <p v-if="errors.server_port" class="text-xs text-red-500">
                                {{ errors.server_port }}
                            </p>
                        </div>
                        <div class="space-y-2">
                            <Label for="remote_ip">{{ t('serverFirewall.remoteIp') }}</Label>
                            <Input
                                id="remote_ip"
                                v-model="form.remote_ip"
                                :disabled="saving"
                                :placeholder="t('serverFirewall.remoteIpPlaceholder')"
                            />
                            <p v-if="errors.remote_ip" class="text-xs text-red-500">
                                {{ errors.remote_ip }}
                            </p>
                        </div>
                    </div>
                    <div class="grid md:grid-cols-3 gap-4">
                        <div class="space-y-2">
                            <Label for="priority">{{ t('serverFirewall.priority') }}</Label>
                            <Input
                                id="priority"
                                v-model.number="form.priority"
                                type="number"
                                min="1"
                                max="10000"
                                :disabled="saving"
                            />
                            <p class="text-xs text-muted-foreground">
                                {{ t('serverFirewall.priorityHelp') }}
                            </p>
                            <p v-if="errors.priority" class="text-xs text-red-500">
                                {{ errors.priority }}
                            </p>
                        </div>
                        <div class="space-y-2">
                            <Label>{{ t('serverFirewall.type') }}</Label>
                            <Select v-model="form.type" :disabled="saving">
                                <SelectTrigger>
                                    <SelectValue :placeholder="t('serverFirewall.typePlaceholder')" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="allow">
                                        {{ t('serverFirewall.allow') }}
                                    </SelectItem>
                                    <SelectItem value="block">
                                        {{ t('serverFirewall.block') }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p v-if="errors.type" class="text-xs text-red-500">
                                {{ errors.type }}
                            </p>
                        </div>
                        <div class="space-y-2">
                            <Label>{{ t('serverFirewall.protocol') }}</Label>
                            <Select v-model="form.protocol" :disabled="saving">
                                <SelectTrigger>
                                    <SelectValue :placeholder="t('serverFirewall.protocolPlaceholder')" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tcp">TCP</SelectItem>
                                    <SelectItem value="udp">UDP</SelectItem>
                                </SelectContent>
                            </Select>
                            <p v-if="errors.protocol" class="text-xs text-red-500">
                                {{ errors.protocol }}
                            </p>
                        </div>
                    </div>
                    <Alert v-if="formError" variant="destructive">
                        <AlertTitle>{{ t('serverFirewall.errorTitle') }}</AlertTitle>
                        <AlertDescription>
                            {{ formError }}
                        </AlertDescription>
                    </Alert>
                </div>
                <DrawerFooter>
                    <Button :disabled="saving" @click="saveRule">
                        <span v-if="saving">{{ t('common.saving') }}</span>
                        <span v-else>{{ t('common.save') }}</span>
                    </Button>
                    <Button variant="outline" :disabled="saving" @click="closeDrawer">
                        {{ t('common.cancel') }}
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    </DashboardLayout>
</template>

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

import { computed, reactive, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import type { BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { useSettingsStore } from '@/stores/settings';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info, Shield, ShieldCheck, RefreshCw, Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-vue-next';

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();

const serverUuid = computed(() => route.params.uuidShort as string);

// Check if firewall management is enabled
const firewallEnabled = computed(() => settingsStore.serverAllowUserMadeFirewall);

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

const serverInfo = ref<ServerInfo | null>(null);
const allocations = ref<ServerAllocation[]>([]);
const loadingAllocations = ref<boolean>(false);
const selectedAllocationId = ref<number | null>(null);

const selectedAllocationIdString = computed<string>({
    get: () => (selectedAllocationId.value !== null ? String(selectedAllocationId.value) : ''),
    set: (val: string) => {
        selectedAllocationId.value = val ? Number(val) : null;
        updateServerPortFromAllocation();
    },
});

interface FirewallRule {
    id: number;
    created_at: string;
    updated_at: string;
    server_uuid: string;
    remote_ip: string;
    server_port: number;
    priority: number;
    type: 'allow' | 'block';
    protocol: 'tcp' | 'udp';
}

interface CreateFirewallRuleRequest {
    remote_ip: string;
    server_port: number;
    priority?: number;
    type: 'allow' | 'block';
    protocol?: 'tcp' | 'udp';
}

const breadcrumbs = computed<BreadcrumbEntry[]>(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: serverInfo.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverFirewall.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/firewall` },
]);

function getAxiosErrorMessage(err: unknown, fallback: string): string {
    return axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : fallback;
}

const loading = ref<boolean>(false);
const syncing = ref<boolean>(false);
const rules = ref<FirewallRule[]>([]);

const drawerOpen = ref<boolean>(false);
const isEditing = ref<boolean>(false);
const saving = ref<boolean>(false);
const deletingRuleId = ref<number | null>(null);
const formError = ref<string | null>(null);

const form = reactive<CreateFirewallRuleRequest>({
    remote_ip: '',
    server_port: 0,
    priority: 1,
    type: 'allow',
    protocol: 'tcp',
});

const errors = reactive<{
    remote_ip: string;
    server_port: string;
    priority: string;
    type: string;
    protocol: string;
}>({
    remote_ip: '',
    server_port: '',
    priority: '',
    type: '',
    protocol: '',
});

const editingRuleId = ref<number | null>(null);

const sortedRules = computed<FirewallRule[]>(() =>
    [...rules.value].sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        return a.id - b.id;
    }),
);

const hasAllocations = computed<boolean>(() => allocations.value.length > 0);

function updateServerPortFromAllocation(): void {
    if (!hasAllocations.value || selectedAllocationId.value === null) {
        form.server_port = 0;
        return;
    }

    const allocation = allocations.value.find((a) => a.id === selectedAllocationId.value);
    if (!allocation) {
        form.server_port = 0;
        return;
    }

    form.server_port = allocation.port;
}

async function fetchServerAllocations(): Promise<void> {
    if (!serverUuid.value) return;

    loadingAllocations.value = true;
    try {
        const { data } = await axios.get(`/api/user/servers/${serverUuid.value}/allocations`);

        if (!data.success) {
            toast.error(data.message || t('serverAllocations.failedToFetch'));
            return;
        }

        serverInfo.value = {
            id: data.data.server.id,
            name: data.data.server.name,
            uuid: data.data.server.uuid,
        };
        allocations.value = data.data.allocations ?? [];

        // Default selection to primary allocation if available
        const primary = allocations.value.find((a) => a.is_primary);
        if (primary) {
            selectedAllocationId.value = primary.id;
            form.server_port = primary.port;
        } else if (allocations.value.length > 0) {
            const firstAllocation = allocations.value[0];
            selectedAllocationId.value = firstAllocation?.id ?? null;
            if (firstAllocation) {
                form.server_port = firstAllocation.port;
            }
        } else {
            selectedAllocationId.value = null;
            form.server_port = 0;
        }
    } catch (error) {
        console.error('Failed to fetch server allocations for firewall:', error);
        toast.error(getAxiosErrorMessage(error, t('serverAllocations.failedToFetch')));
    } finally {
        loadingAllocations.value = false;
    }
}

function resetForm(): void {
    form.remote_ip = '';
    form.server_port = 0;
    form.priority = 1;
    form.type = 'allow';
    form.protocol = 'tcp';
    editingRuleId.value = null;
    formError.value = null;
    errors.remote_ip = '';
    errors.server_port = '';
    errors.priority = '';
    errors.type = '';
    errors.protocol = '';
}

function openCreateDrawer(): void {
    resetForm();
    isEditing.value = false;
    // Ensure allocation selection matches current allocations
    if (hasAllocations.value) {
        const primary = allocations.value.find((a) => a.is_primary);
        if (primary) {
            selectedAllocationId.value = primary.id;
            form.server_port = primary.port;
        } else if (allocations.value.length > 0) {
            const firstAllocation = allocations.value[0];
            selectedAllocationId.value = firstAllocation?.id ?? null;
            if (firstAllocation) {
                form.server_port = firstAllocation.port;
            }
        }
    }
    drawerOpen.value = true;
}

function openEditDrawer(rule: FirewallRule): void {
    form.remote_ip = rule.remote_ip;
    form.server_port = rule.server_port;
    form.priority = rule.priority;
    form.type = rule.type;
    form.protocol = rule.protocol;
    editingRuleId.value = rule.id;
    isEditing.value = true;
    formError.value = null;
    errors.remote_ip = '';
    errors.server_port = '';
    errors.priority = '';
    errors.type = '';
    errors.protocol = '';

    // Try to map the rule's port back to an allocation
    const matchingAllocation = allocations.value.find((a) => a.port === rule.server_port);
    if (matchingAllocation) {
        selectedAllocationId.value = matchingAllocation.id;
        updateServerPortFromAllocation();
    } else {
        // No matching allocation (possibly stale rule) - keep port read-only
        selectedAllocationId.value = null;
    }
    drawerOpen.value = true;
}

function closeDrawer(): void {
    drawerOpen.value = false;
}

function validateForm(): boolean {
    let valid = true;
    errors.remote_ip = '';
    errors.server_port = '';
    errors.priority = '';
    errors.type = '';
    errors.protocol = '';
    formError.value = null;

    if (!form.remote_ip || !form.remote_ip.trim()) {
        errors.remote_ip = t('serverFirewall.validation.remoteIpRequired');
        valid = false;
    }

    if (!form.server_port || form.server_port < 1 || form.server_port > 65535) {
        errors.server_port = t('serverFirewall.validation.portInvalid');
        valid = false;
    } else if (hasAllocations.value) {
        // Ensure the selected port belongs to this server's allocations
        const hasMatchingAllocation = allocations.value.some((a) => a.port === form.server_port);
        if (!hasMatchingAllocation) {
            errors.server_port = t('serverFirewall.validation.portInvalid');
            valid = false;
        }
    }

    if (form.priority !== undefined && (form.priority < 1 || form.priority > 10000)) {
        errors.priority = t('serverFirewall.validation.priorityInvalid');
        valid = false;
    }

    if (form.type !== 'allow' && form.type !== 'block') {
        errors.type = t('serverFirewall.validation.typeInvalid');
        valid = false;
    }

    if (form.protocol !== 'tcp' && form.protocol !== 'udp') {
        errors.protocol = t('serverFirewall.validation.protocolInvalid');
        valid = false;
    }

    return valid;
}

function getErrorMessage(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
        const e = err as {
            response?: { data?: { error?: string } };
            message?: string;
        };

        if (e.response?.data?.error) {
            return e.response.data.error;
        }

        return e.message || t('serverFirewall.unknownError');
    }

    return t('serverFirewall.unknownError');
}

function formatDate(value: string): string {
    if (!value) return '';
    try {
        const date = new Date(value);
        return date.toLocaleString();
    } catch {
        return value;
    }
}

async function fetchRules(): Promise<void> {
    if (!serverUuid.value || !firewallEnabled.value) return;
    loading.value = true;
    try {
        const response = await axios.get(`/api/user/servers/${serverUuid.value}/firewall`);
        const api = response.data as {
            success?: boolean;
            data?: {
                data?: FirewallRule[];
            };
        };
        rules.value = api.data?.data ?? [];
    } catch (error) {
        console.error('Failed to fetch firewall rules:', error);
        toast.error(t('serverFirewall.fetchError'));
    } finally {
        loading.value = false;
    }
}

async function saveRule(): Promise<void> {
    if (!serverUuid.value || !firewallEnabled.value || !validateForm()) {
        return;
    }

    saving.value = true;
    try {
        if (editingRuleId.value !== null) {
            const response = await axios.put(`/api/user/servers/${serverUuid.value}/firewall/${editingRuleId.value}`, {
                remote_ip: form.remote_ip,
                server_port: form.server_port,
                priority: form.priority,
                type: form.type,
                protocol: form.protocol,
            });
            const api = response.data as {
                success?: boolean;
                data?: {
                    data?: FirewallRule;
                };
            };
            const updated = api.data?.data;
            if (!updated) {
                throw new Error('Invalid response from firewall update API');
            }
            rules.value = rules.value.map((r) => (r.id === updated.id ? updated : r));
            toast.success(t('serverFirewall.updateSuccess'));
        } else {
            const response = await axios.post(`/api/user/servers/${serverUuid.value}/firewall`, {
                remote_ip: form.remote_ip,
                server_port: form.server_port,
                priority: form.priority,
                type: form.type,
                protocol: form.protocol,
            });
            const api = response.data as {
                success?: boolean;
                data?: {
                    data?: FirewallRule;
                };
            };
            const created = api.data?.data;
            if (!created) {
                throw new Error('Invalid response from firewall create API');
            }
            rules.value.push(created);
            toast.success(t('serverFirewall.createSuccess'));
        }
        closeDrawer();
    } catch (error) {
        console.error('Failed to save firewall rule:', error);
        formError.value = getErrorMessage(error);
        toast.error(formError.value);
    } finally {
        saving.value = false;
    }
}

async function deleteRule(rule: FirewallRule): Promise<void> {
    if (!serverUuid.value || !firewallEnabled.value) return;
    deletingRuleId.value = rule.id;
    try {
        await axios.delete(`/api/user/servers/${serverUuid.value}/firewall/${rule.id}`);
        rules.value = rules.value.filter((r) => r.id !== rule.id);
        toast.success(t('serverFirewall.deleteSuccess'));
    } catch (error) {
        console.error('Failed to delete firewall rule:', error);
        toast.error(getErrorMessage(error));
    } finally {
        deletingRuleId.value = null;
    }
}

async function syncRules(): Promise<void> {
    if (!serverUuid.value || !firewallEnabled.value) return;
    syncing.value = true;
    try {
        await axios.post(`/api/user/servers/${serverUuid.value}/firewall/sync`);
        toast.success(t('serverFirewall.syncSuccess'));
    } catch (error) {
        console.error('Failed to sync firewall rules:', error);
        toast.error(getErrorMessage(error));
    } finally {
        syncing.value = false;
    }
}

onMounted(async () => {
    // Fetch settings first to check if firewall is enabled
    // Settings are fetched once in App.vue - no need to fetch here

    // Only fetch firewall data if the feature is enabled
    if (settingsStore.serverAllowUserMadeFirewall) {
        void fetchServerAllocations();
        void fetchRules();
    }
});
</script>
