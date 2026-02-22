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
import { Sparkles, PlusCircle, UserPlus, HardDrive } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';

export function WelcomeWidget({ version }: { version?: string }) {
    const { user } = useSession();
    const { t } = useTranslation();

    const userName = user ? `${user.first_name} ${user.last_name}` : 'Admin';

    return (
        <div className='relative overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-card/30 border border-border/50 p-4 md:p-6 lg:p-10 mb-6 md:mb-8 group backdrop-blur-3xl'>
            <div className='absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-primary/5 blur-[120px] -mr-32 md:-mr-48 -mt-32 md:-mt-48 rounded-full group-hover:bg-primary/10 transition-all duration-700 pointer-events-none' />
            <div className='absolute bottom-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-secondary/5 blur-[120px] -ml-32 md:-ml-48 -mb-32 md:-mb-48 rounded-full group-hover:bg-secondary/10 transition-all duration-700 pointer-events-none' />

            <div className='relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6 lg:gap-8'>
                <div className='space-y-4 md:space-y-6 min-w-0 flex-1'>
                    <div className='space-y-3 md:space-y-4'>
                        <div className='flex items-center gap-2 px-2 md:px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit'>
                            <Sparkles className='h-3 w-3 md:h-3.5 md:w-3.5 text-primary animate-pulse shrink-0' />
                            <span className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary/80 whitespace-nowrap'>
                                {t('admin.welcome.running_version', { version: version || 'Unknown' })}
                            </span>
                        </div>

                        <div className='space-y-1'>
                            <h1 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight uppercase break-words'>
                                {t('admin.welcome.welcome_back')}{' '}
                                <span className='text-primary break-words'>{userName}</span>
                            </h1>
                            <p className='text-[10px] md:text-xs lg:text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-60'>
                                {t('admin.welcome.subtitle')}
                            </p>
                        </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2 md:gap-3'>
                        <Link
                            href='/admin/servers/create'
                            className='flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-primary text-primary-foreground text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all  whitespace-nowrap'
                        >
                            <PlusCircle className='h-3.5 w-3.5 md:h-4 md:w-4 shrink-0' />
                            <span className='truncate'>{t('admin.welcome.create_server')}</span>
                        </Link>
                        <Link
                            href='/admin/users/create'
                            className='flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-secondary text-secondary-foreground text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all border border-border/50 whitespace-nowrap'
                        >
                            <UserPlus className='h-3.5 w-3.5 md:h-4 md:w-4 shrink-0' />
                            <span className='truncate'>{t('admin.welcome.add_user')}</span>
                        </Link>
                        <Link
                            href='/admin/nodes'
                            className='flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-secondary text-secondary-foreground text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all border border-border/50 whitespace-nowrap'
                        >
                            <HardDrive className='h-3.5 w-3.5 md:h-4 md:w-4 shrink-0' />
                            <span className='truncate'>{t('admin.welcome.manage_nodes')}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
