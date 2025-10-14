<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Servers', isCurrent: true, href: '/admin/servers' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading servers...</span>
                </div>
            </div>

            <!-- Error State -->
            <div
                v-else-if="message?.type === 'error'"
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <div class="text-red-500 mb-4">
                    <svg class="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load servers</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchServers">Try Again</Button>
            </div>

            <!-- Servers Table -->
            <div v-else class="p-6">
                <TableComponent
                    title="Servers"
                    description="Manage all servers in your system."
                    :columns="tableColumns"
                    :data="servers"
                    search-placeholder="Search by name, description, or status..."
                    :server-side-pagination="true"
                    :total-records="pagination.total"
                    :total-pages="Math.ceil(pagination.total / pagination.pageSize)"
                    :current-page="pagination.page"
                    :has-next="pagination.hasNext"
                    :has-prev="pagination.hasPrev"
                    :from="pagination.from"
                    :to="pagination.to"
                    local-storage-key="featherpanel-servers-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <Button variant="outline" size="sm" @click="$router.push('/admin/servers/create')">
                            <Plus class="h-4 w-4 mr-2" />
                            Create Server
                        </Button>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-status="{ item }">
                        <Badge :variant="getStatusVariant(displayStatus(item as ApiServer))" class="capitalize">
                            {{ displayStatus(item as ApiServer) }}
                        </Badge>
                    </template>

                    <template #cell-owner="{ item }">
                        <div class="flex items-center gap-2">
                            <Avatar class="h-6 w-6">
                                <AvatarImage
                                    :src="(item as ApiServer).owner?.avatar || ''"
                                    :alt="(item as ApiServer).owner?.username || 'Unknown'"
                                />
                                <AvatarFallback class="text-xs">{{
                                    (item as ApiServer).owner?.username?.[0] || '?'
                                }}</AvatarFallback>
                            </Avatar>
                            <span class="text-sm">{{ (item as ApiServer).owner?.username || 'Unknown' }}</span>
                        </div>
                    </template>

                    <template #cell-node="{ item }">
                        <span class="text-sm">{{ (item as ApiServer).node?.name || 'Unknown' }}</span>
                    </template>

                    <template #cell-realm="{ item }">
                        <span class="text-sm">{{ (item as ApiServer).realm?.name || 'Unknown' }}</span>
                    </template>

                    <template #cell-spell="{ item }">
                        <span class="text-sm">{{ (item as ApiServer).spell?.name || 'Unknown' }}</span>
                    </template>

                    <template #cell-resources="{ item }">
                        <div class="text-xs space-y-1">
                            <div class="flex justify-between">
                                <span>RAM:</span>
                                <span class="font-mono">{{ formatMemory((item as ApiServer).memory) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>CPU:</span>
                                <span class="font-mono">{{ (item as ApiServer).cpu }}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Disk:</span>
                                <span class="font-mono">{{ formatDisk((item as ApiServer).disk) }}</span>
                            </div>
                        </div>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex gap-2">
                            <Button size="sm" variant="outline" @click="onView(item as ApiServer)">
                                <Eye :size="16" />
                            </Button>
                            <Button size="sm" variant="secondary" @click="onEdit(item as ApiServer)">
                                <Pencil :size="16" />
                            </Button>
                            <template v-if="confirmDeleteRow === String((item as ApiServer).id)">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as ApiServer, false)"
                                >
                                    Confirm Delete
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    class="bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900"
                                    :loading="deleting"
                                    @click="onHardDelete(item as ApiServer)"
                                >
                                    Hard Delete
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button size="sm" variant="destructive" @click="onDelete(item as ApiServer)">
                                    <Trash2 :size="16" />
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
                <!-- Servers help cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Server class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Managing Servers</div>
                                    <p>
                                        View, create, edit, and delete servers. Use search and pagination to quickly
                                        navigate large fleets.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Layers class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Relationships</div>
                                    <p>
                                        Each server belongs to an Owner (user), runs on a Node (machine), and is grouped
                                        by Realm & Spell (template/runtime). These links are visible in the details
                                        drawer.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Gauge class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div class="font-semibold text-foreground mb-1">Resources & Limits</div>
                                    <p>
                                        Resource usage (RAM/CPU/Disk) and limits (allocations, databases, backups) are
                                        summarized per server. Use these to right-size capacity.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <HelpCircle class="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div class="flex-1">
                                    <div class="font-semibold text-foreground mb-1">Tips</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Keep descriptions meaningful to identify purpose at a glance.</li>
                                        <li>Review suspended/unknown statuses regularly to clean up stale hosts.</li>
                                        <li>Align Realm/Spell choices with the intended workload/runtime.</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>

        <!-- Hard Delete Warning Dialog -->
        <AlertDialog
            :open="showHardDeleteWarning"
            @update:open="
                (val: boolean) => {
                    if (!val) cancelHardDelete();
                }
            "
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle class="flex items-center gap-2 text-red-600 dark:text-red-500">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                        Woah! Hard Delete Warning
                    </AlertDialogTitle>
                    <AlertDialogDescription class="space-y-3 pt-4">
                        <p class="text-base font-semibold text-foreground">
                            Hard deleting a server should only be used if:
                        </p>
                        <ul class="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                            <li>You have lost connection to Wings (the node daemon)</li>
                            <li>The node this server is on is permanently dead/offline</li>
                            <li>You need to remove the server from the database without contacting Wings</li>
                        </ul>
                        <div
                            class="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3 mt-4"
                        >
                            <p class="text-sm text-red-800 dark:text-red-400 font-medium">
                                ⚠️ Hard delete will ONLY remove the server from the database. It will NOT delete the
                                server files, containers, or any data from Wings!
                            </p>
                        </div>
                        <p class="text-sm text-muted-foreground pt-2">
                            If the node is still operational, use the regular "Confirm Delete" option instead to
                            properly clean up all server resources.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="cancelHardDelete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        class="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                        @click="confirmHardDelete"
                    >
                        Yes, Hard Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <!-- View Drawer -->
        <Drawer
            class="w-full"
            :open="viewing"
            @update:open="
                (val: boolean) => {
                    if (!val) closeView();
                }
            "
        >
            <DrawerContent v-if="selectedServer">
                <DrawerHeader>
                    <div class="flex items-center justify-between">
                        <div>
                            <DrawerTitle>Server Details</DrawerTitle>
                            <DrawerDescription>Viewing details for server: {{ selectedServer.name }}</DrawerDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            @click="$router.push(`/server/${selectedServer.uuidShort}`)"
                        >
                            <Server class="h-4 w-4 mr-2" />
                            View Console
                        </Button>
                    </div>
                </DrawerHeader>
                <div class="flex items-center gap-4 mb-6 px-6 pt-6">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Server class="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <div class="font-bold text-xl">{{ selectedServer.name }}</div>
                            <div class="text-muted-foreground text-sm">{{ selectedServer.description }}</div>
                        </div>
                    </div>
                </div>
                <section class="px-6 pb-6">
                    <Tabs default-value="details">
                        <TabsList class="mb-4">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="resources">Resources</TabsTrigger>
                            <TabsTrigger value="relationships">Relationships</TabsTrigger>
                        </TabsList>
                        <TabsContent value="details">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Basic Information</h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Status:</span>
                                            <Badge
                                                :variant="getStatusVariant(displayStatus(selectedServer))"
                                                class="capitalize"
                                            >
                                                {{ displayStatus(selectedServer) }}
                                            </Badge>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">UUID:</span>
                                            <span class="font-mono text-xs">{{ selectedServer.uuid }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Short UUID:</span>
                                            <span class="font-mono text-xs">{{ selectedServer.uuidShort }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Created:</span>
                                            <span>{{ formatDate(selectedServer.created_at) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Updated:</span>
                                            <span>{{ formatDate(selectedServer.updated_at) }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Configuration</h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Image:</span>
                                            <span>{{ selectedServer.image }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Startup:</span>
                                            <span class="font-mono text-xs">{{ selectedServer.startup }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Skip Scripts:</span>
                                            <span>{{ selectedServer.skip_scripts ? 'Yes' : 'No' }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">OOM Disabled:</span>
                                            <span>{{ selectedServer.oom_disabled ? 'Yes' : 'No' }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="resources">
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Resource Limits</h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Memory:</span>
                                            <span class="font-mono">{{ formatMemory(selectedServer.memory) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Swap:</span>
                                            <span class="font-mono">{{ formatMemory(selectedServer.swap) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Disk:</span>
                                            <span class="font-mono">{{ formatDisk(selectedServer.disk) }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">CPU:</span>
                                            <span class="font-mono">{{ selectedServer.cpu }}%</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">IO:</span>
                                            <span class="font-mono">{{ selectedServer.io }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Limits</h4>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Allocation Limit:</span>
                                            <span>{{ selectedServer.allocation_limit || 'Unlimited' }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Database Limit:</span>
                                            <span>{{ selectedServer.database_limit || 'Unlimited' }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-muted-foreground">Backup Limit:</span>
                                            <span>{{ selectedServer.backup_limit || 'Unlimited' }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="relationships">
                            <div class="space-y-4">
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Owner</h4>
                                    <div class="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                        <Avatar>
                                            <AvatarImage
                                                :src="selectedServer.owner?.avatar || ''"
                                                :alt="selectedServer.owner?.username || 'Unknown'"
                                            />
                                            <AvatarFallback>{{
                                                selectedServer.owner?.username?.[0] || '?'
                                            }}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div class="font-medium">
                                                {{ selectedServer.owner?.username || 'Unknown' }}
                                            </div>
                                            <div class="text-sm text-muted-foreground">
                                                {{ selectedServer.owner?.email || 'No email' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Node</h4>
                                    <div class="p-3 bg-muted rounded-lg">
                                        <div class="font-medium">{{ selectedServer.node?.name || 'Unknown' }}</div>
                                        <div class="text-sm text-muted-foreground">
                                            {{ selectedServer.node?.fqdn || 'No FQDN' }}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 class="font-semibold text-sm mb-2">Realm & Spell</h4>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="p-3 bg-muted rounded-lg">
                                            <div class="font-medium">{{ selectedServer.realm?.name || 'Unknown' }}</div>
                                            <div class="text-sm text-muted-foreground">
                                                {{ selectedServer.realm?.description || 'No description' }}
                                            </div>
                                        </div>
                                        <div class="p-3 bg-muted rounded-lg">
                                            <div class="font-medium">{{ selectedServer.spell?.name || 'Unknown' }}</div>
                                            <div class="text-sm text-muted-foreground">
                                                {{ selectedServer.spell?.description || 'No description' }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </section>
                <div class="p-4 flex justify-end">
                    <DrawerClose as-child>
                        <Button variant="outline" @click="closeView">Close</Button>
                    </DrawerClose>
                </div>
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

import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Pencil, Trash2, Plus, Server, Layers, Gauge, HelpCircle } from 'lucide-vue-next';
import axios from 'axios';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TableComponent from '@/kit/TableComponent.vue';
import type { TableColumn } from '@/kit/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from 'vue-toastification';

const router = useRouter();
const toast = useToast();

// Type for axios error responses
type AxiosError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

type ApiServer = {
    id: number;
    uuid: string;
    uuidShort: string;
    node_id: number;
    name: string;
    description: string;
    status?: string;
    suspended?: number;
    skip_scripts: number;
    owner_id: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads?: string;
    oom_disabled: number;
    allocation_id: number;
    realms_id: number;
    spell_id: number;
    startup: string;
    image: string;
    allocation_limit?: number;
    database_limit: number;
    backup_limit: number;
    created_at: string;
    updated_at: string;
    installed_at?: string;
    external_id?: string;
    owner?: {
        id: number;
        username: string;
        email: string;
        avatar?: string;
    };
    node?: {
        id: number;
        name: string;
        fqdn?: string;
    };
    realm?: {
        id: number;
        name: string;
        description?: string;
    };
    spell?: {
        id: number;
        name: string;
        description?: string;
    };
    allocation?: {
        id: number;
        ip: string;
        port: number;
    };
};

const servers = ref<ApiServer[]>([]);
const searchQuery = ref('');
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
    hasNext: false,
    hasPrev: false,
    from: 0,
    to: 0,
});
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<string | null>(null);
const selectedServer = ref<ApiServer | null>(null);
const viewing = ref(false);
const showHardDeleteWarning = ref(false);
const serverToHardDelete = ref<ApiServer | null>(null);

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', searchable: true },
    { key: 'status', label: 'Status', searchable: true },
    { key: 'owner', label: 'Owner', searchable: true },
    { key: 'node', label: 'Node', searchable: true },
    { key: 'realm', label: 'Realm', searchable: true },
    { key: 'spell', label: 'Spell', searchable: true },
    { key: 'resources', label: 'Resources' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[200px] font-semibold' },
];

async function fetchServers() {
    loading.value = true;
    try {
        const { data } = await axios.get('/api/admin/servers', {
            params: {
                page: pagination.value.page,
                limit: pagination.value.pageSize,
                search: searchQuery.value || undefined,
            },
        });
        servers.value = data.data.servers || [];

        // Map the API response pagination to our expected format
        const apiPagination = data.data.pagination;
        pagination.value = {
            page: apiPagination.current_page,
            pageSize: apiPagination.per_page,
            total: apiPagination.total_records,
            hasNext: apiPagination.has_next,
            hasPrev: apiPagination.has_prev,
            from: apiPagination.from,
            to: apiPagination.to,
        };
    } catch (error: unknown) {
        message.value = {
            type: 'error',
            text: (error as AxiosError)?.response?.data?.message || 'Failed to fetch servers',
        };
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    await fetchServers();
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery], fetchServers);

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    pagination.value.page = 1; // Reset to first page when searching
    fetchServers();
}

function changePage(page: number) {
    pagination.value.page = page;
    fetchServers();
}

async function onView(server: ApiServer) {
    try {
        const { data } = await axios.get(`/api/admin/servers/${server.id}`);
        if (data && data.success && data.data) {
            selectedServer.value = data.data;
            viewing.value = true;
        } else {
            toast.error('Failed to fetch server details');
        }
    } catch (error: unknown) {
        const errorMessage = (error as AxiosError)?.response?.data?.message || 'Failed to fetch server details';
        toast.error(errorMessage);
        console.error('Error fetching server details:', error);
    }
}

function onEdit(server: ApiServer) {
    router.push(`/admin/servers/${server.id}/edit`);
}

async function confirmDelete(server: ApiServer, hardDelete: boolean = false) {
    deleting.value = true;
    let success = false;
    try {
        const endpoint = hardDelete ? `/api/admin/servers/${server.id}/hard` : `/api/admin/servers/${server.id}`;
        const response = await axios.delete(endpoint);
        if (response.data && response.data.success) {
            message.value = {
                type: 'success',
                text: hardDelete ? 'Server hard deleted successfully' : 'Server deleted successfully',
            };
            await fetchServers();
            success = true;
            toast.success(hardDelete ? 'Server hard deleted successfully' : 'Server deleted successfully');
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete server' };
        }
    } catch (error: unknown) {
        const errorMessage = (error as AxiosError)?.response?.data?.message || 'Failed to delete server';
        message.value = {
            type: 'error',
            text: errorMessage,
        };
        toast.error(errorMessage);
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}
function onDelete(server: ApiServer) {
    confirmDeleteRow.value = String(server.id);
}

function onHardDelete(server: ApiServer) {
    serverToHardDelete.value = server;
    showHardDeleteWarning.value = true;
}

async function confirmHardDelete() {
    if (serverToHardDelete.value) {
        showHardDeleteWarning.value = false;
        await confirmDelete(serverToHardDelete.value, true);
        serverToHardDelete.value = null;
    }
}

function cancelHardDelete() {
    showHardDeleteWarning.value = false;
    serverToHardDelete.value = null;
    confirmDeleteRow.value = null;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

function closeView() {
    viewing.value = false;
    selectedServer.value = null;
}

// Utility functions
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' {
    switch (status) {
        case 'running':
            return 'default';
        case 'installed':
        case 'installing':
            return 'secondary';
        case 'stopped':
        case 'suspended':
            return 'destructive';
        case 'unknown':
        default:
            return 'secondary';
    }
}

function displayStatus(server: ApiServer): string {
    return server.suspended ? 'suspended' : server.status || 'Unknown';
}

function formatMemory(mb: number): string {
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
}

function formatDisk(mb: number): string {
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
}
</script>
