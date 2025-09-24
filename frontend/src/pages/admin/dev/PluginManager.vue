<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from 'vue-toastification';

interface Plugin {
    name: string;
    identifier: string;
    description: string;
    version: string;
    target?: string;
    author: string[];
    flags: string[];
    dependencies: string[];
    requiredConfigs: string[];
    config?: ConfigField[];
    icon: string;
    status: string;
    dependencies_met: boolean;
    required_configs_set: boolean;
    settings: Array<{
        key: string;
        value: string;
        locked: boolean;
    }>;
    files: Array<{
        name: string;
        path: string;
        size: number;
        modified: string;
        type: string;
    }>;
}

interface PluginResponse {
    success: boolean;
    data: Plugin[];
    message?: string;
}

interface CreatePluginData {
    identifier: string;
    name: string;
    description: string;
    version: string;
    target: string;
    author: string[];
    flags: string[];
    dependencies: DependencyItem[];
    requiredConfigs: ConfigField[];
}

interface DependencyItem {
    type: 'php' | 'php-ext' | 'composer' | 'plugin';
    value: string;
}

interface ConfigField {
    name: string;
    display_name: string;
    type: 'text' | 'email' | 'url' | 'password' | 'number' | 'boolean';
    description: string;
    required: boolean;
    validation: {
        regex?: string;
        message?: string;
        min?: number;
        max?: number;
    };
    default: string;
}

const plugins = ref<Plugin[]>([]);
const isLoading = ref(false);
const showCreateDialog = ref(false);
const showDetailsDialog = ref(false);
const selectedPlugin = ref<Plugin | null>(null);
// Removed unused availableFlags variable

const toast = useToast();

const createForm = ref<CreatePluginData>({
    identifier: '',
    name: '',
    description: '',
    version: '1.0.0',
    target: 'v2',
    author: [''],
    flags: [],
    dependencies: [],
    requiredConfigs: [],
});

const editForm = ref<CreatePluginData>({
    identifier: '',
    name: '',
    description: '',
    version: '1.0.0',
    target: 'v2',
    author: [''],
    flags: [],
    dependencies: [],
    requiredConfigs: [],
});

const showEditDialog = ref(false);
const editingPlugin = ref<Plugin | null>(null);

const settingsForm = ref<Record<string, string>>({});

// Available plugin flags
const pluginFlags = [
    'hasInstallScript',
    'hasRemovalScript',
    'hasUpdateScript',
    'developerIgnoreInstallScript',
    'developerEscalateInstallScript',
    'userEscalateInstallScript',
    'hasEvents',
];

// Available dependency types and values
const dependencyTypes = [
    { value: 'php', label: 'PHP Version' },
    { value: 'php-ext', label: 'PHP Extension' },
    { value: 'composer', label: 'Composer Package' },
    { value: 'plugin', label: 'Plugin' },
];

const phpVersions = ['8.0', '8.1', '8.2', '8.3', '8.4'];
const phpExtensions = ['pdo', 'curl', 'json', 'mbstring', 'gd', 'zip', 'xml', 'openssl', 'sqlite3', 'mysql', 'pgsql'];
const composerPackages = ['laravel/framework', 'symfony/console', 'monolog/monolog', 'guzzlehttp/guzzle'];

// Available targets
const availableTargets = ['v1', 'v2'];

// Available field types for config
const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'password', label: 'Password' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
];

const filteredPlugins = computed(() => {
    return plugins.value;
});

const configFields = computed(() => {
    if (!selectedPlugin.value?.config) return [];
    return selectedPlugin.value.config as ConfigField[];
});

const hasConfigSchema = computed(() => {
    const schema = selectedPlugin.value?.config;
    return schema && Array.isArray(schema) && schema.length > 0;
});

async function fetchPlugins() {
    isLoading.value = true;
    try {
        const resp = await fetch('/api/admin/plugin-manager');
        const json: PluginResponse = await resp.json();

        if (json.success) {
            plugins.value = json.data;
        } else {
            toast.error('Failed to fetch plugins: ' + (json.message || 'Unknown error'));
        }
    } catch (e) {
        console.error('Failed to fetch plugins:', e);
        toast.error('Failed to fetch plugins: Network error');
    } finally {
        isLoading.value = false;
    }
}

// Auto-generate identifier from name
function generateIdentifier(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '')
        .substring(0, 32); // Allow up to 32 characters
}

// Watch for name changes to auto-generate identifier
function updateIdentifier() {
    if (createForm.value.name) {
        createForm.value.identifier = generateIdentifier(createForm.value.name);
    }
}

async function createPlugin() {
    if (!createForm.value.identifier || !createForm.value.name) {
        toast.error('Identifier and name are required');
        return;
    }

    // Convert dependencies to the format expected by the backend
    const formattedData = {
        ...createForm.value,
        dependencies: createForm.value.dependencies.map((dep) => `${dep.type}=${dep.value}`),
        requiredConfigs: createForm.value.requiredConfigs.map((config) => config.name),
        configSchema: createForm.value.requiredConfigs,
    };

    isLoading.value = true;
    try {
        const resp = await fetch('/api/admin/plugin-manager', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedData),
        });

        const json = await resp.json();

        if (json.success) {
            toast.success('Plugin created successfully');
            showCreateDialog.value = false;
            resetCreateForm();
            await fetchPlugins();
        } else {
            toast.error('Failed to create plugin: ' + (json.message || 'Unknown error'));
        }
    } catch (e) {
        console.error('Failed to create plugin:', e);
        toast.error('Failed to create plugin: Network error');
    } finally {
        isLoading.value = false;
    }
}

async function updatePlugin() {
    if (!editingPlugin.value) return;

    // Convert dependencies to the format expected by the backend
    const formattedData = {
        ...editForm.value,
        dependencies: editForm.value.dependencies.map((dep) => `${dep.type}=${dep.value}`),
        requiredConfigs: editForm.value.requiredConfigs.map((config) => config.name),
        configSchema: editForm.value.requiredConfigs,
    };

    isLoading.value = true;
    try {
        const resp = await fetch(`/api/admin/plugin-manager/${editingPlugin.value.identifier}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedData),
        });

        const json = await resp.json();

        if (json.success) {
            toast.success('Plugin updated successfully');
            showEditDialog.value = false;
            editingPlugin.value = null;
            await fetchPlugins();
        } else {
            toast.error('Failed to update plugin: ' + (json.message || 'Unknown error'));
        }
    } catch (e) {
        console.error('Failed to update plugin:', e);
        toast.error('Failed to update plugin: Network error');
    } finally {
        isLoading.value = false;
    }
}

async function showPluginDetails(plugin: Plugin) {
    selectedPlugin.value = plugin;

    // Load plugin settings into form
    settingsForm.value = {};
    plugin.settings.forEach((setting) => {
        settingsForm.value[setting.key] = setting.value;
    });

    showDetailsDialog.value = true;
}

async function updatePluginSettings() {
    if (!selectedPlugin.value || !settingsForm.value) {
        return;
    }

    isLoading.value = true;

    try {
        // Save each setting individually using the main plugins API
        const savePromises = Object.entries(settingsForm.value).map(async ([key, value]) => {
            const response = await fetch(`/api/admin/plugins/${selectedPlugin.value!.identifier}/settings/set`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ key, value }),
            });

            if (!response.ok) {
                throw new Error(`Failed to save setting ${key}: HTTP ${response.status}`);
            }
        });

        await Promise.all(savePromises);

        // Reload plugin data
        await fetchPlugins();

        toast.success('All settings saved successfully');
    } catch (error) {
        console.error('Failed to save settings:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
        isLoading.value = false;
    }
}

function resetCreateForm() {
    createForm.value = {
        identifier: '',
        name: '',
        description: '',
        version: '1.0.0',
        target: 'v2',
        author: [''],
        flags: [],
        dependencies: [],
        requiredConfigs: [],
    };
}

// Removed unused resetEditForm function

function addAuthor() {
    createForm.value.author.push('');
}

function removeAuthor(index: number) {
    createForm.value.author.splice(index, 1);
}

function addDependency() {
    createForm.value.dependencies.push({ type: 'php', value: '' });
}

function removeDependency(index: number) {
    createForm.value.dependencies.splice(index, 1);
}

function addEditDependency() {
    editForm.value.dependencies.push({ type: 'php', value: '' });
}

function removeEditDependency(index: number) {
    editForm.value.dependencies.splice(index, 1);
}

function editPlugin(plugin: Plugin) {
    editingPlugin.value = plugin;

    // Convert dependencies from string format to object format
    const dependencies: DependencyItem[] = plugin.dependencies.map((dep) => {
        const [type, value] = dep.split('=');
        return { type: type as 'php' | 'php-ext' | 'composer' | 'plugin', value: value || '' };
    });

    // Debug: Log the plugin config to see what we're working with
    console.log('Plugin config for editing:', plugin.config);

    editForm.value = {
        identifier: plugin.identifier,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        target: plugin.target || 'v2',
        author: [...plugin.author],
        flags: [...plugin.flags],
        dependencies,
        requiredConfigs:
            plugin.config && Array.isArray(plugin.config)
                ? plugin.config.map((config) => ({
                      name: config.name || '',
                      display_name: config.display_name || '',
                      type: config.type || 'text',
                      description: config.description || '',
                      required: config.required !== undefined ? config.required : true,
                      validation: config.validation || {},
                      default: config.default || '',
                  }))
                : [],
    };

    showEditDialog.value = true;
}

function addRequiredConfig() {
    createForm.value.requiredConfigs.push({
        name: '',
        display_name: '',
        type: 'text',
        description: '',
        required: true,
        validation: {},
        default: '',
    });
}

function removeRequiredConfig(index: number) {
    createForm.value.requiredConfigs.splice(index, 1);
}

function addFlag() {
    createForm.value.flags.push('');
}

function removeFlag(index: number) {
    createForm.value.flags.splice(index, 1);
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getStatusColor(status: string): string {
    switch (status) {
        case 'installed':
            return 'bg-green-500';
        case 'enabled':
            return 'bg-blue-500';
        case 'disabled':
            return 'bg-gray-500';
        case 'error':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
}

onMounted(() => {
    fetchPlugins();
});
</script>

<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Dev', href: '/admin/dev' },
            { text: 'Plugin Manager', isCurrent: true, href: '/admin/dev/plugins' },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-6 space-y-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">Plugin Manager</h1>
                        <p class="text-muted-foreground">Create and manage FeatherPanel plugins</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <Button variant="outline" :disabled="isLoading" @click="fetchPlugins"> Refresh </Button>
                        <Button @click="showCreateDialog = true"> Create Plugin </Button>
                    </div>
                </div>

                <!-- Plugins List -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card v-for="plugin in filteredPlugins" :key="plugin.identifier" class="p-6">
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <span class="text-primary font-bold text-lg">
                                        {{ plugin.name.charAt(0).toUpperCase() }}
                                    </span>
                                </div>
                                <div>
                                    <h3 class="font-semibold text-lg">{{ plugin.name }}</h3>
                                    <p class="text-sm text-muted-foreground">{{ plugin.identifier }}</p>
                                </div>
                            </div>
                            <Badge :class="getStatusColor(plugin.status)">
                                {{ plugin.status }}
                            </Badge>
                        </div>

                        <p class="text-sm text-muted-foreground mb-4">{{ plugin.description }}</p>

                        <div class="space-y-2 mb-4">
                            <div class="flex items-center justify-between text-sm">
                                <span>Version:</span>
                                <span class="font-medium">{{ plugin.version }}</span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span>Author:</span>
                                <span class="font-medium">{{ plugin.author.join(', ') }}</span>
                            </div>
                            <div class="flex items-center justify-between text-sm">
                                <span>Files:</span>
                                <span class="font-medium">{{ plugin.files.length }}</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 mb-4">
                            <Badge v-if="plugin.dependencies_met" variant="outline" class="text-green-600">
                                Dependencies OK
                            </Badge>
                            <Badge v-else variant="outline" class="text-red-600"> Dependencies Missing </Badge>
                            <Badge v-if="plugin.required_configs_set" variant="outline" class="text-green-600">
                                Configured
                            </Badge>
                            <Badge v-else variant="outline" class="text-yellow-600"> Needs Config </Badge>
                        </div>

                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" @click="showPluginDetails(plugin)"> Details </Button>
                            <Button variant="outline" size="sm" @click="editPlugin(plugin)"> Edit </Button>
                        </div>
                    </Card>
                </div>

                <!-- Empty State -->
                <div v-if="!isLoading && plugins.length === 0" class="text-center py-12">
                    <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <span class="text-2xl">🔌</span>
                    </div>
                    <h3 class="text-lg font-semibold mb-2">No plugins found</h3>
                    <p class="text-muted-foreground mb-4">Create your first plugin to get started</p>
                    <Button @click="showCreateDialog = true"> Create Plugin </Button>
                </div>
            </div>
        </div>

        <!-- Create Plugin Dialog -->
        <div v-if="showCreateDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card class="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-semibold">Create New Plugin</h2>
                        <Button variant="ghost" size="sm" @click="showCreateDialog = false"> ✕ </Button>
                    </div>

                    <div class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium mb-2 block">Name *</label>
                                <Input
                                    v-model="createForm.name"
                                    placeholder="My Awesome Plugin"
                                    maxlength="32"
                                    @input="updateIdentifier"
                                />
                            </div>
                            <div>
                                <label class="text-sm font-medium mb-2 block">Identifier *</label>
                                <Input
                                    v-model="createForm.identifier"
                                    placeholder="my-awesome-plugin"
                                    maxlength="32"
                                    class="lowercase"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Must be unique, lowercase, and contain only letters, numbers, and hyphens
                                </p>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Description</label>
                            <Textarea
                                v-model="createForm.description"
                                placeholder="A brief description of what this plugin does..."
                                rows="3"
                            />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium mb-2 block">Version</label>
                                <Input v-model="createForm.version" placeholder="1.0.0" />
                            </div>
                            <div>
                                <label class="text-sm font-medium mb-2 block">Target</label>
                                <Select v-model="createForm.target">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select target version" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="target in availableTargets" :key="target" :value="target">
                                            {{ target }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Authors</label>
                            <div class="space-y-2">
                                <div v-for="(author, index) in createForm.author" :key="index" class="flex gap-2">
                                    <Input
                                        v-model="createForm.author[index]"
                                        placeholder="Author name"
                                        class="flex-1"
                                    />
                                    <Button
                                        v-if="createForm.author.length > 1"
                                        variant="outline"
                                        size="sm"
                                        @click="removeAuthor(index)"
                                    >
                                        Remove
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" @click="addAuthor"> Add Author </Button>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Plugin Flags</label>
                            <div class="space-y-2">
                                <div v-for="(flag, index) in createForm.flags" :key="index" class="flex gap-2">
                                    <Select v-model="createForm.flags[index]" class="flex-1">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a flag" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="availableFlag in pluginFlags"
                                                :key="availableFlag"
                                                :value="availableFlag"
                                            >
                                                {{ availableFlag }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" @click="removeFlag(index)"> Remove </Button>
                                </div>
                                <Button variant="outline" size="sm" @click="addFlag"> Add Flag </Button>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Dependencies</label>
                            <div class="space-y-2">
                                <div v-for="(dep, index) in createForm.dependencies" :key="index" class="flex gap-2">
                                    <Select v-model="dep.type" class="w-32">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="type in dependencyTypes"
                                                :key="type.value"
                                                :value="type.value"
                                            >
                                                {{ type.label }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div v-if="dep.type === 'php'" class="flex-1">
                                        <Select v-model="dep.value">
                                            <SelectTrigger>
                                                <SelectValue placeholder="PHP Version" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem
                                                    v-for="version in phpVersions"
                                                    :key="version"
                                                    :value="version"
                                                >
                                                    {{ version }}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            v-model="dep.value"
                                            placeholder="Or enter custom version (e.g., 8.1.5)"
                                            class="mt-1"
                                        />
                                    </div>
                                    <div v-else-if="dep.type === 'php-ext'" class="flex-1">
                                        <Select v-model="dep.value">
                                            <SelectTrigger>
                                                <SelectValue placeholder="PHP Extension" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem v-for="ext in phpExtensions" :key="ext" :value="ext">
                                                    {{ ext }}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            v-model="dep.value"
                                            placeholder="Or enter custom extension"
                                            class="mt-1"
                                        />
                                    </div>
                                    <div v-else-if="dep.type === 'composer'" class="flex-1">
                                        <Select v-model="dep.value">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Composer Package" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem v-for="pkg in composerPackages" :key="pkg" :value="pkg">
                                                    {{ pkg }}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            v-model="dep.value"
                                            placeholder="Or enter custom package (vendor/package)"
                                            class="mt-1"
                                        />
                                    </div>
                                    <Input
                                        v-else-if="dep.type === 'plugin'"
                                        v-model="dep.value"
                                        placeholder="Plugin identifier"
                                        class="flex-1"
                                    />
                                    <Button variant="outline" size="sm" @click="removeDependency(index)">
                                        Remove
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" @click="addDependency"> Add Dependency </Button>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Configuration Fields</label>
                            <div class="space-y-4">
                                <div
                                    v-for="(config, index) in createForm.requiredConfigs"
                                    :key="index"
                                    class="p-4 border rounded-lg space-y-3"
                                >
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-medium">Configuration Field {{ index + 1 }}</h4>
                                        <Button variant="outline" size="sm" @click="removeRequiredConfig(index)">
                                            Remove
                                        </Button>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Field Name *</label>
                                            <Input v-model="config.name" placeholder="api_key" class="text-sm" />
                                        </div>
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Display Name *</label>
                                            <Input
                                                v-model="config.display_name"
                                                placeholder="API Key"
                                                class="text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Field Type</label>
                                            <Select v-model="config.type">
                                                <SelectTrigger class="text-sm">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem
                                                        v-for="type in fieldTypes"
                                                        :key="type.value"
                                                        :value="type.value"
                                                    >
                                                        {{ type.label }}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Default Value</label>
                                            <Input
                                                v-model="config.default"
                                                placeholder="Default value"
                                                class="text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label class="text-xs font-medium mb-1 block">Description</label>
                                        <Textarea
                                            v-model="config.description"
                                            placeholder="Describe what this configuration field is used for..."
                                            rows="2"
                                            class="text-sm"
                                        />
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-xs font-medium mb-1 block"
                                                >Validation Regex (optional)</label
                                            >
                                            <Input
                                                v-model="config.validation.regex"
                                                placeholder="/^[a-zA-Z0-9]+$/"
                                                class="text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Validation Message</label>
                                            <Input
                                                v-model="config.validation.message"
                                                placeholder="Error message for validation"
                                                class="text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <input :id="`required-${index}`" v-model="config.required" type="checkbox" />
                                        <label :for="`required-${index}`" class="text-sm">Required field</label>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" @click="addRequiredConfig">
                                    Add Configuration Field
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-2 mt-6">
                        <Button variant="outline" @click="showCreateDialog = false"> Cancel </Button>
                        <Button :disabled="isLoading" @click="createPlugin"> Create Plugin </Button>
                    </div>
                </div>
            </Card>
        </div>

        <!-- Edit Plugin Dialog -->
        <div
            v-if="showEditDialog && editingPlugin"
            class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
            <Card class="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-semibold">Edit Plugin: {{ editingPlugin.name }}</h2>
                        <Button variant="ghost" size="sm" @click="showEditDialog = false"> ✕ </Button>
                    </div>

                    <div class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium mb-2 block">Identifier</label>
                                <Input v-model="editForm.identifier" disabled class="bg-muted" />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Identifier cannot be changed after creation
                                </p>
                            </div>
                            <div>
                                <label class="text-sm font-medium mb-2 block">Name *</label>
                                <Input v-model="editForm.name" placeholder="My Awesome Plugin" maxlength="32" />
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Description</label>
                            <Textarea
                                v-model="editForm.description"
                                placeholder="A brief description of what this plugin does..."
                                rows="3"
                            />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium mb-2 block">Version</label>
                                <Input v-model="editForm.version" placeholder="1.0.0" />
                            </div>
                            <div>
                                <label class="text-sm font-medium mb-2 block">Target</label>
                                <Select v-model="editForm.target">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select target version" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem v-for="target in availableTargets" :key="target" :value="target">
                                            {{ target }}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Authors</label>
                            <div class="space-y-2">
                                <div v-for="(author, index) in editForm.author" :key="index" class="flex gap-2">
                                    <Input v-model="editForm.author[index]" placeholder="Author name" class="flex-1" />
                                    <Button
                                        v-if="editForm.author.length > 1"
                                        variant="outline"
                                        size="sm"
                                        @click="editForm.author.splice(index, 1)"
                                    >
                                        Remove
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" @click="editForm.author.push('')">
                                    Add Author
                                </Button>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Plugin Flags</label>
                            <div class="space-y-2">
                                <div v-for="(flag, index) in editForm.flags" :key="index" class="flex gap-2">
                                    <Select v-model="editForm.flags[index]" class="flex-1">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a flag" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="availableFlag in pluginFlags"
                                                :key="availableFlag"
                                                :value="availableFlag"
                                            >
                                                {{ availableFlag }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" @click="editForm.flags.splice(index, 1)">
                                        Remove
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" @click="editForm.flags.push('')"> Add Flag </Button>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Dependencies</label>
                            <div class="space-y-2">
                                <div v-for="(dep, index) in editForm.dependencies" :key="index" class="flex gap-2">
                                    <Select v-model="dep.type" class="w-32">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="type in dependencyTypes"
                                                :key="type.value"
                                                :value="type.value"
                                            >
                                                {{ type.label }}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <div v-if="dep.type === 'php'" class="flex-1">
                                        <Select v-model="dep.value">
                                            <SelectTrigger>
                                                <SelectValue placeholder="PHP Version" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem
                                                    v-for="version in phpVersions"
                                                    :key="version"
                                                    :value="version"
                                                >
                                                    {{ version }}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            v-model="dep.value"
                                            placeholder="Or enter custom version (e.g., 8.1.5)"
                                            class="mt-1"
                                        />
                                    </div>
                                    <div v-else-if="dep.type === 'php-ext'" class="flex-1">
                                        <Select v-model="dep.value">
                                            <SelectTrigger>
                                                <SelectValue placeholder="PHP Extension" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem v-for="ext in phpExtensions" :key="ext" :value="ext">
                                                    {{ ext }}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            v-model="dep.value"
                                            placeholder="Or enter custom extension"
                                            class="mt-1"
                                        />
                                    </div>
                                    <div v-else-if="dep.type === 'composer'" class="flex-1">
                                        <Select v-model="dep.value">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Composer Package" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem v-for="pkg in composerPackages" :key="pkg" :value="pkg">
                                                    {{ pkg }}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            v-model="dep.value"
                                            placeholder="Or enter custom package (vendor/package)"
                                            class="mt-1"
                                        />
                                    </div>
                                    <Input
                                        v-else-if="dep.type === 'plugin'"
                                        v-model="dep.value"
                                        placeholder="Plugin identifier"
                                        class="flex-1"
                                    />
                                    <Button variant="outline" size="sm" @click="removeEditDependency(index)">
                                        Remove
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" @click="addEditDependency"> Add Dependency </Button>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Configuration Fields</label>
                            <div class="space-y-4">
                                <div
                                    v-for="(config, index) in editForm.requiredConfigs"
                                    :key="index"
                                    class="p-4 border rounded-lg space-y-3"
                                >
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-medium">Configuration Field {{ index + 1 }}</h4>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            @click="editForm.requiredConfigs.splice(index, 1)"
                                        >
                                            Remove
                                        </Button>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Field Name *</label>
                                            <Input v-model="config.name" placeholder="api_key" class="text-sm" />
                                        </div>
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Display Name *</label>
                                            <Input
                                                v-model="config.display_name"
                                                placeholder="API Key"
                                                class="text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Field Type</label>
                                            <Select v-model="config.type">
                                                <SelectTrigger class="text-sm">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem
                                                        v-for="type in fieldTypes"
                                                        :key="type.value"
                                                        :value="type.value"
                                                    >
                                                        {{ type.label }}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Default Value</label>
                                            <Input
                                                v-model="config.default"
                                                placeholder="Default value"
                                                class="text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label class="text-xs font-medium mb-1 block">Description</label>
                                        <Textarea
                                            v-model="config.description"
                                            placeholder="Describe what this configuration field is used for..."
                                            rows="2"
                                            class="text-sm"
                                        />
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-xs font-medium mb-1 block"
                                                >Validation Regex (optional)</label
                                            >
                                            <Input
                                                v-model="config.validation.regex"
                                                placeholder="/^[a-zA-Z0-9]+$/"
                                                class="text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label class="text-xs font-medium mb-1 block">Validation Message</label>
                                            <Input
                                                v-model="config.validation.message"
                                                placeholder="Error message for validation"
                                                class="text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <input
                                            :id="`edit-required-${index}`"
                                            v-model="config.required"
                                            type="checkbox"
                                        />
                                        <label :for="`edit-required-${index}`" class="text-sm">Required field</label>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    @click="
                                        editForm.requiredConfigs.push({
                                            name: '',
                                            display_name: '',
                                            type: 'text',
                                            description: '',
                                            required: true,
                                            validation: {},
                                            default: '',
                                        })
                                    "
                                >
                                    Add Configuration Field
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-2 mt-6">
                        <Button variant="outline" @click="showEditDialog = false"> Cancel </Button>
                        <Button :disabled="isLoading" @click="updatePlugin"> Update Plugin </Button>
                    </div>
                </div>
            </Card>
        </div>

        <!-- Plugin Details Dialog -->
        <div
            v-if="showDetailsDialog && selectedPlugin"
            class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
            <Card class="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-semibold">{{ selectedPlugin.name }} Details</h2>
                        <Button variant="ghost" size="sm" @click="showDetailsDialog = false"> ✕ </Button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Plugin Info -->
                        <div class="space-y-4">
                            <h3 class="font-semibold">Plugin Information</h3>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span class="text-sm text-muted-foreground">Identifier:</span>
                                    <span class="text-sm font-medium">{{ selectedPlugin.identifier }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-sm text-muted-foreground">Version:</span>
                                    <span class="text-sm font-medium">{{ selectedPlugin.version }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-sm text-muted-foreground">Author:</span>
                                    <span class="text-sm font-medium">{{ selectedPlugin.author.join(', ') }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-sm text-muted-foreground">Status:</span>
                                    <Badge :class="getStatusColor(selectedPlugin.status)">
                                        {{ selectedPlugin.status }}
                                    </Badge>
                                </div>
                            </div>

                            <Separator />

                            <h3 class="font-semibold">Flags</h3>
                            <div class="flex flex-wrap gap-1">
                                <Badge v-for="flag in selectedPlugin.flags" :key="flag" variant="outline">
                                    {{ flag }}
                                </Badge>
                            </div>

                            <Separator />

                            <h3 class="font-semibold">Dependencies</h3>
                            <div class="space-y-1">
                                <div v-for="dep in selectedPlugin.dependencies" :key="dep" class="text-sm">
                                    {{ dep }}
                                </div>
                                <div
                                    v-if="selectedPlugin.dependencies.length === 0"
                                    class="text-sm text-muted-foreground"
                                >
                                    No dependencies
                                </div>
                            </div>
                        </div>

                        <!-- Files and Settings -->
                        <div class="space-y-4">
                            <h3 class="font-semibold">Files</h3>
                            <div class="max-h-48 overflow-y-auto space-y-1">
                                <div
                                    v-for="file in selectedPlugin.files"
                                    :key="file.path"
                                    class="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                                >
                                    <div>
                                        <span class="font-medium">{{ file.name }}</span>
                                        <span class="text-muted-foreground ml-2">({{ file.type }})</span>
                                    </div>
                                    <span class="text-muted-foreground">{{ formatFileSize(file.size) }}</span>
                                </div>
                            </div>

                            <Separator />

                            <h3 class="font-semibold">Configuration</h3>
                            <div class="space-y-4">
                                <!-- Enhanced Config Fields -->
                                <div v-if="hasConfigSchema" class="space-y-3">
                                    <div v-for="field in configFields" :key="field.name" class="space-y-2">
                                        <div class="flex items-center justify-between">
                                            <label class="text-sm font-medium">{{ field.display_name }}</label>
                                            <Badge v-if="field.required" variant="secondary" class="text-xs"
                                                >Required</Badge
                                            >
                                        </div>
                                        <div class="relative">
                                            <Input
                                                v-if="
                                                    field.type === 'text' ||
                                                    field.type === 'url' ||
                                                    field.type === 'email'
                                                "
                                                v-model="settingsForm[field.name]"
                                                :type="field.type === 'email' ? 'email' : 'text'"
                                                :placeholder="
                                                    field.default || `Enter ${field.display_name.toLowerCase()}`
                                                "
                                                class="flex-1"
                                            />
                                            <Input
                                                v-else-if="field.type === 'password'"
                                                v-model="settingsForm[field.name]"
                                                type="password"
                                                :placeholder="
                                                    field.default || `Enter ${field.display_name.toLowerCase()}`
                                                "
                                                class="flex-1"
                                            />
                                            <Input
                                                v-else-if="field.type === 'number'"
                                                v-model="settingsForm[field.name]"
                                                type="number"
                                                :min="field.validation.min"
                                                :max="field.validation.max"
                                                :placeholder="
                                                    field.default || `Enter ${field.display_name.toLowerCase()}`
                                                "
                                                class="flex-1"
                                            />
                                            <div v-else-if="field.type === 'boolean'" class="flex items-center gap-2">
                                                <input
                                                    v-model="settingsForm[field.name]"
                                                    type="checkbox"
                                                    :value="settingsForm[field.name] === 'true'"
                                                    @change="
                                                        settingsForm[field.name] = ($event.target as HTMLInputElement)
                                                            .checked
                                                            ? 'true'
                                                            : 'false'
                                                    "
                                                />
                                                <span class="text-sm">{{ field.display_name }}</span>
                                            </div>
                                        </div>
                                        <p class="text-xs text-muted-foreground">{{ field.description }}</p>
                                        <p v-if="field.validation.message" class="text-xs text-orange-600">
                                            {{ field.validation.message }}
                                        </p>
                                    </div>
                                </div>

                                <!-- No Config Schema Available -->
                                <div v-else class="text-center py-8 text-muted-foreground">
                                    <div
                                        class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2"
                                    >
                                        <span class="text-xl">⚙️</span>
                                    </div>
                                    <p>This plugin doesn't have a configuration schema defined</p>
                                    <p class="text-xs mt-1">Add required configurations to enable settings</p>
                                </div>

                                <Button
                                    v-if="hasConfigSchema"
                                    class="w-full"
                                    :disabled="isLoading"
                                    @click="updatePluginSettings"
                                >
                                    Save All Settings
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    </DashboardLayout>
</template>

<style scoped>
/* Custom styles for the plugin manager */
.lowercase {
    text-transform: lowercase;
}
</style>
