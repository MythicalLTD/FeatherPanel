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

import { Copy, Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { IpVisibilityButton } from '@/components/common/IpVisibilityButton';
import { cn, copyToClipboard } from '@/lib/utils';
import { Sensitive } from '@/components/common/Sensitive';

interface ServerAddressChipProps {
    host: string;
    port?: number | null;
    /** Show the account-wide hide/show IP toggle next to the address. */
    showVisibilityToggle?: boolean;
    className?: string;
}

/** Rounded `host:port` chip with copy, masked in privacy mode. */
export default function ServerAddressChip({ host, port, showVisibilityToggle, className }: ServerAddressChipProps) {
    const { t } = useTranslation();
    if (!host) return null;

    const raw = port ? `${host}:${port}` : host;

    return (
        <span
            className={cn(
                'border-border/50 bg-muted/40 inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full border pr-1 pl-2.5 text-xs',
                className,
            )}
        >
            <Globe className='text-muted-foreground h-3.5 w-3.5 shrink-0' aria-hidden />
            <span className='truncate font-mono tabular-nums'>
                <Sensitive>{raw}</Sensitive>
            </span>
            {showVisibilityToggle && <IpVisibilityButton className='p-1' />}
            <button
                type='button'
                onClick={() => void copyToClipboard(raw, t)}
                className='text-muted-foreground hover:bg-muted hover:text-foreground rounded-full p-1 transition-colors'
                title={t('servers.console.info_cards.copy')}
                aria-label={t('servers.console.info_cards.copy')}
            >
                <Copy className='h-3.5 w-3.5' />
            </button>
        </span>
    );
}
