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

import { ReactNode } from 'react';
import { useServer } from '@/contexts/ServerContext';
import { AlertTriangle, Home } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/featherui/Button';
import Link from 'next/link';

interface ServerSuspendedWrapperProps {
    children: ReactNode;
}

export function ServerSuspendedWrapper({ children }: ServerSuspendedWrapperProps) {
    const { server } = useServer();
    const { t } = useTranslation();
    const { settings } = useSettings();

    // If server is suspended, show only the suspended message
    if (server?.suspended === 1) {
        const supportUrl = settings?.app_support_url;

        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <div className='mx-auto w-full max-w-2xl px-4'>
                    <div className='group relative'>
                        <div className='absolute -inset-0.5 rounded-3xl bg-linear-to-r from-red-500/50 to-red-500/30 opacity-20 blur transition duration-1000 group-hover:opacity-30' />

                        <div className='bg-card/95 relative rounded-3xl border-2 border-red-500/20 p-8 backdrop-blur-xl md:p-12'>
                            <div className='space-y-6 text-center'>
                                <div className='relative'>
                                    <div className='mb-4 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-red-500/10'>
                                        <AlertTriangle className='h-12 w-12 text-red-500' />
                                    </div>
                                </div>

                                <div className='space-y-3'>
                                    <h2 className='text-2xl font-bold tracking-tight text-red-500 md:text-3xl'>
                                        {t('servers.suspended_banner.title')}
                                    </h2>
                                    <p className='text-muted-foreground mx-auto max-w-md text-lg'>
                                        {t('servers.suspended_banner.message')}
                                    </p>
                                </div>

                                <div className='flex flex-col justify-center gap-3 pt-4 sm:flex-row'>
                                    {supportUrl && (
                                        <Button
                                            variant='default'
                                            className='bg-red-500 text-white hover:bg-red-600'
                                            onClick={() => window.open(supportUrl, '_blank')}
                                        >
                                            <AlertTriangle className='mr-2 h-4 w-4' />
                                            {t('servers.suspended_banner.contact_support')}
                                        </Button>
                                    )}
                                    <Link href='/dashboard'>
                                        <Button variant='outline' className='w-full sm:w-auto'>
                                            <Home className='mr-2 h-4 w-4' />
                                            {t('servers.suspended_banner.back_to_dashboard')}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Server is not suspended, render children normally
    return <>{children}</>;
}
