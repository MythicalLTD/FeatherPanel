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

import { WebSpaceShell } from '@/components/webspace/WebSpaceShell';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getBaseUrl } from '@/lib/settings-api';
import { WebSpace } from '@/types/webspace';

type Props = {
    params: Promise<{ uuidShort: string }>;
};

async function getWebSpace(uuidShort: string): Promise<WebSpace | null> {
    try {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join('; ');
        const baseUrl = getBaseUrl();
        const res = await fetch(`${baseUrl}/api/user/webspaces/${uuidShort}`, {
            headers: { Cookie: cookieHeader, Accept: 'application/json' },
            next: { revalidate: 10 },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.success ? (data.data.webspace as WebSpace) : null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { uuidShort } = await params;
    const webspace = await getWebSpace(uuidShort);
    const title = webspace?.name || `WebSpace ${uuidShort}`;

    return {
        title,
        openGraph: { title },
    };
}

export default async function WebSpaceLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ uuidShort: string }>;
}) {
    const { uuidShort } = await params;
    const webspace = await getWebSpace(uuidShort);

    return (
        <WebSpaceShell uuidShort={uuidShort} initialWebSpace={webspace}>
            {children}
        </WebSpaceShell>
    );
}
