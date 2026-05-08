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
            <div className='border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 backdrop-blur-xl'>
                <div className='flex items-center justify-between'>
                    <div className='bg-muted h-6 w-32 animate-pulse rounded' />
                    <div className='bg-muted h-4 w-16 animate-pulse rounded' />
                </div>
                <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='bg-muted/50 h-12 animate-pulse rounded-lg' />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return null;
    }

    return (
        <div className='border-border/50 bg-card/50 rounded-xl border backdrop-blur-xl'>
            <div className='border-border flex min-w-0 flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
                <div className='flex min-w-0 items-center gap-2'>
                    <BookOpen className='text-muted-foreground h-5 w-5' />
                    <h2 className='truncate text-base font-bold sm:text-lg'>{t('dashboard.knowledgebase.title')}</h2>
                </div>
                <Link
                    href='/dashboard/knowledgebase'
                    className='text-primary hover:text-primary/80 self-start text-xs font-medium whitespace-nowrap transition-colors sm:self-auto sm:text-sm'
                >
                    {t('dashboard.knowledgebase.view_all')} &rarr;
                </Link>
            </div>

            <div className='divide-border divide-y'>
                {categories.length > 0 ? (
                    categories.map((category) => (
                        <Link
                            key={category.id}
                            href={`/dashboard/knowledgebase/category/${category.id}`}
                            className='hover:bg-muted/50 group block p-4 transition-colors'
                        >
                            <div className='flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4'>
                                <div className='flex min-w-0 items-start gap-3 sm:gap-4'>
                                    <div className='bg-primary/5 text-primary mt-1 shrink-0 rounded-full p-2 transition-transform group-hover:scale-110 sm:mt-0'>
                                        {category.icon ? (
                                            <div className='relative h-5 w-5 overflow-hidden rounded-sm'>
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
                                    <div className='min-w-0'>
                                        <h4
                                            className='text-foreground group-hover:text-primary line-clamp-2 text-sm font-medium break-words transition-colors sm:text-base'
                                            title={category.name}
                                        >
                                            {category.name}
                                        </h4>
                                        {category.description && (
                                            <p className='text-muted-foreground mt-1 line-clamp-2 text-xs break-words'>
                                                {category.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className='text-muted-foreground/30 group-hover:text-primary hidden h-5 w-5 shrink-0 transition-all group-hover:translate-x-1 sm:block' />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className='text-muted-foreground p-8 text-center'>
                        <BookOpen className='mx-auto mb-2 h-8 w-8 opacity-50' />
                        <p>{t('dashboard.knowledgebase.no_categories')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
