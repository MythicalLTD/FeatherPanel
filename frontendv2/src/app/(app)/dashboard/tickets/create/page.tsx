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
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Paperclip, X, Upload, ChevronLeft, ChevronsUpDown, Trash2, Server as ServerIcon } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { ServerSelectionModal } from '@/components/dashboard/ServerSelectionModal';
import { toast } from 'sonner';

import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Category {
    id: number;
    name: string;
    icon?: string;
}

interface Priority {
    id: number;
    name: string;
}

interface Server {
    id: number;
    uuid: string;
    uuidShort: string;
    name: string;
}

interface CreateTicketResponse {
    success: boolean;
    data: {
        ticket: {
            uuid: string;
        };
        message_id: number;
    };
    message?: string;
}

interface ServerResponse {
    success: boolean;
    data: {
        servers: Server[];
    };

    items?: Server[];
}

export default function CreateTicketPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [priorities, setPriorities] = useState<Priority[]>([]);
    const [servers, setServers] = useState<Server[]>([]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState<string | number>('');
    const [priorityId, setPriorityId] = useState<string | number>('');
    const [serverId, setServerId] = useState<string | number>('');

    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [serverModalOpen, setServerModalOpen] = useState(false);

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-tickets-create');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [serversLoading, setServersLoading] = useState(false);

    const fetchServers = useCallback(async (query = '') => {
        setServersLoading(true);
        try {
            const params = query ? { search: query } : {};
            const res = await axios.get<ServerResponse>('/api/user/tickets/servers', { params });
            const data = res.data;
            const items =
                data.data?.servers ||
                (data.data as unknown as { items: Server[] })?.items ||
                (data as { items: Server[] })?.items ||
                [];
            setServers(items);
        } catch (error) {
            console.error('Failed to search servers', error);
        } finally {
            setServersLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catsRes, priosRes] = await Promise.all([
                    axios.get('/api/user/tickets/categories').catch(() => ({ data: { data: { categories: [] } } })),
                    axios.get('/api/user/tickets/priorities').catch(() => ({ data: { data: { priorities: [] } } })),
                ]);

                fetchServers();

                const cats = (catsRes.data as { data: { categories: Category[] } })?.data?.categories || [];
                const prios = (priosRes.data as { data: { priorities: Priority[] } })?.data?.priorities || [];

                setCategories(cats);
                setPriorities(prios);
            } catch (error: unknown) {
                console.error('Failed to fetch form data', error);
                toast.error(t('tickets.failedToLoadCategories'));
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [t, fetchServers]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files));
        }
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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !description.trim() || !categoryId || !priorityId) {
            toast.error(t('tickets.fillRequiredFields'));
            return;
        }

        setCreating(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                category_id: Number(categoryId),
                priority_id: Number(priorityId),
                server_id: serverId ? Number(serverId) : undefined,
            };

            const { data } = await axios.put<CreateTicketResponse>('/api/user/tickets', payload);

            if (data.success && data.data.ticket) {
                const ticketUuid = data.data.ticket.uuid;
                const messageId = data.data.message_id;

                if (files.length > 0 && messageId) {
                    for (const file of files) {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('message_id', String(messageId));

                        try {
                            await axios.post(`/api/user/tickets/${ticketUuid}/attachments`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                            });
                        } catch (err: unknown) {
                            console.error('Failed to upload attachment', err);
                        }
                    }
                }

                toast.success(t('tickets.ticketCreated'));
                router.push(`/dashboard/tickets/${ticketUuid}`);
            } else {
                throw new Error(data.message || 'Failed to create ticket');
            }
        } catch (error: unknown) {
            console.error('Failed to create ticket', error);
            const err = error as { response?: { data?: { message?: string } }; message?: string };
            const msg = err?.response?.data?.message || err?.message || t('tickets.failedToCreate');
            toast.error(msg);
        } finally {
            setCreating(false);
        }
    };

    const categoryOptions = [
        { id: '', name: t('tickets.selectCategory') },
        ...categories.map((c) => ({ id: c.id, name: c.name, image: c.icon })),
    ];
    const priorityOptions = [
        { id: '', name: t('tickets.selectPriority') },
        ...priorities.map((p) => ({ id: p.id, name: p.name })),
    ];

    return (
        <div className='mx-auto max-w-4xl pb-12'>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-create', 'top-of-page')} />
            <div className='mb-8 flex items-start gap-4'>
                <Link href='/dashboard/tickets'>
                    <Button
                        variant='ghost'
                        size='icon'
                        className='border-border/50 hover:bg-card hover:text-foreground h-10 w-10 rounded-full border'
                    >
                        <ChevronLeft className='h-5 w-5' />
                    </Button>
                </Link>
                <div>
                    <h1 className='text-foreground mb-2 text-3xl font-bold tracking-tight'>
                        {t('tickets.createTicket')}
                    </h1>
                    <p className='text-muted-foreground text-lg'>{t('tickets.createTicketDescription')}</p>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-create', 'after-header')} />

            <div className='bg-card/50 border-border/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                <form onSubmit={handleSubmit} className='space-y-8 p-8'>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                        <div className='md:col-span-2'>
                            <Input
                                id='title'
                                label={t('tickets.titleLabel')}
                                description={
                                    t('tickets.titleDescription') ||
                                    'Enter a concise summary of the issue you are facing.'
                                }
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('tickets.titlePlaceholder')}
                                required
                                className='h-11'
                            />
                        </div>

                        <div className='space-y-2.5'>
                            <HeadlessSelect
                                label={t('tickets.categoryLabel')}
                                description={
                                    t('tickets.categoryDescription') ||
                                    'Select the category that best describes your issue.'
                                }
                                value={categoryId}
                                onChange={setCategoryId}
                                options={categoryOptions}
                                placeholder={t('tickets.selectCategory')}
                            />
                        </div>

                        <div className='space-y-2.5'>
                            <HeadlessSelect
                                label={t('tickets.priorityLabel')}
                                description={t('tickets.priorityDescription')}
                                value={priorityId}
                                onChange={setPriorityId}
                                options={priorityOptions}
                                placeholder={t('tickets.selectPriority')}
                            />
                        </div>

                        <div className='md:col-span-2'>
                            <Textarea
                                id='description'
                                label={t('tickets.descriptionLabel')}
                                description={
                                    t('tickets.descriptionDetail') ||
                                    'Please provide as much detail as possible so we can assist you better.'
                                }
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('tickets.descriptionPlaceholder')}
                                rows={6}
                                required
                                className='min-h-[120px] resize-y'
                            />
                        </div>

                        <div className='space-y-2.5 md:col-span-2'>
                            <div className='flex items-center justify-between'>
                                <Label className='text-sm font-medium'>{t('tickets.serverLabel')}</Label>
                                <span className='text-muted-foreground text-xs capitalize'>{t('common.optional')}</span>
                            </div>

                            <div className='flex gap-2'>
                                <Button
                                    type='button'
                                    variant='outline'
                                    className='border-border/50 hover:bg-card hover:border-primary/50 h-auto flex-1 justify-between rounded-xl px-4 py-3 text-left font-normal'
                                    onClick={() => setServerModalOpen(true)}
                                >
                                    <div className='flex min-w-0 items-center gap-3'>
                                        <div className='bg-muted/50 rounded p-1'>
                                            <ServerIcon className='text-muted-foreground h-4 w-4' />
                                        </div>
                                        <span
                                            className={
                                                serverId ? 'text-foreground font-medium' : 'text-muted-foreground'
                                            }
                                        >
                                            {serverId
                                                ? servers.find((s) => s.id === Number(serverId))?.name ||
                                                  t('tickets.selectServer')
                                                : t('tickets.selectServer')}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className='text-muted-foreground ml-2 h-4 w-4 shrink-0 opacity-50' />
                                </Button>

                                {serverId && (
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon'
                                        className='border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 h-auto w-12 rounded-xl border'
                                        onClick={() => setServerId('')}
                                        title={t('tickets.clearServerSelection')}
                                    >
                                        <Trash2 className='h-5 w-5' />
                                    </Button>
                                )}
                            </div>

                            <p className='text-muted-foreground text-xs'>{t('tickets.serverHint')}</p>
                        </div>

                        <div className='space-y-4 md:col-span-2'>
                            <Label className='text-sm font-medium'>{t('tickets.attachmentsOptional')}</Label>
                            <div
                                className={`group cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50 hover:bg-muted/50'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type='file'
                                    ref={fileInputRef}
                                    className='hidden'
                                    multiple
                                    onChange={handleFileSelect}
                                />
                                <div className='flex flex-col items-center gap-3'>
                                    <div
                                        className={`rounded-full p-3 transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}
                                    >
                                        <Upload className='h-6 w-6' />
                                    </div>
                                    <div className='space-y-1'>
                                        <p className='text-foreground text-sm font-medium'>
                                            <span className='text-primary hover:underline'>
                                                {t('tickets.clickToUpload')}
                                            </span>{' '}
                                            {t('tickets.orDragAndDrop')}
                                        </p>
                                        <p className='text-muted-foreground text-xs'>{t('tickets.maxFileSize')}</p>
                                    </div>
                                </div>
                            </div>

                            {files.length > 0 && (
                                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                    {files.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className='border-border/50 bg-muted/30 hover:bg-muted/50 group flex items-center justify-between rounded-lg border p-3 transition-colors'
                                        >
                                            <div className='flex min-w-0 items-center gap-3'>
                                                <Paperclip className='text-muted-foreground h-4 w-4 shrink-0' />
                                                <div className='min-w-0'>
                                                    <p className='text-foreground truncate text-sm font-medium'>
                                                        {file.name}
                                                    </p>
                                                    <p className='text-muted-foreground text-xs'>
                                                        {formatFileSize(file.size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type='button'
                                                variant='ghost'
                                                size='icon'
                                                className='text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100'
                                                onClick={() => removeFile(idx)}
                                            >
                                                <X className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className='flex justify-end gap-3 pt-4'>
                        <Link href='/dashboard/tickets'>
                            <Button type='button' variant='outline' size='lg' className='border-border/50'>
                                {t('common.cancel')}
                            </Button>
                        </Link>
                        <Button type='submit' size='lg' className='px-8' loading={creating} disabled={isLoading}>
                            {creating ? t('tickets.creating') : t('tickets.createTicketButton')}
                        </Button>
                    </div>
                </form>
            </div>

            <ServerSelectionModal
                isOpen={serverModalOpen}
                onClose={() => setServerModalOpen(false)}
                servers={servers}
                selectedServerId={serverId}
                onSelect={(server) => setServerId(server.id)}
                loading={serversLoading}
                onSearch={fetchServers}
            />
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-create', 'bottom-of-page')} />
        </div>
    );
}
