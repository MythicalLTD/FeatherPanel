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

import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import TopLoadingBar from '@/components/common/TopLoadingBar';
import AppPreloader from '@/components/common/AppPreloader';
import PageTransition from '@/components/common/PageTransition';
import HackerEasterEgg from '@/components/common/HackerEasterEgg';

export default function AppContent({ children }: { children: React.ReactNode }) {
    const { initialLoading } = useTranslation();
    const [forceUnblock, setForceUnblock] = useState(false);

    useEffect(() => {
        if (!initialLoading) return;

        // Guard against indefinite preloader state caused by challenge loops or hanging requests.
        const timer = window.setTimeout(() => setForceUnblock(true), 12000);
        return () => window.clearTimeout(timer);
    }, [initialLoading]);

    if (initialLoading && !forceUnblock) {
        return <AppPreloader />;
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
