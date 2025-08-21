<template>
    <DashboardLayout :breadcrumbs="breadcrumbs">
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-bold tracking-tight">{{ t('serverStartup.title') }}</h1>
                    <p class="text-muted-foreground">
                        {{ t('serverStartup.description') }}
                    </p>
                </div>
                <div class="flex gap-2">
                    <Button variant="outline" :disabled="loading" @click="fetchServer">
                        <RefreshCw class="h-4 w-4 mr-2" />
                        {{ t('common.refresh') }}
                    </Button>
                    <Button :disabled="saving || !hasChanges || hasErrors" @click="saveChanges">
                        <Save class="h-4 w-4 mr-2" />
                        {{ saving ? t('common.saving') : t('common.saveChanges') }}
                    </Button>
                </div>
            </div>

            <div v-if="loading" class="flex items-center justify-center py-8">
                <div class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                <span class="ml-2">{{ t('common.loading') }}</span>
            </div>

            <div v-else-if="server" class="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{{ t('serverStartup.startupCommand') }}</CardTitle>
                        <CardDescription>
                            {{ t('serverStartup.startupHelp') }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-3">
                        <Textarea v-model="form.startup" rows="5" class="font-mono text-sm" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{{ t('serverStartup.dockerImage') }}</CardTitle>
                        <CardDescription>
                            {{ t('serverStartup.dockerHelp') }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-3">
                        <Input v-model="form.image" placeholder="ghcr.io/pterodactyl/yolks:java_21" />
                        <div v-if="availableDockerImages.length" class="text-xs text-muted-foreground">
                            <span class="font-medium mr-2">{{ t('serverStartup.availableImages') }}</span>
                            <span class="inline-flex flex-wrap gap-2">
                                <Button
                                    v-for="img in availableDockerImages"
                                    :key="img"
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    @click="form.image = img"
                                >
                                    {{ img }}
                                </Button>
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{{ t('serverStartup.variables') }}</CardTitle>
                        <CardDescription>
                            {{ t('serverStartup.variablesHelp') }}
                        </CardDescription>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <div v-for="v in variables" :key="v.variable_id" class="border rounded-lg p-4 space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="font-medium">{{ v.name }}</div>
                                <Badge variant="secondary">{{ v.env_variable }}</Badge>
                            </div>
                            <div class="text-xs text-muted-foreground">{{ v.description }}</div>
                            <Input
                                v-model="variableValues[v.variable_id]"
                                :placeholder="v.default_value || ''"
                                :disabled="!v.user_editable"
                                @input="() => validateOneVariable(v)"
                            />
                            <p v-if="variableErrors[v.variable_id]" class="text-xs text-red-500">
                                {{ variableErrors[v.variable_id] }}
                            </p>
                            <div class="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>{{ t('serverStartup.rules') }}:</span>
                                <code class="bg-muted px-2 py-0.5 rounded">{{ v.rules }}</code>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div v-else class="text-center py-8 text-muted-foreground">
                {{ error || t('serverStartup.notFound') }}
            </div>
        </div>
    </DashboardLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Save } from 'lucide-vue-next';

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
// no router needed here
const { t } = useI18n();

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
    spell?: { docker_images?: string } | null;
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

const hasChanges = computed(() => {
    if (!server.value) return false;
    const startupChanged = form.value.startup !== (server.value.startup || '');
    const imageChanged = form.value.image !== (server.value.image || '');
    const variableChanged = variables.value.some(
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
            const dockerImages = server.value?.spell?.docker_images ?? '';
            const dockerObj = dockerImages ? (JSON.parse(dockerImages) as Record<string, string>) : {};
            availableDockerImages.value = Object.values(dockerObj);
        } catch {
            availableDockerImages.value = [];
        }
    } catch (e: unknown) {
        const err = e as { message?: string };
        error.value = err?.message || 'Failed to fetch server';
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
        const variablesPayload = variables.value.map((v) => ({
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
    } catch {
        // no-op; could add toast
    } finally {
        saving.value = false;
    }
}

onMounted(fetchServer);

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

    const trimmed = value ?? '';
    if (!isRequired && hasNullable && trimmed === '') return '';
    if (isRequired && trimmed === '') return 'This field is required';

    if (isNumeric && !/^\d+$/.test(trimmed)) return 'This field must be numeric';

    for (const rule of parsed) {
        if (rule.type === 'min' && typeof rule.value === 'number') {
            if ((isNumeric ? Number(trimmed).toString().length : trimmed.length) < rule.value) {
                return `Minimum ${rule.value} ${isNumeric ? 'digits' : 'characters'}`;
            }
        }
        if (rule.type === 'max' && typeof rule.value === 'number') {
            if ((isNumeric ? Number(trimmed).toString().length : trimmed.length) > rule.value) {
                return `Maximum ${rule.value} ${isNumeric ? 'digits' : 'characters'}`;
            }
        }
        if (rule.type === 'regex' && typeof rule.value === 'string') {
            try {
                const pattern = normalizeRegexPattern(rule.value as string);
                const re = new RegExp(pattern);
                if (!re.test(trimmed)) return 'Value does not match required format';
            } catch {
                // Ignore malformed regex
            }
        }
    }
    return '';
}

function validateOneVariable(v: Variable): void {
    const val = variableValues.value[v.variable_id] ?? '';
    const message = validateVariableAgainstRules(val, v.rules || '');
    if (message) {
        variableErrors.value[v.variable_id] = message;
    } else {
        delete variableErrors.value[v.variable_id];
    }
}

function validateAllVariables(): boolean {
    let ok = true;
    for (const v of variables.value) {
        const val = variableValues.value[v.variable_id] ?? '';
        const message = validateVariableAgainstRules(val, v.rules || '');
        if (message) {
            variableErrors.value[v.variable_id] = message;
            ok = false;
        } else {
            delete variableErrors.value[v.variable_id];
        }
    }
    return ok;
}

watch(
    variableValues,
    () => {
        // Validate on any change, but keep it lightweight by validating only touched fields via input handler.
        // Here we could run a full validation if needed.
    },
    { deep: true },
);
</script>
