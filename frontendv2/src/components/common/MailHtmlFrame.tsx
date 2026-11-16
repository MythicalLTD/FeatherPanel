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

import { cn } from '@/lib/utils';

/**
 * Sandbox flags for iframes that show stored mail HTML. The frame gets an opaque
 * origin and cannot run scripts; links may still open in a new tab.
 */
export const MAIL_FRAME_SANDBOX = 'allow-popups allow-popups-to-escape-sandbox';

/** Wraps a mail body in a minimal document: links open in a new tab, scripts are off. */
export function buildMailFrameDocument(html: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base target="_blank">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 16px; background: #fff; }
img { max-width: 100%; height: auto; }
table { max-width: 100%; }
</style>
</head>
<body>${html}</body>
</html>`;
}

interface MailHtmlFrameProps {
    html: string;
    title: string;
    className?: string;
}

/** Shows stored mail HTML inside a sandboxed iframe. */
export default function MailHtmlFrame({ html, title, className }: MailHtmlFrameProps) {
    return (
        <iframe
            srcDoc={buildMailFrameDocument(html)}
            sandbox={MAIL_FRAME_SANDBOX}
            referrerPolicy='no-referrer'
            className={cn('w-full border-0 bg-white', className)}
            title={title}
        />
    );
}
