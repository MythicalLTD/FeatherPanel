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

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.servers.edit.details.title')}
                description={t('admin.servers.edit.details.description')}
            >
                <div className='space-y-6'>
                    {/* Server Name */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('admin.servers.form.name')}
                                <span className='text-red-500 font-bold'>*</span>
                            </Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder={t('admin.servers.form.name_placeholder')}
                                className={`bg-muted/30 h-11 ${errors.name ? 'border-red-500' : ''}`}
                            />
                            {errors.name && <p className='text-xs text-red-500'>{errors.name}</p>}
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.name_help')}</p>
                        </div>

                        <div className='space-y-3'>
                            <Label>{t('admin.servers.form.description')}</Label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder={t('admin.servers.form.description_placeholder')}
                                className='bg-muted/30 h-11'
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.description_help')}</p>
                        </div>
                    </div>

                    {/* Server Owner */}
                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.owner')}
                            <span className='text-red-500 font-bold'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {selectedEntities.owner ? (
                                    <div className='flex items-center gap-2'>
                                        <UserCircle className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>
                                            {selectedEntities.owner.username}
                                        </span>
                                        <span className='text-muted-foreground'>({selectedEntities.owner.email})</span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_owner')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchOwners();
                                    setOwnerModalOpen(true);
                                }}
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        {errors.owner_id && <p className='text-xs text-red-500'>{errors.owner_id}</p>}
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.owner_help')}</p>
                    </div>

                    {/* External ID */}
                    <div className='space-y-3'>
                        <Label>{t('admin.servers.edit.details.external_id')}</Label>
                        <Input
                            value={form.external_id}
                            onChange={(e) => setForm((prev) => ({ ...prev, external_id: e.target.value }))}
                            placeholder={t('admin.servers.edit.details.external_id_placeholder')}
                            className='bg-muted/30 h-11'
                        />
                        <p className='text-xs text-muted-foreground'>
                            {t('admin.servers.edit.details.external_id_help')}
                        </p>
                    </div>

                    {/* Toggle Switches */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50'>
                            <div className='space-y-0.5'>
                                <Label>{t('admin.servers.form.skip_scripts')}</Label>
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.servers.form.skip_scripts_help')}
                                </p>
                            </div>
                            <Switch
                                checked={form.skip_scripts}
                                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, skip_scripts: checked }))}
                            />
                        </div>

                        <div className='flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50'>
                            <div className='space-y-0.5'>
                                <Label>{t('admin.servers.edit.details.skip_zerotrust')}</Label>
                                <p className='text-xs text-muted-foreground'>
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

            {/* Node & Location Info (Read-only) */}
            <PageCard
                title={t('admin.servers.edit.details.location_node')}
                description={t('admin.servers.edit.details.location_node_help')}
            >
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='p-4 bg-muted/20 rounded-xl border border-border/50'>
                        <Label className='text-muted-foreground text-xs uppercase tracking-wide'>
                            {t('admin.servers.form.location')}
                        </Label>
                        <p className='font-medium mt-1'>{location?.name || t('common.unknown')}</p>
                    </div>
                    <div className='p-4 bg-muted/20 rounded-xl border border-border/50'>
                        <Label className='text-muted-foreground text-xs uppercase tracking-wide'>
                            {t('admin.servers.form.node')}
                        </Label>
                        <p className='font-medium mt-1'>{node?.name || t('common.unknown')}</p>
                        {node?.fqdn && <p className='text-xs text-muted-foreground'>{node.fqdn}</p>}
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
