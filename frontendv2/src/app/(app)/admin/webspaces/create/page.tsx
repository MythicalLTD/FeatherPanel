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

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { PageCard } from '@/components/featherui/PageCard';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { OwnerPickerSheet } from '@/components/admin/OwnerPickerSheet';
import type { User } from '@/app/(app)/admin/servers/create/types';
import { toast } from 'sonner';
import { ArrowLeft, AppWindow, LayoutTemplate, Search, Server, UserCircle } from 'lucide-react';

interface WebNodeOption {
    id: number;
    name: string;
    fqdn?: string;
}

interface WebPlateOption {
    id: number;
    name: string;
    runtime: string;
    document_root?: string;
}

export default function CreateWebSpacePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [nodes, setNodes] = useState<WebNodeOption[]>([]);
    const [plates, setPlates] = useState<WebPlateOption[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<User | null>(null);
    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [owners, setOwners] = useState<User[]>([]);
    const [ownerSearch, setOwnerSearch] = useState('');
    const [debouncedOwnerSearch, setDebouncedOwnerSearch] = useState('');
    const [ownerPagination, setOwnerPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const [form, setForm] = useState({
        name: '',
        description: '',
        web_node_id: '',
        webplate_id: '',
        owner_id: '',
        disk: '1024',
        database_limit: '1',
        mailbox_limit: '0',
        domainsText: '',
        ssl: false,
        document_root: '',
        skip_scripts: false,
        start_on_completion: false,
    });

    useEffect(() => {
        const load = async () => {
            try {
                const [nodesRes, platesRes] = await Promise.all([
                    axios.get('/api/admin/web-nodes', { params: { page: 1, limit: 200 } }),
                    axios.get('/api/admin/webplates', { params: { page: 1, limit: 200 } }),
                ]);
                setNodes((nodesRes.data.data.web_nodes || []) as WebNodeOption[]);
                setPlates((platesRes.data.data.webplates || []) as WebPlateOption[]);
            } catch (error) {
                console.error(error);
                toast.error(t('admin.webSpaces.messages.nodes_failed'));
            }
        };
        load();
    }, [t]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOwnerSearch(ownerSearch);
            setOwnerPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [ownerSearch]);

    const fetchOwners = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/users', {
                params: {
                    search: debouncedOwnerSearch,
                    page: ownerPagination.current_page,
                    limit: ownerPagination.per_page,
                },
            });
            setOwners(data.data.users || []);
            if (data.data.pagination) {
                setOwnerPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, [debouncedOwnerSearch, ownerPagination.current_page, ownerPagination.per_page]);

    useEffect(() => {
        if (ownerModalOpen) {
            fetchOwners();
        }
    }, [ownerModalOpen, fetchOwners]);

    const selectedPlate = plates.find((p) => String(p.id) === form.webplate_id);

    const openOwnerModal = () => {
        fetchOwners();
        setOwnerModalOpen(true);
    };

    const handleSelectOwner = (owner: User) => {
        setSelectedOwner(owner);
        setForm((prev) => ({ ...prev, owner_id: String(owner.id) }));
        setOwnerModalOpen(false);
    };

    const handleCreate = async () => {
        if (!form.name.trim() || !form.web_node_id || !form.webplate_id || !form.owner_id) {
            toast.error(t('admin.webSpaces.messages.required'));
            return;
        }

        const ownerId = Number(form.owner_id);
        if (!Number.isFinite(ownerId) || ownerId <= 0) {
            toast.error(t('admin.webSpaces.form.owner_id_invalid'));
            return;
        }

        const domains = form.domainsText
            .split(/\r?\n/)
            .map((d) => d.trim())
            .filter(Boolean);

        setSaving(true);
        try {
            await axios.put('/api/admin/webspaces', {
                name: form.name.trim(),
                description: form.description,
                web_node_id: Number(form.web_node_id),
                webplate_id: Number(form.webplate_id),
                owner_id: ownerId,
                disk: Math.max(1, Number(form.disk) || 1024),
                database_limit: Math.max(0, Number(form.database_limit) || 0),
                mailbox_limit: Math.max(0, Number(form.mailbox_limit) || 0),
                domains,
                ssl: form.ssl,
                document_root: form.document_root.trim() || undefined,
                skip_scripts: form.skip_scripts,
                start_on_completion: form.start_on_completion,
            });
            toast.success(t('admin.webSpaces.messages.created'));
            router.push('/admin/webspaces');
        } catch (error) {
            console.error(error);
            let msg = t('admin.webSpaces.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.webSpaces.form.create_title')}
                description={t('admin.webSpaces.form.create_description')}
                icon={AppWindow}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' onClick={() => router.push('/admin/webspaces')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        <Button onClick={handleCreate} loading={saving}>
                            {t('admin.webSpaces.form.submit_create')}
                        </Button>
                    </div>
                }
            />

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <PageCard title={t('admin.webSpaces.form.name')} icon={AppWindow}>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.name')} *</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder={t('admin.webSpaces.form.name_placeholder')}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.description')}</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.disk')}</Label>
                            <Input
                                type='number'
                                min={1}
                                value={form.disk}
                                onChange={(e) => setForm({ ...form, disk: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>Database limit</Label>
                            <Input
                                type='number'
                                min={0}
                                value={form.database_limit}
                                onChange={(e) => setForm({ ...form, database_limit: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>Mailbox limit (0 = unlimited)</Label>
                            <Input
                                type='number'
                                min={0}
                                value={form.mailbox_limit}
                                onChange={(e) => setForm({ ...form, mailbox_limit: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='flex items-center gap-1.5'>{t('admin.webSpaces.form.owner_id')} *</Label>
                            <div className='flex gap-2'>
                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                    onClick={openOwnerModal}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openOwnerModal();
                                        }
                                    }}
                                >
                                    {selectedOwner ? (
                                        <div className='flex items-center gap-2'>
                                            <UserCircle className='text-primary h-4 w-4' />
                                            <span className='text-foreground font-medium'>
                                                {selectedOwner.username}
                                            </span>
                                            <span className='text-muted-foreground'>({selectedOwner.email})</span>
                                        </div>
                                    ) : (
                                        <span className='text-muted-foreground'>
                                            {t('admin.servers.form.select_owner')}
                                        </span>
                                    )}
                                </div>
                                <Button type='button' size='icon' onClick={openOwnerModal}>
                                    <Search className='h-4 w-4' />
                                </Button>
                            </div>
                            <p className='text-muted-foreground text-xs'>{t('admin.webSpaces.form.owner_id_help')}</p>
                        </div>
                    </div>
                </PageCard>

                <PageCard title={t('admin.webSpaces.form.web_node')} icon={Server}>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.web_node')} *</Label>
                            <Select
                                value={form.web_node_id}
                                onChange={(e) => setForm({ ...form, web_node_id: e.target.value })}
                            >
                                <option value=''>{t('admin.webSpaces.form.web_node_placeholder')}</option>
                                {nodes.map((node) => (
                                    <option key={node.id} value={String(node.id)}>
                                        {node.name}
                                        {node.fqdn ? ` (${node.fqdn})` : ''}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <Label className='flex items-center gap-2'>
                                <LayoutTemplate className='h-4 w-4' />
                                {t('admin.webSpaces.form.webplate')} *
                            </Label>
                            <Select
                                value={form.webplate_id}
                                onChange={(e) => setForm({ ...form, webplate_id: e.target.value })}
                            >
                                <option value=''>{t('admin.webSpaces.form.webplate_placeholder')}</option>
                                {plates.map((plate) => (
                                    <option key={plate.id} value={String(plate.id)}>
                                        {plate.name} ({plate.runtime})
                                    </option>
                                ))}
                            </Select>
                            {plates.length === 0 && (
                                <p className='text-muted-foreground text-xs'>
                                    <button
                                        type='button'
                                        className='text-primary underline-offset-2 hover:underline'
                                        onClick={() => router.push('/admin/webplates/create')}
                                    >
                                        {t('admin.webPlates.create')}
                                    </button>
                                </p>
                            )}
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.document_root')}</Label>
                            <Input
                                value={form.document_root}
                                onChange={(e) => setForm({ ...form, document_root: e.target.value })}
                                placeholder={selectedPlate?.document_root || 'public'}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.webSpaces.form.document_root_help')}
                            </p>
                        </div>
                    </div>
                </PageCard>
            </div>

            <PageCard title={t('admin.webSpaces.form.domains')} icon={AppWindow}>
                <div className='space-y-4'>
                    <div className='space-y-2'>
                        <Label>{t('admin.webSpaces.form.domains')}</Label>
                        <Textarea
                            value={form.domainsText}
                            onChange={(e) => setForm({ ...form, domainsText: e.target.value })}
                            rows={4}
                            placeholder={t('admin.webSpaces.form.domains_placeholder')}
                        />
                        <p className='text-muted-foreground text-xs'>{t('admin.webSpaces.form.domains_help')}</p>
                    </div>
                    <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                                checked={form.ssl}
                                onCheckedChange={(checked) => setForm({ ...form, ssl: checked === true })}
                            />
                            {t('admin.webSpaces.form.ssl')}
                        </label>
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                                checked={form.skip_scripts}
                                onCheckedChange={(checked) => setForm({ ...form, skip_scripts: checked === true })}
                            />
                            {t('admin.webSpaces.form.skip_scripts')}
                        </label>
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                                checked={form.start_on_completion}
                                onCheckedChange={(checked) =>
                                    setForm({ ...form, start_on_completion: checked === true })
                                }
                            />
                            {t('admin.webSpaces.form.start_on_completion')}
                        </label>
                    </div>
                </div>
            </PageCard>

            <OwnerPickerSheet
                open={ownerModalOpen}
                onOpenChange={setOwnerModalOpen}
                owners={owners}
                ownerSearch={ownerSearch}
                setOwnerSearch={setOwnerSearch}
                ownerPagination={ownerPagination}
                setOwnerPagination={setOwnerPagination}
                fetchOwners={fetchOwners}
                onSelectOwner={handleSelectOwner}
            />
        </div>
    );
}
