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

import { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

/**
 * Pass-through wrapper. Do NOT remount children on pathname change — that tears down
 * DashboardShell / navbar / widgets and causes chrome flash on every navigation.
 */
export default function PageTransition({ children }: PageTransitionProps) {
    return <div className='motion-content min-h-screen'>{children}</div>;
}
