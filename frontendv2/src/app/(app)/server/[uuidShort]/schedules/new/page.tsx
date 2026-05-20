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
import { useParams, useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Calendar, Plus, ExternalLink, Lock } from 'lucide-react';

import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { isEnabled } from '@/lib/utils';
import { listSupportedTimezones } from '@/lib/dateUtils';
import { useUserTimezone } from '@/contexts/PreferencesContext';
import type { ScheduleCreateRequest } from '@/types/server';

export default function CreateSchedulePage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { loading: settingsLoading, settings } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const canCreate = hasPermission('schedule.create');
    const userTimezone = useUserTimezone();

    const [saving, setSaving] = React.useState(false);

    const [formData, setFormData] = React.useState<ScheduleCreateRequest>({
        name: '',
        cron_minute: '*/5',
        cron_hour: '*',
        cron_day_of_month: '*',
        cron_month: '*',
        cron_day_of_week: '*',
        timezone: userTimezone || 'UTC',
        only_when_online: 0,
        is_active: 1,
    });

    React.useEffect(() => {
        // Reflect a late-arriving user preference (PreferencesContext loads
        // asynchronously on the first paint) into the form's default zone,
        // but only while the user hasn't manually changed it.
        setFormData((prev) =>
            prev.timezone === 'UTC' && userTimezone && userTimezone !== 'UTC'
                ? { ...prev, timezone: userTimezone }
                : prev,
        );
    }, [userTimezone]);

    const timezoneOptions = React.useMemo(() => listSupportedTimezones().map((tz) => ({ id: tz, name: tz })), []);

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-schedules-new');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error(t('serverSchedules.nameRequired'));
            return;
        }

        setSaving(true);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/schedules`, formData);
            if (data?.success) {
                toast.success(t('serverSchedules.createSuccess'));
                router.push(`/server/${uuidShort}/schedules`);
            } else {
                toast.error(data?.message || t('serverSchedules.createFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSchedules.createFailed');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    React.useEffect(() => {
        if (!settingsLoading && !isEnabled(settings?.server_allow_schedules)) {
            router.push(`/server/${uuidShort}/schedules`);
            toast.error(t('serverSchedules.disabled'));
        }
    }, [uuidShort, settings?.server_allow_schedules, t, router, settingsLoading]);

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    if (permissionsLoading || settingsLoading) return null;

    if (!canCreate) {
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
        <div className='mx-auto max-w-4xl space-y-8 pb-16'>
            <PageHeader
                title={t('serverSchedules.createSchedule')}
                description={t('serverSchedules.createScheduleDescription')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => router.back()}
                            disabled={saving}
                            className='order-2 sm:order-1'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            variant='default'
                            onClick={handleCreate}
                            disabled={saving}
                            loading={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('serverSchedules.create')}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-schedules-new', 'after-header')} />

            <form onSubmit={handleCreate} className='space-y-8'>
                <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <Calendar className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {t('serverSchedules.name')}
                            </h2>
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                Basic Info
                            </p>
                        </div>
                    </div>

                    <div className='space-y-2.5'>
                        <Label
                            htmlFor='schedule-name'
                            className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'
                        >
                            {t('serverSchedules.name')} <span className='text-primary'>*</span>
                        </Label>
                        <Input
                            id='schedule-name'
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('serverSchedules.namePlaceholder')}
                            disabled={saving}
                            required
                        />
                        <p className='text-muted-foreground ml-1 text-xs'>{t('serverSchedules.nameHelp')}</p>
                    </div>
                </div>

                <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                    <div className='border-border/10 flex items-center justify-between border-b pb-6'>
                        <div className='flex items-center gap-4'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <Calendar className='text-primary h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {t('serverSchedules.cronExpression')}
                                </h2>
                                <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                    Schedule Timing
                                </p>
                            </div>
                        </div>
                        <a
                            href='https://cron.help/'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-primary flex items-center gap-1 text-xs font-bold hover:underline'
                        >
                            <ExternalLink className='h-3 w-3' />
                            {t('serverSchedules.cronHelper')}
                        </a>
                    </div>

                    <div className='grid grid-cols-5 gap-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='cron-minute' className='text-xs font-medium'>
                                {t('serverSchedules.minute')}
                            </Label>
                            <Input
                                id='cron-minute'
                                value={formData.cron_minute}
                                onChange={(e) => setFormData({ ...formData, cron_minute: e.target.value })}
                                placeholder='*/5'
                                className='bg-secondary/50 border-border/10 font-mono'
                                disabled={saving}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='cron-hour' className='text-xs font-medium'>
                                {t('serverSchedules.hour')}
                            </Label>
                            <Input
                                id='cron-hour'
                                value={formData.cron_hour}
                                onChange={(e) => setFormData({ ...formData, cron_hour: e.target.value })}
                                placeholder='*'
                                className='bg-secondary/50 border-border/10 font-mono'
                                disabled={saving}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='cron-day' className='text-xs font-medium'>
                                {t('serverSchedules.dayOfMonth')}
                            </Label>
                            <Input
                                id='cron-day'
                                value={formData.cron_day_of_month}
                                onChange={(e) => setFormData({ ...formData, cron_day_of_month: e.target.value })}
                                placeholder='*'
                                className='bg-secondary/50 border-border/10 font-mono'
                                disabled={saving}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='cron-month' className='text-xs font-medium'>
                                {t('serverSchedules.month')}
                            </Label>
                            <Input
                                id='cron-month'
                                value={formData.cron_month}
                                onChange={(e) => setFormData({ ...formData, cron_month: e.target.value })}
                                placeholder='*'
                                className='bg-secondary/50 border-border/10 font-mono'
                                disabled={saving}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='cron-weekday' className='text-xs font-medium'>
                                {t('serverSchedules.dayOfWeek')}
                            </Label>
                            <Input
                                id='cron-weekday'
                                value={formData.cron_day_of_week}
                                onChange={(e) => setFormData({ ...formData, cron_day_of_week: e.target.value })}
                                placeholder='*'
                                className='bg-secondary/50 border-border/10 font-mono'
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <p className='text-muted-foreground text-xs'>{t('serverSchedules.cronHelp')}</p>

                    <div className='space-y-2.5'>
                        <Label
                            htmlFor='schedule-timezone'
                            className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'
                        >
                            {t('serverSchedules.timezone')}
                        </Label>
                        <HeadlessSelect
                            value={formData.timezone}
                            onChange={(val) => setFormData({ ...formData, timezone: String(val) })}
                            options={timezoneOptions}
                            disabled={saving}
                            buttonClassName='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all'
                        />
                        <p className='text-muted-foreground ml-1 text-xs'>{t('serverSchedules.timezoneHelp')}</p>
                    </div>
                </div>

                <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <Calendar className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {t('serverSchedules.options')}
                            </h2>
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                {t('serverSchedules.configuration')}
                            </p>
                        </div>
                    </div>

                    <div className='space-y-6'>
                        <div className='space-y-2.5'>
                            <Label htmlFor='only-when-online' className='text-sm font-medium'>
                                {t('serverSchedules.onlyWhenOnline')}
                            </Label>
                            <HeadlessSelect
                                value={String(formData.only_when_online)}
                                onChange={(val) => setFormData({ ...formData, only_when_online: Number(val) })}
                                options={[
                                    { id: '0', name: t('serverSchedules.runRegardless') },
                                    { id: '1', name: t('serverSchedules.runOnlyOnline') },
                                ]}
                                disabled={saving}
                                buttonClassName='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all'
                            />
                            <p className='text-muted-foreground ml-1 text-xs'>
                                {t('serverSchedules.onlyWhenOnlineHelp')}
                            </p>
                        </div>

                        <div className='space-y-2.5'>
                            <Label htmlFor='schedule-enabled' className='text-sm font-medium'>
                                {t('serverSchedules.scheduleEnabled')}
                            </Label>
                            <HeadlessSelect
                                value={String(formData.is_active)}
                                onChange={(val) => setFormData({ ...formData, is_active: Number(val) })}
                                options={[
                                    { id: '1', name: 'Enabled - Schedule will run automatically' },
                                    { id: '0', name: 'Disabled - Schedule will not run' },
                                ]}
                                disabled={saving}
                                buttonClassName='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all'
                            />
                            <p className='text-muted-foreground ml-1 text-xs'>
                                {t('serverSchedules.scheduleEnabledHelp')}
                            </p>
                        </div>
                    </div>
                </div>

                <div className='flex flex-col gap-3 md:hidden'>
                    <Button
                        type='submit'
                        size='default'
                        variant='default'
                        disabled={saving}
                        loading={saving}
                        className='w-full text-[10px]'
                    >
                        <Plus className='mr-2 h-4 w-4' />
                        {t('serverSchedules.create')}
                    </Button>
                    <Button
                        type='button'
                        variant='glass'
                        size='default'
                        onClick={() => router.back()}
                        disabled={saving}
                        className='w-full text-[10px]'
                    >
                        {t('common.cancel')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
