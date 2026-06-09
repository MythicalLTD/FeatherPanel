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

import { Button } from '@/components/featherui/Button';
import {
    RefreshCw,
    Upload,
    Trash2,
    FolderPlus,
    FilePlus,
    FileUp,
    FolderUp,
    Download,
    Archive,
    Settings,
    Move,
    Copy,
    ShieldCheck,
    MoreVertical,
    Boxes,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/contexts/TranslationContext';

interface FileActionToolbarProps {
    loading: boolean;
    selectedCount: number;
    onRefresh: () => void;
    onCreateFile: () => void;
    onCreateFolder: () => void;
    /** Single upload action (legacy). If both onUploadFiles and onUploadFolders are set, they are used instead. */
    onUpload?: () => void;
    onUploadFiles?: () => void;
    onUploadFolders?: () => void;
    onDeleteSelected: () => void;
    onArchiveSelected: () => void;
    onClearSelection: () => void;
    onPullFile: () => void;
    onWipeAll: () => void;
    onIgnoredContent: () => void;
    onCopySelected: () => void;
    onMoveSelected: () => void;
    onPermissionsSelected: () => void;
    onOpenInIDE: () => void;
    canCreate: boolean;
    canDelete: boolean;
    currentDirectory: string;
}

export function FileActionToolbar({
    loading,
    selectedCount,
    onRefresh,
    onCreateFile,
    onCreateFolder,
    onUpload,
    onUploadFiles,
    onUploadFolders,
    onDeleteSelected,
    onArchiveSelected,
    onClearSelection,
    onPullFile,
    onWipeAll,
    onIgnoredContent,
    onCopySelected,
    onMoveSelected,
    onPermissionsSelected,
    onOpenInIDE,
    canCreate,
    canDelete,
    currentDirectory,
}: FileActionToolbarProps) {
    const { t } = useTranslation();
    const hasSelection = selectedCount > 0;

    return (
        <div className='sticky top-0 z-20 pb-4'>
            <div className='flex flex-col gap-4 rounded-xl border border-black/5 bg-white/80 p-2 backdrop-blur-xl transition-all duration-300 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5'>
                {hasSelection ? (
                    <>
                        <div className='flex items-center gap-3 px-2'>
                            <div className='bg-primary/10 text-primary animate-in zoom-in-50 flex h-8 w-8 items-center justify-center rounded-lg duration-300'>
                                <span className='text-xs font-bold'>{selectedCount}</span>
                            </div>
                            <span className='text-muted-foreground xs:inline hidden text-sm font-medium'>
                                {t('files.toolbar.selected')}
                            </span>
                            <div className='bg-border xs:block mx-1 hidden h-4 w-px' />
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={onClearSelection}
                                className='text-muted-foreground hover:text-foreground h-8 px-3 text-xs font-bold tracking-wider uppercase'
                            >
                                {t('files.toolbar.cancel')}
                            </Button>
                        </div>
                        <div className='no-scrollbar flex items-center gap-1.5 overflow-x-auto pl-2'>
                            <Button
                                variant='secondary'
                                size='sm'
                                onClick={onArchiveSelected}
                                className='h-9 bg-black/5 px-4 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20'
                            >
                                <Archive className='mr-2 h-4 w-4' />
                                <span className='hidden sm:inline'>{t('files.toolbar.compress')}</span>
                            </Button>
                            <Button
                                variant='secondary'
                                size='sm'
                                onClick={onDeleteSelected}
                                className='h-9 bg-red-500/10 px-3 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                            >
                                <Trash2 className='h-4 w-4' />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger as={Button} variant='ghost' size='icon' className='h-9 w-9'>
                                    <MoreVertical className='h-4 w-4' />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                    <DropdownMenuItem onClick={onMoveSelected}>
                                        <Move className='mr-2 h-4 w-4' /> {t('files.toolbar.move')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onCopySelected}>
                                        <Copy className='mr-2 h-4 w-4' /> {t('files.toolbar.copy')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={onPermissionsSelected}>
                                        <ShieldCheck className='mr-2 h-4 w-4' /> {t('files.toolbar.permissions')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </>
                ) : (
                    <>
                        <div className='flex flex-wrap items-center gap-1.5'>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={onRefresh}
                                disabled={loading}
                                className='text-muted-foreground hover:text-foreground h-9 px-3 hover:bg-black/5 dark:hover:bg-white/5'
                            >
                                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                                <span className='xs:inline hidden'>{t('files.toolbar.refresh')}</span>
                            </Button>
                            {canCreate && (
                                <>
                                    <div className='bg-border mx-1 hidden h-4 w-px sm:block' />
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={onCreateFile}
                                        className='text-muted-foreground hover:text-foreground h-9 px-3 hover:bg-black/5 dark:hover:bg-white/5'
                                    >
                                        <FilePlus className='mr-2 h-4 w-4' />
                                        <span className='hidden lg:inline'>{t('files.toolbar.new_file')}</span>
                                    </Button>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={onCreateFolder}
                                        className='text-muted-foreground hover:text-foreground h-9 px-3 hover:bg-black/5 dark:hover:bg-white/5'
                                    >
                                        <FolderPlus className='mr-2 h-4 w-4' />
                                        <span className='hidden lg:inline'>{t('files.toolbar.new_folder')}</span>
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className='flex items-center gap-2'>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={onPullFile}
                                className='text-muted-foreground hover:text-foreground h-9 px-3 hover:bg-black/5 dark:hover:bg-white/5'
                            >
                                <Download className='mr-2 h-4 w-4' />
                                <span className='xs:inline hidden'>{t('files.toolbar.pull')}</span>
                            </Button>

                            {canCreate &&
                                (onUpload || onUploadFiles || onUploadFolders) &&
                                (onUploadFiles || onUploadFolders ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            as={Button}
                                            variant='default'
                                            size='sm'
                                            className='h-9 px-6 font-semibold shadow-sm'
                                        >
                                            <Upload className='mr-2 h-4 w-4' />
                                            {t('files.toolbar.upload')}
                                            <ChevronDown className='ml-2 h-4 w-4 opacity-70' />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align='start'>
                                            {onUploadFiles && (
                                                <DropdownMenuItem onClick={onUploadFiles}>
                                                    <FileUp className='mr-2 h-4 w-4' />
                                                    {t('files.toolbar.upload_files')}
                                                </DropdownMenuItem>
                                            )}
                                            {onUploadFolders && (
                                                <DropdownMenuItem onClick={onUploadFolders}>
                                                    <FolderUp className='mr-2 h-4 w-4' />
                                                    {t('files.toolbar.upload_folders')}
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    <Button
                                        variant='default'
                                        size='sm'
                                        onClick={onUpload}
                                        className='h-9 px-6 font-semibold shadow-sm'
                                    >
                                        <Upload className='mr-2 h-4 w-4' />
                                        {t('files.toolbar.upload')}
                                    </Button>
                                ))}

                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={onOpenInIDE}
                                className='text-muted-foreground hover:text-foreground h-9 shrink-0 px-3 hover:bg-black/5 dark:hover:bg-white/5'
                            >
                                <Boxes className='mr-2 h-4 w-4 shrink-0' />
                                <span className='xs:inline hidden'>{t('files.toolbar.open_in_ide')}</span>
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    as={Button}
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground hover:text-foreground h-9 w-9 shrink-0 p-0 hover:bg-black/5 dark:hover:bg-white/5'
                                >
                                    <Settings className='h-4 w-4 shrink-0' />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end'>
                                    <DropdownMenuItem onClick={onIgnoredContent}>
                                        <ShieldCheck className='mr-2 h-4 w-4' />
                                        {t('files.toolbar.ignored_content')}
                                    </DropdownMenuItem>
                                    {canDelete && currentDirectory === '/' && (
                                        <DropdownMenuItem
                                            onClick={onWipeAll}
                                            className='text-red-500 focus:bg-red-500/10 focus:text-red-500'
                                        >
                                            <Trash2 className='mr-2 h-4 w-4' /> {t('files.toolbar.wipe_all')}
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
