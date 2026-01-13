/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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

import DashboardShell from '@/components/layout/DashboardShell';
import { Metadata } from 'next';
import ChatbotWidget from '@/components/ai/ChatbotWidget';

type Props = {
    params: Promise<{ uuidShort: string }>;
};

import { getBaseUrl } from '@/lib/settings-api';

import { cookies } from 'next/headers';
import { Server } from '@/types/server';

async function getServer(uuidShort: string): Promise<Server | null> {
    try {
        const cookieStore = await cookies();
        // Forward all cookies to ensure authentication (including remember_token) works correctly
        const allCookies = cookieStore.getAll();
        const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');

        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/api/user/servers/${uuidShort}`;

        console.log(`[SEO] Fetching server details for uuidShort: '${uuidShort}' using URL: ${url}`);

        const res = await fetch(url, {
            headers: {
                Cookie: cookieHeader,
                Accept: 'application/json',
            },
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            console.error(`[SEO] Failed to fetch server ${uuidShort} from ${url}: ${res.status} ${res.statusText}`);
            return null;
        }

        const data = await res.json();
        console.log(`[SEO] Server fetch response for ${uuidShort}:`, JSON.stringify(data).substring(0, 200));
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[SEO] Error fetching server for metadata:', error);
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    // read route params
    const { uuidShort } = await params;

    const server = await getServer(uuidShort);

    // Use server name if available, otherwise fallback pattern
    const serverName = server?.name || `Server ${uuidShort}`;

    // Root layout handles the "| AppName" suffix via title.template
    const title = serverName;

    return {
        title: title,
        openGraph: {
            title: title,
        },
    };
}

import { ServerProvider } from '@/contexts/ServerContext';

export default async function ServerLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ uuidShort: string }>;
}) {
    const { uuidShort } = await params;
    const server = await getServer(uuidShort);

    return (
        <ServerProvider uuidShort={uuidShort} initialServer={server}>
            <DashboardShell>{children}</DashboardShell>
            <ChatbotWidget />
        </ServerProvider>
    );
}
