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

import { FileObject } from '@/types/server';
import { FileRow } from './FileRow';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FolderOpen, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface FileListProps {
    files: FileObject[];
    loading: boolean;
    selectedFiles: string[];
    onSelect: (name: string) => void;
    onSelectAll: () => void;
    onNavigate: (name: string) => void;
    onAction: (action: string, file: FileObject) => void;
    canEdit: boolean;
    canDelete: boolean;
    canDownload: boolean;
    serverUuid: string;
    currentDirectory: string;
}

export function FileList({
    files,
    loading,
    selectedFiles,
    onSelect,
    onSelectAll,
    onNavigate,
    onAction,
    canEdit,
    canDelete,
    canDownload,
    serverUuid,
    currentDirectory,
}: FileListProps) {
    const { t } = useTranslation();

    if (loading && files.length === 0) {
        return (
            <div className='flex h-64 items-center justify-center rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm'>
                <Loader2 className='h-8 w-8 animate-spin text-primary' />
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className='flex h-[400px] flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-white/10 bg-white/2 text-muted-foreground backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-700 relative overflow-hidden group'>
                <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000' />

                <div className='relative'>
                    <div className='flex h-24 w-24 items-center justify-center rounded-3xl bg-white/5 text-white/20 border border-white/10 shadow-2xl relative z-10'>
                        <FolderOpen className='h-10 w-10 opacity-40 group-hover:scale-110 transition-transform duration-500' />
                    </div>

                    <div className='absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary/20 blur-xl animate-pulse' />
                    <div className='absolute -bottom-4 -left-4 h-12 w-12 rounded-full bg-primary/10 blur-2xl animate-pulse delay-700' />
                    <Sparkles className='absolute -top-6 -left-6 h-6 w-6 text-primary/40 animate-bounce delay-300' />
                </div>

                <div className='text-center relative z-10 space-y-2'>
                    <h3 className='text-xl font-bold bg-linear-to-br from-white to-white/40 bg-clip-text text-transparent'>
                        {t('files.list.empty_title')}
                    </h3>
                    <p className='text-sm text-white/40 max-w-[280px] leading-relaxed mx-auto'>
                        {t('files.list.empty_description')}
                    </p>
                </div>
            </div>
        );
    }

    const allSelected = files.length > 0 && selectedFiles.length === files.length;

    return (
        <div className='overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/40'>
            <div
                className='flex items-center gap-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60 dark:text-white/40'
                style={{ color: 'hsl(var(--foreground))', opacity: 0.6 }}
            >
                <div className='flex items-center gap-3 flex-1'>
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={onSelectAll}
                        className='border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors'
                    />
                    <span>{t('files.list.header_name')}</span>
                </div>
                <div className='hidden sm:block w-32 text-right'>{t('files.list.header_size')}</div>
                <div className='hidden sm:block w-40 text-right'>{t('files.list.header_modified')}</div>
                <div className='w-10'></div>
            </div>

            <div className='divide-y divide-gray-200 dark:divide-white/5'>
                {files.map((file) => (
                    <FileRow
                        key={file.name}
                        file={file}
                        selected={selectedFiles.includes(file.name)}
                        onSelect={onSelect}
                        onNavigate={onNavigate}
                        onAction={onAction}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canDownload={canDownload}
                        serverUuid={serverUuid}
                        currentDirectory={currentDirectory}
                    />
                ))}
            </div>
        </div>
    );
}
