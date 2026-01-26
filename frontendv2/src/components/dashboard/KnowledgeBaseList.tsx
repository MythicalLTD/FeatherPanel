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

import { useState, useEffect } from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import Image from 'next/image';

interface KnowledgeBaseListProps {
    t: (key: string) => string;
}

interface Category {
    id: number;
    name: string;
    slug: string;
    icon: string;
    description?: string;
    position: number;
}

export function KnowledgeBaseList({ t }: KnowledgeBaseListProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await axios.get('/api/knowledgebase/categories', {
                    params: {
                        limit: 5,
                        page: 1,
                    },
                });

                const fetchedCategories = (data.data?.categories || []).sort((a: Category, b: Category) => {
                    if (a.position !== b.position) {
                        return a.position - b.position;
                    }
                    return a.name.localeCompare(b.name);
                });
                setCategories(fetchedCategories.slice(0, 5));
            } catch (err) {
                console.error('Failed to fetch knowledge base categories:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className='rounded-xl border border-border bg-card shadow-sm p-6 space-y-4'>
                <div className='flex items-center justify-between'>
                    <div className='h-6 w-32 bg-muted animate-pulse rounded' />
                    <div className='h-4 w-16 bg-muted animate-pulse rounded' />
                </div>
                <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='h-12 bg-muted/50 animate-pulse rounded-lg' />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return null;
    }

    return (
        <div className='rounded-xl border border-border bg-card shadow-sm'>
            <div className='flex items-center justify-between p-6 border-b border-border'>
                <div className='flex items-center gap-2'>
                    <BookOpen className='h-5 w-5 text-muted-foreground' />
                    <h2 className='text-lg font-bold'>{t('dashboard.knowledgebase.title')}</h2>
                </div>
                <Link
                    href='/dashboard/knowledgebase'
                    className='text-sm font-medium text-primary hover:text-primary/80 transition-colors'
                >
                    {t('dashboard.knowledgebase.view_all')} &rarr;
                </Link>
            </div>

            <div className='divide-y divide-border'>
                {categories.length > 0 ? (
                    categories.map((category) => (
                        <Link
                            key={category.id}
                            href={`/dashboard/knowledgebase/category/${category.id}`}
                            className='block p-4 hover:bg-muted/50 transition-colors group'
                        >
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                                <div className='flex items-start gap-4'>
                                    <div className='p-2 rounded-full bg-primary/5 text-primary shrink-0 mt-1 sm:mt-0 transition-transform group-hover:scale-110'>
                                        {category.icon ? (
                                            <div className='h-5 w-5 relative overflow-hidden rounded-sm'>
                                                <Image
                                                    src={category.icon}
                                                    alt={category.name}
                                                    fill
                                                    className='object-cover'
                                                    unoptimized
                                                />
                                            </div>
                                        ) : (
                                            <BookOpen className='h-5 w-5' />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className='font-medium text-foreground group-hover:text-primary transition-colors text-sm sm:text-base'>
                                            {category.name}
                                        </h4>
                                        {category.description && (
                                            <p className='text-xs text-muted-foreground mt-1 line-clamp-1'>
                                                {category.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className='h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all' />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className='p-8 text-center text-muted-foreground'>
                        <BookOpen className='h-8 w-8 mx-auto mb-2 opacity-50' />
                        <p>{t('dashboard.knowledgebase.no_categories')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
