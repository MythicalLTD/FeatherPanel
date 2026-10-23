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
import { toast } from 'sonner';
import { RotateCcw, TriangleAlert, X } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';

interface CrashInfo {
    auto_restart: boolean;
    last_crash: { at: string; lines: string[] } | null;
}

function useCrashInfo(uuidShort: string, refreshKey?: unknown) {
    const [info, setInfo] = useState<CrashInfo | null>(null);
    const url = `/api/user/servers/${encodeURIComponent(uuidShort)}/crash`;

    useEffect(() => {
        let cancelled = false;
        const load = () =>
            axios
                .get(url)
                .then(({ data }) => {
                    if (!cancelled && data?.success) setInfo(data.data as CrashInfo);
                })
                .catch(() => {
                    // Without crash info the card simply stays hidden.
                });
        void load();
        // The panel stores the crash lines a moment after Wings reports the state change.
        const retry = window.setTimeout(() => void load(), 5000);
        return () => {
            cancelled = true;
            window.clearTimeout(retry);
        };
    }, [url, refreshKey]);

    return { info, setInfo, url };
}

function AutoRestartSwitch({
    uuidShort,
    info,
    onChange,
    disabled,
}: {
    uuidShort: string;
    info: CrashInfo;
    onChange: (info: CrashInfo) => void;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);

    const toggle = async (enabled: boolean) => {
        setSaving(true);
        try {
            const { data } = await axios.put(`/api/user/servers/${encodeURIComponent(uuidShort)}/crash/auto-restart`, {
                enabled,
            });
            onChange(data.data as CrashInfo);
            if (data.data?.synced === false) toast.warning(t('servers.crash.syncPending'));
            else toast.success(enabled ? t('servers.crash.autoRestartOn') : t('servers.crash.autoRestartOff'));
        } catch (e) {
            toast.error(getApiErrorMessage(e, t, 'servers.crash.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <label className='flex items-start justify-between gap-4'>
            <span className='min-w-0'>
                <span className='block text-sm font-medium'>{t('servers.crash.autoRestart')}</span>
                <span className='text-muted-foreground block text-xs'>{t('servers.crash.autoRestartDescription')}</span>
            </span>
            <Switch checked={info.auto_restart} disabled={disabled || saving} onCheckedChange={(v) => void toggle(v)} />
        </label>
    );
}

/**
 * Console card shown after a crash: the last console lines before it went down and
 * the auto restart toggle. Refreshes when the server status changes.
 */
export function ServerCrashCard({
    uuidShort,
    status,
    canToggle,
}: {
    uuidShort: string;
    status?: string;
    canToggle: boolean;
}) {
    const { t, locale } = useTranslation();
    const { info, setInfo, url } = useCrashInfo(uuidShort, status);

    const dismiss = useCallback(async () => {
        try {
            const { data } = await axios.delete(url);
            setInfo(data.data as CrashInfo);
        } catch (e) {
            toast.error(getApiErrorMessage(e, t, 'servers.crash.saveFailed'));
        }
    }, [url, setInfo, t]);

    if (!info?.last_crash) return null;

    return (
        <PageCard
            title={t('servers.crash.title')}
            description={t('servers.crash.description', {
                time: new Date(info.last_crash.at).toLocaleString(locale),
            })}
            icon={TriangleAlert}
            variant='warning'
            action={
                <Button size='sm' variant='ghost' onClick={() => void dismiss()} title={t('servers.crash.dismiss')}>
                    <X className='h-4 w-4' />
                </Button>
            }
        >
            <div className='space-y-4'>
                {info.last_crash.lines.length > 0 ? (
                    <pre className='bg-muted/50 border-border/50 max-h-72 overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap'>
                        {info.last_crash.lines.join('\n')}
                    </pre>
                ) : (
                    <p className='text-muted-foreground text-sm'>{t('servers.crash.noLines')}</p>
                )}
                <AutoRestartSwitch uuidShort={uuidShort} info={info} onChange={setInfo} disabled={!canToggle} />
            </div>
        </PageCard>
    );
}

/** Settings page card with the auto restart toggle. */
export function CrashAutoRestartSetting({ uuidShort, canToggle }: { uuidShort: string; canToggle: boolean }) {
    const { t } = useTranslation();
    const { info, setInfo } = useCrashInfo(uuidShort);
    if (!info) return null;
    return (
        <PageCard title={t('servers.crash.settingsTitle')} icon={RotateCcw}>
            <AutoRestartSwitch uuidShort={uuidShort} info={info} onChange={setInfo} disabled={!canToggle} />
        </PageCard>
    );
}
