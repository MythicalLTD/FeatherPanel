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
import { Users, AlertTriangle, Loader2 } from 'lucide-react';
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

    // Don't render anything while loading
    if (loading) {
        return (
            <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-6'>
                <h3 className='text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2'>
                    <Users className='h-4 w-4' />
                    {t('servers.console.players.title')}
                </h3>
                <div className='flex items-center justify-center py-2'>
                    <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                </div>
            </div>
        );
    }

    // Don't show widget at all if game type is unsupported (null)
    if (!data || !data.game_type) {
        return null;
    }

    // Don't show if there was an error and no cached data
    if (error && !data) {
        return null;
    }

    const playerCountText = `${data.player_count}/${data.max_players}`;
    const hasPlayerNames = data.players.length > 0;
    const showScrollable = data.players.length > 10;

    return (
        <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-6'>
            <div className='flex items-center justify-between mb-4'>
                <h3 className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
                    <Users className='h-4 w-4' />
                    {t('servers.console.players.title')}
                </h3>
                {data.is_stale && (
                    <div className='relative group'>
                        <AlertTriangle className='h-4 w-4 text-yellow-500' />
                        <div className='absolute right-0 top-full mt-1 px-2 py-1 bg-popover border rounded text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none'>
                            {t('servers.console.players.stale')}
                        </div>
                    </div>
                )}
            </div>

            <div className='space-y-3'>
                {/* Player count */}
                <div className='flex items-center gap-2'>
                    <span className='font-medium text-sm'>{playerCountText}</span>
                    <span className='text-sm text-muted-foreground'>{t('servers.console.players.online')}</span>
                </div>

                {/* Player names list */}
                {hasPlayerNames ? (
                    <div className={`space-y-1 ${showScrollable ? 'max-h-48 overflow-y-auto' : ''}`}>
                        {data.players.map((player, index) => (
                            <div
                                key={`${player}-${index}`}
                                className='text-sm text-muted-foreground px-2 py-0.5 rounded hover:bg-muted/50 transition-colors'
                            >
                                {player}
                            </div>
                        ))}
                    </div>
                ) : data.player_count > 0 ? (
                    <p className='text-xs text-muted-foreground italic'>
                        {t('servers.console.players.names_unavailable')}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
