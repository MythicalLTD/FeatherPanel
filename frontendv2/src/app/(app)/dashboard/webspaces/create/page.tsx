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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { AlertTriangle, AppWindow, Globe, HardDrive, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { safeBack } from '@/lib/safe-back';
import { WebSpaceDomainsManager, type DomainRoute } from '@/components/webspace/WebSpaceDomainsManager';

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

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [nodes, setNodes] = useState<WebNodeOption[]>([]);
    const [plates, setPlates] = useState<WebPlateOption[]>([]);
    const [limit, setLimit] = useState<number | null>(null);
    const [owned, setOwned] = useState(0);

    const [name, setName] = useState('');
    const [webNodeId, setWebNodeId] = useState('');
    const [webplateId, setWebplateId] = useState('');
    const [disk, setDisk] = useState('1024');
    const [ssl, setSsl] = useState(true);
    const [domainRoutes, setDomainRoutes] = useState<DomainRoute[]>([
        { domain: '', type: 'primary', redirect_target: '' },
    ]);

    const selectedPlate = useMemo(() => plates.find((p) => String(p.id) === webplateId), [plates, webplateId]);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const [catalogRes, listRes] = await Promise.all([
                axios.get('/api/user/webspaces/catalog'),
                axios.get('/api/user/webspaces'),
            ]);
            const catalog = catalogRes.data?.data ?? catalogRes.data;
            setNodes((catalog?.web_nodes || []) as WebNodeOption[]);
            setPlates((catalog?.webplates || []) as WebPlateOption[]);
            const spaces = (listRes.data?.data?.webspaces || []) as unknown[];
            setOwned(spaces.length);
            const userLimit = listRes.data?.data?.webspace_limit;
            if (typeof userLimit === 'number') setLimit(userLimit);
        } catch (error) {
            console.error(error);
            toast.error(t('webSpaces.create.load_failed'));
            router.push('/dashboard/webspaces');
        } finally {
            setLoading(false);
        }
    }, [router, t]);

    useEffect(() => {
        void loadCatalog();
    }, [loadCatalog]);

    const limitReached = limit !== null && limit > 0 && owned >= limit;

    const handleCreate = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (limitReached) {
            toast.error(t('webSpaces.create.limitReached'));
            return;
        }
        if (!name.trim()) {
            toast.error(t('webSpaces.create.name_required'));
            return;
        }
        if (!webNodeId || !webplateId) {
            toast.error(t('webSpaces.create.node_plate_required'));
            return;
        }

        const domains = domainRoutes.filter((r) => r.domain.trim()).map((r) => r.domain.trim().toLowerCase());

        setSaving(true);
        try {
            const { data } = await axios.post('/api/user/webspaces/create', {
                name: name.trim(),
                web_node_id: Number(webNodeId),
                webplate_id: Number(webplateId),
                disk: Math.max(1, Number(disk) || 1024),
                domains,
                domain_routes: domainRoutes.filter((r) => r.domain.trim()),
                ssl,
                document_root: selectedPlate?.document_root || undefined,
                start_on_completion: true,
            });

            const created = data?.data?.webspace;
            toast.success(t('webSpaces.create.success'));
            if (created?.uuidShort) {
                router.push(`/webspace/${created.uuidShort}`);
            } else {
                router.push('/dashboard/webspaces');
            }
        } catch (error) {
            let msg = t('webSpaces.create.failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className='flex min-h-[40vh] items-center justify-center'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    if (nodes.length === 0 || plates.length === 0) {
        return (
            <div className='mx-auto max-w-4xl space-y-8 pb-16'>
                <PageHeader
                    title={t('webSpaces.create.title')}
                    description={t('webSpaces.create.unavailable')}
                    actions={
                        <Button variant='glass' onClick={() => safeBack(router)}>
                            {t('common.goBack')}
                        </Button>
                    }
                />
                <div className='rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5'>
                    <div className='flex items-start gap-4'>
                        <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/20'>
                            <AlertTriangle className='h-5 w-5 text-yellow-500' />
                        </div>
                        <p className='text-sm text-yellow-500/85'>{t('webSpaces.create.unavailable_detail')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='mx-auto max-w-4xl space-y-8 pb-16'>
            <PageHeader
                title={t('webSpaces.create.title')}
                description={t('webSpaces.create.description')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => safeBack(router)}
                            disabled={saving}
                            className='order-2 sm:order-1'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            onClick={() => void handleCreate()}
                            disabled={saving || limitReached}
                            loading={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('webSpaces.create.submit')}
                        </Button>
                    </div>
                }
            />

            {limitReached && (
                <div className='rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5'>
                    <div className='flex items-start gap-4'>
                        <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/20'>
                            <AlertTriangle className='h-5 w-5 text-yellow-500' />
                        </div>
                        <div className='space-y-1'>
                            <h3 className='font-bold text-yellow-500'>{t('webSpaces.create.limitReached')}</h3>
                            <p className='text-sm text-yellow-500/85'>
                                {t('webSpaces.create.limitReachedDescription', {
                                    owned: String(owned),
                                    limit: String(limit),
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!limitReached && limit !== null && limit > 0 ? (
                <p className='text-muted-foreground text-sm'>
                    {t('webSpaces.create.limit_hint', { owned: String(owned), limit: String(limit) })}
                </p>
            ) : null}

            <form onSubmit={(e) => void handleCreate(e)} className='space-y-8'>
                <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <AppWindow className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {t('webSpaces.create.details')}
                            </h2>
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                {t('webSpaces.create.name')}
                            </p>
                        </div>
                    </div>

                    <div className='space-y-2.5'>
                        <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                            {t('webSpaces.create.name')} <span className='text-primary'>*</span>
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={saving || limitReached}
                            required
                        />
                    </div>

                    <div className='grid gap-5 sm:grid-cols-2'>
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('webSpaces.webNode')} <span className='text-primary'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={webNodeId}
                                onChange={(val) => setWebNodeId(String(val))}
                                options={nodes.map((node) => ({
                                    id: String(node.id),
                                    name: node.fqdn ? `${node.name} (${node.fqdn})` : node.name,
                                }))}
                                placeholder={t('webSpaces.create.select_node')}
                                disabled={saving || limitReached}
                            />
                        </div>
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('webSpaces.webPlate')} <span className='text-primary'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={webplateId}
                                onChange={(val) => setWebplateId(String(val))}
                                options={plates.map((plate) => ({
                                    id: String(plate.id),
                                    name: `${plate.name} (${plate.runtime})`,
                                }))}
                                placeholder={t('webSpaces.create.select_plate')}
                                disabled={saving || limitReached}
                            />
                        </div>
                    </div>
                </div>

                <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <HardDrive className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {t('webSpaces.overview.utilization')}
                            </h2>
                        </div>
                    </div>

                    <div className='space-y-2.5'>
                        <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                            {t('webSpaces.create.disk_mib')}
                        </Label>
                        <Input
                            type='number'
                            min={1}
                            value={disk}
                            onChange={(e) => setDisk(e.target.value)}
                            disabled={saving || limitReached}
                        />
                    </div>

                    <div className='border-border/40 bg-card/50 flex items-center justify-between rounded-2xl border p-5'>
                        <div>
                            <Label>{t('webSpaces.ssl')}</Label>
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.create.ssl_help')}</p>
                        </div>
                        <Switch checked={ssl} onCheckedChange={setSsl} disabled={saving || limitReached} />
                    </div>
                </div>

                <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <Globe className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {t('webSpaces.settings.domains')}
                            </h2>
                        </div>
                    </div>
                    <WebSpaceDomainsManager
                        value={domainRoutes}
                        onChange={setDomainRoutes}
                        disabled={saving || limitReached}
                    />
                </div>
            </form>
        </div>
    );
}
