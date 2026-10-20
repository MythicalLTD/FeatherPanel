/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isSetupDeferred, useSetupStatus } from '@/lib/setup-wizard';

/** Sends the first admin of a fresh install to the setup wizard unless they chose to finish later. */
export function SetupGate() {
    const router = useRouter();
    const { pending } = useSetupStatus();

    useEffect(() => {
        if (pending && !isSetupDeferred()) router.replace('/setup');
    }, [pending, router]);

    return null;
}
