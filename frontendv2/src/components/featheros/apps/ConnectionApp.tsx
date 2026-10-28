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

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

export default function ConnectionApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { errorMessage } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const [server, setServer] = useState<{
        node?: { fqdn?: string; sftp_subdomain?: string | null };
        sftp?: { host?: string; port?: number; username?: string; url?: string };
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axios
            .get(`/api/user/servers/${uuid}`)
            .then(({ data }) => setServer(data?.data ?? null))
            .catch((e) => toast.error(errorMessage(e)))
            .finally(() => setLoading(false));
    }, [uuid, errorMessage]);

    if (loading)
        return (
            <div className='flex h-full items-center justify-center'>
                <Loader2 className='h-5 w-5 animate-spin' />
            </div>
        );
    if (!server)
        return (
            <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
                {t('featheros.errors.server_gone')}
            </div>
        );

    const host = server.node?.sftp_subdomain || server.sftp?.host || server.node?.fqdn || '';
    const port = server.sftp?.port;
    const user = server.sftp?.username || '';
    const url = host && port ? `sftp://${user}@${host}:${port}` : server.sftp?.url || '';
    const rows: [string, string][] = [
        [t('featheros.connection.host'), host],
        [t('featheros.connection.port'), port != null ? String(port) : ''],
        [t('featheros.connection.username'), user],
        [t('featheros.connection.url'), url],
    ];

    const copy = (v: string) =>
        void navigator.clipboard?.writeText(v).then(() => toast.success(t('featheros.common.copied')));

    return (
        <div className='fos-scroll h-full overflow-auto p-5'>
            <h2 className='mb-1 text-sm font-semibold'>{t('featheros.connection.title')}</h2>
            <p className='text-muted-foreground mb-4 text-[12px]'>{t('featheros.connection.hint')}</p>
            <div className='bg-muted/40 divide-y rounded-lg border'>
                {rows.map(([label, value]) => (
                    <div key={label} className='flex items-center gap-2 px-3 py-2 text-[12px]'>
                        <span className='text-muted-foreground w-24 shrink-0'>{label}</span>
                        <span className='min-w-0 flex-1 truncate font-mono text-[11px]'>{value || '-'}</span>
                        {value && (
                            <button
                                type='button'
                                className='hover:bg-muted rounded p-1'
                                onClick={() => copy(value)}
                                aria-label={t('featheros.common.copy')}
                            >
                                <Copy className='h-3.5 w-3.5' />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <p className='text-muted-foreground mt-4 text-[11px]'>{t('featheros.connection.password_hint')}</p>
        </div>
    );
}
