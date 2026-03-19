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
            <div className='flex items-center justify-center min-h-[60vh]'>
                <div className='max-w-2xl w-full mx-auto px-4'>
                    <div className='relative group'>
                        <div className='absolute -inset-0.5 bg-linear-to-r from-red-500/50 to-red-500/30 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000' />

                        <div className='relative rounded-3xl border-2 border-red-500/20 bg-card/95 backdrop-blur-xl p-8 md:p-12'>
                            <div className='text-center space-y-6'>
                                <div className='relative'>
                                    <div className='inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-red-500/10 mb-4'>
                                        <AlertTriangle className='h-12 w-12 text-red-500' />
                                    </div>
                                </div>

                                <div className='space-y-3'>
                                    <h2 className='text-2xl md:text-3xl font-bold tracking-tight text-red-500'>
                                        {t('servers.suspended_banner.title')}
                                    </h2>
                                    <p className='text-muted-foreground max-w-md mx-auto text-lg'>
                                        {t('servers.suspended_banner.message')}
                                    </p>
                                </div>

                                <div className='flex flex-col sm:flex-row gap-3 justify-center pt-4'>
                                    {supportUrl && (
                                        <Button
                                            variant='default'
                                            className='bg-red-500 hover:bg-red-600 text-white'
                                            onClick={() => window.open(supportUrl, '_blank')}
                                        >
                                            <AlertTriangle className='h-4 w-4 mr-2' />
                                            {t('servers.suspended_banner.contact_support')}
                                        </Button>
                                    )}
                                    <Link href='/dashboard'>
                                        <Button variant='outline' className='w-full sm:w-auto'>
                                            <Home className='h-4 w-4 mr-2' />
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
