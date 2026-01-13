/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

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
                <div className='flex items-center gap-3 text-muted-foreground'>
                    <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent' />
                    <span>{t('dashboard.knowledgebase.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'top-of-page')} />
            <div>
                <h1 className='text-3xl font-bold tracking-tight mb-2'>{t('dashboard.knowledgebase.title')}</h1>
                <p className='text-muted-foreground'>{t('dashboard.knowledgebase.browseByCategory')}</p>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'after-header')} />

            {/* Categories List */}
            {loading ? (
                <div className='space-y-4'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='h-24 bg-card/20 animate-pulse rounded-xl border border-border/50' />
                    ))}
                </div>
            ) : (
                <>
                    <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'before-categories-list')} />
                    <div className='bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden'>
                        {categories.length === 0 ? (
                            <div className='py-24 text-center'>
                                <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6 font-bold text-primary'>
                                    <BookOpen className='h-8 w-8' />
                                </div>
                                <h3 className='text-xl font-medium mb-2'>
                                    {t('dashboard.knowledgebase.noCategories')}
                                </h3>
                                <p className='text-muted-foreground'>
                                    {t('dashboard.knowledgebase.no_categories_desc')}
                                </p>
                            </div>
                        ) : (
                            <div className='divide-y divide-border/50'>
                                {categories.map((cat) => (
                                    <Link
                                        key={cat.id}
                                        href={`/dashboard/knowledgebase/category/${cat.id}`}
                                        className='block'
                                    >
                                        <div className='p-5 hover:bg-white/5 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border-l-2 border-l-transparent hover:border-l-primary cursor-pointer'>
                                            <div className='flex items-center gap-4 flex-1'>
                                                <div className='h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300 shrink-0'>
                                                    {cat.icon ? (
                                                        <div className='h-5 w-5 relative overflow-hidden rounded-sm'>
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
                                                    <h3 className='font-semibold text-lg text-foreground group-hover:text-primary transition-colors truncate'>
                                                        {cat.name}
                                                    </h3>
                                                    {cat.description && (
                                                        <p className='text-sm text-muted-foreground line-clamp-1 mt-0.5'>
                                                            {cat.description}
                                                        </p>
                                                    )}
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
                    </div>
                    <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'after-categories-list')} />
                </>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase', 'bottom-of-page')} />
        </div>
    );
}
