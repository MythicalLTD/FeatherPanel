<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Plugin Widgets: Top of Page -->
            <WidgetRenderer v-if="widgetsTopOfPage.length > 0" :widgets="widgetsTopOfPage" />

            <!-- Header Section -->
            <div class="flex flex-col gap-4">
                <div class="space-y-1">
                    <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverSettings.title') }}</h1>
                    <p class="text-sm text-muted-foreground">{{ t('serverSettings.description') }}</p>
                </div>

                <!-- Status Indicator -->
                <div v-if="hasChanges && !loading" class="flex items-center gap-2 text-sm">
                    <div class="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span class="text-muted-foreground">{{ t('common.unsavedChanges') }}</span>
                </div>
            </div>

            <!-- Plugin Widgets: After Header -->
            <WidgetRenderer v-if="widgetsAfterHeader.length > 0" :widgets="widgetsAfterHeader" />

            <!-- Loading State -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('serverSettings.loading') }}</span>
            </div>

            <!-- Content -->
            <div v-else-if="server" class="space-y-6">
                <!-- Server Information -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Server class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverSettings.serverInformation') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverSettings.serverInformationDescription') }}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div class="grid grid-cols-1 gap-4">
                            <div class="space-y-2">
                                <Label for="serverName" class="text-sm font-medium">{{
                                    t('serverSettings.serverName')
                                }}</Label>
                                <Input
                                    id="serverName"
                                    v-model="editForm.name"
                                    :placeholder="t('serverSettings.serverNamePlaceholder')"
                                    :disabled="saving || !canRenameServer"
                                    class="text-sm"
                                />
                            </div>
                            <div class="space-y-2">
                                <Label for="serverDescription" class="text-sm font-medium">{{
                                    t('serverSettings.serverDescription')
                                }}</Label>
                                <Input
                                    id="serverDescription"
                                    v-model="editForm.description"
                                    :placeholder="t('serverSettings.serverDescriptionPlaceholder')"
                                    :disabled="saving || !canRenameServer"
                                    class="text-sm"
                                />
                            </div>
                        </div>
                        <div v-if="canRenameServer" class="flex gap-2 pt-2">
                            <Button
                                size="sm"
                                :disabled="saving || !hasChanges"
                                class="flex items-center gap-2"
                                data-umami-event="Save server settings"
                                @click="saveServerInfo"
                            >
                                <Save :class="['h-4 w-4', saving && 'animate-pulse']" />
                                <span>{{ saving ? t('serverSettings.saving') : t('serverSettings.saveChanges') }}</span>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                :disabled="saving || !hasChanges"
                                class="flex items-center gap-2"
                                @click="resetForm"
                            >
                                <RotateCcw class="h-4 w-4" />
                                <span>{{ t('serverSettings.reset') }}</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Server Information -->
                <WidgetRenderer
                    v-if="!loading && server && widgetsAfterServerInfo.length > 0"
                    :widgets="widgetsAfterServerInfo"
                />

                <!-- SFTP Details -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <FolderOpen class="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverSettings.sftpDetails') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverSettings.sftpDetailsDescription') }}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-5">
                        <!-- SFTP Connection Info Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Host -->
                            <div class="space-y-2">
                                <Label class="text-sm font-medium flex items-center gap-2">
                                    <Server class="h-3.5 w-3.5 text-muted-foreground" />
                                    {{ t('serverSettings.sftpHost') }}
                                </Label>
                                <div
                                    class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <code class="text-sm font-mono flex-1 truncate">{{
                                        server?.sftp?.host ? `sftp://${server.sftp.host}` : t('common.nA')
                                    }}</code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-7 w-7 p-0 hover:bg-background"
                                        @click="copyToClipboard(server?.sftp?.host ? `sftp://${server.sftp.host}` : '')"
                                    >
                                        <Copy class="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <!-- Port -->
                            <div class="space-y-2">
                                <Label class="text-sm font-medium flex items-center gap-2">
                                    <Hash class="h-3.5 w-3.5 text-muted-foreground" />
                                    {{ t('serverSettings.sftpPort') }}
                                </Label>
                                <div
                                    class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <code class="text-sm font-mono flex-1">{{
                                        server?.sftp?.port || t('common.nA')
                                    }}</code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-7 w-7 p-0 hover:bg-background"
                                        @click="copyToClipboard(server?.sftp?.port?.toString() || '')"
                                    >
                                        <Copy class="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <!-- Username -->
                            <div class="space-y-2">
                                <Label class="text-sm font-medium flex items-center gap-2">
                                    <User class="h-3.5 w-3.5 text-muted-foreground" />
                                    {{ t('serverSettings.sftpUsername') }}
                                </Label>
                                <div
                                    class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                    <code class="text-sm font-mono flex-1 truncate">{{
                                        server?.sftp?.username || t('common.nA')
                                    }}</code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-7 w-7 p-0 hover:bg-background"
                                        @click="copyToClipboard(server?.sftp?.username || '')"
                                    >
                                        <Copy class="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <!-- Password -->
                            <div class="space-y-2">
                                <Label class="text-sm font-medium flex items-center gap-2">
                                    <KeyRound class="h-3.5 w-3.5 text-muted-foreground" />
                                    {{ t('serverSettings.sftpPassword') }}
                                </Label>
                                <div
                                    class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30"
                                >
                                    <Info class="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span class="text-sm text-muted-foreground flex-1">
                                        {{ t('serverSettings.sftpPasswordPlaceholder') }}
                                    </span>
                                </div>
                                <p class="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Info class="h-3 w-3" />
                                    {{ t('serverSettings.sftpPasswordHint') }}
                                </p>
                            </div>
                        </div>

                        <!-- Full SFTP URL -->
                        <div class="space-y-2">
                            <Label class="text-sm font-medium flex items-center gap-2">
                                <Link class="h-3.5 w-3.5 text-muted-foreground" />
                                {{ t('serverSettings.sftpUrl') }}
                            </Label>
                            <div
                                class="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <code class="text-sm font-mono flex-1 truncate">{{
                                    server?.sftp?.url || t('common.nA')
                                }}</code>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class="h-7 w-7 p-0 hover:bg-background"
                                    @click="copyToClipboard(server?.sftp?.url || '')"
                                >
                                    <Copy class="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class="h-7 w-7 p-0 hover:bg-background"
                                    @click="openInSftpClient"
                                >
                                    <ExternalLink class="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        <!-- Info Box -->
                        <div class="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                            <div class="flex items-start gap-3">
                                <Info class="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-semibold mb-2 text-sm">{{ t('serverSettings.sftpInfoTitle') }}</h4>
                                    <p class="text-sm text-muted-foreground mb-3">
                                        {{ t('serverSettings.sftpInfoDescription') }}
                                    </p>
                                    <div class="text-sm">
                                        <p class="font-medium mb-2 text-foreground">
                                            {{ t('serverSettings.recommendedClients') }}
                                        </p>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div class="flex items-center gap-2 text-muted-foreground">
                                                <div class="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                                {{ t('serverSettings.sftpClientFileZilla') }}
                                            </div>
                                            <div class="flex items-center gap-2 text-muted-foreground">
                                                <div class="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                                {{ t('serverSettings.sftpClientWinSCP') }}
                                            </div>
                                            <div class="flex items-center gap-2 text-muted-foreground">
                                                <div class="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                                {{ t('serverSettings.sftpClientCyberduck') }}
                                            </div>
                                            <div class="flex items-center gap-2 text-muted-foreground">
                                                <div class="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                                {{ t('serverSettings.sftpClientNautilus') }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After SFTP Details -->
                <WidgetRenderer
                    v-if="!loading && server && widgetsAfterSftpDetails.length > 0"
                    :widgets="widgetsAfterSftpDetails"
                />

                <!-- Server Actions -->
                <Card
                    v-if="canReinstallServer"
                    class="border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                >
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <Settings class="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverSettings.serverActions') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverSettings.serverActionsDescription') }}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <!-- Server Reinstall -->
                        <div
                            class="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                        >
                            <div class="flex items-start gap-3">
                                <div
                                    class="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0"
                                >
                                    <AlertTriangle class="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                                        {{ t('serverSettings.reinstallServer') }}
                                    </h4>
                                    <p class="text-sm text-orange-700 dark:text-orange-300 mb-4">
                                        {{ t('serverSettings.reinstallWarning') }}
                                    </p>
                                    <Button
                                        v-if="canReinstallServer"
                                        variant="destructive"
                                        size="sm"
                                        :disabled="reinstalling"
                                        class="flex items-center gap-2"
                                        @click="showReinstallDialog = true"
                                    >
                                        <RotateCcw :class="['h-4 w-4', reinstalling && 'animate-spin']" />
                                        <span>{{ t('serverSettings.reinstallServer') }}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Plugin Widgets: After Server Actions -->
                <WidgetRenderer
                    v-if="!loading && server && canReinstallServer && widgetsAfterServerActions.length > 0"
                    :widgets="widgetsAfterServerActions"
                />
            </div>

            <!-- Plugin Widgets: Bottom of Page -->
            <WidgetRenderer v-if="widgetsBottomOfPage.length > 0" :widgets="widgetsBottomOfPage" />

            <!-- Error State (only show when no server data and there's an error) -->
            <div
                v-if="!loading && !server && error"
                class="flex flex-col items-center justify-center py-16 text-center"
            >
                <AlertCircle class="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 class="text-lg font-semibold text-foreground mb-2">{{ t('serverSettings.errorTitle') }}</h3>
                <p class="text-sm text-muted-foreground max-w-md">{{ error }}</p>
                <Button variant="outline" size="sm" class="mt-4" @click="fetchServer">
                    <RotateCcw class="h-4 w-4 mr-2" />
                    {{ t('serverSettings.tryAgain') }}
                </Button>
            </div>

            <!-- Reinstall Confirmation Dialog -->
            <Dialog v-model:open="showReinstallDialog">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle class="flex items-center gap-2">
                            <div class="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                                <AlertTriangle class="h-5 w-5 text-destructive" />
                            </div>
                            <span>{{ t('serverSettings.confirmReinstall') }}</span>
                        </DialogTitle>
                        <DialogDescription class="text-sm">
                            {{ t('serverSettings.reinstallConfirmation') }}
                        </DialogDescription>
                    </DialogHeader>
                    <div class="space-y-4">
                        <div class="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                            <div class="flex items-start gap-3">
                                <AlertTriangle class="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                                <div class="text-sm min-w-0">
                                    <p class="font-semibold text-destructive mb-2">
                                        {{ t('serverSettings.reinstallWarningTitle') }}
                                    </p>
                                    <ul class="space-y-1.5 text-muted-foreground">
                                        <li class="flex items-start gap-2">
                                            <div class="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0"></div>
                                            {{ t('serverSettings.reinstallWarning1') }}
                                        </li>
                                        <li class="flex items-start gap-2">
                                            <div class="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0"></div>
                                            {{ t('serverSettings.reinstallWarning2') }}
                                        </li>
                                        <li class="flex items-start gap-2">
                                            <div class="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0"></div>
                                            {{ t('serverSettings.reinstallWarning3') }}
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <Label for="confirmText" class="text-sm font-medium">{{
                                t('serverSettings.confirmText')
                            }}</Label>
                            <Input
                                id="confirmText"
                                v-model="confirmReinstallText"
                                :placeholder="t('serverSettings.confirmTextPlaceholder')"
                                class="text-sm font-mono"
                            />
                            <p class="text-xs text-muted-foreground">
                                {{ t('serverSettings.typeReinstallToConfirm') }}
                            </p>
                        </div>
                        <div
                            class="p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                        >
                            <div class="flex items-start gap-3">
                                <div class="flex items-center h-5 mt-0.5">
                                    <input
                                        id="wipeFiles"
                                        v-model="wipeFilesOnReinstall"
                                        type="checkbox"
                                        class="w-4 h-4 text-orange-600 bg-background border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
                                    />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <Label
                                        for="wipeFiles"
                                        class="text-sm font-medium cursor-pointer text-orange-800 dark:text-orange-200"
                                    >
                                        {{ t('serverSettings.wipeFiles') }}
                                    </Label>
                                    <p class="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                        {{ t('serverSettings.wipeFilesDescription') }}
                                    </p>
                                    <p
                                        v-if="wipeFilesOnReinstall"
                                        class="text-xs font-semibold text-orange-800 dark:text-orange-200 mt-2"
                                    >
                                        ⚠️ {{ t('serverSettings.wipeFilesWarning') }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter class="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="reinstalling"
                            @click="
                                () => {
                                    showReinstallDialog = false;
                                    confirmReinstallText = '';
                                    wipeFilesOnReinstall = false;
                                }
                            "
                        >
                            {{ t('serverSettings.cancel') }}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            :disabled="reinstalling || confirmReinstallText !== 'REINSTALL'"
                            class="flex items-center gap-2"
                            @click="confirmReinstall"
                        >
                            <RotateCcw :class="['h-4 w-4', reinstalling && 'animate-spin']" />
                            <span>{{
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
import { useServerPermissions } from '@/composables/useServerPermissions';
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
import WidgetRenderer from '@/components/plugins/WidgetRenderer.vue';
import { usePluginWidgets, getWidgets } from '@/composables/usePluginWidgets';
import {
    Server,
    FolderOpen,
    Settings,
    Save,
    RotateCcw,
    Copy,
    AlertTriangle,
    AlertCircle,
    Info,
    ExternalLink,
    Hash,
    User,
    KeyRound,
    Link,
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

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canRenameServer = computed(() => hasServerPermission('settings.rename'));
const canReinstallServer = computed(() => hasServerPermission('settings.reinstall'));
const hasAnySettingsPermission = computed(() => canRenameServer.value || canReinstallServer.value);

// State
const loading = ref(true);
const saving = ref(false);
const reinstalling = ref(false);
const error = ref<string | null>(null);
const server = ref<ServerData | null>(null);
const showReinstallDialog = ref(false);
const confirmReinstallText = ref('');
const wipeFilesOnReinstall = ref(false);

// Form
const editForm = ref<EditForm>({
    name: '',
    description: '',
});

// Plugin widgets
const { fetchWidgets: fetchPluginWidgets } = usePluginWidgets('server-settings');
const widgetsTopOfPage = computed(() => getWidgets('server-settings', 'top-of-page'));
const widgetsAfterHeader = computed(() => getWidgets('server-settings', 'after-header'));
const widgetsAfterServerInfo = computed(() => getWidgets('server-settings', 'after-server-information'));
const widgetsAfterSftpDetails = computed(() => getWidgets('server-settings', 'after-sftp-details'));
const widgetsAfterServerActions = computed(() => getWidgets('server-settings', 'after-server-actions'));
const widgetsBottomOfPage = computed(() => getWidgets('server-settings', 'bottom-of-page'));

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
        server.value = null; // Clear server data before fetching

        const response = await axios.get(`/api/user/servers/${route.params.uuidShort}`);

        if (response.data.success) {
            server.value = response.data.data;
            resetForm();
            // Ensure error is cleared when server loads successfully
            error.value = null;
        } else {
            error.value = response.data.message || t('serverSettings.failedToFetchServer');
            server.value = null;
        }
    } catch (err) {
        console.error('Error fetching server:', err);
        // Check if it's a 404 (server not found)
        if (axios.isAxiosError(err) && err.response?.status === 404) {
            error.value = t('serverSettings.serverNotFound');
        } else {
            error.value = t('serverSettings.failedToFetchServer');
        }
        server.value = null;
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
        const message =
            axios.isAxiosError(err) && err.response?.data?.message
                ? err.response.data.message
                : t('serverSettings.failedToUpdateServer');
        toast.error(message);
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

        const response = await axios.post(`/api/user/servers/${route.params.uuidShort}/reinstall`, {
            wipe_files: wipeFilesOnReinstall.value,
        });

        if (response.data.success) {
            toast.success(t('serverSettings.reinstallStarted'));
            showReinstallDialog.value = false;
            confirmReinstallText.value = '';
            wipeFilesOnReinstall.value = false;
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

    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has any settings permissions
    if (!hasAnySettingsPermission.value) {
        toast.error(t('serverSettings.noSettingsPermission'));
        await router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    await fetchServer();

    // Fetch plugin widgets
    await fetchPluginWidgets();
});
</script>
