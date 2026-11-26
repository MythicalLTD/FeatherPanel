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
import axios from 'axios';
import { toast } from 'sonner';
import {
    Copy,
    Eye,
    History,
    KeyRound,
    Pencil,
    Plus,
    RefreshCw,
    Send,
    ShieldAlert,
    Trash2,
    Webhook as WebhookIcon,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/api-errors';
import Permissions from '@/lib/permissions';
import { copyToClipboard } from '@/lib/utils';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { ResourceCard, ResourceTable, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DELIVERY_TONE, WebhookDeliveriesSheet, eventLabel } from '@/components/admin/webhooks/WebhookDeliveriesSheet';

interface WebhookRow {
    id: number;
    url: string;
    events: string[];
    format: 'json' | 'discord';
    enabled: boolean;
    description: string | null;
    secret_set: boolean;
    secret_hint: string | null;
    last_delivery_at: string | null;
    last_delivery_status: 'delivered' | 'failed' | null;
    created_at: string;
    updated_at: string;
    stats_24h?: { pending: number; delivered: number; failed: number };
}

interface EventDef {
    event: string;
    group: string;
}

interface WebhookSettings {
    allow_private_targets: boolean;
    allow_private_env: boolean;
    max_attempts: number;
    backoff_seconds: number[];
}

const emptyForm = {
    url: '',
    description: '',
    format: 'json' as 'json' | 'discord',
    enabled: true,
    events: [] as string[],
    secret: '',
};

const VERIFY_SNIPPET = `// Node.js: verify an incoming FeatherPanel webhook
const crypto = require('crypto');

function verify(rawBody, headers, secret) {
    const ts = headers['x-featherpanel-timestamp'];
    const sig = headers['x-featherpanel-signature'] || '';
    if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(ts + '.' + rawBody).digest('hex');
    return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}`;

function hostOf(url: string): string {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

export default function AdminWebhooksPage() {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const dateOpts = useDateFormatOptions();
    const canManage = hasPermission(Permissions.ADMIN_WEBHOOKS_MANAGE);

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<WebhookRow[]>([]);
    const [events, setEvents] = useState<EventDef[]>([]);
    const [settings, setSettings] = useState<WebhookSettings | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [secret, setSecret] = useState<string | null>(null);
    const [secretHint, setSecretHint] = useState<string | null>(null);
    const [secretBusy, setSecretBusy] = useState(false);

    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [deliveriesFor, setDeliveriesFor] = useState<WebhookRow | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/webhooks');
            setRows((data?.data?.webhooks || []) as WebhookRow[]);
            setEvents((data?.data?.events || []) as EventDef[]);
            setSettings((data?.data?.settings || null) as WebhookSettings | null);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const groups = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const e of events) {
            map.set(e.group, [...(map.get(e.group) || []), e.event]);
        }
        return Array.from(map.entries());
    }, [events]);

    const allEvents = form.events.includes('*');

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setSecret(null);
        setSecretHint(null);
        setSheetOpen(true);
    };

    const openEdit = (row: WebhookRow) => {
        setEditingId(row.id);
        setForm({
            url: row.url,
            description: row.description || '',
            format: row.format,
            enabled: row.enabled,
            events: row.events,
            secret: '',
        });
        setSecret(null);
        setSecretHint(row.secret_hint);
        setSheetOpen(true);
    };

    const toggleEvent = (event: string) => {
        setForm((f) => ({
            ...f,
            events: f.events.includes(event) ? f.events.filter((e) => e !== event) : [...f.events, event],
        }));
    };

    const toggleGroup = (groupEvents: string[], on: boolean) => {
        setForm((f) => ({
            ...f,
            events: on
                ? Array.from(new Set([...f.events.filter((e) => e !== '*'), ...groupEvents]))
                : f.events.filter((e) => !groupEvents.includes(e)),
        }));
    };

    const save = async () => {
        if (!form.url.trim()) {
            toast.error(t('admin.webhooks.form.urlRequired'));
            return;
        }
        if (form.events.length === 0) {
            toast.error(t('admin.webhooks.form.eventsRequired'));
            return;
        }
        setSaving(true);
        const body: Record<string, unknown> = {
            url: form.url.trim(),
            description: form.description.trim() || null,
            format: form.format,
            enabled: form.enabled,
            events: form.events,
        };
        if (editingId === null && form.secret.trim() !== '') {
            body.secret = form.secret.trim();
        }
        try {
            if (editingId === null) {
                const { data } = await axios.post('/api/admin/webhooks', body);
                const created = data.data.webhook as WebhookRow;
                setEditingId(created.id);
                setSecret(data.data.secret as string);
                setSecretHint(created.secret_hint);
                toast.success(t('admin.webhooks.created'));
            } else {
                await axios.patch(`/api/admin/webhooks/${editingId}`, body);
                toast.success(t('admin.webhooks.updated'));
                setSheetOpen(false);
            }
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const revealSecret = async () => {
        if (editingId === null) return;
        setSecretBusy(true);
        try {
            const { data } = await axios.get(`/api/admin/webhooks/${editingId}/secret`);
            setSecret(data.data.secret as string);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.secret.loadFailed'));
        } finally {
            setSecretBusy(false);
        }
    };

    const rotateSecret = async () => {
        if (editingId === null) return;
        if (!window.confirm(t('admin.webhooks.secret.rotateConfirm'))) return;
        setSecretBusy(true);
        try {
            const { data } = await axios.post(`/api/admin/webhooks/${editingId}/rotate-secret`);
            setSecret(data.data.secret as string);
            setSecretHint((data.data.webhook as WebhookRow).secret_hint);
            toast.success(t('admin.webhooks.secret.rotated'));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.secret.rotateFailed'));
        } finally {
            setSecretBusy(false);
        }
    };

    const remove = async (id: number) => {
        try {
            await axios.delete(`/api/admin/webhooks/${id}`);
            toast.success(t('admin.webhooks.deleted'));
            setConfirmDeleteId(null);
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.deleteFailed'));
        }
    };

    const sendTest = async (row: WebhookRow) => {
        setTestingId(row.id);
        try {
            const { data } = await axios.post(`/api/admin/webhooks/${row.id}/test`);
            const delivery = data?.data?.delivery;
            if (data?.data?.ok) {
                toast.success(t('admin.webhooks.test.ok', { code: String(delivery?.status_code ?? '') }));
            } else {
                toast.error(
                    t('admin.webhooks.test.failed', {
                        error: delivery?.error || String(delivery?.status_code ?? ''),
                    }),
                );
            }
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.test.error'));
        } finally {
            setTestingId(null);
        }
    };

    const setAllowPrivate = async (value: boolean) => {
        setSavingSettings(true);
        try {
            const { data } = await axios.put('/api/admin/webhooks/settings', { allow_private_targets: value });
            setSettings(data.data.settings as WebhookSettings);
            toast.success(t('admin.webhooks.settings.saved'));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.settings.saveFailed'));
        } finally {
            setSavingSettings(false);
        }
    };

    const badgesFor = (row: WebhookRow): ResourceBadge[] => {
        const badges: ResourceBadge[] = [
            row.enabled
                ? {
                      label: t('admin.webhooks.enabled'),
                      className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  }
                : { label: t('admin.webhooks.disabled'), className: 'border-border bg-muted/40 text-muted-foreground' },
            {
                label:
                    row.format === 'discord' ? t('admin.webhooks.formats.discord') : t('admin.webhooks.formats.json'),
                className: 'border-border bg-muted/40 text-muted-foreground',
            },
            {
                label: row.events.includes('*')
                    ? t('admin.webhooks.allEvents')
                    : t('admin.webhooks.eventCount', { count: String(row.events.length) }),
                className: 'border-primary/25 bg-primary/10 text-primary',
            },
        ];
        if (row.last_delivery_status) {
            badges.push({
                label: t(`admin.webhooks.lastDelivery.${row.last_delivery_status}`),
                className: DELIVERY_TONE[row.last_delivery_status],
            });
        }
        return badges;
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.webhooks.title')}
                description={t('admin.webhooks.description')}
                icon={WebhookIcon}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' size='sm' onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {t('navigation.items.refresh')}
                        </Button>
                        {canManage && (
                            <Button size='sm' onClick={openCreate}>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('admin.webhooks.create')}
                            </Button>
                        )}
                    </div>
                }
            />

            {loading ? (
                <TableSkeleton count={3} />
            ) : rows.length === 0 ? (
                <ListEmptyState
                    icon={WebhookIcon}
                    title={t('admin.webhooks.emptyTitle')}
                    description={t('admin.webhooks.emptyDescription')}
                    action={
                        canManage ? (
                            <Button onClick={openCreate}>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('admin.webhooks.create')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <ResourceTable>
                    {rows.map((row) => (
                        <ResourceCard
                            key={row.id}
                            icon={WebhookIcon}
                            title={row.description || hostOf(row.url)}
                            subtitle={<span className='font-mono text-xs [overflow-wrap:anywhere]'>{row.url}</span>}
                            badges={badgesFor(row)}
                            description={
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {t('admin.webhooks.stats24h', {
                                        delivered: String(row.stats_24h?.delivered ?? 0),
                                        failed: String(row.stats_24h?.failed ?? 0),
                                        pending: String(row.stats_24h?.pending ?? 0),
                                    })}
                                    {row.last_delivery_at &&
                                        ` · ${t('admin.webhooks.lastDeliveryAt', {
                                            when: formatRelativeTime(row.last_delivery_at, dateOpts),
                                        })}`}
                                </p>
                            }
                            actions={
                                <div className='flex flex-wrap items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => setDeliveriesFor(row)}
                                        title={t('admin.webhooks.deliveries.title')}
                                        aria-label={t('admin.webhooks.deliveries.title')}
                                    >
                                        <History className='h-4 w-4' />
                                    </Button>
                                    {canManage && (
                                        <>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                loading={testingId === row.id}
                                                onClick={() => void sendTest(row)}
                                                title={t('admin.webhooks.test.button')}
                                                aria-label={t('admin.webhooks.test.button')}
                                            >
                                                {testingId !== row.id && <Send className='h-4 w-4' />}
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => openEdit(row)}
                                                title={t('common.edit')}
                                                aria-label={t('common.edit')}
                                            >
                                                <Pencil className='h-4 w-4' />
                                            </Button>
                                            {confirmDeleteId === row.id ? (
                                                <>
                                                    <Button
                                                        size='sm'
                                                        variant='destructive'
                                                        onClick={() => void remove(row.id)}
                                                    >
                                                        {t('common.delete')}
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        onClick={() => setConfirmDeleteId(null)}
                                                    >
                                                        {t('common.cancel')}
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='text-destructive'
                                                    onClick={() => setConfirmDeleteId(row.id)}
                                                    title={t('common.delete')}
                                                    aria-label={t('common.delete')}
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            }
                        />
                    ))}
                </ResourceTable>
            )}

            {settings && (
                <PageCard
                    title={t('admin.webhooks.settings.title')}
                    description={t('admin.webhooks.settings.description', {
                        attempts: String(settings.max_attempts),
                    })}
                    icon={ShieldAlert}
                >
                    <div className='flex items-start justify-between gap-4'>
                        <div className='space-y-1 pr-2'>
                            <Label htmlFor='webhooks-allow-private'>{t('admin.webhooks.settings.allowPrivate')}</Label>
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.webhooks.settings.allowPrivateHelp')}
                            </p>
                            {settings.allow_private_env && (
                                <p className='text-xs text-amber-600 dark:text-amber-400'>
                                    {t('admin.webhooks.settings.allowPrivateEnv')}
                                </p>
                            )}
                        </div>
                        <Switch
                            id='webhooks-allow-private'
                            className='mt-1 shrink-0'
                            checked={settings.allow_private_targets}
                            disabled={!canManage || savingSettings}
                            onCheckedChange={(v) => void setAllowPrivate(v)}
                        />
                    </div>
                </PageCard>
            )}

            <PageCard
                title={t('admin.webhooks.verify.title')}
                description={t('admin.webhooks.verify.description')}
                icon={KeyRound}
            >
                <ul className='text-muted-foreground mb-3 list-disc space-y-1 pl-5 text-sm'>
                    <li>{t('admin.webhooks.verify.headerSignature')}</li>
                    <li>{t('admin.webhooks.verify.headerTimestamp')}</li>
                    <li>{t('admin.webhooks.verify.headerEvent')}</li>
                    <li>{t('admin.webhooks.verify.retries')}</li>
                </ul>
                <pre className='bg-muted/40 overflow-auto rounded-lg p-3 text-xs'>{VERIFY_SNIPPET}</pre>
            </PageCard>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>
                            {editingId === null
                                ? t('admin.webhooks.form.createTitle')
                                : t('admin.webhooks.form.editTitle')}
                        </SheetTitle>
                        <SheetDescription>{t('admin.webhooks.form.hint')}</SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-5'>
                        <div className='space-y-2'>
                            <Label htmlFor='webhook-url'>{t('admin.webhooks.form.url')}</Label>
                            <Input
                                id='webhook-url'
                                value={form.url}
                                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                                placeholder='https://billing.example.com/featherpanel/webhook'
                                className='bg-muted/30 font-mono text-sm'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='webhook-description'>{t('admin.webhooks.form.description')}</Label>
                            <Textarea
                                id='webhook-description'
                                value={form.description}
                                maxLength={255}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder={t('admin.webhooks.form.descriptionPlaceholder')}
                                className='bg-muted/30 min-h-[64px]'
                            />
                        </div>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <Select
                                label={t('admin.webhooks.form.format')}
                                value={form.format}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, format: e.target.value as 'json' | 'discord' }))
                                }
                            >
                                <option value='json'>{t('admin.webhooks.formats.json')}</option>
                                <option value='discord'>{t('admin.webhooks.formats.discord')}</option>
                            </Select>
                            <div className='flex items-center justify-between gap-4 pt-7'>
                                <Label htmlFor='webhook-enabled'>{t('admin.webhooks.form.enabled')}</Label>
                                <Switch
                                    id='webhook-enabled'
                                    checked={form.enabled}
                                    onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
                                />
                            </div>
                        </div>
                        {form.format === 'discord' && (
                            <p className='text-muted-foreground text-xs'>{t('admin.webhooks.form.discordHint')}</p>
                        )}

                        <PageCard
                            title={t('admin.webhooks.form.events')}
                            description={t('admin.webhooks.form.eventsHint')}
                        >
                            <label className='border-border/60 mb-3 flex cursor-pointer items-center gap-3 rounded-lg border p-2'>
                                <Checkbox
                                    checked={allEvents}
                                    onCheckedChange={(v) => setForm((f) => ({ ...f, events: v ? ['*'] : [] }))}
                                />
                                <span className='text-sm font-medium'>{t('admin.webhooks.allEvents')}</span>
                            </label>
                            {!allEvents && (
                                <div className='space-y-4'>
                                    {groups.map(([group, groupEvents]) => {
                                        const on = groupEvents.every((e) => form.events.includes(e));
                                        return (
                                            <div key={group} className='space-y-2'>
                                                <label className='flex cursor-pointer items-center gap-2'>
                                                    <Checkbox
                                                        checked={on}
                                                        onCheckedChange={(v) => toggleGroup(groupEvents, v)}
                                                    />
                                                    <span className='text-xs font-semibold tracking-wide uppercase'>
                                                        {t(`admin.webhooks.groups.${group}`)}
                                                    </span>
                                                </label>
                                                <div className='grid gap-2 sm:grid-cols-2'>
                                                    {groupEvents.map((event) => (
                                                        <label
                                                            key={event}
                                                            className='border-border/60 flex cursor-pointer items-center gap-3 rounded-lg border p-2'
                                                        >
                                                            <Checkbox
                                                                checked={form.events.includes(event)}
                                                                onCheckedChange={() => toggleEvent(event)}
                                                            />
                                                            <span className='min-w-0'>
                                                                <span className='block text-sm'>
                                                                    {eventLabel(event, t)}
                                                                </span>
                                                                <span className='text-muted-foreground block font-mono text-[11px]'>
                                                                    {event}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </PageCard>

                        <PageCard
                            title={t('admin.webhooks.secret.title')}
                            description={t('admin.webhooks.secret.description')}
                        >
                            {editingId === null ? (
                                <div className='space-y-2'>
                                    <Label htmlFor='webhook-secret'>{t('admin.webhooks.secret.custom')}</Label>
                                    <Input
                                        id='webhook-secret'
                                        value={form.secret}
                                        onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                                        placeholder={t('admin.webhooks.secret.customPlaceholder')}
                                        className='bg-muted/30 font-mono text-sm'
                                        autoComplete='off'
                                    />
                                </div>
                            ) : (
                                <div className='space-y-3'>
                                    {secret ? (
                                        <div className='flex items-center gap-2'>
                                            <code
                                                data-fp-sensitive=''
                                                className='bg-muted/40 min-w-0 flex-1 rounded-lg px-3 py-2 font-mono text-xs [overflow-wrap:anywhere]'
                                            >
                                                {secret}
                                            </code>
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                onClick={() => void copyToClipboard(secret, t)}
                                                title={t('admin.webhooks.secret.copy')}
                                                aria-label={t('admin.webhooks.secret.copy')}
                                            >
                                                <Copy className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className='text-muted-foreground font-mono text-sm'>
                                            {secretHint ? `•••• ${secretHint.replace('…', '')}` : '—'}
                                        </p>
                                    )}
                                    <div className='flex flex-wrap gap-2'>
                                        {!secret && (
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                loading={secretBusy}
                                                onClick={() => void revealSecret()}
                                            >
                                                <Eye className='mr-2 h-4 w-4' />
                                                {t('admin.webhooks.secret.reveal')}
                                            </Button>
                                        )}
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            loading={secretBusy}
                                            onClick={() => void rotateSecret()}
                                        >
                                            <RefreshCw className='mr-2 h-4 w-4' />
                                            {t('admin.webhooks.secret.rotate')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </PageCard>
                    </div>

                    <SheetFooter className='mt-8 gap-2 sm:gap-0'>
                        <Button variant='outline' onClick={() => setSheetOpen(false)} disabled={saving}>
                            {editingId !== null && secret ? t('common.close') : t('common.cancel')}
                        </Button>
                        <Button onClick={() => void save()} loading={saving} data-fp-save-shortcut>
                            {editingId === null ? t('admin.webhooks.create') : t('common.save')}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <WebhookDeliveriesSheet
                webhookId={deliveriesFor?.id ?? null}
                webhookUrl={deliveriesFor?.url ?? ''}
                open={deliveriesFor !== null}
                onOpenChange={(open) => !open && setDeliveriesFor(null)}
                canManage={canManage}
            />
        </div>
    );
}
