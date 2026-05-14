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

import { useState, useEffect, use } from 'react';
import axios from 'axios';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn } from '@/lib/utils';

interface Category {
    id: number;
    name: string;
    slug: string;
    icon: string;
    description?: string;
}

interface Article {
    id: number;
    title: string;
    slug: string;
    icon?: string | null;
    content: string;
    pinned: 'true' | 'false';
    created_at: string;
    updated_at: string;
    published_at?: string | null;
}

interface Pagination {
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    total: number;
}

export default function CategoryArticlesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { t } = useTranslation();
    const pathname = usePathname();
    const isPublicKnowledgebasePage = pathname.startsWith('/knowledgebase');
    const knowledgebaseBasePath = pathname.startsWith('/knowledgebase') ? '/knowledgebase' : '/dashboard/knowledgebase';
    const [category, setCategory] = useState<Category | null>(null);
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-knowledgebase-category');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const fetchArticles = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`/api/knowledgebase/categories/${id}/articles`, {
                    params: { page: currentPage, limit: 10 },
                });
                setCategory(data.data.category);
                setArticles(data.data.articles || []);
                setPagination({
                    current_page: data.data.pagination.current_page,
                    total_pages: data.data.pagination.total_pages,
                    has_next: data.data.pagination.has_next,
                    has_prev: data.data.pagination.has_prev,
                    total: data.data.pagination.total,
                });
            } catch (err) {
                console.error('Failed to fetch articles:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, [id, currentPage]);

    if (loading) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <div className='text-muted-foreground flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent' />
                    <span>{t('dashboard.knowledgebase.loadingArticles')}</span>
                </div>
            </div>
        );
    }

    if (!category) return null;

    return (
        <div
            className={cn(
                'space-y-6',
                isPublicKnowledgebasePage && 'mx-auto w-full max-w-7xl px-4 pt-8 pb-12 md:px-8 md:pt-10',
            )}
        >
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'top-of-page')} />

            <div
                className={cn(
                    'flex flex-col justify-between gap-3 sm:flex-row sm:items-center',
                    isPublicKnowledgebasePage &&
                        'border-border/60 from-card via-card/90 to-primary/5 rounded-2xl border bg-linear-to-b p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)] md:p-7',
                )}
            >
                <div className='flex items-center gap-4'>
                    <Link href={knowledgebaseBasePath}>
                        <Button variant='ghost' size='icon' className='h-9 w-9 rounded-full'>
                            <ChevronLeft className='h-4 w-4' />
                        </Button>
                    </Link>
                    <div>
                        <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>{category.name}</h1>
                        {category.description && (
                            <p className='text-muted-foreground mt-1 text-sm'>{category.description}</p>
                        )}
                    </div>
                </div>
                <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'after-header')} />
            </div>

            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'before-articles-list')} />
            {pagination && pagination.total_pages > 1 && (
                <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.has_prev}
                        onClick={() => setCurrentPage((p) => p - 1)}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('dashboard.knowledgebase.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {currentPage} / {pagination.total_pages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.has_next}
                        onClick={() => setCurrentPage((p) => p + 1)}
                        className='gap-1.5'
                    >
                        {t('dashboard.knowledgebase.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}
            {articles.length === 0 ? (
                <div className='border-border/50 bg-card/10 rounded-xl border border-dashed py-24 text-center'>
                    <div className='bg-primary/10 mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full'>
                        <BookOpen className='text-primary h-8 w-8' />
                    </div>
                    <h3 className='mb-2 text-xl font-medium'>{t('dashboard.knowledgebase.noArticles')}</h3>
                    <p className='text-muted-foreground mx-auto max-w-sm'>
                        {t('dashboard.knowledgebase.no_articles_desc')}
                    </p>
                </div>
            ) : (
                <div className='bg-card/50 border-border/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                    <div className='divide-border/50 divide-y'>
                        {articles.map((article) => (
                            <Link
                                key={article.id}
                                href={`${knowledgebaseBasePath}/article/${article.id}`}
                                className='block'
                            >
                                <div className='group hover:border-l-primary flex cursor-pointer flex-col justify-between gap-3 border-l-2 border-l-transparent p-4 transition-all duration-200 hover:bg-white/2 sm:flex-row sm:items-center'>
                                    <div className='flex flex-1 items-center gap-4'>
                                        <div className='bg-primary/5 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110'>
                                            {article.icon ? (
                                                <div className='relative h-5 w-5 overflow-hidden rounded-sm'>
                                                    <Image
                                                        src={article.icon}
                                                        fill
                                                        unoptimized
                                                        alt={article.title}
                                                        className='object-cover'
                                                    />
                                                </div>
                                            ) : (
                                                <BookOpen className='h-5 w-5' />
                                            )}
                                        </div>
                                        <div className='min-w-0'>
                                            <h3 className='text-foreground group-hover:text-primary truncate text-sm font-semibold transition-colors md:text-[0.95rem]'>
                                                {article.title}
                                            </h3>
                                            {article.pinned === 'true' && (
                                                <Badge className='bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase transition-colors'>
                                                    {t('dashboard.knowledgebase.pinned')}
                                                </Badge>
                                            )}
                                            <div className='text-muted-foreground mt-0.5 flex items-center gap-2 text-[11px]'>
                                                <span>{new Date(article.updated_at).toLocaleDateString()}</span>
                                                {article.slug && (
                                                    <>
                                                        <span className='hidden sm:inline'>•</span>
                                                        <span className='font-mono'>{article.slug}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className='flex translate-x-1 transform items-center gap-2 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100'>
                                        <div className='border-border/50 border-l pl-4'>
                                            <ChevronRight className='text-primary h-4 w-4' />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {pagination && pagination.total_pages > 1 && (
                        <div className='border-border/50 bg-muted/20 flex items-center justify-between border-t p-3'>
                            <p className='text-muted-foreground text-sm'>
                                {currentPage} / {pagination.total_pages}
                            </p>
                            <div className='flex gap-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='border-border/50 h-9'
                                    disabled={!pagination.has_prev}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    <ChevronLeft className='mr-1 h-4 w-4' />
                                    {t('dashboard.knowledgebase.previous')}
                                </Button>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='border-border/50 h-9'
                                    disabled={!pagination.has_next}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    {t('dashboard.knowledgebase.next')}
                                    <ChevronRight className='ml-1 h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'after-articles-list')} />
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'bottom-of-page')} />
        </div>
    );
}
