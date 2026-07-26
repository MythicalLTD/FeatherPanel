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

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy /admin/feathercloud/plugins marketplace redirected to the single
 * Mythic products marketplace (/panel/products + releases + reviews).
 */
export default function LegacyPluginsMarketplaceRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/feathercloud/products');
    }, [router]);

    return null;
}
