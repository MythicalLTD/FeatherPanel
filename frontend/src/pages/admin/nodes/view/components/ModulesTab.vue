<!--
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->

<template>
    <div class="space-y-4">
        <div v-if="loading" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>

        <div v-else-if="error" class="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg flex items-center gap-2">
                        <div class="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
                        Modules Unavailable
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <div class="space-y-3">
                            <div class="font-medium">Failed to fetch modules</div>
                            <div class="text-sm">{{ error }}</div>
                            <Button size="sm" variant="outline" :loading="loading" @click="$emit('retry')"
                                >Retry</Button
                            >
                        </div>
                    </Alert>
                </CardContent>
            </Card>
        </div>

        <div v-else-if="modules && modules.length > 0" class="space-y-4">
            <Card v-for="module in modules" :key="module.name" class="w-full">
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <div>
                            <CardTitle class="text-lg">{{ module.name }}</CardTitle>
                            <CardDescription class="mt-1">{{ module.description }}</CardDescription>
                        </div>
                        <Badge :variant="module.enabled ? 'default' : 'secondary'">
                            {{ module.enabled ? 'Enabled' : 'Disabled' }}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="flex items-center gap-2">
                        <Button
                            v-if="!module.enabled"
                            size="sm"
                            :loading="actionLoading === `enable-${module.name}`"
                            @click="handleEnable(module.name)"
                        >
                            Enable
                        </Button>
                        <Button
                            v-else
                            size="sm"
                            variant="outline"
                            :loading="actionLoading === `disable-${module.name}`"
                            @click="handleDisable(module.name)"
                        >
                            Disable
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            :loading="configLoading[module.name]"
                            @click="handleLoadConfig(module.name)"
                        >
                            {{ expandedModule === module.name ? 'Hide Configuration' : 'Show Configuration' }}
                        </Button>
                    </div>

                    <!-- Configuration Editor -->
                    <div v-if="expandedModule === module.name" class="space-y-4 border-t pt-4">
                        <div v-if="configLoading[module.name]" class="flex items-center justify-center py-8">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>

                        <div v-else-if="configError[module.name]" class="space-y-4">
                            <Alert variant="destructive">
                                <div class="space-y-3">
                                    <div class="font-medium">Failed to load configuration</div>
                                    <div class="text-sm">{{ configError[module.name] }}</div>
                                </div>
                            </Alert>
                        </div>

                        <div v-else-if="moduleConfigs[module.name]" class="space-y-4">
                            <Alert v-if="moduleConfigs[module.name]?.enabled" variant="destructive">
                                <AlertTitle>Configuration Locked</AlertTitle>
                                <AlertDescription>Disable the module to edit configuration.</AlertDescription>
                            </Alert>

                            <div class="flex items-center justify-between">
                                <div class="text-sm text-muted-foreground">Module configuration (JSON)</div>
                                <div class="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        :disabled="configSaving[module.name]"
                                        @click="handleLoadConfig(module.name)"
                                    >
                                        Reload
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        :disabled="configSaving[module.name] || !(configDirty[module.name] ?? false)"
                                        @click="handleResetConfig(module.name)"
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>

                            <div class="space-y-2">
                                <Label class="text-sm font-medium">Configuration (JSON)</Label>
                                <textarea
                                    :value="configContent[module.name] || ''"
                                    class="w-full h-96 p-3 text-xs font-mono bg-muted border rounded-md resize-none"
                                    :disabled="configSaving[module.name] || moduleConfigs[module.name]?.enabled"
                                    @input="
                                        handleConfigChange(module.name, ($event.target as HTMLTextAreaElement).value)
                                    "
                                ></textarea>
                                <p class="text-xs text-muted-foreground">
                                    Edit the JSON configuration directly. Changes will be saved to Wings. The module
                                    must be disabled before making changes.
                                </p>
                            </div>

                            <div
                                class="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                            >
                                <svg
                                    class="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                                <div class="flex-1">
                                    <div class="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                        Configuration Warning
                                    </div>
                                    <p class="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                                        Invalid configuration may cause the module to fail. Always review changes
                                        carefully. Consider backing up the configuration before making changes.
                                    </p>
                                </div>
                            </div>

                            <div class="flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    :loading="configSaving[module.name]"
                                    :disabled="
                                        !(configDirty[module.name] ?? false) ||
                                        configSaving[module.name] ||
                                        moduleConfigs[module.name]?.enabled
                                    "
                                    @click="handleSaveConfig(module.name)"
                                >
                                    <svg
                                        v-if="!configSaving[module.name]"
                                        class="h-4 w-4 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                    Save Configuration
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div v-else class="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle class="text-lg">No Modules Available</CardTitle>
                </CardHeader>
                <CardContent>
                    <p class="text-sm text-muted-foreground">No modules are currently registered on this node.</p>
                </CardContent>
            </Card>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

export type Module = {
    name: string;
    description: string;
    enabled: boolean;
};

export type ModuleConfig = {
    name: string;
    description: string;
    enabled: boolean;
    config: Record<string, unknown>;
};

defineProps<{
    loading: boolean;
    error: string | null;
    modules: Module[] | null;
}>();

const emit = defineEmits<{
    retry: [];
    enable: [moduleName: string];
    disable: [moduleName: string];
    configure: [moduleName: string];
    'update-config': [moduleName: string, config: Record<string, unknown>];
}>();

const actionLoading = ref<string | null>(null);
const expandedModule = ref<string | null>(null);
const moduleConfigs = ref<Record<string, ModuleConfig>>({});
const configContent = ref<Record<string, string>>({});
const originalConfigContent = ref<Record<string, string>>({});
const configLoading = ref<Record<string, boolean>>({});
const configError = ref<Record<string, string | null>>({});
const configSaving = ref<Record<string, boolean>>({});

const configDirty = computed(() => {
    const dirty: Record<string, boolean> = {};
    Object.keys(configContent.value).forEach((moduleName) => {
        dirty[moduleName] =
            configContent.value[moduleName] !== null &&
            originalConfigContent.value[moduleName] !== null &&
            configContent.value[moduleName] !== originalConfigContent.value[moduleName];
    });
    return dirty;
});

function handleEnable(moduleName: string) {
    actionLoading.value = `enable-${moduleName}`;
    emit('enable', moduleName);
    setTimeout(() => {
        if (actionLoading.value === `enable-${moduleName}`) {
            actionLoading.value = null;
        }
    }, 2000);
}

function handleDisable(moduleName: string) {
    actionLoading.value = `disable-${moduleName}`;
    emit('disable', moduleName);
    setTimeout(() => {
        if (actionLoading.value === `disable-${moduleName}`) {
            actionLoading.value = null;
        }
    }, 2000);
}

function handleLoadConfig(moduleName: string) {
    if (expandedModule.value === moduleName) {
        expandedModule.value = null;
        return;
    }
    expandedModule.value = moduleName;
    emit('configure', moduleName);
}

function handleConfigChange(moduleName: string, value: string) {
    configContent.value[moduleName] = value;
}

function handleResetConfig(moduleName: string) {
    if (originalConfigContent.value[moduleName]) {
        configContent.value[moduleName] = originalConfigContent.value[moduleName];
    }
}

function handleSaveConfig(moduleName: string) {
    if (!configContent.value[moduleName]) return;
    try {
        const config = JSON.parse(configContent.value[moduleName]);
        emit('update-config', moduleName, config);
    } catch (e) {
        console.error('Invalid JSON:', e);
    }
}

// Expose methods for parent to update state
defineExpose({
    setActionLoading: (value: string | null) => {
        actionLoading.value = value;
    },
    setModuleConfig: (moduleName: string, config: ModuleConfig | null) => {
        if (config) {
            moduleConfigs.value[moduleName] = config;
            const configStr = JSON.stringify(config.config, null, 2);
            configContent.value[moduleName] = configStr;
            originalConfigContent.value[moduleName] = configStr;
        } else {
            delete moduleConfigs.value[moduleName];
            delete configContent.value[moduleName];
            delete originalConfigContent.value[moduleName];
        }
    },
    setConfigLoading: (moduleName: string, loading: boolean) => {
        configLoading.value[moduleName] = loading;
    },
    setConfigError: (moduleName: string, error: string | null) => {
        configError.value[moduleName] = error;
    },
    setConfigSaving: (moduleName: string, saving: boolean) => {
        configSaving.value[moduleName] = saving;
        if (!saving) {
            // Update original content after successful save
            if (configContent.value[moduleName]) {
                originalConfigContent.value[moduleName] = configContent.value[moduleName];
            }
        }
    },
});
</script>
