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

import { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
    const [form, setForm] = useState<MinecraftServerPropertiesForm>(() => getInitialForm(content));

    // Update form when content changes
    useEffect(() => {
        setForm(getInitialForm(content));
    }, [content]);

    // Inject dark theme styles
    useEffect(() => {
        const styleId = 'minecraft-properties-editor-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* Override ALL input, textarea, and select elements */
                .minecraft-properties-editor input,
                .minecraft-properties-editor input[type="text"],
                .minecraft-properties-editor input[type="number"],
                .minecraft-properties-editor textarea,
                .minecraft-properties-editor select,
                .minecraft-properties-editor input:focus,
                .minecraft-properties-editor input[type="text"]:focus,
                .minecraft-properties-editor input[type="number"]:focus,
                .minecraft-properties-editor textarea:focus,
                .minecraft-properties-editor select:focus,
                .minecraft-properties-editor input:hover,
                .minecraft-properties-editor input[type="text"]:hover,
                .minecraft-properties-editor input[type="number"]:hover,
                .minecraft-properties-editor textarea:hover,
                .minecraft-properties-editor select:hover,
                .minecraft-properties-editor input:active,
                .minecraft-properties-editor textarea:active,
                .minecraft-properties-editor select:active {
                    background-color: hsl(var(--background)) !important;
                    background: hsl(var(--background)) !important;
                    border-color: hsl(var(--border) / 0.5) !important;
                    color: hsl(var(--foreground)) !important;
                }
                .minecraft-properties-editor input:focus,
                .minecraft-properties-editor textarea:focus,
                .minecraft-properties-editor select:focus {
                    border-color: hsl(var(--primary)) !important;
                }
                .minecraft-properties-editor select option {
                    background-color: hsl(var(--background)) !important;
                    background: hsl(var(--background)) !important;
                    color: hsl(var(--foreground)) !important;
                }
                /* Override Headless UI Input - target the actual input element */
                .minecraft-properties-editor [data-headlessui-state],
                .minecraft-properties-editor [data-headlessui-state] input {
                    background-color: hsl(var(--background)) !important;
                    background: hsl(var(--background)) !important;
                }
                /* Force override any bg-muted classes */
                .minecraft-properties-editor .bg-muted\\/30,
                .minecraft-properties-editor [class*="bg-muted"] {
                    background-color: hsl(var(--background)) !important;
                    background: hsl(var(--background)) !important;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    const handleSave = () => {
        const updates = serializeForm(form);
        const newContent = mergeProperties(content, updates);
        onSave(newContent);
    };

    const incrementNumber = (field: keyof MinecraftServerPropertiesForm) => {
        setForm((prev) => {
            const value = prev[field] as number;
            return { ...prev, [field]: value + 1 };
        });
    };

    const decrementNumber = (field: keyof MinecraftServerPropertiesForm) => {
        setForm((prev) => {
            const value = prev[field] as number;
            if (value > 0) {
                return { ...prev, [field]: value - 1 };
            }
            return prev;
        });
    };

    const updateForm = (field: keyof MinecraftServerPropertiesForm, value: unknown) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Card className='border-primary/20 minecraft-properties-editor'>
            <CardHeader className='border-b border-border/40'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                    <div>
                        <CardTitle className='text-2xl font-bold'>
                            {t('files.editors.minecraftProperties.title')}
                        </CardTitle>
                        <CardDescription className='text-sm mt-1'>
                            {t('files.editors.minecraftProperties.description') ||
                                'Configure your Minecraft server properties visually'}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            {t('files.editors.minecraftProperties.actions.switchToRaw')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='h-4 w-4 mr-2' />
                            {saving
                                ? t('files.editors.minecraftProperties.actions.saving')
                                : t('files.editors.minecraftProperties.actions.save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='p-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
                    {/* MOTD (Full width with textarea) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors md:col-span-2 xl:col-span-3 border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.motd.label')}
                            </Label>
                            <Textarea
                                value={form.motd}
                                onChange={(e) => updateForm('motd', e.target.value)}
                                readOnly={readonly}
                                rows={3}
                                className='font-mono text-sm !bg-background !border-border/50 !text-foreground'
                            />
                            <p className='text-xs text-muted-foreground'>
                                {t('files.editors.minecraftProperties.fields.motd.description') ||
                                    'The message shown to players when they join'}
                            </p>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>motd</span>=<span>{form.motd}</span>
                        </div>
                    </div>

                    {/* Max Players */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold flex items-center gap-2'>
                                <Users className='h-4 w-4 text-primary' />
                                {t('files.editors.minecraftProperties.fields.maxPlayers.label')}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.maxPlayers}
                                    onChange={(e) => updateForm('maxPlayers', Number.parseInt(e.target.value, 10) || 0)}
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={1}
                                    max={2147483647}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('maxPlayers')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('maxPlayers')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>max-players</span>=
                            <span>{form.maxPlayers}</span>
                        </div>
                    </div>

                    {/* Gamemode */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.gamemode.label')}
                            </Label>
                            <Select
                                disabled={readonly}
                                value={form.gamemode}
                                onChange={(e) => updateForm('gamemode', e.target.value)}
                                className='!bg-background !border-border/50 !text-foreground [&>option]:!bg-background [&>option]:!text-foreground'
                            >
                                <option value='survival'>
                                    {t('files.editors.minecraftProperties.options.gamemode.survival')}
                                </option>
                                <option value='creative'>
                                    {t('files.editors.minecraftProperties.options.gamemode.creative')}
                                </option>
                                <option value='adventure'>
                                    {t('files.editors.minecraftProperties.options.gamemode.adventure')}
                                </option>
                                <option value='spectator'>
                                    {t('files.editors.minecraftProperties.options.gamemode.spectator')}
                                </option>
                            </Select>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>gamemode</span>=<span>{form.gamemode}</span>
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.difficulty.label')}
                            </Label>
                            <Select
                                disabled={readonly}
                                value={form.difficulty}
                                onChange={(e) => updateForm('difficulty', e.target.value)}
                                className='!bg-background !border-border/50 !text-foreground [&>option]:!bg-background [&>option]:!text-foreground'
                            >
                                <option value='peaceful'>
                                    {t('files.editors.minecraftProperties.options.difficulty.peaceful')}
                                </option>
                                <option value='easy'>
                                    {t('files.editors.minecraftProperties.options.difficulty.easy')}
                                </option>
                                <option value='normal'>
                                    {t('files.editors.minecraftProperties.options.difficulty.normal')}
                                </option>
                                <option value='hard'>
                                    {t('files.editors.minecraftProperties.options.difficulty.hard')}
                                </option>
                            </Select>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>difficulty</span>=
                            <span>{form.difficulty}</span>
                        </div>
                    </div>

                    {/* Whitelist */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold cursor-pointer'>
                                {t('files.editors.minecraftProperties.fields.whiteList.label')}
                            </Label>
                            <Checkbox
                                checked={form.whiteList}
                                onCheckedChange={(checked) => updateForm('whiteList', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>white-list</span>=
                            <span>{formatBoolean(form.whiteList)}</span>
                        </div>
                    </div>

                    {/* Enforce Whitelist */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold cursor-pointer'>
                                {t('files.editors.minecraftProperties.fields.enforceWhitelist.label') ||
                                    'Enforce Whitelist'}
                            </Label>
                            <Checkbox
                                checked={form.enforceWhitelist}
                                onCheckedChange={(checked) => updateForm('enforceWhitelist', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>enforce-whitelist</span>=
                            <span>{formatBoolean(form.enforceWhitelist)}</span>
                        </div>
                    </div>

                    {/* Online Mode (Cracked) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold cursor-pointer'>
                                {t('files.editors.minecraftProperties.fields.onlineMode.label')}
                            </Label>
                            <Checkbox
                                checked={form.onlineMode}
                                onCheckedChange={(checked) => updateForm('onlineMode', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>online-mode</span>=
                            <span>{formatBoolean(form.onlineMode)}</span>
                        </div>
                    </div>

                    {/* PVP */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.pvp.label')}
                            </Label>
                            <Checkbox
                                checked={form.pvp}
                                onCheckedChange={(checked) => updateForm('pvp', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>pvp</span>=
                            <span>{formatBoolean(form.pvp)}</span>
                        </div>
                    </div>

                    {/* Command Blocks */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.enableCommandBlock.label') ||
                                    'Enable Command Blocks'}
                            </Label>
                            <Checkbox
                                checked={form.enableCommandBlock}
                                onCheckedChange={(checked) => updateForm('enableCommandBlock', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>enable-command-block</span>=
                            <span>{formatBoolean(form.enableCommandBlock)}</span>
                        </div>
                    </div>

                    {/* Allow Flight */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.allowFlight.label')}
                            </Label>
                            <Checkbox
                                checked={form.allowFlight}
                                onCheckedChange={(checked) => updateForm('allowFlight', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>allow-flight</span>=
                            <span>{formatBoolean(form.allowFlight)}</span>
                        </div>
                    </div>

                    {/* Spawn Monsters */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.spawnMonsters.label')}
                            </Label>
                            <Checkbox
                                checked={form.spawnMonsters}
                                onCheckedChange={(checked) => updateForm('spawnMonsters', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>spawn-monsters</span>=
                            <span>{formatBoolean(form.spawnMonsters)}</span>
                        </div>
                    </div>

                    {/* Allow Nether */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.allowNether.label')}
                            </Label>
                            <Checkbox
                                checked={form.allowNether}
                                onCheckedChange={(checked) => updateForm('allowNether', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>allow-nether</span>=
                            <span>{formatBoolean(form.allowNether)}</span>
                        </div>
                    </div>

                    {/* Force Gamemode */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.forceGamemode.label')}
                            </Label>
                            <Checkbox
                                checked={form.forceGamemode}
                                onCheckedChange={(checked) => updateForm('forceGamemode', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>force-gamemode</span>=
                            <span>{formatBoolean(form.forceGamemode)}</span>
                        </div>
                    </div>

                    {/* Broadcast Console to OPs */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.broadcastConsoleToOps.label') ||
                                    'Broadcast Console to OPs'}
                            </Label>
                            <Checkbox
                                checked={form.broadcastConsoleToOps}
                                onCheckedChange={(checked) => updateForm('broadcastConsoleToOps', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>broadcast-console-to-ops</span>=
                            <span>{formatBoolean(form.broadcastConsoleToOps)}</span>
                        </div>
                    </div>

                    {/* Spawn Protection */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold flex items-center gap-2'>
                                <Shield className='h-4 w-4 text-primary' />
                                {t('files.editors.minecraftProperties.fields.spawnProtection.label') ||
                                    'Spawn Protection'}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.spawnProtection}
                                    onChange={(e) =>
                                        updateForm('spawnProtection', Number.parseInt(e.target.value, 10) || 0)
                                    }
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={0}
                                    max={30000000}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('spawnProtection')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('spawnProtection')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>spawn-protection</span>=
                            <span>{form.spawnProtection}</span>
                        </div>
                    </div>

                    {/* View Distance */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold flex items-center gap-2'>
                                <Eye className='h-4 w-4 text-primary' />
                                {t('files.editors.minecraftProperties.fields.viewDistance.label')}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.viewDistance}
                                    onChange={(e) =>
                                        updateForm('viewDistance', Number.parseInt(e.target.value, 10) || 0)
                                    }
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={3}
                                    max={32}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('viewDistance')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('viewDistance')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>view-distance</span>=
                            <span>{form.viewDistance}</span>
                        </div>
                    </div>

                    {/* Simulation Distance */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.simulationDistance.label') ||
                                    'Simulation Distance'}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.simulationDistance}
                                    onChange={(e) =>
                                        updateForm('simulationDistance', Number.parseInt(e.target.value, 10) || 0)
                                    }
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={3}
                                    max={32}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('simulationDistance')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('simulationDistance')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>simulation-distance</span>=
                            <span>{form.simulationDistance}</span>
                        </div>
                    </div>

                    {/* Level Name (Full width) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold flex items-center gap-2'>
                                <Globe className='h-4 w-4 text-primary' />
                                {t('files.editors.minecraftProperties.fields.levelName.label')}
                            </Label>
                            <Input
                                type='text'
                                value={form.levelName}
                                onChange={(e) => updateForm('levelName', e.target.value)}
                                readOnly={readonly}
                                className='!bg-background !border-border/50 !text-foreground'
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>level-name</span>=<span>{form.levelName}</span>
                        </div>
                    </div>

                    {/* Level Seed (Full width) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold flex items-center gap-2'>
                                <MountainSnow className='h-4 w-4 text-primary' />
                                {t('files.editors.minecraftProperties.fields.levelSeed.label')}
                            </Label>
                            <Input
                                type='text'
                                value={form.levelSeed}
                                onChange={(e) => updateForm('levelSeed', e.target.value)}
                                readOnly={readonly}
                                placeholder='Random'
                                className='!bg-background !border-border/50 !text-foreground'
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>level-seed</span>=<span>{form.levelSeed}</span>
                        </div>
                    </div>

                    {/* Generator Settings (Full width) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold flex items-center gap-2'>
                                <Sliders className='h-4 w-4 text-primary' />
                                {t('files.editors.minecraftProperties.fields.generatorSettings.label') ||
                                    'Generator Settings'}
                            </Label>
                            <Input
                                type='text'
                                value={form.generatorSettings}
                                onChange={(e) => updateForm('generatorSettings', e.target.value)}
                                readOnly={readonly}
                                className='!bg-background !border-border/50 !text-foreground'
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>generator-settings</span>=
                            <span>{form.generatorSettings}</span>
                        </div>
                    </div>

                    {/* Level Type */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.levelType.label')}
                            </Label>
                            <Select
                                disabled={readonly}
                                value={form.levelType}
                                onChange={(e) => updateForm('levelType', e.target.value)}
                                className='!bg-background !border-border/50 !text-foreground [&>option]:!bg-background [&>option]:!text-foreground'
                            >
                                <option value='minecraft:normal'>
                                    {t('files.editors.minecraftProperties.options.levelType.default')}
                                </option>
                                <option value='minecraft:flat'>
                                    {t('files.editors.minecraftProperties.options.levelType.flat')}
                                </option>
                                <option value='minecraft:amplified'>
                                    {t('files.editors.minecraftProperties.options.levelType.amplified')}
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
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>level-type</span>=<span>{form.levelType}</span>
                        </div>
                    </div>

                    {/* Generate Structures */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.generateStructures.label') ||
                                    'Generate Structures'}
                            </Label>
                            <Checkbox
                                checked={form.generateStructures}
                                onCheckedChange={(checked) => updateForm('generateStructures', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>generate-structures</span>=
                            <span>{formatBoolean(form.generateStructures)}</span>
                        </div>
                    </div>

                    {/* Hardcore */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.hardcore.label')}
                            </Label>
                            <Checkbox
                                checked={form.hardcore}
                                onCheckedChange={(checked) => updateForm('hardcore', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>hardcore</span>=
                            <span>{formatBoolean(form.hardcore)}</span>
                        </div>
                    </div>

                    {/* Require Resource Pack */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.requireResourcePack.label') ||
                                    'Require Resource Pack'}
                            </Label>
                            <Checkbox
                                checked={form.requireResourcePack}
                                onCheckedChange={(checked) => updateForm('requireResourcePack', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>require-resource-pack</span>=
                            <span>{formatBoolean(form.requireResourcePack)}</span>
                        </div>
                    </div>

                    {/* Hide Online Players */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.hideOnlinePlayers.label') ||
                                    'Hide Online Players'}
                            </Label>
                            <Checkbox
                                checked={form.hideOnlinePlayers}
                                onCheckedChange={(checked) => updateForm('hideOnlinePlayers', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>hide-online-players</span>=
                            <span>{formatBoolean(form.hideOnlinePlayers)}</span>
                        </div>
                    </div>

                    {/* Enforce Secure Profile */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.enforceSecureProfile.label') ||
                                    'Enforce Secure Profile'}
                            </Label>
                            <Checkbox
                                checked={form.enforceSecureProfile}
                                onCheckedChange={(checked) => updateForm('enforceSecureProfile', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>enforce-secure-profile</span>=
                            <span>{formatBoolean(form.enforceSecureProfile)}</span>
                        </div>
                    </div>

                    {/* Previews Chat */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.previewsChat.label')}
                            </Label>
                            <Checkbox
                                checked={form.previewsChat}
                                onCheckedChange={(checked) => updateForm('previewsChat', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>previews-chat</span>=
                            <span>{formatBoolean(form.previewsChat)}</span>
                        </div>
                    </div>

                    {/* Use Native Transport */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex items-center justify-between'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.useNativeTransport.label') ||
                                    'Use Native Transport'}
                            </Label>
                            <Checkbox
                                checked={form.useNativeTransport}
                                onCheckedChange={(checked) => updateForm('useNativeTransport', checked)}
                                disabled={readonly}
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>use-native-transport</span>=
                            <span>{formatBoolean(form.useNativeTransport)}</span>
                        </div>
                    </div>

                    {/* Resource Pack (Full width) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold flex items-center gap-2'>
                                <FileArchive className='h-4 w-4 text-primary' />
                                {t('files.editors.minecraftProperties.fields.resourcePack.label')}
                            </Label>
                            <Input
                                type='text'
                                value={form.resourcePack}
                                onChange={(e) => updateForm('resourcePack', e.target.value)}
                                readOnly={readonly}
                                placeholder='https://example.com/resource-pack.zip'
                                className='!bg-background !border-border/50 !text-foreground'
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>resource-pack</span>=
                            <span>{form.resourcePack}</span>
                        </div>
                    </div>

                    {/* Resource Pack SHA1 (Full width) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.resourcePackSha1.label') ||
                                    'Resource Pack SHA1'}
                            </Label>
                            <Input
                                type='text'
                                value={form.resourcePackSha1}
                                onChange={(e) => updateForm('resourcePackSha1', e.target.value)}
                                readOnly={readonly}
                                placeholder='0f1412443d23a48f1a74d661c45bc9a904269db2'
                                className='!bg-background !border-border/50 !text-foreground'
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>resource-pack-sha1</span>=
                            <span>{form.resourcePackSha1}</span>
                        </div>
                    </div>

                    {/* Resource Pack ID (Full width) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold flex items-center gap-2'>
                                <Hash className='h-4 w-4 text-primary' />
                                {t('files.editors.minecraftProperties.fields.resourcePackId.label') ||
                                    'Resource Pack ID'}
                            </Label>
                            <Input
                                type='text'
                                value={form.resourcePackId}
                                onChange={(e) => updateForm('resourcePackId', e.target.value)}
                                readOnly={readonly}
                                placeholder='119e9b1e-d244-5ba3-e070-bb226e6753d1'
                                className='!bg-background !border-border/50 !text-foreground'
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>resource-pack-id</span>=
                            <span>{form.resourcePackId}</span>
                        </div>
                    </div>

                    {/* Resource Pack Prompt (Full width) */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.resourcePackPrompt.label') ||
                                    'Resource Pack Prompt'}
                            </Label>
                            <Textarea
                                value={form.resourcePackPrompt}
                                onChange={(e) => updateForm('resourcePackPrompt', e.target.value)}
                                readOnly={readonly}
                                rows={2}
                                className='!bg-background !border-border/50 !text-foreground'
                            />
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>resource-pack-prompt</span>=
                            <span>{form.resourcePackPrompt}</span>
                        </div>
                    </div>

                    {/* OP Permission Level */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.opPermissionLevel.label') ||
                                    'OP Permission Level'}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.opPermissionLevel}
                                    onChange={(e) =>
                                        updateForm('opPermissionLevel', Number.parseInt(e.target.value, 10) || 0)
                                    }
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={1}
                                    max={4}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('opPermissionLevel')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('opPermissionLevel')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>op-permission-level</span>=
                            <span>{form.opPermissionLevel}</span>
                        </div>
                    </div>

                    {/* Function Permission Level */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.functionPermissionLevel.label') ||
                                    'Function Permission Level'}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.functionPermissionLevel}
                                    onChange={(e) =>
                                        updateForm('functionPermissionLevel', Number.parseInt(e.target.value, 10) || 0)
                                    }
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={1}
                                    max={4}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('functionPermissionLevel')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('functionPermissionLevel')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>function-permission-level</span>=
                            <span>{form.functionPermissionLevel}</span>
                        </div>
                    </div>

                    {/* Entity Broadcast Range */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0 md:col-span-2 xl:col-span-3'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.entityBroadcastRangePercentage.label') ||
                                    'Entity Broadcast Range Percentage'}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.entityBroadcastRangePercentage}
                                    onChange={(e) =>
                                        updateForm(
                                            'entityBroadcastRangePercentage',
                                            Number.parseInt(e.target.value, 10) || 0,
                                        )
                                    }
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={0}
                                    max={500}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('entityBroadcastRangePercentage')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('entityBroadcastRangePercentage')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>entity-broadcast-range-percentage</span>=
                            <span>{form.entityBroadcastRangePercentage}</span>
                        </div>
                    </div>

                    {/* Max Chained Neighbor Updates */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.maxChainedNeighborUpdates.label') ||
                                    'Max Chained Neighbor Updates'}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.maxChainedNeighborUpdates}
                                    onChange={(e) =>
                                        updateForm(
                                            'maxChainedNeighborUpdates',
                                            Number.parseInt(e.target.value, 10) || 0,
                                        )
                                    }
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={-1}
                                    max={16777215}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('maxChainedNeighborUpdates')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('maxChainedNeighborUpdates')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>max-chained-neighbor-updates</span>=
                            <span>{form.maxChainedNeighborUpdates}</span>
                        </div>
                    </div>

                    {/* Max World Size */}
                    <div className='flex flex-col gap-2 p-4 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors border-0'>
                        <div className='flex flex-col gap-2'>
                            <Label className='text-sm font-semibold'>
                                {t('files.editors.minecraftProperties.fields.maxWorldSize.label')}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.maxWorldSize}
                                    onChange={(e) =>
                                        updateForm('maxWorldSize', Number.parseInt(e.target.value, 10) || 0)
                                    }
                                    readOnly={readonly}
                                    className='pr-16 !bg-background !border-border/50 !text-foreground'
                                    min={1}
                                    max={29999984}
                                />
                                <div className='absolute right-0 top-0 bottom-0 flex flex-col border-l border-border rounded-r-md overflow-hidden'>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border flex items-center justify-center'
                                        onClick={() => incrementNumber('maxWorldSize')}
                                        disabled={readonly}
                                    >
                                        <Plus className='h-3 w-3' />
                                    </button>
                                    <button
                                        type='button'
                                        className='flex-1 px-3 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center'
                                        onClick={() => decrementNumber('maxWorldSize')}
                                        disabled={readonly}
                                    >
                                        <Minus className='h-3 w-3' />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded'>
                            <span className='text-primary font-semibold'>max-world-size</span>=
                            <span>{form.maxWorldSize}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
