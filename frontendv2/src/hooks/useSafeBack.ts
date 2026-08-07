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

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { inferParentPath } from '@/lib/safe-back';

/**
 * Returns a Cancel / Go back handler that always stays inside the panel.
 * Prefer an explicit fallback when the parent route needs query params
 * (e.g. file manager directory).
 */
export function useSafeBack(fallback?: string) {
    const router = useRouter();
    const pathname = usePathname();
    const target = fallback ?? inferParentPath(pathname || '/dashboard');

    return useCallback(() => {
        router.push(target);
    }, [router, target]);
}
