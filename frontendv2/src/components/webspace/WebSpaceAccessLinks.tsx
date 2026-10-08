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

import { ExternalLink, Globe, Server } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { buildWebSpaceAccessUrls, type WebSpaceAccessUrls } from '@/lib/webspace-urls';
import { copyToClipboard, cn } from '@/lib/utils';

interface WebSpaceAccessLinksProps {
    domains?: string[];
    ssl?: boolean;
    backendPort?: number | null;
    nodeFqdn?: string | null;
    nodeIp?: string | null;
    access?: WebSpaceAccessUrls | null;
    className?: string;
    compact?: boolean;
}

export function WebSpaceAccessLinks({
    domains = [],
    ssl,
    backendPort,
    nodeFqdn,
    nodeIp,
    access,
    className,
    compact = false,
}: WebSpaceAccessLinksProps) {
    const { t } = useTranslation();
    const urls = access ?? buildWebSpaceAccessUrls({ domains, ssl, backendPort, nodeFqdn, nodeIp });

    const copy = (text: string) => void copyToClipboard(text);

    if (!urls.public.length && !urls.internal_url) {
        return <p className={cn('text-muted-foreground text-sm', className)}>{t('webSpaces.access.noLinks')}</p>;
    }

    return (
        <div className={cn('space-y-3', className)}>
            {urls.public.map((entry) => (
                <div
                    key={entry.domain}
                    className='bg-secondary/40 border-border/40 flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center'
                >
                    <div className='flex min-w-0 flex-1 items-start gap-2'>
                        <Globe className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                        <div className='min-w-0 flex-1'>
                            <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                {t('webSpaces.access.publicSite')}
                            </p>
                            <code className='mt-0.5 block truncate font-mono text-xs'>{entry.url}</code>
                            {!compact && (
                                <p className='text-muted-foreground mt-1 text-xs'>{t('webSpaces.access.publicHint')}</p>
                            )}
                        </div>
                    </div>
                    <div className='flex shrink-0 gap-2'>
                        <Button type='button' size='sm' variant='outline' onClick={() => copy(entry.url)}>
                            {t('common.copy')}
                        </Button>
                        <Button type='button' size='sm' asChild>
                            <a href={entry.url} target='_blank' rel='noopener noreferrer'>
                                <ExternalLink className='mr-1.5 h-3.5 w-3.5' />
                                {t('webSpaces.access.visit')}
                            </a>
                        </Button>
                    </div>
                </div>
            ))}

            {urls.internal_url && (
                <div className='bg-secondary/40 border-border/40 flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center'>
                    <div className='flex min-w-0 flex-1 items-start gap-2'>
                        <Server className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                        <div className='min-w-0 flex-1'>
                            <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                {t('webSpaces.access.directBackend')}
                            </p>
                            <code className='mt-0.5 block truncate font-mono text-xs'>{urls.internal_url}</code>
                            {!compact && (
                                <p className='text-muted-foreground mt-1 text-xs'>{t('webSpaces.access.directHint')}</p>
                            )}
                            {!compact && urls.loopback_url && (
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {t('webSpaces.access.loopbackNote', { url: urls.loopback_url })}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className='flex shrink-0 gap-2'>
                        <Button type='button' size='sm' variant='outline' onClick={() => copy(urls.internal_url!)}>
                            {t('common.copy')}
                        </Button>
                        <Button type='button' size='sm' asChild>
                            <a href={urls.internal_url!} target='_blank' rel='noopener noreferrer'>
                                <ExternalLink className='mr-1.5 h-3.5 w-3.5' />
                                {t('webSpaces.access.open')}
                            </a>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
