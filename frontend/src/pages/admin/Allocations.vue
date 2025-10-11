<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading allocations...</span>
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load allocations</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchAllocations">Try Again</Button>
            </div>

            <!-- Allocations Table -->
            <div v-else class="p-6">
                <TableComponent
                    title="Allocations"
                    :description="`Managing allocations for node: ${currentNode?.name}`"
                    :columns="tableColumns"
                    :data="allocations"
                    :search-placeholder="'Search allocations...'"
                    :search-query="searchQuery"
                    :server-side-pagination="true"
                    :total-records="totalRecords"
                    :total-pages="totalPages"
                    :current-page="currentPage"
                    :has-next="hasNext"
                    :has-prev="hasPrev"
                    :from="from"
                    :to="to"
                    local-storage-key="featherpanel-allocations-table-columns"
                    @search="handleSearch"
                    @page-change="changePage"
                >
                    <template #header-actions>
                        <div class="flex items-center gap-3">
                            <div
                                v-if="isCheckingHealth"
                                class="flex items-center gap-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground"
                            >
                                <div class="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                                Checking health...
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                :disabled="nodeHealthStatus !== 'healthy'"
                                :title="
                                    nodeHealthStatus !== 'healthy'
                                        ? 'Node is unhealthy - cannot create allocations'
                                        : 'Create new allocation'
                                "
                                @click="openCreateDrawer"
                            >
                                <Plus class="h-4 w-4 mr-2" />
                                Create Allocation
                            </Button>
                        </div>
                    </template>

                    <!-- Custom cell templates -->
                    <template #cell-id="{ item }">
                        <span
                            class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold"
                        >
                            {{ (item as unknown as Allocation).id }}
                        </span>
                    </template>

                    <template #cell-ip="{ item }">
                        <div class="flex items-center gap-2">
                            <span class="font-mono">{{ (item as unknown as Allocation).ip }}</span>
                            <span
                                v-if="(item as unknown as Allocation).server_id"
                                class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                            >
                                Assigned
                            </span>
                            <span v-else class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                Available
                            </span>
                        </div>
                    </template>

                    <template #cell-port="{ item }">
                        <span class="font-mono">{{ (item as unknown as Allocation).port }}</span>
                    </template>

                    <template #cell-actions="{ item }">
                        <div class="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                :disabled="nodeHealthStatus !== 'healthy'"
                                :title="
                                    nodeHealthStatus !== 'healthy' ? 'Node is unhealthy' : 'View allocation details'
                                "
                                @click="onView(item as unknown as Allocation)"
                            >
                                <Eye class="h-4 w-4 mr-1" />
                                View
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                :disabled="nodeHealthStatus !== 'healthy'"
                                :title="nodeHealthStatus !== 'healthy' ? 'Node is unhealthy' : 'Edit allocation'"
                                @click="onEdit(item as unknown as Allocation)"
                            >
                                <Edit class="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                            <template v-if="confirmDeleteRow === (item as unknown as Allocation).id">
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    :loading="deleting"
                                    @click="confirmDelete(item as unknown as Allocation)"
                                >
                                    Confirm
                                </Button>
                                <Button size="sm" variant="outline" :disabled="deleting" @click="onCancelDelete">
                                    Cancel
                                </Button>
                            </template>
                            <template v-else>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    :disabled="nodeHealthStatus !== 'healthy'"
                                    :title="nodeHealthStatus !== 'healthy' ? 'Node is unhealthy' : 'Delete allocation'"
                                    @click="onDelete(item as unknown as Allocation)"
                                >
                                    <Trash2 class="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            </template>
                        </div>
                    </template>
                </TableComponent>
                <!-- Allocations help cards under the table -->
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Network class="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">What are Allocations?</div>
                                    <p>
                                        Allocations are IP:Port pairs a node uses to host servers. Each server needs an
                                        allocation to run and accept traffic.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <MapPin class="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">What you’ll need</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>IP address (from your node)</li>
                                        <li>Port or port range (e.g., 25565 or 25565-25600)</li>
                                        <li>IP alias (optional) for friendly hostname</li>
                                        <li>Notes (optional) for admin context</li>
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Gamepad2 class="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div class="flex-1">
                                    <div class="font-medium text-foreground mb-1">Popular game ranges (examples)</div>
                                    <ul class="list-disc list-inside space-y-1">
                                        <li>Minecraft: 25565-25600</li>
                                        <li>Rust: 28015-28115</li>
                                        <li>CS:GO/Source: 27015-27050</li>
                                        <li>ARK: 7777-7800, 27015-27030</li>
                                    </ul>
                                    <p class="mt-2">
                                        Recommendation: pre-create generous ranges (e.g., 25565-25900) to avoid running
                                        out during peak times.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card class="md:col-span-2 lg:col-span-3">
                        <CardContent>
                            <div class="p-4 flex items-start gap-3 text-sm text-muted-foreground">
                                <Shield class="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <div class="font-medium text-foreground mb-1">Protocols & Firewall</div>
                                    <p>
                                        Allocations are TCP/UDP by default. If you’re using a firewall other than
                                        iptables, ensure these ports are allowed on both protocols. For reverse proxies
                                        or DDoS protection layers, open/forward the same ranges there too.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </DashboardLayout>

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
        <DrawerContent v-if="selectedAllocation">
            <DrawerHeader>
                <DrawerTitle>Allocation Info</DrawerTitle>
                <DrawerDescription
                    >Viewing details for allocation: {{ selectedAllocation.ip }}:{{
                        selectedAllocation.port
                    }}</DrawerDescription
                >
            </DrawerHeader>
            <div class="px-6 pt-6 space-y-2">
                <div><b>IP Address:</b> {{ selectedAllocation.ip }}</div>
                <div><b>Port:</b> {{ selectedAllocation.port }}</div>
                <div><b>IP Alias:</b> {{ selectedAllocation.ip_alias || '-' }}</div>
                <div><b>Server:</b> {{ selectedAllocation.server_name || 'Not assigned' }}</div>
                <div><b>Notes:</b> {{ selectedAllocation.notes || '-' }}</div>
                <div><b>Created At:</b> {{ selectedAllocation.created_at }}</div>
                <div><b>Updated At:</b> {{ selectedAllocation.updated_at }}</div>
            </div>
            <div class="p-4 flex justify-end">
                <DrawerClose as-child>
                    <Button variant="outline" @click="closeView">Close</Button>
                </DrawerClose>
            </div>
        </DrawerContent>
    </Drawer>

    <!-- Edit Drawer -->
    <Drawer
        :open="editDrawerOpen"
        @update:open="
            (val: boolean) => {
                if (!val) closeEditDrawer();
            }
        "
    >
        <DrawerContent v-if="editingAllocation">
            <DrawerHeader>
                <DrawerTitle>Edit Allocation</DrawerTitle>
                <DrawerDescription
                    >Edit details for allocation: {{ editingAllocation.ip }}:{{
                        editingAllocation.port
                    }}</DrawerDescription
                >
            </DrawerHeader>
            <Alert
                v-if="drawerMessage"
                :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                class="mb-4 whitespace-nowrap overflow-x-auto"
            >
                <span>{{ drawerMessage.text }}</span>
            </Alert>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitEdit">
                <label for="edit-ip" class="block mb-1 font-medium">IP Address</label>
                <Input id="edit-ip" v-model="editForm.ip" placeholder="192.168.1.1" required />
                <label for="edit-port" class="block mb-1 font-medium">Port</label>
                <Input
                    id="edit-port"
                    v-model="editForm.port"
                    type="number"
                    min="1"
                    max="65535"
                    placeholder="25565"
                    required
                />
                <label for="edit-ip-alias" class="block mb-1 font-medium">IP Alias (Optional)</label>
                <Input id="edit-ip-alias" v-model="editForm.ip_alias" placeholder="game.example.com" />
                <label for="edit-notes" class="block mb-1 font-medium">Notes (Optional)</label>
                <Textarea id="edit-notes" v-model="editForm.notes" placeholder="Additional notes..." />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeEditDrawer">Cancel</Button>
                    <Button type="submit" variant="default">Save</Button>
                </div>
            </form>
        </DrawerContent>
    </Drawer>

    <!-- Create Drawer -->
    <Drawer
        :open="createDrawerOpen"
        @update:open="
            (val) => {
                if (!val) closeCreateDrawer();
            }
        "
    >
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Create Allocation</DrawerTitle>
                <DrawerDescription>Fill in the details to create a new allocation.</DrawerDescription>
            </DrawerHeader>
            <Alert
                v-if="drawerMessage"
                :variant="drawerMessage.type === 'error' ? 'destructive' : 'default'"
                class="mb-4 whitespace-nowrap overflow-x-auto"
            >
                <span>{{ drawerMessage.text }}</span>
            </Alert>
            <form class="space-y-4 px-6 pb-6 pt-2" @submit.prevent="submitCreate">
                <div>
                    <label for="create-ip" class="block mb-1 font-medium">IP Address</label>
                    <Select v-model="createForm.ip" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an IP address" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem v-for="ip in nodeIPs" :key="ip" :value="ip">
                                <div class="flex items-center gap-2">
                                    <span class="font-mono">{{ ip }}</span>
                                    <span
                                        v-if="isIPv6(ip)"
                                        class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                    >
                                        IPv6
                                    </span>
                                    <span
                                        v-else-if="isPrivateIP(ip)"
                                        class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                    >
                                        Private
                                    </span>
                                    <span v-else class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                        Public
                                    </span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <div class="text-xs text-muted-foreground mt-1">
                        Available IP addresses from Wings daemon. You can create multiple ports for the same IP.
                    </div>
                </div>

                <div>
                    <label for="create-port" class="block mb-1 font-medium">Port</label>
                    <Input
                        id="create-port"
                        v-model="createForm.port"
                        placeholder="25565 or 25565-25700 for range"
                        required
                    />
                    <div class="text-xs text-muted-foreground mt-1">
                        Enter a single port (e.g., 25565) or a range (e.g., 25565-25700) to create multiple allocations
                        at once.
                    </div>
                </div>

                <label for="create-ip-alias" class="block mb-1 font-medium">IP Alias (Optional)</label>
                <Input id="create-ip-alias" v-model="createForm.ip_alias" placeholder="game.example.com" />
                <label for="create-notes" class="block mb-1 font-medium">Notes (Optional)</label>
                <Textarea id="create-notes" v-model="createForm.notes" placeholder="Additional notes..." />
                <div class="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="outline" @click="closeCreateDrawer">Cancel</Button>
                    <Button type="submit" variant="default">Create</Button>
                </div>
            </form>
        </DrawerContent>
    </Drawer>
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

import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Eye, Edit, Trash2, Network, MapPin, Gamepad2, Shield } from 'lucide-vue-next';
import axios from 'axios';
import { Alert } from '@/components/ui/alert';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
} from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TableComponent from '@/kit/TableComponent.vue';
import type { Allocation, Node, TableColumn } from '@/kit/types';

const route = useRoute();
const router = useRouter();
const nodeIdParam = computed(() => (route.params.nodeId ? Number(route.params.nodeId) : null));
const currentNode = ref<Node | null>(null);
const nodeHealthStatus = ref<'healthy' | 'unhealthy' | 'unknown'>('unknown');
const isCheckingHealth = ref(false);
const nodeIPs = ref<string[]>([]);

const allocations = ref<Allocation[]>([]);
const searchQuery = ref('');
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const drawerMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<number | null>(null);

// Pagination
const currentPage = ref(1);
const pageSize = ref(20);
const totalRecords = ref(0);
const totalPages = ref(0);
const hasNext = ref(false);
const hasPrev = ref(false);
const from = ref(0);
const to = ref(0);

// Drawer state
const viewing = ref(false);
const selectedAllocation = ref<Allocation | null>(null);
const editingAllocation = ref<Allocation | null>(null);
const editDrawerOpen = ref(false);
const editForm = ref({
    ip: '',
    port: '',
    ip_alias: '',
    notes: '',
});
const createDrawerOpen = ref(false);
const createForm = ref({
    ip: '',
    port: '',
    ip_alias: '',
    notes: '',
});

// Table columns configuration
const tableColumns: TableColumn[] = [
    { key: 'id', label: 'ID', headerClass: 'w-[80px] font-semibold' },
    { key: 'ip', label: 'IP Address', searchable: true },
    { key: 'port', label: 'Port', searchable: true },
    { key: 'ip_alias', label: 'IP Alias', searchable: true },
    { key: 'server_name', label: 'Server', searchable: true },
    { key: 'notes', label: 'Notes', searchable: true },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', headerClass: 'w-[120px] font-semibold' },
];

const breadcrumbs = computed(() => [
    { text: 'Locations', isCurrent: false, href: '/admin/locations' },
    { text: 'Nodes', isCurrent: false, href: `/admin/nodes?location_id=${currentNode.value?.id}` },
    ...(currentNode.value
        ? [
              {
                  text: currentNode.value.name,
                  isCurrent: false,
                  href: `/admin/nodes?location_id=${currentNode.value.id}`,
              },
              {
                  text: 'Allocations',
                  isCurrent: true,
                  href: `/admin/nodes/${currentNode.value.id}/allocations`,
              },
          ]
        : []),
]);

async function checkNodeHealth(): Promise<boolean> {
    if (!nodeIdParam.value) return false;

    isCheckingHealth.value = true;
    try {
        const response = await axios.get(`/api/wings/admin/node/${nodeIdParam.value}/system`);
        const isHealthy = response.data.success;
        nodeHealthStatus.value = isHealthy ? 'healthy' : 'unhealthy';
        return isHealthy;
    } catch {
        nodeHealthStatus.value = 'unhealthy';
        return false;
    } finally {
        isCheckingHealth.value = false;
    }
}

async function fetchNodeIPs() {
    if (!nodeIdParam.value) return;

    try {
        const response = await axios.get(`/api/wings/admin/node/${nodeIdParam.value}/ips`);
        if (response.data.success) {
            nodeIPs.value = response.data.data.ips.ip_addresses || [];
        } else {
            nodeIPs.value = [];
        }
    } catch {
        nodeIPs.value = [];
    }
}

// Utility functions for IP classification
function isIPv6(ip: string): boolean {
    return ip.includes(':');
}

function isPrivateIP(ip: string): boolean {
    // Check for private IP ranges
    if (isIPv6(ip)) {
        return ip.startsWith('fd') || ip.startsWith('fe80');
    }

    const octets = ip.split('.').map(Number);
    if (octets.length !== 4) return false;

    // 10.0.0.0/8
    if (octets[0] === 10) return true;

    // 172.16.0.0/12
    if (octets[0] === 172 && octets[1] && octets[1] >= 16 && octets[1] <= 31) return true;

    // 192.168.0.0/16
    if (octets[0] === 192 && octets[1] === 168) return true;

    // 127.0.0.0/8 (localhost)
    if (octets[0] === 127) return true;

    return false;
}

async function fetchCurrentNode() {
    if (!nodeIdParam.value) {
        router.replace('/admin/nodes');
        return;
    }
    try {
        const { data } = await axios.get(`/api/admin/nodes/${nodeIdParam.value}`);
        currentNode.value = data.data.node;
    } catch {
        currentNode.value = null;
        router.replace('/admin/nodes');
    }
}

async function fetchAllocations() {
    loading.value = true;
    try {
        const params: Record<string, string | number | undefined> = {
            search: searchQuery.value || undefined,
            node_id: nodeIdParam.value ?? undefined,
            page: currentPage.value,
            limit: pageSize.value,
        };

        // Remove undefined values to avoid sending them in the request
        Object.keys(params).forEach((key) => {
            if (params[key] === undefined) {
                delete params[key];
            }
        });

        const { data } = await axios.get('/api/admin/allocations', { params });
        allocations.value = data.data.allocations || [];

        // Update pagination from server response
        const pagination = data.data.pagination;
        if (pagination) {
            currentPage.value = pagination.current_page;
            pageSize.value = pagination.per_page;
            totalRecords.value = pagination.total_records;
            totalPages.value = pagination.total_pages;
            hasNext.value = pagination.has_next;
            hasPrev.value = pagination.has_prev;
            from.value = pagination.from;
            to.value = pagination.to;
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to fetch allocations',
        };
        allocations.value = [];
    } finally {
        loading.value = false;
    }
}

// Table event handlers
function handleSearch(query: string) {
    searchQuery.value = query;
    currentPage.value = 1; // Reset to first page when searching
    fetchAllocations();
}

function changePage(page: number) {
    currentPage.value = page;
    fetchAllocations();
}

async function onView(allocation: Allocation) {
    // Check health before allowing view
    if (nodeHealthStatus.value !== 'healthy') {
        message.value = {
            type: 'error',
            text: 'Cannot view allocation details while node is unhealthy. Please check the node status first.',
        };
        return;
    }

    viewing.value = true;
    try {
        const { data } = await axios.get(`/api/admin/allocations/${allocation.id}`);
        selectedAllocation.value = data.data.allocation;
    } catch {
        selectedAllocation.value = null;
        message.value = { type: 'error', text: 'Failed to fetch allocation details' };
    }
}

async function onEdit(allocation: Allocation) {
    // Check health before allowing edit
    if (nodeHealthStatus.value !== 'healthy') {
        message.value = {
            type: 'error',
            text: 'Cannot edit allocations while node is unhealthy. Please check the node status first.',
        };
        return;
    }

    openEditDrawer(allocation);
}

async function onDelete(allocation: Allocation) {
    // Check health before allowing delete
    if (nodeHealthStatus.value !== 'healthy') {
        message.value = {
            type: 'error',
            text: 'Cannot delete allocations while node is unhealthy. Please check the node status first.',
        };
        return;
    }

    confirmDeleteRow.value = allocation.id;
}

function onCancelDelete() {
    confirmDeleteRow.value = null;
}

async function confirmDelete(allocation: Allocation) {
    deleting.value = true;
    try {
        const response = await axios.delete(`/api/admin/allocations/${allocation.id}`);
        if (response.data && response.data.success) {
            message.value = { type: 'success', text: 'Allocation deleted successfully' };
            await fetchAllocations();
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete allocation' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete allocation',
        };
    } finally {
        deleting.value = false;
        confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

function closeView() {
    viewing.value = false;
    selectedAllocation.value = null;
}

async function openEditDrawer(allocation: Allocation) {
    try {
        const { data } = await axios.get(`/api/admin/allocations/${allocation.id}`);
        const a: Allocation = data.data.allocation;
        editingAllocation.value = a;
        editForm.value = {
            ip: a.ip || '',
            port: a.port.toString() || '',
            ip_alias: a.ip_alias || '',
            notes: a.notes || '',
        };
        editDrawerOpen.value = true;
    } catch {
        message.value = { type: 'error', text: 'Failed to fetch allocation details for editing' };
    }
}

function closeEditDrawer() {
    editDrawerOpen.value = false;
    editingAllocation.value = null;
    drawerMessage.value = null;
}

async function submitEdit() {
    if (!editingAllocation.value) return;
    try {
        const patchData = { ...editForm.value };
        const { data } = await axios.patch(`/api/admin/allocations/${editingAllocation.value.id}`, patchData);
        if (data && data.success) {
            drawerMessage.value = { type: 'success', text: 'Allocation updated successfully' };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 2000);
            await fetchAllocations();
            closeEditDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to update allocation' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to update allocation',
        };
    }
}

async function openCreateDrawer() {
    // Check health before allowing creation
    if (nodeHealthStatus.value !== 'healthy') {
        message.value = {
            type: 'error',
            text: 'Cannot create allocations while node is unhealthy. Please check the node status first.',
        };
        return;
    }

    createDrawerOpen.value = true;
    createForm.value = { ip: '', port: '', ip_alias: '', notes: '' };
}

function closeCreateDrawer() {
    createDrawerOpen.value = false;
    drawerMessage.value = null;
}

async function submitCreate() {
    try {
        const { data } = await axios.put('/api/admin/allocations', {
            ...createForm.value,
            node_id: nodeIdParam.value,
            port: createForm.value.port, // Send as string to support ranges
        });
        if (data && data.success) {
            const createdCount = data.data.created_count || 1;
            const skippedCount = data.data.skipped_count || 0;

            let message = `Created ${createdCount} allocation(s)`;
            if (skippedCount > 0) {
                message += ` (skipped ${skippedCount} existing)`;
            }

            drawerMessage.value = { type: 'success', text: message };
            setTimeout(() => {
                drawerMessage.value = null;
            }, 3000);
            await fetchAllocations();
            closeCreateDrawer();
        } else {
            drawerMessage.value = { type: 'error', text: data?.message || 'Failed to create allocation' };
        }
    } catch (e: unknown) {
        drawerMessage.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to create allocation',
        };
    }
}

onMounted(async () => {
    await fetchCurrentNode();

    // Check node health before allowing any operations
    const isHealthy = await checkNodeHealth();
    if (!isHealthy) {
        message.value = {
            type: 'error',
            text: 'Node is currently unhealthy. Wings daemon is not responding. Please check the node status before managing allocations.',
        };
        return;
    }

    // Fetch node IPs for the dropdown
    await fetchNodeIPs();
    await fetchAllocations();
});

watch([nodeIdParam], async () => {
    if (nodeIdParam.value) {
        await fetchAllocations();
    }
});
</script>
