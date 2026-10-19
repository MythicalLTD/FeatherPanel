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

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getServerBootData, ICON_LIBRARY_COOKIE_NAME, LOCALE_COOKIE_NAME } from '@/lib/server-boot';

export async function generateMetadata(): Promise<Metadata> {
    const cookieStore = await cookies();
    const boot = await getServerBootData(
        cookieStore.get(LOCALE_COOKIE_NAME)?.value,
        cookieStore.get(ICON_LIBRARY_COOKIE_NAME)?.value,
    );
    const panelName = boot.settings?.app_name?.trim() || 'FeatherPanel';
    return {
        title: { absolute: `${panelName} OS` },
        robots: { index: false, follow: false },
    };
}

export default function FeatherOsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
