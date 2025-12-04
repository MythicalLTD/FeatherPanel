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
import { useRouter, useRoute } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from 'vue-toastification';

interface EditPluginData {
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
    type: 'php' | 'php-ext' | 'plugin';
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

const router = useRouter();
const route = useRoute();
const toast = useToast();
const isLoading = ref(false);
const isLoadingPlugin = ref(true);

const editForm = ref<EditPluginData>({
    identifier: '',
    name: '',
    description: '',
    version: '1.0.0',
    target: 'v3',
    author: [''],
    flags: [],
    dependencies: [],
    requiredConfigs: [],
});

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
    { value: 'plugin', label: 'Plugin' },
];

const phpVersions = ['8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];
const phpExtensions = ['pdo', 'curl', 'json', 'mbstring', 'gd', 'zip', 'xml', 'openssl', 'sqlite3', 'mysql', 'pgsql'];

// Available targets
const availableTargets = ['v1', 'v2', 'v3'];

// Available field types for config
const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'password', label: 'Password' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
];

async function loadPlugin() {
    const identifier = route.params.identifier as string;
    if (!identifier) {
        toast.error('Plugin identifier is required');
        router.push({ name: 'AdminPluginManager' });
        return;
    }

    isLoadingPlugin.value = true;
    try {
        const resp = await fetch(`/api/admin/plugin-manager/${identifier}`);
        const json = await resp.json();

        if (json.success && json.data) {
            const plugin = json.data;

            // Convert dependencies from string format to object format
            const dependencies: DependencyItem[] = (plugin.dependencies || []).map((dep: string) => {
                const [type, value] = dep.split('=');
                return { type: type as 'php' | 'php-ext' | 'plugin', value: value || '' };
            });

            editForm.value = {
                identifier: plugin.identifier || identifier,
                name: plugin.name || '',
                description: plugin.description || '',
                version: plugin.version || '1.0.0',
                target: plugin.target || 'v3',
                author: Array.isArray(plugin.author) ? [...plugin.author] : [plugin.author || ''],
                flags: Array.isArray(plugin.flags) ? [...plugin.flags] : [],
                dependencies,
                requiredConfigs:
                    plugin.config && Array.isArray(plugin.config)
                        ? plugin.config.map((config: ConfigField) => ({
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
        } else {
            toast.error('Failed to load plugin: ' + (json.message || 'Unknown error'));
            router.push({ name: 'AdminPluginManager' });
        }
    } catch (e) {
        console.error('Failed to load plugin:', e);
        toast.error('Failed to load plugin: Network error');
        router.push({ name: 'AdminPluginManager' });
    } finally {
        isLoadingPlugin.value = false;
    }
}

async function updatePlugin() {
    if (!editForm.value.identifier || !editForm.value.name) {
        toast.error('Identifier and name are required');
        return;
    }

    // Check if plugin has at least one author, flag, or dependency
    const hasValidAuthors = editForm.value.author.some((author) => author.trim() !== '');
    const hasValidFlags = editForm.value.flags.length > 0;
    const hasValidDependencies = editForm.value.dependencies.length > 0;

    if (!hasValidAuthors && !hasValidFlags && !hasValidDependencies) {
        toast.error('Plugin must have at least one author, flag, or dependency');
        return;
    }

    // Convert dependencies to the format expected by the backend
    const formattedData = {
        ...editForm.value,
        dependencies: editForm.value.dependencies.map((dep) => `${dep.type}=${dep.value}`),
        requiredConfigs: editForm.value.requiredConfigs.map((config) => config.name),
        configSchema: editForm.value.requiredConfigs,
    };

    isLoading.value = true;
    try {
        const resp = await fetch(`/api/admin/plugin-manager/${editForm.value.identifier}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formattedData),
        });

        const json = await resp.json();

        if (json.success) {
            toast.success('Plugin updated successfully');
            router.push({ name: 'AdminPluginManager' });
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

function addAuthor() {
    editForm.value.author.push('');
}

function removeAuthor(index: number) {
    editForm.value.author.splice(index, 1);
}

// Check if PHP version dependency already exists
const hasPhpVersionDependency = computed(() => {
    return editForm.value.dependencies.some((dep) => dep.type === 'php');
});

function addDependency() {
    // Don't allow adding PHP version if one already exists
    editForm.value.dependencies.push({ type: 'php-ext', value: '' });
}

function removeDependency(index: number) {
    editForm.value.dependencies.splice(index, 1);
}

function addRequiredConfig() {
    editForm.value.requiredConfigs.push({
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
    editForm.value.requiredConfigs.splice(index, 1);
}

function addFlag() {
    editForm.value.flags.push('');
}

function removeFlag(index: number) {
    editForm.value.flags.splice(index, 1);
}

onMounted(() => {
    loadPlugin();
});
</script>

<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Dev', href: '/admin/dev' },
            { text: 'Plugin Manager', href: '/admin/dev/plugins' },
            { text: 'Edit Plugin', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-6 max-w-4xl mx-auto">
                <div class="mb-6">
                    <h1 class="text-3xl font-bold text-foreground mb-1">Edit Plugin</h1>
                    <p class="text-muted-foreground">Edit plugin configuration</p>
                </div>

                <Card v-if="isLoadingPlugin" class="p-6">
                    <div class="text-center py-8">
                        <p class="text-muted-foreground">Loading plugin...</p>
                    </div>
                </Card>

                <Card v-else class="p-6">
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium mb-2 block">Name *</label>
                                <Input v-model="editForm.name" placeholder="MyAwesomePlugin" maxlength="32" />
                            </div>
                            <div>
                                <label class="text-sm font-medium mb-2 block">Identifier</label>
                                <Input v-model="editForm.identifier" disabled class="bg-muted lowercase" />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Identifier cannot be changed after creation
                                </p>
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
                            <label class="text-sm font-medium mb-2 block">
                                Authors
                                <span class="text-xs text-muted-foreground ml-1"
                                    >(at least one author, flag, or dependency required)</span
                                >
                            </label>
                            <div class="space-y-2">
                                <div v-for="(author, index) in editForm.author" :key="index" class="flex gap-2">
                                    <Input v-model="editForm.author[index]" placeholder="Author name" class="flex-1" />
                                    <Button
                                        v-if="editForm.author.length > 1"
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
                                                :disabled="
                                                    flag !== availableFlag && editForm.flags.includes(availableFlag)
                                                "
                                            >
                                                {{ availableFlag }}
                                                <span
                                                    v-if="
                                                        flag !== availableFlag && editForm.flags.includes(availableFlag)
                                                    "
                                                    class="text-xs text-muted-foreground ml-2"
                                                >
                                                    (already selected)
                                                </span>
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
                                                :disabled="
                                                    type.value === 'php' &&
                                                    hasPhpVersionDependency &&
                                                    dep.type !== 'php'
                                                "
                                            >
                                                {{ type.label }}
                                                <span
                                                    v-if="
                                                        type.value === 'php' &&
                                                        hasPhpVersionDependency &&
                                                        dep.type !== 'php'
                                                    "
                                                    class="text-xs text-muted-foreground ml-2"
                                                >
                                                    (already selected)
                                                </span>
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
                                                    :disabled="
                                                        dep.value !== version &&
                                                        editForm.dependencies.some(
                                                            (d) => d.type === 'php' && d.value === version,
                                                        )
                                                    "
                                                >
                                                    {{ version }}
                                                    <span
                                                        v-if="
                                                            dep.value !== version &&
                                                            editForm.dependencies.some(
                                                                (d) => d.type === 'php' && d.value === version,
                                                            )
                                                        "
                                                        class="text-xs text-muted-foreground ml-2"
                                                    >
                                                        (already selected)
                                                    </span>
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
                                                <SelectItem
                                                    v-for="ext in phpExtensions"
                                                    :key="ext"
                                                    :value="ext"
                                                    :disabled="
                                                        dep.value !== ext &&
                                                        editForm.dependencies.some(
                                                            (d) => d.type === 'php-ext' && d.value === ext,
                                                        )
                                                    "
                                                >
                                                    {{ ext }}
                                                    <span
                                                        v-if="
                                                            dep.value !== ext &&
                                                            editForm.dependencies.some(
                                                                (d) => d.type === 'php-ext' && d.value === ext,
                                                            )
                                                        "
                                                        class="text-xs text-muted-foreground ml-2"
                                                    >
                                                        (already selected)
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            v-model="dep.value"
                                            placeholder="Or enter custom extension"
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
                                    v-for="(config, index) in editForm.requiredConfigs"
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
                        <Button
                            variant="outline"
                            data-umami-event="Cancel plugin edit"
                            @click="router.push({ name: 'AdminPluginManager' })"
                        >
                            Cancel
                        </Button>
                        <Button
                            :disabled="isLoading"
                            data-umami-event="Update plugin"
                            :data-umami-event-plugin="editForm.name"
                            @click="updatePlugin"
                        >
                            <span v-if="isLoading">Updating...</span>
                            <span v-else>Update Plugin</span>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

<style scoped>
/* Custom styles for the plugin editor */
.lowercase {
    text-transform: lowercase;
}
</style>
