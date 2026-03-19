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

interface AnalyticsScriptProps {
    enabled: boolean;
}

export default function AnalyticsScript({ enabled }: AnalyticsScriptProps) {
    useEffect(() => {
        if (!enabled) return;

        // Load analytics script dynamically on client side
        const script = document.createElement('script');
        script.src = 'https://dynhost.mythical.systems/script.js';
        script.dataset.websiteId = '71281b01-8c95-4fac-9f58-6d68aac179d7';
        script.defer = true;
        document.head.appendChild(script);
    }, [enabled]);

    return null;
}
