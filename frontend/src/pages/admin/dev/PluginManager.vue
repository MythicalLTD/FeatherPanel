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

import { ref, onMounted, computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from 'vue-toastification';
import { Database, Terminal, Clock, Plus, Upload, Download, Trash2 } from 'lucide-vue-next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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
}

interface PluginResponse {
    success: boolean;
    data: Plugin[];
    message?: string;
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

const router = useRouter();
const plugins = ref<Plugin[]>([]);
const isLoading = ref(false);
const showDetailsDialog = ref(false);
const selectedPlugin = ref<Plugin | null>(null);
// Removed unused availableFlags variable

const toast = useToast();

const settingsForm = ref<Record<string, string>>({});

// ===== CREATE ACTION FUNCTIONALITY =====
interface CreationOption {
    id: string;
    name: string;
    description: string;
    icon: typeof Database;
    fields: Record<
        string,
        {
            label: string;
            type: string;
            required: boolean;
            placeholder: string;
            default?: string;
        }
    >;
}

const isCreateActionDialogOpen = ref(false);
const selectedCreateOption = ref<CreationOption | null>(null);
const createActionFormData = reactive<Record<string, string>>({});
const isCreatingAction = ref(false);

// Available creation options (will be loaded from API)
const creationOptions = ref<CreationOption[]>([]);
const selectedPluginForAction = ref<Plugin | null>(null);

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

const openCreateActionDialog = (option: CreationOption, plugin: Plugin) => {
    selectedCreateOption.value = option;
    selectedPluginForAction.value = plugin;

    // Reset form data
    Object.keys(createActionFormData).forEach((key) => delete createActionFormData[key]);

    // Initialize form with default values
    Object.entries(option.fields).forEach(([key, field]) => {
        if (field.default) {
            createActionFormData[key] = field.default;
        } else {
            createActionFormData[key] = '';
        }
    });

    isCreateActionDialogOpen.value = true;
};

const closeCreateActionDialog = () => {
    isCreateActionDialogOpen.value = false;
    selectedCreateOption.value = null;
    selectedPluginForAction.value = null;
    selectedFileToUpload.value = null;
    Object.keys(createActionFormData).forEach((key) => delete createActionFormData[key]);
};

const validateCreateActionForm = (): boolean => {
    if (!selectedCreateOption.value) return false;

    for (const [key, field] of Object.entries(selectedCreateOption.value.fields)) {
        if (field.required && (!createActionFormData[key] || createActionFormData[key].trim() === '')) {
            toast.error(`${field.label} is required`);
            return false;
        }
    }
    return true;
};

const selectedFileToUpload = ref<File | null>(null);

// Uninstall states
const confirmUninstallOpen = ref(false);
const selectedPluginForUninstall = ref<Plugin | null>(null);
const isUninstalling = ref(false);

const handleFileUpload = (event: Event, key: string) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        selectedFileToUpload.value = file;
        createActionFormData[key] = file.name;
    }
};

const createActionItem = async () => {
    if (!selectedCreateOption.value || !selectedPluginForAction.value || !validateCreateActionForm()) return;

    isCreatingAction.value = true;

    try {
        let formData: FormData | URLSearchParams;

        // Handle file upload differently
        if (selectedCreateOption.value.id === 'public_file' && selectedFileToUpload.value) {
            formData = new FormData();
            formData.append('plugin_id', selectedPluginForAction.value.identifier);
            formData.append('file_type', selectedCreateOption.value.id);
            formData.append('file', selectedFileToUpload.value);
        } else {
            formData = new URLSearchParams({
                plugin_id: selectedPluginForAction.value.identifier,
                file_type: selectedCreateOption.value.id,
                ...createActionFormData,
            });
        }

        const headers: Record<string, string> = {};
        if (!(formData instanceof FormData)) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        const response = await fetch('/api/admin/plugin-tools/create-file', {
            method: 'POST',
            headers,
            body: formData,
        });

        const result = await response.json();

        if (result.success) {
            toast.success(
                `${selectedCreateOption.value.name} created successfully for ${selectedPluginForAction.value.name}!`,
            );
            closeCreateActionDialog();
            // Refresh plugin data to show new files
            await fetchPlugins();
        } else {
            toast.error(result.message || 'Failed to create item');
        }
    } catch (error) {
        toast.error('An error occurred while creating the item');
        console.error('Creation error:', error);
    } finally {
        isCreatingAction.value = false;
    }
};

const loadCreationOptions = async () => {
    try {
        const response = await fetch('/api/admin/plugin-tools/creation-options');
        const result = await response.json();

        if (result.success) {
            // Convert API response to CreationOption format
            const options: CreationOption[] = Object.entries(result.data).map(([key, option]) => {
                const opt = option as Record<string, unknown>;
                return {
                    id: key,
                    name: opt.name as string,
                    description: opt.description as string,
                    icon: getIconComponent(opt.icon as string),
                    fields: opt.fields as Record<
                        string,
                        { label: string; type: string; required: boolean; placeholder: string; default?: string }
                    >,
                };
            });

            creationOptions.value = options;
        }
    } catch (error) {
        console.error('Failed to load creation options:', error);
    }
};

const getIconComponent = (iconName: string) => {
    switch (iconName) {
        case 'database':
            return Database;
        case 'clock':
            return Clock;
        case 'terminal':
            return Terminal;
        case 'upload':
            return Upload;
        default:
            return Database;
    }
};

const exportPlugin = async (plugin: Plugin) => {
    try {
        const resp = await fetch(`/api/admin/plugins/${plugin.identifier}/export`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!resp.ok) {
            const errorData = await resp.json();
            throw new Error(errorData.message || 'Failed to export plugin');
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plugin.identifier}.fpa`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success(`Plugin ${plugin.name} exported successfully`);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to export plugin';
        toast.error(errorMessage);
        console.error('Export error:', e);
    }
};

const requestUninstall = (plugin: Plugin) => {
    selectedPluginForUninstall.value = plugin;
    confirmUninstallOpen.value = true;
};

const onUninstall = async (plugin: Plugin) => {
    isUninstalling.value = true;
    try {
        const resp = await fetch(`/api/admin/plugins/${plugin.identifier}/uninstall`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!resp.ok) {
            const errorData = await resp.json();
            throw new Error(errorData.message || 'Failed to uninstall plugin');
        }
        await fetchPlugins();
        toast.success(`${plugin.name || plugin.identifier} uninstalled successfully`);

        // Reload page to remove plugin CSS/JS
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to uninstall plugin';
        toast.error(errorMessage);
        console.error('Uninstall error:', e);
    } finally {
        isUninstalling.value = false;
        confirmUninstallOpen.value = false;
        selectedPluginForUninstall.value = null;
    }
};

onMounted(() => {
    fetchPlugins();
    loadCreationOptions();
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
                        <Button
                            variant="outline"
                            :disabled="isLoading"
                            data-umami-event="Refresh plugins"
                            @click="fetchPlugins"
                        >
                            Refresh
                        </Button>
                        <Button data-umami-event="Create plugin" @click="router.push({ name: 'AdminPluginCreate' })">
                            Create Plugin
                        </Button>
                    </div>
                </div>

                <div class="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center gap-4 mb-6">
                    <div class="shrink-0">
                        <span
                            class="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-7 w-7"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
                                <path stroke="currentColor" stroke-width="2" d="M12 8v4m0 4h.01" />
                            </svg>
                        </span>
                    </div>
                    <div>
                        <div class="font-semibold text-blue-900 mb-1">SDK: v3.5 (Aurora) 04.12.2025</div>
                        <div class="text-blue-800 text-sm">
                            <strong>Latest update:</strong> Plugins now support custom group assignments, allowing for
                            enhanced organization and seamless management.
                        </div>
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

                        <div class="flex gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                data-umami-event="View plugin details"
                                :data-umami-event-plugin="plugin.name"
                                @click="showPluginDetails(plugin)"
                            >
                                Details
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                data-umami-event="Edit plugin"
                                :data-umami-event-plugin="plugin.name"
                                @click="
                                    router.push({ name: 'AdminPluginEdit', params: { identifier: plugin.identifier } })
                                "
                            >
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                data-umami-event="Export plugin"
                                :data-umami-event-plugin="plugin.name"
                                @click="exportPlugin(plugin)"
                            >
                                <Download :size="14" class="mr-1" />
                                Export
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                data-umami-event="Delete plugin"
                                :data-umami-event-plugin="plugin.name"
                                @click.stop="requestUninstall(plugin)"
                            >
                                <Trash2 :size="14" class="mr-1" />
                                Delete
                            </Button>

                            <!-- Plugin-specific Create Action Dropdown -->
                            <DropdownMenu>
                                <DropdownMenuTrigger as-child>
                                    <Button variant="outline" size="sm" class="gap-1">
                                        <Plus :size="12" />
                                        Add File
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" class="w-56">
                                    <DropdownMenuGroup>
                                        <template v-for="option in creationOptions" :key="option.id">
                                            <DropdownMenuItem
                                                class="cursor-pointer"
                                                @click="openCreateActionDialog(option, plugin)"
                                            >
                                                <div class="flex items-start gap-2 w-full">
                                                    <component :is="option.icon" :size="14" class="mt-0.5 shrink-0" />
                                                    <div class="flex-1 min-w-0">
                                                        <div class="font-medium text-xs">{{ option.name }}</div>
                                                        <div class="text-xs text-muted-foreground">
                                                            {{ option.description }}
                                                        </div>
                                                    </div>
                                                </div>
                                            </DropdownMenuItem>
                                        </template>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                    <Button data-umami-event="Create first plugin" @click="router.push({ name: 'AdminPluginCreate' })">
                        Create Plugin
                    </Button>
                </div>
            </div>
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

                        <!-- Settings -->
                        <div class="space-y-4">
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

        <!-- Create Action Dialog -->
        <Dialog :open="isCreateActionDialogOpen" @update:open="isCreateActionDialogOpen = $event">
            <DialogContent class="sm:max-w-md">
                <DialogHeader v-if="selectedCreateOption && selectedPluginForAction">
                    <DialogTitle class="flex items-center gap-2">
                        <component :is="selectedCreateOption.icon" :size="20" />
                        Create {{ selectedCreateOption.name }}
                    </DialogTitle>
                    <DialogDescription>
                        {{ selectedCreateOption.description }} for <strong>{{ selectedPluginForAction.name }}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div v-if="selectedCreateOption" class="space-y-4 py-4">
                    <template v-for="[key, field] in Object.entries(selectedCreateOption.fields)" :key="key">
                        <div class="space-y-2">
                            <Label :for="key">
                                {{ field.label }}
                                <span v-if="field.required" class="text-red-500">*</span>
                            </Label>

                            <div v-if="field.type === 'file'" class="mb-2">
                                <div
                                    class="p-2 mb-2 rounded bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs flex items-center gap-2"
                                >
                                    <span class="font-bold">⚠️ Woah!</span>
                                    <span>
                                        Be careful not to upload files containing secrets or sensitive data. Uploaded
                                        files may be accessible to others or stored in ways you do not expect.
                                    </span>
                                </div>
                            </div>

                            <!-- File upload field -->
                            <Input
                                v-if="field.type === 'file'"
                                :id="key"
                                type="file"
                                :required="field.required"
                                accept=".txt,.html,.css,.js,.json,.xml,.md,.pdf,.png,.jpg,.jpeg,.gif,.svg"
                                @change="handleFileUpload($event, key)"
                            />

                            <!-- Textarea field -->
                            <Textarea
                                v-else-if="field.type === 'textarea'"
                                :id="key"
                                v-model="createActionFormData[key]"
                                :placeholder="field.placeholder"
                                :required="field.required"
                                class="min-h-[80px]"
                            />

                            <!-- Regular input field -->
                            <Input
                                v-else
                                :id="key"
                                v-model="createActionFormData[key]"
                                :type="field.type"
                                :placeholder="field.placeholder"
                                :required="field.required"
                            />
                        </div>
                    </template>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        :disabled="isCreatingAction"
                        data-umami-event="Cancel create action"
                        @click="closeCreateActionDialog"
                    >
                        Cancel
                    </Button>
                    <Button
                        :disabled="isCreatingAction"
                        data-umami-event="Create action item"
                        :data-umami-event-plugin="selectedPluginForAction?.name"
                        @click="createActionItem"
                    >
                        <span v-if="isCreatingAction">Creating...</span>
                        <span v-else>Create</span>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Confirm Uninstall Dialog -->
        <Dialog v-model:open="confirmUninstallOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Plugin</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete
                        {{ selectedPluginForUninstall?.name || selectedPluginForUninstall?.identifier }}? This action
                        cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose as-child>
                        <Button variant="outline" :disabled="isUninstalling">Cancel</Button>
                    </DialogClose>
                    <Button
                        variant="destructive"
                        :disabled="isUninstalling"
                        @click="selectedPluginForUninstall && onUninstall(selectedPluginForUninstall)"
                    >
                        <div
                            v-if="isUninstalling"
                            class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                        ></div>
                        {{ isUninstalling ? 'Deleting...' : 'Delete' }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardLayout>
</template>

<style scoped>
/* Custom styles for the plugin manager */
.lowercase {
    text-transform: lowercase;
}
</style>
