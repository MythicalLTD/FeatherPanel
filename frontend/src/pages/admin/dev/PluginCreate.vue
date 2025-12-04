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

import { ref, watch, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from 'vue-toastification';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';

interface CreatePluginData {
    identifier: string;
    name: string;
    description: string;
    version: string;
    target: string;
    template: 'empty' | 'starter' | 'fresh';
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
const toast = useToast();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const isLoading = ref(false);

const createForm = ref<CreatePluginData>({
    identifier: '',
    name: '',
    description: '',
    version: '1.0.0',
    target: 'v3',
    template: 'starter', // Default to starter template
    author: [sessionStore.user?.username || '', String(settingsStore.appName || '')],
    flags: ['hasEvents'], // Default flag - required for route registration
    dependencies: [
        { type: 'php', value: '8.5' }, // Latest PHP version
        { type: 'php-ext', value: 'pdo' }, // Required for database connections
    ],
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

// Available templates
const availableTemplates = [
    {
        value: 'empty',
        label: 'Empty Template',
        description: 'Minimal structure with just conf.yml and basic directories',
    },
    {
        value: 'starter',
        label: 'Starter Template',
        description: 'Full template with all example files and documentation',
    },
    {
        value: 'fresh',
        label: 'Fresh Template',
        description: 'Clean template with basic structure and minimal examples',
    },
];

// Available field types for config
const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'password', label: 'Password' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
];

function generateIdentifier(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters (including spaces)
        .substring(0, 32); // Allow up to 32 characters
}

function handleNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    // Remove spaces and other non-alphanumeric characters from name
    const cleanedValue = value.replace(/[^a-zA-Z0-9]/g, '');
    createForm.value.name = cleanedValue;
}

async function createPlugin() {
    if (!createForm.value.identifier || !createForm.value.name) {
        toast.error('Identifier and name are required');
        return;
    }

    // Check if plugin has at least one author, flag, or dependency
    const hasValidAuthors = createForm.value.author.some((author) => author.trim() !== '');
    const hasValidFlags = createForm.value.flags.length > 0;
    const hasValidDependencies = createForm.value.dependencies.length > 0;

    if (!hasValidAuthors && !hasValidFlags && !hasValidDependencies) {
        toast.error('Plugin must have at least one author, flag, or dependency');
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
            router.push({ name: 'AdminPluginManager' });
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

function addAuthor() {
    createForm.value.author.push('');
}

function removeAuthor(index: number) {
    createForm.value.author.splice(index, 1);
}

// Check if PHP version dependency already exists
const hasPhpVersionDependency = computed(() => {
    return createForm.value.dependencies.some((dep) => dep.type === 'php');
});

function addDependency() {
    // Don't allow adding PHP version if one already exists
    createForm.value.dependencies.push({ type: 'php-ext', value: '' });
}

function removeDependency(index: number) {
    const dep = createForm.value.dependencies[index];
    // Prevent removing default dependencies
    if (isDefaultDependency(dep, index)) {
        toast.warning('Default dependencies (PHP 8.5 and pdo extension) cannot be removed');
        return;
    }
    createForm.value.dependencies.splice(index, 1);
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

// Computed property to get available flags (excluding already selected ones)
const availableFlags = computed(() => {
    return pluginFlags.filter((flag) => !createForm.value.flags.includes(flag));
});

// Check if a dependency is a default dependency that cannot be removed
function isDefaultDependency(dep: DependencyItem | undefined, index: number): boolean {
    if (!dep) return false;
    // First dependency should be PHP 8.5
    if (index === 0 && dep.type === 'php' && dep.value === '8.5') {
        return true;
    }
    // Second dependency should be pdo extension
    if (index === 1 && dep.type === 'php-ext' && dep.value === 'pdo') {
        return true;
    }
    return false;
}

function addFlag() {
    if (availableFlags.value.length === 0) {
        toast.warning('All available flags have been added');
        return;
    }
    createForm.value.flags.push('');
}

function removeFlag(index: number) {
    // Prevent removing the hasEvents flag
    if (createForm.value.flags[index] === 'hasEvents') {
        toast.warning('The hasEvents flag is required and cannot be removed');
        return;
    }
    createForm.value.flags.splice(index, 1);
}

// Watch for changes in the name field and update identifier live
watch(
    () => createForm.value.name,
    (newName) => {
        if (newName) {
            createForm.value.identifier = generateIdentifier(newName);
        }
    },
    { immediate: false },
);

// Update authors with current username and app name when component mounts (in case session/settings weren't loaded yet)
onMounted(async () => {
    // Fetch settings to ensure app name is available
    await settingsStore.fetchSettings();

    // Update first author (username) if not set
    if (sessionStore.user?.username && createForm.value.author[0] === '') {
        createForm.value.author[0] = sessionStore.user.username;
    }

    // Update second author (app name) if not set
    const appName = String(settingsStore.appName || '');
    if (appName && createForm.value.author[1] === '') {
        createForm.value.author[1] = appName;
    }
});
</script>

<template>
    <DashboardLayout
        :breadcrumbs="[
            { text: 'Dev', href: '/admin/dev' },
            { text: 'Plugin Manager', href: '/admin/dev/plugins' },
            { text: 'Create Plugin', isCurrent: true },
        ]"
    >
        <div class="min-h-screen bg-background">
            <div class="p-6 max-w-4xl mx-auto">
                <div class="mb-6">
                    <h1 class="text-3xl font-bold text-foreground mb-1">Create New Plugin</h1>
                    <p class="text-muted-foreground">Create a new FeatherPanel plugin</p>
                </div>

                <Card class="p-6">
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium mb-2 block">Name *</label>
                                <Input
                                    v-model="createForm.name"
                                    placeholder="MyAwesomePlugin"
                                    maxlength="32"
                                    @input="handleNameInput"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Plugin name cannot contain spaces or special characters
                                </p>
                            </div>
                            <div>
                                <label class="text-sm font-medium mb-2 block">Identifier *</label>
                                <Input
                                    v-model="createForm.identifier"
                                    placeholder="myawesomeplugin"
                                    maxlength="32"
                                    class="lowercase"
                                />
                                <p class="text-xs text-muted-foreground mt-1">
                                    Must be unique, lowercase, and contain only letters and numbers
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
                            <label class="text-sm font-medium mb-2 block">Template</label>
                            <Select v-model="createForm.template">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select template" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem
                                        v-for="template in availableTemplates"
                                        :key="template.value"
                                        :value="template.value"
                                    >
                                        <div class="flex flex-col">
                                            <span>{{ template.label }}</span>
                                            <span class="text-xs text-muted-foreground">{{
                                                template.description
                                            }}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-xs text-muted-foreground mt-1">
                                Choose the template structure for your plugin
                            </p>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">
                                Authors
                                <span class="text-xs text-muted-foreground ml-1"
                                    >(at least one author, flag, or dependency required)</span
                                >
                            </label>
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
                                    <Select
                                        v-model="createForm.flags[index]"
                                        class="flex-1"
                                        :disabled="flag === 'hasEvents'"
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a flag" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem
                                                v-for="availableFlag in pluginFlags"
                                                :key="availableFlag"
                                                :value="availableFlag"
                                                :disabled="
                                                    flag !== availableFlag && createForm.flags.includes(availableFlag)
                                                "
                                            >
                                                {{ availableFlag }}
                                                <span
                                                    v-if="
                                                        flag !== availableFlag &&
                                                        createForm.flags.includes(availableFlag)
                                                    "
                                                    class="text-xs text-muted-foreground ml-2"
                                                >
                                                    (already selected)
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        v-if="flag !== 'hasEvents'"
                                        variant="outline"
                                        size="sm"
                                        @click="removeFlag(index)"
                                    >
                                        Remove
                                    </Button>
                                    <Button v-else variant="outline" size="sm" disabled title="hasEvents is required">
                                        Required
                                    </Button>
                                </div>
                                <Button variant="outline" size="sm" @click="addFlag"> Add Flag </Button>
                                <p class="text-xs text-muted-foreground mt-1">
                                    <strong>Note:</strong> The
                                    <code class="px-1 py-0.5 bg-muted rounded">hasEvents</code> flag is required and
                                    cannot be removed. Plugins need events to register new routes.
                                </p>
                            </div>
                        </div>

                        <div>
                            <label class="text-sm font-medium mb-2 block">Dependencies</label>
                            <div class="space-y-2">
                                <div v-for="(dep, index) in createForm.dependencies" :key="index" class="flex gap-2">
                                    <Select v-model="dep.type" class="w-32" :disabled="isDefaultDependency(dep, index)">
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
                                        <Select v-model="dep.value" :disabled="isDefaultDependency(dep, index)">
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
                                                        createForm.dependencies.some(
                                                            (d) => d.type === 'php' && d.value === version,
                                                        )
                                                    "
                                                >
                                                    {{ version }}
                                                    <span
                                                        v-if="
                                                            dep.value !== version &&
                                                            createForm.dependencies.some(
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
                                            :disabled="isDefaultDependency(dep, index)"
                                        />
                                    </div>
                                    <div v-else-if="dep.type === 'php-ext'" class="flex-1">
                                        <Select v-model="dep.value" :disabled="isDefaultDependency(dep, index)">
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
                                                        createForm.dependencies.some(
                                                            (d) => d.type === 'php-ext' && d.value === ext,
                                                        )
                                                    "
                                                >
                                                    {{ ext }}
                                                    <span
                                                        v-if="
                                                            dep.value !== ext &&
                                                            createForm.dependencies.some(
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
                                            :disabled="isDefaultDependency(dep, index)"
                                        />
                                    </div>
                                    <Input
                                        v-else-if="dep.type === 'plugin'"
                                        v-model="dep.value"
                                        placeholder="Plugin identifier"
                                        class="flex-1"
                                    />
                                    <Button
                                        v-if="!isDefaultDependency(dep, index)"
                                        variant="outline"
                                        size="sm"
                                        @click="removeDependency(index)"
                                    >
                                        Remove
                                    </Button>
                                    <Button
                                        v-else
                                        variant="outline"
                                        size="sm"
                                        disabled
                                        :title="
                                            dep.type === 'php' ? 'PHP 8.5 is required' : 'pdo extension is required'
                                        "
                                    >
                                        Required
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
                        <Button
                            variant="outline"
                            data-umami-event="Cancel plugin creation"
                            @click="router.push({ name: 'AdminPluginManager' })"
                        >
                            Cancel
                        </Button>
                        <Button
                            :disabled="isLoading"
                            data-umami-event="Create plugin"
                            :data-umami-event-name="createForm.name"
                            @click="createPlugin"
                        >
                            <span v-if="isLoading">Creating...</span>
                            <span v-else>Create Plugin</span>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    </DashboardLayout>
</template>

<style scoped>
/* Custom styles for the plugin creator */
.lowercase {
    text-transform: lowercase;
}
</style>
