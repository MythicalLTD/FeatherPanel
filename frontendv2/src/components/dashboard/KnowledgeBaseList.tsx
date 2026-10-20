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
import { DashboardPanel } from './DashboardOverview';

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
            <div className='fp-surface space-y-2 rounded-xl border p-4' aria-busy='true'>
                <div className='bg-muted h-4 w-28 animate-pulse rounded' />
                {[0, 1, 2].map((i) => (
                    <div key={i} className='bg-muted/50 h-9 animate-pulse rounded-lg' />
                ))}
            </div>
        );
    }

    // Nothing to browse: leave the space to widgets that have content.
    if (error || categories.length === 0) {
        return null;
    }

    return (
        <DashboardPanel
            title={t('dashboard.knowledgebase.title')}
            icon={BookOpen}
            action={{ label: t('dashboard.knowledgebase.view_all'), href: '/dashboard/knowledgebase' }}
            flush
        >
            {categories.map((category) => (
                <Link
                    key={category.id}
                    href={`/dashboard/knowledgebase/category/${category.id}`}
                    className='hover:bg-muted/40 group flex min-w-0 items-center gap-3 px-4 py-2.5 transition-colors'
                >
                    <span className='fp-icon-tile flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
                        {category.icon ? (
                            <span className='relative h-5 w-5 overflow-hidden rounded-sm'>
                                <Image src={category.icon} alt='' fill className='object-cover' unoptimized />
                            </span>
                        ) : (
                            <BookOpen className='h-4 w-4' />
                        )}
                    </span>
                    <span className='min-w-0 flex-1'>
                        <span className='block truncate text-sm font-medium' title={category.name}>
                            {category.name}
                        </span>
                        {category.description && (
                            <span className='text-muted-foreground block truncate text-xs'>{category.description}</span>
                        )}
                    </span>
                    <ChevronRight className='text-muted-foreground/40 group-hover:text-primary h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5' />
                </Link>
            ))}
        </DashboardPanel>
    );
}
