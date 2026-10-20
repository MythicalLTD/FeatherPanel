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

import { useCallback, useEffect, useState } from 'react';
import { Archive, FolderOpen, Loader2, PackageOpen, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { filesApi } from '@/lib/files-api';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import { isArchive, joinPath, normalizeDir } from '../utils';
import type { OsAppProps } from './index';

interface FileRow {
    name: string;
    file?: boolean;
    isFile?: boolean;
    directory?: boolean;
}

export default function ArchiveApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, errorMessage, emitFilesChanged } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const [path, setPath] = useState('/');
    const [files, setFiles] = useState<FileRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await filesApi.getFiles(uuid, path);
            const list = (res as { contents?: FileRow[] }).contents ?? (Array.isArray(res) ? (res as FileRow[]) : []);
            setFiles(list);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [uuid, path, errorMessage]);

    useEffect(() => {
        void load();
    }, [load]);

    const isFile = (f: FileRow) => (f.file !== undefined ? f.file : f.isFile !== undefined ? !!f.isFile : !f.directory);
    const archives = files.filter((f) => isFile(f) && isArchive(f.name));
    const folders = files.filter((f) => !isFile(f));

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 items-center gap-2 border-b px-3'>
                <PackageOpen className='text-muted-foreground h-4 w-4' />
                <span className='flex-1 truncate font-mono text-[11px]'>{path}</span>
                <button type='button' className='hover:bg-muted rounded p-1' onClick={() => void load()}>
                    <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </button>
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto p-2'>
                {path !== '/' && (
                    <button
                        type='button'
                        className='hover:bg-muted mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]'
                        onClick={() => setPath(normalizeDir(path.split('/').slice(0, -1).join('/') || '/'))}
                    >
                        <FolderOpen className='h-4 w-4' /> ..
                    </button>
                )}
                {folders.map((f) => (
                    <button
                        key={f.name}
                        type='button'
                        className='hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px]'
                        onClick={() => setPath(joinPath(path, f.name))}
                    >
                        <FolderOpen className='h-4 w-4 text-amber-500' /> {f.name}
                    </button>
                ))}
                {archives.map((f) => (
                    <div
                        key={f.name}
                        className='hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px]'
                    >
                        <Archive className='h-4 w-4 text-rose-500' />
                        <span className='min-w-0 flex-1 truncate'>{f.name}</span>
                        {can(uuid, 'file.archive') && (
                            <button
                                type='button'
                                disabled={busy}
                                className='bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-[11px] font-medium disabled:opacity-50'
                                onClick={async () => {
                                    setBusy(true);
                                    try {
                                        await filesApi.decompressFile(uuid, path, f.name);
                                        toast.success(t('featheros.files.extracted'));
                                        emitFilesChanged(uuid, path);
                                        await load();
                                    } catch (e) {
                                        toast.error(errorMessage(e));
                                    } finally {
                                        setBusy(false);
                                    }
                                }}
                            >
                                {busy ? <Loader2 className='h-3 w-3 animate-spin' /> : t('featheros.files.extract')}
                            </button>
                        )}
                    </div>
                ))}
                {!loading && archives.length === 0 && (
                    <p className='text-muted-foreground py-10 text-center text-[12px]'>
                        {t('featheros.archive.empty')}
                    </p>
                )}
            </div>
        </div>
    );
}
