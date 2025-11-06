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

import { reactive, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Save,
    Plus,
    Minus,
    Users,
    Shield,
    Eye,
    Globe,
    MountainSnow,
    Sliders,
    FileArchive,
    Hash,
} from 'lucide-vue-next';

interface MinecraftServerPropertiesForm {
    motd: string;
    difficulty: string;
    gamemode: string;
    levelType: string;
    maxPlayers: number;
    whiteList: boolean;
    enforceWhitelist: boolean;
    onlineMode: boolean;
    pvp: boolean;
    enableCommandBlock: boolean;
    allowFlight: boolean;
    spawnMonsters: boolean;
    allowNether: boolean;
    forceGamemode: boolean;
    broadcastConsoleToOps: boolean;
    spawnProtection: number;
    viewDistance: number;
    simulationDistance: number;
    levelName: string;
    levelSeed: string;
    generatorSettings: string;
    generateStructures: boolean;
    hardcore: boolean;
    requireResourcePack: boolean;
    hideOnlinePlayers: boolean;
    enforceSecureProfile: boolean;
    previewsChat: boolean;
    useNativeTransport: boolean;
    resourcePack: string;
    resourcePackSha1: string;
    resourcePackId: string;
    resourcePackPrompt: string;
    opPermissionLevel: number;
    functionPermissionLevel: number;
    entityBroadcastRangePercentage: number;
    maxChainedNeighborUpdates: number;
    maxWorldSize: number;
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

function parseProperties(content: string): Map<string, string> {
    const map = new Map<string, string>();
    content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .forEach((line) => {
            if (!line || line.startsWith('#')) {
                return;
            }

            const separatorIndex = line.indexOf('=');
            if (separatorIndex === -1) {
                return;
            }

            const key = line.slice(0, separatorIndex).trim();
            const value = line.slice(separatorIndex + 1).trim();
            if (key) {
                map.set(key, value);
            }
        });

    return map;
}

function getInitialForm(content: string): MinecraftServerPropertiesForm {
    const parsed = parseProperties(content);

    return {
        motd: parsed.get('motd') ?? 'A Minecraft Server',
        difficulty: parsed.get('difficulty') ?? 'easy',
        gamemode: parsed.get('gamemode') ?? 'survival',
        levelType: parsed.get('level-type') ?? 'minecraft:normal',
        maxPlayers: Number.parseInt(parsed.get('max-players') ?? '20', 10) || 20,
        whiteList: (parsed.get('white-list') ?? 'false') === 'true',
        enforceWhitelist: (parsed.get('enforce-whitelist') ?? 'false') === 'true',
        onlineMode: (parsed.get('online-mode') ?? 'false') === 'true',
        pvp: (parsed.get('pvp') ?? 'true') === 'true',
        enableCommandBlock: (parsed.get('enable-command-block') ?? 'false') === 'true',
        allowFlight: (parsed.get('allow-flight') ?? 'false') === 'true',
        spawnMonsters: (parsed.get('spawn-monsters') ?? 'true') === 'true',
        allowNether: (parsed.get('allow-nether') ?? 'true') === 'true',
        forceGamemode: (parsed.get('force-gamemode') ?? 'false') === 'true',
        broadcastConsoleToOps: (parsed.get('broadcast-console-to-ops') ?? 'true') === 'true',
        spawnProtection: Number.parseInt(parsed.get('spawn-protection') ?? '16', 10) || 16,
        viewDistance: Number.parseInt(parsed.get('view-distance') ?? '10', 10) || 10,
        simulationDistance: Number.parseInt(parsed.get('simulation-distance') ?? '10', 10) || 10,
        levelName: parsed.get('level-name') ?? 'world',
        levelSeed: parsed.get('level-seed') ?? '',
        generatorSettings: parsed.get('generator-settings') ?? '',
        generateStructures: (parsed.get('generate-structures') ?? 'true') === 'true',
        hardcore: (parsed.get('hardcore') ?? 'false') === 'true',
        requireResourcePack: (parsed.get('require-resource-pack') ?? 'false') === 'true',
        hideOnlinePlayers: (parsed.get('hide-online-players') ?? 'false') === 'true',
        enforceSecureProfile: (parsed.get('enforce-secure-profile') ?? 'true') === 'true',
        previewsChat: (parsed.get('previews-chat') ?? 'false') === 'true',
        useNativeTransport: (parsed.get('use-native-transport') ?? 'true') === 'true',
        resourcePack: parsed.get('resource-pack') ?? '',
        resourcePackSha1: parsed.get('resource-pack-sha1') ?? '',
        resourcePackId: parsed.get('resource-pack-id') ?? '',
        resourcePackPrompt: parsed.get('resource-pack-prompt') ?? '',
        opPermissionLevel: Number.parseInt(parsed.get('op-permission-level') ?? '4', 10) || 4,
        functionPermissionLevel: Number.parseInt(parsed.get('function-permission-level') ?? '2', 10) || 2,
        entityBroadcastRangePercentage:
            Number.parseInt(parsed.get('entity-broadcast-range-percentage') ?? '100', 10) || 100,
        maxChainedNeighborUpdates:
            Number.parseInt(parsed.get('max-chained-neighbor-updates') ?? '1000000', 10) || 1000000,
        maxWorldSize: Number.parseInt(parsed.get('max-world-size') ?? '29999984', 10) || 29999984,
    };
}

const form = reactive<MinecraftServerPropertiesForm>(getInitialForm(props.content));

const isCracked = computed({
    get: () => !form.onlineMode,
    set: (value: boolean) => {
        form.onlineMode = !value;
    },
});

watch(
    () => props.content,
    (newContent) => {
        const updated = getInitialForm(newContent);
        Object.assign(form, updated);
    },
);

function formatBoolean(value: boolean): string {
    return value ? 'true' : 'false';
}

function serializeForm(): Record<string, string> {
    return {
        motd: form.motd,
        difficulty: form.difficulty,
        gamemode: form.gamemode,
        'level-type': form.levelType,
        'max-players': String(form.maxPlayers),
        'white-list': formatBoolean(form.whiteList),
        'enforce-whitelist': formatBoolean(form.enforceWhitelist),
        'online-mode': formatBoolean(form.onlineMode),
        pvp: formatBoolean(form.pvp),
        'enable-command-block': formatBoolean(form.enableCommandBlock),
        'allow-flight': formatBoolean(form.allowFlight),
        'spawn-monsters': formatBoolean(form.spawnMonsters),
        'allow-nether': formatBoolean(form.allowNether),
        'force-gamemode': formatBoolean(form.forceGamemode),
        'broadcast-console-to-ops': formatBoolean(form.broadcastConsoleToOps),
        'spawn-protection': String(form.spawnProtection),
        'view-distance': String(form.viewDistance),
        'simulation-distance': String(form.simulationDistance),
        'level-name': form.levelName,
        'level-seed': form.levelSeed,
        'generator-settings': form.generatorSettings,
        'generate-structures': formatBoolean(form.generateStructures),
        hardcore: formatBoolean(form.hardcore),
        'require-resource-pack': formatBoolean(form.requireResourcePack),
        'hide-online-players': formatBoolean(form.hideOnlinePlayers),
        'enforce-secure-profile': formatBoolean(form.enforceSecureProfile),
        'previews-chat': formatBoolean(form.previewsChat),
        'use-native-transport': formatBoolean(form.useNativeTransport),
        'resource-pack': form.resourcePack,
        'resource-pack-sha1': form.resourcePackSha1,
        'resource-pack-id': form.resourcePackId,
        'resource-pack-prompt': form.resourcePackPrompt,
        'op-permission-level': String(form.opPermissionLevel),
        'function-permission-level': String(form.functionPermissionLevel),
        'entity-broadcast-range-percentage': String(form.entityBroadcastRangePercentage),
        'max-chained-neighbor-updates': String(form.maxChainedNeighborUpdates),
        'max-world-size': String(form.maxWorldSize),
    };
}

function mergeProperties(original: string, updates: Record<string, string>): string {
    const lines = original.split(/\r?\n/);
    const handled = new Set<string>();

    const updatedLines = lines.map((line) => {
        if (!line || line.trim().startsWith('#')) {
            return line;
        }

        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) {
            return line;
        }

        const rawKey = line.slice(0, separatorIndex).trim();
        if (rawKey && updates[rawKey] !== undefined) {
            handled.add(rawKey);
            return `${rawKey}=${updates[rawKey]}`;
        }

        return line;
    });

    const appended = Object.entries(updates)
        .filter(([key]) => !handled.has(key))
        .map(([key, value]) => `${key}=${value}`);

    return [...updatedLines, ...appended]
        .filter((line, index, array) => !(line === '' && index === array.length - 1))
        .join('\n');
}

const handleSave = () => {
    const updates = serializeForm();
    const newContent = mergeProperties(props.content, updates);
    emit('save', newContent);
};

const incrementNumber = (field: keyof MinecraftServerPropertiesForm) => {
    const value = form[field] as number;
    (form[field] as number) = value + 1;
};

const decrementNumber = (field: keyof MinecraftServerPropertiesForm) => {
    const value = form[field] as number;
    if (value > 0) {
        (form[field] as number) = value - 1;
    }
};
</script>

<template>
    <Card class="border-primary/20">
        <CardHeader class="border-b border-border/40">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <CardTitle class="text-2xl font-bold">
                        {{ t('minecraftProperties.title') }}
                    </CardTitle>
                    <CardDescription class="text-sm mt-1">
                        {{ t('minecraftProperties.description') }}
                    </CardDescription>
                </div>
                <div class="flex items-center gap-2">
                    <Button variant="outline" size="sm" @click="emit('switchToRaw')">
                        <ArrowLeft class="h-4 w-4 mr-2" />
                        {{ t('minecraftProperties.actions.switchToRaw') }}
                    </Button>
                    <Button size="sm" :disabled="props.readonly || props.saving" @click="handleSave">
                        <Save class="h-4 w-4 mr-2" />
                        <span v-if="props.saving">{{ t('minecraftProperties.actions.saving') }}</span>
                        <span v-else>{{ t('minecraftProperties.actions.save') }}</span>
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <!-- MOTD (Full width with textarea) -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.motd.label') }}
                        </Label>
                        <Textarea v-model="form.motd" :readonly="props.readonly" rows="3" class="font-mono text-sm" />
                        <p class="text-xs text-muted-foreground">
                            {{ t('minecraftProperties.fields.motd.description') }}
                        </p>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">motd</span>=<span>{{ form.motd }}</span>
                    </div>
                </div>

                <!-- Max Players -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold flex items-center gap-2">
                            <Users class="h-4 w-4 text-primary" />
                            {{ t('minecraftProperties.fields.maxPlayers.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.maxPlayers"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="1"
                                max="2147483647"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('maxPlayers')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('maxPlayers')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">max-players</span>=<span>{{ form.maxPlayers }}</span>
                    </div>
                </div>

                <!-- Gamemode -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.gamemode.label') }}
                        </Label>
                        <Select
                            :disabled="props.readonly"
                            :model-value="form.gamemode"
                            @update:model-value="(val) => (form.gamemode = (val as string) ?? 'survival')"
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="survival">
                                    {{ t('minecraftProperties.options.gamemode.survival') }}
                                </SelectItem>
                                <SelectItem value="creative">
                                    {{ t('minecraftProperties.options.gamemode.creative') }}
                                </SelectItem>
                                <SelectItem value="adventure">
                                    {{ t('minecraftProperties.options.gamemode.adventure') }}
                                </SelectItem>
                                <SelectItem value="spectator">
                                    {{ t('minecraftProperties.options.gamemode.spectator') }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">gamemode</span>=<span>{{ form.gamemode }}</span>
                    </div>
                </div>

                <!-- Difficulty -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.difficulty.label') }}
                        </Label>
                        <Select
                            :disabled="props.readonly"
                            :model-value="form.difficulty"
                            @update:model-value="(val) => (form.difficulty = (val as string) ?? 'easy')"
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="peaceful">
                                    {{ t('minecraftProperties.options.difficulty.peaceful') }}
                                </SelectItem>
                                <SelectItem value="easy">
                                    {{ t('minecraftProperties.options.difficulty.easy') }}
                                </SelectItem>
                                <SelectItem value="normal">
                                    {{ t('minecraftProperties.options.difficulty.normal') }}
                                </SelectItem>
                                <SelectItem value="hard">
                                    {{ t('minecraftProperties.options.difficulty.hard') }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">difficulty</span>=<span>{{ form.difficulty }}</span>
                    </div>
                </div>

                <!-- Whitelist -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label :for="'toggle-whitelist'" class="text-sm font-semibold cursor-pointer">
                            {{ t('minecraftProperties.fields.whiteList.label') }}
                        </Label>
                        <input
                            id="toggle-whitelist"
                            v-model="form.whiteList"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">white-list</span>=<span>{{
                            formatBoolean(form.whiteList)
                        }}</span>
                    </div>
                </div>

                <!-- Enforce Whitelist -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label for="toggle-enforce-whitelist" class="text-sm font-semibold cursor-pointer">
                            {{ t('minecraftProperties.fields.enforceWhitelist.label') }}
                        </Label>
                        <input
                            id="toggle-enforce-whitelist"
                            v-model="form.enforceWhitelist"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">enforce-whitelist</span>=<span>{{
                            formatBoolean(form.enforceWhitelist)
                        }}</span>
                    </div>
                </div>

                <!-- Online Mode (Cracked) -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label for="toggle-online-mode" class="text-sm font-semibold cursor-pointer">
                            {{ t('minecraftProperties.fields.onlineMode.label') }}
                        </Label>
                        <input
                            id="toggle-online-mode"
                            v-model="isCracked"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">online-mode</span>=<span>{{
                            formatBoolean(form.onlineMode)
                        }}</span>
                    </div>
                </div>

                <!-- PVP -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.pvp.label') }}
                        </Label>
                        <input
                            id="toggle-pvp"
                            v-model="form.pvp"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">pvp</span>=<span>{{ formatBoolean(form.pvp) }}</span>
                    </div>
                </div>

                <!-- Command Blocks -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.enableCommandBlock.label') }}
                        </Label>
                        <input
                            id="toggle-command-block"
                            v-model="form.enableCommandBlock"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">enable-command-block</span>=<span>{{
                            formatBoolean(form.enableCommandBlock)
                        }}</span>
                    </div>
                </div>

                <!-- Allow Flight -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.allowFlight.label') }}
                        </Label>
                        <input
                            id="toggle-allow-flight"
                            v-model="form.allowFlight"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">allow-flight</span>=<span>{{
                            formatBoolean(form.allowFlight)
                        }}</span>
                    </div>
                </div>

                <!-- Spawn Monsters -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.spawnMonsters.label') }}
                        </Label>
                        <input
                            id="toggle-spawn-monsters"
                            v-model="form.spawnMonsters"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">spawn-monsters</span>=<span>{{
                            formatBoolean(form.spawnMonsters)
                        }}</span>
                    </div>
                </div>

                <!-- Allow Nether -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.allowNether.label') }}
                        </Label>
                        <input
                            id="toggle-allow-nether"
                            v-model="form.allowNether"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">allow-nether</span>=<span>{{
                            formatBoolean(form.allowNether)
                        }}</span>
                    </div>
                </div>

                <!-- Force Gamemode -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.forceGamemode.label') }}
                        </Label>
                        <input
                            id="toggle-force-gamemode"
                            v-model="form.forceGamemode"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">force-gamemode</span>=<span>{{
                            formatBoolean(form.forceGamemode)
                        }}</span>
                    </div>
                </div>

                <!-- Broadcast Console to OPs -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.broadcastConsoleToOps.label') }}
                        </Label>
                        <input
                            id="toggle-broadcast-console"
                            v-model="form.broadcastConsoleToOps"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">broadcast-console-to-ops</span>=<span>{{
                            formatBoolean(form.broadcastConsoleToOps)
                        }}</span>
                    </div>
                </div>

                <!-- Spawn Protection -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold flex items-center gap-2">
                            <Shield class="h-4 w-4 text-primary" />
                            {{ t('minecraftProperties.fields.spawnProtection.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.spawnProtection"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="0"
                                max="30000000"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('spawnProtection')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('spawnProtection')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">spawn-protection</span>=<span>{{
                            form.spawnProtection
                        }}</span>
                    </div>
                </div>

                <!-- View Distance -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold flex items-center gap-2">
                            <Eye class="h-4 w-4 text-primary" />
                            {{ t('minecraftProperties.fields.viewDistance.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.viewDistance"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="3"
                                max="32"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('viewDistance')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('viewDistance')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">view-distance</span>=<span>{{
                            form.viewDistance
                        }}</span>
                    </div>
                </div>

                <!-- Simulation Distance -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.simulationDistance.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.simulationDistance"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="3"
                                max="32"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('simulationDistance')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('simulationDistance')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">simulation-distance</span>=<span>{{
                            form.simulationDistance
                        }}</span>
                    </div>
                </div>

                <!-- Level Name (Full width) -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold flex items-center gap-2">
                            <Globe class="h-4 w-4 text-primary" />
                            {{ t('minecraftProperties.fields.levelName.label') }}
                        </Label>
                        <Input v-model="form.levelName" type="text" :readonly="props.readonly" />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">level-name</span>=<span>{{ form.levelName }}</span>
                    </div>
                </div>

                <!-- Level Seed (Full width) -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold flex items-center gap-2">
                            <MountainSnow class="h-4 w-4 text-primary" />
                            {{ t('minecraftProperties.fields.levelSeed.label') }}
                        </Label>
                        <Input v-model="form.levelSeed" type="text" :readonly="props.readonly" placeholder="Random" />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">level-seed</span>=<span>{{ form.levelSeed }}</span>
                    </div>
                </div>

                <!-- Generator Settings (Full width) -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold flex items-center gap-2">
                            <Sliders class="h-4 w-4 text-primary" />
                            {{ t('minecraftProperties.fields.generatorSettings.label') }}
                        </Label>
                        <Input v-model="form.generatorSettings" type="text" :readonly="props.readonly" />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">generator-settings</span>=<span>{{
                            form.generatorSettings
                        }}</span>
                    </div>
                </div>

                <!-- Level Type -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.levelType.label') }}
                        </Label>
                        <Select
                            :disabled="props.readonly"
                            :model-value="form.levelType"
                            @update:model-value="(val) => (form.levelType = (val as string) ?? 'minecraft:normal')"
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="minecraft:normal">
                                    {{ t('minecraftProperties.options.levelType.default') }}
                                </SelectItem>
                                <SelectItem value="minecraft:flat">
                                    {{ t('minecraftProperties.options.levelType.flat') }}
                                </SelectItem>
                                <SelectItem value="minecraft:amplified">
                                    {{ t('minecraftProperties.options.levelType.amplified') }}
                                </SelectItem>
                                <SelectItem value="minecraft:large_biomes">
                                    {{ t('minecraftProperties.options.levelType.largeBiomes') }}
                                </SelectItem>
                                <SelectItem value="minecraft:single_biome_surface">
                                    {{ t('minecraftProperties.options.levelType.singleBiome') }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">level-type</span>=<span>{{ form.levelType }}</span>
                    </div>
                </div>

                <!-- Generate Structures -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.generateStructures.label') }}
                        </Label>
                        <input
                            id="toggle-generate-structures"
                            v-model="form.generateStructures"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">generate-structures</span>=<span>{{
                            formatBoolean(form.generateStructures)
                        }}</span>
                    </div>
                </div>

                <!-- Hardcore -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.hardcore.label') }}
                        </Label>
                        <input
                            id="toggle-hardcore"
                            v-model="form.hardcore"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">hardcore</span>=<span>{{
                            formatBoolean(form.hardcore)
                        }}</span>
                    </div>
                </div>

                <!-- Require Resource Pack -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.requireResourcePack.label') }}
                        </Label>
                        <input
                            id="toggle-require-resource-pack"
                            v-model="form.requireResourcePack"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">require-resource-pack</span>=<span>{{
                            formatBoolean(form.requireResourcePack)
                        }}</span>
                    </div>
                </div>

                <!-- Hide Online Players -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.hideOnlinePlayers.label') }}
                        </Label>
                        <input
                            id="toggle-hide-online-players"
                            v-model="form.hideOnlinePlayers"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">hide-online-players</span>=<span>{{
                            formatBoolean(form.hideOnlinePlayers)
                        }}</span>
                    </div>
                </div>

                <!-- Enforce Secure Profile -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.enforceSecureProfile.label') }}
                        </Label>
                        <input
                            id="toggle-enforce-secure-profile"
                            v-model="form.enforceSecureProfile"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">enforce-secure-profile</span>=<span>{{
                            formatBoolean(form.enforceSecureProfile)
                        }}</span>
                    </div>
                </div>

                <!-- Previews Chat -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.previewsChat.label') }}
                        </Label>
                        <input
                            id="toggle-previews-chat"
                            v-model="form.previewsChat"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">previews-chat</span>=<span>{{
                            formatBoolean(form.previewsChat)
                        }}</span>
                    </div>
                </div>

                <!-- Use Native Transport -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex items-center justify-between">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.useNativeTransport.label') }}
                        </Label>
                        <input
                            id="toggle-use-native-transport"
                            v-model="form.useNativeTransport"
                            type="checkbox"
                            :disabled="props.readonly"
                            class="minecraft-checkbox"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">use-native-transport</span>=<span>{{
                            formatBoolean(form.useNativeTransport)
                        }}</span>
                    </div>
                </div>

                <!-- Resource Pack (Full width) -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold flex items-center gap-2">
                            <FileArchive class="h-4 w-4 text-primary" />
                            {{ t('minecraftProperties.fields.resourcePack.label') }}
                        </Label>
                        <Input
                            v-model="form.resourcePack"
                            type="text"
                            :readonly="props.readonly"
                            placeholder="https://example.com/resource-pack.zip"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">resource-pack</span>=<span>{{
                            form.resourcePack
                        }}</span>
                    </div>
                </div>

                <!-- Resource Pack SHA1 (Full width) -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.resourcePackSha1.label') }}
                        </Label>
                        <Input
                            v-model="form.resourcePackSha1"
                            type="text"
                            :readonly="props.readonly"
                            placeholder="0f1412443d23a48f1a74d661c45bc9a904269db2"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">resource-pack-sha1</span>=<span>{{
                            form.resourcePackSha1
                        }}</span>
                    </div>
                </div>

                <!-- Resource Pack ID (Full width) -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold flex items-center gap-2">
                            <Hash class="h-4 w-4 text-primary" />
                            {{ t('minecraftProperties.fields.resourcePackId.label') }}
                        </Label>
                        <Input
                            v-model="form.resourcePackId"
                            type="text"
                            :readonly="props.readonly"
                            placeholder="119e9b1e-d244-5ba3-e070-bb226e6753d1"
                        />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">resource-pack-id</span>=<span>{{
                            form.resourcePackId
                        }}</span>
                    </div>
                </div>

                <!-- Resource Pack Prompt (Full width) -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.resourcePackPrompt.label') }}
                        </Label>
                        <Textarea v-model="form.resourcePackPrompt" :readonly="props.readonly" rows="2" />
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">resource-pack-prompt</span>=<span>{{
                            form.resourcePackPrompt
                        }}</span>
                    </div>
                </div>

                <!-- OP Permission Level -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.opPermissionLevel.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.opPermissionLevel"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="1"
                                max="4"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('opPermissionLevel')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('opPermissionLevel')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">op-permission-level</span>=<span>{{
                            form.opPermissionLevel
                        }}</span>
                    </div>
                </div>

                <!-- Function Permission Level -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.functionPermissionLevel.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.functionPermissionLevel"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="1"
                                max="4"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('functionPermissionLevel')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('functionPermissionLevel')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">function-permission-level</span>=<span>{{
                            form.functionPermissionLevel
                        }}</span>
                    </div>
                </div>

                <!-- Entity Broadcast Range -->
                <div
                    class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors md:col-span-2 xl:col-span-3"
                >
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.entityBroadcastRangePercentage.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.entityBroadcastRangePercentage"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="0"
                                max="500"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('entityBroadcastRangePercentage')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('entityBroadcastRangePercentage')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">entity-broadcast-range-percentage</span>=<span>{{
                            form.entityBroadcastRangePercentage
                        }}</span>
                    </div>
                </div>

                <!-- Max Chained Neighbor Updates -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.maxChainedNeighborUpdates.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.maxChainedNeighborUpdates"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="-1"
                                max="16777215"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('maxChainedNeighborUpdates')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('maxChainedNeighborUpdates')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">max-chained-neighbor-updates</span>=<span>{{
                            form.maxChainedNeighborUpdates
                        }}</span>
                    </div>
                </div>

                <!-- Max World Size -->
                <div class="flex flex-col gap-2 p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div class="flex flex-col gap-2">
                        <Label class="text-sm font-semibold">
                            {{ t('minecraftProperties.fields.maxWorldSize.label') }}
                        </Label>
                        <div class="relative">
                            <Input
                                v-model.number="form.maxWorldSize"
                                type="number"
                                :readonly="props.readonly"
                                class="pr-16"
                                min="1"
                                max="29999984"
                            />
                            <div
                                class="absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden"
                            >
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center"
                                    @click="incrementNumber('maxWorldSize')"
                                >
                                    <Plus class="h-3 w-3" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center"
                                    @click="decrementNumber('maxWorldSize')"
                                >
                                    <Minus class="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span class="text-primary font-semibold">max-world-size</span>=<span>{{
                            form.maxWorldSize
                        }}</span>
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
</template>

<style scoped>
.minecraft-checkbox {
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

.minecraft-checkbox::after {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 0.2rem;
    background-color: transparent;
    transition: background-color 0.15s ease;
}

.minecraft-checkbox:hover:not(:disabled) {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
}

.minecraft-checkbox:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
}

.minecraft-checkbox:active:not(:disabled) {
    transform: scale(0.96);
}

.minecraft-checkbox:checked {
    background-color: hsl(var(--primary));
    border-color: hsl(var(--primary));
}

.minecraft-checkbox:checked::after {
    background-color: hsl(var(--primary-foreground));
}

.minecraft-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.minecraft-checkbox:disabled::after {
    background-color: transparent;
}
</style>
