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
import { Check, ChevronRight, Copy, Folder, Home, Search, Settings2, X } from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { toast } from 'sonner';
import { Input } from '@/components/featherui/Input';
import { useTranslation } from '@/contexts/TranslationContext';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ARCHIVE_EXTRACT_DRAG_MIME } from '@/lib/files-api';

interface FileBreadcrumbsProps {
    currentDirectory: string;
    onNavigate: (path: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onDropFilesToPath?: (destinationPath: string, event: React.DragEvent) => void;
    onToggleFilters?: () => void;
    activeFiltersCount?: number;
    /** Lists sibling folders behind each separator when set. */
    listFolders?: (path: string) => Promise<string[]>;
}

const DRAG_MIME = 'application/x-featherpanel-files';

interface CrumbButtonProps {
    path: string;
    isCurrent: boolean;
    onDropFilesToPath?: (destinationPath: string, event: React.DragEvent) => void;
    onClick: () => void;
    className?: string;
    title?: string;
    children: React.ReactNode;
}

function CrumbButton({ path, isCurrent, onDropFilesToPath, onClick, className, title, children }: CrumbButtonProps) {
    const [isDropTarget, setIsDropTarget] = useState(false);
    const dragCounterRef = useRef(0);
    const canAccept = !!onDropFilesToPath;

    const isPanelFileDrag = (e: React.DragEvent) =>
        e.dataTransfer.types.includes(DRAG_MIME) || e.dataTransfer.types.includes(ARCHIVE_EXTRACT_DRAG_MIME);

    const handleDragEnter = (e: React.DragEvent) => {
        if (!canAccept || !isPanelFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        setIsDropTarget(true);
    };
    const handleDragOver = (e: React.DragEvent) => {
        if (!canAccept || !isPanelFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        const copy = e.dataTransfer.types.includes(ARCHIVE_EXTRACT_DRAG_MIME);
        e.dataTransfer.dropEffect = copy ? 'copy' : 'move';
    };
    const handleDragLeave = (e: React.DragEvent) => {
        if (!canAccept || !isPanelFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) setIsDropTarget(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        if (!canAccept || !isPanelFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDropTarget(false);
        onDropFilesToPath?.(path, e);
    };

    return (
        <Button
            variant='ghost'
            size='sm'
            className={cn(className, isDropTarget && 'bg-primary/15 text-primary ring-primary/70 ring-2 ring-inset')}
            onClick={() => {
                if (!isCurrent) onClick();
            }}
            title={title}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {children}
        </Button>
    );
}

/** Separator that opens a list of the folders next to the following crumb. */
function SiblingFolders({
    parent,
    current,
    listFolders,
    onNavigate,
}: {
    parent: string;
    current: string;
    listFolders: (path: string) => Promise<string[]>;
    onNavigate: (path: string) => void;
}) {
    const { t } = useTranslation();
    const [folders, setFolders] = useState<string[] | null>(null);
    return (
        <Menu as='div' className='relative'>
            <MenuButton
                onClick={() => {
                    if (folders === null) {
                        listFolders(parent)
                            .then(setFolders)
                            .catch(() => setFolders([]));
                    }
                }}
                className='text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 flex h-7 w-5 items-center justify-center rounded-md'
                aria-label={t('files.breadcrumbs.siblings')}
                title={t('files.breadcrumbs.siblings')}
            >
                <ChevronRight className='h-4 w-4' />
            </MenuButton>
            <MenuItems
                anchor='bottom start'
                className='fp-menu-surface z-50 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border p-1 shadow-xl focus:outline-none'
            >
                {folders === null ? (
                    <div className='text-muted-foreground px-3 py-2 text-xs'>{t('common.loading')}</div>
                ) : folders.length === 0 ? (
                    <div className='text-muted-foreground px-3 py-2 text-xs'>{t('files.transfer.no_folders')}</div>
                ) : (
                    folders.map((name) => (
                        <MenuItem key={name}>
                            <button
                                type='button'
                                onClick={() => onNavigate(parent === '/' ? `/${name}` : `${parent}/${name}`)}
                                className={cn(
                                    'data-focus:bg-primary/10 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm',
                                    name === current && 'text-primary font-medium',
                                )}
                            >
                                <Folder className='h-4 w-4 shrink-0 text-amber-500' />
                                <span className='truncate'>{name}</span>
                            </button>
                        </MenuItem>
                    ))
                )}
            </MenuItems>
        </Menu>
    );
}

export function FileBreadcrumbs({
    currentDirectory,
    onNavigate,
    searchQuery,
    onSearchChange,
    onDropFilesToPath,
    onToggleFilters,
    activeFiltersCount = 0,
    listFolders,
}: FileBreadcrumbsProps) {
    const { t } = useTranslation();
    const segments = (currentDirectory || '').split('/').filter(Boolean);
    const normalizedCurrent = (currentDirectory || '/').replace(/\/+$/, '') || '/';
    const crumbsRef = useRef<HTMLDivElement | null>(null);

    const getPath = (index: number) => {
        return '/' + segments.slice(0, index + 1).join('/');
    };

    // Keep the deepest folder visible when the path is longer than the screen.
    useEffect(() => {
        const el = crumbsRef.current;
        if (el) el.scrollLeft = el.scrollWidth;
    }, [normalizedCurrent]);

    const [copied, setCopied] = useState(false);

    return (
        <div className='flex flex-col gap-2 p-1 md:flex-row md:items-center'>
            <div ref={crumbsRef} className='no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto'>
                <CrumbButton
                    path='/'
                    isCurrent={normalizedCurrent === '/'}
                    onDropFilesToPath={onDropFilesToPath}
                    className={cn(
                        'h-8 shrink-0 gap-1.5 px-2 transition-colors',
                        normalizedCurrent === '/'
                            ? 'text-foreground bg-muted/60 font-semibold'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                    onClick={() => onNavigate('/')}
                    title={t('files.breadcrumbs.home')}
                >
                    <Home className='h-4 w-4 shrink-0' />
                    {normalizedCurrent === '/' ? <span>{t('files.breadcrumbs.home')}</span> : null}
                </CrumbButton>

                {segments.map((segment, index) => {
                    const path = getPath(index);
                    const isCurrent = index === segments.length - 1;
                    return (
                        <div key={index} className='flex shrink-0 items-center gap-1'>
                            {listFolders ? (
                                <SiblingFolders
                                    parent={index === 0 ? '/' : getPath(index - 1)}
                                    current={segment}
                                    listFolders={listFolders}
                                    onNavigate={onNavigate}
                                />
                            ) : (
                                <ChevronRight className='text-muted-foreground/40 h-4 w-4' />
                            )}
                            <CrumbButton
                                path={path}
                                isCurrent={isCurrent}
                                onDropFilesToPath={onDropFilesToPath}
                                className={cn(
                                    'h-8 px-2 whitespace-nowrap transition-colors',
                                    isCurrent
                                        ? 'text-foreground bg-muted/60 cursor-default font-bold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                )}
                                onClick={() => onNavigate(path)}
                            >
                                {segment}
                            </CrumbButton>
                        </div>
                    );
                })}
            </div>

            <Button
                variant='ghost'
                size='sm'
                className='hidden h-8 shrink-0 rounded-lg px-2 md:inline-flex'
                title={t('files.breadcrumbs.copy_path')}
                aria-label={t('files.breadcrumbs.copy_path')}
                onClick={() => {
                    void navigator.clipboard?.writeText(normalizedCurrent).then(() => {
                        setCopied(true);
                        toast.success(t('files.breadcrumbs.path_copied'));
                        setTimeout(() => setCopied(false), 1500);
                    });
                }}
            >
                {copied ? <Check className='h-4 w-4 text-emerald-500' /> : <Copy className='h-4 w-4' />}
            </Button>

            <div className='flex w-full shrink-0 items-center gap-2 md:w-auto'>
                <div className='group relative min-w-0 flex-1 md:w-64 md:flex-none'>
                    <div className='pointer-events-none absolute inset-y-0 left-3 flex items-center'>
                        <Search className='text-muted-foreground group-focus-within:text-primary h-4 w-4 transition-colors' />
                    </div>
                    <Input
                        id='file-search-input'
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={t('files.breadcrumbs.search_placeholder')}
                        className='focus:border-primary/50 focus:ring-primary/10 border-border/60 bg-background/60 h-10 rounded-2xl pr-10 pl-10 text-sm font-medium transition-all focus:ring-4'
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className='text-muted-foreground hover:text-foreground absolute inset-y-0 right-3 flex items-center transition-colors'
                        >
                            <X className='h-3.5 w-3.5' />
                        </button>
                    )}
                </div>
                {onToggleFilters && (
                    <Button
                        variant='ghost'
                        size='sm'
                        className='h-10 shrink-0 rounded-xl px-3'
                        onClick={onToggleFilters}
                        title={t('files.search.advanced.show_filters')}
                    >
                        <Settings2 className='h-4 w-4' />
                        {activeFiltersCount > 0 && (
                            <span className='bg-primary/20 text-primary ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold'>
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
