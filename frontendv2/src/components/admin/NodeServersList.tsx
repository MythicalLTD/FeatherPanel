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

import Link from 'next/link';
import { Users } from 'lucide-react';

import { StatusBadge } from '@/components/servers/StatusBadge';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import {
    ServerUsageMeters,
    type ServerUsageLimits,
    type ServerUsageValues,
} from '@/components/admin/ServerUsageMeters';

export interface NodeStatusServer {
    id?: number;
    name: string;
    uuid_short?: string;
    status: string;
    player_count?: number;
    /** Live usage (admin status only); null when the node did not report this server. */
    resources?: (ServerUsageValues & { state?: string; uptime?: number }) | null;
    limits?: ServerUsageLimits;
}

interface NodeServersListProps {
    servers: NodeStatusServer[];
    showAdminLinks?: boolean;
    showPlayerCount?: boolean;
    /** Show CPU / RAM / disk meters for servers that carry live resources. */
    showUsage?: boolean;
    /** The node did not answer; usage cells say so instead of "no data". */
    nodeOffline?: boolean;
    className?: string;
}

/** Stored states that say more than the daemon's running/offline. */
const STORED_FIRST = new Set(['suspended', 'installing', 'install_failed', 'restoring_backup', 'transferring']);

function shownStatus(server: NodeStatusServer, live: boolean): string {
    if (!live || !server.resources?.state || STORED_FIRST.has(server.status)) return server.status;
    return server.resources.state;
}

export function NodeServersList({
    servers,
    showAdminLinks = false,
    showPlayerCount = false,
    showUsage = false,
    nodeOffline = false,
    className,
}: NodeServersListProps) {
    const { t } = useTranslation();

    if (servers.length === 0) {
        return <p className='text-muted-foreground text-sm'>{t('nodeStatus.servers.empty')}</p>;
    }

    return (
        <div className={className}>
            <p className='text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase'>
                {t('nodeStatus.servers.title', { count: String(servers.length) })}
            </p>
            <ul className='divide-border/50 divide-y rounded-lg border'>
                {servers.map((server) => {
                    const rowContent = (
                        <>
                            <span className='min-w-0 flex-1 truncate font-medium'>{server.name}</span>
                            {showUsage && server.limits && (
                                <ServerUsageMeters
                                    usage={server.resources}
                                    limits={server.limits}
                                    nodeOffline={nodeOffline}
                                    inline={false}
                                    className='order-last w-full pb-0.5'
                                />
                            )}
                            <div className='flex shrink-0 items-center gap-2'>
                                {showPlayerCount && server.player_count !== undefined && (
                                    <span className='text-muted-foreground flex items-center gap-1 text-xs'>
                                        <Users className='h-3 w-3' />
                                        {server.player_count}
                                    </span>
                                )}
                                <StatusBadge status={shownStatus(server, showUsage)} t={t} />
                            </div>
                        </>
                    );

                    const key = server.id ?? server.uuid_short ?? server.name;

                    if (showAdminLinks && server.id) {
                        return (
                            <li key={key}>
                                <Link
                                    href={`/admin/servers/${server.id}/edit`}
                                    className={cn(
                                        'hover:bg-muted/40 flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors',
                                        showUsage && 'flex-wrap',
                                    )}
                                >
                                    {rowContent}
                                </Link>
                            </li>
                        );
                    }

                    return (
                        <li
                            key={key}
                            className={cn(
                                'flex items-center justify-between gap-3 px-3 py-2 text-sm',
                                showUsage && 'flex-wrap',
                            )}
                        >
                            {rowContent}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
