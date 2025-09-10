<template>
    <DashboardLayout :breadcrumbs="[{ text: 'Plugins', isCurrent: true, href: '/admin/plugins' }]">
        <div class="min-h-screen bg-background">
            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="flex items-center gap-3">
                    <div class="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                    <span class="text-muted-foreground">Loading plugins...</span>
                </div>
            </div>

            <!-- Error State -->
            <div
                v-else-if="message?.type === 'error'"
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <div class="text-red-500 mb-4">
                    <AlertCircle class="h-12 w-12 mx-auto" />
                </div>
                <h3 class="text-lg font-medium text-muted-foreground mb-2">Failed to load plugins</h3>
                <p class="text-sm text-muted-foreground max-w-sm">
                    {{ message.text }}
                </p>
                <Button class="mt-4" @click="fetchPlugins">Try Again</Button>
            </div>

            <!-- Plugins Grid -->
            <div v-else class="p-6">
                <!-- Header -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-3xl font-bold text-foreground mb-1">Plugins</h1>
                        <p class="text-muted-foreground">Manage installed plugins and their configurations</p>
                    </div>
                    <div class="flex gap-2">
                        <Button variant="outline" @click="fetchPlugins">
                            <RefreshCw class="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>

                <!-- Plugins Grid -->
                <div v-if="plugins.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card
                        v-for="plugin in plugins"
                        :key="plugin.identifier"
                        class="group hover:shadow-lg transition-all duration-200 cursor-pointer"
                        @click="openPluginConfig(plugin)"
                    >
                        <div class="p-6">
                            <!-- Plugin Header -->
                            <div class="flex items-start justify-between mb-4">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden"
                                    >
                                        <img
                                            v-if="plugin.icon"
                                            :src="plugin.icon"
                                            :alt="plugin.name || plugin.identifier"
                                            class="h-8 w-8 object-contain"
                                        />
                                        <component :is="getPluginIcon(plugin)" v-else class="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 class="font-semibold text-lg">{{ plugin.name || plugin.identifier }}</h3>
                                        <p class="text-sm text-muted-foreground">{{ plugin.identifier }}</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" class="ml-2">
                                    {{ plugin.version || 'Unknown' }}
                                </Badge>
                            </div>

                            <!-- Plugin Description -->
                            <p class="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {{ plugin.description || 'No description available' }}
                            </p>

                            <!-- Plugin Info -->
                            <div class="space-y-2 mb-4">
                                <div v-if="plugin.author" class="flex items-center gap-2 text-sm">
                                    <User class="h-4 w-4 text-muted-foreground" />
                                    <span>{{ plugin.author }}</span>
                                </div>
                                <div v-if="plugin.target" class="flex items-center gap-2 text-sm">
                                    <Badge variant="outline" class="text-xs"> Target: {{ plugin.target }} </Badge>
                                </div>
                                <div
                                    v-if="plugin.flags && plugin.flags.length > 0"
                                    class="flex items-center gap-2 text-sm"
                                >
                                    <div class="flex gap-1">
                                        <Badge
                                            v-for="flag in plugin.flags"
                                            :key="flag"
                                            variant="secondary"
                                            class="text-xs"
                                        >
                                            {{ flag }}
                                        </Badge>
                                    </div>
                                </div>
                                <div v-if="plugin.website" class="flex items-center gap-2 text-sm">
                                    <Globe class="h-4 w-4 text-muted-foreground" />
                                    <a
                                        :href="plugin.website"
                                        target="_blank"
                                        class="text-primary hover:underline"
                                        @click.stop
                                    >
                                        Website
                                    </a>
                                </div>
                            </div>

                            <!-- Plugin Actions -->
                            <div class="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="flex-1"
                                    @click.stop="openPluginConfig(plugin)"
                                >
                                    <Settings class="h-4 w-4 mr-2" />
                                    Configure
                                </Button>
                                <Button size="sm" variant="secondary" @click.stop="viewPluginInfo(plugin)">
                                    <Info class="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                <!-- Empty State -->
                <div v-else class="text-center py-12">
                    <div class="h-24 w-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Puzzle class="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 class="text-lg font-semibold mb-2">No Plugins Installed</h3>
                    <p class="text-muted-foreground mb-4">No plugins are currently installed on your system.</p>
                    <Button @click="fetchPlugins">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>
        </div>

        <!-- Plugin Configuration Drawer -->
        <Drawer
            class="w-full"
            :open="configDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeConfigDrawer();
                }
            "
        >
            <DrawerContent v-if="selectedPlugin">
                <DrawerHeader>
                    <DrawerTitle>Plugin Configuration</DrawerTitle>
                    <DrawerDescription>
                        Configure settings for {{ selectedPlugin.name || selectedPlugin.identifier }}
                    </DrawerDescription>
                </DrawerHeader>

                <div class="px-6 pt-6">
                    <!-- Loading State -->
                    <div v-if="configLoading" class="flex items-center justify-center py-8">
                        <div class="flex items-center gap-3">
                            <div
                                class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                            ></div>
                            <span class="text-muted-foreground">Loading plugin configuration...</span>
                        </div>
                    </div>

                    <!-- Configuration Content -->
                    <div v-else-if="pluginConfig" class="space-y-6">
                        <!-- Plugin Info -->
                        <Card>
                            <div class="p-4">
                                <h3 class="font-semibold mb-3">Plugin Information</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span class="font-medium text-muted-foreground">Name:</span>
                                        <span class="ml-2">{{
                                            pluginConfig.plugin?.name || selectedPlugin.identifier
                                        }}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-muted-foreground">Version:</span>
                                        <span class="ml-2">{{ pluginConfig.plugin?.version || 'Unknown' }}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-muted-foreground">Author:</span>
                                        <span class="ml-2">{{ pluginConfig.plugin?.author || 'Unknown' }}</span>
                                    </div>
                                    <div>
                                        <span class="font-medium text-muted-foreground">Description:</span>
                                        <span class="ml-2">{{
                                            pluginConfig.plugin?.description || 'No description'
                                        }}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <!-- Plugin Settings -->
                        <Card>
                            <div class="p-4">
                                <div class="flex items-center justify-between mb-4">
                                    <h3 class="font-semibold">Plugin Settings</h3>
                                    <Button size="sm" variant="outline" @click="addNewSetting">
                                        <Plus class="h-4 w-4 mr-2" />
                                        Add Setting
                                    </Button>
                                </div>

                                <!-- Add New Setting Form -->
                                <div v-if="showAddSettingForm" class="mb-6 p-4 border rounded-lg bg-muted/50">
                                    <h4 class="font-medium mb-3">
                                        {{ editingSetting ? 'Edit Setting' : 'Add New Setting' }}
                                    </h4>
                                    <div class="space-y-3">
                                        <div>
                                            <Label for="setting-key">Setting Key</Label>
                                            <Input
                                                id="setting-key"
                                                v-model="settingForm.key"
                                                placeholder="Enter setting key"
                                                :disabled="!!editingSetting"
                                            />
                                        </div>
                                        <div>
                                            <Label for="setting-value">Setting Value</Label>
                                            <Textarea
                                                id="setting-value"
                                                v-model="settingForm.value"
                                                placeholder="Enter setting value"
                                                rows="3"
                                            />
                                        </div>
                                        <div class="flex gap-2">
                                            <Button :disabled="savingSetting" @click="saveSetting">
                                                <Save v-if="!savingSetting" class="h-4 w-4 mr-2" />
                                                <div
                                                    v-else
                                                    class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                                                ></div>
                                                {{ savingSetting ? 'Saving...' : 'Save Setting' }}
                                            </Button>
                                            <Button variant="outline" @click="cancelSettingForm">Cancel</Button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Settings List -->
                                <div v-if="Object.keys(pluginConfig.settings || {}).length > 0" class="space-y-3">
                                    <div
                                        v-for="(value, key) in pluginConfig.settings"
                                        :key="key"
                                        class="flex items-center gap-3 p-3 border rounded-lg"
                                    >
                                        <div class="flex-1">
                                            <div class="font-medium text-sm">{{ key }}</div>
                                            <div class="text-xs text-muted-foreground">{{ value }}</div>
                                        </div>
                                        <div class="flex gap-2">
                                            <Button size="sm" variant="outline" @click="editSetting(key, value)">
                                                <Pencil class="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="destructive" @click="removeSetting(key)">
                                                <Trash2 class="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Empty Settings -->
                                <div v-else-if="!showAddSettingForm" class="text-center py-8 text-muted-foreground">
                                    <Settings class="h-8 w-8 mx-auto mb-2" />
                                    <p>No settings configured for this plugin</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="configError" class="text-center py-8">
                        <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                        <p class="text-destructive">{{ configError }}</p>
                        <Button size="sm" variant="outline" class="mt-2" @click="loadPluginConfig"> Try Again </Button>
                    </div>
                </div>

                <div class="p-4 flex justify-end">
                    <DrawerClose as-child>
                        <Button variant="outline" @click="closeConfigDrawer">Close</Button>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>

        <!-- Plugin Info Drawer -->
        <Drawer
            class="w-full"
            :open="infoDrawerOpen"
            @update:open="
                (val: boolean) => {
                    if (!val) closeInfoDrawer();
                }
            "
        >
            <DrawerContent v-if="selectedPlugin">
                <DrawerHeader>
                    <DrawerTitle>Plugin Information</DrawerTitle>
                    <DrawerDescription>
                        Detailed information about {{ selectedPlugin.name || selectedPlugin.identifier }}
                    </DrawerDescription>
                </DrawerHeader>

                <div class="px-6 pt-6 space-y-4">
                    <!-- Loading State -->
                    <div v-if="configLoading" class="flex items-center justify-center py-8">
                        <div class="flex items-center gap-3">
                            <div
                                class="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"
                            ></div>
                            <span class="text-muted-foreground">Loading plugin information...</span>
                        </div>
                    </div>

                    <!-- Plugin Information -->
                    <div v-else-if="pluginConfig" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span class="font-medium text-muted-foreground">Identifier:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.identifier }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Name:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.name || 'Unknown' }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Version:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.version || 'Unknown' }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Author:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.author || 'Unknown' }}</p>
                        </div>
                        <div v-if="pluginConfig.plugin.target">
                            <span class="font-medium text-muted-foreground">Target Version:</span>
                            <p class="mt-1">
                                <Badge variant="outline">{{ pluginConfig.plugin.target }}</Badge>
                            </p>
                        </div>
                        <div v-if="pluginConfig.plugin.flags && pluginConfig.plugin.flags.length > 0">
                            <span class="font-medium text-muted-foreground">Flags:</span>
                            <div class="mt-1 flex gap-1 flex-wrap">
                                <Badge
                                    v-for="flag in pluginConfig.plugin.flags"
                                    :key="flag"
                                    variant="secondary"
                                    class="text-xs"
                                >
                                    {{ flag }}
                                </Badge>
                            </div>
                        </div>
                        <div v-if="pluginConfig.plugin.website" class="md:col-span-2">
                            <span class="font-medium text-muted-foreground">Website:</span>
                            <p class="mt-1">
                                <a
                                    :href="pluginConfig.plugin.website"
                                    target="_blank"
                                    class="text-primary hover:underline"
                                >
                                    {{ pluginConfig.plugin.website }}
                                </a>
                            </p>
                        </div>
                        <div v-if="pluginConfig.plugin.description" class="md:col-span-2">
                            <span class="font-medium text-muted-foreground">Description:</span>
                            <p class="mt-1">{{ pluginConfig.plugin.description }}</p>
                        </div>
                        <div
                            v-if="pluginConfig.plugin.dependencies && pluginConfig.plugin.dependencies.length > 0"
                            class="md:col-span-2"
                        >
                            <span class="font-medium text-muted-foreground">Dependencies:</span>
                            <div class="mt-1">
                                <ul class="list-disc list-inside space-y-1">
                                    <li v-for="dep in pluginConfig.plugin.dependencies" :key="dep" class="text-sm">
                                        {{ dep }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div
                            v-if="pluginConfig.plugin.requiredConfigs && pluginConfig.plugin.requiredConfigs.length > 0"
                            class="md:col-span-2"
                        >
                            <span class="font-medium text-muted-foreground">Required Configurations:</span>
                            <div class="mt-1">
                                <ul class="list-disc list-inside space-y-1">
                                    <li
                                        v-for="(config, index) in pluginConfig.plugin.requiredConfigs"
                                        :key="index"
                                        class="text-sm"
                                    >
                                        {{ String(config) }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Error State -->
                    <div v-else-if="configError" class="text-center py-8">
                        <AlertCircle class="h-8 w-8 mx-auto mb-2 text-destructive" />
                        <p class="text-destructive">{{ configError }}</p>
                        <Button size="sm" variant="outline" class="mt-2" @click="loadPluginConfig(selectedPlugin!)">
                            Try Again
                        </Button>
                    </div>

                    <!-- Fallback to basic info if config loading fails -->
                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span class="font-medium text-muted-foreground">Identifier:</span>
                            <p class="mt-1">{{ selectedPlugin.identifier }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Name:</span>
                            <p class="mt-1">{{ selectedPlugin.name || 'Unknown' }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Version:</span>
                            <p class="mt-1">{{ selectedPlugin.version || 'Unknown' }}</p>
                        </div>
                        <div>
                            <span class="font-medium text-muted-foreground">Author:</span>
                            <p class="mt-1">{{ selectedPlugin.author || 'Unknown' }}</p>
                        </div>
                        <div v-if="selectedPlugin.description" class="md:col-span-2">
                            <span class="font-medium text-muted-foreground">Description:</span>
                            <p class="mt-1">{{ selectedPlugin.description }}</p>
                        </div>
                    </div>
                </div>

                <div class="p-4 flex justify-end">
                    <DrawerClose as-child>
                        <Button variant="outline" @click="closeInfoDrawer">Close</Button>
                    </DrawerClose>
                </div>
            </DrawerContent>
        </Drawer>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useRouter } from 'vue-router';
import {
    AlertCircle,
    RefreshCw,
    Settings,
    Info,
    User,
    Globe,
    Puzzle,
    Plus,
    Pencil,
    Trash2,
    Save,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerClose,
} from '@/components/ui/drawer';
import DashboardLayout from '@/layouts/DashboardLayout.vue';

// Types
interface Plugin {
    identifier: string;
    name?: string;
    version?: string;
    author?: string;
    description?: string;
    website?: string;
    icon?: string;
    flags?: string[];
    target?: string;
    requiredConfigs?: unknown[];
    dependencies?: string[];
}

interface PluginConfig {
    config: Plugin;
    plugin: Plugin;
    settings: Record<string, string>;
}

// Stores
const sessionStore = useSessionStore();
const router = useRouter();

// State
const loading = ref(false);
const message = ref<{ type: 'error' | 'success'; text: string } | null>(null);
const plugins = ref<Plugin[]>([]);

// Drawer states
const configDrawerOpen = ref(false);
const infoDrawerOpen = ref(false);
const selectedPlugin = ref<Plugin | null>(null);

// Configuration states
const configLoading = ref(false);
const configError = ref<string | null>(null);
const pluginConfig = ref<PluginConfig | null>(null);

// Setting edit states
const showAddSettingForm = ref(false);
const editingSetting = ref<string | null>(null);
const savingSetting = ref(false);
const settingForm = ref({
    key: '',
    value: '',
});

// Computed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getPluginIcon = (_plugin: Plugin) => {
    // You can customize this based on plugin type or add icon mapping
    return Settings;
};

// Methods
const fetchPlugins = async () => {
    loading.value = true;
    message.value = null;

    try {
        const response = await fetch('/api/admin/plugins', {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        // Transform the nested plugin structure to a flat array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginsArray = Object.values(data.data.plugins || {}).map((pluginData: any) => {
            const plugin = pluginData.plugin;
            return {
                identifier: plugin.identifier,
                name: plugin.name,
                version: plugin.version,
                author: Array.isArray(plugin.author) ? plugin.author.join(', ') : plugin.author,
                description: plugin.description,
                website: plugin.website,
                icon: plugin.icon,
                flags: plugin.flags,
                target: plugin.target,
                requiredConfigs: plugin.requiredConfigs,
                dependencies: plugin.dependencies,
            };
        });
        plugins.value = pluginsArray;
    } catch (error) {
        console.error('Failed to fetch plugins:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to load plugins',
        };
    } finally {
        loading.value = false;
    }
};

const loadPluginConfig = async (plugin: Plugin) => {
    configLoading.value = true;
    configError.value = null;

    try {
        // First try to get settings from the config endpoint
        const response = await fetch(`/api/admin/plugins/${plugin.identifier}/config`, {
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            // The API returns nested plugin data, so we need to extract it properly
            const apiData = data.data;
            // Convert settings array to object if needed
            let settings = {};
            if (Array.isArray(apiData.settings)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                settings = apiData.settings.reduce((acc: Record<string, string>, setting: any) => {
                    acc[setting.key] = setting.value;
                    return acc;
                }, {});
            } else if (apiData.settings && typeof apiData.settings === 'object') {
                settings = apiData.settings;
            }

            // Extract and normalize plugin data
            const configPlugin = apiData.config.plugin || apiData.config;
            const pluginData = apiData.plugin.plugin || apiData.plugin;

            // Normalize author field (convert array to string if needed)
            if (Array.isArray(configPlugin.author)) {
                configPlugin.author = configPlugin.author.join(', ');
            }
            if (Array.isArray(pluginData.author)) {
                pluginData.author = pluginData.author.join(', ');
            }

            pluginConfig.value = {
                config: configPlugin,
                plugin: pluginData,
                settings: settings,
            };
        } else {
            // If config endpoint fails, create a basic config with the plugin data we already have
            pluginConfig.value = {
                config: plugin,
                plugin: plugin,
                settings: {},
            };
        }
    } catch (error) {
        console.error('Failed to fetch plugin config:', error);
        // Fallback to basic plugin data
        pluginConfig.value = {
            config: plugin,
            plugin: plugin,
            settings: {},
        };
    } finally {
        configLoading.value = false;
    }
};

const openPluginConfig = async (plugin: Plugin) => {
    selectedPlugin.value = plugin;
    configDrawerOpen.value = true;
    await loadPluginConfig(plugin);
};

const closeConfigDrawer = () => {
    configDrawerOpen.value = false;
    selectedPlugin.value = null;
    pluginConfig.value = null;
    configError.value = null;
    // Reset form state
    showAddSettingForm.value = false;
    editingSetting.value = null;
    settingForm.value = { key: '', value: '' };
};

const viewPluginInfo = async (plugin: Plugin) => {
    selectedPlugin.value = plugin;
    infoDrawerOpen.value = true;
    // Load full plugin configuration for detailed info
    await loadPluginConfig(plugin);
};

const closeInfoDrawer = () => {
    infoDrawerOpen.value = false;
    selectedPlugin.value = null;
    // Don't clear pluginConfig here as it might be used by config drawer
};

const addNewSetting = () => {
    editingSetting.value = null;
    settingForm.value = { key: '', value: '' };
    showAddSettingForm.value = true;
};

const editSetting = (key: string, value: string) => {
    editingSetting.value = key;
    settingForm.value = { key, value };
    showAddSettingForm.value = true;
};

const cancelSettingForm = () => {
    showAddSettingForm.value = false;
    editingSetting.value = null;
    settingForm.value = { key: '', value: '' };
};

const saveSetting = async () => {
    if (!selectedPlugin.value || !settingForm.value.key || !settingForm.value.value) {
        return;
    }

    savingSetting.value = true;

    try {
        const response = await fetch(`/api/admin/plugins/${selectedPlugin.value.identifier}/settings/set`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                key: settingForm.value.key,
                value: settingForm.value.value,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Reload plugin config
        await loadPluginConfig(selectedPlugin.value);
        cancelSettingForm();
    } catch (error) {
        console.error('Failed to save setting:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to save setting',
        };
    } finally {
        savingSetting.value = false;
    }
};

const removeSetting = async (key: string) => {
    if (!selectedPlugin.value) return;

    try {
        const response = await fetch(`/api/admin/plugins/${selectedPlugin.value.identifier}/settings/remove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ key }),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Reload plugin config
        await loadPluginConfig(selectedPlugin.value);
    } catch (error) {
        console.error('Failed to remove setting:', error);
        message.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to remove setting',
        };
    }
};

// Lifecycle
onMounted(async () => {
    const ok = await sessionStore.checkSessionOrRedirect(router);
    if (!ok) return;

    await fetchPlugins();
});
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
