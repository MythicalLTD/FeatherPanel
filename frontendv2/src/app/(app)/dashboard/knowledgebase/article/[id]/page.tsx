/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
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

import { useState, useEffect, use, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import axios from 'axios';
import { FileText, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & {
    inline?: boolean;
    children?: ReactNode;
};

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
    const pathname = usePathname();
    const knowledgebaseBasePath = pathname.startsWith('/knowledgebase') ? '/knowledgebase' : '/dashboard/knowledgebase';
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
                <div className='text-muted-foreground flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent' />
                    <span>{t('dashboard.knowledgebase.loadingArticle')}</span>
                </div>
            </div>
        );
    }

    if (!article) return null;

    return (
        <div className='mx-auto flex max-w-4xl flex-col space-y-6 pt-2 pb-12'>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'top-of-page')} />

            <div className='flex items-center gap-4 px-1'>
                <Link href={`${knowledgebaseBasePath}/category/${article.category_id}`}>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='border-border/50 hover:bg-card h-10 w-10 rounded-full border'
                    >
                        <ChevronLeft className='h-5 w-5' />
                    </Button>
                </Link>
                <div>
                    <h1 className='text-foreground text-3xl font-bold tracking-tight'>{article.title}</h1>
                    <div className='text-muted-foreground mt-1 flex items-center gap-2 text-sm'>
                        <span>{article.category?.name}</span>
                        <span>•</span>
                        <span>{new Date(article.updated_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'after-header')} />
            </div>

            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'before-article-content')} />
            <div className='bg-card border-border/50 overflow-hidden rounded-xl border shadow-sm'>
                <div className='p-8'>
                    <div className='prose prose-blue dark:prose-invert max-w-none'>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ children }) => (
                                    <p className='text-muted-foreground/90 mb-4 leading-relaxed'>{children}</p>
                                ),
                                code: ({ inline, children, ...props }: MarkdownCodeProps) => {
                                    if (inline) {
                                        return (
                                            <code className='bg-muted text-primary rounded px-1.5 py-0.5 font-mono text-sm'>
                                                {children}
                                            </code>
                                        );
                                    }
                                    return (
                                        <code className='font-mono text-sm' {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                                pre: ({ children }) => (
                                    <pre className='bg-muted/50 border-border/50 my-6 overflow-x-auto rounded-xl border p-4'>
                                        {children}
                                    </pre>
                                ),
                                blockquote: ({ children }) => (
                                    <blockquote className='border-primary/30 text-muted-foreground my-6 border-l-4 pl-4 italic'>
                                        {children}
                                    </blockquote>
                                ),
                                img: ({ node, ...props }) => (
                                    <img
                                        {...props}
                                        alt={props.alt || ''}
                                        className='border-border/50 mx-auto my-8 block max-w-full rounded-xl border shadow-md'
                                    />
                                ),
                                a: ({ node, href, children, ...props }) => {
                                    if (href && /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(href)) {
                                        return (
                                            <img
                                                src={href}
                                                alt={typeof children === 'string' ? children : ''}
                                                className='border-border/50 mx-auto my-8 block max-w-full rounded-xl border shadow-md'
                                            />
                                        );
                                    }
                                    return (
                                        <a {...props} href={href} className='text-primary font-medium hover:underline'>
                                            {children}
                                        </a>
                                    );
                                },
                                table: ({ children }) => (
                                    <div className='my-6 overflow-x-auto'>
                                        <table className='w-full border-collapse text-sm'>{children}</table>
                                    </div>
                                ),
                                thead: ({ children }) => <thead className='bg-muted/50'>{children}</thead>,
                                tbody: ({ children }) => (
                                    <tbody className='divide-border/50 divide-y'>{children}</tbody>
                                ),
                                tr: ({ children }) => (
                                    <tr className='border-border/50 hover:bg-muted/30 border-b transition-colors'>
                                        {children}
                                    </tr>
                                ),
                                th: ({ children }) => (
                                    <th className='text-foreground border-border/50 border px-4 py-3 text-left font-semibold'>
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td className='text-muted-foreground border-border/50 border px-4 py-3'>
                                        {children}
                                    </td>
                                ),
                                strong: ({ children }) => (
                                    <strong className='text-foreground font-semibold'>{children}</strong>
                                ),
                            }}
                        >
                            {article.content}
                        </ReactMarkdown>
                    </div>

                    {article.tags && article.tags.length > 0 && (
                        <div className='border-border/50 mt-12 flex flex-wrap gap-2 border-t pt-8'>
                            {article.tags.map((tag) => (
                                <Badge
                                    key={tag.id}
                                    variant='secondary'
                                    className='bg-muted/50 text-muted-foreground border-0 px-3 py-1'
                                >
                                    #{tag.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'after-article-content')} />

            {article.attachments && article.attachments.length > 0 && (
                <>
                    <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'before-attachments')} />
                    <div className='space-y-4'>
                        <h3 className='px-1 text-lg font-semibold'>{t('dashboard.knowledgebase.attachments')}</h3>
                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            {article.attachments.map((attachment) => (
                                <a
                                    key={attachment.id}
                                    href={attachment.url}
                                    className='border-border/50 bg-card hover:border-primary/30 group flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all hover:bg-white/5'
                                >
                                    <div className='flex min-w-0 items-center gap-4'>
                                        <div className='bg-primary/5 text-primary rounded-lg p-3 transition-transform group-hover:scale-110'>
                                            <FileText className='h-6 w-6' />
                                        </div>
                                        <div className='min-w-0'>
                                            <p className='text-foreground group-hover:text-primary truncate font-semibold transition-colors'>
                                                {attachment.file_name}
                                            </p>
                                            <p className='text-muted-foreground text-xs'>
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
