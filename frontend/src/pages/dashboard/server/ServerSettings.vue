<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Header -->
            <div class="space-y-4">
                <div>
                    <h1 class="text-xl sm:text-2xl font-bold tracking-tight">{{ t('serverSettings.title') }}</h1>
                    <p class="text-sm sm:text-base text-muted-foreground">{{ t('serverSettings.description') }}</p>
                </div>
                <div class="flex gap-2">
                    <Button variant="outline" :disabled="loading" class="flex-1 sm:flex-none" @click="refreshServer">
                        <RefreshCw class="h-4 w-4 sm:mr-2" />
                        <span class="hidden sm:inline">{{ t('serverSettings.refresh') }}</span>
                    </Button>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-8">
                <div class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                <span class="ml-2">{{ t('serverSettings.loading') }}</span>
            </div>

            <!-- Content -->
            <div v-else-if="server" class="space-y-6">
                <!-- Server Information -->
                <Card>
                    <CardHeader class="pb-3 sm:pb-6">
                        <CardTitle class="flex items-center gap-2 text-base sm:text-lg">
                            <Server class="h-4 w-4 sm:h-5 sm:w-5" />
                            {{ t('serverSettings.serverInformation') }}
                        </CardTitle>
                        <CardDescription class="text-xs sm:text-sm">
                            {{ t('serverSettings.serverInformationDescription') }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="grid grid-cols-1 gap-4">
                            <div class="space-y-2">
                                <Label for="serverName" class="text-sm">{{ t('serverSettings.serverName') }}</Label>
                                <Input
                                    id="serverName"
                                    v-model="editForm.name"
                                    :placeholder="t('serverSettings.serverNamePlaceholder')"
                                    :disabled="saving"
                                    class="text-sm"
                                />
                            </div>
                            <div class="space-y-2">
                                <Label for="serverDescription" class="text-sm">{{
                                    t('serverSettings.serverDescription')
                                }}</Label>
                                <Input
                                    id="serverDescription"
                                    v-model="editForm.description"
                                    :placeholder="t('serverSettings.serverDescriptionPlaceholder')"
                                    :disabled="saving"
                                    class="text-sm"
                                />
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row gap-2">
                            <Button
                                :disabled="saving || !hasChanges"
                                class="flex-1 sm:flex-none"
                                @click="saveServerInfo"
                            >
                                <Save class="h-4 w-4 sm:mr-2" />
                                <span class="hidden sm:inline">{{
                                    saving ? t('serverSettings.saving') : t('serverSettings.saveChanges')
                                }}</span>
                            </Button>
                            <Button
                                variant="outline"
                                :disabled="saving || !hasChanges"
                                class="flex-1 sm:flex-none"
                                @click="resetForm"
                            >
                                <RotateCcw class="h-4 w-4 sm:mr-2" />
                                <span class="hidden sm:inline">{{ t('serverSettings.reset') }}</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <!-- SFTP Details -->
                <Card>
                    <CardHeader class="pb-3 sm:pb-6">
                        <CardTitle class="flex items-center gap-2 text-base sm:text-lg">
                            <FolderOpen class="h-4 w-4 sm:h-5 sm:w-5" />
                            {{ t('serverSettings.sftpDetails') }}
                        </CardTitle>
                        <CardDescription class="text-xs sm:text-sm">
                            {{ t('serverSettings.sftpDetailsDescription') }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4 sm:space-y-6">
                        <!-- SFTP Connection Info -->
                        <div class="space-y-4">
                            <!-- Host & Port -->
                            <div class="space-y-3">
                                <Label class="text-xs sm:text-sm font-medium text-muted-foreground">{{
                                    t('serverSettings.sftpHost')
                                }}</Label>
                                <div class="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg border">
                                    <code class="text-xs sm:text-sm font-mono break-all min-w-0 flex-1 mr-2">{{
                                        server?.sftp?.host || 'N/A'
                                    }}</code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0 flex-shrink-0"
                                        @click="copyToClipboard(server?.sftp?.host || '')"
                                    >
                                        <Copy class="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div class="space-y-3">
                                <Label class="text-xs sm:text-sm font-medium text-muted-foreground">{{
                                    t('serverSettings.sftpPort')
                                }}</Label>
                                <div class="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg border">
                                    <code class="text-xs sm:text-sm font-mono">{{ server?.sftp?.port || 'N/A' }}</code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0 flex-shrink-0"
                                        @click="copyToClipboard(server?.sftp?.port?.toString() || '')"
                                    >
                                        <Copy class="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                </div>
                            </div>

                            <!-- Credentials -->
                            <div class="space-y-3">
                                <Label class="text-xs sm:text-sm font-medium text-muted-foreground">{{
                                    t('serverSettings.sftpUsername')
                                }}</Label>
                                <div class="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg border">
                                    <code class="text-xs sm:text-sm font-mono break-all min-w-0 flex-1 mr-2">{{
                                        server?.sftp?.username || 'N/A'
                                    }}</code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0 flex-shrink-0"
                                        @click="copyToClipboard(server?.sftp?.username || '')"
                                    >
                                        <Copy class="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div class="space-y-3">
                                <Label class="text-xs sm:text-sm font-medium text-muted-foreground">{{
                                    t('serverSettings.sftpPassword')
                                }}</Label>
                                <div class="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg border">
                                    <div class="flex items-center gap-2 min-w-0 flex-1 mr-2">
                                        <code class="text-xs sm:text-sm font-mono break-all">
                                            {{
                                                showPassword
                                                    ? t('serverSettings.sftpPasswordPlaceholder')
                                                    : '••••••••••••••••••••••••••••••••'
                                            }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-6 w-6 p-0 flex-shrink-0"
                                            @click="showPassword = !showPassword"
                                        >
                                            <Eye v-if="!showPassword" class="h-3 w-3" />
                                            <EyeOff v-else class="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0 flex-shrink-0"
                                        @click="copyToClipboard('Use your panel login password')"
                                    >
                                        <Copy class="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                </div>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('serverSettings.sftpPasswordHint') }}
                                </p>
                            </div>
                        </div>

                        <!-- Full SFTP URL -->
                        <div class="space-y-3">
                            <Label class="text-xs sm:text-sm font-medium text-muted-foreground">{{
                                t('serverSettings.sftpUrl')
                            }}</Label>
                            <div class="flex items-center justify-between p-2 sm:p-3 bg-muted/30 rounded-lg border">
                                <code class="text-xs sm:text-sm font-mono break-all min-w-0 flex-1 mr-2">{{
                                    server?.sftp?.url || 'N/A'
                                }}</code>
                                <div class="flex gap-1 sm:gap-2 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-8 w-8 p-0"
                                        @click="copyToClipboard(server?.sftp?.url || '')"
                                    >
                                        <Copy class="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="openInSftpClient">
                                        <ExternalLink class="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <!-- Info Box -->
                        <div class="mt-4 p-3 sm:p-4 bg-muted/50 border rounded-lg">
                            <div class="flex items-start gap-2 sm:gap-3">
                                <Info class="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-medium mb-2 text-sm sm:text-base">
                                        {{ t('serverSettings.sftpInfoTitle') }}
                                    </h4>
                                    <p class="text-xs sm:text-sm text-muted-foreground mb-3">
                                        {{ t('serverSettings.sftpInfoDescription') }}
                                    </p>
                                    <div class="text-xs text-muted-foreground">
                                        <p class="font-medium mb-1">{{ t('serverSettings.recommendedClients') }}</p>
                                        <ul class="list-disc list-inside space-y-1">
                                            <li>{{ t('serverSettings.sftpClientFileZilla') }}</li>
                                            <li>{{ t('serverSettings.sftpClientWinSCP') }}</li>
                                            <li>{{ t('serverSettings.sftpClientCyberduck') }}</li>
                                            <li>{{ t('serverSettings.sftpClientNautilus') }}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Server Actions -->
                <Card>
                    <CardHeader class="pb-3 sm:pb-6">
                        <CardTitle class="flex items-center gap-2 text-base sm:text-lg">
                            <Settings class="h-4 w-4 sm:h-5 sm:w-5" />
                            {{ t('serverSettings.serverActions') }}
                        </CardTitle>
                        <CardDescription class="text-xs sm:text-sm">
                            {{ t('serverSettings.serverActionsDescription') }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <!-- Server Reinstall -->
                        <div
                            class="p-3 sm:p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20"
                        >
                            <div class="flex items-start gap-2 sm:gap-3">
                                <AlertTriangle
                                    class="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0"
                                />
                                <div class="flex-1 min-w-0">
                                    <h4
                                        class="font-medium text-orange-800 dark:text-orange-200 mb-2 text-sm sm:text-base"
                                    >
                                        {{ t('serverSettings.reinstallServer') }}
                                    </h4>
                                    <p class="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mb-3">
                                        {{ t('serverSettings.reinstallWarning') }}
                                    </p>
                                    <div class="flex gap-2">
                                        <Button
                                            variant="destructive"
                                            :disabled="reinstalling"
                                            class="flex-1 sm:flex-none"
                                            @click="showReinstallDialog = true"
                                        >
                                            <RotateCcw class="h-4 w-4 sm:mr-2" />
                                            <span class="hidden sm:inline">{{
                                                t('serverSettings.reinstallServer')
                                            }}</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-8">
                <div class="text-red-600 dark:text-red-400 mb-2">
                    <AlertCircle class="h-8 w-8 mx-auto" />
                </div>
                <h3 class="text-lg font-medium mb-2">{{ t('serverSettings.errorTitle') }}</h3>
                <p class="text-muted-foreground mb-4">{{ error }}</p>
                <Button @click="fetchServer">
                    <RefreshCw class="h-4 w-4 mr-2" />
                    {{ t('serverSettings.tryAgain') }}
                </Button>
            </div>

            <!-- Reinstall Confirmation Dialog -->
            <Dialog v-model:open="showReinstallDialog">
                <DialogContent class="mx-4 sm:mx-0">
                    <DialogHeader>
                        <DialogTitle class="flex items-center gap-2 text-base sm:text-lg">
                            <AlertTriangle class="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                            {{ t('serverSettings.confirmReinstall') }}
                        </DialogTitle>
                        <DialogDescription class="text-xs sm:text-sm">
                            {{ t('serverSettings.reinstallConfirmation') }}
                        </DialogDescription>
                    </DialogHeader>
                    <div class="space-y-4">
                        <div class="p-3 sm:p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                            <div class="flex items-start gap-2">
                                <AlertTriangle class="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                <div class="text-xs sm:text-sm min-w-0">
                                    <p class="font-medium text-destructive mb-1">
                                        {{ t('serverSettings.reinstallWarningTitle') }}
                                    </p>
                                    <ul class="list-disc list-inside space-y-1 text-muted-foreground">
                                        <li>{{ t('serverSettings.reinstallWarning1') }}</li>
                                        <li>{{ t('serverSettings.reinstallWarning2') }}</li>
                                        <li>{{ t('serverSettings.reinstallWarning3') }}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <Label for="confirmText" class="text-sm">{{ t('serverSettings.confirmText') }}</Label>
                            <Input
                                id="confirmText"
                                v-model="confirmReinstallText"
                                :placeholder="t('serverSettings.confirmTextPlaceholder')"
                                class="text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter class="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            :disabled="reinstalling"
                            class="w-full sm:w-auto"
                            @click="showReinstallDialog = false"
                        >
                            {{ t('serverSettings.cancel') }}
                        </Button>
                        <Button
                            variant="destructive"
                            :disabled="reinstalling || confirmReinstallText !== 'REINSTALL'"
                            class="w-full sm:w-auto"
                            @click="confirmReinstall"
                        >
                            <RotateCcw class="h-4 w-4 sm:mr-2" />
                            <span class="hidden sm:inline">{{
                                reinstalling ? t('serverSettings.reinstalling') : t('serverSettings.reinstallServer')
                            }}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
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

import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Server,
    FolderOpen,
    Settings,
    Save,
    RotateCcw,
    Copy,
    RefreshCw,
    AlertTriangle,
    AlertCircle,
    Info,
    ExternalLink,
    Eye,
    EyeOff,
} from 'lucide-vue-next';

// Types
interface ServerData {
    id: string;
    uuid: string;
    uuidShort: string;
    name: string;
    description?: string;
    status: string;
    node: {
        id: string;
        name: string;
        fqdn: string;
        port: number;
    };
    allocation: {
        id: string;
        ip: string;
        port: number;
    };
    sftp: {
        host: string;
        port: number;
        username: string;
        password: string;
        url: string;
    };
}

interface EditForm {
    name: string;
    description: string;
}

// Composables
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();

// State
const loading = ref(false);
const saving = ref(false);
const reinstalling = ref(false);
const error = ref<string | null>(null);
const server = ref<ServerData | null>(null);
const showReinstallDialog = ref(false);
const confirmReinstallText = ref('');
const showPassword = ref(false);

// Form
const editForm = ref<EditForm>({
    name: '',
    description: '',
});

// Computed
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('common.settings'), isCurrent: true, href: `/server/${route.params.uuidShort}/settings` },
]);

const hasChanges = computed(() => {
    if (!server.value) return false;
    return editForm.value.name !== server.value.name || editForm.value.description !== (server.value.description || '');
});

// Methods
async function fetchServer(): Promise<void> {
    try {
        loading.value = true;
        error.value = null;

        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);

        if (response.data.success) {
            server.value = response.data.data;
            resetForm();
        } else {
            error.value = response.data.message || t('serverSettings.failedToFetchServer');
        }
    } catch (err) {
        console.error('Error fetching server:', err);
        error.value = t('serverSettings.failedToFetchServer');
    } finally {
        loading.value = false;
    }
}

async function saveServerInfo(): Promise<void> {
    try {
        saving.value = true;

        const response = await axios.put(`/api/user/servers/${route.params.uuidShort}`, {
            name: editForm.value.name,
            description: editForm.value.description,
        });

        if (response.data.success) {
            toast.success(t('serverSettings.serverInfoUpdated'));
            await fetchServer(); // Refresh server data
        } else {
            toast.error(response.data.message || t('serverSettings.failedToUpdateServer'));
        }
    } catch (err) {
        console.error('Error updating server:', err);
        toast.error(t('serverSettings.failedToUpdateServer'));
    } finally {
        saving.value = false;
    }
}

function resetForm(): void {
    if (server.value) {
        editForm.value = {
            name: server.value.name,
            description: server.value.description || '',
        };
    }
}

async function refreshServer(): Promise<void> {
    await fetchServer();
    toast.success(t('serverSettings.serverRefreshed'));
}

function copyToClipboard(text: string): void {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            toast.success(t('serverSettings.copiedToClipboard'));
        })
        .catch(() => {
            toast.error(t('serverSettings.failedToCopy'));
        });
}

function openInSftpClient(): void {
    if (server.value?.sftp?.url) {
        window.open(server.value.sftp.url, '_blank');
    } else {
        toast.error(t('serverSettings.sftpUrlNotAvailable'));
    }
}

async function confirmReinstall(): Promise<void> {
    try {
        reinstalling.value = true;

        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/reinstall`);

        if (response.data.success) {
            toast.success(t('serverSettings.reinstallStarted'));
            showReinstallDialog.value = false;
            confirmReinstallText.value = '';
            await fetchServer(); // Refresh server data
        } else {
            toast.error(response.data.message || t('serverSettings.failedToReinstall'));
        }
    } catch (err) {
        console.error('Error reinstalling server:', err);
        toast.error(t('serverSettings.failedToReinstall'));
    } finally {
        reinstalling.value = false;
    }
}

// Lifecycle
onMounted(async () => {
    await sessionStore.checkSessionOrRedirect(router);
    await settingsStore.fetchSettings();
    await fetchServer();
});
</script>
