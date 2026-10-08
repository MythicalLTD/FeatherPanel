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
import { UserPlus, HardDrive, CheckCircle2, AlertTriangle, Download, Server } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/featherui/Button';
import { FormSection } from '@/components/featherui/FormSection';
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
    ok: 'text-emerald-700 dark:text-emerald-400',
    warn: 'text-amber-800 dark:text-amber-400',
    info: 'text-foreground',
    neutral: 'text-muted-foreground',
};

export function WelcomeWidget({ version, chips = [], updateAvailable }: WelcomeWidgetProps) {
    const { user, isLoading: sessionLoading } = useSession();
    const { t } = useTranslation();

    const userLoading = sessionLoading && !user;
    const versionLoading = version === undefined;
    const userName = user ? `${user.first_name} ${user.last_name}` : 'Admin';

    return (
        <FormSection className='space-y-3 p-4 sm:p-4'>
            <div className='flex flex-col justify-between gap-4 xl:flex-row xl:items-center'>
                <div className='max-w-2xl min-w-0 space-y-1.5'>
                    <h2 className='text-sm font-semibold wrap-break-word'>
                        {t('admin.welcome.welcome_back')}{' '}
                        {userLoading ? (
                            <span
                                className='bg-primary/20 inline-block h-[0.85em] w-36 animate-pulse rounded-md align-middle sm:w-44'
                                aria-busy='true'
                            />
                        ) : (
                            <span className='wrap-break-word'>{userName}</span>
                        )}
                    </h2>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                    <CreateServerAction />
                    <Button asChild variant='secondary' className='gap-2'>
                        <Link href='/admin/users/create'>
                            <UserPlus className='h-3.5 w-3.5 shrink-0 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin.welcome.add_user')}</span>
                        </Link>
                    </Button>
                    <Button asChild variant='ghost' className='text-muted-foreground gap-2'>
                        <Link href='/admin/nodes'>
                            <HardDrive className='h-3.5 w-3.5 shrink-0 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin.welcome.manage_nodes')}</span>
                        </Link>
                    </Button>
                    {updateAvailable && (
                        <Link
                            href='/admin/updates'
                            className='inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-500/10 dark:text-amber-400'
                        >
                            <Download className='h-3.5 w-3.5 shrink-0 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin.welcome.view_updates')}</span>
                        </Link>
                    )}
                </div>
            </div>
            <div className='flex flex-wrap items-center gap-x-5 gap-y-2 text-xs'>
                <span className='text-muted-foreground'>
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
                            className={cn('inline-flex items-center gap-1.5', chipStyles[chip.tone || 'neutral'])}
                        >
                            <Icon className='h-3.5 w-3.5 shrink-0' aria-hidden />
                            <span>{chip.label}</span>
                        </span>
                    );
                })}
            </div>
        </FormSection>
    );
}
