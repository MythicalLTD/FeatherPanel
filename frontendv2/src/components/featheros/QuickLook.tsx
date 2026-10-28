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
import { X, FileQuestion, Loader2, Download, Folder, File as FileIcon, FolderOpen } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { filesApi } from '@/lib/files-api';
import type { FileObject } from '@/types/server';
import { useFeatherOs } from './FeatherOsContext';
import { baseName, formatBytes, isTextLike, stripAnsi } from './utils';

export interface QuickLookTarget {
    serverUuid: string;
    path: string;
    isFile: boolean;
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i;
const VIDEO_RE = /\.(mp4|webm|ogg|mov)$/i;
const AUDIO_RE = /\.(mp3|wav|ogg|m4a|flac)$/i;

export function QuickLook() {
    const { t } = useTranslation();
    const { quickLook, closeQuickLook, errorMessage, can, openApp } = useFeatherOs();
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState<string | null>(null);
    const [url, setUrl] = useState<string | null>(null);
    const [folderEntries, setFolderEntries] = useState<FileObject[]>([]);
    const [kind, setKind] = useState<'text' | 'image' | 'video' | 'audio' | 'binary' | 'folder'>('binary');
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!quickLook) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                closeQuickLook();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [quickLook, closeQuickLook]);

    useEffect(() => {
        if (!quickLook) {
            setText(null);
            setUrl(null);
            setFolderEntries([]);
            setErr(null);
            return;
        }
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            setErr(null);
            setText(null);
            setUrl(null);
            setFolderEntries([]);
            try {
                if (!can(quickLook.serverUuid, 'file.read')) {
                    setErr(t('featheros.errors.no_permission'));
                    return;
                }
                if (!quickLook.isFile) {
                    setKind('folder');
                    const res = await filesApi.getFiles(quickLook.serverUuid, quickLook.path);
                    if (cancelled) return;
                    setFolderEntries(
                        res.contents
                            .filter((f) => !f.isTrashShortcut)
                            .sort(
                                (a, b) =>
                                    Number(a.isFile) - Number(b.isFile) ||
                                    a.name.localeCompare(b.name, undefined, { numeric: true }),
                            )
                            .slice(0, 80),
                    );
                    return;
                }
                const name = baseName(quickLook.path);
                if (IMAGE_RE.test(name) || VIDEO_RE.test(name) || AUDIO_RE.test(name)) {
                    const download = await filesApi.getDownloadUrl(quickLook.serverUuid, quickLook.path);
                    if (cancelled) return;
                    setUrl(download);
                    setKind(IMAGE_RE.test(name) ? 'image' : VIDEO_RE.test(name) ? 'video' : 'audio');
                    return;
                }
                if (isTextLike(name) && can(quickLook.serverUuid, 'file.read-content')) {
                    const content = await filesApi.getFileContent(quickLook.serverUuid, quickLook.path);
                    if (cancelled) return;
                    const raw = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                    setText(stripAnsi(raw).slice(0, 200_000));
                    setKind('text');
                    return;
                }
                // Fallback: try download URL so the user can open externally.
                try {
                    const download = await filesApi.getDownloadUrl(quickLook.serverUuid, quickLook.path);
                    if (cancelled) return;
                    setUrl(download);
                } catch {
                    /* ignore */
                }
                setKind('binary');
            } catch (e) {
                if (!cancelled) setErr(errorMessage(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [quickLook, can, errorMessage, t]);

    if (!quickLook) return null;
    const name = baseName(quickLook.path);

    return (
        <div
            className='fos-fade fixed inset-0 z-[9700] flex items-center justify-center bg-black/55 p-8 backdrop-blur-sm'
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeQuickLook();
            }}
        >
            <div className='bg-background text-foreground relative flex max-h-[min(860px,90vh)] w-[min(920px,94vw)] flex-col overflow-hidden rounded-2xl border shadow-2xl'>
                <div className='flex h-10 shrink-0 items-center gap-2 border-b px-3'>
                    <span className='min-w-0 flex-1 truncate text-[13px] font-medium'>{name}</span>
                    <span className='text-muted-foreground text-[11px]'>{t('featheros.quicklook.hint')}</span>
                    <button
                        type='button'
                        className='hover:bg-muted rounded-md p-1'
                        onClick={closeQuickLook}
                        aria-label={t('common.close')}
                    >
                        <X className='h-4 w-4' />
                    </button>
                </div>
                <div className='fos-scroll relative min-h-[240px] flex-1 overflow-auto'>
                    {loading && (
                        <div className='absolute inset-0 flex items-center justify-center'>
                            <Loader2 className='text-muted-foreground h-6 w-6 animate-spin' />
                        </div>
                    )}
                    {err && (
                        <div className='text-muted-foreground flex h-full items-center justify-center p-8 text-sm'>
                            {err}
                        </div>
                    )}
                    {!loading && !err && kind === 'folder' && (
                        <div className='flex h-full min-h-[280px] flex-col'>
                            <div className='flex items-center gap-2 border-b px-4 py-2.5 text-[12px]'>
                                <Folder className='h-4 w-4 text-sky-500' />
                                <span className='text-muted-foreground flex-1 truncate'>{quickLook.path}</span>
                                <span className='text-muted-foreground tabular-nums'>
                                    {t('featheros.quicklook.folder_count', {
                                        count: String(folderEntries.length),
                                        defaultValue: '{count} items',
                                    })}
                                </span>
                                <button
                                    type='button'
                                    className='bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium'
                                    onClick={() => {
                                        openApp('finder', {
                                            serverUuid: quickLook.serverUuid,
                                            newWindow: true,
                                            props: { path: quickLook.path },
                                        });
                                        closeQuickLook();
                                    }}
                                >
                                    <FolderOpen className='h-3.5 w-3.5' />
                                    {t('featheros.quicklook.open_finder', { defaultValue: 'Open in Finder' })}
                                </button>
                            </div>
                            {folderEntries.length === 0 ? (
                                <div className='text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm'>
                                    {t('featheros.files.empty')}
                                </div>
                            ) : (
                                <ul className='fos-scroll flex-1 overflow-auto py-1'>
                                    {folderEntries.map((f) => (
                                        <li
                                            key={f.name}
                                            className='hover:bg-muted/60 flex items-center gap-2.5 px-4 py-1.5 text-[12px]'
                                        >
                                            {f.isFile ? (
                                                <FileIcon className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                                            ) : (
                                                <Folder className='h-3.5 w-3.5 shrink-0 text-sky-500' />
                                            )}
                                            <span className='min-w-0 flex-1 truncate'>{f.name}</span>
                                            <span className='text-muted-foreground shrink-0 tabular-nums'>
                                                {f.isFile ? formatBytes(f.size) : '-'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                    {!loading && !err && kind === 'text' && (
                        <pre className='bg-muted/30 max-h-full overflow-auto p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap'>
                            {text}
                        </pre>
                    )}
                    {!loading && !err && kind === 'image' && url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={name} className='mx-auto max-h-[70vh] max-w-full object-contain p-4' />
                    )}
                    {!loading && !err && kind === 'video' && url && (
                        <video src={url} controls className='mx-auto max-h-[70vh] max-w-full p-4' />
                    )}
                    {!loading && !err && kind === 'audio' && url && (
                        <div className='flex h-full items-center justify-center p-8'>
                            <audio src={url} controls className='w-full max-w-md' />
                        </div>
                    )}
                    {!loading && !err && kind === 'binary' && (
                        <div className='text-muted-foreground flex h-full flex-col items-center justify-center gap-3 p-8 text-sm'>
                            <FileQuestion className='h-10 w-10 opacity-50' />
                            <p>{t('featheros.quicklook.binary')}</p>
                            {url && (
                                <a
                                    href={url}
                                    download={name}
                                    className='bg-primary text-primary-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium'
                                >
                                    <Download className='h-3.5 w-3.5' /> {t('featheros.common.download')}
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
