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
import { Monitor } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

/**
 * FeatherOS is a mouse/keyboard desktop shell. On phones and tablets we refuse to
 * mount it and show a short message instead of a broken half-UI.
 */
export function useIsDesktopOs(): boolean | null {
    const [ok, setOk] = useState<boolean | null>(null);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 900px) and (pointer: fine)');
        const sync = () => setOk(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);
    return ok;
}

export function DesktopOnlyGate({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const ok = useIsDesktopOs();
    if (ok === null) {
        return <div className='bg-background fixed inset-0 z-[200]' />;
    }
    if (!ok) {
        return (
            <div className='bg-background text-foreground fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 p-8 text-center'>
                <Monitor className='text-muted-foreground h-14 w-14' />
                <h1 className='text-xl font-semibold'>{t('featheros.desktop_only.title')}</h1>
                <p className='text-muted-foreground max-w-md text-sm'>{t('featheros.desktop_only.body')}</p>
                <Link
                    href='/dashboard'
                    className='bg-primary text-primary-foreground mt-2 rounded-md px-4 py-2 text-sm font-medium'
                >
                    {t('featheros.desktop_only.back')}
                </Link>
            </div>
        );
    }
    return <>{children}</>;
}
