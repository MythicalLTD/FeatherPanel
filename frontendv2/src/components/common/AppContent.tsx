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

import { Suspense } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import TopLoadingBar from '@/components/common/TopLoadingBar';
import AppPreloader from '@/components/common/AppPreloader';
import PageTransition from '@/components/common/PageTransition';

export default function AppContent({ children }: { children: React.ReactNode }) {
    const { initialLoading } = useTranslation();

    if (initialLoading) {
        return <AppPreloader />;
    }

    return (
        <>
            <Suspense fallback={null}>
                <TopLoadingBar />
            </Suspense>
            <PageTransition>{children}</PageTransition>
        </>
    );
}
