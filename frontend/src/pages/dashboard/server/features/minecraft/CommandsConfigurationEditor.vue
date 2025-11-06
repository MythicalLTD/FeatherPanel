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

import { reactive, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ListChecks, Plus, Save, Trash2 } from 'lucide-vue-next';

interface CommandsYaml {
    'command-block-overrides'?: unknown;
    'ignore-vanilla-permissions'?: unknown;
    aliases?: unknown;
    [key: string]: unknown;
}

interface AliasEntry {
    name: string;
    commandsText: string;
}

interface CommandsForm {
    overridesText: string;
    ignoreVanillaPermissions: boolean;
    aliases: AliasEntry[];
}

interface ParseResult {
    data: CommandsYaml;
}

const props = withDefaults(
    defineProps<{
        content: string;
        readonly?: boolean;
        saving?: boolean;
    }>(),
    {
        readonly: false,
        saving: false,
    },
);

const emit = defineEmits<{
    save: [content: string];
    switchToRaw: [];
}>();

const { t } = useI18n();

const originalConfig = reactive<ParseResult>({ data: parseCommandsConfiguration(props.content) });
const form = reactive<CommandsForm>(createForm(originalConfig.data));

watch(
    () => props.content,
    (newContent) => {
        originalConfig.data = parseCommandsConfiguration(newContent);
        resetForm(form, originalConfig.data);
    },
);

function parseCommandsConfiguration(content: string): CommandsYaml {
    try {
        const parsed = parseYaml(content) as CommandsYaml;
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (error) {
        console.warn('Failed to parse commands.yml:', error);
    }
    return {};
}

function createForm(config: CommandsYaml): CommandsForm {
    const overrides = Array.isArray(config['command-block-overrides'])
        ? (config['command-block-overrides'] as unknown[])
              .map((entry) => String(entry ?? '').trim())
              .filter((entry) => entry.length > 0)
        : [];

    const aliasesSource = config.aliases;
    const aliasEntries: AliasEntry[] = [];

    if (aliasesSource && typeof aliasesSource === 'object' && !Array.isArray(aliasesSource)) {
        Object.entries(aliasesSource as Record<string, unknown>).forEach(([name, value]) => {
            if (!name.trim()) {
                return;
            }
            const commands = Array.isArray(value)
                ? value.map((item) => String(item ?? '').trim()).filter((entry) => entry.length > 0)
                : [];
            aliasEntries.push({ name, commandsText: commands.join('\n') });
        });
    }

    return {
        overridesText: overrides.join('\n'),
        ignoreVanillaPermissions: toBoolean(config['ignore-vanilla-permissions'], false),
        aliases: aliasEntries,
    };
}

function resetForm(target: CommandsForm, config: CommandsYaml): void {
    const fresh = createForm(config);
    target.overridesText = fresh.overridesText;
    target.ignoreVanillaPermissions = fresh.ignoreVanillaPermissions;
    target.aliases.splice(0, target.aliases.length, ...fresh.aliases);
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
    }
    return fallback;
}

function applyFormToConfig(config: CommandsYaml, formState: CommandsForm): void {
    const cloned = parseYaml(stringifyYaml(config)) as CommandsYaml;

    cloned['command-block-overrides'] = splitLines(formState.overridesText);
    cloned['ignore-vanilla-permissions'] = formState.ignoreVanillaPermissions;

    const aliasMap: Record<string, string[]> = {};
    formState.aliases.forEach((entry) => {
        const aliasName = entry.name.trim();
        if (!aliasName) {
            return;
        }
        const commands = splitLines(entry.commandsText);
        if (commands.length > 0) {
            aliasMap[aliasName] = commands;
        }
    });
    cloned.aliases = aliasMap;

    Object.assign(config, cloned);
}

function splitLines(text: string): string[] {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

const handleSave = () => {
    const cloned = parseYaml(stringifyYaml(originalConfig.data)) as CommandsYaml;
    applyFormToConfig(cloned, form);
    emit('save', stringifyYaml(cloned, { lineWidth: 0 }));
};

const handleSwitchToRaw = () => {
    emit('switchToRaw');
};

const handleAddAlias = () => {
    form.aliases.push({ name: '', commandsText: '' });
};

const handleRemoveAlias = (index: number) => {
    form.aliases.splice(index, 1);
};
</script>

<template>
    <Card class="border-primary/20">
        <CardHeader class="border-b border-border/40">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="space-y-2">
                    <CardTitle class="text-2xl font-bold">
                        {{ t('commandsConfig.title') }}
                    </CardTitle>
                    <CardDescription class="text-sm text-muted-foreground">
                        {{ t('commandsConfig.description') }}
                    </CardDescription>
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="handleSwitchToRaw">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        {{ t('commandsConfig.actions.switchToRaw') }}
                    </Button>
                    <Button size="sm" :disabled="props.readonly || props.saving" @click="handleSave">
                        <Save class="mr-2 h-4 w-4" />
                        <span v-if="props.saving">{{ t('commandsConfig.actions.saving') }}</span>
                        <span v-else>{{ t('commandsConfig.actions.save') }}</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent class="space-y-10 p-6">
            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ListChecks class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('commandsConfig.sections.general') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('commandsConfig.sectionsDescriptions.general') }}
                        </p>
                    </div>
                </div>

                <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                    <div class="flex items-start justify-between gap-4">
                        <div class="space-y-1">
                            <Label for="commands-ignore-vanilla" class="text-sm font-semibold">
                                {{ t('commandsConfig.fields.ignoreVanillaPermissions.label') }}
                            </Label>
                            <p class="text-xs text-muted-foreground">
                                {{ t('commandsConfig.fields.ignoreVanillaPermissions.description') }}
                            </p>
                        </div>
                        <input
                            id="commands-ignore-vanilla"
                            v-model="form.ignoreVanillaPermissions"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="commands-checkbox"
                        />
                    </div>
                </div>

                <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                    <Label for="commands-overrides" class="text-sm font-semibold">
                        {{ t('commandsConfig.fields.commandBlockOverrides.label') }}
                    </Label>
                    <Textarea
                        id="commands-overrides"
                        v-model="form.overridesText"
                        rows="4"
                        :readonly="props.readonly"
                    />
                    <p class="text-xs text-muted-foreground">
                        {{ t('commandsConfig.fields.commandBlockOverrides.description') }}
                    </p>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ListChecks class="h-5 w-5" />
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold">{{ t('commandsConfig.sections.aliases') }}</h3>
                            <p class="text-sm text-muted-foreground">
                                {{ t('commandsConfig.sectionsDescriptions.aliases') }}
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        class="gap-2"
                        :disabled="props.readonly"
                        @click="handleAddAlias"
                    >
                        <Plus class="h-4 w-4" />
                        {{ t('commandsConfig.fields.aliases.addAlias') }}
                    </Button>
                </div>

                <div
                    v-if="form.aliases.length === 0"
                    class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
                >
                    {{ t('commandsConfig.fields.aliases.emptyState') }}
                </div>

                <div
                    v-for="(alias, index) in form.aliases"
                    :key="`alias-${index}`"
                    class="space-y-3 rounded-lg border p-4 shadow-sm"
                >
                    <div class="flex items-start gap-4">
                        <div class="flex-1 space-y-2">
                            <Label :for="`commands-alias-name-${index}`" class="text-sm font-semibold">
                                {{ t('commandsConfig.fields.aliases.aliasName') }}
                            </Label>
                            <Input
                                :id="`commands-alias-name-${index}`"
                                v-model="alias.name"
                                type="text"
                                :readonly="props.readonly"
                                placeholder="spawn"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="text-muted-foreground hover:text-destructive"
                            :disabled="props.readonly"
                            @click="handleRemoveAlias(index)"
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                    <div class="space-y-2">
                        <Label :for="`commands-alias-commands-${index}`" class="text-sm font-semibold">
                            {{ t('commandsConfig.fields.aliases.aliasCommands') }}
                        </Label>
                        <Textarea
                            :id="`commands-alias-commands-${index}`"
                            v-model="alias.commandsText"
                            rows="3"
                            :readonly="props.readonly"
                            placeholder="say Hello world"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('commandsConfig.fields.aliases.aliasCommandsHint') }}
                        </p>
                    </div>
                </div>
            </section>
        </CardContent>
    </Card>
</template>

<style scoped>
.commands-checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.4rem;
    border: 2px solid hsl(var(--border));
    background-color: hsl(var(--background));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    cursor: pointer;
    transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease,
        transform 0.1s ease;
}

.commands-checkbox::after {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 0.2rem;
    background-color: transparent;
    transition: background-color 0.15s ease;
}

.commands-checkbox:hover:not(:disabled) {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
}

.commands-checkbox:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
}

.commands-checkbox:active:not(:disabled) {
    transform: scale(0.96);
}

.commands-checkbox:checked {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
}

.commands-checkbox:checked::after {
    background-color: hsl(var(--primary-foreground));
}

.commands-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.commands-checkbox:disabled::after {
    background-color: transparent;
}
</style>
