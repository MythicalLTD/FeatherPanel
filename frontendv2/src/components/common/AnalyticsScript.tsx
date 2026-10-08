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
import { setAnalyticsCookie } from '@/lib/analytics-cookie';

/** Browser tracking is permanently disabled. Stop scripts left by a hot update. */
export default function AnalyticsScript() {
    useEffect(() => {
        setAnalyticsCookie(false);
        const tracker = document.getElementById('featherpanel-umami-tracker');
        const recorder = document.getElementById('featherpanel-umami-recorder');
        const legacyScript = document.querySelector?.(
            'script[src="https://dynhost.mythical.systems/script.js"], script[src="https://dynhost.mythical.systems/recorder.js"]',
        );
        if (tracker || recorder || legacyScript) {
            // Removing a script cannot remove the listeners installed by its execution.
            window.location.reload();
        }
    }, []);
    return null;
}
