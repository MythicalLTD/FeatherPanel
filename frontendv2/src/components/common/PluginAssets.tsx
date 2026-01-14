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
