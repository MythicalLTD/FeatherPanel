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

import { useState, useEffect, use } from 'react';
import axios from 'axios';
import { FileText, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Category {
    id: number;
    name: string;
}

interface Attachment {
    id: number;
    file_name: string;
    file_size: number;
    url: string;
}

interface Tag {
    id: number;
    name: string;
}

interface Article {
    id: number;
    title: string;
    content: string;
    category_id: number;
    category?: Category;
    attachments?: Attachment[];
    tags?: Tag[];
    updated_at: string;
}

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { t } = useTranslation();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-knowledgebase-article');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const fetchArticle = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`/api/knowledgebase/articles/${id}`);
                setArticle(data.data.article);
            } catch (err) {
                console.error('Failed to fetch article:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
    }, [id]);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <div className='flex items-center gap-3 text-muted-foreground'>
                    <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent' />
                    <span>{t('dashboard.knowledgebase.loadingArticle')}</span>
                </div>
            </div>
        );
    }

    if (!article) return null;

    return (
        <div className='max-w-4xl mx-auto space-y-6 flex flex-col pt-2 pb-12'>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'top-of-page')} />
            {/* Header */}
            <div className='flex items-center gap-4 px-1'>
                <Link href={`/dashboard/knowledgebase/category/${article.category_id}`}>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='rounded-full h-10 w-10 border border-border/50 hover:bg-card'
                    >
                        <ChevronLeft className='h-5 w-5' />
                    </Button>
                </Link>
                <div>
                    <h1 className='text-3xl font-bold tracking-tight text-foreground'>{article.title}</h1>
                    <div className='flex items-center gap-2 text-sm text-muted-foreground mt-1'>
                        <span>{article.category?.name}</span>
                        <span>•</span>
                        <span>{new Date(article.updated_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'after-header')} />
            </div>

            {/* Article Content */}
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'before-article-content')} />
            <div className='bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden'>
                <div className='p-8'>
                    <div className='prose prose-blue dark:prose-invert max-w-none'>
                        <ReactMarkdown
                            components={{
                                p: ({ children }) => (
                                    <p className='leading-relaxed mb-4 text-muted-foreground/90'>{children}</p>
                                ),
                                code: ({ children }) => (
                                    <code className='bg-muted px-1.5 py-0.5 rounded text-primary font-mono text-sm'>
                                        {children}
                                    </code>
                                ),
                                pre: ({ children }) => (
                                    <pre className='bg-muted/50 p-4 rounded-xl border border-border/50 overflow-x-auto my-6'>
                                        {children}
                                    </pre>
                                ),
                                blockquote: ({ children }) => (
                                    <blockquote className='border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-6'>
                                        {children}
                                    </blockquote>
                                ),
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                img: ({ node, ...props }) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        {...props}
                                        alt={props.alt || ''}
                                        className='rounded-xl border border-border/50 shadow-md my-8 mx-auto'
                                    />
                                ),
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                a: ({ node, ...props }) => (
                                    <a {...props} className='text-primary hover:underline font-medium'>
                                        {props.children}
                                    </a>
                                ),
                            }}
                        >
                            {article.content}
                        </ReactMarkdown>
                    </div>

                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                        <div className='mt-12 pt-8 border-t border-border/50 flex flex-wrap gap-2'>
                            {article.tags.map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant='secondary'
                                    className='px-3 py-1 bg-muted/50 border-0 text-muted-foreground'
                                >
                                    #{tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'after-article-content')} />

            {/* Attachments */}
            {article.attachments && article.attachments.length > 0 && (
                <>
                    <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'before-attachments')} />
                    <div className='space-y-4'>
                        <h3 className='text-lg font-semibold px-1'>{t('dashboard.knowledgebase.attachments')}</h3>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            {article.attachments.map((attachment) => (
                                <a
                                    key={attachment.id}
                                    href={attachment.url}
                                    className='flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-white/5 hover:border-primary/30 transition-all group shadow-sm'
                                >
                                    <div className='flex items-center gap-4 min-w-0'>
                                        <div className='p-3 rounded-lg bg-primary/5 text-primary group-hover:scale-110 transition-transform'>
                                            <FileText className='h-6 w-6' />
                                        </div>
                                        <div className='min-w-0'>
                                            <p className='font-semibold text-foreground truncate group-hover:text-primary transition-colors'>
                                                {attachment.file_name}
                                            </p>
                                            <p className='text-xs text-muted-foreground'>
                                                {formatFileSize(attachment.file_size)}
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                    <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'after-attachments')} />
                </>
            )}
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'bottom-of-page')} />
        </div>
    );
}
