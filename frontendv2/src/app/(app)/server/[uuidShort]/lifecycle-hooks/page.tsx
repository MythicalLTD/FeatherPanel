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

const EMPTY_HOOKS: Record<LifecycleHookType, LifecycleHook> = {
    pre_start: { id: null, server_id: 0, hook_type: 'pre_start', is_active: 0, steps: [] },
    pre_stop: { id: null, server_id: 0, hook_type: 'pre_stop', is_active: 0, steps: [] },
};

export default function ServerLifecycleHooksPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
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

    const selectedHook = hooks[selectedHookType];
    const sortedSteps = React.useMemo(
        () => [...(selectedHook?.steps || [])].sort((a, b) => a.sequence_id - b.sequence_id),
        [selectedHook],
    );

    const mutationsAllowed = featureEnabled && canUpdate;

    if (permissionsLoading || (!hasLoaded && loading)) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>{t('common.loading')}</p>
            </div>
        );
    }
    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black uppercase tracking-tight'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className='space-y-8 pb-12'>
            <PageHeader
                title={t('lifecycleHooks.title')}
                description={t('lifecycleHooks.description')}
                actions={
                    <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
                        <Button variant='glass' size='sm' onClick={fetchHooks} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('common.refresh')}
                        </Button>
                    </div>
                }
            />

            {!featureEnabled ? (
                <PageCard variant='warning' title={t('lifecycleHooks.featureDisabledTitle')} icon={Settings2}>
                    <p className='text-sm text-muted-foreground'>{t('lifecycleHooks.featureDisabledBody')}</p>
                </PageCard>
            ) : null}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {(['pre_start', 'pre_stop'] as LifecycleHookType[]).map((hookType) => (
                    <ResourceCard
                        key={hookType}
                        icon={Power}
                        onClick={() => setSelectedHookType(hookType)}
                        className={selectedHookType === hookType ? 'ring-1 ring-primary/40 border-primary/40' : ''}
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

            <div className='rounded-2xl border border-border/30 bg-card/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2'>
                <p className='text-sm font-medium'>
                    {t('lifecycleHooks.currentlyManaging', { hookType: hookLabels[selectedHookType] })}
                </p>
                {mutationsAllowed ? (
                    <Button type='button' size='sm' onClick={goCreateStep}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('lifecycleHooks.addStep')}
                    </Button>
                ) : null}
            </div>

            {sortedSteps.length === 0 ? (
                <EmptyState
                    title={t('lifecycleHooks.noSteps')}
                    description={
                        mutationsAllowed ? t('lifecycleHooks.noStepsDescription') : t('lifecycleHooks.noStepsReadOnly')
                    }
                    icon={ListCheck}
                    action={
                        mutationsAllowed ? (
                            <Button type='button' onClick={goCreateStep}>
                                <Plus className='h-4 w-4 mr-2' />
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
                            description={<code className='text-xs'>{step.payload}</code>}
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
    );
}
