<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6 pb-8">
            <!-- Header Section with Actions -->
            <div class="flex flex-col gap-4">
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div class="space-y-1">
                        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">{{ t('serverStartup.title') }}</h1>
                        <p class="text-sm text-muted-foreground">
                            {{ t('serverStartup.description') }}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            :disabled="loading"
                            class="flex items-center gap-2"
                            @click="fetchServer"
                        >
                            <RefreshCw :class="['h-4 w-4', loading && 'animate-spin']" />
                            <span>{{ t('common.refresh') }}</span>
                        </Button>
                        <Button
                            v-if="hasAnyStartupPermission"
                            size="sm"
                            :disabled="saving || !hasChanges || hasErrors"
                            class="flex items-center gap-2"
                            data-umami-event="Save startup settings"
                            @click="saveChanges"
                        >
                            <Save :class="['h-4 w-4', saving && 'animate-pulse']" />
                            <span>{{ saving ? t('common.saving') : t('common.saveChanges') }}</span>
                        </Button>
                    </div>
                </div>

                <!-- Status Indicator -->
                <div v-if="hasChanges && !loading" class="flex items-center gap-2 text-sm">
                    <div class="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span class="text-muted-foreground">Unsaved changes</span>
                </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex flex-col items-center justify-center py-16">
                <div class="animate-spin h-10 w-10 border-3 border-primary border-t-transparent rounded-full"></div>
                <span class="mt-4 text-muted-foreground">{{ t('common.loading') }}</span>
            </div>

            <!-- Content -->
            <div v-else-if="server" class="space-y-6">
                <!-- Startup Command Section -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Terminal class="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverStartup.startupCommand') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverStartup.startupHelp') }}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            v-model="form.startup"
                            rows="5"
                            :disabled="!canUpdateStartup"
                            class="font-mono text-sm resize-none"
                            placeholder="Enter startup command..."
                        />
                    </CardContent>
                </Card>

                <!-- Docker Image Section -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Container class="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle class="text-lg">{{ t('serverStartup.dockerImage') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverStartup.dockerHelp') }}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <Input
                            v-model="form.image"
                            placeholder="ghcr.io/pterodactyl/yolks:java_21"
                            :disabled="!canUpdateDockerImage"
                            class="text-sm font-mono"
                        />
                        <div v-if="availableDockerImages.length" class="space-y-3">
                            <div class="flex items-center gap-2 text-sm font-medium">
                                <Boxes class="h-4 w-4 text-muted-foreground" />
                                <span>{{ t('serverStartup.availableImages') }}</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                <Button
                                    v-for="(img, idx) in availableDockerImages"
                                    :key="idx"
                                    type="button"
                                    :variant="form.image === img ? 'default' : 'outline'"
                                    size="sm"
                                    :disabled="!canUpdateDockerImage"
                                    class="text-xs font-mono justify-start h-auto py-2 px-3"
                                    @click="form.image = img"
                                >
                                    <div class="flex items-center gap-2 w-full">
                                        <Container class="h-3 w-3 shrink-0" />
                                        <span class="truncate text-left">{{ img }}</span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <!-- Variables Section -->
                <Card class="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <Settings class="h-5 w-5 text-purple-500" />
                            </div>
                            <div class="flex-1">
                                <CardTitle class="text-lg">{{ t('serverStartup.variables') }}</CardTitle>
                                <CardDescription class="text-sm">
                                    {{ t('serverStartup.variablesHelp') }}
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" class="text-xs">
                                {{ viewableVariables.length }}
                                {{ viewableVariables.length === 1 ? 'variable' : 'variables' }}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div v-if="viewableVariables.length === 0" class="text-center py-8 text-muted-foreground">
                            <Settings class="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p class="text-sm">No variables configured for this server</p>
                        </div>
                        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div
                                v-for="v in viewableVariables"
                                :key="v.variable_id"
                                class="group relative rounded-lg border-2 bg-card p-4 space-y-3 transition-all hover:border-primary/50 hover:shadow-md"
                            >
                                <!-- Variable Header -->
                                <div class="flex items-start justify-between gap-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <h3 class="font-semibold text-sm truncate">{{ v.name }}</h3>
                                            <Badge
                                                v-if="!v.user_editable"
                                                variant="outline"
                                                class="text-[10px] px-1.5 py-0"
                                            >
                                                Read-only
                                            </Badge>
                                        </div>
                                        <p class="text-xs text-muted-foreground line-clamp-2">{{ v.description }}</p>
                                    </div>
                                    <Badge variant="secondary" class="text-[10px] px-2 py-0.5 font-mono shrink-0">
                                        {{ v.env_variable }}
                                    </Badge>
                                </div>

                                <!-- Variable Input -->
                                <div class="space-y-2">
                                    <Input
                                        v-model="variableValues[v.variable_id]"
                                        :placeholder="v.default_value || 'Enter value...'"
                                        :disabled="!v.user_editable"
                                        class="text-sm"
                                        :class="[
                                            variableErrors[v.variable_id] &&
                                                'border-red-500 focus-visible:ring-red-500',
                                            !v.user_editable && 'cursor-not-allowed opacity-60',
                                        ]"
                                        @input="validateOneVariable(v)"
                                        @keyup="validateOneVariable(v)"
                                        @change="validateOneVariable(v)"
                                    />
                                    <div
                                        v-if="variableErrors[v.variable_id]"
                                        class="flex items-center gap-1.5 text-xs text-red-500"
                                    >
                                        <AlertCircle class="h-3 w-3 shrink-0" />
                                        <span>{{ variableErrors[v.variable_id] }}</span>
                                    </div>
                                    <div
                                        v-if="v.rules"
                                        class="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                                    >
                                        <Info class="h-3 w-3 shrink-0 mt-0.5" />
                                        <code class="bg-muted px-2 py-0.5 rounded flex-1 break-all">{{ v.rules }}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <!-- Error State -->
            <div v-else class="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle class="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 class="text-lg font-semibold text-foreground mb-2">{{ t('serverStartup.notFound') }}</h3>
                <p class="text-sm text-muted-foreground max-w-md">{{ error }}</p>
                <Button variant="outline" size="sm" class="mt-4" @click="fetchServer">
                    <RefreshCw class="h-4 w-4 mr-2" />
                    Try Again
                </Button>
            </div>
        </div>
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

import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { useServerPermissions } from '@/composables/useServerPermissions';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Save, Terminal, Container, Boxes, Settings, AlertCircle, Info } from 'lucide-vue-next';
import { useToast } from 'vue-toastification';

type Variable = {
    id: number;
    server_id: number;
    variable_id: number;
    variable_value: string;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: number;
    user_editable: number;
    rules: string;
    field_type: string;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();

// Check server permissions
const { hasPermission: hasServerPermission, isLoading: permissionsLoading } = useServerPermissions();

// Permission checks
const canUpdateStartup = computed(() => hasServerPermission('startup.update'));
const canUpdateDockerImage = computed(() => hasServerPermission('startup.docker-image'));
const hasAnyStartupPermission = computed(() => canUpdateStartup.value || canUpdateDockerImage.value);

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
interface ServerResponse {
    id: number;
    uuid: string;
    uuidShort: string;
    name: string;
    description?: string;
    startup?: string;
    image?: string;
    variables?: Variable[];
    spell?: { docker_images?: string | Record<string, string> } | null;
}

const server = ref<ServerResponse | null>(null);
const variables = ref<Variable[]>([]);
const availableDockerImages = ref<string[]>([]);

const form = ref({
    startup: '',
    image: '',
});

const variableValues = ref<Record<number, string>>({});
const variableErrors = ref<Record<number, string>>({});

const breadcrumbs = computed(() => [
    { text: t('common.dashboard'), href: '/dashboard' },
    { text: t('common.servers'), href: '/dashboard' },
    { text: server.value?.name || t('common.server'), href: `/server/${route.params.uuidShort}` },
    { text: t('serverStartup.title'), isCurrent: true, href: `/server/${route.params.uuidShort}/startup` },
]);

const viewableVariables = computed(() => variables.value.filter((v) => v.user_viewable === 1));

const editableVariables = computed(() => variables.value.filter((v) => v.user_editable === 1));

const hasChanges = computed(() => {
    if (!server.value) return false;
    const startupChanged = form.value.startup !== (server.value.startup || '');
    const imageChanged = form.value.image !== (server.value.image || '');
    const variableChanged = editableVariables.value.some(
        (v) => variableValues.value[v.variable_id] !== (v.variable_value || ''),
    );
    return startupChanged || imageChanged || variableChanged;
});

const hasErrors = computed(() => Object.values(variableErrors.value).some((m) => !!m));

async function fetchServer() {
    try {
        loading.value = true;
        error.value = null;
        const { data } = await axios.get(`/api/user/servers/${route.params.uuidShort}`);
        if (!data.success) throw new Error(data.message || 'Failed');
        server.value = data.data as ServerResponse;
        form.value.startup = server.value?.startup || '';
        form.value.image = server.value?.image || '';
        variables.value = server.value?.variables || [];
        variableValues.value = {};
        variables.value.forEach((v) => {
            variableValues.value[v.variable_id] = v.variable_value ?? '';
        });
        // parse available docker images from spell
        try {
            const dockerImages = server.value?.spell?.docker_images;
            if (!dockerImages) {
                availableDockerImages.value = [];
            } else if (typeof dockerImages === 'string') {
                // If it's a string, parse it
                const dockerObj = JSON.parse(dockerImages) as Record<string, string>;
                availableDockerImages.value = Object.values(dockerObj);
            } else if (typeof dockerImages === 'object') {
                // If it's already an object, use it directly
                availableDockerImages.value = Object.values(dockerImages as Record<string, string>);
            } else {
                availableDockerImages.value = [];
            }
        } catch {
            availableDockerImages.value = [];
        }
    } catch (e: unknown) {
        const err = e as { message?: string };
        error.value = err?.message || t('serverStartup.failedToFetchServer');
        toast.error(error.value);
        console.error(e);
    } finally {
        loading.value = false;
    }
}

async function saveChanges() {
    try {
        saving.value = true;
        // Validate before saving
        const ok = validateAllVariables();
        if (!ok) {
            saving.value = false;
            return;
        }
        // Only send variables that are user_editable
        const variablesPayload = editableVariables.value.map((v) => ({
            variable_id: v.variable_id,
            variable_value: variableValues.value[v.variable_id] ?? '',
        }));
        const payload: Record<string, unknown> = {
            startup: form.value.startup,
            image: form.value.image,
            variables: variablesPayload,
        };
        const { data } = await axios.put(`/api/user/servers/${route.params.uuidShort}`, payload);
        if (!data.success) throw new Error(data.message || 'Failed to save');
        await fetchServer();
        toast.success(t('serverStartup.saveSuccess'));
    } catch (e: unknown) {
        const err = e as { message?: string };
        toast.error(err.message || t('serverStartup.saveError'));
        console.error(e);
    } finally {
        saving.value = false;
    }
}

onMounted(async () => {
    // Wait for permission check to complete
    while (permissionsLoading.value) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Check if user has any startup permissions
    if (!hasAnyStartupPermission.value) {
        toast.error(t('serverStartup.noStartupPermission'));
        await router.push(`/server/${route.params.uuidShort}`);
        return;
    }

    await fetchServer();
});

// Validation logic for variables based on rules string
function parseRules(rules: string): Array<{ type: string; value?: number | string }> {
    if (!rules) return [];
    const parts = rules.split('|');
    const parsed: Array<{ type: string; value?: number | string }> = [];
    for (const part of parts) {
        if (part === 'required' || part === 'nullable' || part === 'string' || part === 'numeric') {
            parsed.push({ type: part });
            continue;
        }
        const maxMatch = part.match(/^max:(\d+)$/);
        if (maxMatch) {
            parsed.push({ type: 'max', value: Number(maxMatch[1]) });
            continue;
        }
        const minMatch = part.match(/^min:(\d+)$/);
        if (minMatch) {
            parsed.push({ type: 'min', value: Number(minMatch[1]) });
            continue;
        }
        const regexMatch = part.match(/^regex:\/(.*)\/$/);
        if (regexMatch) {
            parsed.push({ type: 'regex', value: regexMatch[1] });
            continue;
        }
    }
    return parsed;
}

function normalizeRegexPattern(pattern: string): string {
    // Convert escaped backslashes from JSON (\\) into single backslashes for JS
    try {
        return pattern.replace(/\\\\/g, '\\');
    } catch {
        return pattern;
    }
}

function validateVariableAgainstRules(value: string, rules: string): string | '' {
    const parsed = parseRules(rules || '');
    const hasNullable = parsed.some((r) => r.type === 'nullable');
    const isRequired = parsed.some((r) => r.type === 'required');
    const isNumeric = parsed.some((r) => r.type === 'numeric');

    // Use the raw value, don't trim for regex patterns
    const val = value ?? '';

    // Handle required/nullable with trimmed check for empty
    const trimmedForEmptyCheck = val.trim();
    if (!isRequired && hasNullable && trimmedForEmptyCheck === '') return '';
    if (isRequired && trimmedForEmptyCheck === '') return 'This field is required';

    // If empty and not required, pass validation
    if (!isRequired && trimmedForEmptyCheck === '') return '';

    // Check numeric (use trimmed value)
    if (isNumeric && !/^\d+$/.test(trimmedForEmptyCheck)) return 'This field must be numeric';

    // Check other rules (use raw value for regex, trimmed for min/max)
    for (const rule of parsed) {
        if (rule.type === 'min' && typeof rule.value === 'number') {
            const checkValue = isNumeric ? Number(trimmedForEmptyCheck).toString() : trimmedForEmptyCheck;
            if (checkValue.length < rule.value) {
                return `Minimum ${rule.value} ${isNumeric ? 'digits' : 'characters'}`;
            }
        }
        if (rule.type === 'max' && typeof rule.value === 'number') {
            const checkValue = isNumeric ? Number(trimmedForEmptyCheck).toString() : trimmedForEmptyCheck;
            if (checkValue.length > rule.value) {
                return `Maximum ${rule.value} ${isNumeric ? 'digits' : 'characters'}`;
            }
        }
        if (rule.type === 'regex' && typeof rule.value === 'string') {
            try {
                const pattern = normalizeRegexPattern(rule.value as string);
                const re = new RegExp(pattern);
                // Test against trimmed value for regex
                if (!re.test(trimmedForEmptyCheck)) {
                    return t('serverStartup.valueDoesNotMatchFormat');
                }
            } catch (err) {
                console.error('Invalid regex pattern:', rule.value, err);
                // Ignore malformed regex
            }
        }
    }
    return '';
}

function validateOneVariable(v: Variable): void {
    const val = variableValues.value[v.variable_id] ?? '';
    const message = validateVariableAgainstRules(val, v.rules || '');

    // Always update the errors object to ensure reactivity
    if (message) {
        variableErrors.value = {
            ...variableErrors.value,
            [v.variable_id]: message,
        };
    } else {
        // Create new object without the error to ensure reactivity
        const newErrors = { ...variableErrors.value };
        delete newErrors[v.variable_id];
        variableErrors.value = newErrors;
    }
}

function validateAllVariables(): boolean {
    let ok = true;
    const newErrors: Record<number, string> = {};

    // Only validate viewable and editable variables
    for (const v of viewableVariables.value) {
        const val = variableValues.value[v.variable_id] ?? '';
        const message = validateVariableAgainstRules(val, v.rules || '');
        if (message) {
            newErrors[v.variable_id] = message;
            ok = false;
        }
    }

    // Update errors object to trigger reactivity
    variableErrors.value = newErrors;
    return ok;
}

// Watch for changes in variable values and validate immediately
watch(
    variableValues,
    (newVals, oldVals) => {
        // Only validate viewable variables that actually changed
        if (oldVals) {
            for (const v of viewableVariables.value) {
                if (newVals[v.variable_id] !== oldVals[v.variable_id]) {
                    validateOneVariable(v);
                }
            }
        }
    },
    { deep: true },
);
</script>
