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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { ArrowLeft, Info, Lock, RefreshCw, Send, Unlock, Paperclip, X, Settings } from 'lucide-react';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { RoleBadge } from '@/components/RoleBadge';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format';
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TicketSidebar } from './components/TicketSidebar';

export interface UserData {
    id: number;
    uuid: string;
    username: string;
    email: string;
    avatar: string;
    first_name?: string;
    last_name?: string;
    role?: {
        name: string;
        display_name: string;
        color: string;
    };
    first_seen: string;
    last_seen: string;
    last_ip: string;
    first_ip?: string;
    banned?: string;
    two_fa_enabled?: string;
    mails?: UserMail[];
}

export interface UserMail {
    subject: string;
    body?: string;
    status: string;
    created_at: string;
}

export interface Message {
    id: number;
    message: string;
    user_uuid: string;
    admin_reply: boolean;
    is_internal: boolean;
    created_at: string;
    user?: {
        username: string;
        avatar: string;
        role?: {
            name: string;
            display_name: string;
            color: string;
        };
    };
    attachments?: Attachment[];
}

export interface Attachment {
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    url: string;
}

export interface Meta {
    id: number;
    name: string;
    color: string;
}

export interface Ticket {
    id: number;
    uuid: string;
    title: string;
    description?: string;
    user_uuid: string;
    category_id: number;
    priority_id: number;
    status_id: number;
    server_id: number | null;
    created_at: string;
    updated_at: string;
    user: UserData;
    category: Meta;
    status: Meta;
    priority: Meta;
    messages: Message[];
    server?: {
        id: number;
        uuid: string;
        name: string;
    };
}

export default function TicketViewPage() {
    const { uuid } = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userServers, setUserServers] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userTickets, setUserTickets] = useState<any[]>([]);
    const [userDetails, setUserDetails] = useState<UserData | null>(null);
    const [loadingSidebar, setLoadingSidebar] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        category_id: '',
        priority_id: '',
        status_id: '',
    });
    const [categories, setCategories] = useState<Meta[]>([]);
    const [priorities, setPriorities] = useState<Meta[]>([]);
    const [statuses, setStatuses] = useState<Meta[]>([]);

    const [mailPreviewOpen, setMailPreviewOpen] = useState(false);
    const [mailPreview, setMailPreview] = useState<UserMail | null>(null);

    const { getWidgets, fetchWidgets } = usePluginWidgets('admin-tickets-view');

    const fetchTicket = useCallback(async () => {
        try {
            const { data } = await axios.get<{ data: { ticket: Ticket; messages: Message[] } }>(
                `/api/admin/tickets/${uuid}`,
            );

            const ticketData = { ...data.data.ticket, messages: data.data.messages || [] };

            if (ticketData.messages && Array.isArray(ticketData.messages)) {
                ticketData.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
            }

            setTicket(ticketData);

            setEditForm({
                title: ticketData.title || '',
                description: ticketData.description || '',
                category_id: ticketData.category_id?.toString() || '',
                priority_id: ticketData.priority_id?.toString() || '',
                status_id: ticketData.status_id?.toString() || '',
            });

            if (ticketData.user_uuid) {
                fetchUserData(ticketData.user_uuid);
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
            toast.error(t('admin.tickets.messages.fetch_failed'));
            router.push('/admin/tickets');
        } finally {
            setLoading(false);
        }
    }, [uuid, t, router]);

    const fetchUserData = async (userUuid: string) => {
        setLoadingSidebar(true);
        try {
            const userRes = await axios.get(`/api/admin/users/${userUuid}`);
            if (userRes.data?.data?.user) {
                setUserDetails(userRes.data.data.user);
            }

            try {
                const serversRes = await axios.get(`/api/admin/users/${userUuid}/servers`);
                setUserServers(serversRes.data.data.servers || []);
            } catch (e) {
                console.error('Error fetching user servers:', e);
            }

            try {
                const ticketsRes = await axios.get('/api/admin/tickets', {
                    params: { user_uuid: userUuid, limit: 10 },
                });
                setUserTickets(ticketsRes.data.data.tickets || []);
            } catch (e) {
                console.error('Error fetching user tickets:', e);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoadingSidebar(false);
        }
    };

    const fetchDependencies = async () => {
        try {
            const [catRes, prioRes, statusRes] = await Promise.all([
                axios.get('/api/admin/tickets/categories'),
                axios.get('/api/admin/tickets/priorities'),
                axios.get('/api/admin/tickets/statuses'),
            ]);
            setCategories(catRes.data.data.categories || []);
            setPriorities(prioRes.data.data.priorities || []);
            setStatuses(statusRes.data.data.statuses || []);
        } catch (error) {
            console.error('Error fetching dependencies:', error);
        }
    };

    useEffect(() => {
        fetchTicket();
        fetchDependencies();
        fetchWidgets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuid]);

    useEffect(() => {
        if (ticket?.user_uuid) {
            fetchUserData(ticket.user_uuid);
        }
    }, [ticket?.user_uuid]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [ticket?.messages]);

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
        if (!reply.trim() && files.length === 0) return;

        setIsSubmitting(true);
        try {
            let finalMessage = reply;

            if (files.length > 0) {
                const uploadedLinks: string[] = [];

                for (const file of files) {
                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        const { data } = await axios.post(`/api/admin/tickets/${uuid}/attachments`, formData);
                        if (data.success && data.data.url) {
                            uploadedLinks.push(`\n**Attachment:** [${file.name}](${data.data.url})`);
                        }
                    } catch (err) {
                        toast.error(t('tickets.uploadError').replace('{name}', file.name));
                        console.error('Upload failed', err);
                    }
                }

                if (uploadedLinks.length > 0) {
                    finalMessage += '\n' + uploadedLinks.join('\n');
                }
            }

            await axios.post(`/api/admin/tickets/${uuid}/reply`, {
                message: finalMessage,
                is_internal: isInternal,
            });

            toast.success(t('admin.tickets.view.reply_success'));
            setReply('');
            setFiles([]);
            setIsInternal(false);
            fetchTicket();
        } catch (error) {
            console.error(error);
            toast.error(t('admin.tickets.view.reply_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = async () => {
        if (!confirm(t('admin.tickets.messages.delete_confirm'))) return;
        try {
            await axios.post(`/api/admin/tickets/${uuid}/close`);
            toast.success(t('admin.tickets.messages.close_success'));
            fetchTicket();
        } catch {
            toast.error(t('admin.tickets.messages.close_failed'));
        }
    };

    const handleReopen = async () => {
        try {
            await axios.post(`/api/admin/tickets/${uuid}/reopen`);
            toast.success(t('admin.tickets.messages.reopen_success'));
            fetchTicket();
        } catch {
            toast.error(t('admin.tickets.messages.reopen_failed'));
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.patch(`/api/admin/tickets/${uuid}`, editForm);
            toast.success(t('admin.tickets.messages.update_success'));
            setEditOpen(false);
            fetchTicket();
        } catch {
            toast.error(t('admin.tickets.messages.update_failed'));
        }
    };

    if (loading) {
        return (
            <div className='flex min-h-[400px] items-center justify-center'>
                <RefreshCw className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    if (!ticket) return null;

    if (!ticket) return null;

    return (
        <div className='mx-auto flex h-[calc(100vh-6rem)] max-w-[1800px] flex-col px-2 pt-2 pb-6 sm:px-4'>
            <WidgetRenderer widgets={getWidgets('admin-tickets-view', 'top-of-page')} />

            <div className='mb-4 flex shrink-0 items-center justify-between px-1'>
                <div className='flex items-center gap-3'>
                    <Link href='/admin/tickets'>
                        <Button variant='ghost' size='icon' className='h-9 w-9 rounded-full'>
                            <ArrowLeft className='h-4 w-4' />
                        </Button>
                    </Link>
                    <div>
                        <h1 className='line-clamp-1 text-xl font-bold tracking-tight'>{ticket.title}</h1>
                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                            <span className='font-mono'>#{ticket.id}</span>
                            <span>•</span>
                            <span>{new Date(ticket.created_at).toLocaleString()}</span>
                            <span>•</span>
                            <span className='text-foreground font-medium'>{ticket.category?.name}</span>
                        </div>
                    </div>
                </div>

                <div className='flex items-center gap-2'>
                    <div className='xl:hidden'>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='h-9 w-9 rounded-full'
                            onClick={() => setMobileDetailsOpen(true)}
                        >
                            <Info className='h-5 w-5' />
                        </Button>
                        <Sheet
                            open={mobileDetailsOpen}
                            onOpenChange={setMobileDetailsOpen}
                            className='w-full sm:w-[400px]'
                        >
                            <SheetHeader className='border-border/5 mb-0 border-b p-0 pb-4'>
                                <SheetTitle>{t('admin.tickets.view.info')}</SheetTitle>
                                <SheetDescription>{t('admin.tickets.view.info')}</SheetDescription>
                            </SheetHeader>
                            <div className='safe-padding-bottom h-[calc(100vh-100px)] overflow-hidden pt-4'>
                                <TicketSidebar
                                    ticket={ticket}
                                    userDetails={userDetails}
                                    userServers={userServers}
                                    userTickets={userTickets}
                                    loadingSidebar={loadingSidebar}
                                    onOpenMailPreview={(mail) => {
                                        setMailPreview(mail);
                                        setMailPreviewOpen(true);
                                    }}
                                    widgets={getWidgets('admin-tickets-view', 'sidebar-bottom')}
                                    WidgetRenderer={WidgetRenderer}
                                />
                            </div>
                        </Sheet>
                    </div>

                    <div className='flex items-center gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setEditOpen(true)}
                            className='h-9 rounded-lg text-xs font-medium'
                        >
                            <Settings className='mr-2 h-3.5 w-3.5' /> {t('admin.tickets.view.edit')}
                        </Button>
                        {ticket.status?.id === 3 ? (
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={handleReopen}
                                className='h-9 rounded-lg text-xs font-medium'
                            >
                                <Unlock className='mr-2 h-3.5 w-3.5' /> {t('admin.tickets.view.reopen')}
                            </Button>
                        ) : (
                            <Button
                                variant='destructive'
                                size='sm'
                                onClick={handleClose}
                                className='h-9 rounded-lg text-xs font-medium'
                            >
                                <Lock className='mr-2 h-3.5 w-3.5' /> {t('admin.tickets.view.close')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-tickets-view', 'after-header')} />

            <div className='grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6'>
                <div className='bg-card border-border/50 flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm xl:col-span-9 2xl:col-span-10'>
                    <div
                        className='custom-scrollbar flex-1 space-y-7 overflow-y-auto p-4 sm:p-6 lg:p-8'
                        ref={scrollRef}
                    >
                        <div className='group flex gap-4'>
                            <Avatar className='ring-border/50 mt-1 h-10 w-10 ring-2'>
                                <AvatarImage src={ticket.user.avatar} />
                            </Avatar>
                            <div className='max-w-[92%] flex-1 space-y-1 lg:max-w-[88%]'>
                                <div className='flex items-center gap-2'>
                                    <span className='text-sm font-bold'>
                                        {t('admin.tickets.view.original_request')}
                                    </span>
                                    <span className='text-muted-foreground text-[10px]'>
                                        {new Date(ticket.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className='bg-muted/30 border-border/30 rounded-2xl rounded-tl-sm border p-4 text-sm leading-relaxed whitespace-pre-wrap'>
                                    <ReactMarkdown>{ticket.description || ''}</ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {ticket.messages.length > 0 && (
                            <div className='relative flex items-center py-2'>
                                <div className='border-border/50 grow border-t'></div>
                                <span className='text-muted-foreground mx-4 shrink-0 text-[10px] font-black tracking-widest uppercase opacity-60'>
                                    {t('admin.tickets.view.conversation')}
                                </span>
                                <div className='border-border/50 grow border-t'></div>
                            </div>
                        )}

                        {ticket.messages.map((msg) => {
                            const isStaff = msg.admin_reply;
                            const isInternal = Boolean(msg.is_internal);

                            return (
                                <div
                                    key={msg.id}
                                    className={cn('group flex gap-4', isStaff ? 'flex-row-reverse' : 'flex-row')}
                                >
                                    <Avatar className='ring-border/50 mt-1 h-10 w-10 shrink-0 ring-2'>
                                        <AvatarImage src={msg.user?.avatar} />
                                    </Avatar>

                                    <div
                                        className={cn(
                                            'flex max-w-[92%] flex-col lg:max-w-[84%] 2xl:max-w-[78%]',
                                            isStaff ? 'items-end' : 'items-start',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'mb-1 flex items-center gap-2 px-1',
                                                isStaff ? 'flex-row-reverse' : 'flex-row',
                                            )}
                                        >
                                            <span className='text-foreground text-sm font-bold'>
                                                {msg.user?.username ||
                                                    (isStaff
                                                        ? t('admin.tickets.view.staff')
                                                        : t('admin.tickets.view.user'))}
                                            </span>
                                            {msg.user?.role && (
                                                <RoleBadge
                                                    role={msg.user.role}
                                                    className='h-4 px-1 text-[9px] leading-none font-bold uppercase'
                                                />
                                            )}
                                            <span className='text-muted-foreground ml-1 text-[10px]'>
                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>

                                        <div
                                            className={cn(
                                                'relative w-fit min-w-[140px] px-5 py-3 text-sm shadow-sm',
                                                isInternal
                                                    ? 'rounded-xl border border-dashed border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                                                    : isStaff
                                                      ? 'bg-primary/10 border-primary/20 text-foreground rounded-2xl rounded-tr-sm border'
                                                      : 'bg-muted/30 text-foreground border-border/50 rounded-2xl rounded-tl-sm border',
                                            )}
                                        >
                                            {isInternal && (
                                                <div className='mb-2 flex items-center gap-1.5 border-b border-yellow-500/20 pb-2 text-[10px] font-black tracking-wider uppercase opacity-80'>
                                                    <Lock className='h-3 w-3' />
                                                    {t('admin.tickets.view.internal_note')}
                                                </div>
                                            )}

                                            <div className='prose prose-sm dark:prose-invert max-w-none leading-relaxed wrap-break-word'>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => (
                                                            <p className='mb-1 whitespace-pre-wrap last:mb-0'>
                                                                {children}
                                                            </p>
                                                        ),
                                                        hr: () => (
                                                            <hr
                                                                className={cn(
                                                                    'my-4 border-t',
                                                                    isStaff
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

                                            {Boolean(msg.attachments?.length) && (
                                                <div className='border-border/10 mt-2 flex flex-wrap justify-end gap-2 border-t pt-2'>
                                                    {msg.attachments!.map((att) => (
                                                        <a
                                                            key={att.id}
                                                            href={att.url}
                                                            target='_blank'
                                                            rel='noopener noreferrer'
                                                            className='bg-background/50 border-border/10 hover:border-primary/50 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-sm transition-colors'
                                                        >
                                                            <div className='bg-muted text-muted-foreground rounded p-1'>
                                                                <Paperclip className='h-3 w-3' />
                                                            </div>
                                                            <span className='max-w-[100px] truncate font-medium'>
                                                                {att.file_name}
                                                            </span>
                                                            <span className='text-muted-foreground text-[9px] opacity-70'>
                                                                {formatBytes(att.file_size)}
                                                            </span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>

                    <div className='bg-background/50 border-border/50 border-t p-4 backdrop-blur-sm'>
                        <form onSubmit={handleReply} className='flex flex-col gap-2'>
                            {files.length > 0 && (
                                <div className='bg-muted/30 mb-2 flex flex-wrap gap-2 rounded-lg p-2'>
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
                                    className={cn(
                                        'text-muted-foreground hover:bg-muted h-[50px] w-[50px] shrink-0 rounded-2xl font-normal',
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

                                <div className='bg-accent/20 border-border/10 focus-within:ring-primary/20 focus-within:border-primary/50 flex-1 overflow-hidden rounded-2xl border shadow-sm transition-all focus-within:ring-2'>
                                    <Textarea
                                        value={reply}
                                        onChange={(e) => setReply(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleReply(e);
                                            }
                                        }}
                                        placeholder={t('admin.tickets.view.reply_placeholder')}
                                        className='placeholder:text-muted-foreground/50 max-h-50 min-h-[50px] resize-none border-0 bg-transparent p-3.5 text-base focus-visible:ring-0 md:text-sm'
                                        rows={1}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = 'auto';
                                            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                                        }}
                                    />
                                    <div className='bg-accent/30 border-border/5 flex h-10 items-center justify-between border-t px-2'>
                                        <div className='flex items-center gap-2 px-2'>
                                            <Checkbox
                                                id='internal'
                                                checked={isInternal}
                                                onCheckedChange={(c) => setIsInternal(!!c)}
                                                className='border-muted-foreground/40 h-4 w-4 data-[state=checked]:border-yellow-500 data-[state=checked]:bg-yellow-500'
                                            />
                                            <Label
                                                htmlFor='internal'
                                                className={cn(
                                                    'cursor-pointer text-xs font-bold uppercase transition-colors select-none',
                                                    isInternal ? 'text-yellow-500' : 'text-muted-foreground/60',
                                                )}
                                            >
                                                {t('admin.tickets.view.internal_mode')}
                                            </Label>
                                        </div>
                                        <span className='text-muted-foreground/40 hidden font-mono text-[10px] sm:inline-block'>
                                            {t('admin.tickets.view.markdown_supported')}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    type='submit'
                                    disabled={isSubmitting || (!reply.trim() && files.length === 0)}
                                    className={cn(
                                        'h-10 rounded-xl px-6 font-bold tracking-wide uppercase transition-all',
                                        isInternal
                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                            : 'from-primary to-primary/90 bg-linear-to-r hover:brightness-110',
                                    )}
                                >
                                    {isSubmitting ? (
                                        <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Send className='mr-2 h-4 w-4' />
                                    )}
                                    {isInternal
                                        ? t('admin.tickets.view.send_internal')
                                        : t('admin.tickets.view.send_reply')}
                                </Button>
                            </div>
                            <input
                                type='file'
                                ref={fileInputRef}
                                onChange={(e) => {
                                    if (e.target.files) addFiles(Array.from(e.target.files));
                                }}
                                className='hidden'
                                multiple
                            />
                        </form>
                    </div>
                    <WidgetRenderer widgets={getWidgets('admin-tickets-view', 'after-messages')} />
                </div>

                <div className='hidden h-full overflow-hidden xl:col-span-3 xl:block 2xl:col-span-2'>
                    <TicketSidebar
                        ticket={ticket}
                        userDetails={userDetails}
                        userServers={userServers}
                        userTickets={userTickets}
                        loadingSidebar={loadingSidebar}
                        onOpenMailPreview={(mail) => {
                            setMailPreview(mail);
                            setMailPreviewOpen(true);
                        }}
                        widgets={getWidgets('admin-tickets-view', 'sidebar-top')}
                        WidgetRenderer={WidgetRenderer}
                    />
                </div>
            </div>

            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <SheetHeader>
                    <SheetTitle>{t('admin.tickets.view.edit')}</SheetTitle>
                    <SheetDescription>{t('admin.tickets.view.edit_description')}</SheetDescription>
                </SheetHeader>

                <form onSubmit={handleUpdate} className='mt-6 space-y-6'>
                    <div className='space-y-2'>
                        <Label>{t('admin.tickets.table.title')}</Label>
                        <Input
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('admin.tickets.table.description')}</Label>
                        <Textarea
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            rows={4}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('admin.tickets.table.category')}</Label>
                        <select
                            value={editForm.category_id}
                            onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                            className='border-input ring-offset-background placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id.toString()}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('admin.tickets.table.priority')}</Label>
                        <select
                            value={editForm.priority_id}
                            onChange={(e) => setEditForm({ ...editForm, priority_id: e.target.value })}
                            className='border-input ring-offset-background placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            {priorities.map((p) => (
                                <option key={p.id} value={p.id.toString()}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('admin.tickets.table.status')}</Label>
                        <select
                            value={editForm.status_id}
                            onChange={(e) => setEditForm({ ...editForm, status_id: e.target.value })}
                            className='border-input ring-offset-background placeholder:text-muted-foreground focus:ring-ring h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            {statuses.map((s) => (
                                <option key={s.id} value={s.id.toString()}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='pt-4 pb-2'>
                        <Button type='submit' className='h-12 w-full text-lg font-black tracking-tight uppercase'>
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Sheet>

            <Sheet
                open={mailPreviewOpen}
                onOpenChange={(v) => {
                    setMailPreviewOpen(v);
                    if (!v) setMailPreview(null);
                }}
                className='w-full sm:max-w-xl'
            >
                <div>
                    <SheetHeader>
                        <SheetTitle>{mailPreview?.subject || t('admin.tickets.view.mail_preview_title')}</SheetTitle>
                        <SheetDescription>
                            {mailPreview?.created_at && new Date(mailPreview.created_at).toLocaleString()}
                        </SheetDescription>
                    </SheetHeader>
                    <div className='mt-6 h-[calc(100vh-140px)] overflow-hidden rounded-xl border p-0'>
                        <iframe
                            srcDoc={mailPreview?.body || t('common.no_content')}
                            className='h-full w-full bg-white text-black'
                            title={t('admin.tickets.view.email_body')}
                        />
                    </div>
                </div>
            </Sheet>
        </div>
    );
}
