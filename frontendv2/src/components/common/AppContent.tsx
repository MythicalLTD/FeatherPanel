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

import { Suspense, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import TopLoadingBar from '@/components/common/TopLoadingBar';
import PageTransition from '@/components/common/PageTransition';
import HackerEasterEgg from '@/components/common/HackerEasterEgg';

export default function AppContent({ children }: { children: React.ReactNode }) {
    const { ready } = useTranslation();

    useEffect(() => {
        document.documentElement.dataset.fpHydrated = '1';
    }, []);

    // Cold start only (no translation cache yet). Cached visits paint immediately.
    if (!ready) {
        return (
            <div className='bg-background flex min-h-svh items-center justify-center'>
                <div className='border-muted-foreground/30 border-t-primary h-8 w-8 animate-spin rounded-full border-2' />
            </div>
        );
    }

    return (
        <HackerEasterEgg>
            <Suspense fallback={null}>
                <TopLoadingBar />
            </Suspense>
            <PageTransition>{children}</PageTransition>
        </HackerEasterEgg>
    );
}
