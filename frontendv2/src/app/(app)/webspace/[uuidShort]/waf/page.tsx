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

import { useParams } from 'next/navigation';
import axios from 'axios';
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

    // Reads the stored list right before writing it, so a list that changed elsewhere (or a failed read)
    // can never be overwritten with a shorter one.
    const denyIp = async (ip: string) => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}`);
            const stored: unknown = data?.data?.webspace?.waf_deny_ips;
            if (!Array.isArray(stored)) {
                toast.error(t('webSpaces.settings.loadFailed'));
                return;
            }
            const current = stored.filter((value): value is string => typeof value === 'string');
            if (current.includes(ip)) {
                toast.info(t('webSpaces.wafDashboard.alreadyDenied'));
                return;
            }
            await axios.patch(`/api/user/webspaces/${uuidShort}`, { waf_deny_ips: [...current, ip] });
            toast.success(t('webSpaces.wafDashboard.ipDenied'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'webSpaces.settings.saveFailed'));
        }
    };

    return (
        <WebSpacePageWidgets pageId='webspace-waf'>
            <div className='space-y-6 pb-10'>
                <PageHeader title={t('webSpaces.wafPage.title')} description={t('webSpaces.wafPage.description')} />

                <WebSpaceWafDashboard uuidShort={uuidShort} onDenyIp={denyIp} />
            </div>
        </WebSpacePageWidgets>
    );
}
