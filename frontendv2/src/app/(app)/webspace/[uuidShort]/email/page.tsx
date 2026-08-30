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
import {
    Plus,
    Trash2,
    KeyRound,
    Power,
    ExternalLink,
    Reply,
    Mail,
    Loader2,
    RefreshCw,
    MoreVertical,
    Eye,
    Server as ServerIcon,
    Forward,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
        dkim_ready?: boolean;
        records: Array<{ type: string; name: string; value: string; priority?: number | null; source?: string }>;
    }>;
    can_provision?: boolean;
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
    const [createOpen, setCreateOpen] = useState(false);
    const [fwdOpen, setFwdOpen] = useState(false);
    const [viewingMailbox, setViewingMailbox] = useState<MailboxRow | null>(null);

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

    const provisionDns = async (domain: string) => {
        setBusy(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/mailboxes/dns/provision`, { domain });
            if (data?.data?.dkim_ready === false) {
                toast.message(t('webSpaces.email.dkimPending'));
            } else {
                toast.success(t('webSpaces.email.dnsProvisionedToast'));
            }
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.email.dnsProvisionFailed')
                    : t('webSpaces.email.dnsProvisionFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

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
            setCreateOpen(false);
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
            setFwdOpen(false);
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

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    const showHeaderCreate = canCreate && rows.length > 0 && hosts.length > 0 && domains.length > 0 && !atLimit;

    return (
        <WebSpacePageWidgets pageId='webspace-email'>
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('webSpaces.email.title')}
                    description={
                        <div className='flex items-center gap-3'>
                            <span>{t('webSpaces.email.description')}</span>
                            <span className='bg-primary/5 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase'>
                                {rows.length}
                                {mailboxLimit > 0 ? ` / ${mailboxLimit}` : ''}
                            </span>
                        </div>
                    }
                    actions={
                        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                            {showHeaderCreate && (
                                <Button size='default' onClick={() => setCreateOpen(true)}>
                                    <Plus className='mr-2 h-5 w-5' />
                                    {t('webSpaces.email.createMailbox')}
                                </Button>
                            )}
                            {canCreate && forwarders.length > 0 && hosts.length > 0 && domains.length > 0 && (
                                <Button variant='glass' size='default' onClick={() => setFwdOpen(true)}>
                                    <Plus className='mr-2 h-5 w-5' />
                                    {t('webSpaces.email.addForwarder')}
                                </Button>
                            )}
                            <Button variant='glass' size='default' onClick={() => void load()} aria-label={t('common.refresh')}>
                                <RefreshCw className='h-5 w-5 sm:mr-2' />
                                <span className='hidden sm:inline'>{t('common.refresh')}</span>
                            </Button>
                        </div>
                    }
                />

                {canCreate && atLimit && (
                    <p className='text-muted-foreground text-sm'>
                        {t('webSpaces.email.limitReached', { count: String(rows.length), limit: String(mailboxLimit) })}
                    </p>
                )}

                {hosts.length === 0 && <p className='text-muted-foreground text-sm'>{t('webSpaces.email.noHosts')}</p>}
                {domains.length === 0 && (
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.email.addDomain')}</p>
                )}

                {rows.length === 0 ? (
                    <EmptyState
                        title={t('webSpaces.email.empty')}
                        description={t('webSpaces.email.description')}
                        icon={Mail}
                        action={
                            canCreate && !atLimit && hosts.length > 0 && domains.length > 0 ? (
                                <Button size='default' onClick={() => setCreateOpen(true)} className='h-14 px-10 text-lg'>
                                    <Plus className='mr-2 h-6 w-6' />
                                    {t('webSpaces.email.createMailbox')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {rows.map((row) => {
                            const email = row.email || `${row.local_part}@${row.domain}`;
                            const enabled = row.enabled === 1 || row.enabled === true;
                            const arOn = row.autorespond_enabled === 1 || row.autorespond_enabled === true;
                            return (
                                <ResourceCard
                                    key={row.id}
                                    icon={Mail}
                                    title={email}
                                    badges={
                                        <>
                                            {!enabled && (
                                                <span className='bg-muted border-border/50 text-muted-foreground rounded-full border px-3 py-1 text-[10px] leading-none font-black tracking-widest uppercase'>
                                                    {t('webSpaces.email.disabled')}
                                                </span>
                                            )}
                                            {arOn && (
                                                <span className='rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] leading-none font-black tracking-widest text-emerald-500 uppercase'>
                                                    {t('webSpaces.email.autorespond')}
                                                </span>
                                            )}
                                        </>
                                    }
                                    description={
                                        <>
                                            <div className='text-muted-foreground flex items-center gap-2'>
                                                <ServerIcon className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-semibold'>
                                                    {row.mail_host_name || t('webSpaces.email.mailHost')}
                                                    {row.quota_mb ? ` · ${row.quota_mb} ${t('common.mb')}` : ''}
                                                </span>
                                            </div>
                                            {(row.imap_host || row.smtp_host) && (
                                                <p className='text-muted-foreground font-mono text-xs'>
                                                    {row.imap_host ? `IMAP ${row.imap_host}:${row.imap_port}` : ''}
                                                    {row.imap_host && row.smtp_host ? ' · ' : ''}
                                                    {row.smtp_host ? `SMTP ${row.smtp_host}:${row.smtp_port}` : ''}
                                                </p>
                                            )}
                                        </>
                                    }
                                    actions={
                                        (canViewPassword || canReset || canDelete) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className='group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl transition-colors outline-none'>
                                                    <MoreVertical className='text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors' />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align='end'
                                                    className='bg-card/90 border-border/40 w-56 rounded-2xl p-2 backdrop-blur-xl'
                                                >
                                                    {canViewPassword && (
                                                        <DropdownMenuItem
                                                            onClick={() => setViewingMailbox(row)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Eye className='text-primary h-4 w-4' />
                                                            <span className='font-bold'>{t('webSpaces.email.view')}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canViewPassword && webmailInstalled && (
                                                        <DropdownMenuItem
                                                            onClick={() => void openWebmail(row.id)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <ExternalLink className='h-4 w-4 text-blue-500' />
                                                            <span className='font-bold'>{t('webSpaces.email.webmail')}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canReset && (
                                                        <DropdownMenuItem
                                                            onClick={() => openAutorespond(row)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Reply className='h-4 w-4 text-sky-500' />
                                                            <span className='font-bold'>
                                                                {t('webSpaces.email.autorespondTitle')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canReset && (
                                                        <DropdownMenuItem
                                                            onClick={() => void toggleEnabled(row)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Power className='h-4 w-4 text-amber-500' />
                                                            <span className='font-bold'>
                                                                {enabled
                                                                    ? t('webSpaces.email.disable')
                                                                    : t('webSpaces.email.enable')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canReset && (
                                                        <DropdownMenuItem
                                                            onClick={() => void resetPassword(row.id)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <KeyRound className='h-4 w-4 text-amber-500' />
                                                            <span className='font-bold'>
                                                                {t('webSpaces.email.resetPassword')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canDelete && (
                                                        <>
                                                            <DropdownMenuSeparator className='bg-border/40 my-1' />
                                                            <DropdownMenuItem
                                                                onClick={() => void removeMailbox(row.id)}
                                                                className='text-destructive focus:text-destructive focus:bg-destructive/10 flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                            >
                                                                <Trash2 className='h-4 w-4' />
                                                                <span className='font-bold'>{t('common.delete')}</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )
                                    }
                                />
                            );
                        })}
                    </div>
                )}

                {(rows.length > 0 || forwarders.length > 0) && (
                    <div className='space-y-4'>
                        <h2 className='text-lg font-semibold'>{t('webSpaces.email.forwardersTitle')}</h2>
                        {forwarders.length === 0 ? (
                            <EmptyState
                                title={t('webSpaces.email.noForwarders')}
                                description={t('webSpaces.email.forwardersTitle')}
                                icon={Forward}
                                action={
                                    canCreate && hosts.length > 0 && domains.length > 0 ? (
                                        <Button size='default' onClick={() => setFwdOpen(true)}>
                                            <Plus className='mr-2 h-5 w-5' />
                                            {t('webSpaces.email.addForwarder')}
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                        <div className='grid grid-cols-1 gap-4'>
                            {forwarders.map((row) => {
                                const source = row.source || `${row.source_local}@${row.domain}`;
                                return (
                                    <ResourceCard
                                        key={row.id}
                                        icon={Forward}
                                        title={`${source} → ${row.destination}`}
                                        badges={
                                            (row.is_catch_all || row.source_local === '*') && (
                                                <span className='bg-primary/10 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] leading-none font-black tracking-widest uppercase'>
                                                    {t('webSpaces.email.catchAllBadge')}
                                                </span>
                                            )
                                        }
                                        description={
                                            <div className='text-muted-foreground flex items-center gap-2'>
                                                <ServerIcon className='h-4 w-4 opacity-50' />
                                                <span className='text-sm font-semibold'>
                                                    {row.mail_host_name || t('webSpaces.email.mailHost')}
                                                </span>
                                            </div>
                                        }
                                        actions={
                                            canDelete && (
                                                <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    onClick={() => void removeForwarder(row.id)}
                                                    className='h-8 w-8 p-0'
                                                >
                                                    <Trash2 className='h-3.5 w-3.5' />
                                                </Button>
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}
                    </div>
                )}

                {dns?.client_settings && (
                    <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                        <h3 className='mb-2 text-sm font-medium'>{t('webSpaces.email.clientSettings')}</h3>
                        <p className='text-muted-foreground font-mono text-xs'>
                            IMAP {dns.client_settings.imap_host}:{dns.client_settings.imap_port} (
                            {dns.client_settings.imap_encryption}){' · '}
                            SMTP {dns.client_settings.smtp_host}:{dns.client_settings.smtp_port} (
                            {dns.client_settings.smtp_encryption})
                        </p>
                    </div>
                )}

                {dns && dns.domains.length > 0 && (
                    <div className='space-y-4'>
                        <h2 className='text-lg font-semibold'>{t('webSpaces.email.dnsChecklist')}</h2>
                        <div className='grid grid-cols-1 gap-4'>
                            {dns.domains.map((block) => (
                                <div
                                    key={block.domain}
                                    className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'
                                >
                                    <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                                        <p className='font-mono text-sm font-medium'>{block.domain}</p>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            {block.dkim_ready === false && (
                                                <span className='rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-400'>
                                                    {t('webSpaces.email.dkimPending')}
                                                </span>
                                            )}
                                            {dns.can_provision && canCreate && (
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    loading={busy}
                                                    onClick={() => void provisionDns(block.domain)}
                                                >
                                                    {block.dkim_ready === false
                                                        ? t('webSpaces.email.retryDnsProvision')
                                                        : t('webSpaces.email.provisionDns')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <ul className='text-muted-foreground space-y-1 font-mono text-xs'>
                                        {block.records.map((rec, idx) => (
                                            <li key={`${rec.type}-${rec.name}-${idx}`} className='flex flex-wrap items-center gap-2'>
                                                <span>
                                                    {rec.type} {rec.name} → {rec.priority != null ? `${rec.priority} ` : ''}
                                                    {rec.value}
                                                </span>
                                                {rec.source === 'provisioned' ? (
                                                    <span className='rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-600'>
                                                        {t('webSpaces.email.dnsProvisioned')}
                                                    </span>
                                                ) : rec.source === 'manual' ? (
                                                    <span className='rounded bg-muted px-1.5 py-0.5 text-[10px]'>
                                                        {t('webSpaces.email.dnsManual')}
                                                    </span>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogHeader>
                        <DialogTitle>{t('webSpaces.email.createMailbox')}</DialogTitle>
                        <DialogDescription>{t('webSpaces.email.description')}</DialogDescription>
                    </DialogHeader>
                    <div className='flex flex-wrap items-end gap-2 py-4'>
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
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setCreateOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={busy} onClick={() => void createMailbox()}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('webSpaces.email.createMailbox')}
                        </Button>
                    </DialogFooter>
                </Dialog>

                <Dialog open={fwdOpen} onOpenChange={setFwdOpen}>
                    <DialogHeader>
                        <DialogTitle>{t('webSpaces.email.addForwarder')}</DialogTitle>
                    </DialogHeader>
                    <div className='flex flex-wrap items-end gap-2 py-4'>
                        <Select value={fwdHostId} onChange={(e) => setFwdHostId(e.target.value)} className='min-w-[200px]'>
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
                        <Select value={fwdDomain} onChange={(e) => setFwdDomain(e.target.value)} className='min-w-[160px]'>
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
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setFwdOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={busy} onClick={() => void createForwarder()}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('webSpaces.email.addForwarder')}
                        </Button>
                    </DialogFooter>
                </Dialog>

                <Dialog open={autorespondId != null} onOpenChange={(open) => !open && setAutorespondId(null)}>
                    <DialogHeader>
                        <DialogTitle>{t('webSpaces.email.autorespondTitle')}</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-3 py-4'>
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox checked={arEnabled} onCheckedChange={(checked) => setArEnabled(checked === true)} />
                            {t('common.enabled')}
                        </label>
                        <Input
                            placeholder={t('webSpaces.email.subject')}
                            value={arSubject}
                            onChange={(e) => setArSubject(e.target.value)}
                        />
                        <textarea
                            className='border-border bg-background min-h-[100px] w-full rounded-xl border px-3 py-2 text-sm'
                            placeholder={t('webSpaces.email.messageBody')}
                            value={arBody}
                            onChange={(e) => setArBody(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setAutorespondId(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={() => void saveAutorespond()}>{t('common.save')}</Button>
                    </DialogFooter>
                </Dialog>

                <Dialog open={!!viewingMailbox} onOpenChange={(open) => !open && setViewingMailbox(null)}>
                    <DialogHeader>
                        <DialogTitle>{t('webSpaces.email.view')}</DialogTitle>
                        <DialogDescription>
                            {viewingMailbox?.email ||
                                (viewingMailbox ? `${viewingMailbox.local_part}@${viewingMailbox.domain}` : '')}
                        </DialogDescription>
                    </DialogHeader>
                    {viewingMailbox && (
                        <div className='space-y-3 py-4 font-mono text-sm'>
                            {canViewPassword && viewingMailbox.password && viewingMailbox.password !== '[REDACTED]' && (
                                <p>
                                    {t('webSpaces.email.passwordLabel', { password: viewingMailbox.password })}
                                </p>
                            )}
                            {viewingMailbox.imap_host && (
                                <p>
                                    IMAP {viewingMailbox.imap_host}:{viewingMailbox.imap_port}
                                </p>
                            )}
                            {viewingMailbox.smtp_host && (
                                <p>
                                    SMTP {viewingMailbox.smtp_host}:{viewingMailbox.smtp_port}
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setViewingMailbox(null)}>
                            {t('common.close')}
                        </Button>
                    </DialogFooter>
                </Dialog>
            </div>
        </WebSpacePageWidgets>
    );
}
