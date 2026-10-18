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

import { useEffect, useRef } from 'react';

/**
 * Warns before leaving a page that has unsaved edits: the browser prompt covers reloads and
 * closing the tab, and a confirm covers in-app links (sidebar, breadcrumbs, server switcher).
 */
export function useUnsavedChangesGuard(dirty: boolean, message: string) {
    const messageRef = useRef(message);
    useEffect(() => {
        messageRef.current = message;
    }, [message]);

    useEffect(() => {
        if (!dirty) return;

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            // Older browsers only show the prompt when returnValue is set.
            event.returnValue = '';
        };

        const onClickCapture = (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
            if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;

            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            // Same page with other query params (tabs, categories) keeps the form state.
            if (url.pathname === window.location.pathname) return;

            if (!window.confirm(messageRef.current)) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        window.addEventListener('beforeunload', onBeforeUnload);
        document.addEventListener('click', onClickCapture, true);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            document.removeEventListener('click', onClickCapture, true);
        };
    }, [dirty]);
}
