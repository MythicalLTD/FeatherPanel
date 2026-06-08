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

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios, { AxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import {
    ArrowLeft,
    Paperclip,
    Trash2,
    Send,
    AlertCircle,
    X,
    Server as ServerIcon,
    XCircle,
    FileText,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { RoleBadge } from '@/components/RoleBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import clsx from 'clsx';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface ApiTicket {
    id: number;
    uuid: string;
    title: string;
    description: string;
    created_at: string;
    closed_at?: string;
    status?: {
        id: number;
        name: string;
        color?: string;
    };
    priority?: {
        id: number;
        name: string;
        color?: string;
    };
    category?: {
        id: number;
        name: string;
        icon?: string;
    };
    server?: {
        id: number;
        name: string;
    };
}

interface ApiTicketMessage {
    id: number;
    message: string;
    is_internal: boolean | number;
    created_at: string;
    user?: {
        uuid: string;
        username: string;
        avatar?: string;
        first_name?: string;
        last_name?: string;
        role?: {
            id: number;
            name: string;
            color?: string;
        };
    };
    attachments?: Array<{
        id: number;
        file_name: string;
        file_size: number;
        url: string;
    }>;
}

interface TicketResponse {
    success: boolean;
    data: {
        ticket: ApiTicket;
        messages: ApiTicketMessage[];
    };
    message?: string;
}

interface ReplyResponse {
    success: boolean;
    data: {
        message_id: number;
    };
}

export default function TicketViewPage() {
    const { uuid } = useParams();
    const { t } = useTranslation();
    const { user: currentUser } = useSession();

    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState<ApiTicket | null>(null);
    const [messages, setMessages] = useState<ApiTicketMessage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [replyMessage, setReplyMessage] = useState('');
    const [replying, setReplying] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchTicketDetails = async () => {
        try {
            const { data } = await axios.get<TicketResponse>(`/api/user/tickets/${uuid}`);
            if (data.success) {
                setTicket(data.data.ticket);

                const sortedMessages = [...(data.data.messages || [])].sort((a, b) => {
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                });
                setMessages(sortedMessages);
            } else {
                setError(t('tickets.failedToLoad'));
            }
        } catch (err: unknown) {
            console.error('Failed to load ticket', err);
            const error = err as AxiosError<{ message: string }>;
            setError(error.response?.data?.message || t('tickets.failedToLoad'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (uuid) {
            fetchTicketDetails();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuid]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFiles(Array.from(e.target.files));
    };

    const addFiles = (newFiles: File[]) => {
        const maxSize = 50 * 1024 * 1024;
        const validFiles = newFiles.filter((file) => {
            if (file.size > maxSize) {
                toast.error(t('tickets.fileTooLarge').replace('{name}', file.name));
                return false;
            }
            return true;
        });
        setFiles((prev) => [...prev, ...validFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() && files.length === 0) return;

        setReplying(true);
        try {
            const { data } = await axios.post<ReplyResponse>(`/api/user/tickets/${uuid}/reply`, {
                message: replyMessage,
            });

            const messageId = data.data?.message_id;

            if (files.length > 0 && messageId) {
                for (const file of files) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('message_id', String(messageId));
                    await axios.post(`/api/user/tickets/${uuid}/attachments`, formData);
                }
            }

            toast.success(t('tickets.replySent'));
            setReplyMessage('');
            setFiles([]);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('featherpanel:ticket-replied', {
                        detail: { ticketUuid: String(uuid) },
                    }),
                );
            }
            fetchTicketDetails();
        } catch (err: unknown) {
            console.error('Failed to send reply', err);
            const error = err as AxiosError<{ message: string }>;
            toast.error(error.response?.data?.message || t('tickets.failedToSendReply'));
        } finally {
            setReplying(false);
        }
    };

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-tickets-view');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const deleteMessage = async (messageId: number) => {
        if (!confirm(t('tickets.deleteMessageConfirm'))) return;

        try {
            await axios.delete(`/api/user/tickets/${uuid}/messages/${messageId}`);
            toast.success(t('tickets.messageDeleted'));
            fetchTicketDetails();
        } catch (err) {
            console.error('Failed to delete message', err);
            toast.error(t('tickets.failedToDeleteMessage'));
        }
    };

    const canDeleteMessage = (message: ApiTicketMessage) => {
        if (!currentUser || !message.user) return false;
        return currentUser.uuid === message.user.uuid && !ticket?.closed_at;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className='flex h-[50vh] items-center justify-center'>
                <div className='border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent' />
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className='flex h-[50vh] flex-col items-center justify-center space-y-4'>
                <AlertCircle className='text-destructive h-12 w-12 opacity-50' />
                <h3 className='text-xl font-medium'>{error || t('tickets.ticketNotFound')}</h3>
                <Link href='/dashboard/tickets'>
                    <Button variant='outline'>{t('tickets.backToTickets')}</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className='flex h-[calc(100vh-6rem)] w-full flex-col pt-2 pb-6'>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'top-of-page')} />

            <div className='border-border/50 bg-card/60 mb-4 flex shrink-0 items-center justify-between rounded-2xl border p-3 px-1 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-4'>
                <div className='flex min-w-0 items-center gap-3'>
                    <Link href='/dashboard/tickets'>
                        <Button variant='ghost' size='icon' className='h-9 w-9 rounded-full'>
                            <ArrowLeft className='h-4 w-4' />
                        </Button>
                    </Link>
                    <div className='min-w-0'>
                        <h1 className='line-clamp-1 text-lg font-bold tracking-tight sm:text-xl'>{ticket.title}</h1>
                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                            <span className='font-mono'>#{ticket.id}</span>
                            <span>•</span>
                            <span>{new Date(ticket.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <div className='hidden items-center gap-2 sm:flex'>
                    <Badge
                        className='h-6 px-2.5 text-xs uppercase'
                        style={{
                            backgroundColor: ticket.status?.color ? `${ticket.status.color}20` : undefined,
                            color: ticket.status?.color,
                            borderColor: ticket.status?.color ? `${ticket.status.color}40` : undefined,
                        }}
                        variant='outline'
                    >
                        {ticket.status?.name}
                    </Badge>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'after-header')} />

            <div className='grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6'>
                <div className='bg-card/65 border-border/50 flex h-full flex-col overflow-hidden rounded-2xl border shadow-[0_12px_36px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl xl:col-span-9 2xl:col-span-10'>
                    <div className='custom-scrollbar flex-1 space-y-8 overflow-y-auto p-4 sm:p-6 lg:p-8'>
                        <div className='group flex gap-4'>
                            <Avatar className='ring-border/50 bg-primary/10 text-primary mt-1 h-10 w-10 ring-2'>
                                <div className='flex h-full w-full items-center justify-center'>
                                    <FileText className='h-4 w-4' />
                                </div>
                            </Avatar>
                            <div className='max-w-[92%] flex-1 space-y-1 lg:max-w-[88%]'>
                                <div className='flex items-center gap-2'>
                                    <span className='text-sm font-semibold'>{t('tickets.originalRequest')}</span>
                                    <span className='text-muted-foreground text-xs'>
                                        {new Date(ticket.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className='bg-card/70 border-border/50 rounded-2xl rounded-tl-sm border p-4 text-sm leading-relaxed whitespace-pre-wrap'>
                                    <ReactMarkdown>{ticket.description}</ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {messages.length > 0 && (
                            <div className='relative flex items-center py-2'>
                                <div className='border-border/50 grow border-t'></div>
                                <span className='text-muted-foreground mx-4 shrink-0 text-xs font-medium uppercase'>
                                    {t('tickets.conversation')}
                                </span>
                                <div className='border-border/50 grow border-t'></div>
                            </div>
                        )}

                        {messages.map((msg) => {
                            const isMe = currentUser?.uuid === msg.user?.uuid;
                            const isInternal = msg.is_internal === 1 || msg.is_internal === true;

                            return (
                                <div
                                    key={msg.id}
                                    className={clsx('group flex gap-4', isMe ? 'flex-row-reverse' : 'flex-row')}
                                >
                                    <Avatar className='ring-border/50 mt-1 h-10 w-10 shrink-0 ring-2'>
                                        <AvatarImage src={msg.user?.avatar} />
                                    </Avatar>

                                    <div
                                        className={clsx(
                                            'flex max-w-[92%] flex-col lg:max-w-[84%] 2xl:max-w-[78%]',
                                            isMe ? 'items-end' : 'items-start',
                                        )}
                                    >
                                        {!isMe && (
                                            <div className='mb-1 flex items-center gap-2 px-1'>
                                                <span className='text-sm font-semibold'>
                                                    {msg.user?.username || t('tickets.system')}
                                                </span>
                                                {msg.user?.role && (
                                                    <RoleBadge
                                                        role={msg.user.role}
                                                        className='h-4 px-1 text-[10px] leading-none'
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <div
                                            className={clsx(
                                                'relative w-fit min-w-[150px] px-4 py-3 text-sm shadow-sm',
                                                isInternal
                                                    ? 'rounded-xl border border-dashed border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                                                    : 'bg-card/75 text-foreground border-border/50 rounded-2xl border',
                                            )}
                                        >
                                            {isInternal && (
                                                <div className='mb-2 flex items-center gap-1.5 border-b border-yellow-500/20 pb-2 text-xs font-bold tracking-wider uppercase opacity-80'>
                                                    <AlertCircle className='h-3 w-3' />
                                                    {t('tickets.internalNote')}
                                                </div>
                                            )}

                                            <div
                                                className={clsx(
                                                    'prose prose-sm dark:prose-invert max-w-none text-left leading-normal wrap-break-word',
                                                )}
                                            >
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => (
                                                            <p className='mb-1 whitespace-pre-wrap last:mb-0'>
                                                                {children}
                                                            </p>
                                                        ),
                                                        hr: () => (
                                                            <hr
                                                                className={clsx(
                                                                    'my-4 border-t',
                                                                    isMe
                                                                        ? 'border-primary/20 dashed'
                                                                        : 'border-border/60 dashed',
                                                                )}
                                                            />
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className='mb-2 list-disc space-y-1 pl-4'>
                                                                {children}
                                                            </ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className='mb-2 list-decimal space-y-1 pl-4'>
                                                                {children}
                                                            </ol>
                                                        ),
                                                        li: ({ children }) => <li className='mb-0.5'>{children}</li>,
                                                    }}
                                                >
                                                    {msg.message
                                                        .replace(/\n---\n-\n/g, '\n---\n')
                                                        .replace(/\n---\n---\n/g, '\n---\n')
                                                        .replace(/\n\s*\n\s*\n/g, '\n\n')}
                                                </ReactMarkdown>
                                            </div>

                                            <div
                                                className={clsx(
                                                    'text-muted-foreground/70 mt-1 flex items-center justify-end gap-2 select-none',
                                                )}
                                            >
                                                <span className='text-[10px]'>
                                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>

                                            {canDeleteMessage(msg) && (
                                                <button
                                                    onClick={() => deleteMessage(msg.id)}
                                                    className={clsx(
                                                        'absolute top-2 -right-8 p-1.5 opacity-0 transition-all group-hover:opacity-100',
                                                        'text-muted-foreground hover:text-destructive',
                                                    )}
                                                    title={t('tickets.deleteMessage')}
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </button>
                                            )}
                                        </div>

                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className='mt-1 flex flex-wrap justify-end gap-2'>
                                                {msg.attachments.map((att) => (
                                                    <a
                                                        key={att.id}
                                                        href={att.url}
                                                        target='_blank'
                                                        rel='noopener noreferrer'
                                                        className='bg-card/50 border-border/50 hover:border-primary/50 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs backdrop-blur-xl transition-colors'
                                                    >
                                                        <div className='bg-muted text-muted-foreground rounded-md p-1.5'>
                                                            <Paperclip className='h-3.5 w-3.5' />
                                                        </div>
                                                        <div className='flex min-w-0 flex-col'>
                                                            <span className='max-w-[120px] truncate font-medium'>
                                                                {att.file_name}
                                                            </span>
                                                            <span className='text-muted-foreground text-[10px]'>
                                                                {formatFileSize(att.file_size)}
                                                            </span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className='bg-card/70 border-border/50 border-t p-4 backdrop-blur-md'>
                        {ticket.closed_at ? (
                            <div className='bg-muted/50 text-muted-foreground flex items-center justify-center gap-2 rounded-xl border border-dashed p-4'>
                                <XCircle className='h-5 w-5' />
                                <span className='font-medium'>{t('tickets.ticketClosed')}</span>
                            </div>
                        ) : (
                            <form onSubmit={handleReply} className='relative flex flex-col gap-2'>
                                {files.length > 0 && (
                                    <div className='bg-card/75 border-border/40 mb-2 flex flex-wrap gap-2 rounded-lg border p-2'>
                                        {files.map((file, idx) => (
                                            <Badge
                                                key={idx}
                                                variant='secondary'
                                                className='bg-background border-border flex items-center gap-1 border py-1 pr-1 pl-2'
                                            >
                                                <span className='max-w-[150px] truncate'>{file.name}</span>
                                                <button
                                                    type='button'
                                                    onClick={() => removeFile(idx)}
                                                    className='hover:bg-destructive/10 hover:text-destructive ml-1 rounded-full p-0.5 transition-colors'
                                                >
                                                    <X className='h-3 w-3' />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                <div className='flex items-end gap-2'>
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon'
                                        className={clsx(
                                            'text-muted-foreground hover:bg-card/80 border-border/40 h-[44px] w-[44px] shrink-0 rounded-xl border font-normal',
                                            isDragging && 'bg-primary/10 text-primary',
                                        )}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
                                        }}
                                        title={t('tickets.attachFiles')}
                                    >
                                        <Paperclip className='h-5 w-5' />
                                    </Button>

                                    <div className='relative flex-1'>
                                        <Textarea
                                            value={replyMessage}
                                            onChange={(e) => setReplyMessage(e.target.value)}
                                            placeholder={t('tickets.typeReply')}
                                            className='border-border/60 bg-card/85 hover:border-primary/50 focus:border-primary focus:ring-primary/20 max-h-[220px] min-h-[46px] resize-none rounded-xl py-3 pr-12'
                                            rows={1}
                                            style={{ height: '46px' }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = '46px';
                                                target.style.height = `${Math.min(target.scrollHeight, 220)}px`;
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleReply(e);
                                                }
                                            }}
                                        />
                                        <Button
                                            type='submit'
                                            size='icon'
                                            className='bg-primary text-primary-foreground hover:bg-primary/90 absolute top-1.5 right-1.5 h-8.5 w-8.5 rounded-lg shadow-sm transition-all'
                                            loading={replying}
                                            disabled={!replyMessage.trim() && files.length === 0}
                                        >
                                            <Send className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                                <input
                                    type='file'
                                    ref={fileInputRef}
                                    className='hidden'
                                    multiple
                                    onChange={handleFileSelect}
                                />
                            </form>
                        )}
                    </div>
                    <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'after-messages')} />
                </div>

                <div className='custom-scrollbar h-full space-y-4 overflow-y-auto pb-6 xl:col-span-3 2xl:col-span-2'>
                    <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'sidebar-top')} />

                    <Card className='border-border/50 bg-card/65 sticky top-2 shadow-[0_12px_36px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl'>
                        <CardHeader className='pb-2'>
                            <CardTitle className='text-muted-foreground text-sm font-medium tracking-wider uppercase'>
                                {t('tickets.details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className='bg-card/75 border-border/50 flex items-center justify-between rounded-lg border p-3'>
                                <span className='text-sm font-medium'>{t('tickets.statusLabel')}</span>
                                <Badge
                                    className='h-6 px-2.5 text-xs uppercase'
                                    style={{
                                        backgroundColor: ticket.status?.color ? `${ticket.status.color}20` : undefined,
                                        color: ticket.status?.color,
                                        borderColor: ticket.status?.color ? `${ticket.status.color}40` : undefined,
                                    }}
                                    variant='outline'
                                >
                                    {ticket.status?.name}
                                </Badge>
                            </div>

                            <div className='bg-card/75 border-border/50 flex items-center justify-between rounded-lg border p-3'>
                                <span className='text-sm font-medium'>{t('tickets.priority')}</span>
                                <Badge variant='secondary' className='h-6 px-2.5 text-xs font-semibold'>
                                    {ticket.priority?.name}
                                </Badge>
                            </div>

                            <div className='bg-card/75 border-border/50 flex items-center justify-between rounded-lg border p-3'>
                                <span className='text-sm font-medium'>{t('tickets.category')}</span>
                                <div className='flex items-center gap-2'>
                                    {ticket.category?.icon && (
                                        <div className='relative h-4 w-4 opacity-75'>
                                            <Image
                                                src={ticket.category.icon}
                                                alt=''
                                                fill
                                                className='object-contain'
                                                sizes='16px'
                                            />
                                        </div>
                                    )}
                                    <span className='text-muted-foreground text-sm'>{ticket.category?.name}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {ticket.server && (
                        <Card className='border-border/50 bg-card/65 backdrop-blur-xl'>
                            <CardHeader className='pb-2'>
                                <CardTitle className='text-muted-foreground text-sm font-medium tracking-wider uppercase'>
                                    {t('tickets.server')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className='bg-card/75 border-border/50 flex items-center gap-3 rounded-lg border p-3'>
                                    <div className='bg-muted rounded p-2'>
                                        <ServerIcon className='text-muted-foreground h-4 w-4' />
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <div className='truncate text-sm font-medium' title={ticket.server.name}>
                                            {ticket.server.name}
                                        </div>
                                        <div className='text-muted-foreground text-xs'>
                                            {t('tickets.serverId')}: {ticket.server.id}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'sidebar-bottom')} />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'bottom-of-page')} />
        </div>
    );
}
