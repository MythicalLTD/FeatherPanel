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
    type LucideIcon,
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
import { isBinaryLikeFileName, isDecompressibleArchiveFileName } from '@/lib/binary-like-file-names';
import { useTranslation } from '@/contexts/TranslationContext';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const isImageName = (name: string) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
const isEditableFile = (size: number, name: string) =>
    size < 1024 * 1024 * 5 && !isBinaryLikeFileName(name) && !isImageName(name);

interface FileRowProps {
    file: FileObject;
    selected: boolean;
    isAnchor?: boolean;
    isDragging?: boolean;
    onSelect: (name: string) => void;
    onRowClick?: (file: FileObject, event: React.MouseEvent) => boolean;
    onNavigate: (name: string) => void;
    onAction: (action: string, file: FileObject) => void;
    onDragStart?: (file: FileObject, event: React.DragEvent) => void;
    onDragEnd?: (file: FileObject, event: React.DragEvent) => void;
    onDropFiles?: (destinationFolder: FileObject, event: React.DragEvent) => void;
    onContextMenuOpen?: (file: FileObject) => void;
    canEdit: boolean;
    canDelete: boolean;
    canDownload: boolean;
    serverUuid: string;
    currentDirectory: string;
}

const DRAG_MIME = 'application/x-featherpanel-files';

interface MenuAction {
    key: string;
    label: string;
    Icon: LucideIcon;
    danger?: boolean;
    separatorBefore?: boolean;
}

interface ContextMenuState {
    x: number;
    y: number;
}

function RowContextMenu({
    state,
    actions,
    onAction,
    onClose,
}: {
    state: ContextMenuState;
    actions: MenuAction[];
    onAction: (key: string) => void;
    onClose: () => void;
}) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        const handleScroll = () => onClose();
        window.addEventListener('mousedown', handleOutside, true);
        window.addEventListener('contextmenu', handleOutside, true);
        window.addEventListener('keydown', handleKey, true);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('mousedown', handleOutside, true);
            window.removeEventListener('contextmenu', handleOutside, true);
            window.removeEventListener('keydown', handleKey, true);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [onClose]);

    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const margin = 8;
        let left = state.x;
        let top = state.y;
        if (left + rect.width + margin > window.innerWidth) {
            left = Math.max(margin, window.innerWidth - rect.width - margin);
        }
        if (top + rect.height + margin > window.innerHeight) {
            top = Math.max(margin, window.innerHeight - rect.height - margin);
        }
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
    }, [state.x, state.y]);

    return createPortal(
        <div
            ref={menuRef}
            role='menu'
            className='fixed z-1000 min-w-48 overflow-hidden rounded-xl border border-border/40 bg-card/95 backdrop-blur-xl p-1 shadow-2xl focus:outline-none animate-in fade-in zoom-in-95 duration-100'
            style={{ left: state.x, top: state.y }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {actions.map((a, idx) => (
                <React.Fragment key={a.key}>
                    {a.separatorBefore && idx > 0 && <div className='-mx-1 my-1 h-px bg-border/40' />}
                    <button
                        type='button'
                        role='menuitem'
                        onClick={(e) => {
                            e.stopPropagation();
                            onAction(a.key);
                        }}
                        className={cn(
                            'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary focus:outline-none',
                            a.danger && 'text-red-500 hover:bg-red-500/10 hover:text-red-500 focus:bg-red-500/10',
                        )}
                    >
                        <a.Icon className='mr-2 h-4 w-4' />
                        {a.label}
                    </button>
                </React.Fragment>
            ))}
        </div>,
        document.body,
    );
}

export function FileRow({
    file,
    selected,
    isAnchor = false,
    isDragging = false,
    onSelect,
    onRowClick,
    onNavigate,
    onAction,
    onDragStart,
    onDragEnd,
    onDropFiles,
    onContextMenuOpen,
    canEdit,
    canDelete,
    canDownload,
    serverUuid,
    currentDirectory,
}: FileRowProps) {
    const { t } = useTranslation();
    const rowRef = useRef<HTMLDivElement>(null);
    const [isDropTarget, setIsDropTarget] = useState(false);
    const dragCounterRef = useRef(0);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    useEffect(() => {
        if (isAnchor && rowRef.current) {
            rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [isAnchor]);

    const menuActions = useMemo<MenuAction[]>(() => {
        const items: MenuAction[] = [];
        if (file.isFile && isImageName(file.name)) {
            items.push({ key: 'preview', label: t('files.row.preview'), Icon: Eye });
        }
        if (file.isFile && isEditableFile(file.size, file.name) && canEdit) {
            items.push({ key: 'edit', label: t('files.row.edit'), Icon: Code });
        }
        if (canEdit) {
            items.push({ key: 'rename', label: t('files.row.rename'), Icon: FileEdit });
        }
        if (file.isFile && canDownload) {
            items.push({ key: 'download', label: t('files.row.download'), Icon: Download });
        }
        if (canEdit) {
            items.push({ key: 'copy', label: t('files.row.copy'), Icon: Copy });
            items.push({ key: 'move', label: t('files.row.move'), Icon: FileIcon });
        }
        if (file.isFile && isDecompressibleArchiveFileName(file.name) && canEdit) {
            items.push({ key: 'decompress', label: t('files.row.extract'), Icon: Archive });
        }
        if (canEdit) {
            items.push({ key: 'compress', label: t('files.row.compress'), Icon: Archive });
            items.push({ key: 'permissions', label: t('files.row.permissions'), Icon: Settings });
        }
        if (canDelete) {
            items.push({
                key: 'delete',
                label: t('files.row.delete'),
                Icon: Trash2,
                danger: true,
                separatorBefore: true,
            });
        }
        return items;
    }, [file, canEdit, canDelete, canDownload, t]);

    const handleRowClick = (e: React.MouseEvent) => {
        if (onRowClick?.(file, e)) {
            return;
        }
        if (!file.isFile) {
            onNavigate(file.name);
        } else if (isEditableFile(file.size, file.name) && canEdit) {
            onAction('edit', file);
        } else if (isImageName(file.name)) {
            onAction('preview', file);
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (menuActions.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenuOpen?.(file);
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const isFolderDropTarget = !file.isFile && canEdit && !!onDropFiles;

    const handleDragStart = (e: React.DragEvent) => {
        if (!onDragStart) {
            e.preventDefault();
            return;
        }
        onDragStart(file, e);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        dragCounterRef.current = 0;
        setIsDropTarget(false);
        onDragEnd?.(file, e);
    };

    const isInternalDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(DRAG_MIME);

    const handleDragEnter = (e: React.DragEvent) => {
        if (!isFolderDropTarget || !isInternalDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (!isDragging) setIsDropTarget(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!isFolderDropTarget || !isInternalDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = isDragging ? 'none' : 'move';
    };

    const handleDragLeave = (e: React.DragEvent) => {
        if (!isFolderDropTarget || !isInternalDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) {
            setIsDropTarget(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!isFolderDropTarget || !isInternalDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDropTarget(false);
        if (isDragging) return;
        onDropFiles?.(file, e);
    };

    return (
        <div
            ref={rowRef}
            draggable={!!onDragStart}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
            className={cn(
                'group flex items-center gap-3 border-b border-gray-200 dark:border-white/5 bg-transparent px-4 py-3 transition-all hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer active:scale-[0.995] select-none',
                selected && 'bg-primary/5 dark:bg-primary/10',
                isAnchor && 'ring-1 ring-inset ring-primary/40',
                isDragging && 'opacity-40',
                isDropTarget && !isDragging && 'bg-primary/15 dark:bg-primary/20 ring-2 ring-inset ring-primary/60',
            )}
            onClick={handleRowClick}
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
                            ? 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'
                            : 'bg-amber-500/10 text-amber-500',
                    )}
                >
                    {file.isFile ? (
                        isImageName(file.name) ? (
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
                                        if (onRowClick?.(file, e)) {
                                            e.preventDefault();
                                            return;
                                        }
                                        e.preventDefault();
                                        onNavigate(file.name);
                                    }}
                                >
                                    {file.name}
                                </Link>
                            );
                        } else if (isEditableFile(file.size, file.name) && canEdit) {
                            return (
                                <Link
                                    href={`/server/${serverUuid}/files/edit?file=${encodeURIComponent(file.name)}&directory=${encodeURIComponent(currentDirectory || '/')}`}
                                    className='truncate text-sm font-semibold text-primary block'
                                    onClick={(e) => {
                                        if (onRowClick?.(file, e)) {
                                            e.preventDefault();
                                        }
                                    }}
                                >
                                    {file.name}
                                </Link>
                            );
                        } else if (isImageName(file.name)) {
                            return (
                                <button
                                    onClick={(e) => {
                                        if (onRowClick?.(file, e)) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            return;
                                        }
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
                        {menuActions.map((a, idx) => (
                            <React.Fragment key={a.key}>
                                {a.separatorBefore && idx > 0 && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction(a.key, file);
                                    }}
                                    className={a.danger ? 'text-red-500 focus:text-red-500' : undefined}
                                >
                                    <a.Icon className='mr-2 h-4 w-4' />
                                    {a.label}
                                </DropdownMenuItem>
                            </React.Fragment>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {contextMenu && (
                <RowContextMenu
                    state={contextMenu}
                    actions={menuActions}
                    onAction={(key) => {
                        setContextMenu(null);
                        onAction(key, file);
                    }}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}
