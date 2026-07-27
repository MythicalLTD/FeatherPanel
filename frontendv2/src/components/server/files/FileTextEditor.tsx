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

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { OnMount } from '@monaco-editor/react';
import { oneDark } from '@codemirror/theme-one-dark';
import { getCodeMirrorExtensions } from '@/lib/codemirror-languages';
import type { FileEditorEngine } from '@/hooks/useFileEditorEngine';
import { Loader2 } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.Editor), {
    ssr: false,
    loading: () => (
        <div className='flex h-full items-center justify-center'>
            <Loader2 className='text-primary h-8 w-8 animate-spin' />
        </div>
    ),
});

const CodeMirrorEditor = dynamic(() => import('@uiw/react-codemirror'), {
    ssr: false,
    loading: () => (
        <div className='flex h-full items-center justify-center'>
            <Loader2 className='text-primary h-8 w-8 animate-spin' />
        </div>
    ),
});

type FileTextEditorProps = {
    engine: FileEditorEngine;
    fileName: string;
    content: string;
    canEdit: boolean;
    theme: string;
    onChange: (value: string) => void;
    onMonacoMount?: OnMount;
};

function getMonacoLanguage(name: string) {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'json':
            return 'json';
        case 'html':
            return 'html';
        case 'css':
            return 'css';
        case 'md':
            return 'markdown';
        case 'py':
            return 'python';
        case 'sh':
            return 'shell';
        case 'yml':
        case 'yaml':
            return 'yaml';
        default:
            return 'plaintext';
    }
}

export function FileTextEditor({
    engine,
    fileName,
    content,
    canEdit,
    theme,
    onChange,
    onMonacoMount,
}: FileTextEditorProps) {
    const codeMirrorExtensions = useMemo(() => getCodeMirrorExtensions(fileName), [fileName]);
    const isDark = theme === 'dark';

    if (engine === 'codemirror') {
        return (
            <CodeMirrorEditor
                value={content}
                height='100%'
                extensions={codeMirrorExtensions}
                theme={isDark ? oneDark : 'light'}
                editable={canEdit}
                onChange={(value) => onChange(value)}
                basicSetup={{
                    lineNumbers: true,
                    highlightActiveLine: true,
                    highlightActiveLineGutter: true,
                    foldGutter: true,
                }}
                className='h-full [&_.cm-editor]:h-full [&_.cm-editor]:outline-none'
            />
        );
    }

    return (
        <MonacoEditor
            height='100%'
            defaultLanguage={getMonacoLanguage(fileName)}
            value={content}
            theme={isDark ? 'vs-dark' : 'light'}
            onMount={onMonacoMount}
            onChange={(value) => {
                if (value !== undefined) {
                    onChange(value);
                }
            }}
            options={{
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                readOnly: !canEdit,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                cursorSmoothCaretAnimation: 'on',
                cursorBlinking: 'expand',
                smoothScrolling: true,
            }}
        />
    );
}
