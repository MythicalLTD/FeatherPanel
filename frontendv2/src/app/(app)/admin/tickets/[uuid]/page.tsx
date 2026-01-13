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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { ArrowLeft, Info, Lock, RefreshCw, Send, Unlock, Paperclip, X, Settings } from 'lucide-react';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
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
    user_uuid: string; // Changed from user_id: number | null
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
    file_name: string; // Changed from name
    file_path: string; // Changed from path
    file_size: number; // Changed from size
    url: string; // Added url
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
    user_uuid: string; // Changed from user_id: number
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
    const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false); // Mobile drawer state
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sidebar data
    const [userServers, setUserServers] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [userTickets, setUserTickets] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [userDetails, setUserDetails] = useState<UserData | null>(null);
    const [loadingSidebar, setLoadingSidebar] = useState(false);

    // Edit Drawer
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

    // Mail Preview
    const [mailPreviewOpen, setMailPreviewOpen] = useState(false);
    const [mailPreview, setMailPreview] = useState<UserMail | null>(null);

    const { getWidgets, fetchWidgets } = usePluginWidgets('admin-tickets-view');

    const fetchTicket = useCallback(async () => {
        try {
            const { data } = await axios.get<{ data: { ticket: Ticket; messages: Message[] } }>(
                `/api/admin/tickets/${uuid}`,
            );
            // The API structure returns ticket and messages separately or nested depending on the endpoint variant
            // Based on Vue code: ticket.value = data.data.ticket; messages.value = data.data.messages;
            const ticketData = { ...data.data.ticket, messages: data.data.messages || [] };

            // Sort messages OLD -> NEW
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
            // Fetch User Details (includes mails)
            const userRes = await axios.get(`/api/admin/users/${userUuid}`);
            if (userRes.data?.data?.user) {
                setUserDetails(userRes.data.data.user);
            }

            // Fetch Servers
            try {
                const serversRes = await axios.get(`/api/admin/users/${userUuid}/servers`);
                setUserServers(serversRes.data.data.servers || []);
            } catch (e) {
                console.error('Error fetching user servers:', e);
            }

            // Fetch Tickets
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
        const maxSize = 50 * 1024 * 1024; // 50MB
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

            // 1. Upload Attachments (if any) first to get URLs
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

            // 2. Send Reply with appended links
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
            <div className='flex items-center justify-center min-h-[400px]'>
                <RefreshCw className='h-8 w-8 animate-spin text-primary' />
            </div>
        );
    }

    if (!ticket) return null;

    if (!ticket) return null;

    return (
        <div className='max-w-[1600px] mx-auto h-[calc(100vh-6rem)] flex flex-col pt-2 pb-6'>
            <WidgetRenderer widgets={getWidgets('admin-tickets-view', 'top-of-page')} />
            {/* Header */}
            <div className='flex items-center justify-between mb-4 shrink-0 px-1'>
                <div className='flex items-center gap-3'>
                    <Link href='/admin/tickets'>
                        <Button variant='ghost' size='icon' className='rounded-full h-9 w-9'>
                            <ArrowLeft className='h-4 w-4' />
                        </Button>
                    </Link>
                    <div>
                        <h1 className='text-xl font-bold tracking-tight line-clamp-1'>{ticket.title}</h1>
                        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                            <span className='font-mono'>#{ticket.id}</span>
                            <span>•</span>
                            <span>{new Date(ticket.created_at).toLocaleString()}</span>
                            <span>•</span>
                            <span className='font-medium text-foreground'>{ticket.category?.name}</span>
                        </div>
                    </div>
                </div>

                <div className='flex items-center gap-2'>
                    {/* Mobile Details Toggle */}
                    <div className='lg:hidden'>
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
                            <SheetHeader className='p-0 border-b border-border/5 pb-4 mb-0'>
                                <SheetTitle>{t('admin.tickets.view.info')}</SheetTitle>
                                <SheetDescription>{t('admin.tickets.view.info')}</SheetDescription>
                            </SheetHeader>
                            <div className='h-[calc(100vh-100px)] overflow-hidden pt-4 safe-padding-bottom'>
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

                    {/* Actions */}
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => setEditOpen(true)}
                            className='h-9 rounded-lg text-xs font-medium'
                        >
                            <Settings className='h-3.5 w-3.5 mr-2' /> {t('admin.tickets.view.edit')}
                        </Button>
                        {ticket.status?.id === 3 ? (
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={handleReopen}
                                className='h-9 rounded-lg text-xs font-medium'
                            >
                                <Unlock className='h-3.5 w-3.5 mr-2' /> {t('admin.tickets.view.reopen')}
                            </Button>
                        ) : (
                            <Button
                                variant='destructive'
                                size='sm'
                                onClick={handleClose}
                                className='h-9 rounded-lg text-xs font-medium'
                            >
                                <Lock className='h-3.5 w-3.5 mr-2' /> {t('admin.tickets.view.close')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-tickets-view', 'after-header')} />

            <div className='flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6'>
                {/* Chat Area (Left) */}
                <div className='lg:col-span-8 flex flex-col bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden h-full'>
                    {/* Messages */}
                    <div className='flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar' ref={scrollRef}>
                        {/* Original Ticket Description as first message */}
                        <div className='flex gap-4 group'>
                            <Avatar className='h-10 w-10 mt-1 ring-2 ring-border/50'>
                                <AvatarImage src={ticket.user.avatar} />
                                <AvatarFallback className='bg-primary/10 text-primary font-bold'>
                                    {ticket.user.username?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className='flex-1 space-y-1 max-w-[85%]'>
                                <div className='flex items-center gap-2'>
                                    <span className='font-bold text-sm'>
                                        {t('admin.tickets.view.original_request')}
                                    </span>
                                    <span className='text-[10px] text-muted-foreground'>
                                        {new Date(ticket.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className='p-4 rounded-2xl rounded-tl-sm bg-muted/30 border border-border/30 text-sm leading-relaxed whitespace-pre-wrap'>
                                    <ReactMarkdown>{ticket.description || ''}</ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        {ticket.messages.length > 0 && (
                            <div className='relative flex items-center py-2'>
                                <div className='grow border-t border-border/50'></div>
                                <span className='shrink-0 mx-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
                                    {t('admin.tickets.view.conversation')}
                                </span>
                                <div className='grow border-t border-border/50'></div>
                            </div>
                        )}

                        {/* Messages List */}
                        {ticket.messages.map((msg) => {
                            const isStaff = msg.admin_reply;
                            const isInternal = Boolean(msg.is_internal);

                            return (
                                <div
                                    key={msg.id}
                                    className={cn('flex gap-4 group', isStaff ? 'flex-row-reverse' : 'flex-row')}
                                >
                                    <Avatar className='h-10 w-10 mt-1 ring-2 ring-border/50 shrink-0'>
                                        <AvatarImage src={msg.user?.avatar} />
                                        <AvatarFallback
                                            className={cn(
                                                'font-bold',
                                                isStaff
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            {msg.user?.username?.charAt(0) || '?'}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div
                                        className={cn(
                                            'flex flex-col max-w-[85%] lg:max-w-[75%]',
                                            isStaff ? 'items-end' : 'items-start',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex items-center gap-2 px-1 mb-1',
                                                isStaff ? 'flex-row-reverse' : 'flex-row',
                                            )}
                                        >
                                            <span className='font-bold text-sm text-foreground'>
                                                {msg.user?.username ||
                                                    (isStaff
                                                        ? t('admin.tickets.view.staff')
                                                        : t('admin.tickets.view.user'))}
                                            </span>
                                            {msg.user?.role && (
                                                <Badge
                                                    variant='secondary'
                                                    className='text-[9px] h-4 px-1 leading-none border-0 font-bold uppercase'
                                                    style={{
                                                        backgroundColor: msg.user.role.color
                                                            ? `${msg.user.role.color}15`
                                                            : undefined,
                                                        color: msg.user.role.color,
                                                    }}
                                                >
                                                    {msg.user.role.name}
                                                </Badge>
                                            )}
                                            <span className='text-[10px] text-muted-foreground ml-1'>
                                                {new Date(msg.created_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>

                                        <div
                                            className={cn(
                                                'relative px-5 py-3 text-sm shadow-sm w-fit min-w-[140px]',
                                                isInternal
                                                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-dashed rounded-xl'
                                                    : isStaff
                                                      ? 'bg-primary/10 border border-primary/20 text-foreground rounded-2xl rounded-tr-sm'
                                                      : 'bg-muted/30 text-foreground rounded-2xl rounded-tl-sm border border-border/50',
                                            )}
                                        >
                                            {isInternal && (
                                                <div className='flex items-center gap-1.5 mb-2 text-[10px] font-black uppercase tracking-wider opacity-80 pb-2 border-b border-yellow-500/20'>
                                                    <Lock className='h-3 w-3' />
                                                    {t('admin.tickets.view.internal_note')}
                                                </div>
                                            )}

                                            <div className='prose prose-sm max-w-none wrap-break-word leading-relaxed dark:prose-invert'>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => (
                                                            <p className='mb-1 last:mb-0 whitespace-pre-wrap'>
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
                                                            <ul className='list-disc pl-4 mb-2 space-y-1'>
                                                                {children}
                                                            </ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className='list-decimal pl-4 mb-2 space-y-1'>
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
                                                <div className='flex flex-wrap justify-end gap-2 mt-2 pt-2 border-t border-border/10'>
                                                    {msg.attachments!.map((att) => (
                                                        <a
                                                            key={att.id}
                                                            href={att.url}
                                                            target='_blank'
                                                            rel='noopener noreferrer'
                                                            className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border/10 text-xs hover:border-primary/50 transition-colors shadow-sm'
                                                        >
                                                            <div className='p-1 rounded bg-muted text-muted-foreground'>
                                                                <Paperclip className='h-3 w-3' />
                                                            </div>
                                                            <span className='truncate max-w-[100px] font-medium'>
                                                                {att.file_name}
                                                            </span>
                                                            <span className='text-[9px] text-muted-foreground opacity-70'>
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

                    {/* Input Area (Sticky Bottom) */}
                    <div className='p-4 bg-background/50 backdrop-blur-sm border-t border-border/50'>
                        <form onSubmit={handleReply} className='flex flex-col gap-2'>
                            {files.length > 0 && (
                                <div className='flex flex-wrap gap-2 mb-2 p-2 bg-muted/30 rounded-lg'>
                                    {files.map((file, idx) => (
                                        <Badge
                                            key={idx}
                                            variant='secondary'
                                            className='pl-2 pr-1 py-1 flex items-center gap-1 bg-background border border-border'
                                        >
                                            <span className='truncate max-w-[150px]'>{file.name}</span>
                                            <button
                                                type='button'
                                                onClick={() => removeFile(idx)}
                                                className='hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 ml-1 transition-colors'
                                            >
                                                <X className='h-3 w-3' />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <div className='flex gap-2 items-end'>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='icon'
                                    className={cn(
                                        'shrink-0 h-[50px] w-[50px] rounded-2xl text-muted-foreground hover:bg-muted font-normal',
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

                                <div className='flex-1 bg-accent/20 border border-border/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all shadow-sm'>
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
                                        className='min-h-[50px] max-h-[200px] border-0 bg-transparent resize-none p-3.5 md:text-sm text-base focus-visible:ring-0 placeholder:text-muted-foreground/50'
                                        rows={1}
                                        onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = 'auto';
                                            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                                        }}
                                    />
                                    <div className='h-10 flex items-center justify-between px-2 bg-accent/30 border-t border-border/5'>
                                        <div className='flex items-center gap-2 px-2'>
                                            <Checkbox
                                                id='internal'
                                                checked={isInternal}
                                                onCheckedChange={(c) => setIsInternal(!!c)}
                                                className='h-4 w-4 border-muted-foreground/40 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500'
                                            />
                                            <Label
                                                htmlFor='internal'
                                                className={cn(
                                                    'text-xs font-bold uppercase transition-colors select-none cursor-pointer',
                                                    isInternal ? 'text-yellow-500' : 'text-muted-foreground/60',
                                                )}
                                            >
                                                {t('admin.tickets.view.internal_mode')}
                                            </Label>
                                        </div>
                                        <span className='text-[10px] text-muted-foreground/40 font-mono hidden sm:inline-block'>
                                            {t('admin.tickets.view.markdown_supported')}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    type='submit'
                                    disabled={isSubmitting || (!reply.trim() && files.length === 0)}
                                    className={cn(
                                        'rounded-xl h-10 px-6 font-bold uppercase tracking-wide transition-all shadow-lg shadow-primary/20',
                                        isInternal
                                            ? 'bg-yellow-500 hover:bg-yellow-600'
                                            : 'bg-linear-to-r from-primary to-primary/90 hover:brightness-110',
                                    )}
                                >
                                    {isSubmitting ? (
                                        <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                    ) : (
                                        <Send className='h-4 w-4 mr-2' />
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

                {/* Desktop Sidebar (Right) */}
                <div className='hidden lg:block lg:col-span-4 h-full overflow-hidden'>
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

            {/* Edit Drawer */}
            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <SheetHeader>
                    <SheetTitle>{t('admin.tickets.view.edit')}</SheetTitle>
                    <SheetDescription>{t('admin.tickets.view.edit_description')}</SheetDescription>
                </SheetHeader>

                <form onSubmit={handleUpdate} className='space-y-6 mt-6'>
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
                            className='w-full h-10 bg-transparent border border-input rounded-md px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
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
                            className='w-full h-10 bg-transparent border border-input rounded-md px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
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
                            className='w-full h-10 bg-transparent border border-input rounded-md px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            {statuses.map((s) => (
                                <option key={s.id} value={s.id.toString()}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className='pt-4 pb-2'>
                        <Button
                            type='submit'
                            className='w-full h-12 text-lg font-black uppercase tracking-tight shadow-xl shadow-primary/20'
                        >
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Sheet>

            {/* Mail Preview Dialog */}
            <Sheet
                open={mailPreviewOpen}
                onOpenChange={(v) => {
                    setMailPreviewOpen(v);
                    if (!v) setMailPreview(null);
                }}
                className='sm:max-w-xl w-full'
            >
                <div>
                    <SheetHeader>
                        <SheetTitle>{mailPreview?.subject || 'Email Preview'}</SheetTitle>
                        <SheetDescription>
                            {mailPreview?.created_at && new Date(mailPreview.created_at).toLocaleString()}
                        </SheetDescription>
                    </SheetHeader>
                    <div className='mt-6 border rounded-xl p-0 overflow-hidden h-[calc(100vh-140px)]'>
                        {/* Using iframe to safely display HTML email content */}
                        <iframe
                            srcDoc={mailPreview?.body || 'No content'}
                            className='w-full h-full bg-white text-black'
                            title='Email Body'
                        />
                    </div>
                </div>
            </Sheet>
        </div>
    );
}
