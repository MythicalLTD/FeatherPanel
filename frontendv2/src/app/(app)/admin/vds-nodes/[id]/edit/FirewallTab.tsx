/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    ArrowDownLeft,
    ArrowUpRight,
    AlertTriangle,
    Globe,
    Loader2,
    Plus,
    RefreshCw,
    Shield,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';

interface Rule {
    pos: number;
    type: 'in' | 'out';
    action: 'ACCEPT' | 'DROP' | 'REJECT';
    proto: string;
    dport: string;
    source: string;
    comment: string;
    enabled: boolean;
}

interface FirewallState {
    pve_node: string;
    available_nodes: string[];
    enabled: boolean;
    policy_in: string;
    policy_out: string;
    rules: Rule[];
    cluster_enabled: boolean | null;
}

type Policy = 'ACCEPT' | 'DROP' | 'REJECT';

const EMPTY_RULE = {
    type: 'in' as 'in' | 'out',
    action: 'ACCEPT' as Policy,
    proto: 'tcp',
    dport: '',
    source: '',
    comment: '',
};

const ACTION_STYLE: Record<string, string> = {
    ACCEPT: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    DROP: 'bg-red-500/10 text-red-700 dark:text-red-400',
    REJECT: 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
};

function Segmented<T extends string>({
    value,
    options,
    onChange,
    label,
    disabled,
    className,
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    label: string;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <div
            role='radiogroup'
            aria-label={label}
            className={cn('bg-muted/50 inline-flex max-w-full flex-wrap rounded-lg p-0.5', className)}
        >
            {options.map((o) => {
                const active = value === o.value;
                return (
                    <button
                        key={o.value}
                        type='button'
                        role='radio'
                        aria-checked={active}
                        disabled={disabled}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                            active
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

function OptionRow({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
    return (
        <div className='fp-surface-inset flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
            <div className='min-w-0 space-y-0.5'>
                <p className='text-sm font-medium'>{title}</p>
                <p className='text-muted-foreground text-sm'>{hint}</p>
            </div>
            <div className='shrink-0'>{children}</div>
        </div>
    );
}

export function FirewallTab({ nodeId }: { nodeId: string }) {
    const { t } = useTranslation();
    const [pveNode, setPveNode] = useState('');
    const [state, setState] = useState<FirewallState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [rule, setRule] = useState(EMPTY_RULE);
    const [remove, setRemove] = useState<Rule | null>(null);

    const policyOptions: { value: Policy; label: string }[] = [
        { value: 'ACCEPT', label: t('admin.vdsNodes.firewall_tab.actions.accept') },
        { value: 'DROP', label: t('admin.vdsNodes.firewall_tab.actions.drop') },
        { value: 'REJECT', label: t('admin.vdsNodes.firewall_tab.actions.reject') },
    ];

    const load = useCallback(
        async (nodeOverride?: string) => {
            setLoading(true);
            try {
                const params: Record<string, string> = {};
                const selected = nodeOverride !== undefined ? nodeOverride : pveNode;
                if (selected) params.pve_node = selected;
                const { data } = await axios.get(`/api/admin/vm-nodes/${nodeId}/firewall`, { params });
                const next = data.data as FirewallState;
                setState(next);
                setPveNode(next.pve_node);
                setError(null);
            } catch (err) {
                setError(getApiErrorMessage(err, t, 'admin.vdsNodes.firewall_tab.fetch_failed'));
                setState(null);
            } finally {
                setLoading(false);
            }
        },
        [nodeId, pveNode, t],
    );

    useEffect(() => {
        void load(undefined);
        // Initial load only — subsequent refreshes go through load()/node picker.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    const run = async (fn: () => Promise<unknown>, success: string, fail: string) => {
        setBusy(true);
        try {
            await fn();
            toast.success(t(success));
            await load();
            return true;
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, fail));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const setOptions = (body: Record<string, unknown>) =>
        run(
            () =>
                axios.put(`/api/admin/vm-nodes/${nodeId}/firewall/options`, body, {
                    params: pveNode ? { pve_node: pveNode } : undefined,
                }),
            'admin.vdsNodes.firewall_tab.updated',
            'admin.vdsNodes.firewall_tab.update_failed',
        );

    if (loading && !state && !error) {
        return (
            <PageCard title={t('admin.vdsNodes.firewall_tab.title')} icon={Shield}>
                <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    {t('common.loading')}
                </div>
            </PageCard>
        );
    }

    if (!state) {
        return (
            <PageCard title={t('admin.vdsNodes.firewall_tab.title')} icon={Shield}>
                <EmptyState
                    icon={Shield}
                    title={t('admin.vdsNodes.firewall_tab.unavailable')}
                    description={error ?? ''}
                />
                <div className='mt-4'>
                    <Button variant='outline' onClick={() => void load()}>
                        <RefreshCw className='mr-2 h-4 w-4' />
                        {t('navigation.items.refresh')}
                    </Button>
                </div>
            </PageCard>
        );
    }

    const policyIn = (['ACCEPT', 'DROP', 'REJECT'].includes(state.policy_in) ? state.policy_in : 'ACCEPT') as Policy;
    const policyOut = (['ACCEPT', 'DROP', 'REJECT'].includes(state.policy_out) ? state.policy_out : 'ACCEPT') as Policy;

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.vdsNodes.firewall_tab.title')}
                description={t('admin.vdsNodes.firewall_tab.description')}
                icon={Shield}
                action={
                    <div className='flex flex-wrap items-center gap-2'>
                        {state.available_nodes.length > 1 && (
                            <Segmented
                                label={t('admin.vdsNodes.firewall_tab.pve_node')}
                                value={state.pve_node}
                                options={state.available_nodes.map((n) => ({ value: n, label: n }))}
                                disabled={busy || loading}
                                onChange={(n) => {
                                    setPveNode(n);
                                    void load(n);
                                }}
                            />
                        )}
                        <Button variant='outline' size='sm' onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('navigation.items.refresh')}</span>
                        </Button>
                        <Button size='sm' onClick={() => setAddOpen(true)} disabled={busy}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.vdsNodes.firewall_tab.add_rule')}
                        </Button>
                    </div>
                }
            >
                {state.cluster_enabled === false && (
                    <div className='mb-4 flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm'>
                        <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-600' />
                        <p className='text-amber-900 dark:text-amber-100'>
                            {t('admin.vdsNodes.firewall_tab.cluster_disabled_hint')}
                        </p>
                    </div>
                )}

                <div className='border-border/40 bg-muted/20 mb-4 flex gap-3 rounded-xl border p-3 text-sm'>
                    <AlertTriangle className='text-muted-foreground mt-0.5 h-4 w-4 shrink-0' />
                    <p className='text-muted-foreground'>{t('admin.vdsNodes.firewall_tab.host_warning')}</p>
                </div>

                <div className='space-y-3'>
                    <OptionRow
                        title={t('admin.vdsNodes.firewall_tab.enabled')}
                        hint={t('admin.vdsNodes.firewall_tab.enabled_hint')}
                    >
                        <Switch
                            checked={state.enabled}
                            disabled={busy}
                            onCheckedChange={(v) => void setOptions({ enabled: v, pve_node: pveNode })}
                        />
                    </OptionRow>

                    <OptionRow
                        title={t('admin.vdsNodes.firewall_tab.policy_in')}
                        hint={t('admin.vdsNodes.firewall_tab.policy_in_hint')}
                    >
                        <Segmented
                            label={t('admin.vdsNodes.firewall_tab.policy_in')}
                            value={policyIn}
                            options={policyOptions}
                            disabled={busy}
                            onChange={(v) => void setOptions({ policy_in: v, pve_node: pveNode })}
                        />
                    </OptionRow>

                    <OptionRow
                        title={t('admin.vdsNodes.firewall_tab.policy_out')}
                        hint={t('admin.vdsNodes.firewall_tab.policy_out_hint')}
                    >
                        <Segmented
                            label={t('admin.vdsNodes.firewall_tab.policy_out')}
                            value={policyOut}
                            options={policyOptions}
                            disabled={busy}
                            onChange={(v) => void setOptions({ policy_out: v, pve_node: pveNode })}
                        />
                    </OptionRow>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.vdsNodes.firewall_tab.rules_title')}
                description={t('admin.vdsNodes.firewall_tab.rules_description', {
                    node: state.pve_node,
                    count: String(state.rules.length),
                })}
                icon={ShieldCheck}
            >
                {state.rules.length === 0 ? (
                    <EmptyState
                        icon={Shield}
                        title={t('admin.vdsNodes.firewall_tab.empty_title')}
                        description={t('admin.vdsNodes.firewall_tab.empty_description')}
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-3'>
                        {state.rules.map((r) => (
                            <ResourceCard
                                key={r.pos}
                                icon={r.type === 'in' ? ArrowDownLeft : ArrowUpRight}
                                title={`${r.type === 'in' ? t('admin.vdsNodes.firewall_tab.in') : t('admin.vdsNodes.firewall_tab.out')} · ${(r.proto || t('admin.vdsNodes.firewall_tab.any')).toUpperCase()}${r.dport ? ' :' + r.dport : ''}`}
                                description={
                                    <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm'>
                                        <span className='bg-muted/60 border-border/50 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs'>
                                            <Globe className='h-3 w-3 opacity-60' />
                                            {r.source || t('admin.vdsNodes.firewall_tab.anywhere')}
                                        </span>
                                        {r.comment && <span className='truncate'>{r.comment}</span>}
                                    </div>
                                }
                                badges={
                                    <span
                                        className={cn(
                                            'rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide',
                                            ACTION_STYLE[r.action],
                                        )}
                                    >
                                        {t(`admin.vdsNodes.firewall_tab.actions.${r.action.toLowerCase()}`)}
                                    </span>
                                }
                                actions={
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={busy}
                                        className='text-red-500 hover:bg-red-500/10'
                                        onClick={() => setRemove(r)}
                                        aria-label={t('admin.vdsNodes.firewall_tab.delete_rule')}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                }
                            />
                        ))}
                    </div>
                )}
            </PageCard>

            <Dialog open={addOpen} onOpenChange={(o) => !busy && setAddOpen(o)} className='max-w-md space-y-4'>
                <DialogHeader>
                    <DialogTitle>{t('admin.vdsNodes.firewall_tab.add_rule')}</DialogTitle>
                    <DialogDescription>{t('admin.vdsNodes.firewall_tab.add_rule_description')}</DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>{t('admin.vdsNodes.firewall_tab.direction')}</p>
                        <Segmented
                            label={t('admin.vdsNodes.firewall_tab.direction')}
                            value={rule.type}
                            options={[
                                { value: 'in', label: t('admin.vdsNodes.firewall_tab.in') },
                                { value: 'out', label: t('admin.vdsNodes.firewall_tab.out') },
                            ]}
                            onChange={(type) => setRule({ ...rule, type })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>{t('admin.vdsNodes.firewall_tab.action')}</p>
                        <Segmented
                            label={t('admin.vdsNodes.firewall_tab.action')}
                            value={rule.action}
                            options={policyOptions}
                            onChange={(action) => setRule({ ...rule, action })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>{t('admin.vdsNodes.firewall_tab.protocol')}</p>
                        <Segmented
                            label={t('admin.vdsNodes.firewall_tab.protocol')}
                            value={rule.proto || ''}
                            options={[
                                { value: '', label: t('admin.vdsNodes.firewall_tab.any') },
                                { value: 'tcp', label: 'TCP' },
                                { value: 'udp', label: 'UDP' },
                                { value: 'icmp', label: 'ICMP' },
                                { value: 'ipv6-icmp', label: 'ICMPv6' },
                            ]}
                            onChange={(proto) =>
                                setRule({
                                    ...rule,
                                    proto,
                                    dport: ['tcp', 'udp'].includes(proto) ? rule.dport : '',
                                })
                            }
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <label className='text-sm font-medium' htmlFor='node-fw-ports'>
                            {t('admin.vdsNodes.firewall_tab.ports')}
                        </label>
                        <Input
                            id='node-fw-ports'
                            value={rule.dport}
                            placeholder='22,8006'
                            disabled={!['tcp', 'udp'].includes(rule.proto)}
                            onChange={(e) => setRule({ ...rule, dport: e.target.value })}
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <label className='text-sm font-medium' htmlFor='node-fw-source'>
                            {t('admin.vdsNodes.firewall_tab.source')}
                        </label>
                        <Input
                            id='node-fw-source'
                            value={rule.source}
                            placeholder={t('admin.vdsNodes.firewall_tab.source_placeholder')}
                            onChange={(e) => setRule({ ...rule, source: e.target.value })}
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <label className='text-sm font-medium' htmlFor='node-fw-comment'>
                            {t('admin.vdsNodes.firewall_tab.comment')}
                        </label>
                        <Input
                            id='node-fw-comment'
                            value={rule.comment}
                            maxLength={80}
                            onChange={(e) => setRule({ ...rule, comment: e.target.value })}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant='outline' onClick={() => setAddOpen(false)} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        disabled={busy}
                        onClick={async () => {
                            const ok = await run(
                                () =>
                                    axios.post(
                                        `/api/admin/vm-nodes/${nodeId}/firewall/rules`,
                                        { ...rule, pve_node: pveNode },
                                        { params: pveNode ? { pve_node: pveNode } : undefined },
                                    ),
                                'admin.vdsNodes.firewall_tab.rule_added',
                                'admin.vdsNodes.firewall_tab.rule_add_failed',
                            );
                            if (ok) {
                                setAddOpen(false);
                                setRule(EMPTY_RULE);
                            }
                        }}
                    >
                        {busy && <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />}
                        {t('admin.vdsNodes.firewall_tab.add_rule')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <ConfirmDialog
                open={remove !== null}
                onOpenChange={(o) => !o && setRemove(null)}
                title={t('admin.vdsNodes.firewall_tab.delete_rule')}
                description={t('admin.vdsNodes.firewall_tab.delete_confirm')}
                confirmLabel={t('admin.vdsNodes.firewall_tab.delete_rule')}
                cancelLabel={t('common.cancel')}
                loading={busy}
                destructive
                onConfirm={async () => {
                    if (!remove) return;
                    const ok = await run(
                        () =>
                            axios.delete(`/api/admin/vm-nodes/${nodeId}/firewall/rules/${remove.pos}`, {
                                params: pveNode ? { pve_node: pveNode } : undefined,
                            }),
                        'admin.vdsNodes.firewall_tab.rule_deleted',
                        'admin.vdsNodes.firewall_tab.rule_delete_failed',
                    );
                    if (ok) setRemove(null);
                }}
            />
        </div>
    );
}
