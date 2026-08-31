/*
This file is part of FeatherPanel.
 */

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
import { Loader2, Shield } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';

export function WebSpaceSecuritySummary({ uuidShort }: { uuidShort: string }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [wafEnabled, setWafEnabled] = useState(false);
    const [errors4xx, setErrors4xx] = useState(0);
    const [errors5xx, setErrors5xx] = useState(0);
    const [malwareDate, setMalwareDate] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [spaceRes, analyticsRes, malwareRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}`),
                axios.get(`/api/user/webspaces/${uuidShort}/analytics/summary?days=7`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/malware-scan/status`).catch(() => null),
            ]);
            const ws = spaceRes.data?.data?.webspace as { waf_enabled?: boolean };
            setWafEnabled(!!ws?.waf_enabled);
            const status = (analyticsRes?.data?.data?.traffic?.status || {}) as Record<string, number>;
            let e4 = 0;
            let e5 = 0;
            for (const [code, count] of Object.entries(status)) {
                const n = Number(code);
                if (n >= 400 && n < 500) e4 += count;
                if (n >= 500) e5 += count;
            }
            setErrors4xx(e4);
            setErrors5xx(e5);
            const scan = malwareRes?.data?.data;
            setMalwareDate(scan?.finished_at || scan?.started_at || null);
        } finally {
            setLoading(false);
        }
    }, [uuidShort]);

    useEffect(() => {
        void load();
    }, [load]);

    const base = `/webspace/${uuidShort}`;

    return (
        <PageCard title={t('webSpaces.security.title')} icon={Shield}>
            {loading ? (
                <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
                <div className='space-y-2 text-sm'>
                    <p>
                        {t('webSpaces.security.waf')}:{' '}
                        <span className='font-medium'>{wafEnabled ? t('common.enabled') : t('common.disabled')}</span>
                        {' · '}
                        <Link className='text-primary underline' href={`${base}/waf`}>
                            {t('webSpaces.security.configure')}
                        </Link>
                    </p>
                    <p>
                        {t('webSpaces.security.errors7d', { e4: String(errors4xx), e5: String(errors5xx) })}
                        {' · '}
                        <Link className='text-primary underline' href={`${base}/analytics`}>
                            {t('webSpaces.security.analytics')}
                        </Link>
                    </p>
                    <p>
                        {t('webSpaces.security.malware')}:{' '}
                        {malwareDate ? new Date(malwareDate).toLocaleString() : t('webSpaces.security.never')}
                        {' · '}
                        <Link className='text-primary underline' href={`${base}/malware`}>
                            {t('webSpaces.security.scan')}
                        </Link>
                    </p>
                </div>
            )}
        </PageCard>
    );
}
