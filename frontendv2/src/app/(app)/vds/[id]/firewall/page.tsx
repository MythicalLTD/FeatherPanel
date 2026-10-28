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

import { VdsUsagePill } from '@/components/vds/VdsUsagePill';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Globe,
    Loader2,
    Plus,
    RefreshCw,
    Shield,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { isReauthCancelled, useVdsReauth } from '@/components/vds/VdsReauth';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { VdsPageHeader } from '@/components/vds/VdsPageHeader';
import { VdsPageLoading } from '@/components/vds/VdsPageLoading';
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
    enabled: boolean;
    policy_in: string;
    rules: Rule[];
    features: { enabled: boolean; max_rules: number; allow_policy: boolean; presets: string[] };
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

export default function VdsFirewallPage() {
    const { id } = useParams() as { id: string };
    const { t } = useTranslation();
    const withReauth = useVdsReauth();
    const { instance, loading: instanceLoading, hasPermission } = useVmInstance();
    const [state, setState] = useState<FirewallState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [rule, setRule] = useState(EMPTY_RULE);
    const [remove, setRemove] = useState<Rule | null>(null);
    const canManage = hasPermission('firewall');

    const policyOptions: { value: Policy; label: string }[] = [
        { value: 'ACCEPT', label: t('vds.firewall.actions.accept') },
        { value: 'DROP', label: t('vds.firewall.actions.drop') },
        { value: 'REJECT', label: t('vds.firewall.actions.reject') },
    ];

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/firewall`);
            setState(data.data);
            setError(null);
        } catch (err) {
            setError(getApiErrorMessage(err, t, 'vds.firewall.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [id, t]);

    useEffect(() => {
        if (!instanceLoading && instance) void load();
    }, [instanceLoading, instance, load]);

    const run = async (fn: () => Promise<unknown>, success: string, fail: string) => {
        setBusy(true);
        try {
            await fn();
            toast.success(t(success));
            await load();
            return true;
        } catch (err) {
            if (!isReauthCancelled(err)) toast.error(getApiErrorMessage(err, t, fail));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const setOptions = (body: Record<string, unknown>) =>
        run(
            () =>
                withReauth((headers) => axios.put(`/api/user/vm-instances/${id}/firewall/options`, body, { headers })),
            'vds.firewall.updated',
            'vds.firewall.update_failed',
        );

    if (instanceLoading || (loading && !state && !error)) {
        return <VdsPageLoading label={t('common.loading')} />;
    }

    if (!state) {
        return (
            <div className='space-y-6 pb-12'>
                <VdsPageHeader title={t('vds.firewall.title')} description={t('vds.firewall.description')} />
                <EmptyState icon={Shield} title={t('vds.firewall.unavailable')} description={error ?? ''} />
            </div>
        );
    }

    const limitReached = state.rules.length >= state.features.max_rules;
    const policy = (['ACCEPT', 'DROP', 'REJECT'].includes(state.policy_in) ? state.policy_in : 'ACCEPT') as Policy;

    return (
        <div className='space-y-6 pb-12'>
            <VdsPageHeader
                title={t('vds.firewall.title')}
                description={
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                        <span>{t('vds.firewall.description')}</span>
                        <VdsUsagePill used={state.rules.length} max={state.features.max_rules} />
                    </div>
                }
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('navigation.items.refresh')}</span>
                        </Button>
                        <Button onClick={() => setAddOpen(true)} disabled={!canManage || limitReached}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('vds.firewall.add_rule')}
                        </Button>
                    </div>
                }
            />

            <PageCard
                title={t('vds.firewall.options_title')}
                description={t('vds.firewall.options_description')}
                icon={ShieldCheck}
            >
                <div className='space-y-3'>
                    <OptionRow title={t('vds.firewall.enabled')} hint={t('vds.firewall.enabled_hint')}>
                        <Switch
                            checked={state.enabled}
                            disabled={!canManage || busy}
                            onCheckedChange={(v) => void setOptions({ enabled: v })}
                        />
                    </OptionRow>

                    <OptionRow title={t('vds.firewall.policy_in')} hint={t('vds.firewall.policy_hint')}>
                        <Segmented
                            label={t('vds.firewall.policy_in')}
                            value={policy}
                            options={policyOptions}
                            disabled={!canManage || busy || !state.features.allow_policy}
                            onChange={(v) => void setOptions({ policy_in: v })}
                        />
                    </OptionRow>

                    {state.features.presets.length > 0 && (
                        <div className='fp-surface-inset space-y-3 rounded-xl border p-4'>
                            <div>
                                <p className='text-sm font-medium'>{t('vds.firewall.presets')}</p>
                                <p className='text-muted-foreground text-sm'>{t('vds.firewall.presets_hint')}</p>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                {state.features.presets.map((p) => (
                                    <Button
                                        key={p}
                                        variant='outline'
                                        size='sm'
                                        disabled={!canManage || busy}
                                        onClick={() =>
                                            void run(
                                                () => axios.post(`/api/user/vm-instances/${id}/firewall/presets/${p}`),
                                                'vds.firewall.preset_applied',
                                                'vds.firewall.preset_failed',
                                            )
                                        }
                                    >
                                        {t(`vds.firewall.preset.${p}`)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </PageCard>

            {state.rules.length === 0 ? (
                <EmptyState
                    icon={Shield}
                    title={t('vds.firewall.empty_title')}
                    description={t('vds.firewall.empty_description')}
                />
            ) : (
                <div className='grid grid-cols-1 gap-3'>
                    {state.rules.map((r) => (
                        <ResourceCard
                            key={r.pos}
                            icon={r.type === 'in' ? ArrowDownLeft : ArrowUpRight}
                            title={`${r.type === 'in' ? t('vds.firewall.in') : t('vds.firewall.out')} · ${(r.proto || t('vds.firewall.any')).toUpperCase()}${r.dport ? ' :' + r.dport : ''}`}
                            description={
                                <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm'>
                                    <span className='bg-muted/60 border-border/50 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs'>
                                        <Globe className='h-3 w-3 opacity-60' />
                                        {r.source || t('vds.firewall.anywhere')}
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
                                    {t(`vds.firewall.actions.${r.action.toLowerCase()}`)}
                                </span>
                            }
                            actions={
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!canManage}
                                    className='text-red-500 hover:bg-red-500/10'
                                    onClick={() => setRemove(r)}
                                    aria-label={t('vds.firewall.delete_rule')}
                                >
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            }
                        />
                    ))}
                </div>
            )}

            <Dialog open={addOpen} onOpenChange={(o) => !busy && setAddOpen(o)} className='max-w-md space-y-4'>
                <DialogHeader>
                    <DialogTitle>{t('vds.firewall.add_rule')}</DialogTitle>
                    <DialogDescription>{t('vds.firewall.add_rule_description')}</DialogDescription>
                </DialogHeader>
                <div className='space-y-4'>
                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>{t('vds.firewall.direction')}</p>
                        <Segmented
                            label={t('vds.firewall.direction')}
                            value={rule.type}
                            options={[
                                { value: 'in', label: t('vds.firewall.in') },
                                { value: 'out', label: t('vds.firewall.out') },
                            ]}
                            onChange={(type) => setRule({ ...rule, type })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>{t('vds.firewall.action')}</p>
                        <Segmented
                            label={t('vds.firewall.action')}
                            value={rule.action}
                            options={policyOptions}
                            onChange={(action) => setRule({ ...rule, action })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <p className='text-sm font-medium'>{t('vds.firewall.protocol')}</p>
                        <Segmented
                            label={t('vds.firewall.protocol')}
                            value={rule.proto || ''}
                            options={[
                                { value: '', label: t('vds.firewall.any') },
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
                        <label className='text-sm font-medium' htmlFor='fw-ports'>
                            {t('vds.firewall.ports')}
                        </label>
                        <Input
                            id='fw-ports'
                            value={rule.dport}
                            placeholder='80,443'
                            disabled={!['tcp', 'udp'].includes(rule.proto)}
                            onChange={(e) => setRule({ ...rule, dport: e.target.value })}
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <label className='text-sm font-medium' htmlFor='fw-source'>
                            {t('vds.firewall.source')}
                        </label>
                        <Input
                            id='fw-source'
                            value={rule.source}
                            placeholder={t('vds.firewall.source_placeholder')}
                            onChange={(e) => setRule({ ...rule, source: e.target.value })}
                        />
                    </div>
                    <div className='space-y-1.5'>
                        <label className='text-sm font-medium' htmlFor='fw-comment'>
                            {t('vds.firewall.comment')}
                        </label>
                        <Input
                            id='fw-comment'
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
                                () => axios.post(`/api/user/vm-instances/${id}/firewall/rules`, rule),
                                'vds.firewall.rule_added',
                                'vds.firewall.rule_add_failed',
                            );
                            if (ok) {
                                setAddOpen(false);
                                setRule(EMPTY_RULE);
                            }
                        }}
                    >
                        {busy && <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />}
                        {t('vds.firewall.add_rule')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <ConfirmDialog
                open={remove !== null}
                onOpenChange={(o) => !o && setRemove(null)}
                title={t('vds.firewall.delete_rule')}
                description={t('vds.firewall.delete_confirm')}
                confirmLabel={t('vds.firewall.delete_rule')}
                cancelLabel={t('common.cancel')}
                loading={busy}
                destructive
                onConfirm={async () => {
                    if (!remove) return;
                    const ok = await run(
                        () => axios.delete(`/api/user/vm-instances/${id}/firewall/rules/${remove.pos}`),
                        'vds.firewall.rule_deleted',
                        'vds.firewall.rule_delete_failed',
                    );
                    if (ok) setRemove(null);
                }}
            />
        </div>
    );
}
