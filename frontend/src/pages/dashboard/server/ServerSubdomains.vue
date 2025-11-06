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
        <div class="space-y-6 pb-10">
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverSubdomains.title') }}</h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverSubdomains.description') }}
                        </p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="refresh"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('common.refresh') }}</span>
                        </Button>
                    </div>
                </div>

                <div v-if="!loading && !errorMessage" class="flex items-center gap-2 text-sm text-muted-foreground">
                    <div class="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                    <span>{{ usageMessage }}</span>
                </div>
            </div>

            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <div v-if="loading" class="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
                <div class="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
                <span>{{ t('serverSubdomains.loading') }}</span>
            </div>

            <template v-else>
                <Alert v-if="errorMessage" variant="destructive">
                    <AlertTitle>{{ t('serverSubdomains.loadFailed') }}</AlertTitle>
                    <AlertDescription>{{ errorMessage }}</AlertDescription>
                </Alert>
                <Alert
                    v-else-if="showLimitWarning"
                    :variant="canCreateSubdomain ? 'default' : 'destructive'"
                    :class="[
                        'border-dashed',
                        canCreateSubdomain
                            ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-900 dark:text-yellow-100'
                            : '',
                    ]"
                >
                    <AlertTitle>
                        {{
                            canCreateSubdomain ? t('serverSubdomains.limitWarning') : t('serverSubdomains.limitReached')
                        }}
                    </AlertTitle>
                    <AlertDescription>
                        {{ remainingHint }}
                    </AlertDescription>
                </Alert>

                <WidgetRenderer v-if="widgetsBeforeSummary.length > 0" :widgets="widgetsBeforeSummary" />

                <Card class="border-muted">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Layers class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverSubdomains.currentUsage') }}</CardTitle>
                                <CardDescription>{{ usageMessage }}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div class="grid gap-4 md:grid-cols-3">
                            <div
                                class="rounded-xl border p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                            >
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <p class="text-xs uppercase text-muted-foreground tracking-wide">
                                            {{ t('serverSubdomains.totalAllowed') }}
                                        </p>
                                        <p class="mt-2 text-2xl font-semibold text-foreground">
                                            {{ overview?.max_allowed ?? 0 }}
                                        </p>
                                    </div>
                                    <Shield class="h-8 w-8 text-primary/70" />
                                </div>
                            </div>
                            <div
                                class="rounded-xl border p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                            >
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <p class="text-xs uppercase text-muted-foreground tracking-wide">
                                            {{ t('serverSubdomains.inUse') }}
                                        </p>
                                        <p class="mt-2 text-2xl font-semibold text-foreground">
                                            {{ overview?.current_total ?? 0 }}
                                        </p>
                                    </div>
                                    <Network class="h-8 w-8 text-primary/70" />
                                </div>
                            </div>
                            <div
                                class="rounded-xl border p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                            >
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <p class="text-xs uppercase text-muted-foreground tracking-wide">
                                            {{ t('serverSubdomains.remaining') }}
                                        </p>
                                        <p class="mt-2 text-2xl font-semibold text-foreground">
                                            {{ remainingSlots }}
                                        </p>
                                        <p class="text-xs text-muted-foreground mt-1">{{ remainingHint }}</p>
                                    </div>
                                    <Sparkles class="h-8 w-8 text-primary/70" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <WidgetRenderer v-if="widgetsAfterSummary.length > 0" :widgets="widgetsAfterSummary" />

                <Card class="border-2 hover:border-primary/40 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Globe class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverSubdomains.newSubdomainTitle') }}</CardTitle>
                                <CardDescription>{{ t('serverSubdomains.newSubdomainDescription') }}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <div
                            v-if="availableDomains.length === 0"
                            class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center bg-muted/20"
                        >
                            {{ t('serverSubdomains.noDomainsAvailable') }}
                        </div>
                        <div v-else class="grid gap-4 md:grid-cols-2">
                            <div class="space-y-2">
                                <Label>{{ t('serverSubdomains.domainLabel') }}</Label>
                                <Select v-model="form.domain_uuid">
                                    <SelectTrigger>
                                        <SelectValue :placeholder="t('serverSubdomains.domainPlaceholder')" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            v-for="domain in availableDomains"
                                            :key="domain.uuid"
                                            :value="domain.uuid"
                                        >
                                            {{ domain.domain }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div class="space-y-2">
                                <Label>{{ t('serverSubdomains.subdomainLabel') }}</Label>
                                <Input
                                    v-model="form.subdomain"
                                    :placeholder="t('serverSubdomains.subdomainPlaceholder')"
                                    autocomplete="off"
                                />
                                <p class="text-xs text-muted-foreground">{{ t('serverSubdomains.subdomainHint') }}</p>
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <Button
                                :disabled="creating || !form.domain_uuid || !canCreateSubdomain"
                                class="flex items-center gap-2"
                                @click="createSubdomain"
                            >
                                <RefreshCw v-if="creating" class="mr-2 h-4 w-4 animate-spin" />
                                <Plus v-else class="h-4 w-4" />
                                {{ creating ? t('common.saving') : t('serverSubdomains.createButton') }}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />

                <Card class="border-2 hover:border-primary/40 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <List class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverSubdomains.activeSubdomains') }}</CardTitle>
                                <CardDescription>{{
                                    t('serverSubdomains.activeSubdomainsDescription')
                                }}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div
                            v-if="subdomainEntries.length === 0"
                            class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center bg-muted/20"
                        >
                            {{ t('serverSubdomains.noSubdomains') }}
                        </div>
                        <div v-else class="overflow-x-auto">
                            <table class="min-w-full text-left text-sm">
                                <thead class="bg-muted/50">
                                    <tr>
                                        <th class="px-4 py-2 font-medium">
                                            {{ t('serverSubdomains.subdomainColumn') }}
                                        </th>
                                        <th class="px-4 py-2 font-medium">{{ t('serverSubdomains.domainColumn') }}</th>
                                        <th class="px-4 py-2 font-medium">
                                            {{ t('serverSubdomains.recordTypeColumn') }}
                                        </th>
                                        <th class="px-4 py-2 font-medium">{{ t('serverSubdomains.portColumn') }}</th>
                                        <th class="px-4 py-2 font-medium">{{ t('serverSubdomains.createdColumn') }}</th>
                                        <th class="px-4 py-2 font-medium text-right">{{ t('common.actions') }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="entry in subdomainEntries" :key="entry.uuid" class="border-t">
                                        <td class="px-4 py-2 font-medium">{{ entry.subdomain }}</td>
                                        <td class="px-4 py-2 text-muted-foreground">{{ entry.domain }}</td>
                                        <td class="px-4 py-2 text-muted-foreground uppercase">
                                            {{ entry.record_type }}
                                        </td>
                                        <td class="px-4 py-2 text-muted-foreground">{{ entry.port ?? '—' }}</td>
                                        <td class="px-4 py-2 text-muted-foreground">
                                            {{ entry.created_at ? formatDate(entry.created_at) : '—' }}
                                        </td>
                                        <td class="px-4 py-2 text-right">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                :disabled="deleting === entry.uuid"
                                                class="flex items-center gap-2"
                                                @click="confirmDelete(entry)"
                                            >
                                                <RefreshCw
                                                    v-if="deleting === entry.uuid"
                                                    class="h-4 w-4 animate-spin"
                                                />
                                                <Trash2 v-else class="h-4 w-4" />
                                                <span>{{ t('common.delete') }}</span>
                                            </Button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />
            </template>

            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
    </DashboardLayout>

    <AlertDialog :open="confirmDialog.open" @update:open="confirmDialog.open = $event">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{{ t('serverSubdomains.deleteTitle') }}</AlertDialogTitle>
                <AlertDialogDescription>
                    {{ t('serverSubdomains.deleteDescription', { subdomain: confirmDialog.subdomain }) }}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="confirmDialog.loading">{{ t('common.cancel') }}</AlertDialogCancel>
                <AlertDialogAction :disabled="confirmDialog.loading" @click="performDelete">
                    <RefreshCw v-if="confirmDialog.loading" class="mr-2 h-4 w-4 animate-spin" />
                    {{ t('common.delete') }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { RefreshCw, Globe, Layers, Network, Sparkles, Shield, Plus, List, Trash2 } from 'lucide-vue-next';
import { fetchServerSubdomains, createServerSubdomain, deleteServerSubdomain } from '@/services/subdomains';
import type { SubdomainOverview } from '@/types/subdomain';
type ServerDomainOption = SubdomainOverview['domains'][number];
type ServerSubdomainEntry = SubdomainOverview['subdomains'][number];

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-subdomains');
const widgetsTopOfPage = computed(() => getWidgets('server-subdomains', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-subdomains', 'after-header'));
const widgetsBeforeSummary = computed(() => getWidgets('server-subdomains', 'before-summary'));
const widgetsAfterSummary = computed(() => getWidgets('server-subdomains', 'after-summary'));
const widgetsBeforeTable = computed(() => getWidgets('server-subdomains', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('server-subdomains', 'after-table'));
const widgetsBottomOfPage = computed(() => getWidgets('server-subdomains', 'bottom-of-page'));

const loading = ref(true);
const creating = ref(false);
const deleting = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

const overview = ref<SubdomainOverview | null>(null);
const subdomainEntries = ref<ServerSubdomainEntry[]>([]);

const form = reactive({
    domain_uuid: '',
    subdomain: '',
});

const confirmDialog = reactive({
    open: false,
    uuid: '' as string,
    subdomain: '' as string,
    loading: false,
});

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverSubdomains.title'), href: `/server/${route.params.uuidShort}/subdomains`, isCurrent: true },
]);

const availableDomains = computed<ServerDomainOption[]>(() => overview.value?.domains ?? []);
const canCreateSubdomain = computed(() => (overview.value?.current_total ?? 0) < (overview.value?.max_allowed ?? 0));
const remainingSlots = computed(() =>
    Math.max((overview.value?.max_allowed ?? 0) - (overview.value?.current_total ?? 0), 0),
);
const usageMessage = computed(() =>
    t('serverSubdomains.usage', {
        current: overview.value?.current_total ?? 0,
        total: overview.value?.max_allowed ?? 0,
    }),
);
const remainingHint = computed(() =>
    t('serverSubdomains.remainingHint', {
        count: remainingSlots.value,
    }),
);
const showLimitWarning = computed(() => !canCreateSubdomain.value || remainingSlots.value <= 1);

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return dateTimeFormatter.format(date);
}

function getErrorMessage(err: unknown, fallback?: string): string {
    if (typeof err === 'object' && err !== null) {
        const error = err as {
            response?: { data?: { message?: string } };
            message?: string;
        };

        if (error.response?.data?.message) {
            return error.response.data.message;
        }

        if (error.message) {
            return error.message;
        }
    }

    return fallback ?? t('common.unexpectedError');
}

async function loadOverview(): Promise<void> {
    loading.value = true;
    errorMessage.value = null;
    try {
        const data = await fetchServerSubdomains(route.params.uuidShort as string);
        overview.value = data;
        subdomainEntries.value = data.subdomains;
        const firstDomain = availableDomains.value[0];
        if (firstDomain && !form.domain_uuid) {
            form.domain_uuid = firstDomain.uuid;
        }
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : t('serverSubdomains.loadFailed');
    } finally {
        loading.value = false;
    }
}

async function refresh(): Promise<void> {
    await loadOverview();
}

async function createSubdomain(): Promise<void> {
    if (!form.domain_uuid) {
        toast.error(t('serverSubdomains.domainRequired'));

        return;
    }

    if (!form.subdomain.trim()) {
        toast.error(t('serverSubdomains.subdomainRequired'));

        return;
    }

    if (!canCreateSubdomain.value) {
        toast.error(t('serverSubdomains.limitReached'));

        return;
    }

    try {
        creating.value = true;
        await createServerSubdomain(route.params.uuidShort as string, {
            domain_uuid: form.domain_uuid,
            subdomain: form.subdomain.trim(),
        });
        toast.success(t('serverSubdomains.created'));
        form.subdomain = '';
        await loadOverview();
    } catch (error) {
        const message = getErrorMessage(error, t('serverSubdomains.createFailed'));
        toast.error(message);
    } finally {
        creating.value = false;
    }
}

function confirmDelete(entry: { uuid: string; subdomain: string; domain: string }): void {
    confirmDialog.uuid = entry.uuid;
    confirmDialog.subdomain = `${entry.subdomain}.${entry.domain}`;
    confirmDialog.open = true;
}

async function performDelete(): Promise<void> {
    try {
        confirmDialog.loading = true;
        deleting.value = confirmDialog.uuid;
        await deleteServerSubdomain(route.params.uuidShort as string, confirmDialog.uuid);
        toast.success(t('serverSubdomains.deleted'));
        confirmDialog.open = false;
        await loadOverview();
    } catch (error) {
        const message = getErrorMessage(error, t('serverSubdomains.deleteFailed'));
        toast.error(message);
    } finally {
        confirmDialog.loading = false;
        deleting.value = null;
    }
}

onMounted(async () => {
    await fetchPluginWidgets();
    await loadOverview();
});
</script>
