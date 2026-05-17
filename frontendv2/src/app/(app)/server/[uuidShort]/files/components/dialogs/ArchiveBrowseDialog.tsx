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

import { useEffect, useState, type DragEvent } from 'react';
import {
    ARCHIVE_EXTRACT_DRAG_MIME,
    filesApi,
    type ArchiveExtractDragPayload,
    type ArchiveListEntry,
} from '@/lib/files-api';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatFileSize } from '@/lib/utils';
import { Archive, ChevronLeft, File as FileIcon, Folder, GripVertical, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ArchiveBrowsePanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    /** Server file-manager directory containing the archive */
    serverDirectory: string;
    /** Archive file name only (e.g. backup.zip) */
    archiveFileName: string;
    /** When true, rows are draggable into the file manager and full extract is available */
    canExtract?: boolean;
    /** Extract selected archive entries into an absolute destination path in the server file manager. */
    onExtractEntries?: (entries: string[], destinationPath: string) => void;
    /** Called after a successful full-archive extract (decompress) */
    onExtractComplete?: () => void;
}

export function ArchiveBrowsePanel({
    open,
    onOpenChange,
    uuid,
    serverDirectory,
    archiveFileName,
    canExtract = false,
    onExtractEntries,
    onExtractComplete,
}: ArchiveBrowsePanelProps) {
    const { t } = useTranslation();
    const [innerPath, setInnerPath] = useState('');
    const [entries, setEntries] = useState<ArchiveListEntry[]>([]);
    const [truncated, setTruncated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fullExtracting, setFullExtracting] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!open || !archiveFileName) return;
            setLoading(true);
            try {
                const data = await filesApi.listArchiveDirectory(
                    uuid,
                    serverDirectory || '/',
                    archiveFileName,
                    innerPath,
                );
                if (!cancelled) {
                    setEntries(data.contents);
                    setTruncated(data.truncated);
                }
            } catch {
                if (!cancelled) {
                    toast.error(t('files.archive_browser.error'));
                    setEntries([]);
                    setTruncated(false);
                    onOpenChange(false);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [archiveFileName, innerPath, onOpenChange, open, serverDirectory, t, uuid]);

    useEffect(() => {
        if (open) {
            setInnerPath('');
        }
    }, [open, archiveFileName]);

    const goUp = () => {
        if (!innerPath) return;
        const parts = innerPath.split('/').filter(Boolean);
        parts.pop();
        setInnerPath(parts.join('/'));
    };

    const titlePath = innerPath ? `${archiveFileName} / ${innerPath}` : archiveFileName;

    const extractEntry = (entryPath: string, destinationPath: string) => {
        if (!canExtract || !onExtractEntries) return;
        onExtractEntries([entryPath], destinationPath);
    };

    const handleArchiveEntryDragStart = (e: DragEvent, entryPath: string) => {
        if (!canExtract) {
            e.preventDefault();
            return;
        }
        const payload: ArchiveExtractDragPayload = {
            root: serverDirectory || '/',
            file: archiveFileName,
            entries: [entryPath],
        };
        try {
            e.dataTransfer.setData(ARCHIVE_EXTRACT_DRAG_MIME, JSON.stringify(payload));
            e.dataTransfer.setData('text/plain', entryPath);
            e.dataTransfer.effectAllowed = 'copy';
        } catch {
            e.preventDefault();
        }
    };

    const close = () => onOpenChange(false);

    const handleExtractEntireArchive = async () => {
        if (!canExtract || !archiveFileName) return;
        const toastId = toast.loading(t('files.messages.extracting'));
        setFullExtracting(true);
        try {
            await filesApi.decompressFile(uuid, serverDirectory || '/', archiveFileName);
            toast.success(t('files.messages.extracted'), { id: toastId });
            onExtractComplete?.();
            onOpenChange(false);
        } catch (error) {
            const err = error as { response?: { data?: { error?: string } } };
            const errorMessage = err.response?.data?.error || t('files.messages.extract_failed');
            toast.error(errorMessage, { id: toastId });
        } finally {
            setFullExtracting(false);
        }
    };

    if (!open || !archiveFileName) return null;

    return (
        <section className='border-primary/20 bg-card/70 animate-in fade-in slide-in-from-top-2 overflow-hidden rounded-3xl border shadow-sm backdrop-blur-xl'>
            <div className='border-border/60 flex flex-col gap-4 border-b p-5 lg:flex-row lg:items-start lg:justify-between'>
                <div className='flex min-w-0 gap-4'>
                    <div className='bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl'>
                        <Archive className='h-6 w-6' />
                    </div>
                    <div className='min-w-0 space-y-1'>
                        <h3 className='text-lg font-bold'>{t('files.archive_browser.title')}</h3>
                        <p className='text-muted-foreground font-mono text-xs break-all' title={titlePath}>
                            {titlePath}
                        </p>
                        {canExtract ? (
                            <p className='text-muted-foreground max-w-3xl text-xs leading-relaxed'>
                                {t('files.archive_browser.drag_hint')}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className='flex shrink-0 flex-wrap items-center gap-2'>
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={!innerPath || loading}
                        onClick={goUp}
                        className='gap-1'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('files.archive_browser.up')}
                    </Button>
                    {canExtract ? (
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={fullExtracting || !archiveFileName}
                            onClick={() => void handleExtractEntireArchive()}
                        >
                            {fullExtracting
                                ? t('files.archive_browser.extract_full_loading')
                                : t('files.archive_browser.extract_full')}
                        </Button>
                    ) : null}
                    <Button type='button' variant='ghost' size='sm' onClick={close} className='gap-1'>
                        <X className='h-4 w-4' />
                        {t('files.archive_browser.close')}
                    </Button>
                </div>
            </div>

            <div className='p-5'>
                <div className='border-border bg-muted/25 max-h-[60vh] min-h-[320px] overflow-y-auto rounded-2xl border text-sm'>
                    {loading ? (
                        <div className='text-muted-foreground p-4'>{t('files.archive_browser.loading')}</div>
                    ) : entries.length === 0 ? (
                        <div className='text-muted-foreground p-4'>{t('files.archive_browser.empty')}</div>
                    ) : (
                        <ul className='divide-border divide-y'>
                            {entries.map((entry) => (
                                <li key={entry.path}>
                                    {entry.directory ? (
                                        <div className='hover:bg-muted/50 flex w-full items-stretch'>
                                            <button
                                                type='button'
                                                className='hover:bg-muted/60 flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left'
                                                onClick={() => setInnerPath(entry.path)}
                                            >
                                                <Folder className='text-primary h-4 w-4 shrink-0' />
                                                <span className='min-w-0 flex-1 truncate font-medium'>
                                                    {entry.name}
                                                </span>
                                            </button>
                                            {canExtract ? (
                                                <div className='border-border flex shrink-0 items-center gap-2 border-l px-2'>
                                                    <Button
                                                        type='button'
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => extractEntry(entry.path, serverDirectory || '/')}
                                                        className='h-8 px-2 text-xs'
                                                    >
                                                        {t('files.archive_browser.extract_here')}
                                                    </Button>
                                                    <Button
                                                        type='button'
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => extractEntry(entry.path, '/')}
                                                        className='h-8 px-2 text-xs'
                                                    >
                                                        {t('files.archive_browser.extract_root')}
                                                    </Button>
                                                    <div
                                                        draggable
                                                        onDragStart={(event) =>
                                                            handleArchiveEntryDragStart(event, entry.path)
                                                        }
                                                        className='text-muted-foreground hover:text-foreground hover:bg-muted/80 flex cursor-grab items-center rounded-md px-2 py-1.5 active:cursor-grabbing'
                                                        title={t('files.archive_browser.drag_handle')}
                                                    >
                                                        <GripVertical className='h-4 w-4' />
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div
                                            draggable={canExtract}
                                            onDragStart={
                                                canExtract
                                                    ? (event) => handleArchiveEntryDragStart(event, entry.path)
                                                    : undefined
                                            }
                                            className={cn(
                                                'flex items-center gap-3 px-4 py-3',
                                                canExtract && 'cursor-grab active:cursor-grabbing',
                                            )}
                                        >
                                            {canExtract ? (
                                                <GripVertical className='text-muted-foreground h-4 w-4 shrink-0' />
                                            ) : (
                                                <FileIcon className='text-muted-foreground h-4 w-4 shrink-0' />
                                            )}
                                            <span className='min-w-0 flex-1 truncate'>{entry.name}</span>
                                            <span className='text-muted-foreground shrink-0 tabular-nums'>
                                                {formatFileSize(entry.size)}
                                            </span>
                                            {canExtract ? (
                                                <div className='flex shrink-0 items-center gap-2'>
                                                    <Button
                                                        type='button'
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => extractEntry(entry.path, serverDirectory || '/')}
                                                        className='h-8 px-2 text-xs'
                                                    >
                                                        {t('files.archive_browser.extract_here')}
                                                    </Button>
                                                    <Button
                                                        type='button'
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => extractEntry(entry.path, '/')}
                                                        className='h-8 px-2 text-xs'
                                                    >
                                                        {t('files.archive_browser.extract_root')}
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {truncated ? (
                    <p className='text-muted-foreground mt-3 text-xs'>{t('files.archive_browser.truncated')}</p>
                ) : null}
            </div>
        </section>
    );
}

export const ArchiveBrowseDialog = ArchiveBrowsePanel;
