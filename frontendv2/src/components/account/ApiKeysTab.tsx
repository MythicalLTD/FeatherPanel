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

import { PageHeader } from '@/components/featherui/PageHeader';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { TipCard, TipGrid } from '@/components/featherui/TipCard';
import { DataTable, RowActionsMenu, StatusDot, TableIdentity } from '@/components/featherui/DataTable';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { copyToClipboard, isEnabledUnlessExplicitlyFalse } from '@/lib/utils';
import Permissions from '@/lib/permissions';
import { Key, Plus, Trash2, Eye, Pencil, RefreshCw, Copy, Info, BookOpen, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Sensitive } from '@/components/common/Sensitive';

interface ApiClient {
    id: number;
    user_uuid: string;
    name: string;
    public_key?: string;
    private_key?: string;
    allowed_ips?: string | null;
    notify_foreign_ip?: string;
    created_at: string;
    updated_at: string;
}

interface ApiKeysTabProps {
    slug?: string;
}

function ApiKeyStatus({ client }: { client: { allowed_ips?: unknown } }) {
    const { t } = useTranslation();
    const locked = client.allowed_ips != null && String(client.allowed_ips).trim() !== '';
    return (
        <div className='flex flex-wrap items-center gap-2'>
            <StatusDot tone='success'>{t('account.apiKeys.statuses.active')}</StatusDot>
            {locked ? (
                <span className='rounded-md border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400'>
                    {t('account.apiKeys.badges.ipLocked')}
                </span>
            ) : null}
        </div>
    );
}

export default function ApiKeysTab({ slug = 'account-api-keys' }: ApiKeysTabProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets(slug);
    const { hasPermission } = useSession();
    const { settings } = useSettings();
    const [clients, setClients] = useState<ApiClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [viewModal, setViewModal] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [regenerateModal, setRegenerateModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<ApiClient | null>(null);
    const [clientName, setClientName] = useState('');
    const [allowedIpsText, setAllowedIpsText] = useState('');
    const [notifyForeignIp, setNotifyForeignIp] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Settings arrive as 'true' / 'false' strings, so a plain truthy check never hid the button.
    // Creation is on unless disabled panel-wide; roles with user.api_keys.create can still create keys.
    const canCreateApiKeys =
        isEnabledUnlessExplicitlyFalse(settings?.user_allow_api_keys_create) ||
        hasPermission(Permissions.USER_API_KEYS_CREATE);

    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/user/api-clients');
            if (data.success) {
                setClients(data.data.api_clients || []);
            }
        } catch (error) {
            console.error('Error fetching API clients:', error);
            toast.error(t('account.apiKeys.loadClientsFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchClients();
        fetchWidgets();
    }, [fetchWidgets, fetchClients]);

    const filteredClients = clients.filter(
        (client) =>
            client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.public_key?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleCreateClient = async () => {
        try {
            const { data } = await axios.post('/api/user/api-clients', {
                name: clientName,
                ...(allowedIpsText.trim() !== '' ? { allowed_ips: allowedIpsText } : {}),
                notify_foreign_ip: notifyForeignIp && allowedIpsText.trim() !== '',
            });
            if (data.success) {
                toast.success(t('account.apiKeys.keyCreated'));
                setIsOpen(false);
                setClientName('');
                setAllowedIpsText('');
                setNotifyForeignIp(false);

                setSelectedClient(data.data);
                setViewModal(true);
                await fetchClients();
            }
        } catch (error) {
            console.error('Error creating API client:', error);
            toast.error(t('account.apiKeys.createFailed'));
        }
    };

    const handleEditClient = async () => {
        if (!selectedClient) return;
        try {
            const { data } = await axios.put(`/api/user/api-clients/${selectedClient.id}`, {
                name: clientName,
                allowed_ips: allowedIpsText.trim() === '' ? null : allowedIpsText,
                notify_foreign_ip: notifyForeignIp && allowedIpsText.trim() !== '',
            });
            if (data.success) {
                toast.success(t('account.apiKeys.keyUpdated'));
                setEditModal(false);
                setSelectedClient(null);
                setClientName('');
                setAllowedIpsText('');
                setNotifyForeignIp(false);
                await fetchClients();
            }
        } catch (error) {
            console.error('Error updating API client:', error);
            toast.error(t('account.apiKeys.updateClientFailed'));
        }
    };

    const viewClient = async (client: ApiClient) => {
        try {
            const { data } = await axios.get(`/api/user/api-clients/${client.id}`);
            if (data.success) {
                setSelectedClient(data.data);
                setViewModal(true);
            }
        } catch (error) {
            console.error('Error loading API client:', error);
            toast.error(t('account.apiKeys.loadClientFailed'));
        }
    };

    const editClient = async (client: ApiClient) => {
        try {
            const { data } = await axios.get(`/api/user/api-clients/${client.id}`);
            if (data.success) {
                setSelectedClient(data.data);
                setClientName(data.data.name);
                setAllowedIpsText(data.data.allowed_ips ?? '');
                setNotifyForeignIp(data.data.notify_foreign_ip === 'true');
                setEditModal(true);
            }
        } catch (error) {
            console.error('Error loading API client:', error);
            toast.error(t('account.apiKeys.loadClientFailed'));
        }
    };

    const deleteClient = async () => {
        if (!selectedClient) return;
        try {
            const { data } = await axios.delete(`/api/user/api-clients/${selectedClient.id}`);
            if (data.success) {
                toast.success(t('account.apiKeys.keyDeleted'));
                setDeleteModal(false);
                setSelectedClient(null);
                await fetchClients();
            }
        } catch (error) {
            console.error('Error deleting API client:', error);
            toast.error(t('account.apiKeys.deleteFailed'));
        }
    };

    const regenerateKeys = async () => {
        if (!selectedClient) return;
        try {
            const { data } = await axios.post(`/api/user/api-clients/${selectedClient.id}/regenerate`);
            if (data.success) {
                toast.success(t('account.apiKeys.keysRegenerated'));
                setRegenerateModal(false);

                setSelectedClient(data.data);
                setViewModal(true);
                await fetchClients();
            }
        } catch (error) {
            console.error('Error regenerating API keys:', error);
            toast.error(t('account.apiKeys.regenerateFailed'));
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                    <span className='text-muted-foreground'>{t('account.apiKeys.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-5'>
            <WidgetRenderer widgets={getWidgets(slug, 'top-of-page')} />
            <PageHeader
                title={t('account.apiKeys.title')}
                description={t('account.apiKeys.description')}
                icon={Key}
                actions={
                    <>
                        <Button
                            onClick={() => window.open('/icanhasfeatherpanel/api/index.html', '_blank')}
                            variant='outline'
                            size='sm'
                        >
                            <BookOpen className='mr-2 h-4 w-4' />
                            {t('account.apiKeys.apiDocs')}
                        </Button>
                        <Button onClick={fetchClients} variant='outline' size='sm'>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            {t('account.apiKeys.refresh')}
                        </Button>
                        {canCreateApiKeys && (
                            <Button
                                onClick={() => router.push('/dashboard/account/oauth2/api/new')}
                                variant='outline'
                                size='sm'
                            >
                                <ShieldCheck className='mr-2 h-4 w-4' />
                                {t('account.apiKeys.oauth2.consentButton')}
                            </Button>
                        )}
                        {canCreateApiKeys && (
                            <Button
                                onClick={() => {
                                    setClientName('');
                                    setAllowedIpsText('');
                                    setNotifyForeignIp(false);
                                    setIsOpen(true);
                                }}
                                size='sm'
                            >
                                <Plus className='mr-2 h-4 w-4' />
                                {t('account.apiKeys.addKey')}
                            </Button>
                        )}
                    </>
                }
            />

            <WidgetRenderer widgets={getWidgets(slug, 'after-header')} />

            <div className='fp-surface flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center'>
                <div className='relative min-w-0 flex-1'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        type='text'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('account.apiKeys.searchPlaceholder')}
                        className='pl-9'
                    />
                </div>
                <span className='text-muted-foreground shrink-0 px-1 text-sm'>
                    {t('account.apiKeys.totalKeys', { count: String(filteredClients.length) })}
                </span>
            </div>

            {filteredClients.length === 0 ? (
                <ListEmptyState
                    icon={Key}
                    title={t('account.apiKeys.noKeys')}
                    description={t('account.apiKeys.createFirst')}
                    filtered={Boolean(searchQuery.trim())}
                    onClearFilters={() => setSearchQuery('')}
                    action={
                        canCreateApiKeys ? (
                            <Button
                                onClick={() => {
                                    setClientName('');
                                    setAllowedIpsText('');
                                    setNotifyForeignIp(false);
                                    setIsOpen(true);
                                }}
                            >
                                <Plus className='mr-2 h-4 w-4' />
                                {t('account.apiKeys.addKey')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <DataTable
                    rows={filteredClients}
                    rowKey={(client) => client.id}
                    onRowClick={(client) => viewClient(client)}
                    columns={[
                        {
                            key: 'name',
                            header: t('account.apiKeys.clientName'),
                            className: 'w-[34%]',
                            cell: (client) => (
                                <TableIdentity
                                    title={client.name}
                                    subtitle={
                                        <span className='font-mono'>
                                            {client.public_key ? client.public_key.substring(0, 20) + '...' : ''}
                                        </span>
                                    }
                                    icon={Key}
                                />
                            ),
                        },
                        {
                            key: 'status',
                            header: t('account.apiKeys.table.status'),
                            cell: (client) => <ApiKeyStatus client={client} />,
                        },
                        {
                            key: 'created',
                            header: t('account.apiKeys.createdAt'),
                            className: 'text-muted-foreground text-xs whitespace-nowrap',
                            cell: (client) => new Date(client.created_at).toLocaleDateString(),
                        },
                    ]}
                    mobileCard={(client) => (
                        <div className='space-y-2.5'>
                            <TableIdentity
                                title={client.name}
                                subtitle={
                                    <span className='font-mono'>
                                        {client.public_key ? client.public_key.substring(0, 20) + '...' : ''}
                                    </span>
                                }
                                icon={Key}
                            />
                            <div className='flex flex-wrap items-center gap-3'>
                                <ApiKeyStatus client={client} />
                                <span className='text-muted-foreground text-xs'>
                                    {t('account.apiKeys.createdAt')}: {new Date(client.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    )}
                    actions={(client) => (
                        <RowActionsMenu
                            items={[
                                {
                                    label: t('account.apiKeys.viewDetails'),
                                    icon: Eye,
                                    onClick: () => viewClient(client),
                                },
                                { label: t('account.apiKeys.edit'), icon: Pencil, onClick: () => editClient(client) },
                                {
                                    label: t('account.apiKeys.regenerateKeys'),
                                    icon: RefreshCw,
                                    onClick: () => {
                                        setSelectedClient(client);
                                        setRegenerateModal(true);
                                    },
                                },
                                {
                                    label: t('account.apiKeys.delete'),
                                    icon: Trash2,
                                    destructive: true,
                                    separated: true,
                                    onClick: () => {
                                        setSelectedClient(client);
                                        setDeleteModal(true);
                                    },
                                },
                            ]}
                        />
                    )}
                />
            )}

            <TipGrid className='md:grid-cols-2 xl:grid-cols-2'>
                <TipCard icon={Info} title={t('account.apiKeys.tips.keys_title')}>
                    <p>{t('account.apiKeys.importantInfo.persistent')}</p>
                    <p>{t('account.apiKeys.importantInfo.accessScope')}</p>
                </TipCard>
                <TipCard icon={ShieldCheck} title={t('account.apiKeys.tips.security_title')}>
                    <p>{t('account.apiKeys.importantInfo.security')}</p>
                    <p>{t('account.apiKeys.importantInfo.ipRestriction')}</p>
                </TipCard>
            </TipGrid>

            <Dialog
                open={isOpen || editModal}
                onClose={() => {
                    setIsOpen(false);
                    setEditModal(false);
                    setClientName('');
                    setAllowedIpsText('');
                    setNotifyForeignIp(false);
                }}
                className='max-w-2xl'
            >
                <DialogHeader>
                    <DialogTitle>{editModal ? t('account.apiKeys.editKey') : t('account.apiKeys.addKey')}</DialogTitle>
                    <DialogDescription>{t('account.apiKeys.modalDescription')}</DialogDescription>
                </DialogHeader>

                <div>
                    <Label htmlFor='api-keys-modal-client-name' className='text-foreground'>
                        {t('account.apiKeys.clientName')}
                    </Label>
                    <Input
                        id='api-keys-modal-client-name'
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder={t('account.apiKeys.clientNamePlaceholder')}
                        className='mt-2'
                    />
                </div>

                <div className='mt-4'>
                    <Label htmlFor='api-keys-modal-allowed-ips' className='text-foreground'>
                        {t('account.apiKeys.allowedIpsLabel')}
                    </Label>
                    <p className='text-muted-foreground mt-1 mb-2 text-xs'>{t('account.apiKeys.allowedIpsHelp')}</p>
                    <Textarea
                        id='api-keys-modal-allowed-ips'
                        value={allowedIpsText}
                        onChange={(e) => {
                            const v = e.target.value;
                            setAllowedIpsText(v);
                            if (v.trim() === '') {
                                setNotifyForeignIp(false);
                            }
                        }}
                        placeholder={t('account.apiKeys.allowedIpsPlaceholder')}
                        rows={5}
                        className='mt-2 min-h-25 font-mono text-sm font-normal'
                    />
                </div>

                <div className='mt-4 flex items-start gap-3'>
                    <Checkbox
                        checked={notifyForeignIp}
                        disabled={allowedIpsText.trim() === ''}
                        onCheckedChange={(checked) => setNotifyForeignIp(checked === true)}
                    />
                    <div className='min-w-0 flex-1'>
                        <Label className='text-foreground cursor-pointer text-sm font-medium'>
                            {t('account.apiKeys.notifyForeignIp')}
                        </Label>
                        <p className='text-muted-foreground mt-1 text-xs'>{t('account.apiKeys.notifyForeignIpHelp')}</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        onClick={editModal ? handleEditClient : handleCreateClient}
                        className='flex-1'
                        data-fp-save-shortcut
                    >
                        {editModal ? t('account.apiKeys.updateKey') : t('account.apiKeys.addKey')}
                    </Button>
                    <Button
                        onClick={() => {
                            setIsOpen(false);
                            setEditModal(false);
                            setClientName('');
                            setAllowedIpsText('');
                            setNotifyForeignIp(false);
                        }}
                        variant='outline'
                        className='flex-1'
                    >
                        {t('common.cancel')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <Dialog open={viewModal} onClose={() => setViewModal(false)} className='max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>{selectedClient?.name}</DialogTitle>
                </DialogHeader>
                {selectedClient && (
                    <div className='space-y-4'>
                        {selectedClient.allowed_ips != null && String(selectedClient.allowed_ips).trim() !== '' && (
                            <div>
                                <span className='text-muted-foreground text-sm font-medium'>
                                    {t('account.apiKeys.allowedIpsLabel')}:
                                </span>
                                <pre className='bg-muted custom-scrollbar mt-2 max-h-40 overflow-auto rounded-md p-3 font-mono text-xs break-all whitespace-pre-wrap'>
                                    {selectedClient.allowed_ips}
                                </pre>
                                {selectedClient.notify_foreign_ip === 'true' && (
                                    <p className='text-muted-foreground mt-2 text-xs'>
                                        {t('account.apiKeys.notifyEnabledHint')}
                                    </p>
                                )}
                            </div>
                        )}
                        <div>
                            <span className='text-muted-foreground text-sm font-medium'>
                                {t('account.apiKeys.publicKey')}:
                            </span>
                            <div className='bg-muted mt-2 rounded-md p-3'>
                                <pre className='font-mono text-xs break-all whitespace-pre-wrap'>
                                    <Sensitive>{selectedClient.public_key}</Sensitive>
                                </pre>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='mt-2'
                                    onClick={() => copyToClipboard(selectedClient.public_key || '')}
                                >
                                    <Copy className='mr-1 h-4 w-4' />
                                    {t('account.apiKeys.copyKey')}
                                </Button>
                            </div>
                        </div>
                        {selectedClient.private_key && (
                            <div>
                                <span className='text-muted-foreground text-sm font-medium'>
                                    {t('account.apiKeys.privateKey')}:
                                </span>
                                <div className='bg-muted mt-2 rounded-md p-3'>
                                    <pre className='custom-scrollbar max-h-64 overflow-auto font-mono text-xs break-all whitespace-pre-wrap'>
                                        <Sensitive>{selectedClient.private_key}</Sensitive>
                                    </pre>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        className='mt-2'
                                        onClick={() => copyToClipboard(selectedClient.private_key || '')}
                                    >
                                        <Copy className='mr-1 h-4 w-4' />
                                        {t('account.apiKeys.copyKey')}
                                    </Button>
                                    <p className='mt-2 text-xs text-yellow-600'>
                                        {t('account.apiKeys.privateKeyWarning')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>

            <Dialog open={deleteModal} onClose={() => setDeleteModal(false)}>
                <DialogHeader>
                    <DialogTitle>{t('account.apiKeys.confirmDelete')}</DialogTitle>
                    <DialogDescription>{t('account.apiKeys.deleteWarning')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={deleteClient} variant='destructive' className='flex-1'>
                        {t('account.apiKeys.confirmDelete')}
                    </Button>
                    <Button onClick={() => setDeleteModal(false)} variant='outline' className='flex-1'>
                        {t('common.cancel')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <Dialog open={regenerateModal} onClose={() => setRegenerateModal(false)}>
                <DialogHeader>
                    <DialogTitle>{t('account.apiKeys.confirmRegenerate')}</DialogTitle>
                    <DialogDescription>{t('account.apiKeys.regenerateWarning')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={regenerateKeys} className='flex-1'>
                        {t('account.apiKeys.confirmRegenerate')}
                    </Button>
                    <Button onClick={() => setRegenerateModal(false)} variant='outline' className='flex-1'>
                        {t('common.cancel')}
                    </Button>
                </DialogFooter>
            </Dialog>
            <WidgetRenderer widgets={getWidgets(slug, 'bottom-of-page')} />
        </div>
    );
}
