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
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Server, Search as SearchIcon, Save } from 'lucide-react';
import type { OwnerUser } from './types';

interface DetailsTabProps {
    hostname: string;
    setHostname: (v: string) => void;
    notes: string;
    setNotes: (v: string) => void;
    selectedOwner: OwnerUser | null;
    setSelectedOwner: (v: OwnerUser | null) => void;
    onOpenOwnerModal: () => void;
    onSave: (e: React.FormEvent) => void;
    saving: boolean;
    isLxc?: boolean;
    dnsNameserver?: string;
    setDnsNameserver?: (v: string) => void;
    dnsSearchDomain?: string;
    setDnsSearchDomain?: (v: string) => void;
}

export function DetailsTab({
    hostname,
    setHostname,
    notes,
    setNotes,
    selectedOwner,
    setSelectedOwner,
    onOpenOwnerModal,
    onSave,
    saving,
    isLxc,
    dnsNameserver = '',
    setDnsNameserver,
    dnsSearchDomain = '',
    setDnsSearchDomain,
}: DetailsTabProps) {
    const { t } = useTranslation();

    return (
        <form onSubmit={onSave}>
            <PageCard title={t('admin.vmInstances.edit_tabs.details') ?? 'Details'} icon={Server}>
                <div className='space-y-4'>
                    <div>
                        <Label>{t('admin.vmInstances.hostname') ?? 'Hostname'}</Label>
                        <Input
                            value={hostname}
                            onChange={(e) => setHostname(e.target.value)}
                            placeholder='e.g. my-vm'
                            className='mt-1 bg-muted/30 h-11 rounded-xl'
                        />
                    </div>
                    <div>
                        <Label>{t('admin.vmInstances.notes') ?? 'Notes'}</Label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder='Optional notes'
                            className='mt-1 min-h-[80px] bg-muted/30 rounded-xl'
                        />
                    </div>
                    {isLxc && setDnsNameserver != null && setDnsSearchDomain != null && (
                        <>
                            <div>
                                <Label>{t('admin.vmInstances.dns_server') ?? 'DNS server(s)'}</Label>
                                <Input
                                    value={dnsNameserver}
                                    onChange={(e) => setDnsNameserver(e.target.value)}
                                    placeholder='e.g. 1.1.1.1 8.8.8.8'
                                    className='mt-1 bg-muted/30 h-11 rounded-xl'
                                />
                            </div>
                            <div>
                                <Label>{t('admin.vmInstances.dns_domain') ?? 'DNS search domain'}</Label>
                                <Input
                                    value={dnsSearchDomain}
                                    onChange={(e) => setDnsSearchDomain(e.target.value)}
                                    placeholder='e.g. local'
                                    className='mt-1 bg-muted/30 h-11 rounded-xl'
                                />
                            </div>
                        </>
                    )}
                    <div>
                        <Label>{t('admin.vmInstances.owner') ?? 'Owner'}</Label>
                        <div className='flex gap-2 mt-1'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center text-foreground'>
                                {selectedOwner ? (
                                    <span>
                                        {selectedOwner.username || selectedOwner.uuid}
                                        {selectedOwner.email ? ` (${selectedOwner.email})` : ''}
                                    </span>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.vmInstances.no_owner_assigned') ?? 'No owner assigned'}
                                    </span>
                                )}
                            </div>
                            <Button type='button' size='icon' onClick={onOpenOwnerModal} className='h-11 w-11'>
                                <SearchIcon className='h-4 w-4' />
                            </Button>
                            {selectedOwner && (
                                <Button
                                    type='button'
                                    size='icon'
                                    variant='ghost'
                                    onClick={() => setSelectedOwner(null)}
                                    className='h-11 w-11'
                                >
                                    ×
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </PageCard>
            <div className='flex justify-end mt-4'>
                <Button type='submit' loading={saving}>
                    <Save className='h-4 w-4 mr-2' />
                    {t('common.save_changes')}
                </Button>
            </div>
        </form>
    );
}
