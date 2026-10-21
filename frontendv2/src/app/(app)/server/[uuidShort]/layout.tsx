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

import DashboardShell from '@/components/layout/DashboardShell';
import { Metadata } from 'next';
import { cache } from 'react';
import ChatbotWidget from '@/components/ai/ChatbotWidget';
import { ServerAnnouncementBanner } from '@/components/server/ServerAnnouncementBanner';
import { ServerNodeConnectionBanner } from '@/components/server/ServerNodeConnectionBanner';
import { ServerSubdomainRequirementBanner } from '@/components/server/ServerSubdomainRequirementBanner';
import { ServerSpellBackdrop } from '@/components/server/ServerSpellBackdrop';
import { ServerWingsReachabilityProvider } from '@/contexts/ServerWingsReachabilityContext';
import { ServerProvider } from '@/contexts/ServerContext';
import { ServerSuspendedWrapper } from '@/components/server/ServerSuspendedWrapper';
import { getBaseUrl } from '@/lib/settings-api';
import { cookies } from 'next/headers';
import { Server } from '@/types/server';
import type { Notification, NotificationsResponse } from '@/types/notification';

type Props = {
    params: Promise<{ uuidShort: string }>;
};

/**
 * Server details for the page title and the initial server context. Best effort: a logged-out
 * visitor or a server the user cannot see simply gets no metadata. cache() shares one request
 * between generateMetadata and the layout within a render.
 */
async function cookieHeader(): Promise<string> {
    const cookieStore = await cookies();
    return cookieStore
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
}

const getServer = cache(async (uuidShort: string): Promise<Server | null> => {
    try {
        const cookie = await cookieHeader();

        const url = `${getBaseUrl()}/api/user/servers/${uuidShort}`;
        const res = await fetch(url, {
            headers: {
                Cookie: cookie,
                Accept: 'application/json',
            },
            // Per-user data (limits, permissions): never serve a cached copy, or a limit changed
            // by an admin keeps showing the old value.
            cache: 'no-store',
        });

        if (!res.ok) {
            // 4xx is an expected answer here (signed out, no access, unknown server).
            if (res.status >= 500) {
                console.warn(`[SEO] Server ${uuidShort} lookup failed: ${res.status} ${res.statusText}`);
            }
            return null;
        }

        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.warn('[SEO] Server lookup for metadata failed:', error);
        return null;
    }
});

/**
 * Announcements for the first paint, fetched alongside the server. Without them the banner
 * arrives after hydration and pushes the whole page down (CLS ~0.78 on the file manager).
 */
async function getAnnouncements(): Promise<Notification[] | null> {
    try {
        const res = await fetch(`${getBaseUrl()}/api/user/notifications`, {
            headers: { Cookie: await cookieHeader(), Accept: 'application/json' },
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const data = (await res.json()) as NotificationsResponse;
        return data.success && Array.isArray(data.data?.notifications) ? data.data.notifications : null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { uuidShort } = await params;

    const server = await getServer(uuidShort);

    const serverName = server?.name || `Server ${uuidShort}`;

    const title = serverName;

    return {
        title: title,
        openGraph: {
            title: title,
        },
    };
}

export default async function ServerLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ uuidShort: string }>;
}) {
    const { uuidShort } = await params;
    const [server, announcements] = await Promise.all([getServer(uuidShort), getAnnouncements()]);

    return (
        <ServerProvider uuidShort={uuidShort} initialServer={server}>
            <ServerWingsReachabilityProvider>
                <DashboardShell>
                    <ServerSuspendedWrapper>
                        <ServerSpellBackdrop>
                            <ServerAnnouncementBanner initialNotifications={announcements} />
                            <ServerNodeConnectionBanner />
                            <ServerSubdomainRequirementBanner />
                            {children}
                        </ServerSpellBackdrop>
                    </ServerSuspendedWrapper>
                </DashboardShell>
                <ChatbotWidget />
            </ServerWingsReachabilityProvider>
        </ServerProvider>
    );
}
