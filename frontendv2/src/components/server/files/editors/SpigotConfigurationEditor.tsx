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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, MessageSquare, Settings2 } from 'lucide-react';
import yaml from 'js-yaml';

type Primitive = string | number | boolean | null;

interface SpigotYaml {
    settings?: Record<string, unknown>;
    messages?: Record<string, Primitive>;
    advancements?: Record<string, unknown>;
    'world-settings'?: Record<string, unknown>;
    players?: Record<string, unknown>;
    stats?: Record<string, unknown>;
    commands?: Record<string, unknown>;
    [key: string]: unknown;
}

interface SpigotConfigurationEditorProps {
    content: string;
    readonly?: boolean;
    saving?: boolean;
    onSave: (content: string) => void;
    onSwitchToRaw: () => void;
}

function parseSpigotConfiguration(content: string): SpigotYaml {
    try {
        const parsed = yaml.load(content) as SpigotYaml;
        if (parsed && typeof parsed === 'object') {
            return parsed;
        }
    } catch (error) {
        console.warn('Failed to parse spigot.yml:', error);
    }
    return {};
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
    }
    return fallback;
}

function toNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const numeric = Number.parseFloat(String(value));
    if (!Number.isNaN(numeric)) return numeric;
    return fallback;
}

function toString(value: unknown, fallback: string): string {
    if (value === undefined || value === null) return fallback;
    return String(value);
}

// Simplified form interface - we'll expand as needed
interface SpigotForm {
    settings: {
        bungeecord: boolean;
        saveUserCacheOnStopOnly: boolean;
        sampleCount: number;
        playerShuffle: number;
        userCacheSize: number;
        movedWronglyThreshold: number;
        movedTooQuicklyMultiplier: number;
        timeoutTime: number;
        restartOnCrash: boolean;
        restartScript: string;
        nettyThreads: number;
        logVillagerDeaths: boolean;
        logNamedDeaths: boolean;
        debug: boolean;
        attribute: {
            maxAbsorption: number;
            maxHealth: number;
            movementSpeed: number;
            attackDamage: number;
        };
    };
    messages: {
        whitelist: string;
        unknownCommand: string;
        serverFull: string;
        outdatedClient: string;
        outdatedServer: string;
        restart: string;
    };
    [key: string]: unknown;
}

function createForm(config: SpigotYaml): SpigotForm {
    const settings = (config.settings ?? {}) as Record<string, unknown>;
    const attribute = (settings.attribute ?? {}) as Record<string, unknown>;
    const messages = (config.messages ?? {}) as Record<string, Primitive>;

    return {
        settings: {
            bungeecord: toBoolean(settings.bungeecord, false),
            saveUserCacheOnStopOnly: toBoolean(settings['save-user-cache-on-stop-only'], false),
            sampleCount: toNumber(settings['sample-count'], 12),
            playerShuffle: toNumber(settings['player-shuffle'], 0),
            userCacheSize: toNumber(settings['user-cache-size'], 1000),
            movedWronglyThreshold: toNumber(settings['moved-wrongly-threshold'], 0.0625),
            movedTooQuicklyMultiplier: toNumber(settings['moved-too-quickly-multiplier'], 10),
            timeoutTime: toNumber(settings['timeout-time'], 60),
            restartOnCrash: toBoolean(settings['restart-on-crash'], true),
            restartScript: toString(settings['restart-script'], './start.sh'),
            nettyThreads: toNumber(settings['netty-threads'], 4),
            logVillagerDeaths: toBoolean(settings['log-villager-deaths'], true),
            logNamedDeaths: toBoolean(settings['log-named-deaths'], true),
            debug: toBoolean(settings.debug, false),
            attribute: {
                maxAbsorption: toNumber((attribute.maxAbsorption as Record<string, unknown>)?.max, 2048),
                maxHealth: toNumber((attribute.maxHealth as Record<string, unknown>)?.max, 1024),
                movementSpeed: toNumber((attribute.movementSpeed as Record<string, unknown>)?.max, 1024),
                attackDamage: toNumber((attribute.attackDamage as Record<string, unknown>)?.max, 2048),
            },
        },
        messages: {
            whitelist: toString(messages.whitelist, 'You are not whitelisted on this server!'),
            unknownCommand: toString(messages['unknown-command'], 'Unknown command. Type "/help" for help.'),
            serverFull: toString(messages['server-full'], 'The server is full!'),
            outdatedClient: toString(messages['outdated-client'], 'Outdated client! Please use {0}'),
            outdatedServer: toString(messages['outdated-server'], "Outdated server! I'm still on {0}"),
            restart: toString(messages.restart, 'Server is restarting'),
        },
    };
}

function applyFormToConfig(config: SpigotYaml, formState: SpigotForm): SpigotYaml {
    const result = yaml.load(yaml.dump(config)) as SpigotYaml;

    result.settings = result.settings ?? {};
    const settings = result.settings as Record<string, unknown>;
    settings.bungeecord = formState.settings.bungeecord;
    settings['save-user-cache-on-stop-only'] = formState.settings.saveUserCacheOnStopOnly;
    settings['sample-count'] = formState.settings.sampleCount;
    settings['player-shuffle'] = formState.settings.playerShuffle;
    settings['user-cache-size'] = formState.settings.userCacheSize;
    settings['moved-wrongly-threshold'] = formState.settings.movedWronglyThreshold;
    settings['moved-too-quickly-multiplier'] = formState.settings.movedTooQuicklyMultiplier;
    settings['timeout-time'] = formState.settings.timeoutTime;
    settings['restart-on-crash'] = formState.settings.restartOnCrash;
    settings['restart-script'] = formState.settings.restartScript;
    settings['netty-threads'] = formState.settings.nettyThreads;
    settings['log-villager-deaths'] = formState.settings.logVillagerDeaths;
    settings['log-named-deaths'] = formState.settings.logNamedDeaths;
    settings.debug = formState.settings.debug;
    settings.attribute = settings.attribute ?? {};
    const attribute = settings.attribute as Record<string, unknown>;
    attribute.maxAbsorption = { max: formState.settings.attribute.maxAbsorption };
    attribute.maxHealth = { max: formState.settings.attribute.maxHealth };
    attribute.movementSpeed = { max: formState.settings.attribute.movementSpeed };
    attribute.attackDamage = { max: formState.settings.attribute.attackDamage };

    result.messages = result.messages ?? {};
    const messages = result.messages as Record<string, Primitive>;
    messages.whitelist = formState.messages.whitelist;
    messages['unknown-command'] = formState.messages.unknownCommand;
    messages['server-full'] = formState.messages.serverFull;
    messages['outdated-client'] = formState.messages.outdatedClient;
    messages['outdated-server'] = formState.messages.outdatedServer;
    messages.restart = formState.messages.restart;

    return result;
}

export function SpigotConfigurationEditor({
    content,
    readonly = false,
    saving = false,
    onSave,
    onSwitchToRaw,
}: SpigotConfigurationEditorProps) {
    const { t } = useTranslation();

    // Derive form from content using useMemo - this recomputes when content changes
    const form = useMemo(() => {
        const config = parseSpigotConfiguration(content);
        return createForm(config);
    }, [content]);

    // Use local state for user edits, initialized from the derived form
    const [localForm, setLocalForm] = useState<SpigotForm>(form);

    // Sync local form when the derived form changes (content prop changed)
    useEffect(() => {
        setLocalForm(form);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]); // Only depend on content, not form, to avoid unnecessary updates

    const handleSave = () => {
        const config = parseSpigotConfiguration(content);
        const updated = applyFormToConfig(config, localForm);
        const yamlOutput = yaml.dump(updated, { lineWidth: 0 });
        onSave(yamlOutput);
    };

    const updateForm = (path: string[], value: unknown) => {
        setLocalForm((prev) => {
            const newForm = { ...prev };
            let current: Record<string, unknown> = newForm;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]] as Record<string, unknown>;
            }
            current[path[path.length - 1]] = value;
            return newForm;
        });
    };

    return (
        <Card className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl shadow-sm'>
            <CardHeader className='border-b border-border/10 pb-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                        <CardTitle className='text-2xl font-bold'>{t('files.editors.spigotConfig.title')}</CardTitle>
                        <CardDescription className='text-sm text-muted-foreground'>
                            {t('files.editors.spigotConfig.description') ||
                                'Configure your Spigot server settings visually'}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('files.editors.spigotConfig.actions.switchToRaw')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='mr-2 h-4 w-4' />
                            {saving
                                ? t('files.editors.spigotConfig.actions.saving')
                                : t('files.editors.spigotConfig.actions.save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='space-y-10 p-6'>
                {/* Settings Section */}
                <section className='space-y-4'>
                    <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                            <Settings2 className='h-5 w-5' />
                        </div>
                        <div>
                            <h3 className='text-lg font-semibold'>
                                {t('files.editors.spigotConfig.sections.settings')}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                                {t('files.editors.spigotConfig.sectionsDescriptions.settings') ||
                                    'General server settings and configuration'}
                            </p>
                        </div>
                    </div>

                    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                        {[
                            { key: 'bungeecord', label: 'Enable BungeeCord support' },
                            { key: 'saveUserCacheOnStopOnly', label: 'Save user cache on stop only' },
                            { key: 'restartOnCrash', label: 'Restart on crash' },
                            { key: 'logVillagerDeaths', label: 'Log villager deaths' },
                            { key: 'logNamedDeaths', label: 'Log named entity deaths' },
                            { key: 'debug', label: 'Enable debug logging' },
                        ].map((field) => (
                            <div key={field.key} className='space-y-3 rounded-lg bg-muted/20 p-4 border-0'>
                                <div className='flex items-start justify-between gap-4'>
                                    <div className='space-y-1'>
                                        <Label className='text-sm font-semibold'>{field.label}</Label>
                                    </div>
                                    <Checkbox
                                        checked={
                                            localForm.settings[field.key as keyof typeof localForm.settings] as boolean
                                        }
                                        onCheckedChange={(checked) => updateForm(['settings', field.key], checked)}
                                        disabled={readonly}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                        {[
                            { key: 'sampleCount', label: 'Sample count', step: 1 },
                            { key: 'playerShuffle', label: 'Player shuffle interval', step: 1 },
                            { key: 'userCacheSize', label: 'User cache size', step: 1 },
                            { key: 'movedWronglyThreshold', label: 'Moved wrongly threshold', step: 0.0001 },
                            { key: 'movedTooQuicklyMultiplier', label: 'Moved too quickly multiplier', step: 0.1 },
                            { key: 'timeoutTime', label: 'Timeout time', step: 1 },
                            { key: 'nettyThreads', label: 'Netty threads', step: 1 },
                        ].map((field) => (
                            <div key={field.key} className='space-y-2 rounded-lg bg-muted/20 p-4 border-0'>
                                <Label className='text-sm font-semibold'>{field.label}</Label>
                                <Input
                                    type='number'
                                    value={localForm.settings[field.key as keyof typeof localForm.settings] as number}
                                    onChange={(e) =>
                                        updateForm(['settings', field.key], Number.parseFloat(e.target.value) || 0)
                                    }
                                    readOnly={readonly}
                                    step={field.step}
                                />
                            </div>
                        ))}
                    </div>

                    <div className='space-y-6 rounded-xl bg-card/30 border border-border/30 p-6'>
                        <h4 className='text-lg font-black uppercase tracking-tight'>
                            {t('files.editors.spigotConfig.sections.attributeLimits')}
                        </h4>
                        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            {[
                                { key: 'maxAbsorption', label: 'Max absorption', step: 1 },
                                { key: 'maxHealth', label: 'Max health', step: 1 },
                                { key: 'movementSpeed', label: 'Max movement speed', step: 0.1 },
                                { key: 'attackDamage', label: 'Max attack damage', step: 1 },
                            ].map((field) => (
                                <div key={field.key} className='space-y-3'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {field.label}
                                    </label>
                                    <Input
                                        type='number'
                                        value={
                                            localForm.settings.attribute[
                                                field.key as keyof typeof localForm.settings.attribute
                                            ]
                                        }
                                        onChange={(e) =>
                                            updateForm(
                                                ['settings', 'attribute', field.key],
                                                Number.parseFloat(e.target.value) || 0,
                                            )
                                        }
                                        readOnly={readonly}
                                        step={field.step}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Messages Section */}
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <MessageSquare className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.spigotConfig.sections.messages')}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.spigotConfig.sectionsDescriptions.messages') ||
                                    'Customize server messages'}
                            </p>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                        {[
                            { key: 'whitelist', label: 'Whitelist message' },
                            { key: 'unknownCommand', label: 'Unknown command message' },
                            { key: 'serverFull', label: 'Server full message' },
                            { key: 'outdatedClient', label: 'Outdated client message' },
                            { key: 'outdatedServer', label: 'Outdated server message' },
                            { key: 'restart', label: 'Restart message' },
                        ].map((field) => (
                            <div key={field.key} className='space-y-3'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {field.label}
                                </label>
                                <Textarea
                                    value={localForm.messages[field.key as keyof typeof localForm.messages] as string}
                                    onChange={(e) => updateForm(['messages', field.key], e.target.value)}
                                    readOnly={readonly}
                                    rows={2}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Card>
    );
}
