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
import { Activity, ArrowLeft, FileText, Gauge, Layers, Save, Settings2 } from 'lucide-react';
import yaml from 'js-yaml';

type DeprecatedVerboseMode = 'default' | 'true' | 'false';

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

interface BukkitForm {
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

interface BukkitConfigurationEditorProps {
    content: string;
    readonly?: boolean;
    saving?: boolean;
    onSave: (content: string) => void;
    onSwitchToRaw: () => void;
}

function getDefaultForm(): BukkitForm {
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

function parseBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return fallback;
}

function parseNumeric(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function parseDeprecatedVerbose(value: unknown, fallback: DeprecatedVerboseMode): DeprecatedVerboseMode {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === 'false' || normalized === 'default') {
            return normalized as DeprecatedVerboseMode;
        }
    }
    return fallback;
}

function parseBukkitConfiguration(content: string): BukkitForm {
    try {
        const parsed = yaml.load(content) as Record<string, unknown>;
        const form = getDefaultForm();

        if (parsed.settings && typeof parsed.settings === 'object') {
            const settings = parsed.settings as Record<string, unknown>;
            form.allowEnd = parseBoolean(settings['allow-end'], form.allowEnd);
            form.warnOnOverload = parseBoolean(settings['warn-on-overload'], form.warnOnOverload);
            form.permissionsFile =
                typeof settings['permissions-file'] === 'string' ? settings['permissions-file'] : form.permissionsFile;
            form.updateFolder =
                typeof settings['update-folder'] === 'string' ? settings['update-folder'] : form.updateFolder;
            form.pluginProfiling = parseBoolean(settings['plugin-profiling'], form.pluginProfiling);
            form.connectionThrottle = parseNumeric(settings['connection-throttle'], form.connectionThrottle);
            form.queryPlugins = parseBoolean(settings['query-plugins'], form.queryPlugins);
            form.deprecatedVerbose = parseDeprecatedVerbose(settings['deprecated-verbose'], form.deprecatedVerbose);
            form.shutdownMessage =
                typeof settings['shutdown-message'] === 'string' ? settings['shutdown-message'] : form.shutdownMessage;
            form.minimumApi = typeof settings['minimum-api'] === 'string' ? settings['minimum-api'] : form.minimumApi;
            form.useMapColorCache = parseBoolean(settings['use-map-color-cache'], form.useMapColorCache);
        }

        if (parsed['spawn-limits'] && typeof parsed['spawn-limits'] === 'object') {
            const spawnLimits = parsed['spawn-limits'] as Record<string, unknown>;
            form.spawnLimits.monsters = parseNumeric(spawnLimits.monsters, form.spawnLimits.monsters);
            form.spawnLimits.animals = parseNumeric(spawnLimits.animals, form.spawnLimits.animals);
            form.spawnLimits.waterAnimals = parseNumeric(spawnLimits['water-animals'], form.spawnLimits.waterAnimals);
            form.spawnLimits.waterAmbient = parseNumeric(spawnLimits['water-ambient'], form.spawnLimits.waterAmbient);
            form.spawnLimits.waterUndergroundCreature = parseNumeric(
                spawnLimits['water-underground-creature'],
                form.spawnLimits.waterUndergroundCreature,
            );
            form.spawnLimits.axolotls = parseNumeric(spawnLimits.axolotls, form.spawnLimits.axolotls);
            form.spawnLimits.ambient = parseNumeric(spawnLimits.ambient, form.spawnLimits.ambient);
        }

        if (parsed['chunk-gc'] && typeof parsed['chunk-gc'] === 'object') {
            const chunkGc = parsed['chunk-gc'] as Record<string, unknown>;
            form.chunkGcPeriodInTicks = parseNumeric(chunkGc['period-in-ticks'], form.chunkGcPeriodInTicks);
        }

        if (parsed['ticks-per'] && typeof parsed['ticks-per'] === 'object') {
            const ticksPer = parsed['ticks-per'] as Record<string, unknown>;
            form.ticksPer.animalSpawns = parseNumeric(ticksPer['animal-spawns'], form.ticksPer.animalSpawns);
            form.ticksPer.monsterSpawns = parseNumeric(ticksPer['monster-spawns'], form.ticksPer.monsterSpawns);
            form.ticksPer.waterSpawns = parseNumeric(ticksPer['water-spawns'], form.ticksPer.waterSpawns);
            form.ticksPer.waterAmbientSpawns = parseNumeric(
                ticksPer['water-ambient-spawns'],
                form.ticksPer.waterAmbientSpawns,
            );
            form.ticksPer.waterUndergroundCreatureSpawns = parseNumeric(
                ticksPer['water-underground-creature-spawns'],
                form.ticksPer.waterUndergroundCreatureSpawns,
            );
            form.ticksPer.axolotlSpawns = parseNumeric(ticksPer['axolotl-spawns'], form.ticksPer.axolotlSpawns);
            form.ticksPer.ambientSpawns = parseNumeric(ticksPer['ambient-spawns'], form.ticksPer.ambientSpawns);
            form.ticksPer.autosave = parseNumeric(ticksPer.autosave, form.ticksPer.autosave);
        }

        if (typeof parsed.aliases === 'string') {
            form.aliases = parsed.aliases;
        }

        return form;
    } catch (error) {
        console.warn('Failed to parse bukkit.yml:', error);
        return getDefaultForm();
    }
}

function applyFormToConfig(config: Record<string, unknown>, form: BukkitForm): Record<string, unknown> {
    const result = (yaml.load(yaml.dump(config || {})) as Record<string, unknown>) || {};

    result.settings = {
        'allow-end': form.allowEnd,
        'warn-on-overload': form.warnOnOverload,
        'permissions-file': form.permissionsFile,
        'update-folder': form.updateFolder,
        'plugin-profiling': form.pluginProfiling,
        'connection-throttle': form.connectionThrottle,
        'query-plugins': form.queryPlugins,
        'deprecated-verbose': form.deprecatedVerbose,
        'shutdown-message': form.shutdownMessage,
        'minimum-api': form.minimumApi,
        'use-map-color-cache': form.useMapColorCache,
    };

    result['spawn-limits'] = {
        monsters: form.spawnLimits.monsters,
        animals: form.spawnLimits.animals,
        'water-animals': form.spawnLimits.waterAnimals,
        'water-ambient': form.spawnLimits.waterAmbient,
        'water-underground-creature': form.spawnLimits.waterUndergroundCreature,
        axolotls: form.spawnLimits.axolotls,
        ambient: form.spawnLimits.ambient,
    };

    result['chunk-gc'] = {
        'period-in-ticks': form.chunkGcPeriodInTicks,
    };

    result['ticks-per'] = {
        'animal-spawns': form.ticksPer.animalSpawns,
        'monster-spawns': form.ticksPer.monsterSpawns,
        'water-spawns': form.ticksPer.waterSpawns,
        'water-ambient-spawns': form.ticksPer.waterAmbientSpawns,
        'water-underground-creature-spawns': form.ticksPer.waterUndergroundCreatureSpawns,
        'axolotl-spawns': form.ticksPer.axolotlSpawns,
        'ambient-spawns': form.ticksPer.ambientSpawns,
        autosave: form.ticksPer.autosave,
    };

    result.aliases = form.aliases;

    return result;
}

export function BukkitConfigurationEditor({
    content,
    readonly = false,
    saving = false,
    onSave,
    onSwitchToRaw,
}: BukkitConfigurationEditorProps) {
    const { t } = useTranslation();

    const form = useMemo(() => {
        const config = parseBukkitConfiguration(content);
        return config;
    }, [content]);

    const [localForm, setLocalForm] = useState<BukkitForm>(form);

    useEffect(() => {
        setLocalForm(form);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    const handleSave = () => {
        try {
            const config = (yaml.load(content) as Record<string, unknown>) || {};
            const updated = applyFormToConfig(config, localForm);
            const yamlOutput = yaml.dump(updated, { lineWidth: 0 });
            onSave(yamlOutput);
        } catch (error) {
            console.error('Failed to save bukkit.yml:', error);

            const newConfig: Record<string, unknown> = {};
            applyFormToConfig(newConfig, localForm);
            const yamlOutput = yaml.dump(newConfig, { lineWidth: 0 });
            onSave(yamlOutput);
        }
    };

    const updateForm = (path: string[], value: unknown) => {
        setLocalForm((prev) => {
            const newForm = { ...prev };
            let current: Record<string, unknown> = newForm;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]] as Record<string, unknown>;
            }
            current[path[path.length - 1]] = value;
            return newForm as BukkitForm;
        });
    };

    return (
        <Card className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl shadow-sm'>
            <CardHeader className='border-b border-border/10 pb-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                        <CardTitle className='text-2xl font-bold'>{t('files.editors.bukkitConfig.title')}</CardTitle>
                        <CardDescription className='text-sm text-muted-foreground'>
                            {t('files.editors.bukkitConfig.description')}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('files.editors.bukkitConfig.actions.switchToRaw')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='mr-2 h-4 w-4' />
                            {saving
                                ? t('files.editors.bukkitConfig.actions.saving')
                                : t('files.editors.bukkitConfig.actions.save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='p-8 space-y-10'>
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Settings2 className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.bukkitConfig.sections.settings')}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.bukkitConfig.sectionsDescriptions.settings')}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bukkitConfig.fields.allowEnd.label')}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.bukkitConfig.fields.allowEnd.description')}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.allowEnd}
                                    onCheckedChange={(checked) => updateForm(['allowEnd'], checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bukkitConfig.fields.warnOnOverload.label')}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.bukkitConfig.fields.warnOnOverload.description')}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.warnOnOverload}
                                    onCheckedChange={(checked) => updateForm(['warnOnOverload'], checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='space-y-2'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.bukkitConfig.fields.permissionsFile.label')}
                                </label>
                                <Input
                                    type='text'
                                    value={localForm.permissionsFile}
                                    onChange={(e) => updateForm(['permissionsFile'], e.target.value)}
                                    readOnly={readonly}
                                    placeholder={t('files.editors.bukkitConfig.fields.permissionsFile.placeholder')}
                                />
                                <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                    {t('files.editors.bukkitConfig.fields.permissionsFile.description')}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='space-y-2'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.bukkitConfig.fields.updateFolder.label')}
                                </label>
                                <Input
                                    type='text'
                                    value={localForm.updateFolder}
                                    onChange={(e) => updateForm(['updateFolder'], e.target.value)}
                                    readOnly={readonly}
                                    placeholder={t('files.editors.bukkitConfig.fields.updateFolder.placeholder')}
                                />
                                <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                    {t('files.editors.bukkitConfig.fields.updateFolder.description')}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bukkitConfig.fields.pluginProfiling.label')}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.bukkitConfig.fields.pluginProfiling.description')}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.pluginProfiling}
                                    onCheckedChange={(checked) => updateForm(['pluginProfiling'], checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='space-y-2'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.bukkitConfig.fields.connectionThrottle.label')}
                                </label>
                                <Input
                                    type='number'
                                    value={localForm.connectionThrottle}
                                    onChange={(e) =>
                                        updateForm(['connectionThrottle'], Number.parseInt(e.target.value, 10) || 0)
                                    }
                                    readOnly={readonly}
                                    min={-1}
                                />
                                <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                    {t('files.editors.bukkitConfig.fields.connectionThrottle.description')}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bukkitConfig.fields.queryPlugins.label')}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.bukkitConfig.fields.queryPlugins.description')}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.queryPlugins}
                                    onCheckedChange={(checked) => updateForm(['queryPlugins'], checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='space-y-2'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.bukkitConfig.fields.deprecatedVerbose.label')}
                                </label>
                                <Select
                                    value={localForm.deprecatedVerbose}
                                    onChange={(e) =>
                                        updateForm(['deprecatedVerbose'], e.target.value as DeprecatedVerboseMode)
                                    }
                                    disabled={readonly}
                                >
                                    <option value='default'>
                                        {t('files.editors.bukkitConfig.options.deprecatedVerbose.default')}
                                    </option>
                                    <option value='true'>
                                        {t('files.editors.bukkitConfig.options.deprecatedVerbose.true')}
                                    </option>
                                    <option value='false'>
                                        {t('files.editors.bukkitConfig.options.deprecatedVerbose.false')}
                                    </option>
                                </Select>
                                <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                    {t('files.editors.bukkitConfig.fields.deprecatedVerbose.description')}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all xl:col-span-2'>
                            <div className='space-y-2'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.bukkitConfig.fields.shutdownMessage.label')}
                                </label>
                                <Textarea
                                    value={localForm.shutdownMessage}
                                    onChange={(e) => updateForm(['shutdownMessage'], e.target.value)}
                                    readOnly={readonly}
                                    rows={2}
                                />
                                <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                    {t('files.editors.bukkitConfig.fields.shutdownMessage.description')}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <div className='space-y-3'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.bukkitConfig.fields.minimumApi.label')}
                                </label>
                                <Input
                                    type='text'
                                    value={localForm.minimumApi}
                                    onChange={(e) => updateForm(['minimumApi'], e.target.value)}
                                    readOnly={readonly}
                                    placeholder={t('files.editors.bukkitConfig.fields.minimumApi.placeholder')}
                                />
                                <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                    {t('files.editors.bukkitConfig.fields.minimumApi.description')}
                                </p>
                            </div>
                        </div>

                        <div className='space-y-3 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bukkitConfig.fields.useMapColorCache.label')}
                                    </label>
                                    <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                        {t('files.editors.bukkitConfig.fields.useMapColorCache.description')}
                                    </p>
                                </div>
                                <Checkbox
                                    checked={localForm.useMapColorCache}
                                    onCheckedChange={(checked) => updateForm(['useMapColorCache'], checked)}
                                    disabled={readonly}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className='space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                            <Activity className='h-5 w-5' />
                        </div>
                        <div>
                            <h3 className='text-lg font-semibold'>
                                {t('files.editors.bukkitConfig.sections.spawnLimits')}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                {t('files.editors.bukkitConfig.sectionsDescriptions.spawnLimits')}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.monsters.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.spawnLimits.monsters}
                                onChange={(e) =>
                                    updateForm(['spawnLimits', 'monsters'], Number.parseInt(e.target.value, 10) || 0)
                                }
                                min={0}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.monsters.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.animals.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.spawnLimits.animals}
                                onChange={(e) =>
                                    updateForm(['spawnLimits', 'animals'], Number.parseInt(e.target.value, 10) || 0)
                                }
                                min={0}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.animals.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.waterAnimals.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.spawnLimits.waterAnimals}
                                onChange={(e) =>
                                    updateForm(
                                        ['spawnLimits', 'waterAnimals'],
                                        Number.parseInt(e.target.value, 10) || 0,
                                    )
                                }
                                min={0}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.waterAnimals.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.waterAmbient.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.spawnLimits.waterAmbient}
                                onChange={(e) =>
                                    updateForm(
                                        ['spawnLimits', 'waterAmbient'],
                                        Number.parseInt(e.target.value, 10) || 0,
                                    )
                                }
                                min={0}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.waterAmbient.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.waterUndergroundCreature.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.spawnLimits.waterUndergroundCreature}
                                onChange={(e) =>
                                    updateForm(
                                        ['spawnLimits', 'waterUndergroundCreature'],
                                        Number.parseInt(e.target.value, 10) || 0,
                                    )
                                }
                                min={0}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t(
                                    'files.editors.bukkitConfig.fields.spawnLimits.waterUndergroundCreature.description',
                                )}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.axolotls.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.spawnLimits.axolotls}
                                onChange={(e) =>
                                    updateForm(['spawnLimits', 'axolotls'], Number.parseInt(e.target.value, 10) || 0)
                                }
                                min={0}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.axolotls.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.ambient.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.spawnLimits.ambient}
                                onChange={(e) =>
                                    updateForm(['spawnLimits', 'ambient'], Number.parseInt(e.target.value, 10) || 0)
                                }
                                min={0}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.spawnLimits.ambient.description')}
                            </p>
                        </div>
                    </div>
                </section>

                <section className='space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                            <Gauge className='h-5 w-5' />
                        </div>
                        <div>
                            <h3 className='text-lg font-semibold'>
                                {t('files.editors.bukkitConfig.sections.ticksPer')}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                {t('files.editors.bukkitConfig.sectionsDescriptions.ticksPer')}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.animalSpawns.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.ticksPer.animalSpawns}
                                onChange={(e) =>
                                    updateForm(['ticksPer', 'animalSpawns'], Number.parseInt(e.target.value, 10) || 1)
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.animalSpawns.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.monsterSpawns.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.ticksPer.monsterSpawns}
                                onChange={(e) =>
                                    updateForm(['ticksPer', 'monsterSpawns'], Number.parseInt(e.target.value, 10) || 1)
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.monsterSpawns.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.waterSpawns.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.ticksPer.waterSpawns}
                                onChange={(e) =>
                                    updateForm(['ticksPer', 'waterSpawns'], Number.parseInt(e.target.value, 10) || 1)
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.waterSpawns.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.waterAmbientSpawns.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.ticksPer.waterAmbientSpawns}
                                onChange={(e) =>
                                    updateForm(
                                        ['ticksPer', 'waterAmbientSpawns'],
                                        Number.parseInt(e.target.value, 10) || 1,
                                    )
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.waterAmbientSpawns.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.waterUndergroundCreatureSpawns.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.ticksPer.waterUndergroundCreatureSpawns}
                                onChange={(e) =>
                                    updateForm(
                                        ['ticksPer', 'waterUndergroundCreatureSpawns'],
                                        Number.parseInt(e.target.value, 10) || 1,
                                    )
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t(
                                    'files.editors.bukkitConfig.fields.ticksPer.waterUndergroundCreatureSpawns.description',
                                )}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.axolotlSpawns.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.ticksPer.axolotlSpawns}
                                onChange={(e) =>
                                    updateForm(['ticksPer', 'axolotlSpawns'], Number.parseInt(e.target.value, 10) || 1)
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.axolotlSpawns.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.ambientSpawns.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.ticksPer.ambientSpawns}
                                onChange={(e) =>
                                    updateForm(['ticksPer', 'ambientSpawns'], Number.parseInt(e.target.value, 10) || 1)
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.ambientSpawns.description')}
                            </p>
                        </div>

                        <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.autosave.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.ticksPer.autosave}
                                onChange={(e) =>
                                    updateForm(['ticksPer', 'autosave'], Number.parseInt(e.target.value, 10) || 1)
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.ticksPer.autosave.description')}
                            </p>
                        </div>
                    </div>
                </section>

                <section className='space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                            <Layers className='h-5 w-5' />
                        </div>
                        <div>
                            <h3 className='text-lg font-semibold'>
                                {t('files.editors.bukkitConfig.sections.chunkGc')}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                {t('files.editors.bukkitConfig.sectionsDescriptions.chunkGc')}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='space-y-2 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                            <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                {t('files.editors.bukkitConfig.fields.chunkGc.periodInTicks.label')}
                            </label>
                            <Input
                                type='number'
                                value={localForm.chunkGcPeriodInTicks}
                                onChange={(e) =>
                                    updateForm(['chunkGcPeriodInTicks'], Number.parseInt(e.target.value, 10) || 1)
                                }
                                min={1}
                                readOnly={readonly}
                            />
                            <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                {t('files.editors.bukkitConfig.fields.chunkGc.periodInTicks.description')}
                            </p>
                        </div>
                    </div>
                </section>

                <section className='space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                            <FileText className='h-5 w-5' />
                        </div>
                        <div>
                            <h3 className='text-lg font-semibold'>
                                {t('files.editors.bukkitConfig.sections.aliases')}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                {t('files.editors.bukkitConfig.sectionsDescriptions.aliases')}
                            </p>
                        </div>
                    </div>
                    <div className='space-y-2 rounded-xl bg-muted/10 border border-border/20 p-5 hover:border-border/40 transition-all'>
                        <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                            {t('files.editors.bukkitConfig.fields.aliases.label')}
                        </label>
                        <Input
                            type='text'
                            value={localForm.aliases}
                            onChange={(e) => updateForm(['aliases'], e.target.value)}
                            readOnly={readonly}
                            placeholder={t('files.editors.bukkitConfig.fields.aliases.placeholder')}
                        />
                        <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                            {t('files.editors.bukkitConfig.fields.aliases.description')}
                        </p>
                    </div>
                </section>
            </div>
        </Card>
    );
}
