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
import { usePathname } from 'next/navigation';

interface SelfTestResponse {
    success: boolean;
    data?: {
        status: string;
        cached: boolean;
    };
}

export default function SystemHealthCheck() {
    const pathname = usePathname();
    // const [checked, setChecked] = useState(false); // Unused

    useEffect(() => {
        // Skip check if already on maintenance page to avoid loops
        if (pathname === '/maintenance') {
            return;
        }

        const checkHealth = async () => {
            try {
                // Use relative path for API call. Next.js rewrites should handle this in dev/prod
                // or assume backend is on same domain/port configuration.
                // Since this is a "SelfTest", we assume /api is proxied or available.
                const res = await fetch('/api/selftest', {
                    headers: {
                        Accept: 'application/json',
                    },
                    cache: 'no-store',
                });

                if (!res.ok) {
                    throw new Error('Network response was not ok');
                }

                const data: SelfTestResponse = await res.json();

                if (!data.success || data.data?.status !== 'ready') {
                    console.error('System health check failed:', data);
                    // Use window.location.href to force a full page reload and escape potential React state loops
                    window.location.href = '/maintenance';
                }
            } catch (error) {
                console.error('System health check error:', error);
                // Use window.location.href to force a full page reload and escape potential React state loops
                window.location.href = '/maintenance';
            } finally {
                // Check complete
            }
        };

        checkHealth();

        // Optional: Check every 5 minutes?
        // For now just check on mount/navigation implicitly via layout re-renders if any.
        // Actually layout doesn't unmount on page change, so this runs once per hard load.
        // That is acceptable for a "Startup" kind of check.
    }, [pathname]);

    return null; // This component renders nothing
}
