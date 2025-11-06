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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, ArrowLeft, FileText, Gauge, Layers, Save, Settings2 } from 'lucide-vue-next';

interface SpawnLimits {
    monsters: number;
    animals: number;
    waterAnimals: number;
    waterAmbient: number;
    waterUndergroundCreature: number;
    axolotls: number;
    ambient: number;
}

interface TicksPer {
    animalSpawns: number;
    monsterSpawns: number;
    waterSpawns: number;
    waterAmbientSpawns: number;
    waterUndergroundCreatureSpawns: number;
    axolotlSpawns: number;
    ambientSpawns: number;
    autosave: number;
}

type DeprecatedVerboseMode = 'default' | 'true' | 'false';

interface BukkitConfigurationForm {
    allowEnd: boolean;
    warnOnOverload: boolean;
    permissionsFile: string;
    updateFolder: string;
    pluginProfiling: boolean;
    connectionThrottle: number;
    queryPlugins: boolean;
    deprecatedVerbose: DeprecatedVerboseMode;
    shutdownMessage: string;
    minimumApi: string;
    useMapColorCache: boolean;
    spawnLimits: SpawnLimits;
    chunkGcPeriodInTicks: number;
    ticksPer: TicksPer;
    aliases: string;
}

interface ParseResult {
    form: BukkitConfigurationForm;
    headerLines: string[];
    preservedLines: string[];
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

const metadata = reactive<{ headerLines: string[]; preservedLines: string[] }>({ headerLines: [], preservedLines: [] });

const form = reactive<BukkitConfigurationForm>(initializeForm(props.content));

watch(
    () => props.content,
    (newContent) => {
        const parsed = parseContent(newContent);
        updateMetadata(parsed);
        Object.assign(form, parsed.form);
    },
);

function initializeForm(content: string): BukkitConfigurationForm {
    const parsed = parseContent(content);
    updateMetadata(parsed);
    return parsed.form;
}

function updateMetadata(parsed: ParseResult): void {
    metadata.headerLines = [...parsed.headerLines];
    metadata.preservedLines = [...parsed.preservedLines];
}

function getDefaultForm(): BukkitConfigurationForm {
    return {
        allowEnd: true,
        warnOnOverload: true,
        permissionsFile: 'permissions.yml',
        updateFolder: 'update',
        pluginProfiling: false,
        connectionThrottle: 4000,
        queryPlugins: true,
        deprecatedVerbose: 'default',
        shutdownMessage: 'Server closed',
        minimumApi: 'none',
        useMapColorCache: true,
        spawnLimits: {
            monsters: 70,
            animals: 10,
            waterAnimals: 5,
            waterAmbient: 20,
            waterUndergroundCreature: 5,
            axolotls: 5,
            ambient: 15,
        },
        chunkGcPeriodInTicks: 600,
        ticksPer: {
            animalSpawns: 400,
            monsterSpawns: 1,
            waterSpawns: 1,
            waterAmbientSpawns: 1,
            waterUndergroundCreatureSpawns: 1,
            axolotlSpawns: 1,
            ambientSpawns: 1,
            autosave: 6000,
        },
        aliases: 'now-in-commands.yml',
    };
}

function parseContent(content: string): ParseResult {
    const formData = getDefaultForm();
    const headerLines: string[] = [];
    const preservedLines: string[] = [];

    const lines: string[] = content.split(/\r?\n/);
    let started = false;
    let currentSection: 'settings' | 'spawn-limits' | 'chunk-gc' | 'ticks-per' | null = null;

    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]!;
        const trimmed = line.trim();

        if (!started && (trimmed === '' || trimmed.startsWith('#'))) {
            headerLines.push(line);
            continue;
        }

        started = true;

        if (trimmed === '' || trimmed.startsWith('#')) {
            preservedLines.push(line);
            continue;
        }

        if (!line.startsWith(' ')) {
            const topMatch = /^([A-Za-z0-9-]+):(?:\s*(.+))?$/.exec(trimmed);
            if (!topMatch) {
                preservedLines.push(line);
                currentSection = null;
                continue;
            }

            const rawKey = topMatch[1];
            const rawValue = topMatch[2];
            if (rawKey === undefined) {
                preservedLines.push(line);
                currentSection = null;
                continue;
            }
            const key = rawKey;
            const value = rawValue ?? '';

            switch (key) {
                case 'settings':
                case 'spawn-limits':
                case 'chunk-gc':
                case 'ticks-per':
                    currentSection = key;
                    break;
                case 'aliases':
                    formData.aliases = value.trim();
                    currentSection = null;
                    break;
                default:
                    preservedLines.push(line);
                    currentSection = null;
                    break;
            }

            continue;
        }

        if (!currentSection) {
            preservedLines.push(line);
            continue;
        }

        const nestedMatch = /^\s{2}([A-Za-z0-9-]+):\s*(.+)$/.exec(line);
        if (!nestedMatch) {
            preservedLines.push(line);
            continue;
        }

        const rawNestedKey = nestedMatch[1];
        const rawNestedValue = nestedMatch[2];
        if (rawNestedKey === undefined) {
            preservedLines.push(line);
            continue;
        }
        const nestedKey = rawNestedKey;
        const nestedValue = rawNestedValue ?? '';

        switch (currentSection) {
            case 'settings':
                applySettingsValue(formData, nestedKey, nestedValue);
                break;
            case 'spawn-limits':
                applySpawnLimitValue(formData, nestedKey, nestedValue);
                break;
            case 'chunk-gc':
                if (nestedKey === 'period-in-ticks') {
                    formData.chunkGcPeriodInTicks = parseNumeric(nestedValue, formData.chunkGcPeriodInTicks);
                } else {
                    preservedLines.push(line);
                }
                break;
            case 'ticks-per':
                applyTicksPerValue(formData, nestedKey, nestedValue);
                break;
        }
    }

    return {
        form: formData,
        headerLines,
        preservedLines,
    };
}

function applySettingsValue(formData: BukkitConfigurationForm, key: string, value: string): void {
    switch (key) {
        case 'allow-end':
            formData.allowEnd = parseBoolean(value, formData.allowEnd);
            break;
        case 'warn-on-overload':
            formData.warnOnOverload = parseBoolean(value, formData.warnOnOverload);
            break;
        case 'permissions-file':
            formData.permissionsFile = value.trim();
            break;
        case 'update-folder':
            formData.updateFolder = value.trim();
            break;
        case 'plugin-profiling':
            formData.pluginProfiling = parseBoolean(value, formData.pluginProfiling);
            break;
        case 'connection-throttle':
            formData.connectionThrottle = parseNumeric(value, formData.connectionThrottle);
            break;
        case 'query-plugins':
            formData.queryPlugins = parseBoolean(value, formData.queryPlugins);
            break;
        case 'deprecated-verbose':
            formData.deprecatedVerbose = parseDeprecatedVerbose(value, formData.deprecatedVerbose);
            break;
        case 'shutdown-message':
            formData.shutdownMessage = value.trim();
            break;
        case 'minimum-api':
            formData.minimumApi = value.trim();
            break;
        case 'use-map-color-cache':
            formData.useMapColorCache = parseBoolean(value, formData.useMapColorCache);
            break;
        default:
            break;
    }
}

function applySpawnLimitValue(formData: BukkitConfigurationForm, key: string, value: string): void {
    switch (key) {
        case 'monsters':
            formData.spawnLimits.monsters = parseNumeric(value, formData.spawnLimits.monsters);
            break;
        case 'animals':
            formData.spawnLimits.animals = parseNumeric(value, formData.spawnLimits.animals);
            break;
        case 'water-animals':
            formData.spawnLimits.waterAnimals = parseNumeric(value, formData.spawnLimits.waterAnimals);
            break;
        case 'water-ambient':
            formData.spawnLimits.waterAmbient = parseNumeric(value, formData.spawnLimits.waterAmbient);
            break;
        case 'water-underground-creature':
            formData.spawnLimits.waterUndergroundCreature = parseNumeric(
                value,
                formData.spawnLimits.waterUndergroundCreature,
            );
            break;
        case 'axolotls':
            formData.spawnLimits.axolotls = parseNumeric(value, formData.spawnLimits.axolotls);
            break;
        case 'ambient':
            formData.spawnLimits.ambient = parseNumeric(value, formData.spawnLimits.ambient);
            break;
        default:
            break;
    }
}

function applyTicksPerValue(formData: BukkitConfigurationForm, key: string, value: string): void {
    switch (key) {
        case 'animal-spawns':
            formData.ticksPer.animalSpawns = parseNumeric(value, formData.ticksPer.animalSpawns);
            break;
        case 'monster-spawns':
            formData.ticksPer.monsterSpawns = parseNumeric(value, formData.ticksPer.monsterSpawns);
            break;
        case 'water-spawns':
            formData.ticksPer.waterSpawns = parseNumeric(value, formData.ticksPer.waterSpawns);
            break;
        case 'water-ambient-spawns':
            formData.ticksPer.waterAmbientSpawns = parseNumeric(value, formData.ticksPer.waterAmbientSpawns);
            break;
        case 'water-underground-creature-spawns':
            formData.ticksPer.waterUndergroundCreatureSpawns = parseNumeric(
                value,
                formData.ticksPer.waterUndergroundCreatureSpawns,
            );
            break;
        case 'axolotl-spawns':
            formData.ticksPer.axolotlSpawns = parseNumeric(value, formData.ticksPer.axolotlSpawns);
            break;
        case 'ambient-spawns':
            formData.ticksPer.ambientSpawns = parseNumeric(value, formData.ticksPer.ambientSpawns);
            break;
        case 'autosave':
            formData.ticksPer.autosave = parseNumeric(value, formData.ticksPer.autosave);
            break;
        default:
            break;
    }
}

function parseBoolean(value: string, fallback: boolean): boolean {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
        return true;
    }
    if (normalized === 'false') {
        return false;
    }
    return fallback;
}

function parseNumeric(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDeprecatedVerbose(value: string, fallback: DeprecatedVerboseMode): DeprecatedVerboseMode {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'false' || normalized === 'default') {
        return normalized as DeprecatedVerboseMode;
    }
    return fallback;
}

function formatBoolean(value: boolean): string {
    return value ? 'true' : 'false';
}

function formatString(value: string, fallback?: string): string {
    const trimmed = value.trim();
    if (trimmed === '' && fallback) {
        return fallback;
    }
    return trimmed || '';
}

function serializeForm(): string {
    const lines: string[] = [];

    if (metadata.headerLines.length > 0) {
        lines.push(...metadata.headerLines);
        if (metadata.headerLines[metadata.headerLines.length - 1]?.trim() !== '') {
            lines.push('');
        }
    }

    lines.push('settings:');
    lines.push(`  allow-end: ${formatBoolean(form.allowEnd)}`);
    lines.push(`  warn-on-overload: ${formatBoolean(form.warnOnOverload)}`);
    lines.push(`  permissions-file: ${formatString(form.permissionsFile, 'permissions.yml')}`);
    lines.push(`  update-folder: ${formatString(form.updateFolder, 'update')}`);
    lines.push(`  plugin-profiling: ${formatBoolean(form.pluginProfiling)}`);
    lines.push(`  connection-throttle: ${form.connectionThrottle}`);
    lines.push(`  query-plugins: ${formatBoolean(form.queryPlugins)}`);
    lines.push(`  deprecated-verbose: ${form.deprecatedVerbose}`);
    lines.push(`  shutdown-message: ${formatString(form.shutdownMessage, 'Server closed')}`);
    lines.push(`  minimum-api: ${formatString(form.minimumApi, 'none')}`);
    lines.push(`  use-map-color-cache: ${formatBoolean(form.useMapColorCache)}`);
    lines.push('');

    lines.push('spawn-limits:');
    lines.push(`  monsters: ${form.spawnLimits.monsters}`);
    lines.push(`  animals: ${form.spawnLimits.animals}`);
    lines.push(`  water-animals: ${form.spawnLimits.waterAnimals}`);
    lines.push(`  water-ambient: ${form.spawnLimits.waterAmbient}`);
    lines.push(`  water-underground-creature: ${form.spawnLimits.waterUndergroundCreature}`);
    lines.push(`  axolotls: ${form.spawnLimits.axolotls}`);
    lines.push(`  ambient: ${form.spawnLimits.ambient}`);
    lines.push('');

    lines.push('chunk-gc:');
    lines.push(`  period-in-ticks: ${form.chunkGcPeriodInTicks}`);
    lines.push('');

    lines.push('ticks-per:');
    lines.push(`  animal-spawns: ${form.ticksPer.animalSpawns}`);
    lines.push(`  monster-spawns: ${form.ticksPer.monsterSpawns}`);
    lines.push(`  water-spawns: ${form.ticksPer.waterSpawns}`);
    lines.push(`  water-ambient-spawns: ${form.ticksPer.waterAmbientSpawns}`);
    lines.push(`  water-underground-creature-spawns: ${form.ticksPer.waterUndergroundCreatureSpawns}`);
    lines.push(`  axolotl-spawns: ${form.ticksPer.axolotlSpawns}`);
    lines.push(`  ambient-spawns: ${form.ticksPer.ambientSpawns}`);
    lines.push(`  autosave: ${form.ticksPer.autosave}`);
    lines.push('');

    lines.push(`aliases: ${formatString(form.aliases, 'now-in-commands.yml')}`);

    if (metadata.preservedLines.length > 0) {
        if (lines[lines.length - 1]?.trim() !== '') {
            lines.push('');
        }
        lines.push(...metadata.preservedLines);
    }

    return lines.join('\n');
}

const handleSave = () => {
    const yaml = serializeForm();
    emit('save', yaml);
};

const handleSwitchToRaw = () => {
    emit('switchToRaw');
};
</script>

<template>
    <Card class="border-primary/20">
        <CardHeader class="border-b border-border/40">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="space-y-2">
                    <CardTitle class="text-2xl font-bold">
                        {{ t('bukkitConfig.title') }}
                    </CardTitle>
                    <CardDescription class="text-sm text-muted-foreground">
                        {{ t('bukkitConfig.description') }}
                    </CardDescription>
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="handleSwitchToRaw">
                        <ArrowLeft class="mr-2 h-4 w-4" />
                        {{ t('bukkitConfig.actions.switchToRaw') }}
                    </Button>
                    <Button size="sm" :disabled="props.readonly || props.saving" @click="handleSave">
                        <Save class="mr-2 h-4 w-4" />
                        <span v-if="props.saving">{{ t('bukkitConfig.actions.saving') }}</span>
                        <span v-else>{{ t('bukkitConfig.actions.save') }}</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent class="space-y-8 p-6">
            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Settings2 class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('bukkitConfig.sections.settings') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('bukkitConfig.sectionsDescriptions.settings') }}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="bukkit-allow-end" class="text-sm font-semibold">
                                    {{ t('bukkitConfig.fields.allowEnd.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('bukkitConfig.fields.allowEnd.description') }}
                                </p>
                            </div>
                            <input
                                id="bukkit-allow-end"
                                v-model="form.allowEnd"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="bukkit-checkbox"
                            />
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="bukkit-warn-on-overload" class="text-sm font-semibold">
                                    {{ t('bukkitConfig.fields.warnOnOverload.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('bukkitConfig.fields.warnOnOverload.description') }}
                                </p>
                            </div>
                            <input
                                id="bukkit-warn-on-overload"
                                v-model="form.warnOnOverload"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="bukkit-checkbox"
                            />
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="space-y-2">
                            <Label for="bukkit-permissions-file" class="text-sm font-semibold">
                                {{ t('bukkitConfig.fields.permissionsFile.label') }}
                            </Label>
                            <Input
                                id="bukkit-permissions-file"
                                v-model="form.permissionsFile"
                                type="text"
                                :readonly="props.readonly"
                                :placeholder="t('bukkitConfig.fields.permissionsFile.placeholder')"
                            />
                            <p class="text-xs text-muted-foreground">
                                {{ t('bukkitConfig.fields.permissionsFile.description') }}
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="space-y-2">
                            <Label for="bukkit-update-folder" class="text-sm font-semibold">
                                {{ t('bukkitConfig.fields.updateFolder.label') }}
                            </Label>
                            <Input
                                id="bukkit-update-folder"
                                v-model="form.updateFolder"
                                type="text"
                                :readonly="props.readonly"
                                :placeholder="t('bukkitConfig.fields.updateFolder.placeholder')"
                            />
                            <p class="text-xs text-muted-foreground">
                                {{ t('bukkitConfig.fields.updateFolder.description') }}
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="bukkit-plugin-profiling" class="text-sm font-semibold">
                                    {{ t('bukkitConfig.fields.pluginProfiling.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('bukkitConfig.fields.pluginProfiling.description') }}
                                </p>
                            </div>
                            <input
                                id="bukkit-plugin-profiling"
                                v-model="form.pluginProfiling"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="bukkit-checkbox"
                            />
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="space-y-2">
                            <Label for="bukkit-connection-throttle" class="text-sm font-semibold">
                                {{ t('bukkitConfig.fields.connectionThrottle.label') }}
                            </Label>
                            <Input
                                id="bukkit-connection-throttle"
                                v-model.number="form.connectionThrottle"
                                type="number"
                                :readonly="props.readonly"
                                min="-1"
                            />
                            <p class="text-xs text-muted-foreground">
                                {{ t('bukkitConfig.fields.connectionThrottle.description') }}
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="bukkit-query-plugins" class="text-sm font-semibold">
                                    {{ t('bukkitConfig.fields.queryPlugins.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('bukkitConfig.fields.queryPlugins.description') }}
                                </p>
                            </div>
                            <input
                                id="bukkit-query-plugins"
                                v-model="form.queryPlugins"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="bukkit-checkbox"
                            />
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="space-y-2">
                            <Label for="bukkit-deprecated-verbose" class="text-sm font-semibold">
                                {{ t('bukkitConfig.fields.deprecatedVerbose.label') }}
                            </Label>
                            <Select
                                id="bukkit-deprecated-verbose"
                                :model-value="form.deprecatedVerbose"
                                :disabled="props.readonly"
                                @update:model-value="
                                    (value) => (form.deprecatedVerbose = (value as DeprecatedVerboseMode) || 'default')
                                "
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        :placeholder="t('bukkitConfig.fields.deprecatedVerbose.placeholder')"
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">
                                        {{ t('bukkitConfig.options.deprecatedVerbose.default') }}
                                    </SelectItem>
                                    <SelectItem value="true">
                                        {{ t('bukkitConfig.options.deprecatedVerbose.true') }}
                                    </SelectItem>
                                    <SelectItem value="false">
                                        {{ t('bukkitConfig.options.deprecatedVerbose.false') }}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p class="text-xs text-muted-foreground">
                                {{ t('bukkitConfig.fields.deprecatedVerbose.description') }}
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm xl:col-span-2">
                        <div class="space-y-2">
                            <Label for="bukkit-shutdown-message" class="text-sm font-semibold">
                                {{ t('bukkitConfig.fields.shutdownMessage.label') }}
                            </Label>
                            <Textarea
                                id="bukkit-shutdown-message"
                                v-model="form.shutdownMessage"
                                :readonly="props.readonly"
                                rows="2"
                            />
                            <p class="text-xs text-muted-foreground">
                                {{ t('bukkitConfig.fields.shutdownMessage.description') }}
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="space-y-2">
                            <Label for="bukkit-minimum-api" class="text-sm font-semibold">
                                {{ t('bukkitConfig.fields.minimumApi.label') }}
                            </Label>
                            <Input
                                id="bukkit-minimum-api"
                                v-model="form.minimumApi"
                                type="text"
                                :readonly="props.readonly"
                                :placeholder="t('bukkitConfig.fields.minimumApi.placeholder')"
                            />
                            <p class="text-xs text-muted-foreground">
                                {{ t('bukkitConfig.fields.minimumApi.description') }}
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3 rounded-lg border p-4 shadow-sm">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-1">
                                <Label for="bukkit-use-map-color-cache" class="text-sm font-semibold">
                                    {{ t('bukkitConfig.fields.useMapColorCache.label') }}
                                </Label>
                                <p class="text-xs text-muted-foreground">
                                    {{ t('bukkitConfig.fields.useMapColorCache.description') }}
                                </p>
                            </div>
                            <input
                                id="bukkit-use-map-color-cache"
                                v-model="form.useMapColorCache"
                                type="checkbox"
                                :disabled="props.readonly"
                                class="bukkit-checkbox"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Activity class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('bukkitConfig.sections.spawnLimits') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('bukkitConfig.sectionsDescriptions.spawnLimits') }}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-monsters" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.spawnLimits.monsters.label') }}
                        </Label>
                        <Input
                            id="bukkit-monsters"
                            v-model.number="form.spawnLimits.monsters"
                            type="number"
                            min="0"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.spawnLimits.monsters.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-animals" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.spawnLimits.animals.label') }}
                        </Label>
                        <Input
                            id="bukkit-animals"
                            v-model.number="form.spawnLimits.animals"
                            type="number"
                            min="0"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.spawnLimits.animals.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-water-animals" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.spawnLimits.waterAnimals.label') }}
                        </Label>
                        <Input
                            id="bukkit-water-animals"
                            v-model.number="form.spawnLimits.waterAnimals"
                            type="number"
                            min="0"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.spawnLimits.waterAnimals.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-water-ambient" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.spawnLimits.waterAmbient.label') }}
                        </Label>
                        <Input
                            id="bukkit-water-ambient"
                            v-model.number="form.spawnLimits.waterAmbient"
                            type="number"
                            min="0"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.spawnLimits.waterAmbient.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-water-underground" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.spawnLimits.waterUndergroundCreature.label') }}
                        </Label>
                        <Input
                            id="bukkit-water-underground"
                            v-model.number="form.spawnLimits.waterUndergroundCreature"
                            type="number"
                            min="0"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.spawnLimits.waterUndergroundCreature.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-axolotls" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.spawnLimits.axolotls.label') }}
                        </Label>
                        <Input
                            id="bukkit-axolotls"
                            v-model.number="form.spawnLimits.axolotls"
                            type="number"
                            min="0"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.spawnLimits.axolotls.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-ambient" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.spawnLimits.ambient.label') }}
                        </Label>
                        <Input
                            id="bukkit-ambient"
                            v-model.number="form.spawnLimits.ambient"
                            type="number"
                            min="0"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.spawnLimits.ambient.description') }}
                        </p>
                    </div>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Gauge class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('bukkitConfig.sections.ticksPer') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('bukkitConfig.sectionsDescriptions.ticksPer') }}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-animal-spawns" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.ticksPer.animalSpawns.label') }}
                        </Label>
                        <Input
                            id="bukkit-animal-spawns"
                            v-model.number="form.ticksPer.animalSpawns"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.ticksPer.animalSpawns.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-monster-spawns" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.ticksPer.monsterSpawns.label') }}
                        </Label>
                        <Input
                            id="bukkit-monster-spawns"
                            v-model.number="form.ticksPer.monsterSpawns"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.ticksPer.monsterSpawns.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-water-spawns" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.ticksPer.waterSpawns.label') }}
                        </Label>
                        <Input
                            id="bukkit-water-spawns"
                            v-model.number="form.ticksPer.waterSpawns"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.ticksPer.waterSpawns.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-water-ambient-spawns" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.ticksPer.waterAmbientSpawns.label') }}
                        </Label>
                        <Input
                            id="bukkit-water-ambient-spawns"
                            v-model.number="form.ticksPer.waterAmbientSpawns"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.ticksPer.waterAmbientSpawns.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-water-underground-spawns" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.ticksPer.waterUndergroundCreatureSpawns.label') }}
                        </Label>
                        <Input
                            id="bukkit-water-underground-spawns"
                            v-model.number="form.ticksPer.waterUndergroundCreatureSpawns"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.ticksPer.waterUndergroundCreatureSpawns.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-axolotl-spawns" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.ticksPer.axolotlSpawns.label') }}
                        </Label>
                        <Input
                            id="bukkit-axolotl-spawns"
                            v-model.number="form.ticksPer.axolotlSpawns"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.ticksPer.axolotlSpawns.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-ambient-spawns" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.ticksPer.ambientSpawns.label') }}
                        </Label>
                        <Input
                            id="bukkit-ambient-spawns"
                            v-model.number="form.ticksPer.ambientSpawns"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.ticksPer.ambientSpawns.description') }}
                        </p>
                    </div>

                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-autosave" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.ticksPer.autosave.label') }}
                        </Label>
                        <Input
                            id="bukkit-autosave"
                            v-model.number="form.ticksPer.autosave"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.ticksPer.autosave.description') }}
                        </p>
                    </div>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Layers class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('bukkitConfig.sections.chunkGc') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('bukkitConfig.sectionsDescriptions.chunkGc') }}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                        <Label for="bukkit-period-in-ticks" class="text-sm font-semibold">
                            {{ t('bukkitConfig.fields.chunkGc.periodInTicks.label') }}
                        </Label>
                        <Input
                            id="bukkit-period-in-ticks"
                            v-model.number="form.chunkGcPeriodInTicks"
                            type="number"
                            min="1"
                            :readonly="props.readonly"
                        />
                        <p class="text-xs text-muted-foreground">
                            {{ t('bukkitConfig.fields.chunkGc.periodInTicks.description') }}
                        </p>
                    </div>
                </div>
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText class="h-5 w-5" />
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ t('bukkitConfig.sections.aliases') }}</h3>
                        <p class="text-sm text-muted-foreground">
                            {{ t('bukkitConfig.sectionsDescriptions.aliases') }}
                        </p>
                    </div>
                </div>
                <div class="space-y-2 rounded-lg border p-4 shadow-sm">
                    <Label for="bukkit-aliases" class="text-sm font-semibold">
                        {{ t('bukkitConfig.fields.aliases.label') }}
                    </Label>
                    <Input
                        id="bukkit-aliases"
                        v-model="form.aliases"
                        type="text"
                        :readonly="props.readonly"
                        :placeholder="t('bukkitConfig.fields.aliases.placeholder')"
                    />
                    <p class="text-xs text-muted-foreground">
                        {{ t('bukkitConfig.fields.aliases.description') }}
                    </p>
                </div>
            </section>
        </CardContent>
    </Card>
</template>

<style scoped>
.bukkit-checkbox {
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

.bukkit-checkbox::after {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 0.2rem;
    background-color: transparent;
    transition: background-color 0.15s ease;
}

.bukkit-checkbox:hover:not(:disabled) {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
}

.bukkit-checkbox:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
}

.bukkit-checkbox:active:not(:disabled) {
    transform: scale(0.96);
}

.bukkit-checkbox:checked {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
}

.bukkit-checkbox:checked::after {
    background-color: hsl(var(--primary-foreground));
}

.bukkit-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.bukkit-checkbox:disabled::after {
    background-color: transparent;
}
</style>
