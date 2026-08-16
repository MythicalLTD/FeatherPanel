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
import { Sparkles, PlusCircle, UserPlus, HardDrive, CheckCircle2, AlertTriangle, Download, Server } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

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
    ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
    warn: 'border-amber-500/25 bg-amber-500/10 text-amber-500',
    info: 'border-primary/25 bg-primary/10 text-primary',
    neutral: 'border-border/50 bg-secondary/40 text-muted-foreground',
};

export function WelcomeWidget({ version, chips = [], updateAvailable, latestVersion }: WelcomeWidgetProps) {
    const { user } = useSession();
    const { t } = useTranslation();

    const userName = user ? `${user.first_name} ${user.last_name}` : 'Admin';

    return (
        <div className='bg-card/30 border-border/50 group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-3xl md:rounded-[2.5rem] md:p-8 lg:p-10'>
            <div className='bg-primary/5 group-hover:bg-primary/10 pointer-events-none absolute top-0 right-0 -mt-32 -mr-32 h-64 w-64 rounded-full blur-[120px] transition-all duration-700 md:-mt-48 md:-mr-48 md:h-96 md:w-96' />
            <div className='bg-secondary/5 group-hover:bg-secondary/10 pointer-events-none absolute bottom-0 left-0 -mb-32 -ml-32 h-64 w-64 rounded-full blur-[120px] transition-all duration-700 md:-mb-48 md:-ml-48 md:h-96 md:w-96' />
            <div className='via-primary/10 pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent' />

            <div className='relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10'>
                <div className='min-w-0 flex-1 space-y-5'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <div className='bg-primary/10 border-primary/20 flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 md:px-3'>
                            <Sparkles className='text-primary h-3 w-3 shrink-0 animate-pulse md:h-3.5 md:w-3.5' />
                            <span className='text-primary/80 text-[8px] font-black tracking-widest whitespace-nowrap uppercase md:text-[9px]'>
                                {t('admin.welcome.running_version', { version: version || 'Unknown' })}
                            </span>
                        </div>
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
                                <div
                                    key={chip.id}
                                    className={cn(
                                        'flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black tracking-widest uppercase md:text-[9px]',
                                        chipStyles[chip.tone || 'neutral'],
                                    )}
                                >
                                    <Icon className='h-3 w-3 shrink-0' />
                                    <span className='truncate'>{chip.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className='space-y-2'>
                        <h1 className='wrap-break-words text-2xl font-black tracking-tight uppercase sm:text-3xl md:text-4xl lg:text-5xl'>
                            {t('admin.welcome.welcome_back')}{' '}
                            <span className='text-primary wrap-break-words'>{userName}</span>
                        </h1>
                        <p className='text-muted-foreground max-w-2xl text-[10px] font-bold tracking-widest uppercase opacity-70 md:text-xs lg:text-sm'>
                            {updateAvailable && latestVersion
                                ? t('admin.welcome.subtitle_update', { version: latestVersion })
                                : t('admin.welcome.subtitle')}
                        </p>
                    </div>

                    <div className='flex flex-wrap items-center gap-2 md:gap-3'>
                        <Link
                            href='/admin/servers/create'
                            className='bg-primary text-primary-foreground shadow-primary/40 flex items-center gap-2 rounded-lg px-4 py-2.5 text-[9px] font-black tracking-widest whitespace-nowrap uppercase shadow-[0_0_24px_-8px] transition-all hover:scale-105 active:scale-95 md:rounded-xl md:px-5 md:text-[10px]'
                        >
                            <PlusCircle className='h-3.5 w-3.5 shrink-0 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin.welcome.create_server')}</span>
                        </Link>
                        <Link
                            href='/admin/users/create'
                            className='bg-secondary text-secondary-foreground border-border/50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[9px] font-black tracking-widest whitespace-nowrap uppercase transition-all hover:scale-105 active:scale-95 md:rounded-xl md:px-5 md:text-[10px]'
                        >
                            <UserPlus className='h-3.5 w-3.5 shrink-0 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin.welcome.add_user')}</span>
                        </Link>
                        <Link
                            href='/admin/nodes'
                            className='bg-secondary text-secondary-foreground border-border/50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[9px] font-black tracking-widest whitespace-nowrap uppercase transition-all hover:scale-105 active:scale-95 md:rounded-xl md:px-5 md:text-[10px]'
                        >
                            <HardDrive className='h-3.5 w-3.5 shrink-0 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin.welcome.manage_nodes')}</span>
                        </Link>
                        {updateAvailable && (
                            <Link
                                href='/admin/updates'
                                className='flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[9px] font-black tracking-widest whitespace-nowrap text-amber-500 uppercase transition-all hover:scale-105 active:scale-95 md:rounded-xl md:px-5 md:text-[10px]'
                            >
                                <Download className='h-3.5 w-3.5 shrink-0 md:h-4 md:w-4' />
                                <span className='truncate'>{t('admin.welcome.view_updates')}</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
