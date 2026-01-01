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

'use client';

import { useState, useEffect } from 'react';
import axios, { isAxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    Bell,
    Plus,
    Eye,
    Pencil,
    Trash2,
    Search,
    RefreshCw,
    Info,
    CheckCircle,
    AlertTriangle,
    XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Notification {
    id: number;
    title: string;
    message_markdown: string;
    type: 'info' | 'warning' | 'danger' | 'success' | 'error';
    is_dismissible: boolean;
    is_sticky: boolean;
    created_at: string;
    updated_at: string | null;
    dismissed_at: string | null;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export default function NotificationsPage() {
    const { t } = useTranslation();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination state
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Drawer states
    const [viewOpen, setViewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);

    // Selected items
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [editingNotification, setEditingNotification] = useState<Notification | null>(null);

    // Form states
    const [newNotification, setNewNotification] = useState({
        title: '',
        message_markdown: '',
        type: 'info' as Notification['type'],
        is_dismissible: true,
        is_sticky: false,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((prev) => ({ ...prev, page: 1 }));
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedSearchQuery, searchQuery]);

    // Fetch notifications
    useEffect(() => {
        const controller = new AbortController();
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/notifications', {
                    params: {
                        page: pagination.page,
                        limit: pagination.pageSize,
                        search: debouncedSearchQuery || undefined,
                    },
                    signal: controller.signal,
                });

                setNotifications(data.data.notifications || []);
                const apiPagination = data.data.pagination;
                setPagination((prev) => ({
                    ...prev,
                    page: apiPagination.current_page,
                    pageSize: apiPagination.per_page,
                    total: apiPagination.total_records,
                    totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                }));
            } catch (error) {
                if (!axios.isCancel(error)) {
                    console.error('Error fetching notifications:', error);
                    toast.error(t('admin.notifications.messages.fetch_failed'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchNotifications();

        return () => {
            controller.abort();
        };
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, refreshKey, t]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/notifications', newNotification);
            toast.success(t('admin.notifications.messages.created'));
            setCreateOpen(false);
            resetNewNotification();
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error creating notification:', error);
            let errorMessage = t('admin.notifications.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.error_message) {
                errorMessage = error.response.data.error_message;
            }
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingNotification) return;

        setIsSubmitting(true);
        try {
            const payload = {
                title: editingNotification.title,
                message_markdown: editingNotification.message_markdown,
                type: editingNotification.type,
                is_dismissible: editingNotification.is_dismissible,
                is_sticky: editingNotification.is_sticky,
            };

            await axios.patch(`/api/admin/notifications/${editingNotification.id}`, payload);
            toast.success(t('admin.notifications.messages.updated'));
            setEditOpen(false);
            setEditingNotification(null);
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error updating notification:', error);
            let errorMessage = t('admin.notifications.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.error_message) {
                errorMessage = error.response.data.error_message;
            }
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.notifications.messages.delete_confirm'))) return;

        setIsSubmitting(true);
        try {
            await axios.delete(`/api/admin/notifications/${id}`);
            toast.success(t('admin.notifications.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error deleting notification:', error);
            let errorMessage = t('admin.notifications.messages.delete_failed');
            if (isAxiosError(error) && error.response?.data?.error_message) {
                errorMessage = error.response.data.error_message;
            }
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetNewNotification = () => {
        setNewNotification({
            title: '',
            message_markdown: '',
            type: 'info',
            is_dismissible: true,
            is_sticky: false,
        });
    };

    const openEdit = (notification: Notification) => {
        setEditingNotification({ ...notification });
        setEditOpen(true);
    };

    const openView = (notification: Notification) => {
        setSelectedNotification(notification);
        setViewOpen(true);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'info':
                return Info;
            case 'warning':
                return AlertTriangle;
            case 'danger':
                return XCircle;
            case 'error':
                return XCircle;
            case 'success':
                return CheckCircle;
            default:
                return Bell;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'info':
                return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'warning':
                return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'danger':
                return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'error':
                return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'success':
                return 'text-green-500 bg-green-500/10 border-green-500/20';
            default:
                return 'text-muted-foreground bg-secondary';
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.notifications.title')}
                description={t('admin.notifications.subtitle')}
                icon={Bell}
                actions={
                    <Button
                        onClick={() => {
                            resetNewNotification();
                            setCreateOpen(true);
                        }}
                    >
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.notifications.create')}
                    </Button>
                }
            />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.notifications.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={3} />
            ) : notifications.length === 0 ? (
                <EmptyState
                    icon={Bell}
                    title={t('admin.notifications.no_results')}
                    description={t('admin.notifications.search_placeholder')}
                    action={
                        <Button
                            onClick={() => {
                                resetNewNotification();
                                setCreateOpen(true);
                            }}
                        >
                            {t('admin.notifications.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {notifications.map((notification) => {
                        const Icon = getTypeIcon(notification.type);
                        const badges: ResourceBadge[] = [];

                        // Type Badge
                        badges.push({
                            label: t(`admin.notifications.types.${notification.type}`),
                            className: getTypeColor(notification.type),
                        });

                        if (notification.is_sticky) {
                            badges.push({
                                label: t('admin.notifications.sticky'),
                                className: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                            });
                        }
                        if (!notification.is_dismissible) {
                            badges.push({
                                label: t('admin.notifications.non_dismissible'),
                                className: 'bg-secondary text-secondary-foreground',
                            });
                        }

                        return (
                            <ResourceCard
                                key={notification.id}
                                icon={Icon}
                                title={notification.title}
                                subtitle={new Date(notification.created_at).toLocaleString()}
                                badges={badges}
                                description={
                                    <div className='line-clamp-2 text-sm text-muted-foreground mt-1'>
                                        <ReactMarkdown allowedElements={['p', 'strong', 'em', 'code']}>
                                            {notification.message_markdown}
                                        </ReactMarkdown>
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button size='sm' variant='ghost' onClick={() => openView(notification)}>
                                            <Eye className='h-4 w-4' />
                                        </Button>
                                        <Button size='sm' variant='ghost' onClick={() => openEdit(notification)}>
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(notification.id)}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <RefreshCw className='h-4 w-4 animate-spin' />
                                            ) : (
                                                <Trash2 className='h-4 w-4' />
                                            )}
                                        </Button>
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div className='flex justify-center gap-2 mt-4'>
                    <Button
                        variant='outline'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    >
                        Previous
                    </Button>
                    <span className='flex items-center text-sm text-muted-foreground'>
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Create Sheet */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.notifications.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.notifications.form.create_description')}</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleCreate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='create-title'>{t('admin.notifications.form.title')}</Label>
                            <Input
                                id='create-title'
                                value={newNotification.title}
                                onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                                required
                                placeholder={t('admin.notifications.form.title')}
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-type'>{t('admin.notifications.form.type')}</Label>
                            <select
                                id='create-type'
                                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                                value={newNotification.type}
                                onChange={(e) =>
                                    setNewNotification({
                                        ...newNotification,
                                        type: e.target.value as Notification['type'],
                                    })
                                }
                            >
                                <option value='info'>{t('admin.notifications.types.info')}</option>
                                <option value='warning'>{t('admin.notifications.types.warning')}</option>
                                <option value='danger'>{t('admin.notifications.types.danger')}</option>
                                <option value='success'>{t('admin.notifications.types.success')}</option>
                            </select>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-message'>{t('admin.notifications.form.message')}</Label>
                            <Textarea
                                id='create-message'
                                value={newNotification.message_markdown}
                                onChange={(e) =>
                                    setNewNotification({ ...newNotification, message_markdown: e.target.value })
                                }
                                required
                                placeholder={t('admin.notifications.form.message')}
                                rows={6}
                            />
                        </div>

                        <div className='flex items-center space-x-2'>
                            <Checkbox
                                id='create-dismissible'
                                checked={newNotification.is_dismissible}
                                onCheckedChange={(checked) =>
                                    setNewNotification({ ...newNotification, is_dismissible: checked as boolean })
                                }
                            />
                            <Label htmlFor='create-dismissible'>{t('admin.notifications.form.dismissible')}</Label>
                        </div>

                        <div className='flex items-center space-x-2'>
                            <Checkbox
                                id='create-sticky'
                                checked={newNotification.is_sticky}
                                onCheckedChange={(checked) =>
                                    setNewNotification({ ...newNotification, is_sticky: checked as boolean })
                                }
                            />
                            <Label htmlFor='create-sticky'>{t('admin.notifications.form.sticky')}</Label>
                        </div>

                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('admin.notifications.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            {/* Edit Sheet */}
            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.notifications.form.edit_title')}</SheetTitle>
                        <SheetDescription>{t('admin.notifications.form.edit_description')}</SheetDescription>
                    </SheetHeader>

                    {editingNotification && (
                        <form onSubmit={handleUpdate} className='space-y-4'>
                            <div className='space-y-2'>
                                <Label htmlFor='edit-title'>{t('admin.notifications.form.title')}</Label>
                                <Input
                                    id='edit-title'
                                    value={editingNotification.title}
                                    onChange={(e) =>
                                        setEditingNotification({ ...editingNotification, title: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='edit-type'>{t('admin.notifications.form.type')}</Label>
                                <select
                                    id='edit-type'
                                    className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                                    value={editingNotification.type}
                                    onChange={(e) =>
                                        setEditingNotification({
                                            ...editingNotification,
                                            type: e.target.value as Notification['type'],
                                        })
                                    }
                                >
                                    <option value='info'>{t('admin.notifications.types.info')}</option>
                                    <option value='warning'>{t('admin.notifications.types.warning')}</option>
                                    <option value='danger'>{t('admin.notifications.types.danger')}</option>
                                    <option value='success'>{t('admin.notifications.types.success')}</option>
                                </select>
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='edit-message'>{t('admin.notifications.form.message')}</Label>
                                <Textarea
                                    id='edit-message'
                                    value={editingNotification.message_markdown}
                                    onChange={(e) =>
                                        setEditingNotification({
                                            ...editingNotification,
                                            message_markdown: e.target.value,
                                        })
                                    }
                                    required
                                    rows={6}
                                />
                            </div>

                            <div className='flex items-center space-x-2'>
                                <Checkbox
                                    id='edit-dismissible'
                                    checked={editingNotification.is_dismissible}
                                    onCheckedChange={(checked) =>
                                        setEditingNotification({
                                            ...editingNotification,
                                            is_dismissible: checked as boolean,
                                        })
                                    }
                                />
                                <Label htmlFor='edit-dismissible'>{t('admin.notifications.form.dismissible')}</Label>
                            </div>

                            <div className='flex items-center space-x-2'>
                                <Checkbox
                                    id='edit-sticky'
                                    checked={editingNotification.is_sticky}
                                    onCheckedChange={(checked) =>
                                        setEditingNotification({
                                            ...editingNotification,
                                            is_sticky: checked as boolean,
                                        })
                                    }
                                />
                                <Label htmlFor='edit-sticky'>{t('admin.notifications.form.sticky')}</Label>
                            </div>

                            <SheetFooter>
                                <Button type='submit' loading={isSubmitting}>
                                    {t('admin.notifications.form.submit_update')}
                                </Button>
                            </SheetFooter>
                        </form>
                    )}
                </div>
            </Sheet>

            {/* View Sheet */}
            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.notifications.form.view_title')}</SheetTitle>
                    </SheetHeader>

                    {selectedNotification && (
                        <div className='space-y-6'>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs uppercase tracking-wider'>
                                    {t('admin.notifications.form.title')}
                                </Label>
                                <div className='font-medium text-lg'>{selectedNotification.title}</div>
                            </div>

                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-muted-foreground text-xs uppercase tracking-wider'>
                                        {t('admin.notifications.type')}
                                    </Label>
                                    <div>
                                        <Badge className={getTypeColor(selectedNotification.type)}>
                                            {t(`admin.notifications.types.${selectedNotification.type}`).toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-muted-foreground text-xs uppercase tracking-wider'>
                                        {t('admin.notifications.created_at')}
                                    </Label>
                                    <div className='text-sm'>
                                        {new Date(selectedNotification.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs uppercase tracking-wider'>
                                    {t('admin.notifications.message')}
                                </Label>
                                <div className='bg-muted p-4 rounded-lg text-sm border prose prose-sm dark:prose-invert max-w-none'>
                                    <ReactMarkdown>{selectedNotification.message_markdown}</ReactMarkdown>
                                </div>
                            </div>

                            <div className='flex gap-2'>
                                <Badge variant={selectedNotification.is_dismissible ? 'outline' : 'secondary'}>
                                    {selectedNotification.is_dismissible
                                        ? t('admin.notifications.dismissible')
                                        : t('admin.notifications.non_dismissible')}
                                </Badge>
                                <Badge variant={selectedNotification.is_sticky ? 'default' : 'secondary'}>
                                    {selectedNotification.is_sticky
                                        ? t('admin.notifications.sticky')
                                        : t('admin.notifications.not_sticky')}
                                </Badge>
                            </div>
                        </div>
                    )}
                </div>
            </Sheet>
        </div>
    );
}
