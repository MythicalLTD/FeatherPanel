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
        <div class="min-h-screen bg-background pb-10">
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <div v-if="loading" class="flex items-center justify-center py-16">
                <div class="flex items-center gap-3 text-muted-foreground">
                    <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    <span>{{ t('adminSubdomains.loading') }}</span>
                </div>
            </div>

            <div v-else-if="message" class="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                <h3 class="text-lg font-semibold text-red-500">{{ t('adminSubdomains.loadFailed') }}</h3>
                <p class="max-w-sm text-sm text-muted-foreground">{{ message }}</p>
                <Button variant="outline" @click="refreshDomains">{{ t('common.refresh') }}</Button>
            </div>

            <div v-else class="space-y-8 px-4 lg:px-8">
                <WidgetRenderer v-if="widgetsBeforeTable.length > 0" :widgets="widgetsBeforeTable" />

                <Card class="border-dashed border-muted bg-muted/40">
                    <CardHeader>
                        <CardTitle>{{ t('adminSubdomains.tutorialTitle') }}</CardTitle>
                        <CardDescription>{{ t('adminSubdomains.tutorialDescription') }}</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4 text-sm text-muted-foreground">
                        <ol class="list-decimal space-y-2 pl-5">
                            <li>{{ t('adminSubdomains.tutorialSteps.credentials') }}</li>
                            <li>{{ t('adminSubdomains.tutorialSteps.domain') }}</li>
                            <li>{{ t('adminSubdomains.tutorialSteps.mappings') }}</li>
                        </ol>
                        <p class="text-xs text-muted-foreground">
                            {{ t('adminSubdomains.tutorialNote') }}
                        </p>
                    </CardContent>
                </Card>

                <TableComponent
                    :title="t('adminSubdomains.title')"
                    :description="t('adminSubdomains.description')"
                    :columns="tableColumns"
                    :data="tableData"
                    :search-placeholder="t('adminSubdomains.searchPlaceholder')"
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="pagination.totalPages"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-admin-subdomains-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" size="sm" class="w-full sm:w-auto" @click="refreshDomains">
                                <RefreshCw class="mr-2 h-4 w-4" />
                                {{ t('common.refresh') }}
                            </Button>
                            <Button
                                size="sm"
                                class="w-full sm:w-auto"
                                data-umami-event="create-subdomain-domain"
                                @click="openCreateDialog"
                            >
                                <Plus class="mr-2 h-4 w-4" />
                                {{ t('adminSubdomains.newDomain') }}
                            </Button>
                        </div>
                    </template>

                    <template #cell-domain="{ item }">
                        <div v-if="isDomainTableRow(item)" class="space-y-1">
                            <div class="font-semibold text-foreground">{{ item.domain }}</div>
                            <p v-if="item.description" class="text-xs text-muted-foreground">{{ item.description }}</p>
                        </div>
                    </template>

                    <template #cell-status="{ item }">
                        <Badge
                            v-if="isDomainTableRow(item)"
                            :variant="item.isActive ? 'default' : 'secondary'"
                            class="capitalize"
                        >
                            {{
                                item.isActive ? t('adminSubdomains.statusActive') : t('adminSubdomains.statusInactive')
                            }}
                        </Badge>
                    </template>

                    <template #cell-actions="{ item }">
                        <div v-if="isDomainTableRow(item)" class="flex justify-end gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="View subdomain"
                                @click="viewDomain(item.uuid)"
                            >
                                {{ t('adminSubdomains.view') }}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Edit subdomain"
                                @click="openEditDialog(item.uuid)"
                            >
                                {{ t('adminSubdomains.edit') }}
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                class="hover:scale-110 hover:shadow-md transition-all duration-200"
                                title="Delete subdomain"
                                @click="confirmDelete(item.uuid, item.domain)"
                            >
                                {{ t('common.delete') }}
                            </Button>
                        </div>
                    </template>
                </TableComponent>

                <WidgetRenderer v-if="widgetsAfterTable.length > 0" :widgets="widgetsAfterTable" />

                <Card class="border-muted">
                    <CardHeader>
                        <CardTitle>{{ t('adminSubdomains.settingsTitle') }}</CardTitle>
                        <CardDescription>{{ t('adminSubdomains.settingsDescription') }}</CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-6">
                        <div class="grid gap-4 md:grid-cols-2">
                            <div class="space-y-2">
                                <Label for="cf-email">{{ t('adminSubdomains.cloudflareEmail') }}</Label>
                                <Input
                                    id="cf-email"
                                    v-model="settings.cloudflare_email"
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div class="space-y-2">
                                <Label for="cf-key">{{ t('adminSubdomains.cloudflareKey') }}</Label>
                                <Input
                                    id="cf-key"
                                    v-model="settings.cloudflare_api_key"
                                    :placeholder="
                                        settingsState.cloudflare_api_key_set
                                            ? t('adminSubdomains.secretPlaceholder')
                                            : t('adminSubdomains.cloudflareKeyPlaceholder')
                                    "
                                />
                                <p v-if="settingsState.cloudflare_api_key_set" class="text-xs text-muted-foreground">
                                    {{ t('adminSubdomains.secretMaskedMessage') }}
                                </p>
                                <p class="text-xs text-muted-foreground">{{ t('adminSubdomains.cloudflareHint') }}</p>
                            </div>
                            <div class="space-y-2">
                                <Label for="max-per-server">{{ t('adminSubdomains.maxPerServer') }}</Label>
                                <Input
                                    id="max-per-server"
                                    v-model.number="settings.max_subdomains_per_server"
                                    type="number"
                                    min="1"
                                />
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <Button :disabled="savingSettings" @click="saveSettings">
                                <RefreshCw v-if="savingSettings" class="mr-2 h-4 w-4 animate-spin" />
                                {{ savingSettings ? t('common.saving') : t('common.save') }}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
            </div>
        </div>
    </DashboardLayout>

    <Dialog :open="manageDialogOpen" @update:open="handleDialogToggle">
        <DialogContent class="sm:max-w-3xl overflow-visible p-0">
            <DialogHeader class="px-6 pt-6">
                <DialogTitle class="text-2xl font-semibold">
                    {{ dialogMode === 'edit' ? t('adminSubdomains.editDomain') : t('adminSubdomains.createDomain') }}
                </DialogTitle>
                <DialogDescription class="text-sm text-muted-foreground">
                    {{ t('adminSubdomains.drawerDescription') }}
                </DialogDescription>
            </DialogHeader>
            <div class="max-h-[75vh] overflow-y-auto space-y-6 px-6 pb-6">
                <Alert variant="default" class="border border-dashed border-muted bg-muted/50">
                    <AlertTitle>{{ t('adminSubdomains.dialogHelpTitle') }}</AlertTitle>
                    <AlertDescription>
                        <ul class="list-disc space-y-1 pl-4">
                            <li>{{ t('adminSubdomains.dialogHelpSteps.domain') }}</li>
                            <li>{{ t('adminSubdomains.dialogHelpSteps.spell') }}</li>
                            <li>{{ t('adminSubdomains.dialogHelpSteps.protocol') }}</li>
                        </ul>
                        <p class="mt-3 text-xs text-muted-foreground">
                            {{ t('adminSubdomains.dialogHelpFootnote') }}
                        </p>
                    </AlertDescription>
                </Alert>
                <div class="grid gap-3">
                    <Label for="domain-name">{{ t('adminSubdomains.domainLabel') }}</Label>
                    <Input id="domain-name" v-model="domainForm.domain" placeholder="example.com" />
                </div>
                <div class="grid gap-3">
                    <Label for="domain-description">{{ t('adminSubdomains.descriptionLabel') }}</Label>
                    <Textarea
                        id="domain-description"
                        v-model="domainForm.description"
                        :placeholder="t('adminSubdomains.descriptionPlaceholder')"
                    />
                </div>
                <div class="grid gap-3">
                    <Label for="account-id">{{ t('adminSubdomains.accountIdLabel') }}</Label>
                    <Input
                        id="account-id"
                        v-model="domainForm.cloudflare_account_id"
                        :placeholder="t('adminSubdomains.accountIdPlaceholder')"
                    />
                    <p class="text-xs text-muted-foreground">
                        {{ t('adminSubdomains.accountIdHint') }}
                    </p>
                </div>
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="grid gap-2">
                        <Label>{{ t('adminSubdomains.activeToggle') }}</Label>
                        <label
                            class="flex cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 transition hover:border-primary/60"
                        >
                            <span
                                class="flex h-4 w-4 items-center justify-center rounded border transition"
                                :class="
                                    domainForm.is_active
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-muted-foreground/40 bg-transparent'
                                "
                            >
                                <svg
                                    v-if="domainForm.is_active"
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-3 w-3"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M16.704 5.29a1 1 0 0 1 0 1.414l-7.428 7.428a1 1 0 0 1-1.414 0L3.296 9.567a1 1 0 1 1 1.414-1.414l3.152 3.152 6.72-6.72a1 1 0 0 1 1.422 0z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </span>
                            <span class="flex-1 text-sm text-muted-foreground">{{
                                t('adminSubdomains.activeToggleHint')
                            }}</span>
                            <input
                                class="hidden"
                                type="checkbox"
                                :checked="domainForm.is_active"
                                @change="domainForm.is_active = !domainForm.is_active"
                            />
                        </label>
                    </div>
                    <div class="grid gap-2">
                        <Label>{{ t('adminSubdomains.zoneLabel') }}</Label>
                        <label
                            class="flex cursor-pointer items-center gap-3 rounded-lg border border-input bg-background px-3 py-2 transition hover:border-primary/60"
                        >
                            <span
                                class="flex h-4 w-4 items-center justify-center rounded border transition"
                                :class="
                                    zoneOverrideEnabled
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-muted-foreground/40 bg-transparent'
                                "
                            >
                                <svg
                                    v-if="zoneOverrideEnabled"
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-3 w-3"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fill-rule="evenodd"
                                        d="M16.704 5.29a1 1 0 0 1 0 1.414l-7.428 7.428a1 1 0 0 1-1.414 0L3.296 9.567a1 1 0 1 1 1.414-1.414l3.152 3.152 6.72-6.72a1 1 0 0 1 1.422 0z"
                                        clip-rule="evenodd"
                                    />
                                </svg>
                            </span>
                            <span class="flex-1 text-sm text-muted-foreground">
                                {{ t('adminSubdomains.zoneToggleLabel') }}
                            </span>
                            <input
                                class="hidden"
                                type="checkbox"
                                :checked="zoneOverrideEnabled"
                                @change="toggleZoneOverride"
                            />
                        </label>
                        <Input
                            v-if="zoneOverrideEnabled"
                            id="zone-id"
                            v-model="domainForm.cloudflare_zone_id"
                            placeholder="optional"
                            class="transition"
                        />
                    </div>
                </div>
                <Separator />
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-foreground">{{ t('adminSubdomains.mappingsTitle') }}</h3>
                    <Button size="sm" variant="outline" @click="addMapping">{{
                        t('adminSubdomains.addMapping')
                    }}</Button>
                </div>
                <div class="space-y-3">
                    <div
                        v-for="(mapping, index) in domainForm.spells"
                        :key="index"
                        class="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-2 xl:grid-cols-4"
                    >
                        <div class="grid gap-2 md:col-span-2 xl:col-span-4">
                            <Label>{{ t('adminSubdomains.spell') }}</Label>
                            <Select
                                :model-value="mapping.spell_id !== null ? String(mapping.spell_id) : undefined"
                                @update:model-value="handleSpellSelection(index, $event)"
                            >
                                <SelectTrigger>
                                    <SelectValue :placeholder="t('adminSubdomains.selectSpell')" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        v-for="spell in availableSpellOptions(index)"
                                        :key="spell.id"
                                        :value="String(spell.id)"
                                    >
                                        {{ spell.name }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div class="grid gap-3 md:col-span-2 xl:col-span-4 md:grid-cols-2 xl:grid-cols-4">
                            <div class="grid gap-2">
                                <Label>{{ t('adminSubdomains.protocolService') }}</Label>
                                <Input v-model="mapping.protocol_service" placeholder="_minecraft" />
                            </div>
                            <div class="grid gap-2">
                                <Label>{{ t('adminSubdomains.protocolType') }}</Label>
                                <Select v-model="mapping.protocol_type">
                                    <SelectTrigger>
                                        <SelectValue placeholder="tcp" class="uppercase" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="type in protocolOptions" :key="type" :value="type">
                                            <span class="uppercase">{{ type }}</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('adminSubdomains.protocolHint') }}
                                </p>
                            </div>
                            <div class="grid gap-2">
                                <Label>{{ t('adminSubdomains.priority') }}</Label>
                                <Input v-model.number="mapping.priority" type="number" min="0" />
                            </div>
                            <div class="grid gap-2">
                                <Label>{{ t('adminSubdomains.weight') }}</Label>
                                <Input v-model.number="mapping.weight" type="number" min="0" />
                            </div>
                            <div class="grid gap-2">
                                <Label>{{ t('adminSubdomains.ttl') }}</Label>
                                <Input v-model.number="mapping.ttl" type="number" min="60" step="10" />
                            </div>
                        </div>
                        <div class="md:col-span-2 xl:col-span-4 flex justify-end">
                            <Button size="sm" variant="ghost" @click="removeMapping(index)">
                                {{ t('adminSubdomains.removeMapping') }}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <DialogClose as-child>
                    <Button variant="outline">{{ t('common.cancel') }}</Button>
                </DialogClose>
                <Button :disabled="savingDomain" @click="submitDomain">
                    <RefreshCw v-if="savingDomain" class="mr-2 h-4 w-4 animate-spin" />
                    {{
                        savingDomain
                            ? t('common.saving')
                            : dialogMode === 'edit'
                              ? t('common.save')
                              : t('adminSubdomains.createButton')
                    }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog v-model:open="detailsDialog.open">
        <DialogContent class="max-w-2xl">
            <DialogHeader>
                <DialogTitle>{{
                    t('adminSubdomains.domainDetailsTitle', { domain: detailsDialog.domain?.domain })
                }}</DialogTitle>
                <DialogDescription>{{ t('adminSubdomains.domainDetailsDescription') }}</DialogDescription>
            </DialogHeader>
            <div class="space-y-4">
                <div class="rounded-md border">
                    <table class="min-w-full text-left text-sm">
                        <thead class="bg-muted/50">
                            <tr>
                                <th class="px-4 py-2 font-medium">{{ t('adminSubdomains.subdomain') }}</th>
                                <th class="px-4 py-2 font-medium">{{ t('adminSubdomains.recordType') }}</th>
                                <th class="px-4 py-2 font-medium">{{ t('adminSubdomains.port') }}</th>
                                <th class="px-4 py-2 font-medium">{{ t('adminSubdomains.createdColumn') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="detailsDialog.entries.length === 0">
                                <td colspan="4" class="px-4 py-4 text-center text-muted-foreground">
                                    {{ t('adminSubdomains.noSubdomains') }}
                                </td>
                            </tr>
                            <tr v-for="entry in detailsDialog.entries" :key="entry.uuid" class="border-t">
                                <td class="px-4 py-2">{{ entry.subdomain }}.{{ detailsDialog.domain?.domain }}</td>
                                <td class="px-4 py-2">{{ entry.record_type }}</td>
                                <td class="px-4 py-2">{{ entry.port ?? '—' }}</td>
                                <td class="px-4 py-2">{{ entry.created_at ? formatDate(entry.created_at) : '—' }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" @click="detailsDialog.open = false">{{ t('common.close') }}</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import TableComponent from '@/components/ui/feather-table/TableComponent.vue';
import type { TableColumn } from '@/components/ui/feather-table/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw } from 'lucide-vue-next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    fetchAdminSubdomains,
    fetchAdminDomain,
    fetchAdminSubdomainList,
    createAdminDomain,
    updateAdminDomain,
    deleteAdminDomain,
    fetchAdminSubdomainSettings,
    updateAdminSubdomainSettings,
    fetchAdminSubdomainSpells,
} from '@/lib/subdomains';
import type {
    SubdomainAdminResponse,
    SubdomainDomain,
    SubdomainDomainPayload,
    SubdomainSettingsPayload,
} from '@/types/subdomain';
interface DomainTableRow extends Record<string, unknown> {
    uuid: string;
    domain: string;
    description?: string | null;
    isActive: boolean;
    mappingCount: number;
    subdomainCount: number;
    updated_at?: string | null;
}

interface DomainFormSpell {
    spell_id: number | null;
    protocol_service: string;
    protocol_type: string;
    priority: number;
    weight: number;
    ttl: number;
}

interface SubdomainSettingsForm {
    cloudflare_email: string;
    cloudflare_api_key: string;
    max_subdomains_per_server: number;
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const { t } = useI18n();
const toast = useToast();

const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('admin-subdomains');
const widgetsTopOfPage = computed(() => getWidgets('admin-subdomains', 'top-of-page'));
const widgetsBeforeTable = computed(() => getWidgets('admin-subdomains', 'before-table'));
const widgetsAfterTable = computed(() => getWidgets('admin-subdomains', 'after-table'));
const widgetsBottomOfPage = computed(() => getWidgets('admin-subdomains', 'bottom-of-page'));

const loading = ref(true);
const message = ref<string | null>(null);
const searchQuery = ref('');
const includeInactive = ref(true);

const domains = ref<SubdomainDomain[]>([]);
const pagination = reactive({
    page: 1,
    perPage: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});

const tableColumns: TableColumn[] = [
    { key: 'domain', label: t('adminSubdomains.domainColumn'), searchable: true },
    { key: 'status', label: t('adminSubdomains.statusColumn') },
    { key: 'mappingCount', label: t('adminSubdomains.mappingsColumn') },
    { key: 'subdomainCount', label: t('adminSubdomains.subdomainsColumn') },
    { key: 'updated_at', label: t('common.updated') },
    { key: 'actions', label: t('common.actions'), headerClass: 'w-[160px]' },
];

const tableData = computed<DomainTableRow[]>(() =>
    domains.value.map((domain) => ({
        uuid: domain.uuid,
        domain: domain.domain,
        description: domain.description,
        isActive: Number(domain.is_active) === 1,
        mappingCount: domain.spells.length,
        subdomainCount: domain.subdomain_count ?? 0,
        updated_at: domain.updated_at ?? null,
    })),
);

function isDomainTableRow(item: unknown): item is DomainTableRow {
    if (typeof item !== 'object' || item === null) {
        return false;
    }

    const record = item as Record<string, unknown>;
    return typeof record.uuid === 'string' && typeof record.domain === 'string';
}

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('nav.adminPanel'), href: '/admin' },
    { text: t('nav.subdomains'), href: '/admin/subdomains', isCurrent: true },
]);

const manageDialogOpen = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const savingDomain = ref(false);
const savingSettings = ref(false);
const editingUuid = ref<string | null>(null);

const domainForm = reactive({
    domain: '',
    description: '',
    is_active: true,
    cloudflare_zone_id: '',
    cloudflare_account_id: '',
    spells: [] as DomainFormSpell[],
});

const availableSpells = ref<Array<{ id: number; uuid: string; name: string; realm_id: number }>>([]);

const detailsDialog = reactive({
    open: false,
    domain: null as SubdomainDomain | null,
    entries: [] as Array<{
        uuid: string;
        subdomain: string;
        record_type: string;
        port: number | null;
        created_at: string | null;
    }>,
});

const settings = reactive<SubdomainSettingsForm>({
    cloudflare_email: '',
    cloudflare_api_key: '',
    max_subdomains_per_server: 1,
});
const settingsState = reactive({
    cloudflare_api_key_set: false,
});

const protocolOptions = ['tcp', 'udp', 'tls'] as const;
const zoneOverrideEnabled = ref(false);

function formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return dateTimeFormatter.format(date);
}

function resetDomainForm(): void {
    domainForm.domain = '';
    domainForm.description = '';
    domainForm.is_active = true;
    domainForm.cloudflare_zone_id = '';
    domainForm.cloudflare_account_id = '';
    domainForm.spells = [];
    zoneOverrideEnabled.value = false;
}

function availableSpellOptions(targetIndex?: number) {
    const currentId = typeof targetIndex === 'number' ? (domainForm.spells[targetIndex]?.spell_id ?? null) : null;

    const usedIds = domainForm.spells
        .filter((_, idx) => idx !== targetIndex)
        .map((mapping) => mapping.spell_id)
        .filter((id): id is number => id !== null);

    return availableSpells.value.filter(
        (spell) => (currentId !== null && spell.id === currentId) || !usedIds.includes(spell.id),
    );
}

function addMapping(): void {
    const options = availableSpellOptions();
    if (options.length === 0) {
        toast.warning(t('adminSubdomains.noSpellsAvailable'));

        return;
    }

    const firstOption = options[0];

    if (!firstOption) {
        return;
    }

    domainForm.spells.push({
        spell_id: firstOption.id,
        protocol_service: '',
        protocol_type: 'tcp',
        priority: 1,
        weight: 1,
        ttl: 120,
    });
}

function removeMapping(index: number): void {
    domainForm.spells.splice(index, 1);
}

type SelectAcceptableValue = string | number | boolean | bigint | Record<string, unknown> | null | undefined;

function handleSpellSelection(index: number, value: SelectAcceptableValue): void {
    const target = domainForm.spells[index];

    if (!target) {
        return;
    }

    if (typeof value !== 'string') {
        target.spell_id = null;

        return;
    }

    const parsed = Number.parseInt(value, 10);

    target.spell_id = Number.isNaN(parsed) ? null : parsed;
}

async function loadDomains(): Promise<void> {
    loading.value = true;
    message.value = null;
    try {
        const data: SubdomainAdminResponse = await fetchAdminSubdomains({
            page: pagination.page,
            limit: pagination.perPage,
            search: searchQuery.value || undefined,
            includeInactive: includeInactive.value,
        });

        domains.value = data.domains;
        pagination.page = data.pagination.current_page;
        pagination.perPage = data.pagination.per_page;
        pagination.total = data.pagination.total_records;
        pagination.totalPages = Math.max(data.pagination.total_pages, 1);
        pagination.hasNext = data.pagination.current_page < data.pagination.total_pages;
        pagination.hasPrev = data.pagination.current_page > 1;

        const start =
            data.pagination.total_records === 0 ? 0 : (data.pagination.current_page - 1) * data.pagination.per_page + 1;
        const end =
            data.pagination.total_records === 0
                ? 0
                : Math.min(data.pagination.current_page * data.pagination.per_page, data.pagination.total_records);

        pagination.from = start;
        pagination.to = end;
    } catch (error) {
        message.value = error instanceof Error ? error.message : t('adminSubdomains.loadFailed');
    } finally {
        loading.value = false;
    }
}

async function loadSettings(): Promise<void> {
    try {
        const data = await fetchAdminSubdomainSettings();
        settings.cloudflare_email = data.cloudflare_email || '';
        settings.max_subdomains_per_server = Number(data.max_subdomains_per_server) || 1;
        settings.cloudflare_api_key = '';
        settingsState.cloudflare_api_key_set = Boolean(data.cloudflare_api_key_set);
    } catch {
        toast.error(t('adminSubdomains.settingsLoadFailed'));
    }
}

async function loadSpells(): Promise<void> {
    try {
        availableSpells.value = await fetchAdminSubdomainSpells();
    } catch {
        toast.error(t('adminSubdomains.spellsLoadFailed'));
    }
}

function handleSearch(query: string): void {
    searchQuery.value = query;
    pagination.page = 1;
    void loadDomains();
}

function changePage(page: number): void {
    pagination.page = page;
    void loadDomains();
}

function refreshDomains(): void {
    void loadDomains();
}

function openCreateDialog(): void {
    dialogMode.value = 'create';
    editingUuid.value = null;
    resetDomainForm();
    if (domainForm.spells.length === 0 && availableSpells.value.length > 0) {
        addMapping();
    }
    manageDialogOpen.value = true;
}

async function openEditDialog(uuid: string): Promise<void> {
    try {
        dialogMode.value = 'edit';
        editingUuid.value = uuid;
        const domain = await fetchAdminDomain(uuid);
        domainForm.domain = domain.domain;
        domainForm.description = domain.description ?? '';
        domainForm.is_active = Number(domain.is_active) === 1;
        domainForm.cloudflare_zone_id = domain.cloudflare_zone_id ?? '';
        domainForm.cloudflare_account_id = domain.cloudflare_account_id ?? '';
        zoneOverrideEnabled.value = Boolean(domain.cloudflare_zone_id);
        domainForm.spells = domain.spells.map((mapping) => ({
            spell_id: mapping.spell_id,
            protocol_service: mapping.protocol_service ?? '',
            protocol_type: normalizeProtocolType(mapping.protocol_type),
            priority: mapping.priority ?? 1,
            weight: mapping.weight ?? 1,
            ttl: mapping.ttl ?? 120,
        }));
        if (domainForm.spells.length === 0 && availableSpells.value.length > 0) {
            addMapping();
        }
        manageDialogOpen.value = true;
    } catch {
        toast.error(t('adminSubdomains.loadDomainFailed'));
    }
}

function handleDialogToggle(open: boolean): void {
    manageDialogOpen.value = open;
    if (!open) {
        resetDomainForm();
    }
}

async function submitDomain(): Promise<void> {
    if (!domainForm.domain.trim()) {
        toast.error(t('adminSubdomains.domainRequired'));

        return;
    }

    if (!domainForm.cloudflare_account_id.trim()) {
        toast.error(t('adminSubdomains.accountIdRequired'));

        return;
    }

    if (domainForm.spells.length === 0 || domainForm.spells.some((mapping) => mapping.spell_id === null)) {
        toast.error(t('adminSubdomains.spellRequired'));

        return;
    }

    const payload: SubdomainDomainPayload = {
        domain: domainForm.domain.trim(),
        cloudflare_account_id: domainForm.cloudflare_account_id.trim(),
        description: domainForm.description.trim() || undefined,
        is_active: domainForm.is_active,
        cloudflare_zone_id: zoneOverrideEnabled.value ? domainForm.cloudflare_zone_id.trim() || undefined : undefined,
        spells: domainForm.spells.map((mapping) => ({
            spell_id: mapping.spell_id as number,
            protocol_service: mapping.protocol_service.trim() ? mapping.protocol_service.trim() : null,
            protocol_type: mapping.protocol_type,
            priority: mapping.priority,
            weight: mapping.weight,
            ttl: mapping.ttl,
        })),
    };

    savingDomain.value = true;
    try {
        if (dialogMode.value === 'edit' && editingUuid.value) {
            await updateAdminDomain(editingUuid.value, payload);
            toast.success(t('adminSubdomains.updated'));
        } else {
            await createAdminDomain(payload);
            toast.success(t('adminSubdomains.created'));
        }
        manageDialogOpen.value = false;
        void loadDomains();
    } catch {
        toast.error(t('adminSubdomains.saveFailed'));
    } finally {
        savingDomain.value = false;
    }
}

async function confirmDelete(uuid: string, domainName: string): Promise<void> {
    if (!window.confirm(`${t('adminSubdomains.deleteConfirm', { domain: domainName })}`)) {
        return;
    }

    try {
        await deleteAdminDomain(uuid);
        toast.success(t('adminSubdomains.deleted'));
        void loadDomains();
    } catch {
        toast.error(t('adminSubdomains.deleteFailed'));
    }
}

async function viewDomain(uuid: string): Promise<void> {
    try {
        const domain = await fetchAdminDomain(uuid);
        const subdomains = await fetchAdminSubdomainList(uuid);
        detailsDialog.domain = domain;
        detailsDialog.entries = subdomains;
        detailsDialog.open = true;
    } catch {
        toast.error(t('adminSubdomains.loadDomainDetailsFailed'));
    }
}

async function saveSettings(): Promise<void> {
    savingSettings.value = true;
    try {
        const payload: SubdomainSettingsPayload = {
            cloudflare_email: settings.cloudflare_email.trim(),
            max_subdomains_per_server: settings.max_subdomains_per_server,
        };

        const apiKey = settings.cloudflare_api_key.trim();

        if (apiKey !== '') {
            payload.cloudflare_api_key = apiKey;
        }

        await updateAdminSubdomainSettings(payload);
        await loadSettings();
        toast.success(t('adminSubdomains.settingsUpdated'));
    } catch {
        toast.error(t('adminSubdomains.settingsSaveFailed'));
    } finally {
        savingSettings.value = false;
    }
}

onMounted(async () => {
    await Promise.all([loadSpells(), loadSettings()]);
    if (domainForm.spells.length === 0 && availableSpells.value.length > 0) {
        addMapping();
    }
    await fetchPluginWidgets();
    void loadDomains();
});

function toggleZoneOverride(): void {
    zoneOverrideEnabled.value = !zoneOverrideEnabled.value;
    if (!zoneOverrideEnabled.value) {
        domainForm.cloudflare_zone_id = '';
    }
}

function normalizeProtocolType(value: string | null | undefined): string {
    if (!value) {
        return 'tcp';
    }

    const candidate = value.trim().toLowerCase();
    return protocolOptions.includes(candidate as (typeof protocolOptions)[number]) ? candidate : 'tcp';
}
</script>
