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
import { useCallback, useEffect, useState } from 'react';
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
    Zap,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { isReauthCancelled, useVdsReauth } from '@/components/vds/VdsReauth';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { VdsPageHeader } from '@/components/vds/VdsPageHeader';
import { VdsPageLoading } from '@/components/vds/VdsPageLoading';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select-native';
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

const EMPTY_RULE = { type: 'in', action: 'ACCEPT', proto: 'tcp', dport: '', source: '', comment: '' };
const ACTION_STYLE: Record<string, string> = {
    ACCEPT: 'bg-green-500/10 text-green-600 dark:text-green-400',
    DROP: 'bg-red-500/10 text-red-600 dark:text-red-400',
    REJECT: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

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

            <div className='border-border/50 bg-card/50 grid gap-4 rounded-2xl border p-5 md:grid-cols-2'>
                <div className='flex items-start justify-between gap-4'>
                    <div>
                        <p className='flex items-center gap-2 font-semibold'>
                            <ShieldCheck className={cn('h-4 w-4', state.enabled ? 'text-green-500' : 'opacity-50')} />
                            {t('vds.firewall.enabled')}
                        </p>
                        <p className='text-muted-foreground text-sm'>{t('vds.firewall.enabled_hint')}</p>
                    </div>
                    <Switch
                        checked={state.enabled}
                        disabled={!canManage || busy}
                        onCheckedChange={(v) => void setOptions({ enabled: v })}
                    />
                </div>
                <div className='flex items-start justify-between gap-4'>
                    <div>
                        <p className='font-semibold'>{t('vds.firewall.policy_in')}</p>
                        <p className='text-muted-foreground text-sm'>{t('vds.firewall.policy_hint')}</p>
                    </div>
                    <Select
                        className='h-10 w-36'
                        value={state.policy_in}
                        disabled={!canManage || busy || !state.features.allow_policy}
                        onChange={(e) => void setOptions({ policy_in: e.target.value })}
                    >
                        {['ACCEPT', 'DROP', 'REJECT'].map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </Select>
                </div>
                {state.features.presets.length > 0 && (
                    <div className='md:col-span-2'>
                        <p className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                            <Zap className='h-4 w-4' />
                            {t('vds.firewall.presets')}
                        </p>
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
                                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                                        ACTION_STYLE[r.action],
                                    )}
                                >
                                    {r.action}
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
                <div className='grid grid-cols-2 gap-3'>
                    <Select
                        label={t('vds.firewall.direction')}
                        value={rule.type}
                        onChange={(e) => setRule({ ...rule, type: e.target.value })}
                    >
                        <option value='in'>{t('vds.firewall.in')}</option>
                        <option value='out'>{t('vds.firewall.out')}</option>
                    </Select>
                    <Select
                        label={t('vds.firewall.action')}
                        value={rule.action}
                        onChange={(e) => setRule({ ...rule, action: e.target.value })}
                    >
                        {['ACCEPT', 'DROP', 'REJECT'].map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </Select>
                    <Select
                        label={t('vds.firewall.protocol')}
                        value={rule.proto}
                        onChange={(e) => setRule({ ...rule, proto: e.target.value })}
                    >
                        <option value=''>{t('vds.firewall.any')}</option>
                        {['tcp', 'udp', 'icmp', 'ipv6-icmp'].map((p) => (
                            <option key={p} value={p}>
                                {p.toUpperCase()}
                            </option>
                        ))}
                    </Select>
                    <div className='space-y-1.5'>
                        <label className='text-sm font-semibold'>{t('vds.firewall.ports')}</label>
                        <Input
                            value={rule.dport}
                            placeholder='80,443'
                            disabled={!['tcp', 'udp'].includes(rule.proto)}
                            onChange={(e) => setRule({ ...rule, dport: e.target.value })}
                        />
                    </div>
                    <div className='col-span-2 space-y-1.5'>
                        <label className='text-sm font-semibold'>{t('vds.firewall.source')}</label>
                        <Input
                            value={rule.source}
                            placeholder={t('vds.firewall.source_placeholder')}
                            onChange={(e) => setRule({ ...rule, source: e.target.value })}
                        />
                    </div>
                    <div className='col-span-2 space-y-1.5'>
                        <label className='text-sm font-semibold'>{t('vds.firewall.comment')}</label>
                        <Input
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
