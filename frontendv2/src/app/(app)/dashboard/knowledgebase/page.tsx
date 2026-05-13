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

import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Category {
    id: number;
    name: string;
    slug: string;
    icon: string;
    description?: string;
    position: number;
}

export default function KnowledgeBasePage() {
    const { t } = useTranslation();
    const pathname = usePathname();
    const isPublicKnowledgebasePage = pathname.startsWith('/knowledgebase');
    const knowledgebaseBasePath = pathname.startsWith('/knowledgebase') ? '/knowledgebase' : '/dashboard/knowledgebase';
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-knowledgebase');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await axios.get('/api/knowledgebase/categories', {
                    params: { page: 1, limit: 100 },
                });
                const fetched = (data.data?.categories || []).sort((a: Category, b: Category) => {
                    if (a.position !== b.position) return a.position - b.position;
                    return a.name.localeCompare(b.name);
                });
                setCategories(fetched);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <div className='text-muted-foreground flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent' />
                    <span>{t('dashboard.knowledgebase.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'space-y-6',
                isPublicKnowledgebasePage && 'mx-auto w-full max-w-7xl px-4 pt-8 pb-12 md:px-8 md:pt-10',
            )}
        >
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'top-of-page')} />

            <div
                className={cn(
                    'flex flex-col justify-between gap-4 sm:flex-row sm:items-center',
                    isPublicKnowledgebasePage &&
                        'border-border/60 from-card via-card/90 to-primary/5 rounded-2xl border bg-linear-to-b p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)] md:p-7',
                )}
            >
                <div>
                    {isPublicKnowledgebasePage && (
                        <div className='mb-3 flex flex-wrap items-center gap-2'>
                            <Badge className='bg-primary/15 text-primary border-primary/20 border text-[10px] font-bold tracking-wide uppercase'>
                                {t('public_portal.badges.public')}
                            </Badge>
                            <Badge className='border border-amber-500/20 bg-amber-500/15 text-[10px] font-bold tracking-wide text-amber-500 uppercase'>
                                {t('public_portal.badges.docs')}
                            </Badge>
                        </div>
                    )}
                    <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
                        {t('dashboard.knowledgebase.title')}
                    </h1>
                    <p className='text-muted-foreground mt-1 text-sm'>
                        {t('dashboard.knowledgebase.browseByCategory')}
                    </p>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'after-header')} />

            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'before-categories-list')} />
            {categories.length === 0 ? (
                <div className='border-border/50 bg-card/10 rounded-xl border border-dashed py-24 text-center'>
                    <div className='bg-primary/10 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full'>
                        <BookOpen className='text-primary h-8 w-8' />
                    </div>
                    <h3 className='mb-2 text-xl font-medium'>{t('dashboard.knowledgebase.noCategories')}</h3>
                    <p className='text-muted-foreground mx-auto max-w-sm'>
                        {t('dashboard.knowledgebase.no_categories_desc')}
                    </p>
                </div>
            ) : (
                <div className='bg-card/50 border-border/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                    <div className='divide-border/50 divide-y'>
                        {categories.map((cat) => (
                            <Link key={cat.id} href={`${knowledgebaseBasePath}/category/${cat.id}`} className='block'>
                                <div className='group hover:border-l-primary flex cursor-pointer flex-col justify-between gap-4 border-l-2 border-l-transparent p-5 transition-all duration-200 hover:bg-white/2 sm:flex-row sm:items-center'>
                                    <div className='flex flex-1 items-center gap-4'>
                                        <div className='bg-primary/5 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110'>
                                            {cat.icon ? (
                                                <div className='relative h-5 w-5 overflow-hidden rounded-sm'>
                                                    <Image
                                                        src={cat.icon}
                                                        fill
                                                        unoptimized
                                                        alt={cat.name}
                                                        className='object-cover'
                                                    />
                                                </div>
                                            ) : (
                                                <BookOpen className='h-5 w-5' />
                                            )}
                                        </div>
                                        <div className='min-w-0'>
                                            <h3 className='text-foreground group-hover:text-primary truncate text-lg font-semibold transition-colors'>
                                                {cat.name}
                                            </h3>
                                            {cat.description && (
                                                <p className='text-muted-foreground mt-0.5 line-clamp-1 text-sm'>
                                                    {cat.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className='flex translate-x-2 transform items-center gap-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100'>
                                        <div className='border-border/50 border-l pl-4'>
                                            <ChevronRight className='text-primary h-5 w-5' />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'after-categories-list')} />
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'bottom-of-page')} />
        </div>
    );
}
