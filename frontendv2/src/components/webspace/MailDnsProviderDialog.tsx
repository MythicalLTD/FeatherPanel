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

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Select } from '@/components/ui/select-native';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';

interface ProviderInfo {
    id: string;
    label: string;
    help: string;
}

interface RecordResult {
    type: string;
    name: string;
    ok: boolean;
    action?: string | null;
    error?: string | null;
    content?: string | null;
    existing?: string[];
}

interface ProvisionResult {
    ok: boolean;
    results: RecordResult[];
    error?: string;
    web?: { ok: boolean; results: RecordResult[]; error?: string };
    zone?: string;
    mode?: 'preview' | 'apply';
    dkim_ready?: boolean;
}

interface Props {
    uuidShort: string;
    domains: string[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDone: () => void;
    /** Mail records can be written (a mail host in node mode exists). */
    mailAvailable?: boolean;
    /** Web records can be written (the web node exists). */
    webAvailable?: boolean;
}

const actionTone: Record<string, string> = {
    created: 'text-emerald-600 dark:text-emerald-400',
    updated: 'text-emerald-600 dark:text-emerald-400',
    unchanged: 'text-muted-foreground',
    would_create: 'text-sky-600 dark:text-sky-400',
    would_update: 'text-sky-600 dark:text-sky-400',
    conflict: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
};

/**
 * Writes the mail DNS records into the customer's own zone with a one-time API token.
 * The token only lives in this component's state and is dropped when the dialog closes.
 */
export function MailDnsProviderDialog({
    uuidShort,
    domains,
    open,
    onOpenChange,
    onDone,
    mailAvailable = true,
    webAvailable = true,
}: Props) {
    const { t } = useTranslation();
    const [providers, setProviders] = useState<ProviderInfo[]>([]);
    const [provider, setProvider] = useState('');
    const [token, setToken] = useState('');
    const [domain, setDomain] = useState('');
    const [overwrite, setOverwrite] = useState(false);
    const [withMail, setWithMail] = useState(true);
    // null until the user picks: the web group is then on by default only when mail records are not available.
    const [webChoice, setWebChoice] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ProvisionResult | null>(null);
    // Bumped on every input change and on close, so a response that arrives late never shows up for other inputs.
    const generation = useRef(0);
    const resetResult = () => {
        generation.current += 1;
        setResult(null);
        // Consent to replace records is given for one previewed target only.
        setOverwrite(false);
    };

    useEffect(() => {
        if (!open) {
            generation.current += 1;
            setToken('');
            setResult(null);
            setOverwrite(false);
            setWithMail(true);
            setWebChoice(null);
            setBusy(false);

            return;
        }
        axios
            .get(`/api/user/webspaces/${uuidShort}/mailboxes/dns/providers`)
            .then((res) => {
                const list = (res.data?.data?.providers || []) as ProviderInfo[];
                setProviders(list);
                setProvider((cur) => cur || list[0]?.id || '');
            })
            .catch((err) => toast.error(getApiErrorMessage(err, t, 'webSpaces.email.dnsApi.loadFailed')));
    }, [open, uuidShort, t]);

    useEffect(() => {
        if (open && !domain && domains.length > 0) setDomain(domains[0]);
    }, [open, domain, domains]);

    const selected = providers.find((p) => p.id === provider);
    const rows: RecordResult[] = [...(result?.results ?? []), ...(result?.web?.results ?? [])];
    const hasConflict = rows.some((r) => r.action === 'conflict');
    const mailOn = mailAvailable && withMail;
    const webOn = webAvailable && (webChoice ?? !mailAvailable);
    const groupErrors = [
        result?.error ? `${t('webSpaces.email.dnsApi.groupError.mail')}: ${result.error}` : null,
        result?.web?.error ? `${t('webSpaces.email.dnsApi.groupError.web')}: ${result.web.error}` : null,
    ].filter((e): e is string => e !== null);

    const run = async (mode: 'preview' | 'apply') => {
        const current = generation.current;
        setBusy(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/mailboxes/dns/provider`, {
                provider,
                token,
                domain,
                mode,
                overwrite,
                mail_records: mailOn,
                web_records: webOn,
            });
            if (current !== generation.current) return;
            const res = data?.data as ProvisionResult;
            setResult(res);
            if (mode === 'apply') {
                if (res.ok && mailOn && res.dkim_ready === false) {
                    toast.success(t('webSpaces.email.dnsApi.applied'));
                    toast.info(t('webSpaces.email.dkimPending'));
                    setToken('');
                    onDone();
                } else if (res.ok) {
                    toast.success(t('webSpaces.email.dnsApi.applied'));
                    setToken('');
                    onDone();
                } else {
                    toast.error(t('webSpaces.email.dnsApi.appliedPartial'));
                }
            }
        } catch (err) {
            if (current !== generation.current) return;
            setResult(null);
            toast.error(getApiErrorMessage(err, t, 'webSpaces.email.dnsApi.failed'));
        } finally {
            setBusy(false);
        }
    };

    const canRun = !busy && provider !== '' && token.trim() !== '' && domain !== '' && (mailOn || webOn);
    const previewed = result?.mode === 'preview';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogHeader>
                <DialogTitle>{t('webSpaces.email.dnsApi.title')}</DialogTitle>
                <DialogDescription>{t('webSpaces.email.dnsApi.description')}</DialogDescription>
            </DialogHeader>
            <div className='space-y-3'>
                <div className='flex flex-wrap gap-2'>
                    <Select
                        value={provider}
                        onChange={(e) => {
                            setProvider(e.target.value);
                            resetResult();
                        }}
                        className='min-w-[180px]'
                        disabled={busy}
                    >
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.label}
                            </option>
                        ))}
                    </Select>
                    <Select
                        value={domain}
                        onChange={(e) => {
                            setDomain(e.target.value);
                            resetResult();
                        }}
                        className='min-w-[200px]'
                        disabled={busy}
                    >
                        {domains.map((d) => (
                            <option key={d} value={d}>
                                {d}
                            </option>
                        ))}
                    </Select>
                </div>
                {selected && <p className='text-muted-foreground text-xs'>{selected.help}</p>}
                <Input
                    type='password'
                    autoComplete='off'
                    spellCheck={false}
                    disabled={busy}
                    placeholder={t('webSpaces.email.dnsApi.tokenPlaceholder')}
                    value={token}
                    onChange={(e) => {
                        setToken(e.target.value);
                        resetResult();
                    }}
                />
                <p className='text-muted-foreground text-xs'>{t('webSpaces.email.dnsApi.tokenNotStored')}</p>
                <div className='space-y-2'>
                    <label className='flex items-start gap-2 text-xs'>
                        <Checkbox
                            checked={mailOn}
                            disabled={busy || !mailAvailable}
                            onCheckedChange={(checked) => {
                                setWithMail(checked === true);
                                resetResult();
                            }}
                        />
                        <span>
                            {t('webSpaces.email.dnsApi.groups.mail')}
                            {!mailAvailable && (
                                <span className='text-muted-foreground block'>
                                    {t('webSpaces.email.dnsApi.groups.mailUnavailable')}
                                </span>
                            )}
                        </span>
                    </label>
                    <label className='flex items-start gap-2 text-xs'>
                        <Checkbox
                            checked={webOn}
                            disabled={busy || !webAvailable}
                            onCheckedChange={(checked) => {
                                setWebChoice(checked === true);
                                resetResult();
                            }}
                        />
                        <span>{t('webSpaces.email.dnsApi.groups.web')}</span>
                    </label>
                </div>

                {result && (
                    <div className='fp-surface rounded-lg border p-3'>
                        <p className='mb-2 text-xs font-medium'>
                            {t('webSpaces.email.dnsApi.zone')}: <span className='font-mono'>{result.zone}</span>
                        </p>
                        <ul className='space-y-1 font-mono text-xs'>
                            {rows.map((r, i) => (
                                <li key={`${r.type}-${r.name}-${i}`} className='flex flex-wrap items-center gap-2'>
                                    <span className='w-10'>{r.type}</span>
                                    <span className='min-w-[90px]'>{r.name}</span>
                                    <span className={actionTone[r.action || (r.ok ? 'unchanged' : 'error')]}>
                                        {t(`webSpaces.email.dnsApi.action.${r.action || 'error'}`)}
                                    </span>
                                    {r.content && <span className='text-muted-foreground'>{r.content}</span>}
                                    {r.error && <span className='text-muted-foreground'>{r.error}</span>}
                                    {r.existing && r.existing.length > 0 && (
                                        <span className='text-muted-foreground'>({r.existing.join(', ')})</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {groupErrors.map((e) => (
                            <p key={e} className='mt-2 text-xs text-red-600 dark:text-red-400'>
                                {e}
                            </p>
                        ))}
                        {hasConflict && (
                            <label className='mt-3 flex items-start gap-2 text-xs'>
                                <Checkbox
                                    checked={overwrite}
                                    onCheckedChange={(checked) => setOverwrite(checked === true)}
                                />
                                <span>{t('webSpaces.email.dnsApi.overwrite')}</span>
                            </label>
                        )}
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant='outline' onClick={() => onOpenChange(false)}>
                    {t('common.close')}
                </Button>
                <Button variant='outline' loading={busy} disabled={!canRun} onClick={() => void run('preview')}>
                    {t('webSpaces.email.dnsApi.preview')}
                </Button>
                <Button loading={busy} disabled={!canRun || !previewed} onClick={() => void run('apply')}>
                    {t('webSpaces.email.dnsApi.apply')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
