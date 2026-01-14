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

export default function PluginAssets() {
    useEffect(() => {
        // Load plugin CSS
        const cssLinkId = 'featherpanel-plugin-css';
        let cssLink = document.getElementById(cssLinkId) as HTMLLinkElement;

        if (!cssLink) {
            cssLink = document.createElement('link');
            cssLink.id = cssLinkId;
            cssLink.rel = 'stylesheet';
            cssLink.type = 'text/css';
            cssLink.href = '/api/system/plugin-css';
            // Add cache busting
            cssLink.href += `?v=${Date.now()}`;
            document.head.appendChild(cssLink);
        } else {
            // Update cache busting on existing link
            cssLink.href = `/api/system/plugin-css?v=${Date.now()}`;
        }

        // Load plugin JavaScript
        const jsScriptId = 'featherpanel-plugin-js';
        let jsScript = document.getElementById(jsScriptId) as HTMLScriptElement;

        if (!jsScript) {
            jsScript = document.createElement('script');
            jsScript.id = jsScriptId;
            jsScript.type = 'text/javascript';
            jsScript.src = `/api/system/plugin-js?v=${Date.now()}`;
            jsScript.async = true;
            document.body.appendChild(jsScript);
        } else {
            // Remove old script and add new one to reload
            jsScript.remove();
            jsScript = document.createElement('script');
            jsScript.id = jsScriptId;
            jsScript.type = 'text/javascript';
            jsScript.src = `/api/system/plugin-js?v=${Date.now()}`;
            jsScript.async = true;
            document.body.appendChild(jsScript);
        }

        // Cleanup function
        return () => {
            // Don't remove on cleanup as we want these to persist
            // They will be reloaded on next mount anyway
        };
    }, []);

    return null;
}
