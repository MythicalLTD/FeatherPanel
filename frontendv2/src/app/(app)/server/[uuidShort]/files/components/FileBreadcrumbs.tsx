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
import { ChevronRight, Home, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/TranslationContext';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FileBreadcrumbsProps {
    currentDirectory: string;
    onNavigate: (path: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onDropFilesToPath?: (destinationPath: string, event: React.DragEvent) => void;
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
    const canAccept = !!onDropFilesToPath && !isCurrent;

    const isInternal = (e: React.DragEvent) => e.dataTransfer.types.includes(DRAG_MIME);

    const handleDragEnter = (e: React.DragEvent) => {
        if (!canAccept || !isInternal(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        setIsDropTarget(true);
    };
    const handleDragOver = (e: React.DragEvent) => {
        if (!canAccept || !isInternal(e)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDragLeave = (e: React.DragEvent) => {
        if (!canAccept || !isInternal(e)) return;
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) setIsDropTarget(false);
    };
    const handleDrop = (e: React.DragEvent) => {
        if (!canAccept || !isInternal(e)) return;
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
            className={cn(
                className,
                isDropTarget && !isCurrent && 'bg-primary/15 text-primary ring-primary/70 ring-2 ring-inset',
            )}
            onClick={onClick}
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

export function FileBreadcrumbs({
    currentDirectory,
    onNavigate,
    searchQuery,
    onSearchChange,
    onDropFilesToPath,
}: FileBreadcrumbsProps) {
    const { t } = useTranslation();
    const segments = (currentDirectory || '').split('/').filter(Boolean);
    const normalizedCurrent = (currentDirectory || '/').replace(/\/+$/, '') || '/';

    const getPath = (index: number) => {
        return '/' + segments.slice(0, index + 1).join('/');
    };

    return (
        <div className='flex flex-col justify-between gap-4 p-1 md:flex-row md:items-center'>
            <div className='no-scrollbar flex items-center gap-1 overflow-x-auto'>
                <CrumbButton
                    path='/'
                    isCurrent={normalizedCurrent === '/'}
                    onDropFilesToPath={onDropFilesToPath}
                    className='text-muted-foreground hover:text-foreground h-8 w-8 shrink-0 p-0 transition-colors'
                    onClick={() => onNavigate('/')}
                    title={t('files.breadcrumbs.home')}
                >
                    <Home className='h-4 w-4' />
                </CrumbButton>

                {segments.map((segment, index) => {
                    const path = getPath(index);
                    const isCurrent = index === segments.length - 1;
                    return (
                        <div key={index} className='flex shrink-0 items-center gap-1'>
                            <ChevronRight className='text-muted-foreground/40 h-4 w-4' />
                            <CrumbButton
                                path={path}
                                isCurrent={isCurrent}
                                onDropFilesToPath={onDropFilesToPath}
                                className={cn(
                                    'h-8 px-2 whitespace-nowrap transition-colors',
                                    isCurrent
                                        ? 'text-foreground pointer-events-none bg-white/5 font-bold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5',
                                )}
                                onClick={() => onNavigate(path)}
                            >
                                {segment}
                            </CrumbButton>
                        </div>
                    );
                })}
            </div>

            <div className='group relative w-full md:w-64'>
                <div className='pointer-events-none absolute inset-y-0 left-3 flex items-center'>
                    <Search className='text-muted-foreground group-focus-within:text-primary h-4 w-4 transition-colors' />
                </div>
                <Input
                    id='file-search-input'
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('files.breadcrumbs.search_placeholder')}
                    className='focus:border-primary/50 focus:ring-primary/10 h-10 rounded-2xl border-black/10 bg-black/5 pr-10 pl-10 text-sm font-medium transition-all focus:ring-4 dark:border-white/5 dark:bg-black/20'
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className='text-muted-foreground absolute inset-y-0 right-3 flex items-center transition-colors hover:text-white'
                    >
                        <X className='h-3.5 w-3.5' />
                    </button>
                )}
            </div>
        </div>
    );
}
