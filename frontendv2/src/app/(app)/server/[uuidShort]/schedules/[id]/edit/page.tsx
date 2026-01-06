/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Calendar, Save, ExternalLink, Lock } from 'lucide-react';

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
import type { Schedule, ScheduleUpdateRequest } from '@/types/server';

export default function EditSchedulePage() {
    const { uuidShort, id } = useParams() as { uuidShort: string; id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { loading: settingsLoading, settings } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);

    const canUpdate = hasPermission('schedule.update');

    // State
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [schedule, setSchedule] = React.useState<Schedule | null>(null);

    // Form State
    const [formData, setFormData] = React.useState<ScheduleUpdateRequest>({
        name: '',
        cron_minute: '*/5',
        cron_hour: '*',
        cron_day_of_month: '*',
        cron_month: '*',
        cron_day_of_week: '*',
        only_when_online: 0,
        is_active: 1,
    });

    // Widgets
    const { getWidgets, fetchWidgets } = usePluginWidgets('server-schedules-edit');

    // Fetch schedule data
    React.useEffect(() => {
        const fetchSchedule = async () => {
            if (!uuidShort || !id) return;
            setLoading(true);
            try {
                const { data } = await axios.get<{ success: boolean; data: Schedule }>(
                    `/api/user/servers/${uuidShort}/schedules/${id}`,
                );
                if (data?.success && data?.data) {
                    const scheduleData = data.data;
                    setSchedule(scheduleData);
                    setFormData({
                        name: scheduleData.name,
                        cron_minute: scheduleData.cron_minute,
                        cron_hour: scheduleData.cron_hour,
                        cron_day_of_month: scheduleData.cron_day_of_month,
                        cron_month: scheduleData.cron_month,
                        cron_day_of_week: scheduleData.cron_day_of_week,
                        only_when_online: scheduleData.only_when_online,
                        is_active: scheduleData.is_active,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch schedule:', error);
                toast.error('Failed to load schedule');
                router.push(`/server/${uuidShort}/schedules`);
            } finally {
                setLoading(false);
            }
        };

        if (canUpdate) {
            fetchSchedule();
        } else if (!permissionsLoading && !canUpdate) {
            router.push(`/server/${uuidShort}/schedules`);
        }
    }, [uuidShort, id, canUpdate, permissionsLoading, router, settings?.server_allow_schedules]);

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    // Handlers
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Schedule name is required');
            return;
        }

        setSaving(true);
        try {
            const { data } = await axios.put(`/api/user/servers/${uuidShort}/schedules/${id}`, formData);
            if (data?.success) {
                toast.success(t('serverSchedules.updateSuccess'));
                router.push(`/server/${uuidShort}/schedules`);
            } else {
                toast.error(data?.message || t('serverSchedules.updateFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSchedules.updateFailed');
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (permissionsLoading || settingsLoading || loading) return null;

    if (!canUpdate) {
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

    if (!schedule) {
        return null;
    }

    return (
        <div className='max-w-4xl mx-auto space-y-8 pb-16 '>
            {/* Navigation Header */}
            <PageHeader
                title={t('serverSchedules.editSchedule')}
                description={t('serverSchedules.editScheduleDescription')}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='glass' size='default' onClick={() => router.back()} disabled={saving}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            variant='default'
                            onClick={handleUpdate}
                            disabled={saving}
                            loading={saving}
                        >
                            <Save className='h-4 w-4 mr-2' />
                            {t('serverSchedules.update')}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-schedules-edit', 'after-header')} />

            {/* Form */}
            <form onSubmit={handleUpdate} className='space-y-8'>
                {/* Background Effect */}
                <div className='fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none -z-10' />
                {/* Schedule Name */}
                <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Calendar className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black uppercase tracking-tight italic'>
                                {t('serverSchedules.name')}
                            </h2>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                Basic Info
                            </p>
                        </div>
                    </div>

                    <div className='space-y-2.5'>
                        <Label
                            htmlFor='schedule-name'
                            className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'
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
                        <p className='text-xs text-muted-foreground ml-1'>{t('serverSchedules.nameHelp')}</p>
                    </div>
                </div>

                {/* Cron Expression */}
                <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm'>
                    <div className='flex items-center justify-between border-b border-border/10 pb-6'>
                        <div className='flex items-center gap-4'>
                            <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                                <Calendar className='h-5 w-5 text-primary' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black uppercase tracking-tight italic'>
                                    {t('serverSchedules.cronExpression')}
                                </h2>
                                <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                    Schedule Timing
                                </p>
                            </div>
                        </div>
                        <a
                            href='https://cron.help/'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-xs text-primary hover:underline flex items-center gap-1 font-bold'
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
                                className='font-mono bg-secondary/50 border-border/10'
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
                                className='font-mono bg-secondary/50 border-border/10'
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
                                className='font-mono bg-secondary/50 border-border/10'
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
                                className='font-mono bg-secondary/50 border-border/10'
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
                                className='font-mono bg-secondary/50 border-border/10'
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <p className='text-xs text-muted-foreground'>{t('serverSchedules.cronHelp')}</p>
                </div>

                {/* Options */}
                <div className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl p-8 space-y-6 shadow-sm'>
                    <div className='flex items-center gap-4 border-b border-border/10 pb-6'>
                        <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                            <Calendar className='h-5 w-5 text-primary' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black uppercase tracking-tight italic'>Options</h2>
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50'>
                                Configuration
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
                                    { id: '0', name: 'No - Run regardless of server status' },
                                    { id: '1', name: 'Yes - Only run when server is online' },
                                ]}
                                disabled={saving}
                                buttonClassName='h-12 bg-secondary/50 border-border/10 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all'
                            />
                            <p className='text-xs text-muted-foreground ml-1'>
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
                            <p className='text-xs text-muted-foreground ml-1'>
                                {t('serverSchedules.scheduleEnabledHelp')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mobile Actions */}
                <div className='md:hidden flex flex-col gap-3'>
                    <Button
                        type='submit'
                        size='default'
                        variant='default'
                        disabled={saving}
                        loading={saving}
                        className='w-full text-[10px]'
                    >
                        <Save className='h-4 w-4 mr-2' />
                        {t('serverSchedules.update')}
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
