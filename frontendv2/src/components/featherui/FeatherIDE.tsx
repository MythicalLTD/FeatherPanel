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

import React, { useRef } from 'react';
import { Editor, EditorProps, OnMount } from '@monaco-editor/react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { Loader2, AlignLeft } from 'lucide-react';
import { Button } from './Button';

interface FeatherIDEProps extends Omit<EditorProps, 'theme'> {
    className?: string;
    containerClassName?: string;
    title?: string;
}

export function FeatherIDE({ className, containerClassName, options, title, ...props }: FeatherIDEProps) {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const editorRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        if (props.onMount) {
            props.onMount(editor, monaco);
        }
    };

    const formatDocument = () => {
        if (editorRef.current) {
            editorRef.current.getAction('editor.action.formatDocument').run();
        }
    };

    return (
        <div
            className={cn(
                'border-border/50 bg-card flex flex-col overflow-hidden rounded-2xl border shadow-xl',
                containerClassName,
            )}
        >
            <div className='border-border/50 bg-muted/20 flex items-center justify-between border-b px-4 py-2'>
                <div className='flex items-center gap-2'>
                    <div className='flex gap-1.5'>
                        <div className='h-3 w-3 rounded-full bg-red-500/50' />
                        <div className='h-3 w-3 rounded-full bg-yellow-500/50' />
                        <div className='h-3 w-3 rounded-full bg-green-500/50' />
                    </div>
                    {title && (
                        <span className='text-muted-foreground ml-2 text-xs font-bold tracking-wider uppercase'>
                            {title}
                        </span>
                    )}
                </div>
                <Button
                    variant='ghost'
                    size='sm'
                    onClick={formatDocument}
                    className='h-8 rounded-lg px-2 text-xs'
                    title={t('common.format_document')}
                >
                    <AlignLeft className='mr-1.5 h-3.5 w-3.5' />
                    {t('common.format')}
                </Button>
            </div>
            <div className='relative flex-1'>
                <Editor
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    loading={
                        <div className='bg-background/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm'>
                            <Loader2 className='text-primary h-8 w-8 animate-spin' />
                        </div>
                    }
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 10, bottom: 10 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontLigatures: true,
                        formatOnPaste: true,
                        formatOnType: true,
                        ...options,
                    }}
                    className={cn('min-h-[200px]', className)}
                    {...props}
                />
            </div>
        </div>
    );
}
