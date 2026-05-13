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
import { cn } from '@/lib/utils';
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
    const isPublicKnowledgebasePage = pathname.startsWith('/knowledgebase');
    const knowledgebaseBasePath = isPublicKnowledgebasePage ? '/knowledgebase' : '/dashboard/knowledgebase';
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
        <div
            className={cn(
                'mx-auto flex max-w-4xl flex-col space-y-6 pt-2 pb-12',
                isPublicKnowledgebasePage && 'max-w-7xl px-4 md:px-8',
            )}
        >
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'top-of-page')} />

            <div
                className={cn(
                    'border-border/50 bg-card/60 flex flex-wrap items-center gap-3 rounded-2xl border p-3 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:gap-4 sm:p-4',
                    isPublicKnowledgebasePage &&
                        'border-border/60 from-card via-card/90 to-primary/5 bg-linear-to-b shadow-[0_20px_60px_-30px_rgba(0,0,0,0.65)]',
                )}
            >
                <div className='flex min-w-0 flex-1 items-center gap-3'>
                    <Link href={`${knowledgebaseBasePath}/category/${article.category_id}`}>
                        <Button variant='ghost' size='icon' className='h-9 w-9 shrink-0 rounded-full'>
                            <ChevronLeft className='h-4 w-4' />
                        </Button>
                    </Link>
                    <div className='min-w-0'>
                        <h1 className='line-clamp-2 text-lg font-bold tracking-tight sm:text-2xl md:text-3xl'>
                            {article.title}
                        </h1>
                        <div className='text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm'>
                            <span>{article.category?.name}</span>
                            <span className='hidden sm:inline'>•</span>
                            <span>{new Date(article.updated_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'after-header')} />

            <WidgetRenderer widgets={getWidgets('dashboard-knowledgebase-article', 'before-article-content')} />
            <div className='bg-card/50 text-card-foreground border-border/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                <div className='p-6 sm:p-8'>
                    {/* Use semantic colors only — prose-blue + dark:prose-invert can yield light headings on light cards */}
                    <div
                        className={cn(
                            'prose prose-sm max-w-none',
                            'prose-headings:text-foreground prose-p:text-muted-foreground',
                            'prose-li:text-muted-foreground prose-li:marker:text-primary',
                            'prose-hr:border-border',
                        )}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ children }) => (
                                    <h1 className='text-foreground mt-8 mb-4 text-3xl font-bold tracking-tight first:mt-0'>
                                        {children}
                                    </h1>
                                ),
                                h2: ({ children }) => (
                                    <h2 className='text-foreground border-border/60 mt-10 mb-3 scroll-mt-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0'>
                                        {children}
                                    </h2>
                                ),
                                h3: ({ children }) => (
                                    <h3 className='text-foreground mt-8 mb-2 text-xl font-semibold tracking-tight'>
                                        {children}
                                    </h3>
                                ),
                                h4: ({ children }) => (
                                    <h4 className='text-foreground mt-6 mb-2 text-lg font-semibold'>{children}</h4>
                                ),
                                h5: ({ children }) => (
                                    <h5 className='text-foreground mt-5 mb-1.5 text-base font-semibold'>{children}</h5>
                                ),
                                h6: ({ children }) => (
                                    <h6 className='text-muted-foreground mt-4 mb-1 text-sm font-semibold tracking-wide uppercase'>
                                        {children}
                                    </h6>
                                ),
                                ul: ({ children }) => (
                                    <ul className='text-muted-foreground marker:text-primary my-4 list-disc space-y-1.5 pl-6'>
                                        {children}
                                    </ul>
                                ),
                                ol: ({ children }) => (
                                    <ol className='text-muted-foreground marker:text-primary my-4 list-decimal space-y-1.5 pl-6 marker:font-semibold'>
                                        {children}
                                    </ol>
                                ),
                                li: ({ children }) => <li className='leading-relaxed'>{children}</li>,
                                hr: () => <hr className='border-border my-8' />,
                                p: ({ children }) => (
                                    <p className='text-muted-foreground mb-4 leading-relaxed last:mb-0'>{children}</p>
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
                                        <code className='text-foreground font-mono text-sm' {...props}>
                                            {children}
                                        </code>
                                    );
                                },
                                pre: ({ children }) => (
                                    <pre className='bg-muted/60 text-foreground border-border/50 my-6 overflow-x-auto rounded-xl border p-4'>
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
                                        <a
                                            {...props}
                                            href={href}
                                            className='text-primary font-medium underline-offset-2 hover:underline'
                                        >
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
                                    className='border-border/50 bg-card/50 hover:border-primary/30 group flex items-center justify-between rounded-xl border p-4 backdrop-blur-xl transition-all hover:bg-white/2'
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
