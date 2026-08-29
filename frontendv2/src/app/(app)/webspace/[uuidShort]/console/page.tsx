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

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/featherui/Input';
import { Button } from '@/components/featherui/Button';
import { useQuilldWebSocket } from '@/hooks/useQuilldWebSocket';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { cn } from '@/lib/utils';

function extractLogText(payload: unknown): string {
    if (payload == null) return '';
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        if (typeof obj.data === 'string') return obj.data;
        if (typeof obj.logs === 'string') return obj.logs;
        if (Array.isArray(obj.lines)) return obj.lines.map(String).join('\n');
        return JSON.stringify(payload, null, 2);
    }
    return String(payload);
}

export default function WebSpaceConsolePage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const [logs, setLogs] = useState(() => t('webSpaces.console.loadingLogs'));
    const [error, setError] = useState<string | null>(null);
    const [useHttpPoll, setUseHttpPoll] = useState(false);
    const [command, setCommand] = useState('');

    const onWsFallback = useCallback(() => {
        setUseHttpPoll(true);
    }, []);

    const {
        lines: wsLines,
        isConnected: wsConnected,
        sendCommand,
    } = useQuilldWebSocket({
        jwtEndpoint: `/api/user/webspaces/${uuidShort}/jwt`,
        enabled: !!uuidShort && !useHttpPoll,
        onFallback: onWsFallback,
        fallbackAfterMs: 3000,
    });

    useEffect(() => {
        if (!useHttpPoll) return;

        let cancelled = false;
        const poll = async () => {
            try {
                const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/logs`, {
                    params: { lines: 200 },
                });
                if (cancelled) return;
                setLogs(extractLogText(data?.data) || t('webSpaces.console.noOutput'));
                setError(null);
            } catch (err) {
                if (cancelled) return;
                console.error(err);
                setError(t('webSpaces.console.fetchLogsFailed'));
            }
        };

        void poll();
        const id = setInterval(() => void poll(), 3000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [uuidShort, useHttpPoll, t]);

    const consoleText = useHttpPoll
        ? logs
        : wsLines.length > 0
          ? wsLines.join('\n')
          : wsConnected
            ? t('webSpaces.console.waiting')
            : t('webSpaces.console.connecting');

    const canSend = !useHttpPoll && wsConnected;

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!canSend || !command.trim()) return;
        sendCommand(command);
        setCommand('');
    };

    return (
        <WebSpacePageWidgets pageId='webspace-console'>
            <div className='space-y-4'>
                <div className='flex flex-wrap items-end justify-between gap-3'>
                    <div>
                        <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
                            {t('webSpaces.console.title')}
                        </h1>
                        <p className='text-muted-foreground mt-1 text-sm'>
                            {useHttpPoll ? t('webSpaces.console.descHttp') : t('webSpaces.console.descWs')}
                        </p>
                    </div>
                    <div
                        className={cn(
                            'rounded-lg border px-2.5 py-1 text-xs font-medium',
                            useHttpPoll
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                                : wsConnected
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                  : 'border-border bg-muted text-muted-foreground',
                        )}
                    >
                        {useHttpPoll
                            ? t('webSpaces.console.descHttp')
                            : wsConnected
                              ? t('webSpaces.console.waiting')
                              : t('webSpaces.console.connecting')}
                    </div>
                </div>

                {error && <p className='text-destructive text-sm'>{error}</p>}

                <Card className='border-border/50 bg-card/50 overflow-hidden backdrop-blur-xl'>
                    <CardHeader className='border-border/40 border-b py-3'>
                        <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                            {t('webSpaces.console.title')}
                        </p>
                    </CardHeader>
                    <CardContent className='p-0'>
                        <pre className='bg-muted/30 text-foreground max-h-[65vh] overflow-auto p-4 font-mono text-xs leading-relaxed'>
                            {consoleText}
                        </pre>
                    </CardContent>
                    <CardFooter className='border-border/40 border-t p-3'>
                        <form onSubmit={onSubmit} className='flex w-full gap-2'>
                            <Input
                                type='text'
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                disabled={!canSend}
                                placeholder={
                                    canSend
                                        ? t('webSpaces.console.commandPlaceholder')
                                        : t('webSpaces.console.wsRequired')
                                }
                                className='font-mono'
                                autoComplete='off'
                                spellCheck={false}
                            />
                            <Button type='submit' disabled={!canSend || !command.trim()}>
                                {t('webSpaces.console.send')}
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            </div>
        </WebSpacePageWidgets>
    );
}
