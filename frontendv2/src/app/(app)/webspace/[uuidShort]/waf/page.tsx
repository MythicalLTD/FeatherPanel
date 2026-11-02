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
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WebSpacePageHeader as PageHeader } from '@/components/webspace/WebSpacePageHeader';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { WebSpaceWafDashboard } from '@/components/webspace/WebSpaceWafDashboard';

export default function WebSpaceWafPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [deniedIps, setDeniedIps] = useState<string[]>([]);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}`);
            const ws = data.data.webspace as { waf_deny_ips?: string[] };
            setDeniedIps(ws.waf_deny_ips || []);
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'webSpaces.settings.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const denyIp = async (ip: string) => {
        if (deniedIps.includes(ip)) {
            toast.info(t('webSpaces.wafDashboard.alreadyDenied'));
            return;
        }
        const next = [...deniedIps, ip];
        try {
            await axios.patch(`/api/user/webspaces/${uuidShort}`, { waf_deny_ips: next });
            setDeniedIps(next);
            toast.success(t('webSpaces.wafDashboard.ipDenied'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'webSpaces.settings.saveFailed'));
        }
    };

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <WebSpacePageWidgets pageId='webspace-waf'>
            <div className='space-y-6 pb-10'>
                <PageHeader title={t('webSpaces.wafPage.title')} description={t('webSpaces.wafPage.description')} />

                <WebSpaceWafDashboard uuidShort={uuidShort} onDenyIp={denyIp} />
            </div>
        </WebSpacePageWidgets>
    );
}
