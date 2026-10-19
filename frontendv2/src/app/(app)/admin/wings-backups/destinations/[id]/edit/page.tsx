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
import { toast } from 'sonner';
import { ArrowLeft, HardDrive } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { PageLoading } from '@/components/featherui/PageLoading';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useTranslation } from '@/contexts/TranslationContext';
import { safeBack } from '@/lib/safe-back';
import {
    DestinationFormFields,
    emptyDestinationForm,
    type DestinationFormState,
    type DestinationType,
} from '@/components/admin/wings-backups/DestinationFormFields';
import { UnsavedChangesBar } from '@/components/featherui/UnsavedChangesBar';
import { useFormBaseline } from '@/hooks/useFormBaseline';

export default function EditWingsBackupDestinationPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);
    const [form, setForm] = React.useState<DestinationFormState>(emptyDestinationForm);
    const { dirty: unsaved, markClean, restore: restoreForm } = useFormBaseline(form);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get('/api/admin/wings-backups/destinations', { params: { limit: 100 } });
                const dest = (data?.data?.destinations ?? []).find((d: { id: number }) => d.id === id);
                if (!dest) throw new Error('not found');
                setForm((prev) => ({
                    ...prev,
                    name: dest.name ?? '',
                    type: (dest.type as DestinationType) || 'sftp',
                    base_path: dest.base_path ?? '',
                }));
                markClean();
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.destinationLoadFailed'));
                router.push('/admin/wings-backups');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, router, t, markClean]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!form.name.trim()) {
            toast.error(t('adminWingsBackups.nameRequired'));
            return;
        }
        setSaving(true);
        try {
            await axios.patch(`/api/admin/wings-backups/destinations/${id}`, {
                name: form.name.trim(),
                base_path: form.base_path,
            });
            toast.success(t('adminWingsBackups.destinationUpdateSuccess'));
            router.push('/admin/wings-backups');
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.destinationUpdateFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoading />;

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminWingsBackups.destinationEditTitle')}
                description={t('adminWingsBackups.destinationEditDescription', { id: String(id) })}
                icon={HardDrive}
                actions={
                    <Button variant='outline' onClick={() => safeBack(router, '/admin/wings-backups')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('common.back')}
                    </Button>
                }
            />
            <form onSubmit={handleSubmit} className='space-y-6' data-fp-save-shortcut>
                <DestinationFormFields form={form} setForm={setForm} disabled={saving} editMode />
                <div className='fp-surface sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border p-4'>
                    <Button type='button' variant='outline' onClick={() => safeBack(router, '/admin/wings-backups')}>
                        {t('common.cancel')}
                    </Button>
                    <Button type='submit' disabled={saving || !form.name.trim()}>
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </div>
            </form>

            <UnsavedChangesBar
                dirty={unsaved}
                saving={saving}
                onSave={() => void handleSubmit()}
                onDiscard={() => {
                    const saved = restoreForm();
                    if (saved) setForm(saved);
                }}
            />
        </div>
    );
}
