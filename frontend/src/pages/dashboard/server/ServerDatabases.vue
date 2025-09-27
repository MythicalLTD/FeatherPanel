<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <!-- Database Limit Warning -->
            <div
                v-if="serverInfo && databases.length >= serverInfo.database_limit"
                class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-950/30 dark:border-yellow-800"
            >
                <div class="flex items-center gap-3">
                    <div class="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                        <h3 class="text-yellow-800 dark:text-yellow-200 font-medium">
                            {{ t('serverDatabases.databaseLimitReached') }}
                        </h3>
                        <p class="text-yellow-700 dark:text-yellow-300 text-sm">
                            {{
                                t('serverDatabases.databaseLimitReachedDescription', {
                                    limit: serverInfo.database_limit,
                                })
                            }}
                        </p>
                    </div>
                </div>
            </div>

            <TableComponent
                :title="t('serverDatabases.title')"
                :description="
                    t('serverDatabases.description') +
                    (serverInfo ? ` (${databases.length}/${serverInfo.database_limit})` : '')
                "
                :columns="tableColumns"
                :data="databases"
                :search-placeholder="t('serverDatabases.searchPlaceholder')"
                :server-side-pagination="true"
                :total-records="pagination.total"
                :total-pages="pagination.last_page"
                :current-page="pagination.current_page"
                :has-next="pagination.current_page < pagination.last_page"
                :has-prev="pagination.current_page > 1"
                :from="pagination.from"
                :to="pagination.to"
                local-storage-key="featherpanel-server-databases-columns"
                @search="handleSearch"
                @page-change="changePage"
            >
                <template #header-actions>
                    <Button
                        :disabled="serverInfo && databases.length >= serverInfo.database_limit"
                        @click="openCreateDatabaseDrawer"
                    >
                        <Plus class="h-4 w-4 mr-2" />
                        {{ t('serverDatabases.createDatabase') }}
                    </Button>
                </template>

                <template #cell-database="{ item }">
                    <div class="font-medium">{{ (item as DatabaseItem).database }}</div>
                </template>

                <template #cell-username="{ item }">
                    <div class="text-sm text-muted-foreground">{{ (item as DatabaseItem).username }}</div>
                </template>

                <template #cell-host="{ item }">
                    <div class="text-sm text-muted-foreground">
                        {{ (item as DatabaseItem).database_host || 'N/A' }}:{{
                            (item as DatabaseItem).database_port || 'N/A'
                        }}
                    </div>
                </template>

                <template #cell-remote="{ item }">
                    <Badge variant="outline" class="text-xs">
                        {{ (item as DatabaseItem).remote }}
                    </Badge>
                </template>

                <template #cell-connections="{ item }">
                    <span class="text-sm">{{ (item as DatabaseItem).max_connections || 0 }}</span>
                </template>

                <template #cell-created="{ item }">
                    <span class="text-sm">{{ formatDate((item as DatabaseItem).created_at) }}</span>
                </template>

                <template #cell-actions="{ item }">
                    <div class="flex gap-2">
                        <Button size="sm" variant="outline" @click="openViewDatabaseDrawer(item as DatabaseItem)">
                            <Eye class="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" @click="deleteDatabase(item as DatabaseItem)">
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                </template>
            </TableComponent>
        </div>

        <!-- Create Database Drawer -->
        <Drawer
            class="w-full"
            :open="createDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeCreateDrawer();
                }
            "
        >
            <DrawerContent class="max-h-[90vh] overflow-y-auto">
                <DrawerHeader>
                    <DrawerTitle>{{ t('serverDatabases.createDatabase') }}</DrawerTitle>
                    <DrawerDescription>{{ t('serverDatabases.createDatabaseDescription') }}</DrawerDescription>
                </DrawerHeader>
                <form class="space-y-6 p-6" @submit.prevent="createDatabase">
                    <!-- Database Host -->
                    <div class="space-y-2">
                        <Label for="database-host" class="text-sm font-medium">
                            {{ t('serverDatabases.databaseHost') }}
                        </Label>
                        <Select v-model="createForm.database_host_id" required>
                            <SelectTrigger class="w-full">
                                <SelectValue :placeholder="t('serverDatabases.selectDatabaseHost')" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="host in availableHosts" :key="host.id" :value="host.id">
                                    {{ host.name }} ({{ host.database_type }})
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.databaseHostHelp') }}
                        </p>
                    </div>

                    <!-- Database Name -->
                    <div class="space-y-2">
                        <Label for="database-name" class="text-sm font-medium">
                            {{ t('serverDatabases.databaseName') }}
                        </Label>
                        <Input
                            id="database-name"
                            v-model="createForm.database_name"
                            type="text"
                            :placeholder="t('serverDatabases.databaseNamePlaceholder')"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.databaseNameHelp') }}
                        </p>
                    </div>

                    <!-- Remote Access -->
                    <div class="space-y-2">
                        <Label for="database-remote" class="text-sm font-medium">
                            {{ t('serverDatabases.remoteAccess') }}
                        </Label>
                        <Input
                            id="database-remote"
                            v-model="createForm.remote"
                            type="text"
                            :placeholder="'%'"
                            required
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.remoteAccessHelp') }}
                        </p>
                    </div>

                    <!-- Max Connections -->
                    <div class="space-y-2">
                        <Label for="database-max-connections" class="text-sm font-medium">
                            {{ t('serverDatabases.maxConnections') }}
                        </Label>
                        <Input
                            id="database-max-connections"
                            v-model="createForm.max_connections"
                            type="number"
                            min="0"
                            :placeholder="'0'"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('serverDatabases.maxConnectionsHelp') }}
                        </p>
                    </div>

                    <DrawerFooter>
                        <Button type="submit" :disabled="creating">
                            <Loader2 v-if="creating" class="h-4 w-4 mr-2 animate-spin" />
                            {{ t('serverDatabases.createDatabase') }}
                        </Button>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>

        <!-- Database Info Drawer -->
        <Drawer
            class="w-full"
            :open="viewDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeViewDrawer();
                }
            "
        >
            <DrawerContent v-if="viewingDatabase" class="max-h-[90vh] overflow-y-auto">
                <DrawerHeader>
                    <DrawerTitle class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Eye class="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <div class="text-2xl font-bold">{{ viewingDatabase.database }}</div>
                            <div class="text-base text-muted-foreground font-normal">
                                {{ t('serverDatabases.databaseCredentials') }}
                            </div>
                        </div>
                    </DrawerTitle>
                </DrawerHeader>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-8 py-6 px-6">
                    <!-- Connection Details -->
                    <div class="space-y-6">
                        <div
                            class="border rounded-xl p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800"
                        >
                            <h3 class="font-bold text-lg mb-4 flex items-center gap-3 text-blue-800 dark:text-blue-200">
                                <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                                {{ t('serverDatabases.connectionDetails') }}
                            </h3>
                            <div class="space-y-4">
                                <!-- Host -->
                                <div>
                                    <Label class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">{{
                                        t('serverDatabases.host')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-blue-200 dark:border-blue-700"
                                        >
                                            {{ viewingDatabase.database_host || 'N/A' }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            @click="copyToClipboard(viewingDatabase.database_host || '')"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Port -->
                                <div>
                                    <Label class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">{{
                                        t('serverDatabases.port')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-blue-200 dark:border-blue-700"
                                        >
                                            {{ viewingDatabase.database_port || 'N/A' }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            @click="copyToClipboard((viewingDatabase.database_port || '').toString())"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Database Type -->
                                <div>
                                    <Label class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">{{
                                        t('serverDatabases.type')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-blue-200 dark:border-blue-700"
                                        >
                                            {{ viewingDatabase.database_type || 'N/A' }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            @click="copyToClipboard(viewingDatabase.database_type || '')"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Database Info -->
                        <div
                            class="border rounded-xl p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800"
                        >
                            <h3
                                class="font-bold text-lg mb-4 flex items-center gap-3 text-green-800 dark:text-green-200"
                            >
                                <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                                {{ t('serverDatabases.databaseInformation') }}
                            </h3>
                            <div class="space-y-4">
                                <!-- Database Name -->
                                <div>
                                    <Label class="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">{{
                                        t('serverDatabases.name')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-green-200 dark:border-green-700"
                                        >
                                            {{ viewingDatabase.database }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                            @click="copyToClipboard(viewingDatabase.database)"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Remote Access -->
                                <div>
                                    <Label class="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">{{
                                        t('serverDatabases.remoteAccess')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-green-200 dark:border-green-700"
                                        >
                                            {{ viewingDatabase.remote }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                            @click="copyToClipboard(viewingDatabase.remote)"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Max Connections -->
                                <div>
                                    <Label class="text-sm font-medium text-green-700 dark:text-green-300 mb-2 block">{{
                                        t('serverDatabases.maxConnections')
                                    }}</Label>
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-green-200 dark:border-green-700"
                                        >
                                            {{ viewingDatabase.max_connections || 0 }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
                                            @click="copyToClipboard((viewingDatabase.max_connections || 0).toString())"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Credentials & Actions -->
                    <div class="space-y-4">
                        <!-- Credentials -->
                        <div
                            class="border rounded-xl p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800"
                        >
                            <h3
                                class="font-bold text-lg mb-4 flex items-center gap-3 text-orange-800 dark:text-orange-200"
                            >
                                <span class="w-3 h-3 bg-orange-500 rounded-full"></span>
                                {{ t('serverDatabases.loginCredentials') }}
                            </h3>
                            <div class="space-y-4">
                                <!-- Username -->
                                <div>
                                    <Label
                                        class="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 block"
                                        >{{ t('serverDatabases.username') }}</Label
                                    >
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-orange-200 dark:border-orange-700"
                                        >
                                            {{ viewingDatabase.username }}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            class="h-10 w-10 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                            @click="copyToClipboard(viewingDatabase.username)"
                                        >
                                            <Copy class="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <!-- Password -->
                                <div>
                                    <Label
                                        class="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 block"
                                        >{{ t('serverDatabases.password') }}</Label
                                    >
                                    <div class="flex items-center gap-3">
                                        <code
                                            class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-base font-mono border border-orange-200 dark:border-orange-700"
                                        >
                                            {{
                                                showPassword
                                                    ? viewingDatabase.password
                                                    : '••••••••••••••••••••••••••••••••'
                                            }}
                                        </code>
                                        <div class="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                class="h-10 w-10 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                                @click="showPassword = !showPassword"
                                            >
                                                <Eye v-if="!showPassword" class="h-4 w-4" />
                                                <EyeOff v-else class="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                class="h-10 w-10 p-0 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                                                @click="copyToClipboard(viewingDatabase.password)"
                                            >
                                                <Copy class="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Connection String -->
                        <div
                            class="border rounded-xl p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800"
                        >
                            <h3 class="font-bold text-lg mb-4 flex items-center gap-3 text-blue-800 dark:text-blue-200">
                                <span class="w-3 h-3 bg-blue-500 rounded-full"></span>
                                {{ t('serverDatabases.quickConnect') }}
                            </h3>
                            <div>
                                <Label class="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">{{
                                    t('serverDatabases.connectionString')
                                }}</Label>
                                <div class="flex items-center gap-3">
                                    <code
                                        class="flex-1 p-3 bg-white dark:bg-gray-800 rounded-lg text-sm font-mono break-all border border-blue-200 dark:border-blue-700"
                                    >
                                        mysql://{{ viewingDatabase.username }}:{{
                                            showPassword ? viewingDatabase.password : '[password]'
                                        }}@{{ viewingDatabase.database_host }}:{{ viewingDatabase.database_port }}/{{
                                            viewingDatabase.database
                                        }}
                                    </code>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                        @click="
                                            copyToClipboard(
                                                `mysql://${viewingDatabase.username}:${viewingDatabase.password}@${viewingDatabase.database_host}:${viewingDatabase.database_port}/${viewingDatabase.database}`,
                                            )
                                        "
                                    >
                                        <Copy class="h-4 w-4" />
                                    </Button>
                                </div>
                                <p class="text-sm text-blue-600 dark:text-blue-400 mt-2">
                                    {{ t('serverDatabases.connectionStringHelp') }}
                                </p>
                            </div>
                        </div>

                        <!-- Metadata -->
                        <div
                            class="border rounded-xl p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/30 dark:to-gray-900/20 border-gray-200 dark:border-gray-800"
                        >
                            <h3 class="font-bold text-lg mb-4 flex items-center gap-3 text-gray-800 dark:text-gray-200">
                                <span class="w-3 h-3 bg-gray-500 rounded-full"></span>
                                {{ t('serverDatabases.metadata') }}
                            </h3>
                            <div class="text-sm text-gray-700 dark:text-gray-300">
                                <div
                                    class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                    <span class="font-medium">{{ t('serverDatabases.created') }}:</span>
                                    <span class="font-mono">{{ formatDate(viewingDatabase.created_at) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DrawerFooter class="px-6">
                    <Button variant="ghost" size="sm" class="mr-auto" @click="clearRememberedChoice">
                        {{ t('serverDatabases.resetWarning') }}
                    </Button>
                    <Button type="button" variant="outline" @click="closeViewDrawer">
                        {{ t('common.close') }}
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>

        <!-- Sensitive Info Warning Dialog -->
        <AlertDialog v-model:open="showSensitiveInfoWarning">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2">
                        <AlertTriangle class="h-5 w-5 text-orange-600" />
                        {{ t('serverDatabases.sensitiveInfoWarning') }}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ t('serverDatabases.sensitiveInfoDescription') }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div class="space-y-4">
                    <div class="flex items-center space-x-2">
                        <input
                            id="remember-choice"
                            v-model="rememberChoice"
                            type="checkbox"
                            class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label for="remember-choice" class="text-sm">
                            {{ t('serverDatabases.rememberChoice') }}
                        </Label>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction @click="confirmViewSensitiveInfo">
                        {{ t('serverDatabases.viewDatabase') }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- Confirmation Dialog -->
        <AlertDialog v-model:open="showConfirmDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{{ confirmDialog.title }}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {{ confirmDialog.description }}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{{ t('common.cancel') }}</AlertDialogCancel>
                    <AlertDialogAction
                        :class="
                            confirmDialog.variant === 'destructive'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : ''
                        "
                        @click="onConfirmDialog"
                    >
                        <Loader2 v-if="confirmLoading" class="h-4 w-4 mr-2 animate-spin" />
                        {{ confirmDialog.confirmText }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import TableComponent from '@/kit/TableComponent.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
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
import { Plus, Trash2, Loader2, Eye, EyeOff, Copy, AlertTriangle } from 'lucide-vue-next';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import type { TableColumn } from '@/kit/types';

type DatabaseItem = {
    id: number;
    server_id: number;
    database_host_id: number;
    database: string;
    username: string;
    remote: string;
    password: string;
    max_connections: number;
    created_at: string;
    updated_at: string;
    host_name?: string;
    host_type?: string;
    database_host_name?: string; // Added for new drawer
    database_type?: string; // Added for new drawer
    database_host?: string; // Added for new drawer
    database_port?: number; // Added for new drawer
};

type DatabaseHost = {
    id: number;
    name: string;
    database_type: string;
    database_host: string;
    database_port: number;
};

const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const databases = ref<DatabaseItem[]>([]);
const availableHosts = ref<DatabaseHost[]>([]);
const loading = ref(false);
const creating = ref(false);
const searchQuery = ref('');
const server = ref<{ name: string } | null>(null);
const serverInfo = ref<{ database_limit: number } | null>(null);
const pagination = ref({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
});

// Drawer states
const createDrawerOpen = ref(false);
const viewDrawerOpen = ref(false);
const viewingDatabase = ref<DatabaseItem | null>(null);
const showPassword = ref(false);

// Confirm dialog state
const showConfirmDialog = ref(false);
const confirmDialog = ref({
    title: '' as string,
    description: '' as string,
    confirmText: '' as string,
    variant: 'default' as 'default' | 'destructive',
});
const confirmAction = ref<null | (() => Promise<void> | void)>(null);
const confirmLoading = ref(false);

// Sensitive info warning state
const showSensitiveInfoWarning = ref(false);
const rememberChoice = ref(false);

// Form data
const createForm = ref({
    database_host_id: '',
    database_name: '',
    remote: '%',
    max_connections: 0,
});

// Computed
const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverDatabases.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/databases` },
]);

const tableColumns: TableColumn[] = [
    { key: 'database', label: t('serverDatabases.database'), searchable: true },
    { key: 'username', label: t('serverDatabases.username'), searchable: true },
    { key: 'host', label: t('serverDatabases.host') },
    { key: 'remote', label: t('serverDatabases.remote') },
    { key: 'connections', label: t('serverDatabases.maxConnections') },
    { key: 'created', label: t('serverDatabases.createdAt') },
    { key: 'actions', label: t('common.actions'), headerClass: 'w-[200px] font-semibold' },
];

// Lifecycle
onMounted(async () => {
    await Promise.all([fetchDatabases(), fetchAvailableHosts()]);
});

// Methods
async function fetchDatabases(page = pagination.value.current_page) {
    try {
        loading.value = true;

        // Fetch both databases and server info
        const [databasesResponse, serverResponse] = await Promise.all([
            axios.get(`/api/user/servers/${route.params.uuidShort}/databases`, {
                params: { page, per_page: pagination.value.per_page, search: searchQuery.value || undefined },
            }),
            axios.get(`/api/user/servers/${route.params.uuidShort}`),
        ]);

        if (!databasesResponse.data.success) {
            toast.error(databasesResponse.data.message || t('serverDatabases.failedToFetch'));
            return;
        }

        if (serverResponse.data.success) {
            serverInfo.value = {
                database_limit: serverResponse.data.data.database_limit,
            };
            server.value = { name: serverResponse.data.data.name };
        }

        databases.value = databasesResponse.data.data.data || [];
        pagination.value = databasesResponse.data.data.pagination;
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.failedToFetch'));
            }
        } else {
            toast.error(t('serverDatabases.failedToFetch'));
        }
        console.error('Error fetching databases:', error);
    } finally {
        loading.value = false;
    }
}

async function fetchAvailableHosts() {
    try {
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}/databases/hosts`);
        if (data.success) {
            availableHosts.value = data.data || [];
        } else {
            toast.error(data.message || t('serverDatabases.failedToFetchHosts'));
        }
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.failedToFetchHosts'));
            }
        } else {
            toast.error(t('serverDatabases.failedToFetchHosts'));
        }
        console.error('Failed to fetch available hosts:', error);
    }
}

function changePage(page: number) {
    if (page < 1) return;
    fetchDatabases(page);
}

function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.current_page = 1;
    fetchDatabases(1);
}

function formatDate(value?: string | null) {
    if (!value) return t('common.never');
    return new Date(value).toLocaleString();
}

// Create database
function openCreateDatabaseDrawer() {
    createDrawerOpen.value = true;
    createForm.value = {
        database_host_id: '',
        database_name: '',
        remote: '%',
        max_connections: 0,
    };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
}

async function createDatabase() {
    try {
        creating.value = true;

        // Validate form data
        if (!createForm.value.database_host_id || createForm.value.database_host_id === '') {
            toast.error(t('serverDatabases.selectDatabaseHost'));
            return;
        }

        if (!createForm.value.database_name.trim()) {
            toast.error(t('serverDatabases.databaseNameRequired'));
            return;
        }

        const { data } = await axios.post(`/api/user/servers/${route.params.uuidShort}/databases`, createForm.value);

        if (!data.success) {
            toast.error(data.message || data.error_message || t('serverDatabases.createFailed'));
            return;
        }

        toast.success(t('serverDatabases.createSuccess'));
        closeCreateDrawer();
        await fetchDatabases();
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.createFailed'));
            }
        } else {
            toast.error(t('serverDatabases.createFailed'));
        }
        console.error('Error creating database:', error);
    } finally {
        creating.value = false;
    }
}

// Edit database
function openViewDatabaseDrawer(database: DatabaseItem) {
    viewingDatabase.value = database;
    showPassword.value = false; // Reset password visibility

    // Check if user has already chosen to remember their choice
    const hasRememberedChoice = localStorage.getItem('featherpanel-remember-sensitive-info');

    if (hasRememberedChoice === 'true') {
        // User chose to remember, show password directly
        showPassword.value = true;
        viewDrawerOpen.value = true;
    } else {
        // Show warning first
        showSensitiveInfoWarning.value = true;
    }
}

function closeViewDrawer() {
    viewDrawerOpen.value = false;
    viewingDatabase.value = null;
    showPassword.value = false;
}

function clearRememberedChoice() {
    localStorage.removeItem('featherpanel-remember-sensitive-info');
    toast.success(t('serverDatabases.rememberedChoiceCleared'));
}

function copyToClipboard(text: string): void {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            toast.success(t('common.copiedToClipboard'));
        })
        .catch(() => {
            toast.error(t('common.failedToCopy'));
        });
}

// Delete database
function deleteDatabase(database: DatabaseItem) {
    confirmDialog.value = {
        title: t('serverDatabases.confirmDeleteTitle'),
        description: t('serverDatabases.confirmDeleteDescription', { database: database.database }),
        confirmText: t('serverDatabases.confirmDelete'),
        variant: 'destructive',
    };
    confirmAction.value = () => deleteDatabaseConfirm(database.id);
    showConfirmDialog.value = true;
}

async function deleteDatabaseConfirm(databaseId: number) {
    try {
        confirmLoading.value = true;
        const { data } = await axios.delete(`/api/user/servers/${route.params.uuidShort}/databases/${databaseId}`);

        if (!data.success) {
            toast.error(data.message || data.error_message || t('serverDatabases.deleteFailed'));
            return;
        }

        toast.success(t('serverDatabases.deleteSuccess'));
        showConfirmDialog.value = false;
        await fetchDatabases();
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            if (axiosError.response?.data?.message) {
                toast.error(axiosError.response.data.message);
            } else if (axiosError.response?.data?.error_message) {
                toast.error(axiosError.response.data.error_message);
            } else {
                toast.error(t('serverDatabases.deleteFailed'));
            }
        } else {
            toast.error(t('serverDatabases.deleteFailed'));
        }
        console.error('Error deleting database:', error);
    } finally {
        confirmLoading.value = false;
    }
}

function onConfirmDialog() {
    if (!confirmAction.value) return;
    confirmLoading.value = true;
    confirmAction.value();
}

// Sensitive info warning logic
function confirmViewSensitiveInfo() {
    if (rememberChoice.value) {
        // Remember user's choice
        localStorage.setItem('featherpanel-remember-sensitive-info', 'true');
        showPassword.value = true; // Show password in drawer
    } else {
        // Don't remember, hide password
        showPassword.value = false; // Hide password in drawer
    }

    showSensitiveInfoWarning.value = false;
    viewDrawerOpen.value = true; // Open the drawer
}
</script>
