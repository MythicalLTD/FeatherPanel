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
                // Sort by position then name, similar to Vue implementation
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
