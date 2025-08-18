<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading server data...</span>
                </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
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
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load server</h3>
                <p class="text-sm text-muted-foreground max-w-sm">{{ error }}</p>
                <Button class="mt-4" @click="loadServerData">Try Again</Button>
            </div>

            <!-- Edit Server Form -->
            <div v-else class="p-6">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-8">
                        <h1 class="text-3xl font-bold">Edit Server</h1>
                        <p class="text-muted-foreground mt-2">Update server configuration and settings.</p>
                    </div>

                    <form class="space-y-6" @submit.prevent="submitEdit">
                        <!-- Core Details -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Core Details</h2>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="name" class="block mb-2 font-medium">Server Name</label>
                                    <Input
                                        id="name"
                                        v-model="form.name"
                                        placeholder="Server Name"
                                        :class="{ 'border-red-500': validationErrors.name }"
                                        required
                                    />
                                    <p v-if="validationErrors.name" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.name }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        Character limits: a-z A-Z 0-9 _ - . and [Space].
                                    </p>
                                </div>
                                <div>
                                    <label for="description" class="block mb-2 font-medium">Server Description</label>
                                    <Input
                                        id="description"
                                        v-model="form.description"
                                        placeholder="A brief description of this server."
                                        :class="{ 'border-red-500': validationErrors.description }"
                                        required
                                    />
                                    <p v-if="validationErrors.description" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.description }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        A brief description of this server.
                                    </p>
                                </div>
                            </div>
                            <div class="mt-6">
                                <label for="status" class="block mb-2 font-medium">Status</label>
                                <Popover v-model:open="statusPopoverOpen">
                                    <PopoverTrigger as-child>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            :aria-expanded="statusPopoverOpen"
                                            :class="
                                                cn(
                                                    'w-full justify-between',
                                                    validationErrors.status ? 'border-red-500' : '',
                                                )
                                            "
                                        >
                                            {{ getSelectedStatusName() || 'Select status...' }}
                                            <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent class="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search status..." />
                                            <CommandEmpty>No status found.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem
                                                    v-for="status in statusOptions"
                                                    :key="status.value"
                                                    :value="status.label"
                                                    @select="selectStatus(status.value)"
                                                >
                                                    <Check
                                                        :class="
                                                            cn(
                                                                'mr-2 h-4 w-4',
                                                                form.status === status.value
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0',
                                                            )
                                                        "
                                                    />
                                                    <div>
                                                        <div class="font-medium">{{ status.label }}</div>
                                                        <div class="text-xs text-muted-foreground">
                                                            {{ status.description }}
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <p v-if="validationErrors.status" class="text-xs text-red-500 mt-1">
                                    {{ validationErrors.status }}
                                </p>
                                <p v-else class="text-xs text-muted-foreground mt-1">Current status of the server.</p>
                            </div>
                            <div class="mt-6">
                                <div class="flex items-center space-x-2">
                                    <Checkbox id="skip_scripts" v-model:checked="form.skip_scripts" />
                                    <label
                                        for="skip_scripts"
                                        class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Skip Installation Scripts
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Resource Management -->
                        <div class="bg-card border rounded-lg p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-xl font-semibold">Resource Management</h2>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-muted-foreground">Preferences saved</span>
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label for="memory" class="block mb-2 font-medium">Memory</label>
                                    <div class="flex gap-2">
                                        <div class="relative flex-1">
                                            <Input
                                                id="memory"
                                                v-model.number="form.memory"
                                                type="number"
                                                placeholder="1024"
                                                min="128"
                                                :class="{ 'border-red-500': validationErrors.memory }"
                                                required
                                            />
                                            <span
                                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                                                >{{ memoryUnit }}</span
                                            >
                                        </div>
                                        <select
                                            v-model="memoryUnit"
                                            class="px-3 py-2 border rounded-md bg-background text-foreground"
                                        >
                                            <option value="MiB">MiB</option>
                                            <option value="MB">MB</option>
                                            <option value="GB">GB</option>
                                        </select>
                                    </div>
                                    <p v-if="validationErrors.memory" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.memory }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The maximum amount of memory allowed for this container. Setting this to 0 will
                                        allow unlimited memory usage.
                                    </p>
                                </div>
                                <div>
                                    <label for="swap" class="block mb-2 font-medium">Swap</label>
                                    <div class="flex gap-2">
                                        <div class="relative flex-1">
                                            <Input
                                                id="swap"
                                                v-model.number="form.swap"
                                                type="number"
                                                placeholder="0"
                                                min="0"
                                                :class="{ 'border-red-500': validationErrors.swap }"
                                                required
                                            />
                                            <span
                                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                                                >{{ swapUnit }}</span
                                            >
                                        </div>
                                        <select
                                            v-model="swapUnit"
                                            class="px-3 py-2 border rounded-md bg-background text-foreground"
                                        >
                                            <option value="MiB">MiB</option>
                                            <option value="MB">MB</option>
                                            <option value="GB">GB</option>
                                        </select>
                                    </div>
                                    <p v-if="validationErrors.swap" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.swap }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The maximum amount of swap allowed for this container. Setting this to 0 will
                                        disable swap space.
                                    </p>
                                </div>
                                <div>
                                    <label for="disk" class="block mb-2 font-medium">Disk Space</label>
                                    <div class="flex gap-2">
                                        <div class="relative flex-1">
                                            <Input
                                                id="disk"
                                                v-model.number="form.disk"
                                                type="number"
                                                placeholder="1024"
                                                min="1024"
                                                :class="{ 'border-red-500': validationErrors.disk }"
                                                required
                                            />
                                            <span
                                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                                                >{{ diskUnit }}</span
                                            >
                                        </div>
                                        <select
                                            v-model="diskUnit"
                                            class="px-3 py-2 border rounded-md bg-background text-foreground"
                                        >
                                            <option value="MiB">MiB</option>
                                            <option value="MB">MB</option>
                                            <option value="GB">GB</option>
                                        </select>
                                    </div>
                                    <p v-if="validationErrors.disk" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.disk }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The maximum amount of disk space allowed for this container. Setting this to 0
                                        will allow unlimited disk usage.
                                    </p>
                                </div>
                                <div>
                                    <label for="cpu" class="block mb-2 font-medium">CPU Limit</label>
                                    <div class="flex gap-2">
                                        <div class="relative flex-1">
                                            <Input
                                                id="cpu"
                                                v-model.number="form.cpu"
                                                type="number"
                                                placeholder="100"
                                                min="10"
                                                max="100"
                                                :class="{ 'border-red-500': validationErrors.cpu }"
                                                required
                                            />
                                            <span
                                                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                                                >{{ cpuUnit }}</span
                                            >
                                        </div>
                                        <select
                                            v-model="cpuUnit"
                                            class="px-3 py-2 border rounded-md bg-background text-foreground"
                                        >
                                            <option value="%">%</option>
                                            <option value="cores">Cores</option>
                                        </select>
                                    </div>
                                    <p v-if="validationErrors.cpu" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.cpu }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The maximum amount of CPU allowed for this container. Setting this to 0 will
                                        allow unlimited CPU usage.
                                    </p>
                                </div>
                                <div>
                                    <label for="io" class="block mb-2 font-medium">Block IO Weight</label>
                                    <Input
                                        id="io"
                                        v-model.number="form.io"
                                        type="number"
                                        placeholder="500"
                                        min="10"
                                        max="1000"
                                        :class="{ 'border-red-500': validationErrors.io }"
                                        required
                                    />
                                    <p v-if="validationErrors.io" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.io }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        Advanced: The IO performance of this server relative to other running
                                        containers. A value between 10 and 1000.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Application Feature Limits -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Application Feature Limits</h2>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label for="database_limit" class="block mb-2 font-medium">Database Limit</label>
                                    <Input
                                        id="database_limit"
                                        v-model.number="form.database_limit"
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">
                                        The total number of databases a user is allowed to create for this server.
                                    </p>
                                </div>
                                <div>
                                    <label for="allocation_limit" class="block mb-2 font-medium"
                                        >Allocation Limit</label
                                    >
                                    <Input
                                        id="allocation_limit"
                                        v-model.number="form.allocation_limit"
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">
                                        The total number of allocations a user is allowed to create for this server.
                                    </p>
                                </div>
                                <div>
                                    <label for="backup_limit" class="block mb-2 font-medium">Backup Limit</label>
                                    <Input
                                        id="backup_limit"
                                        v-model.number="form.backup_limit"
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                    />
                                    <p class="text-xs text-muted-foreground mt-1">
                                        The total number of backups that can be created for this server.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Startup Configuration -->
                        <div class="bg-card border rounded-lg p-6">
                            <h2 class="text-xl font-semibold mb-4">Startup Configuration</h2>
                            <div class="grid grid-cols-1 gap-6">
                                <div>
                                    <label for="startup-command" class="block mb-2 font-medium">Startup Command</label>
                                    <Input
                                        id="startup-command"
                                        v-model="form.startup"
                                        placeholder="java -jar server.jar"
                                        :class="{ 'border-red-500': validationErrors.startup }"
                                        required
                                    />
                                    <p v-if="validationErrors.startup" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.startup }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The command that will be used to start the server. The following data
                                        substitutes are available: <code>&#123;&#123;SERVER_MEMORY&#125;&#125;</code>,
                                        <code>&#123;&#123;SERVER_IP&#125;&#125;</code>,
                                        <code>&#123;&#123;SERVER_PORT&#125;&#125;</code>.
                                    </p>
                                </div>
                                <div>
                                    <label for="image" class="block mb-2 font-medium">Docker Image</label>
                                    <Input
                                        id="image"
                                        v-model="form.image"
                                        placeholder="quay.io/pterodactyl/core:java"
                                        :class="{ 'border-red-500': validationErrors.image }"
                                        required
                                    />
                                    <p v-if="validationErrors.image" class="text-xs text-red-500 mt-1">
                                        {{ validationErrors.image }}
                                    </p>
                                    <p v-else class="text-xs text-muted-foreground mt-1">
                                        The Docker image that will be used for this server.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Form Actions -->
                        <div class="flex justify-end gap-4">
                            <Button type="button" variant="outline" @click="$router.push('/admin/servers')">
                                Cancel
                            </Button>
                            <Button type="submit" :loading="submitting" class="bg-blue-600 hover:bg-blue-700">
                                Update Server
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown } from 'lucide-vue-next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Types
type EditForm = {
    name: string;
    description: string;
    status: string;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    startup: string;
    image: string;
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;
    skip_scripts: boolean;
};

type ApiServer = {
    id: number;
    uuid: string;
    uuidShort: string;
    node_id: number;
    name: string;
    description: string;
    status?: string;
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

type StatusOption = {
    value: string;
    label: string;
    description: string;
};

type AxiosError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

const router = useRouter();
const route = useRoute();

// Breadcrumbs
const breadcrumbs = [
    { text: 'Admin', to: '/admin' },
    { text: 'Servers', to: '/admin/servers' },
    { text: 'Edit', to: `/admin/servers/${route.params.id}/edit` },
];

// Loading states
const loading = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);

// Popover open states
const statusPopoverOpen = ref(false);

// Form data
const form = ref<EditForm>({
    name: '',
    description: '',
    status: '',
    memory: 1024,
    swap: 0,
    disk: 1024,
    io: 500,
    cpu: 100,
    startup: 'java -jar server.jar',
    image: 'quay.io/pterodactyl/core:java',
    database_limit: 0,
    allocation_limit: 0,
    backup_limit: 0,
    skip_scripts: false,
});

// Unit selectors
const memoryUnit = ref<'MiB' | 'MB' | 'GB'>('MiB');
const swapUnit = ref<'MiB' | 'MB' | 'GB'>('MiB');
const diskUnit = ref<'MiB' | 'MB' | 'GB'>('MiB');
const cpuUnit = ref<'%' | 'cores'>('%');

// Status options
const statusOptions: StatusOption[] = [
    { value: 'installing', label: 'Installing', description: 'Server is being installed' },
    { value: 'installed', label: 'Installed', description: 'Server has been installed' },
    { value: 'running', label: 'Running', description: 'Server is currently running' },
    { value: 'stopped', label: 'Stopped', description: 'Server has been stopped' },
    { value: 'suspended', label: 'Suspended', description: 'Server has been suspended' },
];

// Validation state
const validationErrors = ref<Record<string, string>>({});

// Load saved resource preferences
function loadResourcePreferences() {
    try {
        const saved = localStorage.getItem('featherpanel-resource-preferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            memoryUnit.value = preferences.memoryUnit || 'MiB';
            swapUnit.value = preferences.swapUnit || 'MiB';
            diskUnit.value = preferences.diskUnit || 'MiB';
            cpuUnit.value = preferences.cpuUnit || '%';
        }
    } catch (error) {
        console.error('Failed to load resource preferences:', error);
    }
}

// Save resource preferences
function saveResourcePreferences() {
    try {
        const preferences = {
            memoryUnit: memoryUnit.value,
            swapUnit: swapUnit.value,
            diskUnit: cpuUnit.value,
            cpuUnit: cpuUnit.value,
            defaultValues: {
                memory: form.value.memory,
                swap: form.value.swap,
                disk: form.value.disk,
                cpu: form.value.cpu,
                io: form.value.io,
            },
        };
        localStorage.setItem('featherpanel-resource-preferences', JSON.stringify(preferences));
    } catch (error) {
        console.error('Failed to save resource preferences:', error);
    }
}

// Conversion functions
function convertFromMiB(value: number, unit: 'MiB' | 'MB' | 'GB'): number {
    switch (unit) {
        case 'MiB':
            return value;
        case 'MB':
            return value;
        case 'GB':
            return value / 1024;
        default:
            return value;
    }
}

function convertFromPercentage(value: number, unit: '%' | 'cores'): number {
    switch (unit) {
        case '%':
            return value;
        case 'cores':
            return value / 100;
        default:
            return value;
    }
}

function convertToMiB(value: number, unit: 'MiB' | 'MB' | 'GB'): number {
    switch (unit) {
        case 'MiB':
            return value;
        case 'MB':
            return value;
        case 'GB':
            return value * 1024;
        default:
            return value;
    }
}

function convertToPercentage(value: number, unit: '%' | 'cores'): number {
    switch (unit) {
        case '%':
            return value;
        case 'cores':
            return value * 100;
        default:
            return value;
    }
}

// Get selected names for display
function getSelectedStatusName() {
    const selected = statusOptions.find((status) => status.value === form.value.status);
    return selected ? selected.label : '';
}

// Selection functions
function selectStatus(status: string) {
    form.value.status = status;
    statusPopoverOpen.value = false;
}

// Load server data
async function loadServerData() {
    loading.value = true;
    error.value = null;

    try {
        const serverId = route.params.id;
        const { data } = await axios.get(`/api/admin/servers/${serverId}`);

        if (data?.success && data.data.server) {
            const server: ApiServer = data.data.server;

            // Populate form with server data
            form.value = {
                name: server.name || '',
                description: server.description || '',
                status: server.status || 'installed',
                memory: server.memory || 1024,
                swap: server.swap || 0,
                disk: server.disk || 1024,
                io: server.io || 500,
                cpu: server.cpu || 100,
                startup: server.startup || 'java -jar server.jar',
                image: server.image || 'quay.io/pterodactyl/core:java',
                database_limit: server.database_limit || 0,
                allocation_limit: server.allocation_limit || 0,
                backup_limit: server.backup_limit || 0,
                skip_scripts: Boolean(server.skip_scripts),
            };

            // Convert values to display units
            form.value.memory = convertFromMiB(server.memory || 1024, memoryUnit.value);
            form.value.swap = convertFromMiB(server.swap || 0, swapUnit.value);
            form.value.disk = convertFromMiB(server.disk || 1024, diskUnit.value);
            form.value.cpu = convertFromPercentage(server.cpu || 100, cpuUnit.value);
        } else {
            error.value = 'Failed to load server data';
        }
    } catch (err: unknown) {
        console.error('Failed to load server data:', err);
        error.value = (err as AxiosError)?.response?.data?.message || 'Failed to load server data';
    } finally {
        loading.value = false;
    }
}

// Validation function
function validateForm(): boolean {
    validationErrors.value = {};

    // Required fields validation with regex patterns
    if (!form.value.name?.trim()) {
        validationErrors.value.name = 'Server name is required';
    } else if (form.value.name.length < 1 || form.value.name.length > 191) {
        validationErrors.value.name = 'Server name must be between 1 and 191 characters';
    } else {
        // Server name regex: a-z A-Z 0-9 _ - . and spaces
        const nameRegex = /^[a-zA-Z0-9_\-s.]+$/;
        if (!nameRegex.test(form.value.name)) {
            validationErrors.value.name =
                'Server name can only contain letters, numbers, spaces, hyphens, underscores, and dots';
        }
    }

    if (!form.value.description?.trim()) {
        validationErrors.value.description = 'Server description is required';
    } else if (form.value.description.length < 1 || form.value.description.length > 65535) {
        validationErrors.value.description = 'Server description must be between 1 and 65535 characters';
    } else {
        // Description regex: Allow letters, numbers, spaces, punctuation, but no special characters that could cause issues
        const descriptionRegex = /^[a-zA-Z0-9\s\-_.,!?(){}[\]"'`~@#$%^&*+=|\\/:;<>]+$/;
        if (!descriptionRegex.test(form.value.description)) {
            validationErrors.value.description = 'Description contains invalid characters';
        }
    }

    if (!form.value.status) {
        validationErrors.value.status = 'Server status is required';
    }

    if (!form.value.startup?.trim()) {
        validationErrors.value.startup = 'Startup command is required';
    } else if (form.value.startup.length < 1 || form.value.startup.length > 65535) {
        validationErrors.value.startup = 'Startup command must be between 1 and 65535 characters';
    } else {
        // Startup command regex: Allow letters, numbers, spaces, common command characters, and variable placeholders
        const startupRegex = /^[a-zA-Z0-9\s\-_.,!?(){}[\]"'`~@#$%^&*+=|\\/:;<>{}]+$/;
        if (!startupRegex.test(form.value.startup)) {
            validationErrors.value.startup = 'Startup command contains invalid characters';
        }
    }

    if (!form.value.image?.trim()) {
        validationErrors.value.image = 'Docker image is required';
    } else if (form.value.image.length < 1 || form.value.image.length > 191) {
        validationErrors.value.image = 'Docker image must be between 1 and 191 characters';
    }

    // Resource validation
    if (form.value.memory < 128) {
        validationErrors.value.memory = 'Memory must be at least 128 MB';
    } else if (form.value.memory > 1048576) {
        // 1TB in MB
        validationErrors.value.memory = 'Memory cannot exceed 1TB (1048576 MB)';
    }

    if (form.value.swap < 0) {
        validationErrors.value.swap = 'Swap cannot be negative';
    } else if (form.value.swap > 1048576) {
        // 1TB in MB
        validationErrors.value.swap = 'Swap cannot exceed 1TB (1048576 MB)';
    }

    if (form.value.disk < 1024) {
        validationErrors.value.disk = 'Disk must be at least 1024 MB';
    } else if (form.value.disk > 1048576) {
        // 1TB in MB
        validationErrors.value.disk = 'Disk cannot exceed 1TB (1048576 MB)';
    }

    if (form.value.io < 10 || form.value.io > 1000) {
        validationErrors.value.io = 'IO must be between 10 and 1000';
    }

    if (form.value.cpu < 10 || form.value.cpu > 100) {
        validationErrors.value.cpu = 'CPU must be between 10% and 100%';
    }

    // Feature limits validation
    if (form.value.database_limit < 0) {
        validationErrors.value.database_limit = 'Database limit cannot be negative';
    } else if (form.value.database_limit > 1000) {
        validationErrors.value.database_limit = 'Database limit cannot exceed 1000';
    }

    if (form.value.allocation_limit < 0) {
        validationErrors.value.allocation_limit = 'Allocation limit cannot be negative';
    } else if (form.value.allocation_limit > 1000) {
        validationErrors.value.allocation_limit = 'Allocation limit cannot exceed 1000';
    }

    if (form.value.backup_limit < 0) {
        validationErrors.value.backup_limit = 'Backup limit cannot be negative';
    } else if (form.value.backup_limit > 1000) {
        validationErrors.value.backup_limit = 'Backup limit cannot exceed 1000';
    }

    return Object.keys(validationErrors.value).length === 0;
}

// Submit form
async function submitEdit() {
    // Clear previous validation errors
    validationErrors.value = {};

    // Validate form
    if (!validateForm()) {
        console.log('Validation errors:', validationErrors.value);
        return;
    }

    submitting.value = true;
    try {
        const serverId = route.params.id;

        // Convert values to API format
        const submitData = {
            name: form.value.name,
            description: form.value.description,
            status: form.value.status,
            memory: convertToMiB(form.value.memory, memoryUnit.value),
            swap: convertToMiB(form.value.swap, swapUnit.value),
            disk: convertToMiB(form.value.disk, diskUnit.value),
            io: form.value.io,
            cpu: convertToPercentage(form.value.cpu, cpuUnit.value),
            startup: form.value.startup,
            image: form.value.image,
            database_limit: form.value.database_limit,
            allocation_limit: form.value.allocation_limit,
            backup_limit: form.value.backup_limit,
            skip_scripts: form.value.skip_scripts,
        };

        const { data } = await axios.patch(`/api/admin/servers/${serverId}`, submitData);
        if (data && data.success) {
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className =
                'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
            successMessage.textContent = 'Server updated successfully!';
            document.body.appendChild(successMessage);

            setTimeout(() => {
                document.body.removeChild(successMessage);
                router.push('/admin/servers');
            }, 2000);
        } else {
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
            errorMessage.textContent = data?.message || 'Failed to update server.';
            document.body.appendChild(errorMessage);

            setTimeout(() => {
                document.body.removeChild(errorMessage);
            }, 5000);
        }
    } catch (err: unknown) {
        console.error('Failed to update server:', err);
        // Show error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        errorMessage.textContent = (err as AxiosError)?.response?.data?.message || 'Failed to update server.';
        document.body.appendChild(errorMessage);

        setTimeout(() => {
            document.body.removeChild(errorMessage);
        }, 5000);
    } finally {
        submitting.value = false;
    }
}

onMounted(() => {
    loadServerData();
    loadResourcePreferences();
});

// Watch for changes in form.value and save preferences
watch(
    form,
    () => {
        saveResourcePreferences();
    },
    { deep: true },
);

// Watch for changes in unit selectors
watch([memoryUnit, swapUnit, diskUnit, cpuUnit], () => {
    saveResourcePreferences();
});
</script>
