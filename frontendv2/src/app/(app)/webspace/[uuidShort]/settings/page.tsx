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
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { useWebSpace } from '@/contexts/WebSpaceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { copyToClipboard } from '@/lib/utils';

interface WebSpace {
    uuid: string;
    uuidShort?: string;
    name: string;
    description?: string;
    dns_status?: string | null;
    domains?: string[];
    ssl?: boolean;
    disk?: number;
    disk_used_bytes?: number;
    disk_limit_bytes?: number;
    document_root?: string;
    owner_id?: number;
    can_edit_disk?: boolean;
    sftp_host?: string | null;
    sftp_port?: number | null;
}

function formatBytes(n?: number | null): string {
    if (n == null) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function UsageBar({ used, limit, label }: { used?: number | null; limit?: number | null; label: string }) {
    const pct = used != null && limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    return (
        <div className='space-y-1'>
            <div className='flex justify-between text-xs'>
                <span className='text-muted-foreground'>{label}</span>
                <span>
                    {formatBytes(used)} / {formatBytes(limit)}
                </span>
            </div>
            <div className='bg-muted h-2 overflow-hidden rounded-full'>
                <div className='bg-primary h-full transition-all' style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default function WebSpaceSettingsPage() {
    const params = useParams();
    const { t } = useTranslation();
    const uuidShort = String(params.uuidShort || '');
    const { user } = useSession();
    const { webspace: ctxSpace } = useWebSpace();
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [space, setSpace] = useState<WebSpace | null>(null);
    const [utilDisk, setUtilDisk] = useState<{ used?: number; limit?: number } | null>(null);
    const [dnsResult, setDnsResult] = useState<{
        dns_status?: string;
        expected_ips?: string[];
        guidance?: {
            domain: string;
            ok: boolean;
            record_type: string;
            expected_value: string;
            current_value: string;
            hint: string;
        }[];
    } | null>(null);
    const [sslInfo, setSslInfo] = useState<{
        ssl?: boolean;
        provider?: string;
        domains?: {
            domain: string;
            nginx_cert_present?: boolean;
            caddy_cert_present?: boolean;
            not_after?: string;
            days_remaining?: number | null;
        }[];
    } | null>(null);
    const [renewing, setRenewing] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        domainsText: '',
        ssl: false,
        disk: '1024',
        document_root: 'public',
    });

    const isOwner = space != null && user != null && Number(space.owner_id) === Number(user.id);
    const canEditDisk = !!(space?.can_edit_disk || isOwner);

    const load = useCallback(async () => {
        try {
            const [showRes, utilRes, sslRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}`),
                axios.get(`/api/user/webspaces/${uuidShort}/utilization`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/ssl`).catch(() => null),
            ]);
            const ws = showRes.data.data.webspace as WebSpace;
            setSpace(ws);
            setForm({
                name: ws.name || '',
                description: ws.description || '',
                domainsText: (ws.domains || []).join('\n'),
                ssl: !!ws.ssl,
                disk: String(ws.disk ?? 1024),
                document_root: ws.document_root || 'public',
            });
            const util = utilRes?.data?.data?.utilization;
            if (util) {
                setUtilDisk({
                    used: util.disk_used_bytes,
                    limit: util.disk_limit_bytes,
                });
            }
            setSslInfo((sslRes?.data?.data?.ssl as typeof sslInfo) || null);
        } catch (error) {
            console.error(error);
            toast.error(t('webSpaces.settings.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const checkDns = async () => {
        setChecking(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/dns-check`);
            setDnsResult(data.data as typeof dnsResult);
            if (data.data?.webspace) setSpace(data.data.webspace);
            toast.success(t('webSpaces.settings.dnsCheckComplete'));
        } catch (error) {
            let msg = t('webSpaces.settings.dnsCheckFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setChecking(false);
        }
    };

    const renewSsl = async () => {
        if (!confirm(t('webSpaces.settings.forceRenewConfirm'))) return;
        setRenewing(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/ssl/renew`);
            setSslInfo((data.data?.ssl as typeof sslInfo) || null);
            toast.success(t('webSpaces.settings.sslRenewed'));
        } catch (error) {
            let msg = t('webSpaces.settings.sslRenewFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setRenewing(false);
        }
    };

    const saveSettings = async () => {
        if (!form.name.trim()) {
            toast.error(t('webSpaces.settings.nameRequired'));
            return;
        }

        const domains = form.domainsText
            .split(/\r?\n/)
            .map((d) => d.trim())
            .filter(Boolean);

        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                description: form.description,
                domains,
                ssl: form.ssl,
                document_root: form.document_root.trim() || 'public',
            };
            if (canEditDisk) {
                payload.disk = Math.max(1, Number(form.disk) || 1024);
            }
            const { data } = await axios.patch(`/api/user/webspaces/${uuidShort}`, payload);
            if (data.data?.webspace) {
                setSpace(data.data.webspace);
            }
            toast.success(t('webSpaces.settings.saved'));
        } catch (error) {
            let msg = t('webSpaces.settings.saveFailed');
            if (isAxiosError(error)) {
                if (error.response?.status === 403) {
                    msg = t('webSpaces.settings.noPermission');
                } else if (error.response?.data?.message) {
                    msg = error.response.data.message;
                }
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading || !space) {
        return <TableSkeleton count={2} />;
    }

    const username = user?.username || 'username';
    const short = space.uuidShort || uuidShort;
    const sftpUser = `${username}.${short}`;

    return (
        <WebSpacePageWidgets pageId='webspace-settings'>
            <div className='mx-auto max-w-6xl space-y-8 pb-16'>
                <PageHeader title={t('webSpaces.settings.title')} description={t('webSpaces.settings.description')} />

                <PageCard title={t('webSpaces.settings.description')}>
                    <div className='space-y-4'>
                        {!isOwner && (
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.permissionHint')}</p>
                        )}
                        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                            <div className='space-y-3'>
                                <div className='space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('webSpaces.settings.name')}
                                    </Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('webSpaces.settings.descriptionLabel')}
                                    </Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        rows={2}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('webSpaces.settings.diskMb')}
                                    </Label>
                                    <UsageBar
                                        label={t('webSpaces.settings.used')}
                                        used={utilDisk?.used ?? space.disk_used_bytes ?? ctxSpace?.disk_used_bytes}
                                        limit={
                                            utilDisk?.limit ??
                                            space.disk_limit_bytes ??
                                            ctxSpace?.disk_limit_bytes ??
                                            (Number(form.disk) || 0) * 1024 * 1024
                                        }
                                    />
                                    {canEditDisk ? (
                                        <Input
                                            type='number'
                                            min={1}
                                            value={form.disk}
                                            onChange={(e) => setForm({ ...form, disk: e.target.value })}
                                        />
                                    ) : (
                                        <p className='text-muted-foreground text-xs'>
                                            {t('webSpaces.settings.limitOwner', {
                                                n: String(space.disk || form.disk),
                                            })}
                                        </p>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('webSpaces.settings.documentRoot')}
                                    </Label>
                                    <Input
                                        value={form.document_root}
                                        onChange={(e) => setForm({ ...form, document_root: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className='space-y-3'>
                                <div className='space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('webSpaces.settings.domains')}
                                    </Label>
                                    <Textarea
                                        value={form.domainsText}
                                        onChange={(e) => setForm({ ...form, domainsText: e.target.value })}
                                        rows={6}
                                    />
                                </div>
                                <label className='flex items-center gap-2 text-sm'>
                                    <Checkbox
                                        checked={form.ssl}
                                        onCheckedChange={(checked) => setForm({ ...form, ssl: checked === true })}
                                    />
                                    {t('webSpaces.settings.enableSsl')}
                                </label>
                            </div>
                        </div>
                        <Button loading={saving} onClick={() => void saveSettings()}>
                            {t('webSpaces.settings.saveSettings')}
                        </Button>
                    </div>
                </PageCard>

                <PageCard title={t('webSpaces.settings.sftpTitle')}>
                    <div className='space-y-3 text-sm'>
                        <p className='text-muted-foreground'>{t('webSpaces.settings.sftpHelp')}</p>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                    {t('webSpaces.settings.host')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {space.sftp_host ? `sftp://${space.sftp_host}` : t('common.not_available')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-muted-foreground h-8 w-8 rounded-lg p-0'
                                        onClick={() =>
                                            void copyToClipboard(space.sftp_host ? `sftp://${space.sftp_host}` : '')
                                        }
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                    {t('webSpaces.settings.port')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {space.sftp_port != null ? space.sftp_port : t('common.not_available')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-muted-foreground h-8 w-8 rounded-lg p-0'
                                        onClick={() =>
                                            void copyToClipboard(space.sftp_port != null ? String(space.sftp_port) : '')
                                        }
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>
                            <div className='space-y-2 md:col-span-2'>
                                <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                    {t('webSpaces.settings.username')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {sftpUser}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-muted-foreground h-8 w-8 rounded-lg p-0'
                                        onClick={() => void copyToClipboard(sftpUser)}
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.fileAccessHelp')}</p>
                    </div>
                </PageCard>

                <PageCard title={t('webSpaces.settings.sslDnsTitle')}>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <p className='text-muted-foreground text-sm'>
                                {t('webSpaces.settings.dnsStatus')}{' '}
                                <span className='text-foreground font-medium'>
                                    {space.dns_status || t('webSpaces.settings.unchecked')}
                                </span>
                                {sslInfo?.provider ? ` · ${t('webSpaces.settings.proxy')} ${sslInfo.provider}` : ''}
                            </p>
                            {sslInfo?.domains && sslInfo.domains.length > 0 && (
                                <ul className='divide-border divide-y rounded-lg border text-sm'>
                                    {sslInfo.domains.map((d) => (
                                        <li
                                            key={d.domain}
                                            className='flex flex-wrap items-center justify-between gap-2 px-3 py-2'
                                        >
                                            <span className='font-mono'>{d.domain}</span>
                                            <span className='text-muted-foreground text-xs'>
                                                {d.nginx_cert_present || d.caddy_cert_present
                                                    ? d.days_remaining != null
                                                        ? t('webSpaces.settings.certExpires', {
                                                              days: String(d.days_remaining),
                                                          })
                                                        : t('webSpaces.settings.certPresent')
                                                    : t('webSpaces.settings.noCert')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className='flex flex-wrap gap-2'>
                                <Button loading={checking} onClick={() => void checkDns()}>
                                    {t('webSpaces.settings.checkDns')}
                                </Button>
                                {form.ssl && (
                                    <Button variant='outline' loading={renewing} onClick={() => void renewSsl()}>
                                        {t('webSpaces.settings.renewSsl')}
                                    </Button>
                                )}
                            </div>
                        </div>
                        {dnsResult?.guidance && dnsResult.guidance.length > 0 && (
                            <div className='space-y-2'>
                                <p className='text-muted-foreground text-xs'>
                                    {t('webSpaces.settings.dnsHelper')}
                                    {dnsResult.expected_ips?.length ? ` → ${dnsResult.expected_ips.join(', ')}` : ''}
                                </p>
                                <ul className='divide-border divide-y rounded-lg border text-sm'>
                                    {dnsResult.guidance.map((g) => (
                                        <li key={g.domain} className='space-y-1 px-3 py-2'>
                                            <div className='flex items-center justify-between gap-2'>
                                                <span className='font-mono'>{g.domain}</span>
                                                <span
                                                    className={
                                                        g.ok ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'
                                                    }
                                                >
                                                    {g.ok
                                                        ? t('webSpaces.settings.ok')
                                                        : t('webSpaces.settings.needsFix')}
                                                </span>
                                            </div>
                                            <p className='text-muted-foreground text-xs'>
                                                {g.record_type} → {t('webSpaces.settings.expected')} {g.expected_value};{' '}
                                                {t('webSpaces.settings.current')} {g.current_value}
                                            </p>
                                            <p className='text-xs'>{g.hint}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </PageCard>
            </div>
        </WebSpacePageWidgets>
    );
}
