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
import { ArrowLeft, ListChecks, Plus, Save, Trash2 } from 'lucide-react';
import yaml from 'js-yaml';

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

interface CommandsEditorProps {
    content: string;
    readonly?: boolean;
    saving?: boolean;
    onSave: (content: string) => void;
    onSwitchToRaw: () => void;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return fallback;
}

function splitLines(text: string): string[] {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

function parseCommandsConfiguration(content: string): CommandsYaml {
    try {
        const parsed = yaml.load(content) as CommandsYaml;
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

function applyFormToConfig(config: CommandsYaml, formState: CommandsForm): CommandsYaml {
    const result = (yaml.load(yaml.dump(config || {})) as CommandsYaml) || {};

    result['command-block-overrides'] = splitLines(formState.overridesText);
    result['ignore-vanilla-permissions'] = formState.ignoreVanillaPermissions;

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
    result.aliases = aliasMap;

    return result;
}

export function CommandsEditor({
    content,
    readonly = false,
    saving = false,
    onSave,
    onSwitchToRaw,
}: CommandsEditorProps) {
    const { t } = useTranslation();

    // Derive form from content using useMemo
    const form = useMemo(() => {
        const config = parseCommandsConfiguration(content);
        return createForm(config);
    }, [content]);

    // Use local state for user edits, initialized from the derived form
    const [localForm, setLocalForm] = useState<CommandsForm>(form);

    // Sync local form when the derived form changes (content prop changed)
    useEffect(() => {
        setLocalForm(form);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    const handleSave = () => {
        try {
            const config = parseCommandsConfiguration(content);
            const updated = applyFormToConfig(config, localForm);
            const yamlOutput = yaml.dump(updated, { lineWidth: 0 });
            onSave(yamlOutput);
        } catch (error) {
            console.error('Failed to save commands.yml:', error);
            // Fallback: create new config from form
            const newConfig: CommandsYaml = {};
            const updated = applyFormToConfig(newConfig, localForm);
            const yamlOutput = yaml.dump(updated, { lineWidth: 0 });
            onSave(yamlOutput);
        }
    };

    const handleAddAlias = () => {
        setLocalForm((prev) => ({
            ...prev,
            aliases: [...prev.aliases, { name: '', commandsText: '' }],
        }));
    };

    const handleRemoveAlias = (index: number) => {
        setLocalForm((prev) => ({
            ...prev,
            aliases: prev.aliases.filter((_, i) => i !== index),
        }));
    };

    const updateForm = (field: keyof CommandsForm, value: unknown) => {
        setLocalForm((prev) => ({ ...prev, [field]: value }));
    };

    const updateAlias = (index: number, field: keyof AliasEntry, value: string) => {
        setLocalForm((prev) => {
            const updated = { ...prev };
            updated.aliases = [...updated.aliases];
            updated.aliases[index] = { ...updated.aliases[index], [field]: value };
            return updated;
        });
    };

    return (
        <Card className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl shadow-sm'>
            <CardHeader className='border-b border-border/10 pb-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                        <CardTitle className='text-2xl font-bold'>{t('files.editors.commandsConfig.title')}</CardTitle>
                        <CardDescription className='text-sm text-muted-foreground'>
                            {t('files.editors.commandsConfig.description')}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('files.editors.commandsConfig.actions.switchToRaw')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='mr-2 h-4 w-4' />
                            {saving
                                ? t('files.editors.commandsConfig.actions.saving')
                                : t('files.editors.commandsConfig.actions.save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='p-8 space-y-10'>
                <section className='space-y-6'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <ListChecks className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('files.editors.commandsConfig.sections.general')}
                            </h3>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                {t('files.editors.commandsConfig.sectionsDescriptions.general')}
                            </p>
                        </div>
                    </div>

                    <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                        <div className='flex items-start justify-between gap-4'>
                            <div className='space-y-1'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.commandsConfig.fields.ignoreVanillaPermissions.label')}
                                </label>
                                <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                    {t('files.editors.commandsConfig.fields.ignoreVanillaPermissions.description')}
                                </p>
                            </div>
                            <Checkbox
                                checked={localForm.ignoreVanillaPermissions}
                                onCheckedChange={(checked) => updateForm('ignoreVanillaPermissions', checked)}
                                disabled={readonly}
                            />
                        </div>
                    </div>

                    <div className='space-y-3 rounded-xl bg-card/30 border border-border/30 p-6'>
                        <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                            {t('files.editors.commandsConfig.fields.commandBlockOverrides.label')}
                        </label>
                        <Textarea
                            value={localForm.overridesText}
                            onChange={(e) => updateForm('overridesText', e.target.value)}
                            readOnly={readonly}
                            rows={4}
                        />
                        <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                            {t('files.editors.commandsConfig.fields.commandBlockOverrides.description')}
                        </p>
                    </div>
                </section>

                <section className='space-y-6'>
                    <div className='flex items-center justify-between border-b border-border/10 pb-6'>
                        <div className='flex items-center gap-4'>
                            <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                                <ListChecks className='h-5 w-5 text-primary' />
                            </div>
                            <div className='space-y-0.5'>
                                <h3 className='text-xl font-black uppercase tracking-tight italic'>
                                    {t('files.editors.commandsConfig.sections.aliases')}
                                </h3>
                                <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                    {t('files.editors.commandsConfig.sectionsDescriptions.aliases')}
                                </p>
                            </div>
                        </div>
                        <Button
                            size='sm'
                            variant='outline'
                            className='gap-2'
                            disabled={readonly}
                            onClick={handleAddAlias}
                        >
                            <Plus className='h-4 w-4' />
                            {t('files.editors.commandsConfig.fields.aliases.addAlias')}
                        </Button>
                    </div>

                    {localForm.aliases.length === 0 && (
                        <div className='rounded-xl border border-dashed border-border/30 p-8 text-sm text-muted-foreground bg-muted/10 text-center'>
                            {t('files.editors.commandsConfig.fields.aliases.emptyState')}
                        </div>
                    )}

                    {localForm.aliases.map((alias, index) => (
                        <div
                            key={`alias-${index}`}
                            className='space-y-6 rounded-xl bg-card/30 border border-border/30 p-6'
                        >
                            <div className='flex items-start gap-4'>
                                <div className='flex-1 space-y-3'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.commandsConfig.fields.aliases.aliasName')}
                                    </label>
                                    <Input
                                        type='text'
                                        value={alias.name}
                                        onChange={(e) => updateAlias(index, 'name', e.target.value)}
                                        readOnly={readonly}
                                        placeholder='spawn'
                                    />
                                </div>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground hover:text-destructive'
                                    disabled={readonly}
                                    onClick={() => handleRemoveAlias(index)}
                                >
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </div>
                            <div className='space-y-3'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.commandsConfig.fields.aliases.aliasCommands')}
                                </label>
                                <Textarea
                                    value={alias.commandsText}
                                    onChange={(e) => updateAlias(index, 'commandsText', e.target.value)}
                                    readOnly={readonly}
                                    rows={3}
                                    placeholder='say Hello world'
                                />
                                <p className='text-[9px] font-black text-muted-foreground ml-1 uppercase tracking-widest opacity-60'>
                                    {t('files.editors.commandsConfig.fields.aliases.aliasCommandsHint')}
                                </p>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </Card>
    );
}
