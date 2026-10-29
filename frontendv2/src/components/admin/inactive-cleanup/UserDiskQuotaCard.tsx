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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { HardDrive, Save } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import Permissions from '@/lib/permissions';
import { Button } from '@/components/featherui/Button';
import { PageCard } from '@/components/featherui/PageCard';
import { SizeInput } from '@/components/featherui/SizeInput';
import { Select } from '@/components/ui/select-native';

interface QuotaSummary {
    quota_mb: number;
    source: 'default' | 'user';
    allocated_mb: number;
    unlimited_servers: number;
    servers: number;
    remaining_mb: number | null;
    default_mb: number;
}

type Mode = 'default' | 'custom' | 'unlimited';

const formatMb = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GiB` : `${mb} MiB`);

/** Per-user disk quota override on the admin user edit page. */
export function UserDiskQuotaCard({ userId }: { userId: number }) {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const canEdit = hasPermission(Permissions.ADMIN_USERS_EDIT);
    const [summary, setSummary] = useState<QuotaSummary | null>(null);
    const [mode, setMode] = useState<Mode>('default');
    const [value, setValue] = useState<number | ''>('');
    const [valid, setValid] = useState(true);
    const [saving, setSaving] = useState(false);

    const apply = useCallback((s: QuotaSummary) => {
        setSummary(s);
        if (s.source === 'default') {
            setMode('default');
            setValue(s.default_mb || '');
        } else if (s.quota_mb === 0) {
            setMode('unlimited');
            setValue('');
        } else {
            setMode('custom');
            setValue(s.quota_mb);
        }
    }, []);

    useEffect(() => {
        axios
            .get(`/api/admin/disk-quota/users/${userId}`)
            .then(({ data }) => apply(data.data))
            .catch(() => setSummary(null));
    }, [userId, apply]);

    if (!summary) return null;

    const save = async () => {
        setSaving(true);
        try {
            const quota = mode === 'default' ? null : mode === 'unlimited' ? 0 : value === '' ? 0 : value;
            const { data } = await axios.put(`/api/admin/disk-quota/users/${userId}`, { quota_mb: quota });
            apply(data.data);
            toast.success(t('adminInactive.quota.userSaved'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminInactive.quota.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const effective =
        summary.quota_mb > 0
            ? t('adminInactive.quota.usage', {
                  used: formatMb(summary.allocated_mb),
                  limit: formatMb(summary.quota_mb),
              })
            : t('adminInactive.quota.usageUnlimited', { used: formatMb(summary.allocated_mb) });

    return (
        <PageCard title={t('adminInactive.quota.cardTitle')} icon={HardDrive}>
            <div className='space-y-4'>
                <p className='text-sm'>{effective}</p>
                <div className='space-y-2'>
                    <label htmlFor='user-quota-mode' className='text-sm'>
                        {t('adminInactive.quota.mode')}
                    </label>
                    <Select
                        id='user-quota-mode'
                        value={mode}
                        disabled={!canEdit}
                        className='rounded-xl'
                        onChange={(e) => setMode(e.target.value as Mode)}
                    >
                        <option value='default'>
                            {summary.default_mb > 0
                                ? t('adminInactive.quota.modeDefault', { size: formatMb(summary.default_mb) })
                                : t('adminInactive.quota.modeDefaultUnlimited')}
                        </option>
                        <option value='custom'>{t('adminInactive.quota.modeCustom')}</option>
                        <option value='unlimited'>{t('adminInactive.quota.modeUnlimited')}</option>
                    </Select>
                </div>
                {mode === 'custom' && (
                    <SizeInput
                        value={value}
                        onValueChange={setValue}
                        unit='MiB'
                        min={1}
                        ariaLabel={t('adminInactive.quota.cardTitle')}
                        onValidityChange={setValid}
                    />
                )}
                <p className='text-muted-foreground text-xs'>{t('adminInactive.quota.enforceHint')}</p>
                {canEdit && (
                    <Button
                        size='sm'
                        onClick={save}
                        loading={saving}
                        disabled={saving || (mode === 'custom' && (!valid || value === ''))}
                    >
                        <Save className='mr-1.5 h-4 w-4' />
                        {t('common.save')}
                    </Button>
                )}
            </div>
        </PageCard>
    );
}
