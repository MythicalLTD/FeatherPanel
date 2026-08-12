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

/**
 * Start a browser download from a cross-origin signed URL (e.g. Wings
 * `/download/file` or `/download/backup` with Content-Disposition: attachment).
 *
 * Do not use `window.open(url)` after an `await`: popup blockers treat that as
 * non-user-initiated and silently block the download. A hidden iframe navigates
 * without leaving the panel and does not require a popup gesture.
 */
export function triggerSignedUrlDownload(url: string): void {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden;pointer-events:none';
    iframe.src = url;
    document.body.appendChild(iframe);

    window.setTimeout(() => {
        iframe.remove();
    }, 120_000);
}
