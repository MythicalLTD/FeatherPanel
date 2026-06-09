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

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_DELAY_MS = 10_000;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2_000;
const NOT_READY_CONFIRMATIONS = 2;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSelfTest(): Promise<SelfTestResponse | null> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch('/api/selftest', {
            headers: {
                Accept: 'application/json',
            },
            cache: 'no-store',
            signal: controller.signal,
        });

        if (!res.ok) {
            return null;
        }

        return (await res.json()) as SelfTestResponse;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.warn('System health check timed out');
        } else {
            console.warn('System health check request failed:', error);
        }
        return null;
    } finally {
        window.clearTimeout(timeoutId);
    }
}

async function checkSystemHealth(): Promise<boolean> {
    let notReadyCount = 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const data = await fetchSelfTest();

        if (data?.success && data.data?.status === 'ready') {
            return true;
        }

        if (data?.success && data.data?.status === 'not_ready') {
            notReadyCount++;
            if (notReadyCount >= NOT_READY_CONFIRMATIONS) {
                return false;
            }
        }

        if (attempt < MAX_RETRIES - 1) {
            await sleep(RETRY_DELAY_MS * (attempt + 1));
        }
    }

    return true;
}

export default function SystemHealthCheck() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname === '/maintenance') {
            return;
        }

        let cancelled = false;
        let intervalId: number | undefined;

        const runCheck = async () => {
            const healthy = await checkSystemHealth();
            if (!cancelled && !healthy) {
                console.error('System health check reported not_ready');
                window.location.href = '/maintenance';
            }
        };

        const initialTimeoutId = window.setTimeout(() => {
            if (cancelled) {
                return;
            }

            void runCheck();
            intervalId = window.setInterval(() => {
                void runCheck();
            }, CHECK_INTERVAL_MS);
        }, INITIAL_DELAY_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(initialTimeoutId);
            if (intervalId !== undefined) {
                window.clearInterval(intervalId);
            }
        };
    }, [pathname]);

    return null;
}
