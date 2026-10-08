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

import { Globe, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/featherui/Button';

interface WebSpaceDomainsCardProps {
    domains?: string[];
    ssl?: boolean;
    backendPort?: number | null;
    dnsStatus?: string | null;
}

export function WebSpaceDomainsCard({ domains = [], ssl, backendPort, dnsStatus }: WebSpaceDomainsCardProps) {
    const { t } = useTranslation();
    const na = t('common.not_available');
    const list = domains.filter(Boolean);

    return (
        <PageCard title={t('webSpaces.settings.domains')} icon={Globe}>
            {list.length === 0 ? (
                <p className='text-muted-foreground text-sm'>{t('webSpaces.overview.noDomains')}</p>
            ) : (
                <ul className='divide-border divide-y rounded-lg border text-sm'>
                    {list.map((domain) => (
                        <li key={domain} className='flex items-center justify-between gap-3 px-3 py-2'>
                            <code className='min-w-0 flex-1 truncate font-mono text-xs'>{domain}</code>
                            <Button
                                type='button'
                                size='sm'
                                variant='ghost'
                                className='shrink-0'
                                onClick={() => void copyToClipboard(domain)}
                            >
                                {t('common.copy')}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <div className='mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3'>
                <div>
                    <p className='text-muted-foreground mb-1 flex items-center gap-1 text-xs'>
                        <ShieldCheck className='h-3 w-3' />
                        SSL
                    </p>
                    <p className='font-medium'>
                        {ssl ? t('webSpaces.overview.sslEnabled') : t('webSpaces.overview.sslDisabled')}
                    </p>
                </div>
                <div>
                    <p className='text-muted-foreground mb-1 text-xs'>{t('webSpaces.overview.backendPort')}</p>
                    <p className='font-mono font-medium'>{backendPort || na}</p>
                </div>
                <div>
                    <p className='text-muted-foreground mb-1 text-xs'>DNS</p>
                    <p className='font-medium capitalize'>{dnsStatus || t('webSpaces.settings.unchecked')}</p>
                </div>
            </div>
        </PageCard>
    );
}
