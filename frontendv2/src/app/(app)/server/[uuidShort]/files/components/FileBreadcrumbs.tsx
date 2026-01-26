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

interface FileBreadcrumbsProps {
    currentDirectory: string;
    onNavigate: (path: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
}

export function FileBreadcrumbs({ currentDirectory, onNavigate, searchQuery, onSearchChange }: FileBreadcrumbsProps) {
    const { t } = useTranslation();
    const segments = (currentDirectory || '').split('/').filter(Boolean);

    const getPath = (index: number) => {
        return '/' + segments.slice(0, index + 1).join('/');
    };

    return (
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 p-1'>
            <div className='flex items-center gap-1 overflow-x-auto no-scrollbar'>
                <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0'
                    onClick={() => onNavigate('/')}
                    title={t('files.breadcrumbs.home')}
                >
                    <Home className='h-4 w-4' />
                </Button>

                {segments.map((segment, index) => (
                    <div key={index} className='flex items-center gap-1 shrink-0'>
                        <ChevronRight className='h-4 w-4 text-muted-foreground/40' />
                        <Button
                            variant='ghost'
                            size='sm'
                            className={`h-8 px-2 whitespace-nowrap ${
                                index === segments.length - 1
                                    ? 'font-bold text-foreground pointer-events-none bg-white/5'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                            }`}
                            onClick={() => onNavigate(getPath(index))}
                        >
                            {segment}
                        </Button>
                    </div>
                ))}
            </div>

            <div className='relative w-full md:w-64 group'>
                <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
                    <Search className='h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                </div>
                <Input
                    id='file-search-input'
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('files.breadcrumbs.search_placeholder')}
                    className='h-10 pl-10 pr-10 bg-black/5 dark:bg-black/20 border-black/10 dark:border-white/5 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all rounded-2xl text-sm font-medium'
                />
                {searchQuery && (
                    <button
                        onClick={() => onSearchChange('')}
                        className='absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-white transition-colors'
                    >
                        <X className='h-3.5 w-3.5' />
                    </button>
                )}
            </div>
        </div>
    );
}
