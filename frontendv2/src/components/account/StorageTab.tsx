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
import axios from 'axios';
import { toast } from 'sonner';
import {
    Cloud,
    Plus,
    RefreshCw,
    Trash2,
    Pencil,
    PlugZap,
    AlertTriangle,
    CheckCircle2,
    Link2,
    Server,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import { formatBytes } from '@/lib/format';
import {
    fetchStorageDestinations,
    isS3Config,
    startStorageOAuth,
    type RelayConfig,
    type StorageCapabilities,
    type StorageDestination,
} from '@/lib/storage-destinations';

interface FormState {
    name: string;
    endpoint: string;
    region: string;
    bucket: string;
    prefix: string;
    access_key: string;
    secret_key: string;
    path_style: boolean;
    // SFTP / WebDAV
    kind: 's3' | 'sftp' | 'webdav';
    host: string;
    port: string;
    username: string;
    password: string;
    private_key: string;
    url: string;
    root: string;
    reset_host_key: boolean;
}

const emptyForm: FormState = {
    name: '',
    endpoint: '',
    region: 'us-east-1',
    bucket: '',
    prefix: 'featherpanel',
    access_key: '',
    secret_key: '',
    path_style: false,
    kind: 's3',
    host: '',
    port: '22',
    username: '',
    password: '',
    private_key: '',
    url: '',
    root: 'featherpanel',
    reset_host_key: false,
};

/** Provider keys the panel can connect through OAuth, in display order. */
const OAUTH_PROVIDERS = ['gdrive', 'dropbox', 'onedrive'] as const;

/** Providers with a credentials form whose traffic the panel relays (enabled by the admin). */
const RELAY_PROVIDERS = ['sftp', 'webdav'] as const;

export default function StorageTab() {
    const { t } = useTranslation();
    const [destinations, setDestinations] = useState<StorageDestination[]>([]);
    const [caps, setCaps] = useState<StorageCapabilities | null>(null);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<StorageDestination | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<StorageDestination | null>(null);
    const [removing, setRemoving] = useState(false);
    const [connectProvider, setConnectProvider] = useState<string | null>(null);
    const [connectName, setConnectName] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [reconnectingId, setReconnectingId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchStorageDestinations();
            setDestinations(res.destinations);
            setCaps(res.capabilities);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.storage.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    // Back from the provider's consent screen: report the result once, then drop the query params.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const connected = params.get('storage_connected');
        const failed = params.get('storage_error');
        if (!connected && !failed) return;
        if (connected) {
            toast.success(t('account.storage.connected'));
        } else if (failed) {
            toast.error(getApiErrorMessageFromPayload({ error_code: failed }, t, 'account.storage.connectFailed'));
        }
        params.delete('storage_connected');
        params.delete('storage_error');
        const qs = params.toString();
        window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }, [t]);

    const openCreate = (kind: FormState['kind'] = 's3') => {
        setEditing(null);
        setForm({ ...emptyForm, kind });
        setFormOpen(true);
    };

    const openEdit = (d: StorageDestination) => {
        setEditing(d);
        if (d.relay && d.config && !isS3Config(d.config)) {
            const c = d.config as RelayConfig;
            setForm({
                ...emptyForm,
                kind: d.provider === 'webdav' ? 'webdav' : 'sftp',
                name: d.name,
                host: c.host ?? '',
                port: String(c.port ?? 22),
                username: c.username ?? '',
                url: c.url ?? '',
                root: c.root ?? '',
            });
            setFormOpen(true);
            return;
        }
        setForm({
            ...emptyForm,
            name: d.name,
            endpoint: isS3Config(d.config) ? d.config.endpoint : '',
            region: isS3Config(d.config) ? d.config.region : '',
            bucket: isS3Config(d.config) ? d.config.bucket : '',
            prefix: isS3Config(d.config) ? d.config.prefix : '',
            path_style: isS3Config(d.config) ? d.config.path_style : false,
        });
        setFormOpen(true);
    };

    const openConnect = (provider: string) => {
        setConnectName(t(`account.storage.providers.${provider}`));
        setConnectProvider(provider);
    };

    const connect = async () => {
        if (!connectProvider) return;
        setConnecting(true);
        try {
            await startStorageOAuth(connectProvider, { name: connectName.trim() });
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.storage.connectFailed'));
            setConnecting(false);
        }
    };

    const reconnect = async (d: StorageDestination) => {
        setReconnectingId(d.id);
        try {
            await startStorageOAuth(d.provider, { reconnect_id: d.id });
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.storage.connectFailed'));
            setReconnectingId(null);
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            if (editing?.oauth) {
                await axios.patch(`/api/user/storage-destinations/${editing.id}`, { name: form.name });
                toast.success(t('account.storage.updated'));
                setFormOpen(false);
                await load();
                return;
            }
            let config: Record<string, unknown>;
            if (form.kind === 'sftp') {
                config = {
                    host: form.host.trim(),
                    port: Number(form.port) || 22,
                    username: form.username.trim(),
                    root: form.root.trim(),
                };
                if (form.private_key.trim() !== '') config.private_key = form.private_key;
                if (form.reset_host_key) config.reset_host_key = true;
            } else if (form.kind === 'webdav') {
                config = { url: form.url.trim(), username: form.username.trim(), root: form.root.trim() };
            } else {
                config = {
                    endpoint: form.endpoint.trim(),
                    region: form.region.trim(),
                    bucket: form.bucket.trim(),
                    prefix: form.prefix.trim(),
                    path_style: form.path_style,
                };
                if (form.access_key.trim() !== '') config.access_key = form.access_key.trim();
                if (form.secret_key !== '') config.secret_key = form.secret_key;
            }
            if (form.kind !== 's3' && form.password !== '') config.password = form.password;
            const { data } = editing
                ? await axios.patch(`/api/user/storage-destinations/${editing.id}`, { name: form.name, config })
                : await axios.post('/api/user/storage-destinations', { name: form.name, provider: form.kind, config });
            const test = data?.data?.test as { ok: boolean; error: string | null } | null;
            if (test && !test.ok) {
                toast.warning(t('account.storage.savedButTestFailed', { error: test.error ?? '' }));
            } else {
                toast.success(editing ? t('account.storage.updated') : t('account.storage.created'));
            }
            setFormOpen(false);
            await load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.storage.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const test = async (d: StorageDestination) => {
        setTestingId(d.id);
        try {
            await axios.post(`/api/user/storage-destinations/${d.id}/test`);
            toast.success(t('account.storage.testOk', { name: d.name }));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.storage.testFailed'));
        } finally {
            setTestingId(null);
            await load();
        }
    };

    const remove = async () => {
        if (!deleting || removing) return;
        setRemoving(true);
        try {
            await axios.delete(`/api/user/storage-destinations/${deleting.id}`);
            toast.success(t('account.storage.deleted'));
            setDeleting(null);
            await load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.storage.deleteFailed'));
        } finally {
            setRemoving(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                    <span className='text-muted-foreground'>{t('account.storage.loading')}</span>
                </div>
            </div>
        );
    }

    const oauthProviders = OAUTH_PROVIDERS.filter((p) => caps?.oauth_providers?.includes(p));
    const relayProviders = RELAY_PROVIDERS.filter((p) => caps?.relay_providers?.includes(p));
    const underLimit = destinations.length < (caps?.max_destinations ?? 0);
    const canAdd = !!caps?.byo_s3 && underLimit;
    const canConnect = oauthProviders.length > 0 && underLimit;
    const relayLocation = (d: StorageDestination) => {
        const c = d.config as RelayConfig;
        const where = d.provider === 'sftp' ? `sftp://${c.username}@${c.host}:${c.port ?? 22}` : (c.url ?? '');
        return c.root ? `${where}/${c.root}` : where;
    };
    const quotaLine = (d: StorageDestination) =>
        d.quota
            ? d.quota.total
                ? t('account.storage.quota', {
                      used: formatBytes(d.quota.used, 1),
                      total: formatBytes(d.quota.total, 1),
                  })
                : t('account.storage.quotaUnlimited', { used: formatBytes(d.quota.used, 1) })
            : t('account.storage.quotaUnknown');
    const field = (key: keyof FormState, label: string, placeholder: string, type = 'text', hint?: string) => (
        <div>
            <Label htmlFor={`storage-${key}`} className='text-foreground'>
                {label}
            </Label>
            <Input
                id={`storage-${key}`}
                type={type}
                value={form[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                autoComplete='off'
                className='mt-2'
            />
            {hint ? <p className='text-muted-foreground mt-1 text-xs'>{hint}</p> : null}
        </div>
    );

    return (
        <div className='space-y-5'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='border-border/50 bg-muted/20 min-w-0 flex-1 rounded-xl border p-4'>
                    <h3 className='text-foreground text-lg font-semibold'>{t('account.storage.title')}</h3>
                    <p className='text-muted-foreground mt-1 text-sm'>{t('account.storage.description')}</p>
                </div>
                <div className='flex flex-wrap gap-2 sm:ml-3 sm:shrink-0 sm:justify-end'>
                    <Button onClick={load} variant='outline' size='sm'>
                        <RefreshCw className='mr-2 h-4 w-4' />
                        {t('account.storage.refresh')}
                    </Button>
                    {caps?.byo_s3 ? (
                        <Button onClick={() => openCreate('s3')} size='sm' disabled={!canAdd}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('account.storage.add')}
                        </Button>
                    ) : null}
                    {relayProviders.map((p) => (
                        <Button
                            key={p}
                            onClick={() => openCreate(p)}
                            size='sm'
                            variant='outline'
                            disabled={!underLimit}
                        >
                            <Server className='mr-2 h-4 w-4' />
                            {t('account.storage.addRelay', { provider: t(`account.storage.providers.${p}`) })}
                        </Button>
                    ))}
                    {oauthProviders.map((p) => (
                        <Button
                            key={p}
                            onClick={() => openConnect(p)}
                            size='sm'
                            variant='outline'
                            disabled={!canConnect}
                        >
                            <Link2 className='mr-2 h-4 w-4' />
                            {t('account.storage.connect', { provider: t(`account.storage.providers.${p}`) })}
                        </Button>
                    ))}
                </div>
            </div>

            {!caps?.byo_enabled ? (
                <div className='border-border bg-muted/20 rounded-lg border-2 border-dashed p-8 text-center'>
                    <Cloud className='text-muted-foreground mx-auto mb-3 h-10 w-10' />
                    <p className='text-muted-foreground text-sm'>{t('account.storage.disabled')}</p>
                </div>
            ) : null}

            {destinations.length === 0 ? (
                !caps?.byo_enabled ? null : (
                    <div className='border-border bg-muted/20 rounded-lg border-2 border-dashed p-12 text-center'>
                        <Cloud className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                        <h4 className='text-foreground mb-2 text-sm font-semibold'>{t('account.storage.empty')}</h4>
                        <p className='text-muted-foreground mb-4 text-sm'>{t('account.storage.emptyHint')}</p>
                        <div className='flex flex-wrap justify-center gap-2'>
                            {canAdd ? (
                                <Button onClick={() => openCreate('s3')} variant='outline'>
                                    {t('account.storage.add')}
                                </Button>
                            ) : null}
                            {canConnect
                                ? oauthProviders.map((p) => (
                                      <Button key={p} onClick={() => openConnect(p)} variant='outline'>
                                          {t('account.storage.connect', {
                                              provider: t(`account.storage.providers.${p}`),
                                          })}
                                      </Button>
                                  ))
                                : null}
                        </div>
                    </div>
                )
            ) : (
                <div className='space-y-3'>
                    {caps?.byo_enabled && !underLimit ? (
                        <p className='text-muted-foreground text-xs'>
                            {t('account.storage.limitReached', { max: String(caps?.max_destinations ?? 0) })}
                        </p>
                    ) : null}
                    {destinations.map((d) => (
                        <div key={d.id} className='fp-surface-inset rounded-xl border p-4'>
                            <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                                <div className='min-w-0 flex-1'>
                                    <h4 className='text-foreground text-sm font-semibold'>{d.name}</h4>
                                    {d.relay && d.config ? (
                                        <>
                                            <p className='text-muted-foreground mt-1 truncate font-mono text-xs'>
                                                {relayLocation(d)}
                                            </p>
                                            {d.provider === 'sftp' && (d.config as RelayConfig).host_key ? (
                                                <p
                                                    className='text-muted-foreground mt-1 truncate font-mono text-xs'
                                                    title={(d.config as RelayConfig).host_key}
                                                >
                                                    {t('account.storage.hostKeyPinned', {
                                                        key: (d.config as RelayConfig).host_key ?? '',
                                                    })}
                                                </p>
                                            ) : null}
                                            <p className='text-muted-foreground mt-1 text-xs'>
                                                {t('account.storage.metaOauth', {
                                                    provider: t(`account.storage.providers.${d.provider}`),
                                                    count: String(d.backups_count),
                                                    quota: quotaLine(d),
                                                })}
                                            </p>
                                        </>
                                    ) : d.oauth || !isS3Config(d.config) ? (
                                        <>
                                            <p className='text-muted-foreground mt-1 truncate text-xs'>
                                                {d.account ?? t('account.storage.accountUnknown')}
                                            </p>
                                            <p className='text-muted-foreground mt-1 text-xs'>
                                                {t('account.storage.metaOauth', {
                                                    provider: t(`account.storage.providers.${d.provider}`),
                                                    count: String(d.backups_count),
                                                    quota: quotaLine(d),
                                                })}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className='text-muted-foreground mt-1 truncate font-mono text-xs'>
                                                {d.config.endpoint} / {d.config.bucket}
                                                {d.config.prefix ? `/${d.config.prefix}` : ''}
                                            </p>
                                            <p className='text-muted-foreground mt-1 text-xs'>
                                                {t('account.storage.meta', {
                                                    provider: d.provider.toUpperCase(),
                                                    count: String(d.backups_count),
                                                    key: d.config.access_key_hint || '-',
                                                })}
                                            </p>
                                        </>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'inline-flex w-fit items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
                                        d.status === 'active'
                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
                                    )}
                                >
                                    {d.status === 'active' ? (
                                        <CheckCircle2 className='h-3.5 w-3.5' />
                                    ) : (
                                        <AlertTriangle className='h-3.5 w-3.5' />
                                    )}
                                    {t(`account.storage.status.${d.status}`)}
                                </span>
                            </div>
                            {d.status !== 'active' && d.last_error ? (
                                <div className='mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs break-words text-red-600 dark:text-red-400'>
                                    {d.last_error}
                                </div>
                            ) : null}
                            <div className='flex flex-wrap gap-2'>
                                {caps?.byo_enabled && d.oauth && d.status !== 'active' ? (
                                    <Button size='sm' onClick={() => reconnect(d)} disabled={reconnectingId === d.id}>
                                        <Link2 className='mr-1 h-4 w-4' />
                                        {t('account.storage.reconnect')}
                                    </Button>
                                ) : null}
                                {caps?.byo_enabled ? (
                                    <>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => test(d)}
                                            disabled={testingId === d.id}
                                        >
                                            <PlugZap className='mr-1 h-4 w-4' />
                                            {testingId === d.id
                                                ? t('account.storage.testing')
                                                : t('account.storage.test')}
                                        </Button>
                                        <Button variant='outline' size='sm' onClick={() => openEdit(d)}>
                                            <Pencil className='mr-1 h-4 w-4' />
                                            {d.oauth ? t('account.storage.rename') : t('account.storage.edit')}
                                        </Button>
                                    </>
                                ) : null}
                                <Button variant='destructive' size='sm' onClick={() => setDeleting(d)}>
                                    <Trash2 className='mr-1 h-4 w-4' />
                                    {t('account.storage.remove')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} className='max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>
                        {editing?.oauth
                            ? t('account.storage.renameTitle')
                            : editing
                              ? t('account.storage.editTitle')
                              : form.kind !== 's3'
                                ? t('account.storage.addRelayTitle', {
                                      provider: t(`account.storage.providers.${form.kind}`),
                                  })
                                : t('account.storage.addTitle')}
                    </DialogTitle>
                    <DialogDescription>
                        {editing?.oauth
                            ? t('account.storage.renameDescription')
                            : form.kind !== 's3'
                              ? t(`account.storage.relayDescription.${form.kind}`)
                              : t('account.storage.formDescription')}
                    </DialogDescription>
                </DialogHeader>
                {!editing?.oauth && form.kind !== 's3' ? (
                    <div className='mb-4 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300'>
                        <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
                        <span>{t('account.storage.relayWarning')}</span>
                    </div>
                ) : null}
                {editing?.oauth ? (
                    field('name', t('account.storage.fields.name'), t('account.storage.fields.namePlaceholder'))
                ) : form.kind !== 's3' ? (
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            {field(
                                'name',
                                t('account.storage.fields.name'),
                                t(`account.storage.fields.namePlaceholderRelay`),
                            )}
                        </div>
                        {form.kind === 'sftp' ? (
                            <>
                                {field('host', t('account.storage.fields.host'), 'backup.example.com')}
                                {field('port', t('account.storage.fields.port'), '22', 'number')}
                            </>
                        ) : (
                            <div className='sm:col-span-2'>
                                {field(
                                    'url',
                                    t('account.storage.fields.webdavUrl'),
                                    'https://cloud.example.com/remote.php/dav/files/me',
                                    'url',
                                    t('account.storage.fields.webdavUrlHint'),
                                )}
                            </div>
                        )}
                        {field('username', t('account.storage.fields.username'), 'backup')}
                        {field(
                            'password',
                            form.kind === 'sftp'
                                ? t('account.storage.fields.passwordOrPassphrase')
                                : t('account.storage.fields.password'),
                            editing ? t('account.storage.fields.keepCurrent') : '••••••••',
                            'password',
                        )}
                        <div className='sm:col-span-2'>
                            {field(
                                'root',
                                t('account.storage.fields.folder'),
                                'featherpanel',
                                'text',
                                t('account.storage.fields.folderHint'),
                            )}
                        </div>
                        {form.kind === 'sftp' ? (
                            <div className='sm:col-span-2'>
                                <Label htmlFor='storage-private_key' className='text-foreground'>
                                    {t('account.storage.fields.privateKey')}
                                </Label>
                                <textarea
                                    id='storage-private_key'
                                    value={form.private_key}
                                    onChange={(e) => setForm((f) => ({ ...f, private_key: e.target.value }))}
                                    placeholder={
                                        editing
                                            ? t('account.storage.fields.keepCurrent')
                                            : '-----BEGIN OPENSSH PRIVATE KEY-----'
                                    }
                                    rows={4}
                                    spellCheck={false}
                                    autoComplete='off'
                                    className='border-input bg-background mt-2 w-full rounded-md border px-3 py-2 font-mono text-xs'
                                />
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {t('account.storage.fields.privateKeyHint')}
                                </p>
                            </div>
                        ) : null}
                        {form.kind === 'sftp' && editing && (editing.config as RelayConfig | null)?.host_key ? (
                            <div className='flex items-end justify-between gap-3 pb-1 sm:col-span-2'>
                                <div className='min-w-0'>
                                    <Label htmlFor='storage-reset-host-key' className='text-foreground'>
                                        {t('account.storage.fields.resetHostKey')}
                                    </Label>
                                    <p className='text-muted-foreground mt-1 truncate font-mono text-xs'>
                                        {(editing.config as RelayConfig).host_key}
                                    </p>
                                </div>
                                <Switch
                                    id='storage-reset-host-key'
                                    checked={form.reset_host_key}
                                    onCheckedChange={(v) => setForm((f) => ({ ...f, reset_host_key: v }))}
                                />
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            {field(
                                'name',
                                t('account.storage.fields.name'),
                                t('account.storage.fields.namePlaceholder'),
                            )}
                        </div>
                        <div className='sm:col-span-2'>
                            {field(
                                'endpoint',
                                t('account.storage.fields.endpoint'),
                                'https://s3.eu-central-1.amazonaws.com',
                                'url',
                                t('account.storage.fields.endpointHint'),
                            )}
                        </div>
                        {field('bucket', t('account.storage.fields.bucket'), 'my-backups')}
                        {field('region', t('account.storage.fields.region'), 'us-east-1')}
                        {field('prefix', t('account.storage.fields.prefix'), 'featherpanel')}
                        <div className='flex items-end justify-between gap-3 pb-1'>
                            <div>
                                <Label htmlFor='storage-path-style' className='text-foreground'>
                                    {t('account.storage.fields.pathStyle')}
                                </Label>
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {t('account.storage.fields.pathStyleHint')}
                                </p>
                            </div>
                            <Switch
                                id='storage-path-style'
                                checked={form.path_style}
                                onCheckedChange={(v) => setForm((f) => ({ ...f, path_style: v }))}
                            />
                        </div>
                        {field(
                            'access_key',
                            t('account.storage.fields.accessKey'),
                            editing ? t('account.storage.fields.keepCurrent') : 'AKIA...',
                        )}
                        {field(
                            'secret_key',
                            t('account.storage.fields.secretKey'),
                            editing ? t('account.storage.fields.keepCurrent') : '••••••••',
                            'password',
                        )}
                    </div>
                )}
                {editing?.oauth ? null : (
                    <p className='text-muted-foreground mt-3 text-xs'>
                        {form.kind === 'sftp'
                            ? t('account.storage.securityNoteSftp')
                            : form.kind === 'webdav'
                              ? t('account.storage.securityNoteWebdav')
                              : t('account.storage.securityNote')}
                    </p>
                )}
                <DialogFooter>
                    <Button onClick={save} className='flex-1' disabled={saving || form.name.trim() === ''}>
                        {saving
                            ? t('account.storage.saving')
                            : editing?.oauth
                              ? t('account.storage.save')
                              : t('account.storage.saveAndTest')}
                    </Button>
                    <Button onClick={() => setFormOpen(false)} variant='outline' className='flex-1' disabled={saving}>
                        {t('common.cancel')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <Dialog open={connectProvider !== null} onClose={() => !connecting && setConnectProvider(null)}>
                <DialogHeader>
                    <DialogTitle>
                        {t('account.storage.connectTitle', {
                            provider: connectProvider ? t(`account.storage.providers.${connectProvider}`) : '',
                        })}
                    </DialogTitle>
                    <DialogDescription>
                        {connectProvider ? t(`account.storage.connectDescription.${connectProvider}`) : ''}
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <Label htmlFor='storage-connect-name' className='text-foreground'>
                        {t('account.storage.fields.name')}
                    </Label>
                    <Input
                        id='storage-connect-name'
                        value={connectName}
                        onChange={(e) => setConnectName(e.target.value)}
                        autoComplete='off'
                        className='mt-2'
                    />
                </div>
                <p className='text-muted-foreground mt-3 text-xs'>
                    {connectProvider ? t(`account.storage.connectNote.${connectProvider}`) : ''}
                </p>
                <DialogFooter>
                    <Button onClick={connect} className='flex-1' disabled={connecting || connectName.trim() === ''}>
                        {connecting ? t('account.storage.redirecting') : t('account.storage.continue')}
                    </Button>
                    <Button
                        onClick={() => setConnectProvider(null)}
                        variant='outline'
                        className='flex-1'
                        disabled={connecting}
                    >
                        {t('common.cancel')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <Dialog open={deleting !== null} onClose={() => !removing && setDeleting(null)}>
                <DialogHeader>
                    <DialogTitle>{t('account.storage.removeTitle', { name: deleting?.name ?? '' })}</DialogTitle>
                    <DialogDescription>
                        {t(
                            deleting?.oauth
                                ? 'account.storage.removeWarningOauth'
                                : deleting?.relay
                                  ? 'account.storage.removeWarningRelay'
                                  : 'account.storage.removeWarning',
                            {
                                count: String(deleting?.backups_count ?? 0),
                            },
                        )}
                    </DialogDescription>
                    {deleting?.provider === 'onedrive' ? (
                        <p className='text-muted-foreground mt-2 text-xs'>
                            {t('account.storage.removeOnedriveHint')}{' '}
                            <a
                                href='https://account.live.com/consent/Manage'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-primary underline underline-offset-2'
                            >
                                account.live.com/consent/Manage
                            </a>
                        </p>
                    ) : null}
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={remove} variant='destructive' className='flex-1' disabled={removing}>
                        {t('account.storage.remove')}
                    </Button>
                    <Button onClick={() => setDeleting(null)} variant='outline' className='flex-1' disabled={removing}>
                        {t('common.cancel')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
