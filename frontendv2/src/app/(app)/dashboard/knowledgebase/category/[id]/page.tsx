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
import { useTranslation } from '@/contexts/TranslationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

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
                <div className='flex items-center gap-3 text-muted-foreground'>
                    <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent' />
                    <span>{t('dashboard.knowledgebase.loadingArticles')}</span>
                </div>
            </div>
        );
    }

    if (!category) return null;

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'top-of-page')} />

            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-4'>
                    <Link href='/dashboard/knowledgebase'>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='rounded-full h-10 w-10 border border-border/50 hover:bg-card'
                        >
                            <ChevronLeft className='h-5 w-5' />
                        </Button>
                    </Link>
                    <div>
                        <h1 className='text-3xl font-bold tracking-tight text-foreground'>{category.name}</h1>
                        {category.description && <p className='text-muted-foreground'>{category.description}</p>}
                    </div>
                </div>
                <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'after-header')} />
            </div>

            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'before-articles-list')} />
            {pagination && pagination.total_pages > 1 && (
                <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50 mb-4'>
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
            <div className='bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden'>
                {articles.length === 0 ? (
                    <div className='py-24 text-center'>
                        <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 font-bold text-primary'>
                            <BookOpen className='h-8 w-8' />
                        </div>
                        <h3 className='text-xl font-medium mb-2'>{t('dashboard.knowledgebase.noArticles')}</h3>
                        <p className='text-muted-foreground'>{t('dashboard.knowledgebase.no_articles_desc')}</p>
                    </div>
                ) : (
                    <div className='divide-y divide-border/50'>
                        {articles.map((article) => (
                            <Link
                                key={article.id}
                                href={`/dashboard/knowledgebase/article/${article.id}`}
                                className='block'
                            >
                                <div className='p-5 hover:bg-white/5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border-l-2 border-l-transparent hover:border-l-primary cursor-pointer'>
                                    <div className='flex items-center gap-4 flex-1'>
                                        <div className='h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shrink-0'>
                                            {article.icon ? (
                                                <div className='h-5 w-5 relative overflow-hidden rounded-sm'>
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
                                            <h3 className='font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate'>
                                                {article.title}
                                            </h3>
                                            {article.pinned === 'true' && (
                                                <Badge className='bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider'>
                                                    {t('dashboard.knowledgebase.pinned')}
                                                </Badge>
                                            )}
                                            <div className='flex items-center gap-2 mt-0.5 text-xs text-muted-foreground'>
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
                                    <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0'>
                                        <div className='pl-4 border-l border-border/50'>
                                            <ChevronRight className='h-5 w-5 text-primary' />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {pagination && pagination.total_pages > 1 && (
                    <div className='p-4 border-t border-border/50 flex items-center justify-between bg-white/1'>
                        <p className='text-sm text-muted-foreground'>
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
                                <ChevronLeft className='h-4 w-4 mr-1' />
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
                                <ChevronRight className='h-4 w-4 ml-1' />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'after-articles-list')} />
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-category', 'bottom-of-page')} />
        </div>
    );
}
