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

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { Button } from '@/components/featherui/Button';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { Info, Shield, RefreshCw, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { cn, isEnabled } from '@/lib/utils';
import axios from 'axios';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import type {
    FirewallRule,
    CreateFirewallRuleRequest,
    FirewallRulesResponse,
    AllocationItem,
    AllocationsResponse,
} from '@/types/server';

export default function ServerFirewallPage() {
    const params = useParams();
    const pathname = usePathname();
    const uuidShort = params.uuidShort as string;
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();

    // Permissions
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const canRead = hasPermission('allocation.read') || hasPermission('firewall.read');
    const canManage = hasPermission('allocation.update') || hasPermission('firewall.manage');

    // State
    const [rules, setRules] = React.useState<FirewallRule[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [allocations, setAllocations] = React.useState<AllocationItem[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [currentRule, setCurrentRule] = React.useState<FirewallRule | null>(null);

    // Form State
    const [formData, setFormData] = React.useState<CreateFirewallRuleRequest>({
        remote_ip: '',
        server_port: 0,
        priority: 1,
        type: 'allow',
        protocol: 'tcp',
    });
    const [selectedAllocationId, setSelectedAllocationId] = React.useState<string>('');
    const [saving, setSaving] = React.useState(false);

    // Delete Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [ruleToDelete, setRuleToDelete] = React.useState<FirewallRule | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    // Feature Flag
    const firewallEnabled = isEnabled(settings?.server_allow_user_made_firewall);

    // Widgets
    const { getWidgets, fetchWidgets } = usePluginWidgets('server-firewall');

    const fetchAllocations = React.useCallback(async () => {
        if (!uuidShort) return;
        try {
            const { data } = await axios.get<AllocationsResponse>(`/api/user/servers/${uuidShort}/allocations`);
            if (data.success) {
                setAllocations(data.data.allocations || []);
            }
        } catch (error) {
            console.error('Failed to fetch allocations:', error);
        }
    }, [uuidShort]);

    const fetchRules = React.useCallback(async () => {
        if (!uuidShort || !firewallEnabled) return;

        setLoading(true);
        try {
            const { data } = await axios.get<FirewallRulesResponse>(`/api/user/servers/${uuidShort}/firewall`);
            if (data.success) {
                setRules(data.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch firewall rules:', error);
            toast.error(t('serverFirewall.fetchError'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, firewallEnabled, t]);

    React.useEffect(() => {
        if (!settingsLoading && !permissionsLoading) {
            if (firewallEnabled && canRead) {
                fetchRules();
                fetchAllocations();
            } else {
                setLoading(false);
            }
        }
    }, [settingsLoading, permissionsLoading, firewallEnabled, canRead, fetchRules, fetchAllocations]);

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    // Helpers
    const sortedRules = React.useMemo(() => {
        return [...rules].sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return b.id - a.id;
        });
    }, [rules]);

    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentRule(null);

        // Default to first allocation if available
        let defaultPort = 0;
        let defaultAllocId = '';

        if (allocations.length > 0) {
            const primary = allocations.find((a) => a.is_primary);
            if (primary) {
                defaultPort = primary.port;
                defaultAllocId = primary.id.toString();
            } else {
                defaultPort = allocations[0].port;
                defaultAllocId = allocations[0].id.toString();
            }
        }

        setFormData({
            remote_ip: '',
            server_port: defaultPort,
            priority: 1,
            type: 'allow',
            protocol: 'tcp',
        });
        setSelectedAllocationId(defaultAllocId);
        setIsModalOpen(true);
    };

    const openEditModal = (rule: FirewallRule) => {
        setIsEditing(true);
        setCurrentRule(rule);
        setFormData({
            remote_ip: rule.remote_ip,
            server_port: rule.server_port,
            priority: rule.priority,
            type: rule.type,
            protocol: rule.protocol,
        });

        // Find matching allocation for the port
        const matchingAlloc = allocations.find((a) => a.port === rule.server_port);
        setSelectedAllocationId(matchingAlloc ? matchingAlloc.id.toString() : '');

        setIsModalOpen(true);
    };

    const handleAllocationChange = (value: string | number) => {
        const valString = value.toString();
        setSelectedAllocationId(valString);
        const alloc = allocations.find((a) => a.id.toString() === valString);
        if (alloc) {
            setFormData((prev) => ({ ...prev, server_port: alloc.port }));
        }
    };

    const handleSave = async () => {
        if (!formData.remote_ip) {
            toast.error(t('serverFirewall.validation.remoteIpRequired'));
            return;
        }

        setSaving(true);
        try {
            if (isEditing && currentRule) {
                const { data } = await axios.put<{ success: boolean; data: { data: FirewallRule }; message?: string }>(
                    `/api/user/servers/${uuidShort}/firewall/${currentRule.id}`,
                    formData,
                );
                if (data.success) {
                    toast.success(t('serverFirewall.updateSuccess'));
                    setRules((prev) => prev.map((r) => (r.id === currentRule.id ? data.data.data : r)));
                    setIsModalOpen(false);
                } else {
                    toast.error(data.message || t('serverFirewall.unknownError'));
                }
            } else {
                const { data } = await axios.post<{ success: boolean; data: { data: FirewallRule }; message?: string }>(
                    `/api/user/servers/${uuidShort}/firewall`,
                    formData,
                );
                if (data.success) {
                    toast.success(t('serverFirewall.createSuccess'));
                    setRules((prev) => [...prev, data.data.data]);
                    setIsModalOpen(false);
                } else {
                    toast.error(data.message || t('serverFirewall.unknownError'));
                }
            }
        } catch (error) {
            console.error('Failed to save rule:', error);
            toast.error(t('serverFirewall.unknownError'));
        } finally {
            setSaving(false);
        }
    };

    const promptDelete = (rule: FirewallRule) => {
        setRuleToDelete(rule);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!ruleToDelete) return;

        setDeleting(true);
        try {
            const { data } = await axios.delete(`/api/user/servers/${uuidShort}/firewall/${ruleToDelete.id}`);

            if (data.success) {
                toast.success(t('serverFirewall.deleteSuccess'));
                setRules((prev) => prev.filter((r) => r.id !== ruleToDelete.id));
                setDeleteDialogOpen(false);
                setRuleToDelete(null);
            } else {
                toast.error(data.message || t('serverFirewall.unknownError'));
            }
        } catch (error) {
            console.error('Failed to delete rule:', error);
            toast.error(t('serverFirewall.unknownError'));
        } finally {
            setDeleting(false);
        }
    };

    // Options helpers
    const allocationOptions = React.useMemo(
        () =>
            allocations.map((a) => ({
                id: a.id.toString(),
                name: `${a.ip}:${a.port} ${a.is_primary ? `(${t('serverAllocations.primary')})` : ''}`,
            })),
        [allocations, t],
    );

    const typeOptions = [
        { id: 'allow', name: t('serverFirewall.allow') },
        { id: 'block', name: t('serverFirewall.block') },
    ];

    const protocolOptions = [
        { id: 'tcp', name: 'TCP' },
        { id: 'udp', name: 'UDP' },
    ];

    if (permissionsLoading || settingsLoading) return null;

    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6'>
                    <Shield className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black uppercase tracking-tight'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => window.history.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    if (!firewallEnabled) {
        return (
            <EmptyState
                icon={Shield}
                title={t('serverFirewall.featureDisabled')}
                description={t('serverFirewall.featureDisabledDescription')}
                action={
                    <Button variant='outline' size='default' onClick={() => window.history.back()}>
                        {t('common.goBack')}
                    </Button>
                }
            />
        );
    }

    if (loading && rules.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <div className='relative'>
                    <div className='absolute inset-0 animate-ping opacity-20'>
                        <div className='w-16 h-16 rounded-full bg-primary/20' />
                    </div>
                    <div className='relative p-4 rounded-full bg-primary/10'>
                        <Loader2 className='h-8 w-8 animate-spin text-primary' />
                    </div>
                </div>
                <span className='mt-4 text-muted-foreground animate-pulse'>{t('common.loading')}...</span>
            </div>
        );
    }

    return (
        <div key={pathname} className='space-y-8 pb-12 '>
            <WidgetRenderer widgets={getWidgets('server-firewall', 'top-of-page')} />
            <PageHeader
                title={t('serverFirewall.title')}
                description={t('serverFirewall.description')}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='glass' size='default' onClick={fetchRules} disabled={loading}>
                            <RefreshCw className={cn('h-5 w-5 mr-2', loading && 'animate-spin')} />
                            {t('serverFirewall.refresh')}
                        </Button>

                        {canManage && firewallEnabled && (
                            <Button
                                size='default'
                                onClick={openCreateModal}
                                disabled={loading || allocations.length === 0}
                            >
                                <Plus className='h-5 w-5 mr-2' />
                                {t('serverFirewall.createRule')}
                            </Button>
                        )}
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-firewall', 'after-header')} />

            <div className='relative overflow-hidden p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 backdrop-blur-xl animate-in slide-in-from-top duration-500 shadow-sm'>
                <div className='relative z-10 flex items-start gap-5'>
                    <div className='h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0'>
                        <Info className='h-6 w-6 text-blue-500' />
                    </div>
                    <div className='space-y-1'>
                        <h3 className='text-lg font-bold text-blue-500 leading-none uppercase tracking-tight'>
                            {t('serverFirewall.rulesInfoTitle')}
                        </h3>
                        <p className='text-sm text-blue-500/80 leading-relaxed font-medium'>
                            {t('serverFirewall.rulesInfoDescription')}
                        </p>
                    </div>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('server-firewall', 'before-rules-list')} />

            {rules.length === 0 ? (
                <EmptyState
                    icon={Shield}
                    title={t('serverFirewall.noRulesTitle')}
                    description={t('serverFirewall.noRulesDescription')}
                    action={
                        canManage ? (
                            <Button size='default' onClick={openCreateModal}>
                                <Plus className='h-6 w-6 mr-2' />
                                {t('serverFirewall.createRule')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {sortedRules.map((rule) => (
                        <ResourceCard
                            key={rule.id}
                            icon={Shield}
                            iconWrapperClassName={
                                rule.type === 'allow'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                    : 'bg-red-500/10 border-red-500/20 text-red-500'
                            }
                            title={`${rule.remote_ip} → ${rule.server_port}`}
                            badges={[
                                {
                                    label:
                                        rule.type === 'allow' ? t('serverFirewall.allow') : t('serverFirewall.block'),
                                    className:
                                        rule.type === 'allow'
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-500 border-red-500/20',
                                },
                                {
                                    label: rule.protocol.toUpperCase(),
                                    className: 'bg-secondary text-secondary-foreground border-border',
                                },
                            ]}
                            description={
                                <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
                                    <div className='flex items-center gap-2 text-muted-foreground'>
                                        <span className='text-[10px] font-black uppercase tracking-widest opacity-60 bg-secondary px-2 py-0.5 rounded-md border border-border/50'>
                                            {t('serverFirewall.priority')} {rule.priority}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-2 text-muted-foreground ml-auto sm:ml-0 opacity-60'>
                                        <span className='text-[10px] font-black uppercase tracking-widest italic'>
                                            {new Date(rule.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            }
                            actions={
                                canManage && (
                                    <div className='flex items-center gap-2 sm:self-center'>
                                        <Button variant='glass' size='sm' onClick={() => openEditModal(rule)}>
                                            <Pencil className='h-3.5 w-3.5 mr-1.5' />
                                            <span className='hidden sm:inline'>{t('common.edit')}</span>
                                        </Button>
                                        <Button variant='destructive' size='sm' onClick={() => promptDelete(rule)}>
                                            <Trash2 className='h-3.5 w-3.5 mr-1.5' />
                                            <span className='hidden sm:inline'>{t('common.delete')}</span>
                                        </Button>
                                    </div>
                                )
                            }
                        />
                    ))}
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-firewall', 'after-rules-list')} />

            <HeadlessModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={isEditing ? t('serverFirewall.editRule') : t('serverFirewall.createRule')}
                description={t('serverFirewall.drawerDescription')}
            >
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label>{t('serverFirewall.allocation')}</Label>
                        <HeadlessSelect
                            value={selectedAllocationId}
                            onChange={handleAllocationChange}
                            options={allocationOptions}
                            placeholder={t('serverFirewall.allocationPlaceholder')}
                            disabled={saving || allocations.length === 0}
                        />
                        <p className='text-xs text-muted-foreground'>{t('serverFirewall.allocationHelp')}</p>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverFirewall.remoteIp')}</Label>
                        <Input
                            value={formData.remote_ip}
                            onChange={(e) => setFormData((prev) => ({ ...prev, remote_ip: e.target.value }))}
                            placeholder={t('serverFirewall.remoteIpPlaceholder')}
                            disabled={saving}
                        />
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label>{t('serverFirewall.priority')}</Label>
                            <Input
                                type='number'
                                value={formData.priority}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, priority: parseInt(e.target.value) || 0 }))
                                }
                                min={1}
                                max={10000}
                                disabled={saving}
                            />
                            <p className='text-xs text-muted-foreground'>{t('serverFirewall.priorityHelp')}</p>
                        </div>

                        <div className='space-y-2'>
                            <Label>{t('serverFirewall.type')}</Label>
                            <HeadlessSelect
                                value={formData.type || 'allow'}
                                onChange={(val) => setFormData((prev) => ({ ...prev, type: val as 'allow' | 'block' }))}
                                options={typeOptions}
                                disabled={saving}
                            />
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t('serverFirewall.protocol')}</Label>
                        <HeadlessSelect
                            value={formData.protocol || 'tcp'}
                            onChange={(val) => setFormData((prev) => ({ ...prev, protocol: val as 'tcp' | 'udp' }))}
                            options={protocolOptions}
                            disabled={saving}
                        />
                    </div>

                    <div className='flex justify-end gap-2 mt-4'>
                        <Button variant='outline' onClick={() => setIsModalOpen(false)} disabled={saving} type='button'>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSave} disabled={saving} type='button'>
                            {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                            {t('common.save')}
                        </Button>
                    </div>
                </div>
            </HeadlessModal>

            <HeadlessModal
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                title={t('serverFirewall.confirmDeleteTitle')}
                description={t('serverFirewall.confirmDeleteDescription')}
            >
                <div className='flex justify-end gap-2 mt-4'>
                    <Button variant='outline' onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={handleDelete} disabled={deleting}>
                        {deleting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                        {t('serverFirewall.confirmDelete')}
                    </Button>
                </div>
            </HeadlessModal>
            <WidgetRenderer widgets={getWidgets('server-firewall', 'bottom-of-page')} />
        </div>
    );
}
