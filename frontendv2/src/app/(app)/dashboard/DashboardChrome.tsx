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

import { usePathname } from 'next/navigation';
import DashboardShell from '@/components/layout/DashboardShell';
import ChatbotWidget from '@/components/ai/ChatbotWidget';

export default function DashboardChrome({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // OAuth consent: one page, no sidebar / glow background / chatbot.
    if (pathname.includes('/oauth2/')) {
        return <>{children}</>;
    }

    return (
        <>
            <DashboardShell>{children}</DashboardShell>
            <ChatbotWidget />
        </>
    );
}
