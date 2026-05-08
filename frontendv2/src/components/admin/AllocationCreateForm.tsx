/*
 * Shared allocation creation wizard (manual IP/port or game preset ranges).
 * Used by node AllocationsTab and admin server create wizard.
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

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { allocationGamePresets } from '@/components/admin/allocation-game-presets';

export interface CreatedAllocationRow {
    id: number;
    ip: string;
    port: number;
    ip_alias?: string | null;
    notes?: string | null;
    server_id?: number | null;
    node_id?: number;
}

interface AllocationCreateFormProps {
    nodeId: number;
    /** Called with API-created allocation rows */
    onCreated: (allocations: CreatedAllocationRow[]) => void;
    onCancel?: () => void;
    /** Show footer buttons inside the form (default true). Set false if embedding in a parent that provides actions */
    showFooter?: boolean;
}

export function AllocationCreateForm({ nodeId, onCreated, onCancel, showFooter = true }: AllocationCreateFormProps) {
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);
    const [nodeIPs, setNodeIPs] = useState<string[]>([]);
    const [isLoadingIps, setIsLoadingIps] = useState(false);

    const [createMode, setCreateMode] = useState<'manual' | 'preset'>('manual');
    const [createForm, setCreateForm] = useState({ ip: '', port: '', ip_alias: '', notes: '' });
    const [selectedGamePreset, setSelectedGamePreset] = useState('');
    const [presetPortCount, setPresetPortCount] = useState(100);
    const [includeDefaultPort, setIncludeDefaultPort] = useState(true);
    const [customIP, setCustomIP] = useState(false);

    const availableIPs = ['0.0.0.0', ...nodeIPs.filter((ip) => ip !== '0.0.0.0')];

    const loadNodeIps = useCallback(async () => {
        setIsLoadingIps(true);
        try {
            const ipsRes = await axios.get(`/api/wings/admin/node/${nodeId}/ips`);
            if (ipsRes.data.success) {
                setNodeIPs(ipsRes.data.data.ips.ip_addresses || []);
            }
        } catch {
            setNodeIPs([]);
        } finally {
            setIsLoadingIps(false);
        }
    }, [nodeId]);

    useEffect(() => {
        void loadNodeIps();
    }, [loadNodeIps]);

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            let port = createForm.port;
            if (createMode === 'preset') {
                const preset = allocationGamePresets.find((p) => p.id === selectedGamePreset);
                if (preset) {
                    const start = includeDefaultPort ? preset.defaultPort : preset.defaultPort + 1;
                    const end = start + presetPortCount - 1;
                    port = `${start}-${end}`;
                }
            }

            const { data } = await axios.put('/api/admin/allocations', {
                ...createForm,
                node_id: nodeId,
                port,
            });
            const created = (data?.data?.allocations || []) as CreatedAllocationRow[];
            if (!created.length) {
                toast.error(t('admin.node.allocations.messages.create_failed'));
                return;
            }
            toast.success(t('admin.node.allocations.messages.create_success'));
            onCreated(created);
        } catch (error: unknown) {
            console.error('Error creating allocation:', error);
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message
                : t('admin.node.allocations.messages.create_failed');
            toast.error(errorMessage || t('admin.node.allocations.messages.create_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className='space-y-6'>
            {isLoadingIps && <p className='text-muted-foreground text-xs'>{t('admin.node.health.checking')}</p>}
            <div className='space-y-2'>
                <Label className='text-sm font-semibold'>{t('admin.node.allocations.create.mode')}</Label>
                <div className='bg-muted/50 flex gap-1 rounded-xl p-1'>
                    <Button
                        type='button'
                        variant='ghost'
                        className={cn(
                            'h-9 flex-1 rounded-lg text-xs',
                            createMode === 'manual' && 'bg-background hover:bg-background shadow-sm',
                        )}
                        onClick={() => setCreateMode('manual')}
                    >
                        {t('admin.node.allocations.create.manual')}
                    </Button>
                    <Button
                        type='button'
                        variant='ghost'
                        className={cn(
                            'h-9 flex-1 rounded-lg text-xs',
                            createMode === 'preset' && 'bg-background hover:bg-background shadow-sm',
                        )}
                        onClick={() => setCreateMode('preset')}
                    >
                        {t('admin.node.allocations.create.preset')}
                    </Button>
                </div>
            </div>

            <div className='space-y-2'>
                <Label className='text-sm font-semibold'>{t('admin.node.allocations.ip_address')}</Label>
                {!customIP ? (
                    <div className='flex gap-2'>
                        <HeadlessSelect
                            value={createForm.ip}
                            onChange={(val) => setCreateForm((prev) => ({ ...prev, ip: String(val) }))}
                            options={availableIPs.map((ip) => ({ id: ip, name: ip }))}
                            className='flex-1'
                        />
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            className='h-11 w-11 shrink-0'
                            onClick={() => setCustomIP(true)}
                        >
                            <Plus className='h-4 w-4' />
                        </Button>
                    </div>
                ) : (
                    <div className='flex gap-2'>
                        <Input
                            placeholder='0.0.0.0'
                            value={createForm.ip}
                            className='h-11 font-mono'
                            onChange={(e) => setCreateForm((prev) => ({ ...prev, ip: e.target.value }))}
                        />
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='shrink-0'
                            onClick={() => setCustomIP(false)}
                        >
                            {t('admin.node.allocations.create.manual')}
                        </Button>
                    </div>
                )}
            </div>

            {createMode === 'preset' ? (
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>
                            {t('admin.node.allocations.create.game_preset')}
                        </Label>
                        <HeadlessSelect
                            value={selectedGamePreset}
                            onChange={(val) => setSelectedGamePreset(String(val))}
                            options={allocationGamePresets.map((preset) => ({
                                id: preset.id,
                                name: `${preset.name} (Default: ${preset.defaultPort})`,
                            }))}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.create.port_count')}</Label>
                        <Input
                            type='number'
                            value={presetPortCount}
                            className='h-11'
                            min={1}
                            max={1000}
                            onChange={(e) => setPresetPortCount(Number(e.target.value))}
                        />
                    </div>
                    <div className='bg-muted/30 border-border/50 flex items-center gap-2 rounded-2xl border p-4'>
                        <input
                            type='checkbox'
                            id='includeDefaultAllocationCreate'
                            className='border-border bg-background text-primary h-4 w-4 rounded'
                            checked={includeDefaultPort}
                            onChange={(e) => setIncludeDefaultPort(e.target.checked)}
                        />
                        <Label htmlFor='includeDefaultAllocationCreate' className='flex-1 cursor-pointer'>
                            <span className='block text-sm font-medium'>
                                {t('admin.node.allocations.create.include_default')}
                            </span>
                            {selectedGamePreset && (
                                <span className='text-muted-foreground mt-0.5 block text-[10px] font-bold tracking-wider uppercase'>
                                    {includeDefaultPort
                                        ? t('admin.node.allocations.create.include_default_help', {
                                              port: String(
                                                  allocationGamePresets.find((p) => p.id === selectedGamePreset)
                                                      ?.defaultPort,
                                              ),
                                          })
                                        : t('admin.node.allocations.create.exclude_default_help', {
                                              port: String(
                                                  (allocationGamePresets.find((p) => p.id === selectedGamePreset)
                                                      ?.defaultPort || 0) + 1,
                                              ),
                                              default: String(
                                                  allocationGamePresets.find((p) => p.id === selectedGamePreset)
                                                      ?.defaultPort,
                                              ),
                                          })}
                                </span>
                            )}
                        </Label>
                    </div>
                </div>
            ) : (
                <div className='space-y-2'>
                    <Label className='text-sm font-semibold'>{t('admin.node.allocations.port')}</Label>
                    <Input
                        placeholder='25565 or 25565-25700'
                        value={createForm.port}
                        className='h-11 font-mono'
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, port: e.target.value }))}
                    />
                    <p className='text-muted-foreground text-[10px] italic'>
                        {t('admin.node.allocations.create.port_range_help')}
                    </p>
                </div>
            )}

            <div className='space-y-2'>
                <Label className='text-sm font-semibold'>{t('admin.node.allocations.ip_alias')}</Label>
                <Input
                    placeholder='domain.com'
                    value={createForm.ip_alias}
                    className='h-11 font-mono'
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, ip_alias: e.target.value }))}
                />
            </div>

            <div className='space-y-2'>
                <Label className='text-sm font-semibold'>{t('admin.node.allocations.notes')}</Label>
                <Textarea
                    placeholder='Notes...'
                    value={createForm.notes}
                    className='min-h-25'
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
            </div>

            {showFooter && (
                <SheetFooter>
                    {onCancel && (
                        <Button type='button' variant='outline' onClick={onCancel}>
                            {t('common.cancel')}
                        </Button>
                    )}
                    <Button type='button' onClick={() => void handleCreate()} loading={submitting}>
                        {t('common.create')}
                    </Button>
                </SheetFooter>
            )}
        </div>
    );
}
