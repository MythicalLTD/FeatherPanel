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
        const cssLinkId = 'featherpanel-plugin-css';
        let cssLink = document.getElementById(cssLinkId) as HTMLLinkElement;

        if (!cssLink) {
            cssLink = document.createElement('link');
            cssLink.id = cssLinkId;
            cssLink.rel = 'stylesheet';
            cssLink.type = 'text/css';
            cssLink.href = '/api/system/plugin-css';

            cssLink.href += `?v=${Date.now()}`;
            document.head.appendChild(cssLink);
        } else {
            cssLink.href = `/api/system/plugin-css?v=${Date.now()}`;
        }

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
            jsScript.remove();
            jsScript = document.createElement('script');
            jsScript.id = jsScriptId;
            jsScript.type = 'text/javascript';
            jsScript.src = `/api/system/plugin-js?v=${Date.now()}`;
            jsScript.async = true;
            document.body.appendChild(jsScript);
        }

        return () => {};
    }, []);

    return null;
}
