/*
This file is part of FeatherPanel.
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

'use client';

import DashboardShell from '@/components/layout/DashboardShell';
import { WebSpaceProvider } from '@/contexts/WebSpaceContext';
import { WebSpaceSuspendedBanner } from '@/components/webspace/WebSpaceSuspendedBanner';
import { WebSpace } from '@/types/webspace';

export function WebSpaceShell({
    children,
    uuidShort,
    initialWebSpace,
}: {
    children: React.ReactNode;
    uuidShort: string;
    initialWebSpace?: WebSpace | null;
}) {
    return (
        <WebSpaceProvider uuidShort={uuidShort} initialWebSpace={initialWebSpace}>
            <DashboardShell>
                <WebSpaceSuspendedBanner>{children}</WebSpaceSuspendedBanner>
            </DashboardShell>
        </WebSpaceProvider>
    );
}
