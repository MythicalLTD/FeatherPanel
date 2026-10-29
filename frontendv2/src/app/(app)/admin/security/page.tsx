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
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';
import { KeyRound, Lock, Network, ShieldCheck, BellRing, Save } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import Permissions from '@/lib/permissions';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { parseApiDate } from '@/lib/dateUtils';

interface Policy {
    require_2fa_role_ids: number[];
    require_2fa_admins: boolean;
    require_2fa_grace_days: number;
    require_2fa_since: string | null;
    password_min_length: number;
    password_require_upper: boolean;
    password_require_lower: boolean;
    password_require_number: boolean;
    password_require_symbol: boolean;
    ip_allow_list: string;
    ip_allow_scope: 'admins' | 'all';
    new_login_alerts: boolean;
}

interface Role {
    id: number;
    name: string;
    display_name: string;
    color?: string;
}

function Section({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <section className='fp-surface rounded-2xl border p-5'>
            <div className='mb-4 flex items-start gap-3'>
                <div className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'>
                    <Icon className='h-4 w-4' />
                </div>
                <div>
                    <h2 className='font-semibold'>{title}</h2>
                    <p className='text-muted-foreground text-sm'>{description}</p>
                </div>
            </div>
            {children}
        </section>
    );
}

function ToggleRow({
    id,
    label,
    checked,
    onChange,
    disabled,
}: {
    id: string;
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className='flex items-center justify-between gap-4 py-2'>
            <label htmlFor={id} className='text-sm'>
                {label}
            </label>
            <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
        </div>
    );
}

export default function SecurityCenterPage() {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const canEdit = hasPermission(Permissions.ADMIN_SETTINGS_EDIT);
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [yourIp, setYourIp] = useState('');
    const [stats, setStats] = useState<{ users: number; with_2fa: number } | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const [{ data }, rolesRes] = await Promise.all([
                axios.get('/api/admin/security-center'),
                axios.get('/api/admin/roles', { params: { limit: 100 } }).catch(() => null),
            ]);
            setPolicy(data.data.policy);
            setYourIp(data.data.your_ip ?? '');
            setStats(data.data.stats ?? null);
            const rawRoles = rolesRes?.data?.data?.roles ?? [];
            const list = (Array.isArray(rawRoles) ? rawRoles : Object.values(rawRoles)) as Role[];
            setRoles(list.map((r) => ({ ...r, id: Number(r.id) })));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminSecurity.loadFailed'));
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const update = <K extends keyof Policy>(key: K, value: Policy[K]) =>
        setPolicy((current) => (current ? { ...current, [key]: value } : current));

    const toggleRole = (id: number) => {
        if (!policy) return;
        const ids = policy.require_2fa_role_ids.includes(id)
            ? policy.require_2fa_role_ids.filter((r) => r !== id)
            : [...policy.require_2fa_role_ids, id];
        update('require_2fa_role_ids', ids);
    };

    const save = async () => {
        if (!policy) return;
        setSaving(true);
        try {
            const { data } = await axios.put('/api/admin/security-center', policy);
            setPolicy(data.data.policy);
            toast.success(t('adminSecurity.saved'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminSecurity.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('adminSecurity.title')}
                description={t('adminSecurity.description')}
                icon={ShieldCheck}
                actions={
                    canEdit ? (
                        <Button onClick={save} disabled={!policy || saving} loading={saving}>
                            <Save className='mr-2 h-4 w-4' />
                            {t('common.save')}
                        </Button>
                    ) : undefined
                }
            />

            {!policy ? (
                <div className='text-muted-foreground py-12 text-center text-sm'>{t('common.loading')}</div>
            ) : (
                <div className='grid gap-6 lg:grid-cols-2'>
                    <Section
                        icon={KeyRound}
                        title={t('adminSecurity.twoFactor.title')}
                        description={t('adminSecurity.twoFactor.description')}
                    >
                        {stats && (
                            <p className='text-muted-foreground mb-3 text-xs'>
                                {t('adminSecurity.twoFactor.adoption', {
                                    count: String(stats.with_2fa),
                                    total: String(stats.users),
                                })}
                            </p>
                        )}
                        <ToggleRow
                            id='tfa-admins'
                            label={t('adminSecurity.twoFactor.requireAdmins')}
                            checked={policy.require_2fa_admins}
                            onChange={(v) => update('require_2fa_admins', v)}
                            disabled={!canEdit}
                        />
                        <div className='flex items-center justify-between gap-4 py-2'>
                            <label htmlFor='tfa-grace' className='text-sm'>
                                {t('adminSecurity.twoFactor.graceDays')}
                            </label>
                            <Input
                                id='tfa-grace'
                                type='number'
                                min={0}
                                max={30}
                                className='w-24'
                                disabled={!canEdit}
                                value={policy.require_2fa_grace_days}
                                onChange={(e) =>
                                    update(
                                        'require_2fa_grace_days',
                                        Math.max(0, Math.min(30, Number(e.target.value) || 0)),
                                    )
                                }
                            />
                        </div>
                        <p className='text-muted-foreground mb-3 text-xs'>
                            {policy.require_2fa_since && policy.require_2fa_grace_days > 0
                                ? t('adminSecurity.twoFactor.graceSince', {
                                      date: parseApiDate(policy.require_2fa_since)?.toLocaleString() ?? '',
                                  })
                                : t('adminSecurity.twoFactor.graceHint')}
                        </p>
                        <p className='mb-2 text-sm font-medium'>{t('adminSecurity.twoFactor.rolesLabel')}</p>
                        <div className='flex flex-wrap gap-2'>
                            {roles.length === 0 && (
                                <p className='text-muted-foreground text-sm'>{t('adminSecurity.twoFactor.noRoles')}</p>
                            )}
                            {roles.map((role) => {
                                const active = policy.require_2fa_role_ids.includes(role.id);
                                return (
                                    <button
                                        key={role.id}
                                        type='button'
                                        disabled={!canEdit}
                                        onClick={() => toggleRole(role.id)}
                                        aria-pressed={active}
                                        className={cn(
                                            'rounded-full border px-3 py-1 text-sm transition-colors',
                                            active
                                                ? 'border-primary bg-primary/15 text-primary'
                                                : 'border-border hover:bg-muted/50 text-muted-foreground',
                                        )}
                                    >
                                        {role.display_name || role.name}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    <Section
                        icon={Lock}
                        title={t('adminSecurity.password.title')}
                        description={t('adminSecurity.password.description')}
                    >
                        <div className='flex items-center justify-between gap-4 py-2'>
                            <label htmlFor='pw-min' className='text-sm'>
                                {t('adminSecurity.password.minLength')}
                            </label>
                            <Input
                                id='pw-min'
                                type='number'
                                min={8}
                                max={128}
                                className='w-24'
                                disabled={!canEdit}
                                value={policy.password_min_length}
                                onChange={(e) => update('password_min_length', Number(e.target.value) || 8)}
                            />
                        </div>
                        <ToggleRow
                            id='pw-upper'
                            label={t('adminSecurity.password.upper')}
                            checked={policy.password_require_upper}
                            onChange={(v) => update('password_require_upper', v)}
                            disabled={!canEdit}
                        />
                        <ToggleRow
                            id='pw-lower'
                            label={t('adminSecurity.password.lower')}
                            checked={policy.password_require_lower}
                            onChange={(v) => update('password_require_lower', v)}
                            disabled={!canEdit}
                        />
                        <ToggleRow
                            id='pw-number'
                            label={t('adminSecurity.password.number')}
                            checked={policy.password_require_number}
                            onChange={(v) => update('password_require_number', v)}
                            disabled={!canEdit}
                        />
                        <ToggleRow
                            id='pw-symbol'
                            label={t('adminSecurity.password.symbol')}
                            checked={policy.password_require_symbol}
                            onChange={(v) => update('password_require_symbol', v)}
                            disabled={!canEdit}
                        />
                    </Section>

                    <Section
                        icon={Network}
                        title={t('adminSecurity.ip.title')}
                        description={t('adminSecurity.ip.description')}
                    >
                        <Textarea
                            rows={5}
                            disabled={!canEdit}
                            value={policy.ip_allow_list}
                            placeholder={'203.0.113.10\n198.51.100.0/24'}
                            onChange={(e) => update('ip_allow_list', e.target.value)}
                            className='font-mono text-sm'
                        />
                        <p className='text-muted-foreground mt-2 text-xs'>
                            {t('adminSecurity.ip.yourIp', { ip: yourIp })}
                        </p>
                        <div className='mt-3 flex flex-wrap gap-2'>
                            {(['admins', 'all'] as const).map((scope) => (
                                <button
                                    key={scope}
                                    type='button'
                                    disabled={!canEdit}
                                    onClick={() => update('ip_allow_scope', scope)}
                                    aria-pressed={policy.ip_allow_scope === scope}
                                    className={cn(
                                        'rounded-lg border px-3 py-1.5 text-sm',
                                        policy.ip_allow_scope === scope
                                            ? 'border-primary bg-primary/15 text-primary'
                                            : 'border-border text-muted-foreground hover:bg-muted/50',
                                    )}
                                >
                                    {t(`adminSecurity.ip.scope.${scope}`)}
                                </button>
                            ))}
                        </div>
                        <p className='text-muted-foreground mt-4 text-sm'>
                            {t('adminSecurity.ip.denyHint')}{' '}
                            <Link href='/admin/blocked-ips' className='text-primary underline-offset-4 hover:underline'>
                                {t('adminSecurity.ip.denyLink')}
                            </Link>
                        </p>
                    </Section>

                    <Section
                        icon={BellRing}
                        title={t('adminSecurity.alerts.title')}
                        description={t('adminSecurity.alerts.description')}
                    >
                        <ToggleRow
                            id='new-login-alerts'
                            label={t('adminSecurity.alerts.newLogin')}
                            checked={policy.new_login_alerts}
                            onChange={(v) => update('new_login_alerts', v)}
                            disabled={!canEdit}
                        />
                    </Section>
                </div>
            )}
        </div>
    );
}
