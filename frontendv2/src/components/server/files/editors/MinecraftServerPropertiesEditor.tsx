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

import { useState, useEffect, useMemo, type ComponentType } from 'react';
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
    Terminal,
    Server,
    Package,
} from 'lucide-react';
import {
    type MinecraftServerPropertiesForm,
    parseForm,
    parseProperties,
    serializeForm,
    filterUpdatesForExistingKeys,
    mergeProperties,
} from './minecraftServerPropertiesModel';

interface MinecraftServerPropertiesEditorProps {
    content: string;
    readonly?: boolean;
    saving?: boolean;
    onSave: (content: string) => void;
    onSwitchToRaw: () => void;
}

function SectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
}) {
    return (
        <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                <Icon className='text-primary h-5 w-5' />
            </div>
            <div className='space-y-0.5'>
                <h3 className='text-xl font-black tracking-tight uppercase italic'>{title}</h3>
                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                    {description}
                </p>
            </div>
        </div>
    );
}

function CheckboxSetting({
    label,
    description,
    checked,
    onCheckedChange,
    disabled,
}: {
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className='bg-muted/10 border-border/20 hover:border-border/40 space-y-3 rounded-xl border p-5 transition-all'>
            <div className='flex items-start justify-between gap-4'>
                <div className='space-y-1'>
                    <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                        {label}
                    </label>
                    <p className='text-muted-foreground ml-1 text-[9px] font-black tracking-widest uppercase opacity-60'>
                        {description}
                    </p>
                </div>
                <Checkbox checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
            </div>
        </div>
    );
}

function NumberSetting({
    label,
    description,
    value,
    onChange,
    readOnly,
    min,
    max,
    icon: Icon,
}: {
    label: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
    readOnly?: boolean;
    min?: number;
    max?: number;
    icon?: ComponentType<{ className?: string }>;
}) {
    return (
        <div className='bg-card/30 border-border/30 space-y-3 rounded-xl border p-6'>
            <label className='text-muted-foreground ml-1 flex items-center gap-2 text-[9px] font-black tracking-[0.2em] uppercase'>
                {Icon ? <Icon className='text-primary h-3 w-3' /> : null}
                {label}
            </label>
            <Input
                type='number'
                value={value}
                onChange={(e) => onChange(Number.parseInt(e.target.value, 10) || 0)}
                readOnly={readOnly}
                min={min}
                max={max}
            />
            <p className='text-muted-foreground ml-1 text-[9px] font-black tracking-widest uppercase opacity-60'>
                {description}
            </p>
        </div>
    );
}

function TextSetting({
    label,
    description,
    value,
    onChange,
    readOnly,
    placeholder,
    icon: Icon,
    multiline = false,
}: {
    label: string;
    description: string;
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    placeholder?: string;
    icon?: ComponentType<{ className?: string }>;
    multiline?: boolean;
}) {
    return (
        <div className='bg-card/30 border-border/30 space-y-3 rounded-xl border p-6'>
            <label className='text-muted-foreground ml-1 flex items-center gap-2 text-[9px] font-black tracking-[0.2em] uppercase'>
                {Icon ? <Icon className='text-primary h-3 w-3' /> : null}
                {label}
            </label>
            {multiline ? (
                <Textarea value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} rows={2} />
            ) : (
                <Input
                    type='text'
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    readOnly={readOnly}
                    placeholder={placeholder}
                />
            )}
            <p className='text-muted-foreground ml-1 text-[9px] font-black tracking-widest uppercase opacity-60'>
                {description}
            </p>
        </div>
    );
}

export function MinecraftServerPropertiesEditor({
    content,
    readonly = false,
    saving = false,
    onSave,
    onSwitchToRaw,
}: MinecraftServerPropertiesEditorProps) {
    const { t } = useTranslation();
    const tr = (key: string, fallback: string) => t(key) || fallback;

    const form = useMemo(() => parseForm(content), [content]);
    const existingKeys = useMemo(() => new Set(parseProperties(content).keys()), [content]);
    const hasKey = (key: string) => existingKeys.has(key);

    const [localForm, setLocalForm] = useState<MinecraftServerPropertiesForm>(form);

    useEffect(() => {
        setLocalForm(form);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    const handleSave = () => {
        const updates = filterUpdatesForExistingKeys(serializeForm(localForm), existingKeys);
        onSave(mergeProperties(content, updates));
    };

    const updateForm = <K extends keyof MinecraftServerPropertiesForm>(
        field: K,
        value: MinecraftServerPropertiesForm[K],
    ) => {
        setLocalForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Card className='bg-card/50 border-border/50 flex flex-col overflow-hidden rounded-3xl border shadow-sm backdrop-blur-3xl'>
            <CardHeader className='border-border/10 shrink-0 border-b pb-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                        <CardTitle className='text-2xl font-bold'>
                            {tr('files.editors.minecraftProperties.title', 'Minecraft Server Properties')}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground text-sm'>
                            {tr(
                                'files.editors.minecraftProperties.description',
                                'Configure your Minecraft server properties visually',
                            )}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {tr('files.editors.minecraftProperties.actions.switchToRaw', 'Switch to Raw Editor')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='mr-2 h-4 w-4' />
                            {saving
                                ? tr('files.editors.minecraftProperties.actions.saving', 'Saving...')
                                : tr('files.editors.minecraftProperties.actions.save', 'Save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='flex-1 space-y-10 overflow-y-auto p-8'>
                <section className='space-y-6'>
                    <SectionHeader
                        icon={Settings2}
                        title={tr('files.editors.minecraftProperties.sections.serverInfo', 'Server Information')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.serverInfo',
                            'Basic server configuration',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                        <TextSetting
                            label={tr('files.editors.minecraftProperties.fields.motd.label', 'Message of the Day')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.motd.description',
                                'The message shown to players when they join',
                            )}
                            value={localForm.motd}
                            onChange={(value) => updateForm('motd', value)}
                            readOnly={readonly}
                            multiline
                        />
                        <TextSetting
                            label={tr('files.editors.minecraftProperties.fields.serverName.label', 'Server Name')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.serverName.description',
                                'Internal server name used for logging',
                            )}
                            value={localForm.serverName}
                            onChange={(value) => updateForm('serverName', value)}
                            readOnly={readonly}
                        />
                        <NumberSetting
                            icon={Users}
                            label={tr('files.editors.minecraftProperties.fields.maxPlayers.label', 'Max Players')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.maxPlayers.description',
                                'Maximum number of players allowed on the server',
                            )}
                            value={localForm.maxPlayers}
                            onChange={(value) => updateForm('maxPlayers', value)}
                            readOnly={readonly}
                            min={1}
                        />
                        <div className='bg-card/30 border-border/30 space-y-3 rounded-xl border p-6'>
                            <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {tr('files.editors.minecraftProperties.fields.gamemode.label', 'Default Gamemode')}
                            </label>
                            <Select
                                disabled={readonly}
                                value={localForm.gamemode}
                                onChange={(e) => updateForm('gamemode', e.target.value)}
                            >
                                <option value='survival'>
                                    {tr('files.editors.minecraftProperties.options.gamemode.survival', 'Survival')}
                                </option>
                                <option value='creative'>
                                    {tr('files.editors.minecraftProperties.options.gamemode.creative', 'Creative')}
                                </option>
                                <option value='adventure'>
                                    {tr('files.editors.minecraftProperties.options.gamemode.adventure', 'Adventure')}
                                </option>
                                <option value='spectator'>
                                    {tr('files.editors.minecraftProperties.options.gamemode.spectator', 'Spectator')}
                                </option>
                            </Select>
                        </div>
                        <div className='bg-card/30 border-border/30 space-y-3 rounded-xl border p-6'>
                            <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {tr('files.editors.minecraftProperties.fields.difficulty.label', 'Difficulty')}
                            </label>
                            <Select
                                disabled={readonly}
                                value={localForm.difficulty}
                                onChange={(e) => updateForm('difficulty', e.target.value)}
                            >
                                <option value='peaceful'>
                                    {tr('files.editors.minecraftProperties.options.difficulty.peaceful', 'Peaceful')}
                                </option>
                                <option value='easy'>
                                    {tr('files.editors.minecraftProperties.options.difficulty.easy', 'Easy')}
                                </option>
                                <option value='normal'>
                                    {tr('files.editors.minecraftProperties.options.difficulty.normal', 'Normal')}
                                </option>
                                <option value='hard'>
                                    {tr('files.editors.minecraftProperties.options.difficulty.hard', 'Hard')}
                                </option>
                            </Select>
                        </div>
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={Globe}
                        title={tr('files.editors.minecraftProperties.sections.worldSettings', 'World Settings')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.worldSettings',
                            'World generation and configuration',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                        <TextSetting
                            icon={Globe}
                            label={tr('files.editors.minecraftProperties.fields.levelName.label', 'Level Name')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.levelName.description',
                                'Name of the world folder',
                            )}
                            value={localForm.levelName}
                            onChange={(value) => updateForm('levelName', value)}
                            readOnly={readonly}
                        />
                        <TextSetting
                            icon={MountainSnow}
                            label={tr('files.editors.minecraftProperties.fields.levelSeed.label', 'Level Seed')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.levelSeed.description',
                                'Seed for world generation (leave empty for random)',
                            )}
                            value={localForm.levelSeed}
                            onChange={(value) => updateForm('levelSeed', value)}
                            readOnly={readonly}
                            placeholder='Random'
                        />
                        <div className='bg-card/30 border-border/30 space-y-3 rounded-xl border p-6'>
                            <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {tr('files.editors.minecraftProperties.fields.levelType.label', 'Level Type')}
                            </label>
                            <Select
                                disabled={readonly}
                                value={localForm.levelType}
                                onChange={(e) => updateForm('levelType', e.target.value)}
                            >
                                <option value='minecraft:normal'>
                                    {tr('files.editors.minecraftProperties.options.levelType.default', 'Default')}
                                </option>
                                <option value='minecraft:flat'>
                                    {tr('files.editors.minecraftProperties.options.levelType.flat', 'Flat')}
                                </option>
                                <option value='minecraft:amplified'>
                                    {tr('files.editors.minecraftProperties.options.levelType.amplified', 'Amplified')}
                                </option>
                                <option value='minecraft:large_biomes'>
                                    {tr(
                                        'files.editors.minecraftProperties.options.levelType.largeBiomes',
                                        'Large Biomes',
                                    )}
                                </option>
                                <option value='minecraft:single_biome_surface'>
                                    {tr(
                                        'files.editors.minecraftProperties.options.levelType.singleBiome',
                                        'Single Biome',
                                    )}
                                </option>
                            </Select>
                        </div>
                        <TextSetting
                            icon={Sliders}
                            label={tr(
                                'files.editors.minecraftProperties.fields.generatorSettings.label',
                                'Generator Settings',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.generatorSettings.description',
                                'Custom generator settings (JSON format)',
                            )}
                            value={localForm.generatorSettings}
                            onChange={(value) => updateForm('generatorSettings', value)}
                            readOnly={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.generateStructures.label',
                                'Generate Structures',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.generateStructures.description',
                                'Generate structures like villages and temples',
                            )}
                            checked={localForm.generateStructures}
                            onCheckedChange={(checked) => updateForm('generateStructures', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.hardcore.label', 'Hardcore Mode')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.hardcore.description',
                                'Enable hardcore mode (permanent death)',
                            )}
                            checked={localForm.hardcore}
                            onCheckedChange={(checked) => updateForm('hardcore', checked === true)}
                            disabled={readonly}
                        />
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={Package}
                        title={tr('files.editors.minecraftProperties.sections.dataPacks', 'Data Packs')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.dataPacks',
                            'Initial data pack configuration',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.initialEnabledPacks.label',
                                'Initial Enabled Packs',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.initialEnabledPacks.description',
                                'Comma-separated list of data packs enabled on world creation',
                            )}
                            value={localForm.initialEnabledPacks}
                            onChange={(value) => updateForm('initialEnabledPacks', value)}
                            readOnly={readonly}
                            placeholder='vanilla'
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.initialDisabledPacks.label',
                                'Initial Disabled Packs',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.initialDisabledPacks.description',
                                'Comma-separated list of data packs disabled on world creation',
                            )}
                            value={localForm.initialDisabledPacks}
                            onChange={(value) => updateForm('initialDisabledPacks', value)}
                            readOnly={readonly}
                        />
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={Gamepad2}
                        title={tr('files.editors.minecraftProperties.sections.gameplay', 'Gameplay Settings')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.gameplay',
                            'Gameplay and player behavior settings',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.allowFlight.label', 'Allow Flight')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.allowFlight.description',
                                'Allow players to fly',
                            )}
                            checked={localForm.allowFlight}
                            onCheckedChange={(checked) => updateForm('allowFlight', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.forceGamemode.label', 'Force Gamemode')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.forceGamemode.description',
                                'Force players to default gamemode',
                            )}
                            checked={localForm.forceGamemode}
                            onCheckedChange={(checked) => updateForm('forceGamemode', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.acceptsTransfers.label',
                                'Accepts Transfers',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.acceptsTransfers.description',
                                'Allow players to transfer to this server from another server',
                            )}
                            checked={localForm.acceptsTransfers}
                            onCheckedChange={(checked) => updateForm('acceptsTransfers', checked === true)}
                            disabled={readonly}
                        />
                        {hasKey('pvp') && (
                            <CheckboxSetting
                                label={tr('files.editors.minecraftProperties.fields.pvp.label', 'PvP')}
                                description={tr(
                                    'files.editors.minecraftProperties.fields.pvp.description',
                                    'Allow player vs player combat',
                                )}
                                checked={localForm.pvp}
                                onCheckedChange={(checked) => updateForm('pvp', checked === true)}
                                disabled={readonly}
                            />
                        )}
                        {hasKey('spawn-monsters') && (
                            <CheckboxSetting
                                label={tr(
                                    'files.editors.minecraftProperties.fields.spawnMonsters.label',
                                    'Spawn Monsters',
                                )}
                                description={tr(
                                    'files.editors.minecraftProperties.fields.spawnMonsters.description',
                                    'Allow monsters to spawn',
                                )}
                                checked={localForm.spawnMonsters}
                                onCheckedChange={(checked) => updateForm('spawnMonsters', checked === true)}
                                disabled={readonly}
                            />
                        )}
                        {hasKey('allow-nether') && (
                            <CheckboxSetting
                                label={tr('files.editors.minecraftProperties.fields.allowNether.label', 'Allow Nether')}
                                description={tr(
                                    'files.editors.minecraftProperties.fields.allowNether.description',
                                    'Allow players to travel to the Nether',
                                )}
                                checked={localForm.allowNether}
                                onCheckedChange={(checked) => updateForm('allowNether', checked === true)}
                                disabled={readonly}
                            />
                        )}
                        {hasKey('enable-command-block') && (
                            <CheckboxSetting
                                label={tr(
                                    'files.editors.minecraftProperties.fields.enableCommandBlock.label',
                                    'Enable Command Blocks',
                                )}
                                description={tr(
                                    'files.editors.minecraftProperties.fields.enableCommandBlock.description',
                                    'Enable command blocks in the world',
                                )}
                                checked={localForm.enableCommandBlock}
                                onCheckedChange={(checked) => updateForm('enableCommandBlock', checked === true)}
                                disabled={readonly}
                            />
                        )}
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={Network}
                        title={tr('files.editors.minecraftProperties.sections.network', 'Network & Security')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.network',
                            'Network and security settings',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <TextSetting
                            label={tr('files.editors.minecraftProperties.fields.serverIp.label', 'Server IP')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.serverIp.description',
                                'Bind address (leave empty for all interfaces)',
                            )}
                            value={localForm.serverIp}
                            onChange={(value) => updateForm('serverIp', value)}
                            readOnly={readonly}
                        />
                        <NumberSetting
                            label={tr('files.editors.minecraftProperties.fields.serverPort.label', 'Server Port')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.serverPort.description',
                                'Port the Minecraft server listens on',
                            )}
                            value={localForm.serverPort}
                            onChange={(value) => updateForm('serverPort', value)}
                            readOnly={readonly}
                            min={1}
                            max={65535}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.networkCompressionThreshold.label',
                                'Network Compression Threshold',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.networkCompressionThreshold.description',
                                'Packet size threshold for compression (-1 to disable)',
                            )}
                            value={localForm.networkCompressionThreshold}
                            onChange={(value) => updateForm('networkCompressionThreshold', value)}
                            readOnly={readonly}
                            min={-1}
                        />
                        <NumberSetting
                            label={tr('files.editors.minecraftProperties.fields.rateLimit.label', 'Rate Limit')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.rateLimit.description',
                                'Maximum packets per second (0 to disable)',
                            )}
                            value={localForm.rateLimit}
                            onChange={(value) => updateForm('rateLimit', value)}
                            readOnly={readonly}
                            min={0}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.playerIdleTimeout.label',
                                'Player Idle Timeout',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.playerIdleTimeout.description',
                                'Minutes before idle players are kicked (0 to disable)',
                            )}
                            value={localForm.playerIdleTimeout}
                            onChange={(value) => updateForm('playerIdleTimeout', value)}
                            readOnly={readonly}
                            min={0}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.pauseWhenEmptySeconds.label',
                                'Pause When Empty (seconds)',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.pauseWhenEmptySeconds.description',
                                'Seconds after last player leaves before pausing (-1 to disable)',
                            )}
                            value={localForm.pauseWhenEmptySeconds}
                            onChange={(value) => updateForm('pauseWhenEmptySeconds', value)}
                            readOnly={readonly}
                            min={-1}
                        />
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.onlineMode.label', 'Online Mode')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.onlineMode.description',
                                'Verify players with Mojang (set to false for cracked servers)',
                            )}
                            checked={localForm.onlineMode}
                            onCheckedChange={(checked) => updateForm('onlineMode', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.whiteList.label', 'Whitelist')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.whiteList.description',
                                'Enable whitelist to restrict access',
                            )}
                            checked={localForm.whiteList}
                            onCheckedChange={(checked) => updateForm('whiteList', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.enforceWhitelist.label',
                                'Enforce Whitelist',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.enforceWhitelist.description',
                                'Automatically kick non-whitelisted players',
                            )}
                            checked={localForm.enforceWhitelist}
                            onCheckedChange={(checked) => updateForm('enforceWhitelist', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.enforceSecureProfile.label',
                                'Enforce Secure Profile',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.enforceSecureProfile.description',
                                'Require secure profile signatures',
                            )}
                            checked={localForm.enforceSecureProfile}
                            onCheckedChange={(checked) => updateForm('enforceSecureProfile', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.hideOnlinePlayers.label',
                                'Hide Online Players',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.hideOnlinePlayers.description',
                                'Hide player count from server list',
                            )}
                            checked={localForm.hideOnlinePlayers}
                            onCheckedChange={(checked) => updateForm('hideOnlinePlayers', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.useNativeTransport.label',
                                'Use Native Transport',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.useNativeTransport.description',
                                'Use native network transport for better performance',
                            )}
                            checked={localForm.useNativeTransport}
                            onCheckedChange={(checked) => updateForm('useNativeTransport', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.enableStatus.label', 'Enable Status')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.enableStatus.description',
                                'Respond to server list ping requests',
                            )}
                            checked={localForm.enableStatus}
                            onCheckedChange={(checked) => updateForm('enableStatus', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.preventProxyConnections.label',
                                'Prevent Proxy Connections',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.preventProxyConnections.description',
                                'Block players if ISP differs from the one used to join',
                            )}
                            checked={localForm.preventProxyConnections}
                            onCheckedChange={(checked) => updateForm('preventProxyConnections', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.logIps.label', 'Log IPs')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.logIps.description',
                                'Log player IP addresses in the server log',
                            )}
                            checked={localForm.logIps}
                            onCheckedChange={(checked) => updateForm('logIps', checked === true)}
                            disabled={readonly}
                        />
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={Terminal}
                        title={tr('files.editors.minecraftProperties.sections.rconQuery', 'RCON & Query')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.rconQuery',
                            'Remote console and query protocol settings',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.enableRcon.label', 'Enable RCON')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.enableRcon.description',
                                'Enable remote console access',
                            )}
                            checked={localForm.enableRcon}
                            onCheckedChange={(checked) => updateForm('enableRcon', checked === true)}
                            disabled={readonly}
                        />
                        <NumberSetting
                            label={tr('files.editors.minecraftProperties.fields.rconPort.label', 'RCON Port')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.rconPort.description',
                                'Port used for RCON connections',
                            )}
                            value={localForm.rconPort}
                            onChange={(value) => updateForm('rconPort', value)}
                            readOnly={readonly}
                            min={1}
                            max={65535}
                        />
                        <TextSetting
                            label={tr('files.editors.minecraftProperties.fields.rconPassword.label', 'RCON Password')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.rconPassword.description',
                                'Password required for RCON access',
                            )}
                            value={localForm.rconPassword}
                            onChange={(value) => updateForm('rconPassword', value)}
                            readOnly={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.broadcastRconToOps.label',
                                'Broadcast RCON to OPs',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.broadcastRconToOps.description',
                                'Send RCON command output to online operators',
                            )}
                            checked={localForm.broadcastRconToOps}
                            onCheckedChange={(checked) => updateForm('broadcastRconToOps', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.enableQuery.label', 'Enable Query')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.enableQuery.description',
                                'Enable GameSpy4 query protocol',
                            )}
                            checked={localForm.enableQuery}
                            onCheckedChange={(checked) => updateForm('enableQuery', checked === true)}
                            disabled={readonly}
                        />
                        <NumberSetting
                            label={tr('files.editors.minecraftProperties.fields.queryPort.label', 'Query Port')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.queryPort.description',
                                'Port used for query protocol responses',
                            )}
                            value={localForm.queryPort}
                            onChange={(value) => updateForm('queryPort', value)}
                            readOnly={readonly}
                            min={1}
                            max={65535}
                        />
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={Server}
                        title={tr('files.editors.minecraftProperties.sections.managementServer', 'Management Server')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.managementServer',
                            'Built-in management API settings',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.managementServerEnabled.label',
                                'Enable Management Server',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.managementServerEnabled.description',
                                'Enable the built-in management server API',
                            )}
                            checked={localForm.managementServerEnabled}
                            onCheckedChange={(checked) => updateForm('managementServerEnabled', checked === true)}
                            disabled={readonly}
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.managementServerHost.label',
                                'Management Server Host',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.managementServerHost.description',
                                'Host address for the management server',
                            )}
                            value={localForm.managementServerHost}
                            onChange={(value) => updateForm('managementServerHost', value)}
                            readOnly={readonly}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.managementServerPort.label',
                                'Management Server Port',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.managementServerPort.description',
                                'Port for the management server (0 for automatic)',
                            )}
                            value={localForm.managementServerPort}
                            onChange={(value) => updateForm('managementServerPort', value)}
                            readOnly={readonly}
                            min={0}
                            max={65535}
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.managementServerSecret.label',
                                'Management Server Secret',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.managementServerSecret.description',
                                'Shared secret for management server authentication',
                            )}
                            value={localForm.managementServerSecret}
                            onChange={(value) => updateForm('managementServerSecret', value)}
                            readOnly={readonly}
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.managementServerAllowedOrigins.label',
                                'Allowed Origins',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.managementServerAllowedOrigins.description',
                                'Comma-separated list of allowed CORS origins',
                            )}
                            value={localForm.managementServerAllowedOrigins}
                            onChange={(value) => updateForm('managementServerAllowedOrigins', value)}
                            readOnly={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.managementServerTlsEnabled.label',
                                'Management TLS Enabled',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.managementServerTlsEnabled.description',
                                'Use TLS for management server connections',
                            )}
                            checked={localForm.managementServerTlsEnabled}
                            onCheckedChange={(checked) => updateForm('managementServerTlsEnabled', checked === true)}
                            disabled={readonly}
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.managementServerTlsKeystore.label',
                                'TLS Keystore Path',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.managementServerTlsKeystore.description',
                                'Path to the TLS keystore file',
                            )}
                            value={localForm.managementServerTlsKeystore}
                            onChange={(value) => updateForm('managementServerTlsKeystore', value)}
                            readOnly={readonly}
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.managementServerTlsKeystorePassword.label',
                                'TLS Keystore Password',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.managementServerTlsKeystorePassword.description',
                                'Password for the TLS keystore',
                            )}
                            value={localForm.managementServerTlsKeystorePassword}
                            onChange={(value) => updateForm('managementServerTlsKeystorePassword', value)}
                            readOnly={readonly}
                        />
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={Eye}
                        title={tr('files.editors.minecraftProperties.sections.performance', 'Performance Settings')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.performance',
                            'Server performance and rendering settings',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <NumberSetting
                            icon={Shield}
                            label={tr(
                                'files.editors.minecraftProperties.fields.spawnProtection.label',
                                'Spawn Protection',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.spawnProtection.description',
                                'Radius of spawn protection (0 to disable)',
                            )}
                            value={localForm.spawnProtection}
                            onChange={(value) => updateForm('spawnProtection', value)}
                            readOnly={readonly}
                            min={0}
                        />
                        <NumberSetting
                            icon={Eye}
                            label={tr('files.editors.minecraftProperties.fields.viewDistance.label', 'View Distance')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.viewDistance.description',
                                'Maximum chunk render distance (3-32)',
                            )}
                            value={localForm.viewDistance}
                            onChange={(value) => updateForm('viewDistance', value)}
                            readOnly={readonly}
                            min={3}
                            max={32}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.simulationDistance.label',
                                'Simulation Distance',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.simulationDistance.description',
                                'Maximum chunk simulation distance (3-32)',
                            )}
                            value={localForm.simulationDistance}
                            onChange={(value) => updateForm('simulationDistance', value)}
                            readOnly={readonly}
                            min={3}
                            max={32}
                        />
                        <NumberSetting
                            label={tr('files.editors.minecraftProperties.fields.maxWorldSize.label', 'Max World Size')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.maxWorldSize.description',
                                'Maximum world size in blocks',
                            )}
                            value={localForm.maxWorldSize}
                            onChange={(value) => updateForm('maxWorldSize', value)}
                            readOnly={readonly}
                            min={1}
                            max={29999984}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.maxChainedNeighborUpdates.label',
                                'Max Chained Neighbor Updates',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.maxChainedNeighborUpdates.description',
                                'Maximum chained block updates',
                            )}
                            value={localForm.maxChainedNeighborUpdates}
                            onChange={(value) => updateForm('maxChainedNeighborUpdates', value)}
                            readOnly={readonly}
                            min={0}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.entityBroadcastRangePercentage.label',
                                'Entity Broadcast Range %',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.entityBroadcastRangePercentage.description',
                                'Entity broadcast range percentage (0-500)',
                            )}
                            value={localForm.entityBroadcastRangePercentage}
                            onChange={(value) => updateForm('entityBroadcastRangePercentage', value)}
                            readOnly={readonly}
                            min={0}
                            max={500}
                        />
                        <NumberSetting
                            label={tr('files.editors.minecraftProperties.fields.maxTickTime.label', 'Max Tick Time')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.maxTickTime.description',
                                'Maximum milliseconds per tick before watchdog stops the server',
                            )}
                            value={localForm.maxTickTime}
                            onChange={(value) => updateForm('maxTickTime', value)}
                            readOnly={readonly}
                            min={0}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.statusHeartbeatInterval.label',
                                'Status Heartbeat Interval',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.statusHeartbeatInterval.description',
                                'Interval in seconds for status heartbeats (0 to disable)',
                            )}
                            value={localForm.statusHeartbeatInterval}
                            onChange={(value) => updateForm('statusHeartbeatInterval', value)}
                            readOnly={readonly}
                            min={0}
                        />
                        <div className='bg-card/30 border-border/30 space-y-3 rounded-xl border p-6'>
                            <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {tr(
                                    'files.editors.minecraftProperties.fields.regionFileCompression.label',
                                    'Region File Compression',
                                )}
                            </label>
                            <Select
                                disabled={readonly}
                                value={localForm.regionFileCompression}
                                onChange={(e) => updateForm('regionFileCompression', e.target.value)}
                            >
                                <option value='deflate'>
                                    {tr(
                                        'files.editors.minecraftProperties.options.regionFileCompression.deflate',
                                        'Deflate',
                                    )}
                                </option>
                                <option value='none'>
                                    {tr('files.editors.minecraftProperties.options.regionFileCompression.none', 'None')}
                                </option>
                                <option value='lz4'>
                                    {tr('files.editors.minecraftProperties.options.regionFileCompression.lz4', 'LZ4')}
                                </option>
                            </Select>
                        </div>
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.syncChunkWrites.label',
                                'Sync Chunk Writes',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.syncChunkWrites.description',
                                'Synchronously write chunk data to disk',
                            )}
                            checked={localForm.syncChunkWrites}
                            onCheckedChange={(checked) => updateForm('syncChunkWrites', checked === true)}
                            disabled={readonly}
                        />
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={FileArchive}
                        title={tr('files.editors.minecraftProperties.sections.resourcePack', 'Resource Pack')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.resourcePack',
                            'Resource pack configuration',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.requireResourcePack.label',
                                'Require Resource Pack',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.requireResourcePack.description',
                                'Force players to use the resource pack',
                            )}
                            checked={localForm.requireResourcePack}
                            onCheckedChange={(checked) => updateForm('requireResourcePack', checked === true)}
                            disabled={readonly}
                        />
                        <TextSetting
                            icon={FileArchive}
                            label={tr(
                                'files.editors.minecraftProperties.fields.resourcePack.label',
                                'Resource Pack URL',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.resourcePack.description',
                                'URL to the resource pack file',
                            )}
                            value={localForm.resourcePack}
                            onChange={(value) => updateForm('resourcePack', value)}
                            readOnly={readonly}
                            placeholder='https://example.com/resource-pack.zip'
                        />
                        <TextSetting
                            icon={Hash}
                            label={tr(
                                'files.editors.minecraftProperties.fields.resourcePackSha1.label',
                                'Resource Pack SHA1',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.resourcePackSha1.description',
                                'SHA1 hash of the resource pack',
                            )}
                            value={localForm.resourcePackSha1}
                            onChange={(value) => updateForm('resourcePackSha1', value)}
                            readOnly={readonly}
                        />
                        <TextSetting
                            icon={Hash}
                            label={tr(
                                'files.editors.minecraftProperties.fields.resourcePackId.label',
                                'Resource Pack ID',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.resourcePackId.description',
                                'Unique identifier for the resource pack',
                            )}
                            value={localForm.resourcePackId}
                            onChange={(value) => updateForm('resourcePackId', value)}
                            readOnly={readonly}
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.resourcePackPrompt.label',
                                'Resource Pack Prompt',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.resourcePackPrompt.description',
                                'Message shown when prompting players to download the resource pack',
                            )}
                            value={localForm.resourcePackPrompt}
                            onChange={(value) => updateForm('resourcePackPrompt', value)}
                            readOnly={readonly}
                            multiline
                        />
                    </div>
                </section>

                <section className='space-y-6'>
                    <SectionHeader
                        icon={Sliders}
                        title={tr('files.editors.minecraftProperties.sections.advanced', 'Advanced Settings')}
                        description={tr(
                            'files.editors.minecraftProperties.sectionsDescriptions.advanced',
                            'Advanced server configuration',
                        )}
                    />
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.opPermissionLevel.label',
                                'OP Permission Level',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.opPermissionLevel.description',
                                'Permission level for server operators (1-4)',
                            )}
                            value={localForm.opPermissionLevel}
                            onChange={(value) => updateForm('opPermissionLevel', value)}
                            readOnly={readonly}
                            min={1}
                            max={4}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.functionPermissionLevel.label',
                                'Function Permission Level',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.functionPermissionLevel.description',
                                'Permission level required to use functions (1-4)',
                            )}
                            value={localForm.functionPermissionLevel}
                            onChange={(value) => updateForm('functionPermissionLevel', value)}
                            readOnly={readonly}
                            min={1}
                            max={4}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.broadcastConsoleToOps.label',
                                'Broadcast Console to OPs',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.broadcastConsoleToOps.description',
                                'Send console messages to operators',
                            )}
                            checked={localForm.broadcastConsoleToOps}
                            onCheckedChange={(checked) => updateForm('broadcastConsoleToOps', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr('files.editors.minecraftProperties.fields.debug.label', 'Debug Mode')}
                            description={tr(
                                'files.editors.minecraftProperties.fields.debug.description',
                                'Enable debug logging',
                            )}
                            checked={localForm.debug}
                            onCheckedChange={(checked) => updateForm('debug', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.enableJmxMonitoring.label',
                                'Enable JMX Monitoring',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.enableJmxMonitoring.description',
                                'Expose JMX monitoring beans',
                            )}
                            checked={localForm.enableJmxMonitoring}
                            onCheckedChange={(checked) => updateForm('enableJmxMonitoring', checked === true)}
                            disabled={readonly}
                        />
                        <CheckboxSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.enableCodeOfConduct.label',
                                'Enable Code of Conduct',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.enableCodeOfConduct.description',
                                'Enable the Minecraft code of conduct system',
                            )}
                            checked={localForm.enableCodeOfConduct}
                            onCheckedChange={(checked) => updateForm('enableCodeOfConduct', checked === true)}
                            disabled={readonly}
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.bugReportLink.label',
                                'Bug Report Link',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.bugReportLink.description',
                                'URL shown to players for reporting bugs',
                            )}
                            value={localForm.bugReportLink}
                            onChange={(value) => updateForm('bugReportLink', value)}
                            readOnly={readonly}
                        />
                        <TextSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.textFilteringConfig.label',
                                'Text Filtering Config',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.textFilteringConfig.description',
                                'Path or configuration for chat text filtering',
                            )}
                            value={localForm.textFilteringConfig}
                            onChange={(value) => updateForm('textFilteringConfig', value)}
                            readOnly={readonly}
                        />
                        <NumberSetting
                            label={tr(
                                'files.editors.minecraftProperties.fields.textFilteringVersion.label',
                                'Text Filtering Version',
                            )}
                            description={tr(
                                'files.editors.minecraftProperties.fields.textFilteringVersion.description',
                                'Text filtering configuration version',
                            )}
                            value={localForm.textFilteringVersion}
                            onChange={(value) => updateForm('textFilteringVersion', value)}
                            readOnly={readonly}
                            min={0}
                        />
                        {hasKey('previews-chat') && (
                            <CheckboxSetting
                                label={tr(
                                    'files.editors.minecraftProperties.fields.previewsChat.label',
                                    'Previews Chat',
                                )}
                                description={tr(
                                    'files.editors.minecraftProperties.fields.previewsChat.description',
                                    'Enable chat message previews',
                                )}
                                checked={localForm.previewsChat}
                                onCheckedChange={(checked) => updateForm('previewsChat', checked === true)}
                                disabled={readonly}
                            />
                        )}
                    </div>
                </section>
            </div>
        </Card>
    );
}
