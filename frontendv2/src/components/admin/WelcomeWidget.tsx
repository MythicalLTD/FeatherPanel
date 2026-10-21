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
import Link from 'next/link';
import { UserPlus, HardDrive, CheckCircle2, AlertTriangle, Download, Server } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/featherui/Button';
import { CreateServerAction } from './CreateServerAction';

export interface WelcomeChip {
    id: string;
    label: string;
    tone?: 'ok' | 'warn' | 'info' | 'neutral';
    icon?: 'ok' | 'warn' | 'info' | 'nodes';
}

interface WelcomeWidgetProps {
    version?: string;
    chips?: WelcomeChip[];
    updateAvailable?: boolean;
    latestVersion?: string;
}

const chipStyles = {
    ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    warn: 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-400',
    info: 'border-primary/25 bg-primary/10 text-foreground',
    neutral: 'border-border/60 bg-background/40 text-muted-foreground',
};

const NAME_MARK = '\u0000';

function greetingKey(hour: number): string {
    if (hour >= 5 && hour < 12) return 'dashboard.home.greeting_morning';
    if (hour >= 12 && hour < 18) return 'dashboard.home.greeting_afternoon';
    return 'dashboard.home.greeting_evening';
}

/** Admin home hero: greeting, panel version and health chips, and the main admin shortcuts. */
export function WelcomeWidget({ version, chips = [], updateAvailable }: WelcomeWidgetProps) {
    const { user, isLoading: sessionLoading } = useSession();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const [hour, setHour] = useState<number | null>(null);

    useEffect(() => {
        const update = () => setHour(new Date().getHours());
        update();
        const id = setInterval(update, 60_000);
        return () => clearInterval(id);
    }, []);

    const userLoading = sessionLoading && !user;
    const name = user?.first_name?.trim() || user?.username?.trim() || '';
    const [before, after] = name ? t(greetingKey(hour ?? 12), { name: NAME_MARK }).split(NAME_MARK) : ['', ''];
    const versionLoading = version === undefined;

    return (
        <section className='fp-surface relative min-w-0 overflow-hidden rounded-2xl border p-5 sm:p-6'>
            <div className='flex min-w-0 flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
                <div className='min-w-0'>
                    <p className='text-muted-foreground truncate text-xs font-medium'>
                        {settings?.app_name || t('admin.dashboard.title')}
                    </p>
                    <h1 className='mt-1 text-2xl font-semibold tracking-tight wrap-break-word sm:text-3xl'>
                        {userLoading || hour === null ? (
                            <span
                                className='bg-muted/50 inline-block h-8 w-64 animate-pulse rounded-md align-middle'
                                aria-busy='true'
                            />
                        ) : name ? (
                            <>
                                {before}
                                <span className='text-primary'>{name}</span>
                                {after}
                            </>
                        ) : (
                            t('dashboard.home.greeting_fallback')
                        )}
                    </h1>
                    <div className='mt-3 flex flex-wrap items-center gap-2 text-xs'>
                        <span
                            className={cn(
                                'inline-flex items-center rounded-full border px-2.5 py-1',
                                chipStyles.neutral,
                            )}
                        >
                            {t('admin.welcome.running_version', {
                                version: versionLoading ? t('common.loading') : version || t('common.unknown'),
                            })}
                        </span>
                        {chips.map((chip) => {
                            const Icon =
                                chip.icon === 'warn'
                                    ? AlertTriangle
                                    : chip.icon === 'info'
                                      ? Download
                                      : chip.icon === 'nodes'
                                        ? Server
                                        : CheckCircle2;
                            return (
                                <span
                                    key={chip.id}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium',
                                        chipStyles[chip.tone || 'neutral'],
                                    )}
                                >
                                    <Icon className='h-3.5 w-3.5 shrink-0' aria-hidden />
                                    <span>{chip.label}</span>
                                </span>
                            );
                        })}
                    </div>
                </div>

                <div className='flex shrink-0 flex-wrap items-center gap-2'>
                    <CreateServerAction />
                    <Button asChild variant='secondary' className='gap-2'>
                        <Link href='/admin/users/create'>
                            <UserPlus className='h-4 w-4 shrink-0' />
                            <span className='truncate'>{t('admin.welcome.add_user')}</span>
                        </Link>
                    </Button>
                    <Button asChild variant='secondary' className='gap-2'>
                        <Link href='/admin/nodes'>
                            <HardDrive className='h-4 w-4 shrink-0' />
                            <span className='truncate'>{t('admin.welcome.manage_nodes')}</span>
                        </Link>
                    </Button>
                    {updateAvailable && (
                        <Button asChild variant='secondary' className='gap-2 text-amber-800 dark:text-amber-400'>
                            <Link href='/admin/updates'>
                                <Download className='h-4 w-4 shrink-0' />
                                <span className='truncate'>{t('admin.welcome.view_updates')}</span>
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </section>
    );
}
