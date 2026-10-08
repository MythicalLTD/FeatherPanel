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
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { PageLoading } from '@/components/featherui/PageLoading';
import { toast } from 'sonner';
import { Archive, ArrowLeft, History } from 'lucide-react';
import { safeBack } from '@/lib/safe-back';
import {
    BackupScheduleFormFields,
    buildScheduleRequestBody,
    emptyBackupScheduleForm,
    formFromPolicy,
} from '@/components/admin/backup-schedules/BackupScheduleFormFields';

export default function EditBackupSchedulePage() {
    const { id } = useParams() as { id: string };
    const { t } = useTranslation();
    const router = useRouter();
    const [form, setForm] = React.useState(emptyBackupScheduleForm());
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axios.get(`/api/admin/backup-schedules/${id}`);
                if (!cancelled && data?.data?.policy) {
                    setForm(formFromPolicy(data.data.policy));
                }
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'adminBackupSchedules.loadFailed'));
                router.push('/admin/backup-schedules');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, router, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const body = buildScheduleRequestBody(form);
        if (!body) {
            toast.error(t('adminBackupSchedules.invalidPayload'));
            return;
        }
        if (!form.name.trim()) {
            toast.error(t('adminBackupSchedules.nameRequired'));
            return;
        }
        if (form.scope_type === 'servers' && form.server_ids.length === 0) {
            toast.error(t('adminBackupSchedules.serversRequired'));
            return;
        }
        if (form.scope_type === 'node' && !form.node_id) {
            toast.error(t('adminBackupSchedules.nodeRequired'));
            return;
        }
        setSaving(true);
        try {
            await axios.patch(`/api/admin/backup-schedules/${id}`, body);
            toast.success(t('adminBackupSchedules.updateSuccess'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminBackupSchedules.updateFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoading />;

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminBackupSchedules.editTitle')}
                description={form.name}
                icon={Archive}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={() => router.push(`/admin/backup-schedules/${id}/runs`)}>
                            <History className='mr-2 h-4 w-4' />
                            {t('adminBackupSchedules.history')}
                        </Button>
                        <Button variant='outline' onClick={() => safeBack(router, '/admin/backup-schedules')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                    </div>
                }
            />
            <form onSubmit={handleSubmit} className='space-y-6' data-fp-save-shortcut>
                <BackupScheduleFormFields form={form} setForm={setForm} disabled={saving} />
                <div className='bg-card/40 border-border/50 sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border p-4 shadow-sm backdrop-blur-md'>
                    <Button type='button' variant='outline' onClick={() => safeBack(router, '/admin/backup-schedules')}>
                        {t('common.cancel')}
                    </Button>
                    <Button type='submit' disabled={saving}>
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
