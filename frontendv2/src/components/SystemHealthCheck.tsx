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

    useEffect(() => {
        if (pathname === '/maintenance') {
            return;
        }

        const checkHealth = async () => {
            try {
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

                    window.location.href = '/maintenance';
                }
            } catch (error) {
                console.error('System health check error:', error);

                window.location.href = '/maintenance';
            } finally {
            }
        };

        checkHealth();
    }, [pathname]);

    return null;
}
