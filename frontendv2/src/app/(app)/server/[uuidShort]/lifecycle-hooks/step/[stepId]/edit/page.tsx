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
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Lock, Loader2, Power } from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { LifecycleStepForm } from '../../../LifecycleStepForm';
import {
    deserializeLifecyclePayload,
    discordWebhookHasRenderablePayload,
    serializeLifecyclePayload,
    type StepFormState,
} from '../../../form-utils';
import type { LifecycleHookStep, LifecycleHookType } from '@/types/server';

type HooksApi = {
    success: boolean;
    data: {
        feature_enabled: boolean;
        hooks: Array<{
            hook_type: LifecycleHookType;
            steps: LifecycleHookStep[];
        }>;
    };
};

export default function EditLifecycleHookStepPage() {
    const { uuidShort, stepId: stepIdParam } = useParams() as { uuidShort: string; stepId: string };
    const { fetchWidgets, getWidgets } = usePluginWidgets('server-lifecycle-step-edit');
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const canRead = hasPermission('schedule.read');
    const canUpdate = hasPermission('schedule.update');

    const hookParam = searchParams.get('hook');
    const hookType: LifecycleHookType = hookParam === 'pre_stop' || hookParam === 'pre_start' ? hookParam : 'pre_start';

    const stepId = Number.parseInt(stepIdParam, 10);

    const [loading, setLoading] = React.useState(true);
    const [featureEnabled, setFeatureEnabled] = React.useState(false);
    const [form, setForm] = React.useState<StepFormState | null>(null);
    const [saving, setSaving] = React.useState(false);

    const hookLabels: Record<LifecycleHookType, string> = React.useMemo(
        () => ({
            pre_start: t('lifecycleHooks.hookTypes.preStart'),
            pre_stop: t('lifecycleHooks.hookTypes.preStop'),
        }),
        [t],
    );

    const back = React.useCallback(() => {
        router.push(`/server/${uuidShort}/lifecycle-hooks`);
    }, [router, uuidShort]);

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const { data } = await axios.get<HooksApi>(`/api/user/servers/${uuidShort}/lifecycle-hooks`);
                if (!cancelled && data.success) {
                    setFeatureEnabled(Boolean(data.data.feature_enabled));
                    const hook = data.data.hooks.find((h) => h.hook_type === hookType);
                    const step = hook?.steps?.find((s) => s.id === stepId);
                    if (step) {
                        setForm(deserializeLifecyclePayload(step));
                    } else {
                        setForm(null);
                    }
                }
            } catch {
                if (!cancelled) toast.error(t('lifecycleHooks.messages.fetchFailed'));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        if (!Number.isNaN(stepId) && stepId > 0) {
            void load();
        } else {
            setLoading(false);
            setForm(null);
        }
        return () => {
            cancelled = true;
        };
    }, [uuidShort, hookType, stepId, t]);

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;

        if (form.task_type === 'discord_webhook' && form.discord_url.trim() === '') {
            toast.error(t('lifecycleHooks.messages.webhookUrlRequired'));
            return;
        }
        if (form.task_type === 'discord_webhook' && !discordWebhookHasRenderablePayload(form)) {
            toast.error(t('lifecycleHooks.messages.discordNeedsContentOrEmbed'));
            return;
        }
        if (form.task_type === 'container_command' && form.container_command.trim() === '') {
            toast.error(t('lifecycleHooks.messages.commandRequired'));
            return;
        }
        if (form.task_type === 'http_request' && form.http_url.trim() === '') {
            toast.error(t('lifecycleHooks.messages.urlRequired'));
            return;
        }

        try {
            if (form.task_type === 'http_request') {
                if (form.http_headers_json.trim() !== '') JSON.parse(form.http_headers_json);
                if (form.http_query_json.trim() !== '') JSON.parse(form.http_query_json);
            }
        } catch {
            toast.error(t('lifecycleHooks.messages.invalidJson'));
            return;
        }

        setSaving(true);
        try {
            const payload = serializeLifecyclePayload(form);
            const { data } = await axios.put(
                `/api/user/servers/${uuidShort}/lifecycle-hooks/${hookType}/steps/${stepId}`,
                {
                    task_type: form.task_type,
                    continue_on_failure: form.continue_on_failure,
                    payload,
                },
            );
            if (data.success) {
                toast.success(t('lifecycleHooks.messages.stepUpdated'));
                router.push(`/server/${uuidShort}/lifecycle-hooks`);
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || t('lifecycleHooks.messages.stepUpdateFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (permissionsLoading || loading) {
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
                <Lock className='mb-4 h-10 w-10 text-red-500' />
                <p className='text-muted-foreground'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-6' type='button' onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    if (!Number.isFinite(stepId) || stepId <= 0 || !form) {
        return (
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('lifecycleHooks.stepEdit.notFoundTitle')}
                    description={t('lifecycleHooks.stepEdit.notFoundDescription')}
                    actions={
                        <Button variant='glass' size='sm' type='button' onClick={back} className='w-full sm:w-auto'>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('lifecycleHooks.backToHooks')}
                        </Button>
                    }
                />
            </div>
        );
    }

    if (!featureEnabled) {
        return (
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('lifecycleHooks.stepEdit.title', { hookType: hookLabels[hookType] })}
                    description={t('lifecycleHooks.stepEdit.description')}
                    actions={
                        <Button variant='glass' size='sm' type='button' onClick={back} className='w-full sm:w-auto'>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('lifecycleHooks.backToHooks')}
                        </Button>
                    }
                />
                <PageCard variant='warning' title={t('lifecycleHooks.featureDisabledTitle')} icon={Power}>
                    <p className='text-muted-foreground text-sm'>{t('lifecycleHooks.featureDisabledBody')}</p>
                </PageCard>
            </div>
        );
    }

    if (!canUpdate) {
        return (
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('lifecycleHooks.stepEdit.title', { hookType: hookLabels[hookType] })}
                    description={t('lifecycleHooks.stepEdit.description')}
                    actions={
                        <Button variant='glass' size='sm' type='button' onClick={back} className='w-full sm:w-auto'>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('lifecycleHooks.backToHooks')}
                        </Button>
                    }
                />
                <PageCard variant='warning' title={t('common.accessDenied')} icon={Lock}>
                    <p className='text-muted-foreground text-sm'>{t('common.noPermission')}</p>
                </PageCard>
            </div>
        );
    }

    return (
        <>
            <WidgetRenderer widgets={getWidgets('server-lifecycle-step-edit', 'top-of-page')} />
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('lifecycleHooks.stepEdit.title', { hookType: hookLabels[hookType] })}
                    description={t('lifecycleHooks.stepEdit.description')}
                    actions={
                        <Button variant='glass' size='sm' type='button' onClick={back} className='w-full sm:w-auto'>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('lifecycleHooks.backToHooks')}
                        </Button>
                    }
                />

                <PageCard
                    title={t('lifecycleHooks.stepEdit.formSectionTitle')}
                    description={t('lifecycleHooks.stepEdit.formSectionDescription')}
                    icon={Power}
                >
                    <LifecycleStepForm
                        form={form}
                        setForm={setForm as React.Dispatch<React.SetStateAction<StepFormState>>}
                        onSubmit={handleSubmit}
                        saving={saving}
                        cancelLabel={t('common.cancel')}
                        onCancel={back}
                        submitLabel={t('lifecycleHooks.form.saveStep')}
                    />
                </PageCard>
            </div>
            <WidgetRenderer widgets={getWidgets('server-lifecycle-step-edit', 'bottom-of-page')} />
        </>
    );
}
