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
import { Zap, ChevronRight, RefreshCw, Save, Terminal, Container, Settings, Info, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';
import type { Variable, Server } from '@/types/server';

interface ServerResponse {
    success: boolean;
    data: Server & {
        variables: Variable[];
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
    const canChangeSpell = isEnabled(settings?.server_allow_egg_change);

    const [server, setServer] = React.useState<(Server & { variables: Variable[] }) | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [variables, setVariables] = React.useState<Variable[]>([]);
    const [availableDockerImages, setAvailableDockerImages] = React.useState<string[]>([]);
    const [defaultStartupCommand, setDefaultStartupCommand] = React.useState('');

    const [form, setForm] = React.useState({
        startup: '',
        image: '',
    });

    const [variableValues, setVariableValues] = React.useState<Record<number, string>>({});
    const [variableErrors, setVariableErrors] = React.useState<Record<number, string>>({});

    const parseRules = React.useCallback((rules: string) => {
        if (!rules) return [];
        const parts = rules.split('|');
        const parsed: Array<{ type: string; value?: number | string }> = [];
        for (const part of parts) {
            if (['required', 'nullable', 'string', 'numeric', 'integer'].includes(part)) {
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
            const isNumeric = parsed.some((r) => r.type === 'numeric' || r.type === 'integer');

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
                const values: Record<number, string> = {};
                vars.forEach((v) => {
                    values[v.variable_id] = v.variable_value ?? '';
                });
                setVariableValues(values);

                try {
                    const dockerImages = s.spell?.docker_images;
                    let images: string[] = [];
                    if (dockerImages) {
                        if (typeof dockerImages === 'string') {
                            const parsed = JSON.parse(dockerImages);
                            images = Object.values(parsed);
                        } else {
                            images = Object.values(dockerImages);
                        }
                    }
                    setAvailableDockerImages(images);

                    const currentImage = s.image || s.docker_image;
                    if (currentImage && images.includes(currentImage)) {
                        setForm((prev) => ({ ...prev, image: currentImage }));
                    } else if (images.length > 0) {
                        setForm((prev) => ({ ...prev, image: images[0] }));
                    }
                } catch {
                    setAvailableDockerImages([]);
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
            const payload = {
                startup: form.startup,
                image: form.image,
                variables: variables
                    .filter((v) => isEnabled(v.user_editable))
                    .map((v) => ({
                        variable_id: v.variable_id,
                        variable_value: variableValues[v.variable_id] || '',
                    })),
            };

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

    const viewableVariables = variables.filter((v) => isEnabled(v.user_viewable) || canUpdateStartup);
    const hasChanges = () => {
        if (!server) return false;
        const startupChanged = form.startup !== (server.startup || '');
        const imageChanged = form.image !== (server.image || server.docker_image || '');
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
                    <div className='hidden items-center gap-3 md:flex'>
                        <Button
                            variant='plain'
                            size='default'
                            onClick={() => fetchData()}
                            disabled={loading || saving}
                            className='border border-transparent bg-transparent text-[10px] hover:border-white/10 hover:bg-white/5'
                        >
                            <RefreshCw className={cn('mr-2 h-3 w-3', loading && 'animate-spin')} />
                            {t('common.refresh')}
                        </Button>
                        <Button
                            variant='default'
                            size='default'
                            onClick={handleSave}
                            disabled={saving || !hasChanges() || Object.keys(variableErrors).length > 0}
                            loading={saving}
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
                                className='min-h-[140px]'
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
                                {viewableVariables.length}{' '}
                                {viewableVariables.length === 1
                                    ? t('serverStartup.variableSingular')
                                    : t('serverStartup.variablePlural')}
                            </div>
                        }
                    >
                        {viewableVariables.length === 0 ? (
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
                    </PageCard>
                    <WidgetRenderer widgets={getWidgets('server-startup', 'after-variables')} />
                </div>

                <div className='space-y-8 lg:col-span-4'>
                    <PageCard title={t('serverStartup.dockerImage')} description='Containerization' icon={Container}>
                        <div className='space-y-6'>
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

                            <div className='space-y-3'>
                                <label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverStartup.availableImages')}
                                </label>
                                <div className='scrollbar-hide max-h-[200px] space-y-2 overflow-y-auto pr-2'>
                                    {availableDockerImages.map((image) => (
                                        <div
                                            key={image}
                                            onClick={() =>
                                                canUpdateDockerImage &&
                                                !saving &&
                                                setForm((prev) => ({ ...prev, image }))
                                            }
                                            className={cn(
                                                'group/img relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all duration-300',
                                                form.image === image
                                                    ? 'border-blue-500/40 bg-blue-500/10'
                                                    : 'bg-card/50 border-border/5 hover:border-border/20',
                                            )}
                                        >
                                            <div className='relative z-10 flex items-center justify-between gap-3'>
                                                <p
                                                    className={cn(
                                                        'truncate font-mono text-[10px] font-bold transition-colors',
                                                        form.image === image
                                                            ? 'text-blue-500'
                                                            : 'text-muted-foreground group-hover/img:text-foreground',
                                                    )}
                                                >
                                                    {image}
                                                </p>
                                                {form.image === image && (
                                                    <div className='h-1.5 w-1.5 rounded-full bg-blue-500' />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
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

                    <div className='group relative space-y-4 overflow-hidden rounded-3xl border border-blue-500/10 bg-blue-500/5 p-8 backdrop-blur-3xl'>
                        <div className='pointer-events-none absolute -right-6 -bottom-6 h-24 w-24 bg-blue-500/10 blur-2xl transition-transform duration-1000 group-hover:scale-150' />
                        <div className='relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10'>
                            <Info className='h-5 w-5 text-blue-500' />
                        </div>
                        <div className='relative z-10 space-y-2'>
                            <h3 className='text-lg leading-none font-black tracking-tight text-blue-500 uppercase'>
                                {t('serverStartup.startupSettings')}
                            </h3>
                            <p className='text-[11px] leading-relaxed font-bold text-blue-500/70'>
                                {t('serverStartup.description')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('server-startup', 'bottom-of-page')} />
        </div>
    );
}
