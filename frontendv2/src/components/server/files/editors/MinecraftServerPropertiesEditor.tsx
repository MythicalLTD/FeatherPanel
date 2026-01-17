/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select-native';
import {
    ArrowLeft,
    Save,
    Users,
    Shield,
    Eye,
    Globe,
    MountainSnow,
    Sliders,
    FileArchive,
    Hash,
    Settings2,
    Gamepad2,
    Network,
} from 'lucide-react';

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

interface MinecraftServerPropertiesEditorProps {
    content: string;
    readonly?: boolean;
    saving?: boolean;
    onSave: (content: string) => void;
    onSwitchToRaw: () => void;
}

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

function getDefaultForm(): MinecraftServerPropertiesForm {
    return {
        motd: 'A Minecraft Server',
        difficulty: 'easy',
        gamemode: 'survival',
        levelType: 'minecraft:normal',
        maxPlayers: 20,
        whiteList: false,
        enforceWhitelist: false,
        onlineMode: true,
        pvp: true,
        enableCommandBlock: false,
        allowFlight: false,
        spawnMonsters: true,
        allowNether: true,
        forceGamemode: false,
        broadcastConsoleToOps: true,
        spawnProtection: 16,
        viewDistance: 10,
        simulationDistance: 10,
        levelName: 'world',
        levelSeed: '',
        generatorSettings: '',
        generateStructures: true,
        hardcore: false,
        requireResourcePack: false,
        hideOnlinePlayers: false,
        enforceSecureProfile: true,
        previewsChat: true,
        useNativeTransport: true,
        resourcePack: '',
        resourcePackSha1: '',
        resourcePackId: '',
        resourcePackPrompt: '',
        opPermissionLevel: 4,
        functionPermissionLevel: 2,
        entityBroadcastRangePercentage: 100,
        maxChainedNeighborUpdates: 1000000,
        maxWorldSize: 29999984,
    };
}

function parseForm(content: string): MinecraftServerPropertiesForm {
    const parsed = parseProperties(content);
    const form = getDefaultForm();

    return {
        motd: parsed.get('motd') ?? form.motd,
        difficulty: parsed.get('difficulty') ?? form.difficulty,
        gamemode: parsed.get('gamemode') ?? form.gamemode,
        levelType: parsed.get('level-type') ?? form.levelType,
        maxPlayers: Number.parseInt(parsed.get('max-players') ?? String(form.maxPlayers), 10) || form.maxPlayers,
        whiteList: (parsed.get('white-list') ?? 'false') === 'true',
        enforceWhitelist: (parsed.get('enforce-whitelist') ?? 'false') === 'true',
        onlineMode: (parsed.get('online-mode') ?? 'true') === 'true',
        pvp: (parsed.get('pvp') ?? 'true') === 'true',
        enableCommandBlock: (parsed.get('enable-command-block') ?? 'false') === 'true',
        allowFlight: (parsed.get('allow-flight') ?? 'false') === 'true',
        spawnMonsters: (parsed.get('spawn-monsters') ?? 'true') === 'true',
        allowNether: (parsed.get('allow-nether') ?? 'true') === 'true',
        forceGamemode: (parsed.get('force-gamemode') ?? 'false') === 'true',
        broadcastConsoleToOps: (parsed.get('broadcast-console-to-ops') ?? 'true') === 'true',
        spawnProtection:
            Number.parseInt(parsed.get('spawn-protection') ?? String(form.spawnProtection), 10) || form.spawnProtection,
        viewDistance:
            Number.parseInt(parsed.get('view-distance') ?? String(form.viewDistance), 10) || form.viewDistance,
        simulationDistance:
            Number.parseInt(parsed.get('simulation-distance') ?? String(form.simulationDistance), 10) ||
            form.simulationDistance,
        levelName: parsed.get('level-name') ?? form.levelName,
        levelSeed: parsed.get('level-seed') ?? form.levelSeed,
        generatorSettings: parsed.get('generator-settings') ?? form.generatorSettings,
        generateStructures: (parsed.get('generate-structures') ?? 'true') === 'true',
        hardcore: (parsed.get('hardcore') ?? 'false') === 'true',
        requireResourcePack: (parsed.get('require-resource-pack') ?? 'false') === 'true',
        hideOnlinePlayers: (parsed.get('hide-online-players') ?? 'false') === 'true',
        enforceSecureProfile: (parsed.get('enforce-secure-profile') ?? 'true') === 'true',
        previewsChat: (parsed.get('previews-chat') ?? 'true') === 'true',
        useNativeTransport: (parsed.get('use-native-transport') ?? 'true') === 'true',
        resourcePack: parsed.get('resource-pack') ?? form.resourcePack,
        resourcePackSha1: parsed.get('resource-pack-sha1') ?? form.resourcePackSha1,
        resourcePackId: parsed.get('resource-pack-id') ?? form.resourcePackId,
        resourcePackPrompt: parsed.get('resource-pack-prompt') ?? form.resourcePackPrompt,
        opPermissionLevel:
            Number.parseInt(parsed.get('op-permission-level') ?? String(form.opPermissionLevel), 10) ||
            form.opPermissionLevel,
        functionPermissionLevel:
            Number.parseInt(parsed.get('function-permission-level') ?? String(form.functionPermissionLevel), 10) ||
            form.functionPermissionLevel,
        entityBroadcastRangePercentage:
            Number.parseInt(
                parsed.get('entity-broadcast-range-percentage') ?? String(form.entityBroadcastRangePercentage),
                10,
            ) || form.entityBroadcastRangePercentage,
        maxChainedNeighborUpdates:
            Number.parseInt(parsed.get('max-chained-neighbor-updates') ?? String(form.maxChainedNeighborUpdates), 10) ||
            form.maxChainedNeighborUpdates,
        maxWorldSize:
            Number.parseInt(parsed.get('max-world-size') ?? String(form.maxWorldSize), 10) || form.maxWorldSize,
    };
}

function formatBoolean(value: boolean): string {
    return value ? 'true' : 'false';
}

function serializeForm(form: MinecraftServerPropertiesForm): Record<string, string> {
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

export function MinecraftServerPropertiesEditor({
    content,
    readonly = false,
    saving = false,
    onSave,
    onSwitchToRaw,
}: MinecraftServerPropertiesEditorProps) {
    const { t } = useTranslation();

    // Derive form from content using useMemo
    const form = useMemo(() => {
        return parseForm(content);
    }, [content]);

    // Use local state for user edits, initialized from the derived form
    const [localForm, setLocalForm] = useState<MinecraftServerPropertiesForm>(form);

    // Sync local form when the derived form changes (content prop changed)
    useEffect(() => {
        setLocalForm(form);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    const handleSave = () => {
        const updates = serializeForm(localForm);
        const newContent = mergeProperties(content, updates);
        onSave(newContent);
    };

    const updateForm = (field: keyof MinecraftServerPropertiesForm, value: unknown) => {
        setLocalForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Card className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl shadow-sm'>
            <CardHeader className='border-b border-border/10 pb-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                        <CardTitle className='text-2xl font-bold'>
                            {t('files.editors.minecraftProperties.title')}
                        </CardTitle>
                        <CardDescription className='text-sm text-muted-foreground'>
                            {t('files.editors.minecraftProperties.description') ||
                                'Configure your Minecraft server properties visually'}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('files.editors.minecraftProperties.actions.switchToRaw')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='mr-2 h-4 w-4' />
                            {saving
                                ? t('files.editors.minecraftProperties.actions.saving')
                                : t('files.editors.minecraftProperties.actions.save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='p-8 space-y-10'>
                {/* Server Information Section */}
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Settings2 className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.minecraftProperties.sections.serverInfo') || 'Server Information'}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.minecraftProperties.sectionsDescriptions.serverInfo') ||
                                    'Basic server configuration'}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6 xl:col-span-2'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.motd.label') || 'Message of the Day'}
                            </label>
                            <Textarea
                                value={localForm.motd}
                                onChange={(e) => updateForm('motd', e.target.value)}
                                readOnly={readonly}
                                rows={3}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.motd.description') ||
                                    'The message shown to players when they join'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <Users className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.maxPlayers.label') || 'Max Players'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.maxPlayers}
                                onChange={(e) => updateForm('maxPlayers', Number.parseInt(e.target.value, 10) || 0)}
                                readOnly={readonly}
                                min={1}
                                max={2147483647}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.maxPlayers.description') ||
                                    'Maximum number of players allowed on the server'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.gamemode.label') || 'Default Gamemode'}
                            </label>
                            <Select
                                disabled={readonly}
                                value={localForm.gamemode}
                                onChange={(e) => updateForm('gamemode', e.target.value)}
                            >
                                <option value='survival'>
                                    {t('files.editors.minecraftProperties.options.gamemode.survival') || 'Survival'}
                                </option>
                                <option value='creative'>
                                    {t('files.editors.minecraftProperties.options.gamemode.creative') || 'Creative'}
                                </option>
                                <option value='adventure'>
                                    {t('files.editors.minecraftProperties.options.gamemode.adventure') || 'Adventure'}
                                </option>
                                <option value='spectator'>
                                    {t('files.editors.minecraftProperties.options.gamemode.spectator') || 'Spectator'}
                                </option>
                            </Select>
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.gamemode.description') ||
                                    'Default gamemode for new players'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.difficulty.label') || 'Difficulty'}
                            </label>
                            <Select
                                disabled={readonly}
                                value={localForm.difficulty}
                                onChange={(e) => updateForm('difficulty', e.target.value)}
                            >
                                <option value='peaceful'>
                                    {t('files.editors.minecraftProperties.options.difficulty.peaceful') || 'Peaceful'}
                                </option>
                                <option value='easy'>
                                    {t('files.editors.minecraftProperties.options.difficulty.easy') || 'Easy'}
                                </option>
                                <option value='normal'>
                                    {t('files.editors.minecraftProperties.options.difficulty.normal') || 'Normal'}
                                </option>
                                <option value='hard'>
                                    {t('files.editors.minecraftProperties.options.difficulty.hard') || 'Hard'}
                                </option>
                            </Select>
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.difficulty.description') ||
                                    'Server difficulty level'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* World Settings Section */}
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Globe className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.minecraftProperties.sections.worldSettings') || 'World Settings'}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.minecraftProperties.sectionsDescriptions.worldSettings') ||
                                    'World generation and configuration'}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6 xl:col-span-2'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <Globe className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.levelName.label') || 'Level Name'}
                            </label>
                            <Input
                                type='text'
                                value={localForm.levelName}
                                onChange={(e) => updateForm('levelName', e.target.value)}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.levelName.description') ||
                                    'Name of the world folder'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6 xl:col-span-2'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <MountainSnow className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.levelSeed.label') || 'Level Seed'}
                            </label>
                            <Input
                                type='text'
                                value={localForm.levelSeed}
                                onChange={(e) => updateForm('levelSeed', e.target.value)}
                                readOnly={readonly}
                                placeholder='Random'
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.levelSeed.description') ||
                                    'Seed for world generation (leave empty for random)'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.levelType.label') || 'Level Type'}
                            </label>
                            <Select
                                disabled={readonly}
                                value={localForm.levelType}
                                onChange={(e) => updateForm('levelType', e.target.value)}
                            >
                                <option value='minecraft:normal'>
                                    {t('files.editors.minecraftProperties.options.levelType.default') || 'Default'}
                                </option>
                                <option value='minecraft:flat'>
                                    {t('files.editors.minecraftProperties.options.levelType.flat') || 'Flat'}
                                </option>
                                <option value='minecraft:amplified'>
                                    {t('files.editors.minecraftProperties.options.levelType.amplified') || 'Amplified'}
                                </option>
                                <option value='minecraft:large_biomes'>
                                    {t('files.editors.minecraftProperties.options.levelType.largeBiomes') ||
                                        'Large Biomes'}
                                </option>
                                <option value='minecraft:single_biome_surface'>
                                    {t('files.editors.minecraftProperties.options.levelType.singleBiome') ||
                                        'Single Biome'}
                                </option>
                            </Select>
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.levelType.description') ||
                                    'World generation type'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <Sliders className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.generatorSettings.label') ||
                                    'Generator Settings'}
                            </label>
                            <Input
                                type='text'
                                value={localForm.generatorSettings}
                                onChange={(e) => updateForm('generatorSettings', e.target.value)}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.generatorSettings.description') ||
                                    'Custom generator settings (JSON format)'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.generateStructures.label') ||
                                            'Generate Structures'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.generateStructures.description') ||
                                            'Generate structures like villages and temples'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.generateStructures}
                                    onCheckedChange={(checked) => updateForm('generateStructures', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.hardcore.label') ||
                                            'Hardcore Mode'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.hardcore.description') ||
                                            'Enable hardcore mode (permanent death)'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.hardcore}
                                    onCheckedChange={(checked) => updateForm('hardcore', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Gameplay Settings Section */}
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Gamepad2 className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.minecraftProperties.sections.gameplay') || 'Gameplay Settings'}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.minecraftProperties.sectionsDescriptions.gameplay') ||
                                    'Gameplay and player behavior settings'}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.pvp.label') || 'PvP'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.pvp.description') ||
                                            'Allow player vs player combat'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.pvp}
                                    onCheckedChange={(checked) => updateForm('pvp', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.allowFlight.label') ||
                                            'Allow Flight'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.allowFlight.description') ||
                                            'Allow players to fly'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.allowFlight}
                                    onCheckedChange={(checked) => updateForm('allowFlight', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.spawnMonsters.label') ||
                                            'Spawn Monsters'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.spawnMonsters.description') ||
                                            'Allow monsters to spawn'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.spawnMonsters}
                                    onCheckedChange={(checked) => updateForm('spawnMonsters', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.allowNether.label') ||
                                            'Allow Nether'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.allowNether.description') ||
                                            'Allow players to travel to the Nether'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.allowNether}
                                    onCheckedChange={(checked) => updateForm('allowNether', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.forceGamemode.label') ||
                                            'Force Gamemode'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.forceGamemode.description') ||
                                            'Force players to default gamemode'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.forceGamemode}
                                    onCheckedChange={(checked) => updateForm('forceGamemode', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.enableCommandBlock.label') ||
                                            'Enable Command Blocks'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.enableCommandBlock.description') ||
                                            'Enable command blocks in the world'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.enableCommandBlock}
                                    onCheckedChange={(checked) => updateForm('enableCommandBlock', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Network & Security Section */}
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Network className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.minecraftProperties.sections.network') || 'Network & Security'}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.minecraftProperties.sectionsDescriptions.network') ||
                                    'Network and security settings'}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.onlineMode.label') ||
                                            'Online Mode'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.onlineMode.description') ||
                                            'Verify players with Mojang (set to false for cracked servers)'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.onlineMode}
                                    onCheckedChange={(checked) => updateForm('onlineMode', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.whiteList.label') || 'Whitelist'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.whiteList.description') ||
                                            'Enable whitelist to restrict access'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.whiteList}
                                    onCheckedChange={(checked) => updateForm('whiteList', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.enforceWhitelist.label') ||
                                            'Enforce Whitelist'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.enforceWhitelist.description') ||
                                            'Automatically kick non-whitelisted players'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.enforceWhitelist}
                                    onCheckedChange={(checked) => updateForm('enforceWhitelist', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.enforceSecureProfile.label') ||
                                            'Enforce Secure Profile'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t(
                                            'files.editors.minecraftProperties.fields.enforceSecureProfile.description',
                                        ) || 'Require secure profile signatures'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.enforceSecureProfile}
                                    onCheckedChange={(checked) => updateForm('enforceSecureProfile', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.hideOnlinePlayers.label') ||
                                            'Hide Online Players'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.hideOnlinePlayers.description') ||
                                            'Hide player count from server list'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.hideOnlinePlayers}
                                    onCheckedChange={(checked) => updateForm('hideOnlinePlayers', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.useNativeTransport.label') ||
                                            'Use Native Transport'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.useNativeTransport.description') ||
                                            'Use native network transport for better performance'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.useNativeTransport}
                                    onCheckedChange={(checked) => updateForm('useNativeTransport', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Performance Settings Section */}
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Eye className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.minecraftProperties.sections.performance') || 'Performance Settings'}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.minecraftProperties.sectionsDescriptions.performance') ||
                                    'Server performance and rendering settings'}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <Shield className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.spawnProtection.label') ||
                                    'Spawn Protection'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.spawnProtection}
                                onChange={(e) =>
                                    updateForm('spawnProtection', Number.parseInt(e.target.value, 10) || 0)
                                }
                                readOnly={readonly}
                                min={0}
                                max={30000000}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.spawnProtection.description') ||
                                    'Radius of spawn protection (0 to disable)'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <Eye className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.viewDistance.label') || 'View Distance'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.viewDistance}
                                onChange={(e) => updateForm('viewDistance', Number.parseInt(e.target.value, 10) || 0)}
                                readOnly={readonly}
                                min={3}
                                max={32}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.viewDistance.description') ||
                                    'Maximum chunk render distance (3-32)'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.simulationDistance.label') ||
                                    'Simulation Distance'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.simulationDistance}
                                onChange={(e) =>
                                    updateForm('simulationDistance', Number.parseInt(e.target.value, 10) || 0)
                                }
                                readOnly={readonly}
                                min={3}
                                max={32}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.simulationDistance.description') ||
                                    'Maximum chunk simulation distance (3-32)'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.maxWorldSize.label') || 'Max World Size'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.maxWorldSize}
                                onChange={(e) => updateForm('maxWorldSize', Number.parseInt(e.target.value, 10) || 0)}
                                readOnly={readonly}
                                min={1}
                                max={29999984}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.maxWorldSize.description') ||
                                    'Maximum world size in blocks'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.maxChainedNeighborUpdates.label') ||
                                    'Max Chained Neighbor Updates'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.maxChainedNeighborUpdates}
                                onChange={(e) =>
                                    updateForm('maxChainedNeighborUpdates', Number.parseInt(e.target.value, 10) || 0)
                                }
                                readOnly={readonly}
                                min={-1}
                                max={16777215}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.maxChainedNeighborUpdates.description') ||
                                    'Maximum chained block updates (-1 for unlimited)'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.entityBroadcastRangePercentage.label') ||
                                    'Entity Broadcast Range %'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.entityBroadcastRangePercentage}
                                onChange={(e) =>
                                    updateForm(
                                        'entityBroadcastRangePercentage',
                                        Number.parseInt(e.target.value, 10) || 0,
                                    )
                                }
                                readOnly={readonly}
                                min={0}
                                max={500}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t(
                                    'files.editors.minecraftProperties.fields.entityBroadcastRangePercentage.description',
                                ) || 'Entity broadcast range percentage (0-500)'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Resource Pack Section */}
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <FileArchive className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.minecraftProperties.sections.resourcePack') || 'Resource Pack'}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.minecraftProperties.sectionsDescriptions.resourcePack') ||
                                    'Resource pack configuration'}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.requireResourcePack.label') ||
                                            'Require Resource Pack'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t(
                                            'files.editors.minecraftProperties.fields.requireResourcePack.description',
                                        ) || 'Force players to use the resource pack'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.requireResourcePack}
                                    onCheckedChange={(checked) => updateForm('requireResourcePack', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6 xl:col-span-2'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <FileArchive className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.resourcePack.label') ||
                                    'Resource Pack URL'}
                            </label>
                            <Input
                                type='text'
                                value={localForm.resourcePack}
                                onChange={(e) => updateForm('resourcePack', e.target.value)}
                                readOnly={readonly}
                                placeholder='https://example.com/resource-pack.zip'
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.resourcePack.description') ||
                                    'URL to the resource pack file'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <Hash className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.resourcePackSha1.label') ||
                                    'Resource Pack SHA1'}
                            </label>
                            <Input
                                type='text'
                                value={localForm.resourcePackSha1}
                                onChange={(e) => updateForm('resourcePackSha1', e.target.value)}
                                readOnly={readonly}
                                placeholder='0f1412443d23a48f1a74d661c45bc9a904269db2'
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.resourcePackSha1.description') ||
                                    'SHA1 hash of the resource pack'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2'>
                                <Hash className='h-3 w-3 text-primary' />
                                {t('files.editors.minecraftProperties.fields.resourcePackId.label') ||
                                    'Resource Pack ID'}
                            </label>
                            <Input
                                type='text'
                                value={localForm.resourcePackId}
                                onChange={(e) => updateForm('resourcePackId', e.target.value)}
                                readOnly={readonly}
                                placeholder='119e9b1e-d244-5ba3-e070-bb226e6753d1'
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.resourcePackId.description') ||
                                    'Unique identifier for the resource pack'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6 xl:col-span-2'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.resourcePackPrompt.label') ||
                                    'Resource Pack Prompt'}
                            </label>
                            <Textarea
                                value={localForm.resourcePackPrompt}
                                onChange={(e) => updateForm('resourcePackPrompt', e.target.value)}
                                readOnly={readonly}
                                rows={2}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.resourcePackPrompt.description') ||
                                    'Message shown when prompting players to download the resource pack'}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Advanced Settings Section */}
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Sliders className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.minecraftProperties.sections.advanced') || 'Advanced Settings'}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.minecraftProperties.sectionsDescriptions.advanced') ||
                                    'Advanced server configuration'}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.opPermissionLevel.label') ||
                                    'OP Permission Level'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.opPermissionLevel}
                                onChange={(e) =>
                                    updateForm('opPermissionLevel', Number.parseInt(e.target.value, 10) || 0)
                                }
                                readOnly={readonly}
                                min={1}
                                max={4}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.opPermissionLevel.description') ||
                                    'Permission level for server operators (1-4)'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.minecraftProperties.fields.functionPermissionLevel.label') ||
                                    'Function Permission Level'}
                            </label>
                            <Input
                                type='number'
                                value={localForm.functionPermissionLevel}
                                onChange={(e) =>
                                    updateForm('functionPermissionLevel', Number.parseInt(e.target.value, 10) || 0)
                                }
                                readOnly={readonly}
                                min={1}
                                max={4}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.minecraftProperties.fields.functionPermissionLevel.description') ||
                                    'Permission level required to use functions (1-4)'}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.broadcastConsoleToOps.label') ||
                                            'Broadcast Console to OPs'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t(
                                            'files.editors.minecraftProperties.fields.broadcastConsoleToOps.description',
                                        ) || 'Send console messages to operators'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.broadcastConsoleToOps}
                                    onCheckedChange={(checked) => updateForm('broadcastConsoleToOps', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.minecraftProperties.fields.previewsChat.label') ||
                                            'Previews Chat'}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.minecraftProperties.fields.previewsChat.description') ||
                                            'Enable chat message previews'}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.previewsChat}
                                    onCheckedChange={(checked) => updateForm('previewsChat', checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </Card>
    );
}
