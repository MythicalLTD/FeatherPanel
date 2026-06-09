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

import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/featherui/Button';
import { UserCircle, Search } from 'lucide-react';
import { TabProps, Location, Node, SelectedEntities } from './types';

interface DetailsTabProps extends TabProps {
    selectedEntities: SelectedEntities;
    location: Location | null;
    node: Node | null;
    setOwnerModalOpen: (open: boolean) => void;
    fetchOwners: () => void;
}

export function DetailsTab({
    form,
    setForm,
    errors,
    selectedEntities,
    location,
    node,
    setOwnerModalOpen,
    fetchOwners,
}: DetailsTabProps) {
    const { t } = useTranslation();

    const openOwnerModal = () => {
        fetchOwners();
        setOwnerModalOpen(true);
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.servers.edit.details.title')}
                description={t('admin.servers.edit.details.description')}
            >
                <div className='space-y-6'>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('admin.servers.form.name')}
                                <span className='font-bold text-red-500'>*</span>
                            </Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder={t('admin.servers.form.name_placeholder')}
                                className={`bg-muted/30 h-11 ${errors.name ? 'border-red-500' : ''}`}
                            />
                            {errors.name && <p className='text-xs text-red-500'>{errors.name}</p>}
                            <p className='text-muted-foreground text-xs'>{t('admin.servers.form.name_help')}</p>
                        </div>

                        <div className='space-y-3'>
                            <Label>{t('admin.servers.form.description')}</Label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder={t('admin.servers.form.description_placeholder')}
                                className='bg-muted/30 h-11'
                            />
                            <p className='text-muted-foreground text-xs'>{t('admin.servers.form.description_help')}</p>
                        </div>
                    </div>

                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.owner')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
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
                                {selectedEntities.owner ? (
                                    <div className='flex items-center gap-2'>
                                        <UserCircle className='text-primary h-4 w-4' />
                                        {selectedEntities.owner.uuid ? (
                                            <Link
                                                href={`/admin/users/${selectedEntities.owner.uuid}/edit`}
                                                className='text-primary hover:text-primary/80 font-medium underline-offset-4 transition-colors hover:underline'
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            >
                                                {selectedEntities.owner.username}
                                            </Link>
                                        ) : (
                                            <span className='text-foreground font-medium'>
                                                {selectedEntities.owner.username}
                                            </span>
                                        )}
                                        <span className='text-muted-foreground'>({selectedEntities.owner.email})</span>
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
                        {errors.owner_id && <p className='text-xs text-red-500'>{errors.owner_id}</p>}
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.owner_help')}</p>
                    </div>

                    <div className='space-y-3'>
                        <Label>{t('admin.servers.edit.details.external_id')}</Label>
                        <Input
                            value={form.external_id}
                            onChange={(e) => setForm((prev) => ({ ...prev, external_id: e.target.value }))}
                            placeholder={t('admin.servers.edit.details.external_id_placeholder')}
                            className='bg-muted/30 h-11'
                        />
                        <p className='text-muted-foreground text-xs'>
                            {t('admin.servers.edit.details.external_id_help')}
                        </p>
                    </div>

                    <div className='space-y-3'>
                        <Label>{t('admin.servers.edit.details.expires_at')}</Label>
                        <Input
                            type='datetime-local'
                            value={form.expires_at || ''}
                            onChange={(e) => setForm((prev) => ({ ...prev, expires_at: e.target.value || null }))}
                            className='bg-muted/30 h-11'
                        />
                        <p className='text-muted-foreground text-xs'>
                            {t('admin.servers.edit.details.expires_at_help')}
                        </p>
                    </div>

                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='bg-muted/20 border-border/50 flex items-center justify-between rounded-xl border p-4'>
                            <div className='space-y-0.5'>
                                <Label>{t('admin.servers.form.skip_scripts')}</Label>
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.servers.form.skip_scripts_help')}
                                </p>
                            </div>
                            <Switch
                                checked={form.skip_scripts}
                                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, skip_scripts: checked }))}
                            />
                        </div>

                        <div className='bg-muted/20 border-border/50 flex items-center justify-between rounded-xl border p-4'>
                            <div className='space-y-0.5'>
                                <Label>{t('admin.servers.edit.details.skip_zerotrust')}</Label>
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.servers.edit.details.skip_zerotrust_help')}
                                </p>
                            </div>
                            <Switch
                                checked={form.skip_zerotrust}
                                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, skip_zerotrust: checked }))}
                            />
                        </div>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.servers.edit.details.location_node')}
                description={t('admin.servers.edit.details.location_node_help')}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='bg-muted/20 border-border/50 rounded-xl border p-4'>
                        <Label className='text-muted-foreground text-xs tracking-wide uppercase'>
                            {t('admin.servers.form.location')}
                        </Label>
                        <p className='mt-1 font-medium'>{location?.name || t('common.unknown')}</p>
                    </div>
                    <div className='bg-muted/20 border-border/50 rounded-xl border p-4'>
                        <Label className='text-muted-foreground text-xs tracking-wide uppercase'>
                            {t('admin.servers.form.node')}
                        </Label>
                        <p className='mt-1 font-medium'>{node?.name || t('common.unknown')}</p>
                        {node?.fqdn && <p className='text-muted-foreground text-xs'>{node.fqdn}</p>}
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
