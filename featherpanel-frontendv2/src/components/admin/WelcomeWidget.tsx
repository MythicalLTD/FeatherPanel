/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
        <div className='relative overflow-hidden rounded-[2.5rem] bg-card/30 border border-border/50 p-6 md:p-10 mb-8 group backdrop-blur-3xl'>
            <div className='absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] -mr-48 -mt-48 rounded-full group-hover:bg-primary/10 transition-all duration-700 pointer-events-none' />
            <div className='absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 blur-[120px] -ml-48 -mb-48 rounded-full group-hover:bg-secondary/10 transition-all duration-700 pointer-events-none' />

            <div className='relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8'>
                <div className='space-y-6'>
                    <div className='space-y-4'>
                        <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit'>
                            <Sparkles className='h-3.5 w-3.5 text-primary animate-pulse' />
                            <span className='text-[9px] font-black uppercase tracking-widest text-primary/80'>
                                {t('admin.welcome.running_version', { version: version || 'Unknown' })}
                            </span>
                        </div>

                        <div className='space-y-1'>
                            <h1 className='text-3xl md:text-5xl font-black tracking-tight uppercase'>
                                {t('admin.welcome.welcome_back')}
                                <span className='text-primary'>{userName}</span>
                            </h1>
                            <p className='text-xs md:text-sm text-muted-foreground font-bold uppercase tracking-widest opacity-60'>
                                {t('admin.welcome.subtitle')}
                            </p>
                        </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-3'>
                        <Link
                            href='/admin/servers/new'
                            className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20'
                        >
                            <PlusCircle className='h-4 w-4' />
                            {t('admin.welcome.create_server')}
                        </Link>
                        <Link
                            href='/admin/users/new'
                            className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all border border-border/50'
                        >
                            <UserPlus className='h-4 w-4' />
                            {t('admin.welcome.add_user')}
                        </Link>
                        <Link
                            href='/admin/nodes'
                            className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all border border-border/50'
                        >
                            <HardDrive className='h-4 w-4' />
                            {t('admin.welcome.manage_nodes')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
