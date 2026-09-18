/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { WifiOff, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useServerWingsReachability } from '@/contexts/ServerWingsReachabilityContext';
import { Card, CardContent } from '@/components/ui/card';

export function ServerNodeConnectionBanner() {
    const { t } = useTranslation();
    const { connectionStatus, isNodeUnreachable } = useServerWingsReachability();

    if (!isNodeUnreachable) {
        return null;
    }

    const isError = connectionStatus === 'error';
    const Icon = isError ? AlertTriangle : WifiOff;

    return (
        <Card className='mb-4 border-2 border-amber-500/20 bg-amber-500/10'>
            <CardContent className='p-4'>
                <div className='flex items-start gap-4'>
                    <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10'>
                        <Icon className='h-6 w-6 text-amber-500' />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <p className='font-semibold text-amber-500'>
                            {isError
                                ? t('servers.console.connection.error')
                                : t('servers.console.connection.disconnected')}
                        </p>
                        <p className='text-muted-foreground mt-1 text-sm'>
                            {isError
                                ? t('servers.console.connection.error_hint')
                                : t('servers.console.connection.disconnected_hint')}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
