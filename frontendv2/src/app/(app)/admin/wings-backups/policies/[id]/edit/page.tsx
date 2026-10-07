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
    PolicyFormFields,
    emptyPolicyForm,
    formFromPolicy,
    type PolicyFormState,
} from '@/components/admin/wings-backups/PolicyFormFields';

export default function EditWingsBackupPolicyPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);
    const [form, setForm] = React.useState<PolicyFormState>(emptyPolicyForm);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get(`/api/admin/wings-backups/policies/${id}`);
                const p = data?.data?.policy;
                if (!p) throw new Error('not found');
                setForm(formFromPolicy(p));
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.policyLoadFailed'));
                router.push('/admin/wings-backups');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, router, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error(t('adminWingsBackups.nameRequired'));
            return;
        }
        setSaving(true);
        try {
            await axios.patch(`/api/admin/wings-backups/policies/${id}`, {
                name: form.name.trim(),
                mode: form.mode,
                retention_days: form.retention_days,
                is_active: form.is_active,
            });
            toast.success(t('adminWingsBackups.policyUpdateSuccess'));
            router.push('/admin/wings-backups');
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.policyUpdateFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoading />;

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminWingsBackups.policyEditTitle')}
                description={t('adminWingsBackups.policyEditDescription', { id: String(id) })}
                icon={HardDrive}
                actions={
                    <Button variant='outline' onClick={() => safeBack(router, '/admin/wings-backups')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('common.back')}
                    </Button>
                }
            />
            <form onSubmit={handleSubmit} className='space-y-6'>
                <PolicyFormFields form={form} setForm={setForm} disabled={saving} editMode />
                <div className='bg-card/40 border-border/50 sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border p-4 shadow-sm backdrop-blur-md'>
                    <Button type='button' variant='outline' onClick={() => safeBack(router, '/admin/wings-backups')}>
                        {t('common.cancel')}
                    </Button>
                    <Button type='submit' disabled={saving || !form.name.trim()}>
                        {saving ? t('common.saving') : t('common.save')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
