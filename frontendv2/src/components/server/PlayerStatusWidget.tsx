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

import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Users, AlertTriangle, Circle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface PlayerStatusData {
    player_count: number;
    max_players: number;
    players: string[];
    game_type: string | null;
    last_updated: string;
    is_stale: boolean;
    server_name: string;
    address: string;
    version?: string | null;
}

interface PlayerStatusWidgetProps {
    uuidShort: string;
    pollingInterval?: number;
}

export default function PlayerStatusWidget({ uuidShort, pollingInterval = 30000 }: PlayerStatusWidgetProps) {
    const { t } = useTranslation();
    const [data, setData] = useState<PlayerStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchPlayerStatus = useCallback(async () => {
        try {
            const response = await axios.get<{ success: boolean; data: PlayerStatusData }>(
                `/api/user/servers/${uuidShort}/players`,
            );
            if (response.data.success && response.data.data) {
                setData(response.data.data);
                setError(false);
            } else {
                setError(true);
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [uuidShort]);

    useEffect(() => {
        fetchPlayerStatus();
        intervalRef.current = setInterval(fetchPlayerStatus, pollingInterval);
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [fetchPlayerStatus, pollingInterval]);

    // Don't render while loading or if game type is unsupported
    if (loading || !data || !data.game_type) {
        return null;
    }

    if (error && !data) {
        return null;
    }

    const hasPlayerNames = data.players.length > 0;
    const showScrollable = data.players.length > 10;
    const isMinecraft = data.game_type === 'minecraft' || data.game_type === 'minecraftbe';

    // Calculate fill percentage for the player bar
    const fillPercent = data.max_players > 0 ? Math.min((data.player_count / data.max_players) * 100, 100) : 0;

    // Color based on fill
    const getBarColor = () => {
        if (fillPercent >= 90) return 'bg-red-500';
        if (fillPercent >= 70) return 'bg-yellow-500';
        return 'bg-emerald-500';
    };

    const getDotColor = () => {
        if (data.player_count === 0) return 'text-muted-foreground';
        if (fillPercent >= 90) return 'text-red-500';
        if (fillPercent >= 70) return 'text-yellow-500';
        return 'text-emerald-500';
    };

    return (
        <div className='border-border/50 bg-card/50 rounded-xl border p-6 backdrop-blur-xl'>
            {/* Header */}
            <div className='mb-4 flex items-center justify-between'>
                <h3 className='text-muted-foreground flex items-center gap-2 text-sm font-medium'>
                    <Users className='h-4 w-4' />
                    {t('servers.console.players.title')}
                </h3>
                <div className='flex items-center gap-2'>
                    {data.is_stale && (
                        <div className='group relative'>
                            <AlertTriangle className='h-3.5 w-3.5 text-yellow-500' />
                            <div className='bg-popover text-popover-foreground pointer-events-none absolute top-full right-0 z-50 mt-1 rounded border px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-md transition-opacity group-hover:opacity-100'>
                                {t('servers.console.players.stale')}
                            </div>
                        </div>
                    )}
                    {data.version && (
                        <span className='text-muted-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[10px]'>
                            {data.version}
                        </span>
                    )}
                </div>
            </div>

            {/* Player count with bar */}
            <div className='mb-4 space-y-2'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <Circle className={`h-2.5 w-2.5 fill-current ${getDotColor()}`} />
                        <span className='text-2xl font-bold tabular-nums'>{data.player_count}</span>
                        <span className='text-muted-foreground text-sm'>/ {data.max_players}</span>
                    </div>
                    <span className='text-muted-foreground text-xs'>{t('servers.console.players.online')}</span>
                </div>

                {/* Progress bar */}
                <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                    <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor()}`}
                        style={{ width: `${fillPercent}%` }}
                    />
                </div>
            </div>

            {/* Player list */}
            {hasPlayerNames ? (
                <div className={`space-y-1 ${showScrollable ? 'max-h-52 overflow-y-auto pr-1' : ''}`}>
                    {data.players.map((player, index) => (
                        <div
                            key={`${player}-${index}`}
                            className='hover:bg-muted/50 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors'
                        >
                            {isMinecraft && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={`https://minotar.net/avatar/${encodeURIComponent(player)}/20`}
                                    alt=''
                                    className='h-5 w-5 rounded-sm'
                                    loading='lazy'
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                            <span className='text-foreground/80 truncate text-sm'>{player}</span>
                        </div>
                    ))}
                </div>
            ) : data.player_count > 0 ? (
                <p className='text-muted-foreground px-2 text-xs italic'>
                    {t('servers.console.players.names_unavailable')}
                </p>
            ) : (
                <p className='text-muted-foreground px-2 text-xs'>{t('servers.console.players.empty')}</p>
            )}
        </div>
    );
}
