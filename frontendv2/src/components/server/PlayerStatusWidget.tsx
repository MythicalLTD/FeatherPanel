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
        <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-6'>
            {/* Header */}
            <div className='flex items-center justify-between mb-4'>
                <h3 className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
                    <Users className='h-4 w-4' />
                    {t('servers.console.players.title')}
                </h3>
                <div className='flex items-center gap-2'>
                    {data.is_stale && (
                        <div className='relative group'>
                            <AlertTriangle className='h-3.5 w-3.5 text-yellow-500' />
                            <div className='absolute right-0 top-full mt-1 px-2 py-1 bg-popover border rounded text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none'>
                                {t('servers.console.players.stale')}
                            </div>
                        </div>
                    )}
                    {data.version && (
                        <span className='text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
                            {data.version}
                        </span>
                    )}
                </div>
            </div>

            {/* Player count with bar */}
            <div className='space-y-2 mb-4'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                        <Circle className={`h-2.5 w-2.5 fill-current ${getDotColor()}`} />
                        <span className='text-2xl font-bold tabular-nums'>{data.player_count}</span>
                        <span className='text-sm text-muted-foreground'>/ {data.max_players}</span>
                    </div>
                    <span className='text-xs text-muted-foreground'>{t('servers.console.players.online')}</span>
                </div>

                {/* Progress bar */}
                <div className='h-1.5 w-full bg-muted rounded-full overflow-hidden'>
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
                            className='flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors'
                        >
                            {isMinecraft && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={`https://minotar.net/avatar/${encodeURIComponent(player)}/20`}
                                    alt=''
                                    className='w-5 h-5 rounded-sm'
                                    loading='lazy'
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            )}
                            <span className='text-sm text-foreground/80 truncate'>{player}</span>
                        </div>
                    ))}
                </div>
            ) : data.player_count > 0 ? (
                <p className='text-xs text-muted-foreground italic px-2'>
                    {t('servers.console.players.names_unavailable')}
                </p>
            ) : (
                <p className='text-xs text-muted-foreground px-2'>{t('servers.console.players.empty')}</p>
            )}
        </div>
    );
}
