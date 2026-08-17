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

/**
 * Passthrough wrapper kept for layout stability.
 * Spell banner as the full panel background is handled by BackgroundWrapper
 * (same fixed layer as the dashboard theme background).
 */
export function ServerSpellBackdrop({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
