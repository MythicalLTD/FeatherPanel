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
import { formatFileSize, formatDate } from '@/lib/utils';
import {
    Folder,
    FileText,
    MoreVertical,
    Code,
    FileEdit,
    Eye,
    Download,
    Copy,
    Archive,
    Trash2,
    Settings,
    File as FileIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/featherui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

interface FileRowProps {
    file: FileObject;
    selected: boolean;
    onSelect: (name: string) => void;
    onNavigate: (name: string) => void;
    onAction: (action: string, file: FileObject) => void;
    canEdit: boolean;
    canDelete: boolean;
    canDownload: boolean;
    serverUuid: string;
    currentDirectory: string;
}

export function FileRow({
    file,
    selected,
    onSelect,
    onNavigate,
    onAction,
    canEdit,
    canDelete,
    canDownload,
    serverUuid,
    currentDirectory,
}: FileRowProps) {
    const { t } = useTranslation();
    const isArchive = (name: string) => /\.(zip|tar|tar\.gz|tgz|rar)$/i.test(name);

    // Check if image for preview
    const isImage = (name: string) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);

    // Check if editable
    const isEditable = (size: number, name: string) => size < 1024 * 1024 * 5 && !isArchive(name) && !isImage(name); // Limit edit to 5MB

    return (
        <div
            className={cn(
                'group flex items-center gap-3 border-b border-gray-200 dark:border-white/5 bg-transparent px-4 py-3 transition-all hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer active:scale-[0.995]',
                selected && 'bg-primary/5 dark:bg-primary/10',
            )}
            onClick={() => {
                if (!file.isFile) {
                    onNavigate(file.name);
                } else if (isEditable(file.size, file.name) && canEdit) {
                    // Show loading state immediately and navigate
                    onAction('edit', file);
                } else if (isImage(file.name)) {
                    onAction('preview', file);
                }
            }}
        >
            <div className='flex items-center gap-3 flex-1 min-w-0 pointer-events-none'>
                <div className='pointer-events-auto' onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={selected}
                        onCheckedChange={() => onSelect(file.name)}
                        className='border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary'
                    />
                </div>

                <div
                    className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 transition-all group-hover:scale-110',
                        file.isFile
                            ? 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 shadow-sm'
                            : 'bg-amber-500/10 text-amber-500 shadow-sm shadow-amber-500/20',
                    )}
                >
                    {file.isFile ? (
                        isImage(file.name) ? (
                            <Eye className='h-4.5 w-4.5' />
                        ) : (
                            <FileText className='h-4.5 w-4.5' />
                        )
                    ) : (
                        <Folder className='h-4.5 w-4.5 fill-amber-500/10' />
                    )}
                </div>

                <div className='flex-1 overflow-hidden pointer-events-auto'>
                    {(() => {
                        const fullPath = currentDirectory.endsWith('/')
                            ? `${currentDirectory}${file.name}`
                            : `${currentDirectory}/${file.name}`;

                        if (!file.isFile) {
                            return (
                                <Link
                                    href={`?path=${encodeURIComponent(fullPath)}`}
                                    className='truncate text-sm font-semibold text-primary block'
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onNavigate(file.name);
                                    }}
                                >
                                    {file.name}
                                </Link>
                            );
                        } else if (isEditable(file.size, file.name) && canEdit) {
                            return (
                                <Link
                                    href={`/server/${serverUuid}/files/edit?file=${encodeURIComponent(file.name)}&directory=${encodeURIComponent(currentDirectory || '/')}`}
                                    className='truncate text-sm font-semibold text-primary block'
                                >
                                    {file.name}
                                </Link>
                            );
                        } else if (isImage(file.name)) {
                            return (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onAction('preview', file);
                                    }}
                                    className='truncate text-sm font-semibold text-primary block text-left w-full'
                                >
                                    {file.name}
                                </button>
                            );
                        } else {
                            return (
                                <span
                                    className='truncate text-sm font-semibold text-primary cursor-default block opacity-90'
                                    onClick={(e) => e.stopPropagation()}
                                    title={t('files.row.cant_preview')}
                                >
                                    {file.name}
                                </span>
                            );
                        }
                    })()}
                    <div className='flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground sm:hidden font-medium'>
                        <span>{file.isFile ? formatFileSize(file.size) : t('files.row.folder_label')}</span>
                        <span className='opacity-30'>•</span>
                        <span>{formatDate(file.modified_at)}</span>
                    </div>
                </div>
            </div>

            <div
                className='hidden sm:block w-32 px-4 text-xs font-semibold text-muted-foreground'
                style={{ opacity: 0.8 }}
            >
                {file.isFile ? formatFileSize(file.size) : '-'}
            </div>

            <div
                className='hidden sm:block w-48 px-4 text-xs font-semibold text-muted-foreground'
                style={{ opacity: 0.8 }}
            >
                {formatDate(file.modified_at)}
            </div>

            <div className='w-10 flex justify-end'>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        as={Button}
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors'
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                        }}
                    >
                        <MoreVertical className='h-4 w-4' />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align='end' className='w-48'>
                        {file.isFile && isImage(file.name) && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('preview', file);
                                }}
                            >
                                <Eye className='mr-2 h-4 w-4' />
                                {t('files.row.preview')}
                            </DropdownMenuItem>
                        )}
                        {file.isFile && isEditable(file.size, file.name) && canEdit && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('edit', file);
                                }}
                            >
                                <Code className='mr-2 h-4 w-4' />
                                {t('files.row.edit')}
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('rename', file);
                                }}
                            >
                                <FileEdit className='mr-2 h-4 w-4' />
                                {t('files.row.rename')}
                            </DropdownMenuItem>
                        )}
                        {file.isFile && canDownload && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('download', file);
                                }}
                            >
                                <Download className='mr-2 h-4 w-4' />
                                {t('files.row.download')}
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('copy', file);
                                    }}
                                >
                                    <Copy className='mr-2 h-4 w-4' />
                                    {t('files.row.copy')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('move', file);
                                    }}
                                >
                                    <FileIcon className='mr-2 h-4 w-4' />
                                    {t('files.row.move')}
                                </DropdownMenuItem>
                            </>
                        )}
                        {file.isFile && isArchive(file.name) && canEdit && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('decompress', file);
                                }}
                            >
                                <Archive className='mr-2 h-4 w-4' />
                                {t('files.row.extract')}
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('compress', file);
                                }}
                            >
                                <Archive className='mr-2 h-4 w-4' />
                                {t('files.row.compress')}
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('permissions', file);
                                }}
                            >
                                <Settings className='mr-2 h-4 w-4' />
                                {t('files.row.permissions')}
                            </DropdownMenuItem>
                        )}

                        {canDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className='text-red-500 focus:text-red-500'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('delete', file);
                                    }}
                                >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    {t('files.row.delete')}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
