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

import { useEffect, useState } from 'react';
import { ChevronRight, Folder, FolderOpen, FileCode2, FileText, Loader2 } from 'lucide-react';
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import { monacoLanguage } from '../utils';
import type { FileObject } from '@/types/server';

interface Props {
    file: FileObject;
    path: string;
    serverUuid: string;
    activePath?: string;
    filter: string;
    revision: number;
    collapseRevision: number;
    depth?: number;
    onOpen: (path: string) => void;
}

export function EditorTreeEntry({
    file,
    path,
    serverUuid,
    activePath,
    filter,
    revision,
    collapseRevision,
    depth = 0,
    onOpen,
}: Props) {
    const { t } = useTranslation();
    const { errorMessage } = useFeatherOs();
    const [expanded, setExpanded] = useState(false);
    const [children, setChildren] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);
    useEffect(() => setExpanded(false), [collapseRevision]);
    useEffect(() => {
        if (!expanded || file.isFile) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        filesApi
            .getFiles(serverUuid, path)
            .then((result) => {
                if (!cancelled)
                    setChildren(
                        result.contents
                            .filter((child) => !child.isTrashShortcut)
                            .sort(
                                (a, b) =>
                                    Number(a.isFile) - Number(b.isFile) ||
                                    a.name.localeCompare(b.name, undefined, { numeric: true }),
                            ),
                    );
            })
            .catch((cause) => {
                if (!cancelled) setError(errorMessage(cause));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [expanded, file.isFile, serverUuid, path, revision, retry, errorMessage]);
    if (file.isFile && !file.name.toLowerCase().includes(filter.toLowerCase())) return null;
    return (
        <li className='fos-editor-tree-entry'>
            <button
                type='button'
                className={cn('fos-editor-file', activePath === path && 'is-active')}
                style={{ paddingLeft: 7 + depth * 14 }}
                title={path}
                aria-expanded={file.isFile ? undefined : expanded}
                aria-current={file.isFile && activePath === path ? 'true' : undefined}
                onClick={() => (file.isFile ? onOpen(path) : setExpanded(!expanded))}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowRight' && !file.isFile) {
                        event.preventDefault();
                        if (!expanded) setExpanded(true);
                        else event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('ul button')?.focus();
                    }
                    if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        if (expanded) setExpanded(false);
                        else
                            event.currentTarget.parentElement?.parentElement
                                ?.closest('li')
                                ?.querySelector<HTMLButtonElement>('button')
                                ?.focus();
                    }
                }}
            >
                {file.isFile ? (
                    <span className='fos-tree-chevron-spacer' aria-hidden />
                ) : (
                    <ChevronRight size={12} className={cn('fos-tree-chevron', expanded && 'is-open')} />
                )}
                {file.isFile ? (
                    monacoLanguage(file.name) === 'plaintext' ? (
                        <FileText size={14} className='fos-tree-file-icon' />
                    ) : (
                        <FileCode2 size={14} className='fos-tree-file-icon' />
                    )
                ) : expanded ? (
                    <FolderOpen size={14} className='fos-editor-folder-icon' />
                ) : (
                    <Folder size={14} className='fos-editor-folder-icon' />
                )}
                <span className='fos-tree-file-name'>{file.name}</span>
            </button>
            {expanded && (
                <ul aria-label={file.name} className='fos-editor-tree-children'>
                    {loading && children.length === 0 ? (
                        <li className='fos-editor-sidebar-message' role='status'>
                            <Loader2 size={13} className='animate-spin' />
                            {t('common.loading')}
                        </li>
                    ) : error ? (
                        <li className='fos-editor-sidebar-message' role='alert'>
                            <p>{error}</p>
                            <button type='button' onClick={() => setRetry((n) => n + 1)}>
                                {t('featheros.editor.retry')}
                            </button>
                        </li>
                    ) : children.length ? (
                        children.map((child) => (
                            <EditorTreeEntry
                                key={child.name}
                                file={child}
                                path={`${path === '/' ? '' : path}/${child.name}`}
                                serverUuid={serverUuid}
                                activePath={activePath}
                                filter={filter}
                                revision={revision}
                                collapseRevision={collapseRevision}
                                depth={depth + 1}
                                onOpen={onOpen}
                            />
                        ))
                    ) : (
                        <li className='fos-editor-sidebar-message'>{t('featheros.editor.no_files')}</li>
                    )}
                </ul>
            )}
        </li>
    );
}
