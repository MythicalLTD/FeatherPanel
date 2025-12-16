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
                            {{ t('serverImport.title') }}
                        </h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverImport.description') }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="refreshImports"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('common.refresh') }}</span>
                        </Button>
                        <Button
                            v-if="canManageImport && importEnabled"
                            size="sm"
                            :disabled="saving"
                            class="flex items-center gap-2"
                            @click="openImportDrawer"
                        >
                            <Upload class="h-4 w-4" />
                            <span>{{ t('serverImport.createImport') }}</span>
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
                            {{ t('serverImport.infoTitle') }}
                        </h3>
                        <p class="text-sm text-blue-700 dark:text-blue-300">
                            {{ t('serverImport.infoDescription') }}
                        </p>
                    </div>
                </div>
            </div>

            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Feature Disabled State -->
            <Alert v-if="!importEnabled" variant="destructive" class="border-2">
                <AlertTitle>{{ t('serverImport.featureDisabled') }}</AlertTitle>
                <AlertDescription>
                    {{ t('serverImport.featureDisabledDescription') }}
                </AlertDescription>
            </Alert>

            <!-- Loading State -->
            <div v-else-if="loading && imports.length === 0" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="!loading && imports.length === 0 && importEnabled"
                class="flex flex-col items-center justify-center py-16 px-4"
            >
                <div class="text-center max-w-md space-y-6">
                    <div class="flex justify-center">
                        <div class="relative">
                            <div class="absolute inset-0 animate-ping opacity-20">
                                <div class="w-32 h-32 rounded-full bg-primary/20"></div>
                            </div>
                            <div class="relative p-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5">
                                <Upload class="h-16 w-16 text-primary" />
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <h3 class="text-2xl sm:text-3xl font-bold text-foreground">
                            {{ t('serverImport.noImportsTitle') }}
                        </h3>
                        <p class="text-sm sm:text-base text-muted-foreground">
                            {{ t('serverImport.noImportsDescription') }}
                        </p>
                    </div>
                    <Button
                        v-if="canManageImport && importEnabled"
                        size="lg"
                        class="gap-2 shadow-lg"
                        :disabled="saving"
                        @click="openImportDrawer"
                    >
                        <Upload class="h-5 w-5" />
                        {{ t('serverImport.createImport') }}
                    </Button>
                </div>
            </div>

            <!-- Imports List -->
            <Card
                v-if="!loading && imports.length > 0 && importEnabled"
                class="border-2 hover:border-primary/50 transition-colors"
            >
                <CardHeader>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Upload class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverImport.imports') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverImport.importsDescription') }}
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="space-y-3">
                        <div
                            v-for="importItem in imports"
                            :key="importItem.id"
                            class="group relative rounded-lg border-2 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md flex flex-col gap-3"
                        >
                            <!-- Import Header -->
                            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div class="flex items-start gap-3 flex-1 min-w-0">
                                    <div
                                        class="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                                        :class="getStatusIconClass(importItem.status)"
                                    >
                                        <Upload class="h-5 w-5" :class="getStatusIconColor(importItem.status)" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 class="font-semibold text-sm truncate max-w-48 sm:max-w-none">
                                                {{ importItem.host }}:{{ importItem.port }}
                                            </h3>
                                            <Badge
                                                :variant="getStatusVariant(importItem.status)"
                                                class="text-xs shrink-0"
                                            >
                                                {{ getStatusText(importItem.status) }}
                                            </Badge>
                                        </div>
                                        <div
                                            class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
                                        >
                                            <span class="flex items-center gap-1">
                                                <Server class="h-3 w-3" />
                                                {{ importItem.type.toUpperCase() }}
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <User class="h-3 w-3" />
                                                {{ importItem.user }}
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <FolderUp class="h-3 w-3" />
                                                {{ importItem.source_location }}
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <FolderDown class="h-3 w-3" />
                                                {{ importItem.destination_location }}
                                            </span>
                                            <span class="flex items-center gap-1">
                                                <Calendar class="h-3 w-3" />
                                                {{ formatDate(importItem.created_at) }}
                                            </span>
                                        </div>
                                        <!-- Error Message -->
                                        <div v-if="importItem.status === 'failed' && importItem.error" class="mt-2">
                                            <Alert variant="destructive" class="border-2 py-2">
                                                <AlertDescription class="text-xs">
                                                    {{ importItem.error }}
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                        <!-- Wipe Indicators -->
                                        <div
                                            v-if="importItem.wipe || importItem.wipe_all_files"
                                            class="mt-2 flex flex-wrap gap-2"
                                        >
                                            <Badge v-if="importItem.wipe" variant="outline" class="text-xs">
                                                {{ t('serverImport.wipe') }}
                                            </Badge>
                                            <Badge
                                                v-if="importItem.wipe_all_files"
                                                variant="destructive"
                                                class="text-xs"
                                            >
                                                {{ t('serverImport.wipeAllFiles') }}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <!-- Import Drawer -->
            <Drawer
                :open="drawerOpen"
                @update:open="
                    (val) => {
                        if (!val) closeDrawer();
                    }
                "
            >
                <DrawerContent class="max-h-[96vh] flex flex-col">
                    <DrawerHeader class="border-b">
                        <DrawerTitle>{{ t('serverImport.createImport') }}</DrawerTitle>
                        <DrawerDescription>
                            {{ t('serverImport.drawerDescription') }}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div class="flex-1 overflow-y-auto p-6">
                        <form id="import-form" class="space-y-6" @submit.prevent="startImport">
                            <!-- Connection Type -->
                            <div class="space-y-2">
                                <Label for="type">{{ t('serverImport.type') }}</Label>
                                <Select v-model="form.type" :disabled="saving">
                                    <SelectTrigger id="type">
                                        <SelectValue :placeholder="t('serverImport.type')" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sftp">SFTP (Secure, Recommended)</SelectItem>
                                        <SelectItem value="ftp">FTP (Unencrypted)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p class="text-xs text-muted-foreground">{{ t('serverImport.typeHelp') }}</p>
                                <span v-if="errors.type" class="text-xs text-destructive">{{ errors.type }}</span>
                            </div>

                            <!-- Host -->
                            <div class="space-y-2">
                                <Label for="host">{{ t('serverImport.host') }} *</Label>
                                <Input
                                    id="host"
                                    v-model="form.host"
                                    :placeholder="t('serverImport.hostPlaceholder')"
                                    :disabled="saving"
                                />
                                <p class="text-xs text-muted-foreground">{{ t('serverImport.hostHelp') }}</p>
                                <span v-if="errors.host" class="text-xs text-destructive">{{ errors.host }}</span>
                            </div>

                            <!-- Port -->
                            <div class="space-y-2">
                                <Label for="port">{{ t('serverImport.port') }} *</Label>
                                <Input
                                    id="port"
                                    v-model="form.port"
                                    type="number"
                                    min="1"
                                    max="65535"
                                    :placeholder="t('serverImport.portPlaceholder')"
                                    :disabled="saving"
                                />
                                <p class="text-xs text-muted-foreground">{{ t('serverImport.portHelp') }}</p>
                                <span v-if="errors.port" class="text-xs text-destructive">{{ errors.port }}</span>
                            </div>

                            <!-- Username -->
                            <div class="space-y-2">
                                <Label for="user">{{ t('serverImport.user') }} *</Label>
                                <Input
                                    id="user"
                                    v-model="form.user"
                                    :placeholder="t('serverImport.userPlaceholder')"
                                    :disabled="saving"
                                />
                                <p class="text-xs text-muted-foreground">{{ t('serverImport.userHelp') }}</p>
                                <span v-if="errors.user" class="text-xs text-destructive">{{ errors.user }}</span>
                            </div>

                            <!-- Password -->
                            <div class="space-y-2">
                                <Label for="password">{{ t('serverImport.password') }} *</Label>
                                <Input
                                    id="password"
                                    v-model="form.password"
                                    type="password"
                                    :placeholder="t('serverImport.passwordPlaceholder')"
                                    :disabled="saving"
                                />
                                <p class="text-xs text-muted-foreground">{{ t('serverImport.passwordHelp') }}</p>
                                <span v-if="errors.password" class="text-xs text-destructive">{{
                                    errors.password
                                }}</span>
                            </div>

                            <!-- Source Location -->
                            <div class="space-y-2">
                                <Label for="sourceLocation">{{ t('serverImport.sourceLocation') }} *</Label>
                                <Input
                                    id="sourceLocation"
                                    v-model="form.sourceLocation"
                                    :placeholder="t('serverImport.sourceLocationPlaceholder')"
                                    :disabled="saving"
                                />
                                <p class="text-xs text-muted-foreground">{{ t('serverImport.sourceLocationHelp') }}</p>
                                <span v-if="errors.sourceLocation" class="text-xs text-destructive">{{
                                    errors.sourceLocation
                                }}</span>
                            </div>

                            <!-- Destination Location -->
                            <div class="space-y-2">
                                <Label for="destinationLocation">{{ t('serverImport.destinationLocation') }} *</Label>
                                <Input
                                    id="destinationLocation"
                                    v-model="form.destinationLocation"
                                    :placeholder="t('serverImport.destinationLocationPlaceholder')"
                                    :disabled="saving"
                                />
                                <p class="text-xs text-muted-foreground">
                                    {{ t('serverImport.destinationLocationHelp') }}
                                </p>
                                <span v-if="errors.destinationLocation" class="text-xs text-destructive">{{
                                    errors.destinationLocation
                                }}</span>
                            </div>

                            <!-- Wipe Destination Option -->
                            <div class="flex items-start gap-3 p-4 rounded-lg border-2">
                                <input
                                    id="wipe"
                                    v-model="form.wipe"
                                    type="checkbox"
                                    class="proxy-checkbox"
                                    :disabled="saving"
                                />
                                <div class="flex-1 space-y-1">
                                    <Label for="wipe" class="cursor-pointer font-medium">
                                        {{ t('serverImport.wipe') }}
                                    </Label>
                                    <p class="text-xs text-muted-foreground">{{ t('serverImport.wipeHelp') }}</p>
                                </div>
                            </div>

                            <!-- Wipe All Files Option -->
                            <div
                                class="flex items-start gap-3 p-4 rounded-lg border-2 border-destructive/50 bg-destructive/5"
                            >
                                <input
                                    id="wipeAllFiles"
                                    v-model="form.wipeAllFiles"
                                    type="checkbox"
                                    class="proxy-checkbox"
                                    :disabled="saving"
                                />
                                <div class="flex-1 space-y-1">
                                    <Label for="wipeAllFiles" class="cursor-pointer font-medium text-destructive">
                                        {{ t('serverImport.wipeAllFiles') }}
                                    </Label>
                                    <p class="text-xs text-muted-foreground">
                                        {{ t('serverImport.wipeAllFilesHelp') }}
                                    </p>
                                    <Alert v-if="form.wipeAllFiles" variant="destructive" class="mt-2 border-2">
                                        <AlertTitle class="text-xs font-semibold">{{
                                            t('serverImport.wipeAllFilesWarning')
                                        }}</AlertTitle>
                                    </Alert>
                                </div>
                            </div>

                            <!-- Error Message -->
                            <Alert v-if="formError" variant="destructive" class="border-2">
                                <AlertTitle>{{ t('serverImport.importFailed') }}</AlertTitle>
                                <AlertDescription>{{ formError }}</AlertDescription>
                            </Alert>
                        </form>
                    </div>
                    <DrawerFooter>
                        <Button variant="outline" :disabled="saving" @click="closeDrawer">
                            {{ t('common.cancel') }}
                        </Button>
                        <Button type="button" :disabled="saving" @click="handleStartImport">
                            <span v-if="saving">{{ t('common.saving') }}</span>
                            <span v-else>{{ t('serverImport.createImport') }}</span>
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            <!-- Success Dialog -->
            <Dialog :open="showSuccessDialog" @update:open="showSuccessDialog = false">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{{ t('serverImport.importStarted') }}</DialogTitle>
                        <DialogDescription>
                            {{ t('serverImport.importStartedDescription') }}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button @click="showSuccessDialog = false">{{ t('common.close') }}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import type { BreadcrumbEntry } from '@/layouts/DashboardLayout.vue';
import { useToast } from 'vue-toastification';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useServerContext } from '@/composables/useServerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BadgeVariants } from '@/components/ui/badge';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Info, Upload, RefreshCw, Server, User, FolderUp, FolderDown, Calendar } from 'lucide-vue-next';
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { currentServer } = useServerContext();

const serverUuid = computed(() => route.params.uuidShort as string);
const serverStatus = computed(() => (currentServer.value?.status as string) || 'unknown');

// Check if import management is enabled
const importEnabled = computed(() => settingsStore.serverAllowUserMadeImport);

const breadcrumbs = computed<BreadcrumbEntry[]>(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: currentServer.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverImport.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/import` },
]);

function getAxiosErrorMessage(err: unknown, fallback: string): string {
    return axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : fallback;
}

const drawerOpen = ref<boolean>(false);
const saving = ref<boolean>(false);
const formError = ref<string | null>(null);
const showSuccessDialog = ref<boolean>(false);
const loading = ref<boolean>(true);
const imports = ref<ImportItem[]>([]);

const form = reactive<{
    type: 'sftp' | 'ftp';
    host: string;
    port: string;
    user: string;
    password: string;
    sourceLocation: string;
    destinationLocation: string;
    wipe: boolean;
    wipeAllFiles: boolean;
}>({
    type: 'sftp',
    host: '',
    port: '2022',
    user: '',
    password: '',
    sourceLocation: '/',
    destinationLocation: '/',
    wipe: false,
    wipeAllFiles: false,
});

const errors = reactive<{
    type: string;
    host: string;
    port: string;
    user: string;
    password: string;
    sourceLocation: string;
    destinationLocation: string;
}>({
    type: '',
    host: '',
    port: '',
    user: '',
    password: '',
    sourceLocation: '',
    destinationLocation: '',
});

const canManageImport = computed<boolean>(() => {
    return sessionStore.hasPermission('import.manage');
});

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-import');
const widgetsTopOfPage = computed(() => getWidgets('server-import', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-import', 'after-header'));
const widgetsBottomOfPage = computed(() => getWidgets('server-import', 'bottom-of-page'));

function resetForm(): void {
    form.type = 'sftp';
    form.host = '';
    form.port = '2022';
    form.user = '';
    form.password = '';
    form.sourceLocation = '/';
    form.destinationLocation = '/';
    form.wipe = false;
    form.wipeAllFiles = false;
    formError.value = null;
    errors.type = '';
    errors.host = '';
    errors.port = '';
    errors.user = '';
    errors.password = '';
    errors.sourceLocation = '';
    errors.destinationLocation = '';
}

function validateForm(): boolean {
    let valid = true;
    errors.type = '';
    errors.host = '';
    errors.port = '';
    errors.user = '';
    errors.password = '';
    errors.sourceLocation = '';
    errors.destinationLocation = '';
    formError.value = null;

    // Validate type
    if (!form.type || (form.type !== 'sftp' && form.type !== 'ftp')) {
        errors.type = t('serverImport.validation.typeInvalid');
        valid = false;
    }

    // Validate host
    const hostTrimmed = form.host?.trim() || '';
    if (!hostTrimmed) {
        errors.host = t('serverImport.validation.hostRequired');
        valid = false;
    } else {
        // Basic hostname/IP validation
        const isValidHost =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
                hostTrimmed,
            ) ||
            /^(\d{1,3}\.){3}\d{1,3}$/.test(hostTrimmed) ||
            /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(hostTrimmed);
        if (!isValidHost) {
            errors.host = t('serverImport.validation.hostInvalid');
            valid = false;
        }
    }

    // Validate port
    const portValue = form.port;
    if (portValue === null || portValue === undefined || portValue === '') {
        errors.port = t('serverImport.validation.portRequired');
        valid = false;
    } else {
        const portNum = typeof portValue === 'string' ? parseInt(portValue.trim(), 10) : Number(portValue);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            errors.port = t('serverImport.validation.portInvalid');
            valid = false;
        }
    }

    // Validate user
    const userTrimmed = form.user?.trim() || '';
    if (!userTrimmed) {
        errors.user = t('serverImport.validation.userRequired');
        valid = false;
    }

    // Validate password
    const passwordTrimmed = form.password?.trim() || '';
    if (!passwordTrimmed) {
        errors.password = t('serverImport.validation.passwordRequired');
        valid = false;
    }

    // Validate source location
    const sourceLocationTrimmed = form.sourceLocation?.trim() || '';
    if (!sourceLocationTrimmed) {
        errors.sourceLocation = t('serverImport.validation.sourceLocationRequired');
        valid = false;
    }
    // Validate destination location
    const destinationLocationTrimmed = form.destinationLocation?.trim() || '';
    if (!destinationLocationTrimmed) {
        errors.destinationLocation = t('serverImport.validation.destinationLocationRequired');
        valid = false;
    }

    return valid;
}

function getErrorMessage(err: unknown): string {
    return getAxiosErrorMessage(err, t('serverImport.unknownError'));
}

async function stopServerIfNeeded(): Promise<boolean> {
    // Check if server needs to be stopped
    if (serverStatus.value === 'offline' || serverStatus.value === 'stopped') {
        return true;
    }

    try {
        // Just kill the server immediately - no polling, no waiting
        toast.info(t('serverConsole.serverKilling'));
        await axios.post(`/api/user/servers/${serverUuid.value}/power/kill`);

        // Small delay to ensure kill command is processed
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return true;
    } catch (error) {
        console.error('Failed to kill server:', error);
        toast.error(getAxiosErrorMessage(error, t('serverConsole.failedToStopServer')));
        return false;
    }
}

async function startImport(): Promise<void> {
    console.log('startImport called', {
        serverUuid: serverUuid.value,
        importEnabled: importEnabled.value,
        form: { ...form },
    });

    if (!serverUuid.value) {
        console.error('No server UUID');
        toast.error('Server UUID is missing');
        return;
    }

    if (!importEnabled.value) {
        console.error('Import not enabled');
        toast.error(t('serverImport.featureDisabled'));
        return;
    }

    const isValid = validateForm();
    console.log('Form validation result:', isValid, errors);
    if (!isValid) {
        console.error('Form validation failed', errors);
        toast.error('Please fix the form errors before submitting');
        return;
    }

    console.log('Starting import process...');

    saving.value = true;
    try {
        // Kill server if it's running (no polling, just kill it)
        const serverKilled = await stopServerIfNeeded();
        if (!serverKilled) {
            formError.value = t('serverConsole.failedToStopServer');
            toast.error(formError.value);
            saving.value = false;
            return;
        }

        // Wipe all files if option is enabled
        if (form.wipeAllFiles) {
            toast.info(t('serverImport.wipingAllFiles'));
            try {
                const wipeResponse = await axios.post(`/api/user/servers/${serverUuid.value}/wipe-all-files`);
                if (wipeResponse.data.success) {
                    toast.success(
                        t('serverImport.wipeAllFilesSuccess', {
                            count: wipeResponse.data.data?.deleted_count || 0,
                        }),
                    );
                } else {
                    toast.warning(t('serverImport.wipeAllFilesWarningPartial'));
                    // Continue with import even if wipe failed
                }
            } catch (error: unknown) {
                console.error('Failed to wipe all files:', error);
                toast.warning(t('serverImport.wipeAllFilesWarningPartial'));
                // Continue with import even if wipe failed
            }
        }

        const portValue = typeof form.port === 'string' ? parseInt(form.port.trim(), 10) : Number(form.port);

        const { data } = await axios.post(`/api/user/servers/${serverUuid.value}/import`, {
            user: form.user.trim(),
            password: form.password.trim(),
            hote: form.host.trim(),
            port: portValue,
            srclocation: form.sourceLocation.trim(),
            dstlocation: form.destinationLocation.trim(),
            wipe: form.wipe,
            type: form.type,
        });

        if (data.success) {
            toast.success(t('serverImport.importStarted'));
            showSuccessDialog.value = true;
            closeDrawer();
            // Refresh imports list
            await fetchImports();
        } else {
            formError.value = data.message || t('serverImport.importFailed');
            toast.error(formError.value);
        }
    } catch (error) {
        console.error('Failed to start import:', error);
        formError.value = getErrorMessage(error);
        toast.error(formError.value);
    } finally {
        saving.value = false;
    }
}

function openImportDrawer(): void {
    resetForm();
    // Set default port based on type
    form.port = form.type === 'sftp' ? '22' : '21';
    drawerOpen.value = true;
}

function closeDrawer(): void {
    drawerOpen.value = false;
}

function handleStartImport(): void {
    console.log('handleStartImport called');
    void startImport();
}

interface ImportItem {
    id: number;
    server_id: number;
    user: string;
    host: string;
    port: number;
    source_location: string;
    destination_location: string;
    type: 'sftp' | 'ftp';
    wipe: boolean;
    wipe_all_files: boolean;
    status: 'pending' | 'importing' | 'completed' | 'failed';
    error: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

async function fetchImports(): Promise<void> {
    try {
        loading.value = true;
        const { data } = await axios.get(`/api/user/servers/${serverUuid.value}/imports`);

        if (data.success && data.data.imports) {
            imports.value = data.data.imports;
        } else {
            toast.error(data.message || t('serverImport.failedToFetch'));
        }
    } catch (error: unknown) {
        console.error('Error fetching imports:', error);
        toast.error(getAxiosErrorMessage(error, t('serverImport.failedToFetch')));
    } finally {
        loading.value = false;
    }
}

function refreshImports(): void {
    void fetchImports();
}

function formatDate(value?: string | null): string {
    if (!value) return '';
    return new Date(value).toLocaleString();
}

function getStatusVariant(status: string): BadgeVariants['variant'] {
    switch (status) {
        case 'completed':
            return 'default';
        case 'failed':
            return 'destructive';
        case 'importing':
            return 'secondary';
        case 'pending':
            return 'outline';
        default:
            return 'outline';
    }
}

function getStatusText(status: string): string {
    switch (status) {
        case 'completed':
            return t('serverImport.statusCompleted');
        case 'failed':
            return t('serverImport.statusFailed');
        case 'importing':
            return t('serverImport.statusImporting');
        case 'pending':
            return t('serverImport.statusPending');
        default:
            return status;
    }
}

function getStatusIconClass(status: string): string {
    switch (status) {
        case 'completed':
            return 'bg-green-500/10';
        case 'failed':
            return 'bg-red-500/10';
        case 'importing':
            return 'bg-blue-500/10';
        case 'pending':
            return 'bg-yellow-500/10';
        default:
            return 'bg-gray-500/10';
    }
}

function getStatusIconColor(status: string): string {
    switch (status) {
        case 'completed':
            return 'text-green-500';
        case 'failed':
            return 'text-red-500';
        case 'importing':
            return 'text-blue-500';
        case 'pending':
            return 'text-yellow-500';
        default:
            return 'text-gray-500';
    }
}

onMounted(async () => {
    // Fetch plugin widgets
    await fetchPluginWidgets();

    // Fetch settings to check if import is enabled
    // Settings are fetched once in App.vue - no need to fetch here

    // Fetch imports list
    if (importEnabled.value) {
        await fetchImports();
    }
});
</script>

<style scoped>
.proxy-checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.4rem;
    border: 2px solid hsl(var(--border));
    background-color: hsl(var(--background));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.1s ease;
}

.proxy-checkbox:checked {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
}

.proxy-checkbox:checked::after {
    content: '✓';
    color: hsl(var(--primary-foreground));
    font-size: 0.875rem;
    font-weight: bold;
}

.proxy-checkbox:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.proxy-checkbox:hover:not(:disabled) {
    border-color: hsl(var(--primary));
}
</style>
