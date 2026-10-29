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
import { Hourglass } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/api-errors';
import Permissions from '@/lib/permissions';
import { PageCard } from '@/components/featherui/PageCard';
import { Switch } from '@/components/ui/switch';

interface Status {
    exempt: boolean;
    stage: string | null;
    last_activity_at: string | null;
    policy: { enabled: boolean; inactive_days: number };
}

/** Inactivity state and the cleanup exemption switch on the admin server edit page. */
export function ServerInactivityCard({ serverId }: { serverId: string }) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { hasPermission } = useSession();
    const canEdit = hasPermission(Permissions.ADMIN_SERVERS_EDIT);
    const [status, setStatus] = useState<Status | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        axios
            .get(`/api/admin/inactive-cleanup/servers/${serverId}`)
            .then(({ data }) => setStatus(data.data))
            .catch(() => setStatus(null));
    }, [serverId]);

    useEffect(() => {
        load();
    }, [load]);

    if (!status) return null;

    const toggle = async (exempt: boolean) => {
        setSaving(true);
        try {
            await axios.put(`/api/admin/inactive-cleanup/servers/${serverId}/exempt`, { exempt });
            toast.success(exempt ? t('adminInactive.exemptAdded') : t('adminInactive.exemptRemoved'));
            load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminInactive.exemptFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <PageCard title={t('adminInactive.serverCard.title')} icon={Hourglass} className='mt-6'>
            <div className='space-y-3'>
                <div className='flex items-center justify-between gap-4'>
                    <label htmlFor='server-inactivity-exempt' className='min-w-0 text-sm'>
                        <span className='block'>{t('adminInactive.serverCard.exempt')}</span>
                        <span className='text-muted-foreground block text-xs'>
                            {t('adminInactive.serverCard.exemptHint')}
                        </span>
                    </label>
                    <Switch
                        id='server-inactivity-exempt'
                        checked={status.exempt}
                        disabled={!canEdit || saving}
                        onCheckedChange={toggle}
                    />
                </div>
                <p className='text-muted-foreground text-xs'>
                    {status.last_activity_at &&
                        t('adminInactive.serverCard.lastActivity', {
                            time: formatRelativeTime(status.last_activity_at, dateOpts),
                        })}
                    {status.stage && ` · ${t(`adminInactive.stages.${status.stage}`)}`}
                    {!status.policy.enabled && ` · ${t('adminInactive.serverCard.policyOff')}`}
                </p>
            </div>
        </PageCard>
    );
}
