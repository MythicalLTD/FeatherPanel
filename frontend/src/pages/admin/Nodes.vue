<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <main class="p-6 space-y-8 bg-background min-h-screen">
            <Card class="rounded-xl">
                <CardHeader>
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle class="text-2xl font-bold">Nodes</CardTitle>
                            <CardDescription>
                                Managing nodes for location: {{ currentLocation?.name }}
                            </CardDescription>
                        </div>
                        <div class="flex gap-2">
                            <Input
                                v-model="searchQuery"
                                placeholder="Search by name, fqdn, or description..."
                                class="max-w-xs"
                            />
                            <Button variant="secondary" @click="openCreateDrawer">Create Node</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Alert
                        v-if="message"
                        :variant="message.type === 'error' ? 'destructive' : 'default'"
                        class="mb-4 whitespace-nowrap overflow-x-auto"
                    >
                        <span>{{ displayMessage }}</span>
                    </Alert>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>FQDN</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Memory</TableHead>
                                <TableHead>Disk</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow v-for="node in nodes" :key="node.id">
                                <TableCell>{{ node.name }}</TableCell>
                                <TableCell>{{ node.fqdn }}</TableCell>
                                <TableCell>{{ getLocationName(node.location_id) }}</TableCell>
                                <TableCell>{{ node.memory }}</TableCell>
                                <TableCell>{{ node.disk }}</TableCell>
                                <TableCell>{{ node.created_at }}</TableCell>
                                <TableCell>
                                    <div class="flex gap-2">
                                        <Button size="sm" variant="outline" @click="onView(node)">
                                            <Eye :size="16" />
                                        </Button>
                                        <Button size="sm" variant="secondary" @click="onEdit(node)">
                                            <Pencil :size="16" />
                                        </Button>
                                        <template v-if="confirmDeleteRow === node.id">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                :loading="deleting"
                                                @click="confirmDelete(node)"
                                            >
                                                Confirm Delete
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                :disabled="deleting"
                                                @click="onCancelDelete"
                                            >
                                                Cancel
                                            </Button>
                                        </template>
                                        <template v-else>
                                            <Button size="sm" variant="destructive" @click="onDelete(node)">
                                                <Trash2 :size="16" />
                                            </Button>
                                        </template>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <div class="mt-6 flex justify-end">
                        <Pagination
                            :items-per-page="pagination.pageSize"
                            :total="pagination.total"
                            :default-page="pagination.page"
                            @page-change="onPageChange"
                        />
                    </div>
                </CardContent>
            </Card>
        </main>
        <!-- Drawers -->
        <Drawer v-model:open="showDrawer">
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{{
                        drawerMode === 'create' ? 'Create Node' : drawerMode === 'edit' ? 'Edit Node' : 'View Node'
                    }}</DrawerTitle>
                    <DrawerDescription>
                        {{
                            drawerMode === 'create'
                                ? 'Create a new node for this location.'
                                : drawerMode === 'edit'
                                  ? 'Edit the selected node.'
                                  : 'View node details.'
                        }}
                    </DrawerDescription>
                    <!-- Navigation buttons only for create mode -->
                    <div v-if="drawerMode === 'create'" class="flex items-center justify-between mt-4">
                        <div class="flex-1 font-semibold">
                            Step {{ currentStep + 1 }} of {{ steps.length }}: {{ steps[currentStep].label }}
                        </div>
                        <div class="flex gap-2">
                            <Button v-if="currentStep > 0" type="button" size="sm" variant="outline" @click="prevStep">
                                <ArrowLeft class="w-4 h-4 mr-1" />
                                Back
                            </Button>
                            <Button v-if="currentStep < steps.length - 1" type="button" size="sm" @click="nextStep">
                                Next
                                <ArrowRight class="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                    <!-- Progress indicator only for create mode -->
                    <div v-if="drawerMode === 'create'" class="flex gap-2 mt-2">
                        <template v-for="(step, idx) in steps" :key="step.key">
                            <div
                                :class="['w-3 h-3 rounded-full', idx === currentStep ? 'bg-primary' : 'bg-muted']"
                            ></div>
                        </template>
                    </div>
                </DrawerHeader>
                <form
                    v-if="drawerMode !== 'view'"
                    class="space-y-4 p-4 overflow-y-auto max-h-[calc(100vh-200px)]"
                    @submit.prevent="submitForm"
                >
                    <!-- Wizard steps for create mode -->
                    <div v-if="drawerMode === 'create'">
                        <div v-show="currentStep === 0">
                            <!-- Basic Details -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Name</label>
                                    <Input v-model="form.name" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Character limits: <code>a-zA-Z0-9_-</code> and [space] (min 1, max 100
                                        characters).
                                    </div>
                                    <div v-if="formErrors.name" class="text-red-500 text-xs mt-1">
                                        {{ formErrors.name }}
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Description</label>
                                    <Textarea v-model="form.description" :disabled="formLoading" />
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Node Visibility</label>
                                    <Select v-model="form.public" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select visibility" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Public</SelectItem>
                                            <SelectItem value="false">Private</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        By setting a node to <b>private</b> you will be denying the ability to
                                        auto-deploy to this node.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">FQDN</label>
                                    <Input v-model="form.fqdn" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Please enter domain name (e.g. <code>node.example.com</code>) to be used for
                                        connecting to the daemon. An IP address may be used <b>only</b> if you are not
                                        using SSL for this node.
                                    </div>
                                    <div v-if="formErrors.fqdn" class="text-red-500 text-xs mt-1">
                                        {{ formErrors.fqdn }}
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Communicate Over SSL</label>
                                    <Select v-model="form.scheme" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select SSL option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="https">Use SSL Connection</SelectItem>
                                            <SelectItem value="http">Use HTTP Connection</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div v-if="form.scheme === 'https'" class="text-xs text-red-500">
                                        Your Panel is currently configured to use a secure connection. In order for
                                        browsers to connect to your node it must use a SSL connection.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Behind Proxy</label>
                                    <Select v-model="form.behind_proxy" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select proxy option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Not Behind Proxy</SelectItem>
                                            <SelectItem value="true">Behind Proxy</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        If you are running the daemon behind a proxy such as Cloudflare, select this to
                                        have the daemon skip looking for certificates on boot.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-show="currentStep === 1">
                            <!-- Configuration -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Daemon Server File Directory</label>
                                    <Input v-model="form.daemonBase" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Enter the directory where server files should be stored. If you use OVH you
                                        should check your partition scheme.
                                        <b>You may need to use <code>/home/daemon-data</code> to have enough space.</b>
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Total Memory</label>
                                        <Input
                                            v-model.number="form.memory"
                                            type="number"
                                            min="0"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">MiB</span>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Memory Over-Allocation</label>
                                        <Input
                                            v-model.number="form.memory_overallocate"
                                            type="number"
                                            min="-1"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">%</span>
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Total Disk Space</label>
                                        <Input
                                            v-model.number="form.disk"
                                            type="number"
                                            min="0"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">MiB</span>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Disk Over-Allocation</label>
                                        <Input
                                            v-model.number="form.disk_overallocate"
                                            type="number"
                                            min="-1"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-show="currentStep === 2">
                            <!-- Network -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Daemon Port</label>
                                    <Input
                                        v-model.number="form.daemonListen"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Daemon SFTP Port</label>
                                    <Input
                                        v-model.number="form.daemonSFTP"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                </div>
                            </div>
                        </div>
                        <div v-show="currentStep === 3">
                            <!-- Advanced -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Maintenance Mode</label>
                                    <Select v-model="form.maintenance_mode" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select maintenance mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Disabled</SelectItem>
                                            <SelectItem value="true">Enabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        When enabled, this node will not accept new server deployments.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Upload Size Limit</label>
                                    <Input
                                        v-model.number="form.upload_size"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                    <span class="text-xs">MiB</span>
                                    <div class="text-xs text-muted-foreground">
                                        Maximum file upload size for this node.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Tabs for edit mode -->
                    <div v-if="drawerMode === 'edit'" class="space-y-4">
                        <Tabs v-model="activeTab" class="w-full">
                            <TabsList class="grid w-full grid-cols-4">
                                <TabsTrigger value="basic">Basic</TabsTrigger>
                                <TabsTrigger value="config">Config</TabsTrigger>
                                <TabsTrigger value="network">Network</TabsTrigger>
                                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                            </TabsList>
                            <TabsContent value="basic" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Name</label>
                                    <Input v-model="form.name" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Character limits: <code>a-zA-Z0-9_-</code> and [space] (min 1, max 100
                                        characters).
                                    </div>
                                    <div v-if="formErrors.name" class="text-red-500 text-xs mt-1">
                                        {{ formErrors.name }}
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Description</label>
                                    <Textarea v-model="form.description" :disabled="formLoading" />
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Node Visibility</label>
                                    <Select v-model="form.public" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select visibility" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Public</SelectItem>
                                            <SelectItem value="false">Private</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        By setting a node to <b>private</b> you will be denying the ability to
                                        auto-deploy to this node.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">FQDN</label>
                                    <Input v-model="form.fqdn" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Please enter domain name (e.g. <code>node.example.com</code>) to be used for
                                        connecting to the daemon. An IP address may be used <b>only</b> if you are not
                                        using SSL for this node.
                                    </div>
                                    <div v-if="formErrors.fqdn" class="text-red-500 text-xs mt-1">
                                        {{ formErrors.fqdn }}
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Communicate Over SSL</label>
                                    <Select v-model="form.scheme" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select SSL option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="https">Use SSL Connection</SelectItem>
                                            <SelectItem value="http">Use HTTP Connection</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div v-if="form.scheme === 'https'" class="text-xs text-red-500">
                                        Your Panel is currently configured to use a secure connection. In order for
                                        browsers to connect to your node it must use a SSL connection.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Behind Proxy</label>
                                    <Select v-model="form.behind_proxy" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select proxy option" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Not Behind Proxy</SelectItem>
                                            <SelectItem value="true">Behind Proxy</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        If you are running the daemon behind a proxy such as Cloudflare, select this to
                                        have the daemon skip looking for certificates on boot.
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="config" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Daemon Server File Directory</label>
                                    <Input v-model="form.daemonBase" :disabled="formLoading" />
                                    <div class="text-xs text-muted-foreground">
                                        Enter the directory where server files should be stored. If you use OVH you
                                        should check your partition scheme.
                                        <b>You may need to use <code>/home/daemon-data</code> to have enough space.</b>
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Total Memory</label>
                                        <Input
                                            v-model.number="form.memory"
                                            type="number"
                                            min="0"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">MiB</span>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Memory Over-Allocation</label>
                                        <Input
                                            v-model.number="form.memory_overallocate"
                                            type="number"
                                            min="-1"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">%</span>
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Total Disk Space</label>
                                        <Input
                                            v-model.number="form.disk"
                                            type="number"
                                            min="0"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">MiB</span>
                                    </div>
                                    <div class="flex-1">
                                        <label class="block font-medium mb-1">Disk Over-Allocation</label>
                                        <Input
                                            v-model.number="form.disk_overallocate"
                                            type="number"
                                            min="-1"
                                            :disabled="formLoading"
                                        />
                                        <span class="text-xs">%</span>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="network" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Daemon Port</label>
                                    <Input
                                        v-model.number="form.daemonListen"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Daemon SFTP Port</label>
                                    <Input
                                        v-model.number="form.daemonSFTP"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                </div>
                            </TabsContent>
                            <TabsContent value="advanced" class="space-y-4">
                                <div>
                                    <label class="block font-medium mb-1">Maintenance Mode</label>
                                    <Select v-model="form.maintenance_mode" :disabled="formLoading">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select maintenance mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="false">Disabled</SelectItem>
                                            <SelectItem value="true">Enabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div class="text-xs text-muted-foreground">
                                        When enabled, this node will not accept new server deployments.
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-medium mb-1">Upload Size Limit</label>
                                    <Input
                                        v-model.number="form.upload_size"
                                        type="number"
                                        min="1"
                                        :disabled="formLoading"
                                    />
                                    <span class="text-xs">MiB</span>
                                    <div class="text-xs text-muted-foreground">
                                        Maximum file upload size for this node.
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                    <DrawerFooter class="mt-4">
                        <Button
                            v-if="currentStep === steps.length - 1 && drawerMode === 'create'"
                            type="submit"
                            class="w-full"
                            :loading="formLoading"
                        >
                            Create
                        </Button>
                        <Button v-if="drawerMode === 'edit'" type="submit" class="w-full" :loading="formLoading">
                            Save Changes
                        </Button>
                        <Button type="button" class="w-full" variant="outline" @click="closeDrawer"> Cancel </Button>
                    </DrawerFooter>
                </form>
                <div v-else class="p-4 space-y-2">
                    <div><b>Name:</b> {{ drawerNode?.name }}</div>
                    <div><b>FQDN:</b> {{ drawerNode?.fqdn }}</div>
                    <div><b>Location:</b> {{ getLocationName(drawerNode?.location_id) }}</div>
                    <div><b>Memory:</b> {{ drawerNode?.memory }}</div>
                    <div><b>Disk:</b> {{ drawerNode?.disk }}</div>
                    <div><b>Created:</b> {{ drawerNode?.created_at }}</div>
                    <DrawerFooter>
                        <Button type="button" variant="outline" class="w-full" @click="closeDrawer">Close</Button>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Eye, Pencil, Trash2, ArrowLeft, ArrowRight } from 'lucide-vue-next';
import axios from 'axios';
import { Alert } from '@/components/ui/alert';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
} from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Extend Node type and form default

type Node = {
    id: number;
    uuid: string;
    name: string;
    description?: string;
    fqdn: string;
    location_id?: number;
    public: string;
    scheme: string;
    behind_proxy: string;
    maintenance_mode: string;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemonListen: number;
    daemonSFTP: number;
    daemonBase: string;
    created_at: string;
    updated_at: string;
    // ...add other fields as needed
};

type FormData = {
    name: string;
    description: string;
    fqdn: string;
    location_id?: number;
    public: string;
    scheme: string;
    behind_proxy: string;
    maintenance_mode: string;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemonListen: number;
    daemonSFTP: number;
    daemonBase: string;
};

const nodes = ref<Node[]>([]);
const searchQuery = ref('');
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0,
});
const loading = ref(false);
const deleting = ref(false);
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null);
const confirmDeleteRow = ref<number | null>(null);
const displayMessage = computed(() => (message.value ? message.value.text.replace(/\r?\n|\r/g, ' ') : ''));

const route = useRoute();
const router = useRouter();
const locationIdParam = computed(() => (route.query.location_id ? Number(route.query.location_id) : null));
const currentLocation = ref<{ id: number; name: string } | null>(null);
const breadcrumbs = computed(() => [
    { text: 'Locations', isCurrent: false, href: '/admin/locations' },
    ...(currentLocation.value
        ? [
              {
                  text: currentLocation.value.name,
                  isCurrent: true,
                  href: `/admin/nodes?location_id=${currentLocation.value.id}`,
              },
          ]
        : []),
]);

async function fetchCurrentLocation() {
    if (!locationIdParam.value) {
        // Redirect to locations if no location_id
        router.replace('/admin/locations');
        return;
    }
    try {
        const { data } = await axios.get(`/api/admin/locations/${locationIdParam.value}`);
        currentLocation.value = data.data.location;
    } catch {
        currentLocation.value = null;
        router.replace('/admin/locations');
    }
}

async function fetchNodes() {
    loading.value = true;
    try {
        const params: Record<string, string | number | undefined> = {
            page: pagination.value.page,
            limit: pagination.value.pageSize,
            search: searchQuery.value || undefined,
            location_id: locationIdParam.value ?? undefined,
        };
        const { data } = await axios.get('/api/admin/nodes', { params });
        nodes.value = data.data.nodes || [];
        pagination.value.total = data.data.pagination.total;
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to fetch nodes',
        };
        nodes.value = [];
        pagination.value.total = 0;
    } finally {
        loading.value = false;
    }
}

// --- Location lookup ---
const locations = ref<{ id: number; name: string }[]>([]);
async function fetchLocations() {
    try {
        const { data } = await axios.get('/api/admin/locations', { params: { limit: 1000 } });
        locations.value = data.data.locations || [];
    } catch {
        locations.value = [];
    }
}

// --- Drawer state ---
const showDrawer = ref(false);
const drawerMode = ref<'create' | 'edit' | 'view'>('create');
const drawerNode = ref<Node | null>(null);
const editingNodeId = ref<number | null>(null);
const form = ref<FormData>({
    name: '',
    description: '',
    fqdn: '',
    location_id: undefined,
    public: 'true',
    scheme: 'https',
    behind_proxy: 'false',
    maintenance_mode: 'false',
    memory: 0,
    memory_overallocate: 0,
    disk: 0,
    disk_overallocate: 0,
    upload_size: 512,
    daemonListen: 8080,
    daemonSFTP: 2022,
    daemonBase: '/var/lib/pterodactyl/volumes',
});
const formErrors = ref<Record<string, string>>({});
const formLoading = ref(false);

const steps = [
    { key: 'basic', label: 'Basic Details' },
    { key: 'config', label: 'Configuration' },
    { key: 'network', label: 'Network' },
    { key: 'advanced', label: 'Advanced' },
];
const currentStep = ref(0);
const activeTab = ref('basic'); // For edit mode tabs

function nextStep() {
    if (validateStep(currentStep.value)) {
        if (currentStep.value < steps.length - 1) currentStep.value++;
    }
}
function prevStep() {
    if (currentStep.value > 0) currentStep.value--;
}
function validateStep(stepIdx: number): boolean {
    // Clear previous errors for this step
    const errors: Record<string, string> = {};
    if (steps[stepIdx].key === 'basic') {
        if (!form.value.name || form.value.name.trim() === '') errors.name = 'Name is required';
        if (!form.value.fqdn || form.value.fqdn.trim() === '') {
            errors.fqdn = 'FQDN is required';
        } else {
            // Validate FQDN format
            const fqdnRegex =
                /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!fqdnRegex.test(form.value.fqdn)) {
                errors.fqdn = 'FQDN must be a valid domain name (e.g., node.example.com)';
            }
        }
    }
    if (steps[stepIdx].key === 'config') {
        if (!form.value.daemonBase || form.value.daemonBase.trim() === '')
            errors.daemonBase = 'Daemon file directory is required';
        if (form.value.memory === undefined || form.value.memory < 0) errors.memory = 'Total memory is required';
        if (form.value.disk === undefined || form.value.disk < 0) errors.disk = 'Total disk space is required';
    }
    if (steps[stepIdx].key === 'network') {
        if (!form.value.daemonListen) errors.daemonListen = 'Daemon port is required';
        if (!form.value.daemonSFTP) errors.daemonSFTP = 'Daemon SFTP port is required';
    }
    if (steps[stepIdx].key === 'advanced') {
        if (form.value.upload_size === undefined || form.value.upload_size < 1)
            errors.upload_size = 'Upload size limit is required and must be at least 1';
    }
    formErrors.value = errors;
    return Object.keys(errors).length === 0;
}

function resetWizard() {
    currentStep.value = 0;
    formErrors.value = {};
}

function openCreateDrawer() {
    drawerMode.value = 'create';
    editingNodeId.value = null;
    form.value = {
        name: '',
        description: '',
        fqdn: '',
        location_id: currentLocation.value?.id ?? undefined,
        public: 'true',
        scheme: 'https',
        behind_proxy: 'false',
        maintenance_mode: 'false',
        memory: 0,
        memory_overallocate: 0,
        disk: 0,
        disk_overallocate: 0,
        upload_size: 512,
        daemonListen: 8080,
        daemonSFTP: 2022,
        daemonBase: '/var/lib/pterodactyl/volumes',
    };
    resetWizard();
    showDrawer.value = true;
}
function onEdit(node: Node) {
    drawerMode.value = 'edit';
    editingNodeId.value = node.id;
    activeTab.value = 'basic'; // Reset to first tab
    form.value = {
        name: node.name,
        description: node.description || '',
        fqdn: node.fqdn,
        location_id: node.location_id,
        public: node.public ? 'true' : 'false',
        scheme: node.scheme || 'https',
        behind_proxy: node.behind_proxy ? 'true' : 'false',
        maintenance_mode: node.maintenance_mode || 'false',
        memory: node.memory || 0,
        memory_overallocate: node.memory_overallocate || 0,
        disk: node.disk || 0,
        disk_overallocate: node.disk_overallocate || 0,
        upload_size: node.upload_size || 512,
        daemonListen: node.daemonListen || 8080,
        daemonSFTP: node.daemonSFTP || 2022,
        daemonBase: node.daemonBase || '/var/lib/pterodactyl/volumes',
    };
    resetWizard(); // Reset wizard for edit mode
    showDrawer.value = true;
}
function onView(node: Node) {
    drawerMode.value = 'view';
    drawerNode.value = node;
    showDrawer.value = true;
}
function closeDrawer() {
    showDrawer.value = false;
    drawerNode.value = null;
}

function getLocationName(id: number | undefined) {
    if (typeof id !== 'number') return '';
    return locations.value.find((l) => l.id === id)?.name || id;
}

function validateForm() {
    const errors: Record<string, string> = {};

    // Basic validation
    if (!form.value.name || form.value.name.trim() === '') errors.name = 'Name is required';
    if (!form.value.fqdn || form.value.fqdn.trim() === '') {
        errors.fqdn = 'FQDN is required';
    } else {
        // Validate FQDN format
        const fqdnRegex =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!fqdnRegex.test(form.value.fqdn)) {
            errors.fqdn = 'FQDN must be a valid domain name (e.g., node.example.com)';
        }
    }
    if (!form.value.location_id) errors.location_id = 'Location is required';

    // Configuration validation
    if (!form.value.daemonBase || form.value.daemonBase.trim() === '')
        errors.daemonBase = 'Daemon file directory is required';
    if (form.value.memory === undefined || form.value.memory < 0) errors.memory = 'Total memory is required';
    if (form.value.disk === undefined || form.value.disk < 0) errors.disk = 'Total disk space is required';

    // Network validation
    if (!form.value.daemonListen) errors.daemonListen = 'Daemon port is required';
    if (!form.value.daemonSFTP) errors.daemonSFTP = 'Daemon SFTP port is required';

    // Advanced validation
    if (form.value.upload_size === undefined || form.value.upload_size < 1)
        errors.upload_size = 'Upload size limit is required and must be at least 1';

    return errors;
}

async function submitForm() {
    formErrors.value = validateForm();
    if (Object.keys(formErrors.value).length > 0) return;
    formLoading.value = true;
    try {
        if (drawerMode.value === 'create') {
            await axios.put('/api/admin/nodes', {
                ...form.value,
                location_id: form.value.location_id ? Number(form.value.location_id) : undefined,
            });
            message.value = { type: 'success', text: 'Node created successfully' };
        } else if (drawerMode.value === 'edit' && editingNodeId.value) {
            await axios.patch(`/api/admin/nodes/${editingNodeId.value}`, {
                ...form.value,
                location_id: form.value.location_id ? Number(form.value.location_id) : undefined,
            });
            message.value = { type: 'success', text: 'Node updated successfully' };
        }
        await fetchNodes();
        showDrawer.value = false;
        editingNodeId.value = null;
    } catch (e) {
        const err = e as { response?: { data?: { message?: string } } };
        message.value = { type: 'error', text: err?.response?.data?.message || 'Failed to save node' };
    } finally {
        formLoading.value = false;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}

onMounted(async () => {
    await fetchLocations();
    await fetchCurrentLocation();
    await fetchNodes();
});
watch([() => pagination.value.page, () => pagination.value.pageSize, searchQuery, locationIdParam], async () => {
    await fetchCurrentLocation();
    await fetchNodes();
});

function onPageChange(page: number) {
    pagination.value.page = page;
}

async function confirmDelete(node: Node) {
    deleting.value = true;
    let success = false;
    try {
        const response = await axios.delete(`/api/admin/nodes/${node.id}`);
        if (response.data && response.data.success) {
            message.value = { type: 'success', text: 'Node deleted successfully' };
            await fetchNodes();
            success = true;
        } else {
            message.value = { type: 'error', text: response.data?.message || 'Failed to delete node' };
        }
    } catch (e: unknown) {
        message.value = {
            type: 'error',
            text:
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Failed to delete node',
        };
    } finally {
        deleting.value = false;
        if (success) confirmDeleteRow.value = null;
        setTimeout(() => {
            message.value = null;
        }, 4000);
    }
}
function onDelete(node: Node) {
    confirmDeleteRow.value = node.id;
}
function onCancelDelete() {
    confirmDeleteRow.value = null;
}
</script>
