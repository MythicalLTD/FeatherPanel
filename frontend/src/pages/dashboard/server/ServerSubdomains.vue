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
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">
                            {{ t('serverSubdomains.title') }}
                        </h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverSubdomains.description') }}
                            <span v-if="overview" class="font-medium">
                                ({{ overview.current_total }}/{{ overview.max_allowed }})
                            </span>
                        </p>
                    </div>
                    <div class="flex gap-2">
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
                        <Button
                            size="sm"
                            :disabled="loading || !canCreateSubdomain"
                            class="flex items-center gap-2"
                            @click="openCreateSubdomainDrawer"
                        >
                            <Plus class="h-4 w-4" />
                            <span>{{ t('serverSubdomains.createButton') }}</span>
                        </Button>
                    </div>
                </div>

                <!-- Subdomain Limit Warning -->
                <div
                    v-if="overview && overview.current_total >= overview.max_allowed"
                    class="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border-2 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
                >
                    <div class="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                            {{ t('serverSubdomains.limitReached') }}
                        </h3>
                        <p class="text-sm text-yellow-700 dark:text-yellow-300">
                            {{ t('serverSubdomains.limitReachedDescription', { limit: overview.max_allowed }) }}
                        </p>
                    </div>
                </div>
            </div>

            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Loading State -->
            <div
                v-if="loading && subdomainEntries.length === 0"
                class="flex flex-col items-center justify-center py-16"
            >
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && subdomainEntries.length === 0"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
                                <Network class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverSubdomains.noSubdomains') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{
                                availableDomains.length === 0
                                    ? t('serverSubdomains.noDomainsAvailable')
                                    : t('serverSubdomains.noSubdomainsDescription')
                            }}
                        </p>
                    </div>
                    <Button
                        v-if="canCreateSubdomain && availableDomains.length > 0"
                        size="lg"
                        class="gap-2 shadow-lg"
                        @click="openCreateSubdomainDrawer"
                    >
                        <Plus class="h-5 w-5" />
                        {{ t('serverSubdomains.createButton') }}
                    </Button>
                </div>
            </div>

            <!-- Plugin Widgets: Before Subdomains List -->
            <WidgetRenderer
                v-if="!loading && subdomainEntries.length > 0 && widgetsBeforeTable.length > 0"
                :widgets="widgetsBeforeTable"
            />

            <!-- Subdomains List -->
            <Card
                v-if="!loading && subdomainEntries.length > 0"
                class="border-2 hover:border-primary/50 transition-colors"
            >
                <CardHeader>
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Network class="h-5 w-5 text-primary" />
                        </div>
                        <div class="flex-1">
                            <CardTitle class="text-lg">{{ t('serverSubdomains.activeSubdomains') }}</CardTitle>
                            <CardDescription class="text-sm">
                                {{ t('serverSubdomains.activeSubdomainsDescription') }}
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" class="text-xs">
                            {{ subdomainEntries.length }}
                            {{ subdomainEntries.length === 1 ? 'subdomain' : 'subdomains' }}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="entry in subdomainEntries"
                            :key="entry.uuid"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
                        >
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0"
                                    >
                                        <Network class="h-5 w-5 text-green-500" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="font-mono font-semibold text-sm">
                                                {{ entry.subdomain }}.{{ entry.domain }}
                                            </span>
                                            <Badge variant="default" class="text-xs uppercase">
                                                {{ entry.record_type }}
                                            </Badge>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span v-if="entry.port">Port: {{ entry.port }}</span>
                                            <span v-if="entry.created_at">
                                                {{ formatDate(entry.created_at) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="flex items-center gap-2 shrink-0">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        :disabled="deleting === entry.uuid || loading"
                                        class="flex items-center gap-2"
                                        @click="confirmDelete(entry)"
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

            <!-- Plugin Widgets: After Subdomains List -->
            <WidgetRenderer
                v-if="!loading && subdomainEntries.length > 0 && widgetsAfterTable.length > 0"
                :widgets="widgetsAfterTable"
            />

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

    <!-- Create Subdomain Drawer -->
    <Drawer
        :open="showCreateDrawer"
        @update:open="
            (val) => {
                if (!val) closeCreateDrawer();
            }
        "
    >
        <DrawerContent>
            <DrawerHeader>
                <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Plus class="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <DrawerTitle>{{ t('serverSubdomains.createButton') }}</DrawerTitle>
                        <DrawerDescription>{{ t('serverSubdomains.newSubdomainDescription') }}</DrawerDescription>
                    </div>
                </div>
            </DrawerHeader>
            <form class="space-y-5 px-6 pb-6 pt-2" @submit.prevent="createSubdomain">
                <!-- Domain Selection -->
                <div class="space-y-2">
                    <Label for="domain-select" class="text-sm font-medium">
                        {{ t('serverSubdomains.domainLabel') }}
                    </Label>
                    <Select v-model="createForm.domain_uuid" required :disabled="availableDomains.length === 0">
                        <SelectTrigger class="w-full">
                            <SelectValue
                                :placeholder="
                                    availableDomains.length === 0
                                        ? t('serverSubdomains.noDomainsAvailable')
                                        : t('serverSubdomains.domainPlaceholder')
                                "
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-for="domain in availableDomains" :key="domain.uuid" :value="domain.uuid">
                                {{ domain.domain }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Subdomain Label -->
                <div class="space-y-2">
                    <Label for="subdomain-label" class="text-sm font-medium">
                        {{ t('serverSubdomains.subdomainLabel') }}
                    </Label>
                    <Input
                        id="subdomain-label"
                        v-model="createForm.subdomain"
                        type="text"
                        :placeholder="t('serverSubdomains.subdomainPlaceholder')"
                        required
                    />
                    <p class="text-xs text-muted-foreground">
                        {{ t('serverSubdomains.subdomainHint') }}
                    </p>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" @click="closeCreateDrawer">
                        {{ t('common.cancel') }}
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        :disabled="creating || availableDomains.length === 0"
                        class="flex items-center gap-2"
                    >
                        <RefreshCw v-if="creating" class="h-4 w-4 animate-spin" />
                        <span>{{ t('serverSubdomains.createButton') }}</span>
                    </Button>
                </div>
            </form>
        </DrawerContent>
    </Drawer>
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
import { RefreshCw, Network, Plus, Trash2, AlertTriangle } from 'lucide-vue-next';
import { fetchServerSubdomains, createServerSubdomain, deleteServerSubdomain } from '@/lib/subdomains';
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

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-subdomains');
const widgetsTopOfPage = computed(() => getWidgets('server-subdomains', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-subdomains', 'after-header'));
const widgetsBeforeTable = computed(() => getWidgets('server-subdomains', 'before-subdomains-list'));
const widgetsAfterTable = computed(() => getWidgets('server-subdomains', 'after-subdomains-list'));
const widgetsBottomOfPage = computed(() => getWidgets('server-subdomains', 'bottom-of-page'));

const loading = ref(true);
const creating = ref(false);
const deleting = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

const overview = ref<SubdomainOverview | null>(null);
const subdomainEntries = ref<ServerSubdomainEntry[]>([]);

// Drawer state
const showCreateDrawer = ref(false);
const createForm = reactive({
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

// Computed
const availableDomains = computed<ServerDomainOption[]>(() => overview.value?.domains ?? []);
const canCreateSubdomain = computed(() => (overview.value?.current_total ?? 0) < (overview.value?.max_allowed ?? 0));

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
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : t('serverSubdomains.loadFailed');
    } finally {
        loading.value = false;
    }
}

async function refresh(): Promise<void> {
    await loadOverview();
}

function openCreateSubdomainDrawer(): void {
    createForm.domain_uuid = '';
    createForm.subdomain = '';
    showCreateDrawer.value = true;
}

function closeCreateDrawer(): void {
    showCreateDrawer.value = false;
}

async function createSubdomain(): Promise<void> {
    if (!createForm.domain_uuid || !createForm.subdomain.trim()) {
        toast.error(t('serverSubdomains.subdomainRequired'));
        return;
    }

    if (!canCreateSubdomain.value) {
        toast.error(t('serverSubdomains.limitReached'));
        return;
    }

    creating.value = true;
    try {
        await createServerSubdomain(route.params.uuidShort as string, {
            domain_uuid: createForm.domain_uuid,
            subdomain: createForm.subdomain.trim(),
        });
        toast.success(t('serverSubdomains.created'));
        closeCreateDrawer();
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
