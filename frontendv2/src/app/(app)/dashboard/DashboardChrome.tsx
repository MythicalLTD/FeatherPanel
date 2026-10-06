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

    // OAuth consent redirect flow: one page, no sidebar / glow background / chatbot.
    // Device-code entry stays in the normal dashboard shell because users open it from Account > API Keys.
    if (pathname === '/dashboard/account/oauth2/api/new') {
        return <>{children}</>;
    }

    return (
        <>
            <DashboardShell>{children}</DashboardShell>
            <ChatbotWidget />
        </>
    );
}
