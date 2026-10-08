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
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { toast } from 'sonner';
import { Archive, ArrowLeft } from 'lucide-react';
import { safeBack } from '@/lib/safe-back';
import {
    BackupScheduleFormFields,
    buildScheduleRequestBody,
    emptyBackupScheduleForm,
} from '@/components/admin/backup-schedules/BackupScheduleFormFields';
import { useUserTimezone } from '@/contexts/PreferencesContext';

export default function CreateBackupSchedulePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const userTimezone = useUserTimezone();
    const [form, setForm] = React.useState(() => emptyBackupScheduleForm(userTimezone || 'UTC'));
    const [saving, setSaving] = React.useState(false);

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
            const { data } = await axios.put('/api/admin/backup-schedules', body);
            toast.success(t('adminBackupSchedules.createSuccess'));
            const id = data?.data?.policy_id;
            router.push(id ? `/admin/backup-schedules/${id}/runs` : '/admin/backup-schedules');
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminBackupSchedules.createFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminBackupSchedules.createTitle')}
                description={t('adminBackupSchedules.createDescription')}
                icon={Archive}
                actions={
                    <Button variant='outline' onClick={() => safeBack(router, '/admin/backup-schedules')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('common.back')}
                    </Button>
                }
            />
            <form onSubmit={handleSubmit} className='space-y-6' data-fp-save-shortcut>
                <BackupScheduleFormFields form={form} setForm={setForm} disabled={saving} />
                <div className='bg-card/40 border-border/50 sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border p-4 shadow-sm backdrop-blur-md'>
                    <Button type='button' variant='outline' onClick={() => safeBack(router, '/admin/backup-schedules')}>
                        {t('common.cancel')}
                    </Button>
                    <Button type='submit' disabled={saving}>
                        {saving ? t('common.saving') : t('adminBackupSchedules.create')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
