/*
This file is part of FeatherPanel.
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Plus, Trash2, KeyRound, Power, ExternalLink, Reply } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { Select } from '@/components/ui/select-native';
import { Checkbox } from '@/components/ui/checkbox';
import { useWebSpace } from '@/contexts/WebSpaceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';

interface MailboxRow {
    id: number;
    email?: string;
    local_part: string;
    domain: string;
    password?: string;
    quota_mb?: number;
    enabled?: number | boolean;
    mail_host_name?: string;
    imap_host?: string;
    imap_port?: number;
    smtp_host?: string;
    smtp_port?: number;
    autorespond_enabled?: number | boolean;
    autorespond_subject?: string | null;
    autorespond_body?: string | null;
}

interface ForwarderRow {
    id: number;
    source_local: string;
    domain: string;
    destination: string;
    source?: string;
    is_catch_all?: boolean;
    enabled?: number | boolean;
    mail_host_name?: string;
}

interface MailHost {
    id: number;
    name: string;
    hostname: string;
}

interface DnsInfo {
    domains: Array<{
        domain: string;
        records: Array<{ type: string; name: string; value: string; priority?: number | null }>;
    }>;
    client_settings: {
        imap_host: string;
        imap_port: number;
        imap_encryption: string;
        smtp_host: string;
        smtp_port: number;
        smtp_encryption: string;
    } | null;
}

export default function WebSpaceEmailPage() {
    const params = useParams();
    const { t } = useTranslation();
    const uuidShort = String(params.uuidShort || '');
    const { hasPermission } = useWebSpacePermissions(uuidShort);
    const { webspace } = useWebSpace();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<MailboxRow[]>([]);
    const [forwarders, setForwarders] = useState<ForwarderRow[]>([]);
    const [hosts, setHosts] = useState<MailHost[]>([]);
    const [dns, setDns] = useState<DnsInfo | null>(null);
    const [localPart, setLocalPart] = useState('');
    const [domain, setDomain] = useState('');
    const [hostId, setHostId] = useState('');
    const [fwdLocal, setFwdLocal] = useState('');
    const [fwdDomain, setFwdDomain] = useState('');
    const [fwdDest, setFwdDest] = useState('');
    const [fwdHostId, setFwdHostId] = useState('');
    const [fwdCatchAll, setFwdCatchAll] = useState(false);
    const [busy, setBusy] = useState(false);
    const [webmailInstalled, setWebmailInstalled] = useState(false);
    const [autorespondId, setAutorespondId] = useState<number | null>(null);
    const [arEnabled, setArEnabled] = useState(false);
    const [arSubject, setArSubject] = useState('');
    const [arBody, setArBody] = useState('');

    const canCreate = hasPermission(WebSpaceSubuserPermissions['mail.create']);
    const canDelete = hasPermission(WebSpaceSubuserPermissions['mail.delete']);
    const canReset = hasPermission(WebSpaceSubuserPermissions['mail.update']);
    const canViewPassword = hasPermission(WebSpaceSubuserPermissions['mail.view_password']);
    const mailboxLimit = Number(webspace?.mailbox_limit ?? 0);
    const atLimit = mailboxLimit > 0 && rows.length >= mailboxLimit;
    const domains = useMemo(
        () => (Array.isArray(webspace?.domains) ? webspace.domains.map((d) => String(d).toLowerCase()) : []),
        [webspace?.domains],
    );

    const load = useCallback(async () => {
        try {
            const [listRes, hostsRes, dnsRes, webmailRes, fwdRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}/mailboxes`),
                axios.get(`/api/user/webspaces/${uuidShort}/mailboxes/hosts`),
                axios.get(`/api/user/webspaces/${uuidShort}/mailboxes/dns`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/mailboxes/webmail/check`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/mailboxes/forwarders`).catch(() => null),
            ]);
            setRows((listRes.data?.data?.data || []) as MailboxRow[]);
            setHosts((hostsRes.data?.data?.hosts || []) as MailHost[]);
            setDns((dnsRes?.data?.data as DnsInfo) || null);
            setWebmailInstalled(!!webmailRes?.data?.data?.installed);
            setForwarders((fwdRes?.data?.data?.data || []) as ForwarderRow[]);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.loadFailed')
                    : t('webSpaces.email.loadFailed'),
            );
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (!domain && domains.length > 0) setDomain(domains[0]);
        if (!fwdDomain && domains.length > 0) setFwdDomain(domains[0]);
    }, [domain, fwdDomain, domains]);

    const createMailbox = async () => {
        if (!hostId || !localPart.trim() || !domain) {
            toast.error(t('webSpaces.email.selectHostLocalDomain'));
            return;
        }
        setBusy(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/mailboxes`, {
                mail_host_id: Number(hostId),
                local_part: localPart.trim(),
                domain,
            });
            toast.success(t('webSpaces.email.mailboxCreated'));
            if (data?.data?.password) {
                toast.message(t('webSpaces.email.passwordLabel', { password: data.data.password }), {
                    duration: 10000,
                });
            }
            setLocalPart('');
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.createFailed')
                    : t('webSpaces.email.createFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

    const removeMailbox = async (id: number) => {
        if (!confirm(t('webSpaces.email.deleteMailboxConfirm'))) return;
        try {
            await axios.delete(`/api/user/webspaces/${uuidShort}/mailboxes/${id}`);
            toast.success(t('webSpaces.email.mailboxDeleted'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.deleteFailed')
                    : t('webSpaces.email.deleteFailed'),
            );
        }
    };

    const resetPassword = async (id: number) => {
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/mailboxes/${id}/reset-password`);
            toast.success(t('webSpaces.email.passwordReset'));
            if (data?.data?.password)
                toast.message(t('webSpaces.email.newPassword', { password: data.data.password }), { duration: 10000 });
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.resetFailed')
                    : t('webSpaces.email.resetFailed'),
            );
        }
    };

    const openWebmail = async (id: number) => {
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/mailboxes/${id}/webmail/token`);
            if (data?.success && data?.data?.url) {
                window.open(data.data.url, '_blank');
                toast.success(t('webSpaces.email.openingWebmail'));
            } else {
                toast.error(data?.message || t('webSpaces.email.webmailFailed'));
            }
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.webmailFailed')
                    : t('webSpaces.email.webmailFailed'),
            );
        }
    };

    const toggleEnabled = async (row: MailboxRow) => {
        const enabled = !(row.enabled === 1 || row.enabled === true);
        try {
            await axios.patch(`/api/user/webspaces/${uuidShort}/mailboxes/${row.id}/enabled`, { enabled });
            toast.success(enabled ? t('webSpaces.email.mailboxEnabled') : t('webSpaces.email.mailboxDisabled'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.updateFailed')
                    : t('webSpaces.email.updateFailed'),
            );
        }
    };

    const openAutorespond = (row: MailboxRow) => {
        setAutorespondId(row.id);
        setArEnabled(row.autorespond_enabled === 1 || row.autorespond_enabled === true);
        setArSubject(row.autorespond_subject || '');
        setArBody(row.autorespond_body || '');
    };

    const saveAutorespond = async () => {
        if (autorespondId == null) return;
        try {
            await axios.put(`/api/user/webspaces/${uuidShort}/mailboxes/${autorespondId}/autorespond`, {
                enabled: arEnabled,
                subject: arSubject,
                body: arBody,
            });
            toast.success(t('webSpaces.email.autorespondUpdated'));
            setAutorespondId(null);
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.updateFailed')
                    : t('webSpaces.email.updateFailed'),
            );
        }
    };

    const createForwarder = async () => {
        const sourceLocal = fwdCatchAll ? '*' : fwdLocal.trim();
        if (!fwdHostId || !sourceLocal || !fwdDomain || !fwdDest.trim()) {
            toast.error(t('webSpaces.email.fillForwarder'));
            return;
        }
        setBusy(true);
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/mailboxes/forwarders`, {
                mail_host_id: Number(fwdHostId),
                source_local: sourceLocal,
                domain: fwdDomain,
                destination: fwdDest.trim(),
            });
            toast.success(fwdCatchAll ? t('webSpaces.email.catchAllCreated') : t('webSpaces.email.forwarderCreated'));
            setFwdLocal('');
            setFwdDest('');
            setFwdCatchAll(false);
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.createFailed')
                    : t('webSpaces.email.createFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

    const removeForwarder = async (id: number) => {
        if (!confirm(t('webSpaces.email.deleteForwarderConfirm'))) return;
        try {
            await axios.delete(`/api/user/webspaces/${uuidShort}/mailboxes/forwarders/${id}`);
            toast.success(t('webSpaces.email.forwarderDeleted'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.deleteFailed')
                    : t('webSpaces.email.deleteFailed'),
            );
        }
    };

    if (loading) return <TableSkeleton count={3} />;

    return (
        <WebSpacePageWidgets pageId='webspace-email'>
            <div className='space-y-6'>
                <PageHeader
                    title={t('webSpaces.email.title')}
                    description={`${t('webSpaces.email.description')} (${rows.length}${mailboxLimit > 0 ? ` / ${mailboxLimit}` : ''})`}
                />

                {canCreate && hosts.length > 0 && domains.length > 0 && !atLimit && (
                    <div className='flex flex-wrap items-end gap-2'>
                        <Select value={hostId} onChange={(e) => setHostId(e.target.value)} className='min-w-[200px]'>
                            <option value=''>{t('webSpaces.email.selectHost')}</option>
                            {hosts.map((h) => (
                                <option key={h.id} value={String(h.id)}>
                                    {h.name} ({h.hostname})
                                </option>
                            ))}
                        </Select>
                        <Input
                            placeholder={t('webSpaces.email.localPart')}
                            value={localPart}
                            onChange={(e) => setLocalPart(e.target.value)}
                            className='max-w-[160px]'
                        />
                        <span className='text-muted-foreground pb-2'>@</span>
                        <Select value={domain} onChange={(e) => setDomain(e.target.value)} className='min-w-[180px]'>
                            {domains.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </Select>
                        <Button loading={busy} onClick={() => void createMailbox()}>
                            <Plus className='mr-1 h-4 w-4' />
                            {t('webSpaces.email.create')}
                        </Button>
                    </div>
                )}

                {canCreate && atLimit && (
                    <p className='text-muted-foreground text-sm'>
                        {t('webSpaces.email.limitReached', { count: String(rows.length), limit: String(mailboxLimit) })}
                    </p>
                )}

                {hosts.length === 0 && <p className='text-muted-foreground text-sm'>{t('webSpaces.email.noHosts')}</p>}

                {domains.length === 0 && (
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.email.addDomain')}</p>
                )}

                <div className='border-border divide-border divide-y overflow-hidden rounded-xl border'>
                    {rows.length === 0 && (
                        <p className='text-muted-foreground p-4 text-sm'>{t('webSpaces.email.empty')}</p>
                    )}
                    {rows.map((row) => {
                        const email = row.email || `${row.local_part}@${row.domain}`;
                        const enabled = row.enabled === 1 || row.enabled === true;
                        const arOn = row.autorespond_enabled === 1 || row.autorespond_enabled === true;
                        return (
                            <div key={row.id} className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
                                <div className='min-w-0'>
                                    <p className='font-mono text-sm font-medium'>
                                        {email}
                                        {!enabled && (
                                            <span className='text-muted-foreground ml-2 text-xs'>
                                                {t('webSpaces.email.disabled')}
                                            </span>
                                        )}
                                        {arOn && (
                                            <span className='text-muted-foreground ml-2 text-xs'>
                                                {t('webSpaces.email.autorespond')}
                                            </span>
                                        )}
                                    </p>
                                    <p className='text-muted-foreground text-xs'>
                                        {row.mail_host_name || t('webSpaces.email.mailHost')}
                                        {row.quota_mb ? ` · ${row.quota_mb} ${t('common.mb')}` : ''}
                                        {row.imap_host ? ` · IMAP ${row.imap_host}:${row.imap_port}` : ''}
                                        {row.smtp_host ? ` · SMTP ${row.smtp_host}:${row.smtp_port}` : ''}
                                    </p>
                                    {canViewPassword && row.password && row.password !== '[REDACTED]' && (
                                        <p className='text-muted-foreground mt-1 font-mono text-xs'>
                                            {t('webSpaces.email.passwordLabel', { password: row.password })}
                                        </p>
                                    )}
                                </div>
                                <div className='flex gap-1'>
                                    {canViewPassword && webmailInstalled && (
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={() => void openWebmail(row.id)}
                                            title={t('webSpaces.email.webmail')}
                                        >
                                            <ExternalLink className='h-4 w-4' />
                                        </Button>
                                    )}
                                    {canReset && (
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={() => openAutorespond(row)}
                                            title={t('webSpaces.email.autorespondTitle')}
                                        >
                                            <Reply className='h-4 w-4' />
                                        </Button>
                                    )}
                                    {canReset && (
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={() => void toggleEnabled(row)}
                                            title={`${t('webSpaces.email.enable')}/${t('webSpaces.email.disable')}`}
                                        >
                                            <Power className='h-4 w-4' />
                                        </Button>
                                    )}
                                    {canReset && (
                                        <Button variant='ghost' size='sm' onClick={() => void resetPassword(row.id)}>
                                            <KeyRound className='h-4 w-4' />
                                        </Button>
                                    )}
                                    {canDelete && (
                                        <Button variant='ghost' size='sm' onClick={() => void removeMailbox(row.id)}>
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {autorespondId != null && (
                    <div className='border-border space-y-3 rounded-xl border p-4'>
                        <h3 className='text-sm font-semibold'>{t('webSpaces.email.autorespondTitle')}</h3>
                        <label className='flex items-center gap-2 text-sm'>
                            <input
                                type='checkbox'
                                checked={arEnabled}
                                onChange={(e) => setArEnabled(e.target.checked)}
                            />
                            {t('common.enabled')}
                        </label>
                        <Input
                            placeholder={t('webSpaces.email.subject')}
                            value={arSubject}
                            onChange={(e) => setArSubject(e.target.value)}
                        />
                        <textarea
                            className='border-border bg-background min-h-[100px] w-full rounded-md border px-3 py-2 text-sm'
                            placeholder={t('webSpaces.email.messageBody')}
                            value={arBody}
                            onChange={(e) => setArBody(e.target.value)}
                        />
                        <div className='flex gap-2'>
                            <Button onClick={() => void saveAutorespond()}>{t('common.save')}</Button>
                            <Button variant='ghost' onClick={() => setAutorespondId(null)}>
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </div>
                )}

                <div className='space-y-3'>
                    <h3 className='text-sm font-semibold'>{t('webSpaces.email.forwardersTitle')}</h3>
                    {canCreate && hosts.length > 0 && domains.length > 0 && (
                        <div className='flex flex-wrap items-end gap-2'>
                            <Select
                                value={fwdHostId}
                                onChange={(e) => setFwdHostId(e.target.value)}
                                className='min-w-[200px]'
                            >
                                <option value=''>{t('webSpaces.email.selectHost')}</option>
                                {hosts.map((h) => (
                                    <option key={h.id} value={String(h.id)}>
                                        {h.name} ({h.hostname})
                                    </option>
                                ))}
                            </Select>
                            <label className='flex items-center gap-2 pb-2 text-xs'>
                                <Checkbox checked={fwdCatchAll} onCheckedChange={setFwdCatchAll} />
                                {t('webSpaces.email.catchAll')}
                            </label>
                            {!fwdCatchAll && (
                                <Input
                                    placeholder={t('webSpaces.email.source')}
                                    value={fwdLocal}
                                    onChange={(e) => setFwdLocal(e.target.value)}
                                    className='max-w-[140px]'
                                />
                            )}
                            {fwdCatchAll && <span className='text-muted-foreground pb-2 font-mono text-sm'>*</span>}
                            <span className='text-muted-foreground pb-2'>@</span>
                            <Select
                                value={fwdDomain}
                                onChange={(e) => setFwdDomain(e.target.value)}
                                className='min-w-[160px]'
                            >
                                {domains.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </Select>
                            <span className='text-muted-foreground pb-2'>→</span>
                            <Input
                                placeholder={t('webSpaces.email.destinationPlaceholder')}
                                value={fwdDest}
                                onChange={(e) => setFwdDest(e.target.value)}
                                className='min-w-[200px]'
                            />
                            <Button loading={busy} onClick={() => void createForwarder()}>
                                <Plus className='mr-1 h-4 w-4' />
                                {t('webSpaces.email.add')}
                            </Button>
                        </div>
                    )}
                    <div className='border-border divide-border divide-y overflow-hidden rounded-xl border'>
                        {forwarders.length === 0 && (
                            <p className='text-muted-foreground p-4 text-sm'>{t('webSpaces.email.noForwarders')}</p>
                        )}
                        {forwarders.map((row) => {
                            const source = row.source || `${row.source_local}@${row.domain}`;
                            return (
                                <div
                                    key={row.id}
                                    className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'
                                >
                                    <div className='min-w-0'>
                                        <p className='font-mono text-sm font-medium'>
                                            {source} → {row.destination}
                                            {(row.is_catch_all || row.source_local === '*') && (
                                                <span className='text-muted-foreground ml-2 text-xs'>
                                                    {t('webSpaces.email.catchAllBadge')}
                                                </span>
                                            )}
                                        </p>
                                        <p className='text-muted-foreground text-xs'>
                                            {row.mail_host_name || t('webSpaces.email.mailHost')}
                                        </p>
                                    </div>
                                    {canDelete && (
                                        <Button variant='ghost' size='sm' onClick={() => void removeForwarder(row.id)}>
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {dns?.client_settings && (
                    <div className='space-y-2'>
                        <h3 className='text-sm font-semibold'>{t('webSpaces.email.clientSettings')}</h3>
                        <p className='text-muted-foreground font-mono text-xs'>
                            IMAP {dns.client_settings.imap_host}:{dns.client_settings.imap_port} (
                            {dns.client_settings.imap_encryption}){' · '}
                            SMTP {dns.client_settings.smtp_host}:{dns.client_settings.smtp_port} (
                            {dns.client_settings.smtp_encryption})
                        </p>
                    </div>
                )}

                {dns && dns.domains.length > 0 && (
                    <div className='space-y-3'>
                        <h3 className='text-sm font-semibold'>{t('webSpaces.email.dnsChecklist')}</h3>
                        {dns.domains.map((block) => (
                            <div key={block.domain} className='border-border rounded-xl border p-4'>
                                <p className='mb-2 text-sm font-medium'>{block.domain}</p>
                                <ul className='text-muted-foreground space-y-1 font-mono text-xs'>
                                    {block.records.map((rec, idx) => (
                                        <li key={`${rec.type}-${rec.name}-${idx}`}>
                                            {rec.type} {rec.name} → {rec.priority != null ? `${rec.priority} ` : ''}
                                            {rec.value}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WebSpacePageWidgets>
    );
}
