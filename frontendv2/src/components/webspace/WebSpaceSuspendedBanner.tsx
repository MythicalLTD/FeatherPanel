/*
This file is part of FeatherPanel.
 */

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
import { AlertTriangle, Home } from 'lucide-react';
import Link from 'next/link';
import { useWebSpace } from '@/contexts/WebSpaceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';

export function WebSpaceSuspendedBanner({ children }: { children: ReactNode }) {
    const { webspace } = useWebSpace();
    const { t } = useTranslation();

    if (webspace?.suspended === 1 || webspace?.status === 'suspended') {
        return (
            <div className='flex min-h-[50vh] items-center justify-center'>
                <div className='border-border mx-auto max-w-lg rounded-xl border p-8 text-center'>
                    <AlertTriangle className='mx-auto mb-4 h-10 w-10 text-amber-500' />
                    <h2 className='text-lg font-semibold'>{t('webSpaces.suspended.title')}</h2>
                    <p className='text-muted-foreground mt-2 text-sm'>{t('webSpaces.suspended.description')}</p>
                    <Link href='/webspaces' className='mt-4 inline-block'>
                        <Button variant='outline' size='sm'>
                            <Home className='mr-2 h-4 w-4' />
                            {t('webSpaces.suspended.back')}
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
