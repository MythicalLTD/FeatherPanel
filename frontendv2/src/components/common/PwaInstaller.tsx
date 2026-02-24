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
import { useSettings } from '@/contexts/SettingsContext';

export function PwaInstaller() {
    const { settings } = useSettings();

    useEffect(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;
        if (!settings || settings.app_pwa_enabled !== 'true') return;

        // Register service worker for PWA installability.
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Silently ignore SW registration failures; PWA is a progressive enhancement.
        });

        // Proactively trigger the install prompt when criteria are met.
        const handler = (event: Event) => {
            const e = event as BeforeInstallPromptEvent;
            e.preventDefault();
            // Show the browser's native install prompt immediately.
            e.prompt().catch(() => undefined);
        };

        window.addEventListener('beforeinstallprompt', handler as EventListener);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler as EventListener);
        };
    }, [settings]);

    return null;
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
}
