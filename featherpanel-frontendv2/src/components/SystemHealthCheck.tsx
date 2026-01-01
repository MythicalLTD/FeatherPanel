/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use client";

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
                        'Accept': 'application/json',
                    },
                    cache: 'no-store'
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
