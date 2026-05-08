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
import axios, { AxiosError } from 'axios';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    ListCheck,
    Plus,
    Pencil,
    Trash2,
    ChevronUp,
    ChevronDown,
    Power,
    Lock,
    Loader2,
    RefreshCw,
    Settings2,
    Download,
    Upload,
} from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { HeadlessModal } from '@/components/ui/headless-modal';
import type { LifecycleHook, LifecycleHookStep, LifecycleHookType, LifecycleTaskType } from '@/types/server';
import { computeMovedSequence } from './form-utils';

type LifecycleHookResponse = {
    success: boolean;
    data: {
        hooks: LifecycleHook[];
        feature_enabled: boolean;
    };
};

type LifecycleHookExportFile = {
    version: 1;
    exported_at: string;
    hooks: Array<{
        hook_type: LifecycleHookType;
        is_active: number;
        steps: Array<{
            sequence_id: number;
            task_type: LifecycleTaskType;
            payload: Record<string, unknown>;
            continue_on_failure: number;
        }>;
    }>;
};

const EMPTY_HOOKS: Record<LifecycleHookType, LifecycleHook> = {
    pre_start: { id: null, server_id: 0, hook_type: 'pre_start', is_active: 0, steps: [] },
    pre_stop: { id: null, server_id: 0, hook_type: 'pre_stop', is_active: 0, steps: [] },
};

export default function ServerLifecycleHooksPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const { fetchWidgets, getWidgets } = usePluginWidgets('server-lifecycle-hooks');
    const { t } = useTranslation();
    const router = useRouter();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const canRead = hasPermission('schedule.read');
    const canUpdate = hasPermission('schedule.update');

    const [loading, setLoading] = React.useState(true);
    const [hasLoaded, setHasLoaded] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [togglingHookType, setTogglingHookType] = React.useState<LifecycleHookType | null>(null);
    const [hooks, setHooks] = React.useState<Record<LifecycleHookType, LifecycleHook>>(EMPTY_HOOKS);
    const [featureEnabled, setFeatureEnabled] = React.useState(false);
    const [importing, setImporting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const [selectedHookType, setSelectedHookType] = React.useState<LifecycleHookType>('pre_start');
    const [selectedStep, setSelectedStep] = React.useState<LifecycleHookStep | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

    const hookLabels: Record<LifecycleHookType, string> = React.useMemo(
        () => ({
            pre_start: t('lifecycleHooks.hookTypes.preStart'),
            pre_stop: t('lifecycleHooks.hookTypes.preStop'),
        }),
        [t],
    );
    const taskTypeLabels: Record<LifecycleTaskType, string> = React.useMemo(
        () => ({
            container_command: t('lifecycleHooks.taskTypes.containerCommand'),
            discord_webhook: t('lifecycleHooks.taskTypes.discordWebhook'),
            http_request: t('lifecycleHooks.taskTypes.httpRequest'),
        }),
        [t],
    );

    const fetchHooks = React.useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get<LifecycleHookResponse>(`/api/user/servers/${uuidShort}/lifecycle-hooks`);
            if (data.success) {
                setFeatureEnabled(Boolean(data.data.feature_enabled));
                const nextMap: Record<LifecycleHookType, LifecycleHook> = {
                    pre_start: data.data.hooks.find((hook) => hook.hook_type === 'pre_start') || EMPTY_HOOKS.pre_start,
                    pre_stop: data.data.hooks.find((hook) => hook.hook_type === 'pre_stop') || EMPTY_HOOKS.pre_stop,
                };
                setHooks(nextMap);
            }
        } catch (error) {
            console.error(error);
            toast.error(t('lifecycleHooks.messages.fetchFailed'));
        } finally {
            setLoading(false);
            setHasLoaded(true);
        }
    }, [t, uuidShort]);

    React.useEffect(() => {
        if (permissionsLoading) return;
        if (!canRead) {
            toast.error(t('lifecycleHooks.messages.noPermission'));
            router.push(`/server/${uuidShort}`);
            return;
        }
        fetchHooks();
    }, [permissionsLoading, canRead, fetchHooks, router, t, uuidShort]);

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const updateHookActive = async (hookType: LifecycleHookType, isActive: number) => {
        if (!featureEnabled) return;
        setTogglingHookType(hookType);
        const previous = hooks[hookType].is_active;
        setHooks((current) => ({
            ...current,
            [hookType]: {
                ...current[hookType],
                is_active: isActive,
            },
        }));

        try {
            const { data } = await axios.put(`/api/user/servers/${uuidShort}/lifecycle-hooks/${hookType}`, {
                is_active: isActive,
            });
            if (data.success) {
                toast.success(
                    isActive ? t('lifecycleHooks.messages.hookEnabled') : t('lifecycleHooks.messages.hookDisabled'),
                );
                fetchHooks();
            }
        } catch (error) {
            setHooks((current) => ({
                ...current,
                [hookType]: {
                    ...current[hookType],
                    is_active: previous,
                },
            }));
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || t('lifecycleHooks.messages.updateHookFailed'));
        } finally {
            setTogglingHookType(null);
        }
    };

    const handleDeleteStep = async () => {
        if (!selectedStep || !featureEnabled) return;
        setDeleting(true);
        try {
            const { data } = await axios.delete(
                `/api/user/servers/${uuidShort}/lifecycle-hooks/${selectedHookType}/steps/${selectedStep.id}`,
            );
            if (data.success) {
                toast.success(t('lifecycleHooks.messages.stepDeleted'));
                setIsDeleteOpen(false);
                setSelectedStep(null);
                fetchHooks();
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || t('lifecycleHooks.messages.stepDeleteFailed'));
        } finally {
            setDeleting(false);
        }
    };

    const handleMoveStep = async (step: LifecycleHookStep, direction: -1 | 1) => {
        if (!featureEnabled) return;
        const newSequence = computeMovedSequence(step.sequence_id, direction);
        if (newSequence <= 0) return;
        try {
            const { data } = await axios.put(
                `/api/user/servers/${uuidShort}/lifecycle-hooks/${selectedHookType}/steps/${step.id}/sequence`,
                {
                    sequence_id: newSequence,
                },
            );
            if (data.success) {
                fetchHooks();
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || t('lifecycleHooks.messages.reorderFailed'));
        }
    };

    const goCreateStep = () => {
        router.push(`/server/${uuidShort}/lifecycle-hooks/step/new?hook=${selectedHookType}`);
    };

    const goEditStep = (step: LifecycleHookStep) => {
        router.push(`/server/${uuidShort}/lifecycle-hooks/step/${step.id}/edit?hook=${selectedHookType}`);
    };

    const exportHooks = () => {
        const payload: LifecycleHookExportFile = {
            version: 1,
            exported_at: new Date().toISOString(),
            hooks: (['pre_start', 'pre_stop'] as LifecycleHookType[]).map((hookType) => ({
                hook_type: hookType,
                is_active: hooks[hookType].is_active,
                steps: [...hooks[hookType].steps]
                    .sort((a, b) => a.sequence_id - b.sequence_id)
                    .map((step) => {
                        let parsedPayload: Record<string, unknown> = {};
                        try {
                            parsedPayload = JSON.parse(step.payload);
                        } catch {
                            parsedPayload = {};
                        }
                        return {
                            sequence_id: step.sequence_id,
                            task_type: step.task_type,
                            payload: parsedPayload,
                            continue_on_failure: step.continue_on_failure,
                        };
                    }),
            })),
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lifecycle-hooks-${uuidShort}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const importHooks = async (file: File) => {
        if (!featureEnabled || !canUpdate) return;
        setImporting(true);
        try {
            const raw = await file.text();
            const parsed = JSON.parse(raw) as Partial<LifecycleHookExportFile>;
            if (!parsed || !Array.isArray(parsed.hooks)) {
                toast.error(t('lifecycleHooks.messages.importInvalid'));
                return;
            }

            const validTaskTypes: LifecycleTaskType[] = ['container_command', 'discord_webhook', 'http_request'];
            for (const hookType of ['pre_start', 'pre_stop'] as LifecycleHookType[]) {
                const importedHook = parsed.hooks.find((h) => h.hook_type === hookType);
                if (!importedHook) continue;

                await axios.put(`/api/user/servers/${uuidShort}/lifecycle-hooks/${hookType}`, {
                    is_active: importedHook.is_active ? 1 : 0,
                });

                const existing = hooks[hookType]?.steps ?? [];
                for (const step of existing) {
                    await axios.delete(`/api/user/servers/${uuidShort}/lifecycle-hooks/${hookType}/steps/${step.id}`);
                }

                const sortedImportedSteps = [...(importedHook.steps ?? [])].sort(
                    (a, b) => (a.sequence_id ?? 0) - (b.sequence_id ?? 0),
                );
                for (const step of sortedImportedSteps) {
                    if (!step || !validTaskTypes.includes(step.task_type as LifecycleTaskType)) continue;
                    await axios.post(`/api/user/servers/${uuidShort}/lifecycle-hooks/${hookType}/steps`, {
                        task_type: step.task_type,
                        continue_on_failure: step.continue_on_failure ? 1 : 0,
                        payload: step.payload ?? {},
                    });
                }
            }

            await fetchHooks();
            toast.success(t('lifecycleHooks.messages.importSuccess'));
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || t('lifecycleHooks.messages.importFailed'));
        } finally {
            setImporting(false);
        }
    };

    const selectedHook = hooks[selectedHookType];
    const sortedSteps = React.useMemo(
        () => [...(selectedHook?.steps || [])].sort((a, b) => a.sequence_id - b.sequence_id),
        [selectedHook],
    );

    const summarizeStepPayload = React.useCallback(
        (step: LifecycleHookStep): React.ReactNode => {
            let parsed: Record<string, unknown> = {};
            try {
                parsed = JSON.parse(step.payload);
            } catch {
                return <span className='text-muted-foreground text-xs'>{t('lifecycleHooks.payloadUnavailable')}</span>;
            }

            if (step.task_type === 'discord_webhook') {
                const rawUrl = typeof parsed.url === 'string' ? parsed.url : '';
                let safeUrl = t('lifecycleHooks.discord.urlHidden');
                if (rawUrl) {
                    try {
                        const u = new URL(rawUrl);
                        safeUrl = `${u.origin}/api/webhooks/***`;
                    } catch {
                        safeUrl = t('lifecycleHooks.discord.urlHidden');
                    }
                }
                const content =
                    typeof parsed.content === 'string' && parsed.content.trim() !== ''
                        ? parsed.content.trim().slice(0, 140)
                        : '';
                const embeds = Array.isArray(parsed.embeds) ? parsed.embeds.length : 0;
                return (
                    <div className='space-y-1 text-xs'>
                        <p className='text-muted-foreground'>
                            <span className='text-foreground/80 font-semibold'>
                                {t('lifecycleHooks.form.webhookUrl')}:
                            </span>{' '}
                            {safeUrl}
                        </p>
                        <p className='text-muted-foreground'>
                            <span className='text-foreground/80 font-semibold'>
                                {t('lifecycleHooks.form.content')}:
                            </span>{' '}
                            {content || t('lifecycleHooks.discord.contentEmpty')}
                        </p>
                        <p className='text-muted-foreground'>
                            <span className='text-foreground/80 font-semibold'>Embeds:</span> {embeds}
                        </p>
                    </div>
                );
            }

            if (step.task_type === 'container_command') {
                const command = typeof parsed.command === 'string' ? parsed.command : '';
                return (
                    <code className='text-xs break-all whitespace-pre-wrap'>
                        {command || t('lifecycleHooks.payloadUnavailable')}
                    </code>
                );
            }

            const method = typeof parsed.method === 'string' ? parsed.method.toUpperCase() : 'GET';
            const url = typeof parsed.url === 'string' ? parsed.url : '';
            return (
                <div className='space-y-1 text-xs'>
                    <p className='text-muted-foreground'>
                        <span className='text-foreground/80 font-semibold'>{t('lifecycleHooks.form.method')}:</span>{' '}
                        {method}
                    </p>
                    <p className='text-muted-foreground break-all'>
                        <span className='text-foreground/80 font-semibold'>{t('lifecycleHooks.form.url')}:</span>{' '}
                        {url || t('lifecycleHooks.payloadUnavailable')}
                    </p>
                </div>
            );
        },
        [t],
    );

    const mutationsAllowed = featureEnabled && canUpdate;

    if (permissionsLoading || (!hasLoaded && loading)) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }
    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black tracking-tight uppercase'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <>
            <WidgetRenderer widgets={getWidgets('server-lifecycle-hooks', 'top-of-page')} />
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('lifecycleHooks.title')}
                    description={t('lifecycleHooks.description')}
                    actions={
                        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3'>
                            <Button variant='glass' size='sm' onClick={fetchHooks} disabled={loading}>
                                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                {t('common.refresh')}
                            </Button>
                            <Button variant='glass' size='sm' onClick={exportHooks} disabled={loading}>
                                <Download className='mr-2 h-4 w-4' />
                                {t('lifecycleHooks.export')}
                            </Button>
                            {mutationsAllowed ? (
                                <>
                                    <input
                                        ref={fileInputRef}
                                        type='file'
                                        accept='application/json,.json'
                                        className='hidden'
                                        onChange={(event) => {
                                            const file = event.target.files?.[0];
                                            if (file) {
                                                void importHooks(file);
                                            }
                                            event.currentTarget.value = '';
                                        }}
                                    />
                                    <Button
                                        variant='glass'
                                        size='sm'
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={importing}
                                    >
                                        <Upload className='mr-2 h-4 w-4' />
                                        {importing ? t('common.loading') : t('lifecycleHooks.import')}
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    }
                />

                {!featureEnabled ? (
                    <PageCard variant='warning' title={t('lifecycleHooks.featureDisabledTitle')} icon={Settings2}>
                        <p className='text-muted-foreground text-sm'>{t('lifecycleHooks.featureDisabledBody')}</p>
                    </PageCard>
                ) : null}

                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    {(['pre_start', 'pre_stop'] as LifecycleHookType[]).map((hookType) => (
                        <ResourceCard
                            key={hookType}
                            icon={Power}
                            onClick={() => setSelectedHookType(hookType)}
                            className={selectedHookType === hookType ? 'ring-primary/40 border-primary/40 ring-1' : ''}
                            iconWrapperClassName={selectedHookType === hookType ? 'bg-primary/20' : undefined}
                            title={hookLabels[hookType]}
                            description={t('lifecycleHooks.configuredSteps', {
                                count: String(hooks[hookType].steps.length),
                            })}
                            badges={[
                                {
                                    label: hooks[hookType].is_active === 1 ? t('common.enabled') : t('common.disabled'),
                                    className:
                                        hooks[hookType].is_active === 1
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-white/5 text-muted-foreground border-white/10',
                                },
                                ...(selectedHookType === hookType
                                    ? [
                                          {
                                              label: t('lifecycleHooks.selected'),
                                              className: 'bg-primary/20 text-primary border-primary/30',
                                          },
                                      ]
                                    : []),
                            ]}
                            actions={
                                mutationsAllowed ? (
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            type='button'
                                            loading={togglingHookType === hookType}
                                            disabled={togglingHookType !== null}
                                            onClick={() =>
                                                updateHookActive(hookType, hooks[hookType].is_active === 1 ? 0 : 1)
                                            }
                                        >
                                            {hooks[hookType].is_active === 1 ? t('common.disable') : t('common.enable')}
                                        </Button>
                                    </div>
                                ) : undefined
                            }
                        />
                    ))}
                </div>

                <div className='border-border/30 bg-card/40 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3'>
                    <p className='text-sm font-medium'>
                        {t('lifecycleHooks.currentlyManaging', { hookType: hookLabels[selectedHookType] })}
                    </p>
                    {mutationsAllowed ? (
                        <Button type='button' size='sm' onClick={goCreateStep}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('lifecycleHooks.addStep')}
                        </Button>
                    ) : null}
                </div>

                {sortedSteps.length === 0 ? (
                    <EmptyState
                        title={t('lifecycleHooks.noSteps')}
                        description={
                            mutationsAllowed
                                ? t('lifecycleHooks.noStepsDescription')
                                : t('lifecycleHooks.noStepsReadOnly')
                        }
                        icon={ListCheck}
                        action={
                            mutationsAllowed ? (
                                <Button type='button' onClick={goCreateStep}>
                                    <Plus className='mr-2 h-4 w-4' />
                                    {t('lifecycleHooks.addStep')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {sortedSteps.map((step) => (
                            <ResourceCard
                                key={step.id}
                                icon={ListCheck}
                                title={taskTypeLabels[step.task_type]}
                                description={summarizeStepPayload(step)}
                                badges={[
                                    {
                                        label: `#${step.sequence_id}`,
                                        className: 'bg-white/5 border-white/10 text-muted-foreground',
                                    },
                                    ...(step.continue_on_failure === 1
                                        ? [
                                              {
                                                  label: t('lifecycleHooks.continueOnFailure'),
                                                  className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                                              },
                                          ]
                                        : []),
                                ]}
                                actions={
                                    mutationsAllowed ? (
                                        <div className='flex items-center gap-2'>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                type='button'
                                                onClick={() => handleMoveStep(step, -1)}
                                            >
                                                <ChevronUp className='h-3.5 w-3.5' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                type='button'
                                                onClick={() => handleMoveStep(step, 1)}
                                            >
                                                <ChevronDown className='h-3.5 w-3.5' />
                                            </Button>
                                            <Button
                                                type='button'
                                                size='sm'
                                                variant='glass'
                                                onClick={() => goEditStep(step)}
                                            >
                                                <Pencil className='h-3.5 w-3.5' />
                                            </Button>
                                            <Button
                                                type='button'
                                                size='sm'
                                                variant='destructive'
                                                onClick={() => {
                                                    setSelectedStep(step);
                                                    setIsDeleteOpen(true);
                                                }}
                                            >
                                                <Trash2 className='h-3.5 w-3.5' />
                                            </Button>
                                        </div>
                                    ) : undefined
                                }
                            />
                        ))}
                    </div>
                )}

                <HeadlessModal
                    isOpen={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={t('lifecycleHooks.deleteModalTitle')}
                    description={t('lifecycleHooks.deleteModalDescription')}
                >
                    <div className='flex justify-end gap-2 pt-4'>
                        <Button variant='glass' onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant='destructive' onClick={handleDeleteStep} loading={deleting} disabled={deleting}>
                            {t('common.delete')}
                        </Button>
                    </div>
                </HeadlessModal>
            </div>
            <WidgetRenderer widgets={getWidgets('server-lifecycle-hooks', 'bottom-of-page')} />
        </>
    );
}
