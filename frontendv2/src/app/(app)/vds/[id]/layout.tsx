/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import { getBaseUrl } from '@/lib/settings-api';
import { cookies } from 'next/headers';
import { VmInstanceProvider, VmInstance } from '@/contexts/VmInstanceContext';

type Props = {
    params: Promise<{ id: string }>;
};

async function getVmInstance(id: string): Promise<VmInstance | null> {
    try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ');

        const baseUrl = getBaseUrl();
        const url = `${baseUrl}/api/user/vm-instances/${id}`;

        const res = await fetch(url, {
            headers: {
                Cookie: cookieHeader,
                Accept: 'application/json',
            },
            next: { revalidate: 10 },
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data.success ? data.data.instance : null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const instance = await getVmInstance(id);
    const title = instance?.hostname || `VDS #${id}`;
    return {
        title,
        openGraph: { title },
    };
}

export default async function VdsLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const instance = await getVmInstance(id);

    return (
        <VmInstanceProvider instanceId={parseInt(id, 10)} initialInstance={instance}>
            <DashboardShell>{children}</DashboardShell>
            <ChatbotWidget />
        </VmInstanceProvider>
    );
}
