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

import { ChevronRight, FileCode } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

const LANGUAGE_BY_EXT: Record<string, string> = {
    js: 'JavaScript',
    mjs: 'JavaScript',
    cjs: 'JavaScript',
    jsx: 'JSX',
    ts: 'TypeScript',
    tsx: 'TSX',
    json: 'JSON',
    yml: 'YAML',
    yaml: 'YAML',
    toml: 'TOML',
    properties: 'Properties',
    ini: 'INI',
    cfg: 'Config',
    conf: 'Config',
    env: 'Env',
    xml: 'XML',
    html: 'HTML',
    htm: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    md: 'Markdown',
    php: 'PHP',
    py: 'Python',
    lua: 'Lua',
    java: 'Java',
    kt: 'Kotlin',
    sh: 'Shell',
    bash: 'Shell',
    sql: 'SQL',
    go: 'Go',
    rs: 'Rust',
    txt: 'Text',
    log: 'Log',
};

/** Short language label for a file name, or null when the extension is unknown. */
export function getEditorLanguageLabel(fileName: string): string | null {
    const lower = fileName.toLowerCase();
    if (lower === 'dockerfile') return 'Dockerfile';
    if (lower.startsWith('.env')) return 'Env';
    const dot = lower.lastIndexOf('.');
    if (dot <= 0 || dot === lower.length - 1) return null;
    return LANGUAGE_BY_EXT[lower.slice(dot + 1)] ?? lower.slice(dot + 1).toUpperCase();
}

interface EditorFileInfoProps {
    fileName: string;
    directory: string;
    engineLabel: string;
    dirty: boolean;
    saving?: boolean;
}

/**
 * Editor header identity block: file name, path breadcrumb, language badge and a saved / unsaved
 * state indicator. Purely presentational; shared by the server and webspace editors.
 */
export function EditorFileInfo({ fileName, directory, engineLabel, dirty, saving }: EditorFileInfoProps) {
    const { t } = useTranslation();
    const segments = (directory || '/').split('/').filter(Boolean);
    const language = getEditorLanguageLabel(fileName);
    const stateLabel = saving
        ? t('files.editor.saving_state')
        : dirty
          ? t('files.editor.unsaved')
          : t('files.editor.saved_state');

    return (
        <div className='flex min-w-0 items-center gap-3'>
            <div className='bg-primary/10 text-primary border-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border'>
                <FileCode className='h-5 w-5' />
            </div>
            <div className='flex min-w-0 flex-col gap-0.5'>
                <div className='flex min-w-0 items-center gap-2'>
                    <span className='text-foreground truncate font-mono text-sm font-semibold' title={fileName}>
                        {fileName}
                    </span>
                    {language && (
                        <span className='border-border/60 bg-muted/60 text-muted-foreground shrink-0 rounded-md border px-1.5 py-px text-[10px] font-medium'>
                            {language}
                        </span>
                    )}
                    <span
                        className={cn(
                            'flex shrink-0 items-center gap-1.5 text-[11px] font-medium',
                            dirty || saving ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
                        )}
                        role='status'
                        aria-live='polite'
                    >
                        <span
                            aria-hidden
                            className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                saving
                                    ? 'animate-pulse bg-amber-500 motion-reduce:animate-none'
                                    : dirty
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500',
                            )}
                        />
                        <span className='hidden sm:inline'>{stateLabel}</span>
                    </span>
                </div>
                <nav
                    aria-label={t('files.editor.path_label')}
                    className='text-muted-foreground flex min-w-0 items-center gap-0.5 overflow-hidden text-[11px]'
                >
                    <span className='shrink-0'>/</span>
                    {segments.map((seg, i) => (
                        <span key={`${seg}-${i}`} className='flex min-w-0 items-center gap-0.5'>
                            {i > 0 && <ChevronRight aria-hidden className='h-3 w-3 shrink-0 opacity-60' />}
                            <span className='truncate'>{seg}</span>
                        </span>
                    ))}
                    <span aria-hidden className='mx-1 hidden opacity-50 sm:inline'>
                        ·
                    </span>
                    <span className='hidden truncate sm:inline'>{engineLabel}</span>
                </nav>
            </div>
        </div>
    );
}
