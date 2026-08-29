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

import { APP_MONO_FONT_STACK } from '@/lib/mono-font';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { yaml } from '@codemirror/lang-yaml';
import { StreamLanguage } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

const editorTheme = EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': {
        overflow: 'auto',
        fontFamily: APP_MONO_FONT_STACK,
        fontSize: '14px',
    },
    '.cm-content': { paddingTop: '20px' },
    '.cm-gutters': { minHeight: '100%' },
});

export function getCodeMirrorExtensions(fileName: string): Extension[] {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageExtensions: Extension[] = [];

    switch (ext) {
        case 'js':
            languageExtensions.push(javascript());
            break;
        case 'jsx':
            languageExtensions.push(javascript({ jsx: true }));
            break;
        case 'ts':
            languageExtensions.push(javascript({ typescript: true }));
            break;
        case 'tsx':
            languageExtensions.push(javascript({ jsx: true, typescript: true }));
            break;
        case 'json':
            languageExtensions.push(json());
            break;
        case 'html':
            languageExtensions.push(html());
            break;
        case 'css':
            languageExtensions.push(css());
            break;
        case 'md':
            languageExtensions.push(markdown());
            break;
        case 'py':
            languageExtensions.push(python());
            break;
        case 'sh':
            languageExtensions.push(StreamLanguage.define(shell));
            break;
        case 'yml':
        case 'yaml':
            languageExtensions.push(yaml());
            break;
        default:
            break;
    }

    return [...languageExtensions, editorTheme];
}
