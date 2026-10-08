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
import { toast } from 'sonner';
import { ArrowLeft, HardDrive } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useTranslation } from '@/contexts/TranslationContext';
import { safeBack } from '@/lib/safe-back';
import { useUserTimezone } from '@/contexts/PreferencesContext';
import {
    PolicyFormFields,
    buildPolicyRequestBody,
    emptyPolicyForm,
} from '@/components/admin/wings-backups/PolicyFormFields';

export default function NewWingsBackupPolicyPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const userTimezone = useUserTimezone();
    const [form, setForm] = React.useState(() => emptyPolicyForm(userTimezone || 'UTC'));
    const [saving, setSaving] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error(t('adminWingsBackups.nameRequired'));
            return;
        }
        if (!form.primary_destination_id) {
            toast.error(t('adminWingsBackups.primaryRequired'));
            return;
        }
        if (form.scope_type === 'nodes' && form.node_ids.length === 0) {
            toast.error(t('adminWingsBackups.nodesRequired'));
            return;
        }
        setSaving(true);
        try {
            await axios.put('/api/admin/wings-backups/policies', buildPolicyRequestBody(form));
            toast.success(t('adminWingsBackups.policyCreateSuccess'));
            router.push('/admin/wings-backups');
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminWingsBackups.policyCreateFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminWingsBackups.policyCreateTitle')}
                description={t('adminWingsBackups.policyCreateDescription')}
                icon={HardDrive}
                actions={
                    <Button variant='outline' onClick={() => safeBack(router, '/admin/wings-backups')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('common.back')}
                    </Button>
                }
            />
            <form onSubmit={handleSubmit} className='space-y-6' data-fp-save-shortcut>
                <PolicyFormFields form={form} setForm={setForm} disabled={saving} />
                <div className='bg-card/40 border-border/50 sticky bottom-4 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border p-4 shadow-sm backdrop-blur-md'>
                    <Button type='button' variant='outline' onClick={() => safeBack(router, '/admin/wings-backups')}>
                        {t('common.cancel')}
                    </Button>
                    <Button type='submit' disabled={saving || !form.name.trim() || !form.primary_destination_id}>
                        {saving ? t('common.saving') : t('adminWingsBackups.savePolicy')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
