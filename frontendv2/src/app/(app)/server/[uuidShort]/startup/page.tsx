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

import * as React from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import {
    Zap,
    ChevronRight,
    RefreshCw,
    Save,
    Terminal,
    Container,
    Settings,
    Loader2,
    Lock,
    Plus,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';
import { buildSpellDockerImageOptions, resolveSpellDefaultDockerImage } from '@/lib/spellDockerImages';
import type { Variable, Server, CustomVariable } from '@/types/server';

interface ServerResponse {
    success: boolean;
    data: Server & {
        variables: Variable[];
        custom_variables?: CustomVariable[];
        image?: string;
    };
}

export default function ServerStartupPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const { getWidgets } = usePluginWidgets('server-startup');

    const canRead = hasPermission('startup.read');
    const canUpdateStartup = hasPermission('startup.update') && isEnabled(settings?.server_allow_startup_change);
    const canUpdateDockerImage = hasPermission('startup.docker-image');
    const allowCustomDockerImage = isEnabled(settings?.server_allow_custom_docker_image);
    const canManageCustomVariables = hasPermission('startup.update');
    const canChangeSpell = isEnabled(settings?.server_allow_egg_change);

    const [server, setServer] = React.useState<(Server & { variables: Variable[] }) | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [variables, setVariables] = React.useState<Variable[]>([]);
    const [customVariables, setCustomVariables] = React.useState<CustomVariable[]>([]);
    const [customVariableSaving, setCustomVariableSaving] = React.useState(false);
    const [availableDockerImages, setAvailableDockerImages] = React.useState<{ name: string; value: string }[]>([]);
    const [spellDefaultDockerImage, setSpellDefaultDockerImage] = React.useState('');
    const [defaultStartupCommand, setDefaultStartupCommand] = React.useState('');

    const [form, setForm] = React.useState({
        startup: '',
        image: '',
    });

    const [variableValues, setVariableValues] = React.useState<Record<number, string>>({});
    const [variableErrors, setVariableErrors] = React.useState<Record<number, string>>({});
    const [customVariableForm, setCustomVariableForm] = React.useState({
        name: '',
        env_variable: '',
        variable_value: '',
        is_encrypted: false,
    });

    const parseRules = React.useCallback((rules: string) => {
        if (!rules) return [];
        const parts = rules.split('|');
        const parsed: Array<{ type: string; value?: number | string }> = [];
        for (const part of parts) {
            if (['required', 'nullable', 'string', 'numeric', 'integer', 'int'].includes(part)) {
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
    }, []);

    const normalizeRegexPattern = React.useCallback((pattern: string) => {
        try {
            return pattern.replace(/\\\\/g, '\\');
        } catch {
            return pattern;
        }
    }, []);

    const validateVariableAgainstRules = React.useCallback(
        (value: string, rules: string): string | '' => {
            const parsed = parseRules(rules || '');
            const hasNullable = parsed.some((r) => r.type === 'nullable');
            const isRequired = parsed.some((r) => r.type === 'required');
            const isNumeric = parsed.some((r) => r.type === 'numeric' || r.type === 'integer' || r.type === 'int');

            const val = value ?? '';
            const trimmedForEmptyCheck = val.trim();

            if (!isRequired && hasNullable && trimmedForEmptyCheck === '') return '';
            if (isRequired && trimmedForEmptyCheck === '') return t('serverStartup.fieldRequired');
            if (!isRequired && trimmedForEmptyCheck === '') return '';

            if (isNumeric && !/^\d+$/.test(trimmedForEmptyCheck)) return t('serverStartup.fieldMustBeNumeric');

            for (const rule of parsed) {
                if (rule.type === 'min' && typeof rule.value === 'number') {
                    if (isNumeric) {
                        const numValue = Number(trimmedForEmptyCheck);
                        if (isNaN(numValue) || numValue < rule.value) {
                            return t('serverStartup.minimumValue', { value: String(rule.value) });
                        }
                    } else {
                        if (trimmedForEmptyCheck.length < rule.value) {
                            return t('serverStartup.minimumCharacters', { value: String(rule.value) });
                        }
                    }
                }
                if (rule.type === 'max' && typeof rule.value === 'number') {
                    if (isNumeric) {
                        const numValue = Number(trimmedForEmptyCheck);
                        if (isNaN(numValue) || numValue > rule.value) {
                            return t('serverStartup.maximumValue', { value: String(rule.value) });
                        }
                    } else {
                        if (trimmedForEmptyCheck.length > rule.value) {
                            return t('serverStartup.maximumCharacters', { value: String(rule.value) });
                        }
                    }
                }
                if (rule.type === 'regex' && typeof rule.value === 'string') {
                    try {
                        const pattern = normalizeRegexPattern(rule.value);
                        const re = new RegExp(pattern);
                        if (!re.test(trimmedForEmptyCheck)) {
                            return t('serverStartup.valueDoesNotMatchFormat');
                        }
                    } catch (err) {
                        console.error('Invalid regex pattern:', rule.value, err);
                    }
                }
            }
            return '';
        },
        [parseRules, normalizeRegexPattern, t],
    );

    const validateOneVariable = React.useCallback(
        (v: Variable, value: string) => {
            const message = validateVariableAgainstRules(value, v.rules || '');
            setVariableErrors((prev) => {
                const next = { ...prev };
                if (message) {
                    next[v.variable_id] = message;
                } else {
                    delete next[v.variable_id];
                }
                return next;
            });
        },
        [validateVariableAgainstRules],
    );

    const fetchData = React.useCallback(async () => {
        if (!uuidShort || !canRead) return;
        setLoading(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const { data } = await Promise.race([
                axios.get<ServerResponse>(`/api/user/servers/${uuidShort}`, {
                    signal: controller.signal,
                }),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 15000)),
            ]);

            clearTimeout(timeoutId);

            if (data.success) {
                const s = data.data;
                setServer(s);
                setForm({
                    startup: s.startup || '',
                    image: s.image || s.docker_image || '',
                });
                setDefaultStartupCommand(s.spell?.startup || '');
                const vars = s.variables || [];
                setVariables(vars);
                setCustomVariables(s.custom_variables || []);
                const values: Record<number, string> = {};
                vars.forEach((v) => {
                    values[v.variable_id] = v.variable_value ?? '';
                });
                setVariableValues(values);

                try {
                    const currentImage = (s.image || s.docker_image || '').trim();
                    const imageOptions = s.spell
                        ? buildSpellDockerImageOptions(s.spell, currentImage)
                        : currentImage
                          ? [{ name: currentImage, value: currentImage }]
                          : [];
                    setAvailableDockerImages(imageOptions);

                    const defaultImage = s.spell ? resolveSpellDefaultDockerImage(s.spell) : '';
                    setSpellDefaultDockerImage(defaultImage);

                    const allowedValues = imageOptions.map((img) => img.value);

                    if (currentImage && allowedValues.includes(currentImage)) {
                        setForm((prev) => ({ ...prev, image: currentImage }));
                    } else if (defaultImage) {
                        setForm((prev) => ({ ...prev, image: defaultImage }));
                    } else if (allowedValues.length > 0) {
                        setForm((prev) => ({ ...prev, image: allowedValues[0] }));
                    }
                } catch {
                    setAvailableDockerImages([]);
                    setSpellDefaultDockerImage('');
                }
            }
        } catch (error) {
            console.error('Failed to fetch startup data:', error);
            if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
                toast.error(t('serverStartup.loadTimeout'));
            } else if (error instanceof Error && error.message === 'Request timeout') {
                toast.error(t('serverStartup.loadTimeout'));
            } else {
                toast.error(t('serverStartup.failedToFetchServer'));
            }
        } finally {
            setLoading(false);
        }
    }, [uuidShort, canRead, t]);

    React.useEffect(() => {
        if (!permissionsLoading && !settingsLoading) {
            if (canRead) {
                fetchData();
            }
        }
    }, [canRead, permissionsLoading, settingsLoading, fetchData]);

    const handleRestoreDefault = () => {
        if (defaultStartupCommand) {
            setForm((prev) => ({ ...prev, startup: defaultStartupCommand }));
            toast.info(t('serverStartup.defaultRestored'));
        }
    };

    const handleSave = async () => {
        setSaving(true);

        let hasErrors = false;
        const errors: Record<number, string> = {};
        variables.forEach((v) => {
            if (isEnabled(v.user_viewable)) {
                const val = variableValues[v.variable_id] || '';
                const err = validateVariableAgainstRules(val, v.rules || '');
                if (err) {
                    errors[v.variable_id] = err;
                    hasErrors = true;
                }
            }
        });
        setVariableErrors(errors);

        if (hasErrors) {
            setSaving(false);
            toast.error(t('serverStartup.pleaseFixErrors'));
            return;
        }

        try {
            const payload: {
                startup: string;
                image?: string;
                variables: { variable_id: number; variable_value: string }[];
            } = {
                startup: form.startup,
                variables: variables
                    .filter((v) => isEnabled(v.user_editable))
                    .map((v) => ({
                        variable_id: v.variable_id,
                        variable_value: variableValues[v.variable_id] || '',
                    })),
            };

            if (canUpdateDockerImage) {
                const allowedValues = availableDockerImages.map((img) => img.value);
                if (!allowCustomDockerImage && allowedValues.length > 0 && !allowedValues.includes(form.image)) {
                    toast.error(t('serverStartup.dockerImageMustBeFromList'));
                    setSaving(false);
                    return;
                }
                payload.image = form.image;
            }

            const { data } = await axios.put<{ success: boolean; message?: string }>(
                `/api/user/servers/${uuidShort}`,
                payload,
            );
            if (data.success) {
                toast.success(t('serverStartup.saveSuccess'));
                await fetchData();
            } else {
                toast.error(data.message || t('serverStartup.saveError'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            const msg = axiosError.response?.data?.message || t('serverStartup.saveError');
            toast.error(msg);
            console.error('Save failed:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleAddCustomVariable = async () => {
        const name = customVariableForm.name.trim();
        const envVariable = customVariableForm.env_variable.trim().toUpperCase();

        if (!name || !envVariable) {
            toast.error('Name and environment variable are required');
            return;
        }

        if (!/^[A-Z_][A-Z0-9_]*$/.test(envVariable)) {
            toast.error(
                'Env variable must use uppercase letters, numbers, and underscores, and cannot start with a number',
            );
            return;
        }

        setCustomVariableSaving(true);
        try {
            const { data } = await axios.post<{ success: boolean; message?: string }>(
                `/api/user/servers/${uuidShort}/custom-variables`,
                {
                    name,
                    env_variable: envVariable,
                    variable_value: customVariableForm.variable_value,
                    is_encrypted: customVariableForm.is_encrypted,
                },
            );

            if (data.success) {
                toast.success('Custom variable added');
                setCustomVariableForm({ name: '', env_variable: '', variable_value: '', is_encrypted: false });
                await fetchData();
            } else {
                toast.error(data.message || 'Failed to add custom variable');
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || 'Failed to add custom variable');
        } finally {
            setCustomVariableSaving(false);
        }
    };

    const handleDeleteCustomVariable = async (variable: CustomVariable) => {
        setCustomVariableSaving(true);
        try {
            const { data } = await axios.delete<{ success: boolean; message?: string }>(
                `/api/user/servers/${uuidShort}/custom-variables/${variable.id}`,
            );

            if (data.success) {
                toast.success('Custom variable deleted');
                await fetchData();
            } else {
                toast.error(data.message || 'Failed to delete custom variable');
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || 'Failed to delete custom variable');
        } finally {
            setCustomVariableSaving(false);
        }
    };

    const selectedDockerImageLabel = availableDockerImages.find((img) => img.value === form.image)?.name || form.image;

    const viewableVariables = variables.filter((v) => isEnabled(v.user_viewable) || canUpdateStartup);
    const variableCount = viewableVariables.length + customVariables.length;
    const hasChanges = () => {
        if (!server) return false;
        const startupChanged = form.startup !== (server.startup || '');
        const imageChanged = canUpdateDockerImage && form.image !== (server.image || server.docker_image || '');
        const variablesChanged = variables
            .filter((v) => isEnabled(v.user_editable))
            .some((v) => variableValues[v.variable_id] !== (v.variable_value ?? ''));
        return startupChanged || imageChanged || variablesChanged;
    };

    if (permissionsLoading || settingsLoading) return null;

    if (!canRead) {
        return (
            <div className='bg-card/40 border-border/5 flex flex-col items-center justify-center space-y-8 rounded-[3rem] border py-24 text-center backdrop-blur-3xl'>
                <div className='relative'>
                    <div className='absolute inset-0 scale-150 rounded-full bg-red-500/20 blur-3xl' />
                    <div className='relative flex h-32 w-32 rotate-3 items-center justify-center rounded-3xl border-2 border-red-500/20 bg-red-500/10'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black tracking-tight uppercase'>
                        {t('serverStartup.featureDisabled')}
                    </h2>
                    <p className='text-muted-foreground text-lg leading-relaxed font-medium'>
                        {t('serverStartup.noStartupPermission')}
                    </p>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 h-14 rounded-2xl px-10'
                    onClick={() => router.push(`/server/${uuidShort}`)}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    if (loading && !server) {
        return (
            <div key={pathname} className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div key={pathname} className='mx-auto max-w-6xl space-y-8 pb-16 font-sans'>
            <WidgetRenderer widgets={getWidgets('server-startup', 'top-of-page')} />

            <PageHeader
                title={t('serverStartup.title')}
                description={t('serverStartup.description')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='plain'
                            size='default'
                            onClick={() => fetchData()}
                            disabled={loading || saving}
                            className='order-2 border border-transparent bg-transparent text-[10px] hover:border-white/10 hover:bg-white/5 sm:order-1'
                            aria-label={t('common.refresh')}
                        >
                            <RefreshCw className={cn('h-3 w-3 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('common.refresh')}</span>
                        </Button>
                        <Button
                            variant='default'
                            size='default'
                            onClick={handleSave}
                            disabled={saving || !hasChanges() || Object.keys(variableErrors).length > 0}
                            loading={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            {saving ? (
                                t('common.saving')
                            ) : (
                                <>
                                    <Save className='mr-2 h-4 w-4' />
                                    {t('common.saveChanges')}
                                </>
                            )}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-startup', 'after-header')} />

            <div className='grid grid-cols-1 gap-8 lg:grid-cols-12'>
                <div className='space-y-8 lg:col-span-8'>
                    <PageCard
                        title={t('serverStartup.startupCommand')}
                        description={t('serverStartup.startupHelp')}
                        icon={Terminal}
                        action={
                            canUpdateStartup && (
                                <Button variant='outline' size='sm' onClick={handleRestoreDefault}>
                                    {t('serverStartup.restoreDefault')}
                                </Button>
                            )
                        }
                    >
                        <div className='space-y-4'>
                            <Textarea
                                value={form.startup}
                                onChange={(e) => setForm((prev) => ({ ...prev, startup: e.target.value }))}
                                disabled={!canUpdateStartup || saving}
                                className='min-h-35'
                            />
                        </div>
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-startup', 'after-startup-command')} />

                    <PageCard
                        title={t('serverStartup.variables')}
                        description={t('serverStartup.variablesHelp')}
                        icon={Settings}
                        action={
                            <div className='bg-secondary/50 border-border/10 text-muted-foreground/60 rounded-2xl border px-5 py-2 text-[10px] font-black tracking-widest uppercase'>
                                {variableCount}{' '}
                                {variableCount === 1
                                    ? t('serverStartup.variableSingular')
                                    : t('serverStartup.variablePlural')}
                            </div>
                        }
                    >
                        {viewableVariables.length === 0 && customVariables.length === 0 ? (
                            <div className='flex flex-col items-center justify-center space-y-4 py-16 text-center'>
                                <Settings className='text-muted-foreground/10 h-16 w-16' />
                                <p className='text-muted-foreground leading-none font-black uppercase'>
                                    {t('serverStartup.noVariablesConfigured')}
                                </p>
                            </div>
                        ) : (
                            <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
                                {viewableVariables.map((v) => (
                                    <div key={v.variable_id} className='group/var space-y-3'>
                                        <div className='ml-1 flex items-center justify-between'>
                                            <div className='flex items-center gap-2.5'>
                                                <div
                                                    className={cn(
                                                        'h-1.5 w-1.5 rounded-full transition-all duration-300',
                                                        variableErrors[v.variable_id]
                                                            ? 'bg-red-500'
                                                            : 'bg-purple-500/50 group-hover/var:bg-purple-500',
                                                    )}
                                                />
                                                <label className='text-muted-foreground group-hover/var:text-foreground text-[9px] font-black tracking-[0.2em] uppercase transition-colors'>
                                                    {v.name}
                                                </label>
                                            </div>
                                            {!isEnabled(v.user_editable) && (
                                                <span className='text-muted-foreground/40 bg-secondary/50 border-border/10 rounded-md border px-2 py-0.5 text-[8px] font-black tracking-widest uppercase'>
                                                    {t('serverStartup.readOnly')}
                                                </span>
                                            )}
                                        </div>

                                        <div className='relative'>
                                            <Input
                                                value={variableValues[v.variable_id] ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setVariableValues((prev) => ({ ...prev, [v.variable_id]: val }));
                                                    validateOneVariable(v, val);
                                                }}
                                                disabled={!isEnabled(v.user_editable) || saving}
                                                error={!!variableErrors[v.variable_id]}
                                                className={cn(!isEnabled(v.user_editable) && 'opacity-50 grayscale')}
                                                placeholder={v.default_value || t('serverStartup.enterValue')}
                                            />
                                            <div className='text-muted-foreground/20 pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-[10px] opacity-0 transition-opacity group-hover/var:opacity-100'>
                                                {v.env_variable}
                                            </div>
                                        </div>

                                        {variableErrors[v.variable_id] ? (
                                            <p className='animate-in slide-in-from-left-2 ml-2 text-[9px] font-black tracking-widest text-red-500 uppercase'>
                                                {variableErrors[v.variable_id]}
                                            </p>
                                        ) : (
                                            v.description && (
                                                <p className='text-muted-foreground/40 ml-2 line-clamp-1 text-[9px] font-bold transition-all group-hover/var:line-clamp-none'>
                                                    {v.description}
                                                </p>
                                            )
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className='mt-10 space-y-6 border-t border-white/5 pt-8'>
                            <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                                <div>
                                    <h3 className='text-sm font-black tracking-widest uppercase'>
                                        Custom environment variables
                                    </h3>
                                    <p className='text-muted-foreground/50 mt-1 text-xs font-medium'>
                                        Added directly to this server and synced without a transfer.
                                    </p>
                                </div>
                            </div>

                            {customVariables.length > 0 && (
                                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                    {customVariables.map((variable) => (
                                        <div
                                            key={variable.id}
                                            className='bg-card/50 border-border/10 flex items-center justify-between gap-3 rounded-2xl border p-4'
                                        >
                                            <div className='min-w-0'>
                                                <p className='truncate text-xs font-black tracking-widest uppercase'>
                                                    {variable.name}
                                                </p>
                                                <p className='text-muted-foreground/50 mt-1 truncate font-mono text-[10px]'>
                                                    {variable.env_variable}={variable.variable_value}
                                                </p>
                                            </div>
                                            {Number(variable.is_encrypted) === 1 && (
                                                <Lock className='text-muted-foreground/50 h-3.5 w-3.5 shrink-0' />
                                            )}
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => handleDeleteCustomVariable(variable)}
                                                disabled={!canManageCustomVariables || customVariableSaving}
                                                className='shrink-0'
                                                aria-label={`Delete ${variable.env_variable}`}
                                            >
                                                <Trash2 className='h-3.5 w-3.5' />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {canManageCustomVariables && (
                                <div className='bg-secondary/20 border-border/10 grid grid-cols-1 gap-3 rounded-3xl border p-4 md:grid-cols-3'>
                                    <Input
                                        value={customVariableForm.name}
                                        onChange={(e) =>
                                            setCustomVariableForm((prev) => ({ ...prev, name: e.target.value }))
                                        }
                                        disabled={customVariableSaving}
                                        placeholder='Display name'
                                    />
                                    <Input
                                        value={customVariableForm.env_variable}
                                        onChange={(e) =>
                                            setCustomVariableForm((prev) => ({
                                                ...prev,
                                                env_variable: e.target.value.toUpperCase(),
                                            }))
                                        }
                                        disabled={customVariableSaving}
                                        placeholder='ENV_NAME'
                                        className='font-mono text-xs'
                                    />
                                    <div className='flex gap-3'>
                                        <Input
                                            value={customVariableForm.variable_value}
                                            onChange={(e) =>
                                                setCustomVariableForm((prev) => ({
                                                    ...prev,
                                                    variable_value: e.target.value,
                                                }))
                                            }
                                            disabled={customVariableSaving}
                                            placeholder='Value'
                                            className='font-mono text-xs'
                                        />
                                        <Button
                                            variant='default'
                                            size='default'
                                            onClick={handleAddCustomVariable}
                                            disabled={customVariableSaving}
                                            loading={customVariableSaving}
                                            className='shrink-0'
                                        >
                                            <Plus className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    <label className='text-muted-foreground/70 flex items-start gap-2 text-xs md:col-span-3'>
                                        <input
                                            type='checkbox'
                                            checked={customVariableForm.is_encrypted}
                                            onChange={(e) =>
                                                setCustomVariableForm((prev) => ({
                                                    ...prev,
                                                    is_encrypted: e.target.checked,
                                                }))
                                            }
                                            disabled={customVariableSaving}
                                            className='mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5'
                                        />
                                        <span>Encrypt this value and hide it after save</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-startup', 'after-variables')} />
                </div>

                <div className='space-y-8 lg:col-span-4'>
                    <PageCard title={t('serverStartup.dockerImage')} description='Containerization' icon={Container}>
                        <div className='space-y-6'>
                            {allowCustomDockerImage ? (
                                <div className='space-y-2.5'>
                                    <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverStartup.dockerImage')}
                                    </label>
                                    <Input
                                        value={form.image}
                                        onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                                        disabled={!canUpdateDockerImage || saving}
                                        placeholder='ghcr.io/...'
                                        className='font-mono text-xs'
                                    />
                                </div>
                            ) : (
                                <div className='space-y-2.5'>
                                    <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                        {t('serverStartup.dockerImage')}
                                    </label>
                                    <div className='bg-muted/30 border-border/50 rounded-xl border px-3 py-2.5 text-xs'>
                                        <p className='font-medium'>
                                            {selectedDockerImageLabel || t('serverStartup.noDockerImageSelected')}
                                        </p>
                                        {form.image && selectedDockerImageLabel !== form.image && (
                                            <p className='text-muted-foreground mt-1 truncate font-mono text-[10px]'>
                                                {form.image}
                                            </p>
                                        )}
                                    </div>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('serverStartup.dockerImageListOnlyHelp')}
                                    </p>
                                </div>
                            )}

                            <div className='space-y-3'>
                                <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverStartup.availableImages')}
                                </label>
                                {availableDockerImages.length === 0 ? (
                                    <p className='text-muted-foreground text-xs'>
                                        {t('serverStartup.noDockerImagesConfigured')}
                                    </p>
                                ) : (
                                    <div className='scrollbar-hide max-h-50 space-y-2 overflow-y-auto pr-2'>
                                        {availableDockerImages.map((image) => (
                                            <div
                                                key={image.value}
                                                onClick={() =>
                                                    canUpdateDockerImage &&
                                                    !saving &&
                                                    setForm((prev) => ({ ...prev, image: image.value }))
                                                }
                                                className={cn(
                                                    'group/img relative overflow-hidden rounded-xl border p-3 transition-all duration-300',
                                                    canUpdateDockerImage
                                                        ? 'cursor-pointer'
                                                        : 'cursor-default opacity-80',
                                                    form.image === image.value
                                                        ? 'border-blue-500/40 bg-blue-500/10'
                                                        : 'bg-card/50 border-border/5 hover:border-border/20',
                                                )}
                                            >
                                                <div className='relative z-10 flex items-center justify-between gap-3'>
                                                    <div className='min-w-0'>
                                                        <p
                                                            className={cn(
                                                                'truncate text-sm font-medium transition-colors',
                                                                form.image === image.value
                                                                    ? 'text-blue-500'
                                                                    : 'text-foreground group-hover/img:text-foreground',
                                                            )}
                                                        >
                                                            {image.name}
                                                            {image.value === spellDefaultDockerImage && (
                                                                <span className='text-muted-foreground ml-2 text-xs font-normal'>
                                                                    ({t('serverStartup.spellDefaultDockerImage')})
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className='text-muted-foreground truncate font-mono text-[10px]'>
                                                            {image.value}
                                                        </p>
                                                    </div>
                                                    {form.image === image.value && (
                                                        <div className='h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500' />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-startup', 'after-docker-image')} />

                    {canChangeSpell && (
                        <div className='bg-primary/5 border-primary/10 group relative space-y-6 overflow-hidden rounded-3xl border p-8 backdrop-blur-3xl'>
                            <div className='bg-primary/10 group-hover:bg-primary/20 pointer-events-none absolute -right-12 -bottom-12 h-48 w-48 blur-3xl transition-all duration-1000' />
                            <div className='relative z-10 flex items-center gap-5'>
                                <div className='bg-primary/10 border-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3'>
                                    <Zap className='text-primary fill-primary/20 h-6 w-6' />
                                </div>
                                <div className='space-y-1'>
                                    <h3 className='text-xl font-black tracking-tight uppercase'>
                                        {t('serverStartup.softwareEnvironment')}
                                    </h3>
                                    <p className='text-muted-foreground/60 text-[10px] font-bold tracking-widest uppercase'>
                                        {t('navigation.items.transferSpell')}
                                    </p>
                                </div>
                            </div>

                            <p className='text-muted-foreground/80 relative z-10 text-sm leading-relaxed font-medium'>
                                {t('serverStartup.transferDescription')}
                            </p>

                            <Button
                                onClick={() => router.push(`/server/${uuidShort}/startup/transfer/spell`)}
                                className='bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary w-full border'
                                size='default'
                                variant='outline'
                            >
                                {t('serverStartup.startTransfer')}
                                <ChevronRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                            </Button>
                        </div>
                    )}
                    <WidgetRenderer widgets={getWidgets('server-startup', 'after-spell-selection')} />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('server-startup', 'bottom-of-page')} />
        </div>
    );
}
