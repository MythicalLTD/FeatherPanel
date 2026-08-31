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

import { useEffect, useMemo, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Globe, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/featherui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { WebSpaceSslDnsGuide } from '@/components/webspace/WebSpaceSslDnsGuide';

interface DnsGuidanceRow {
    domain: string;
    ok: boolean;
    record_type: string;
    expected_value: string;
    current_value: string;
    hint: string;
}

interface SslDomainInfo {
    domain: string;
    nginx_cert_present?: boolean;
    caddy_cert_present?: boolean;
    days_remaining?: number | null;
}

interface WebSpaceSslWizardProps {
    uuidShort: string;
    nodeFqdn?: string | null;
    ssl?: boolean;
    dnsStatus?: string | null;
    proxyProvider?: string | null;
    sslDomains?: SslDomainInfo[];
    onUpdated?: () => void;
    className?: string;
}

const STEPS = ['dns', 'verify', 'ssl', 'cert'] as const;

export function WebSpaceSslWizard({
    uuidShort,
    nodeFqdn,
    ssl = false,
    dnsStatus,
    proxyProvider,
    sslDomains = [],
    onUpdated,
    className,
}: WebSpaceSslWizardProps) {
    const { t } = useTranslation();
    const [current, setCurrent] = useState(0);
    const [checking, setChecking] = useState(false);
    const [renewing, setRenewing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sslEnabled, setSslEnabled] = useState(ssl);

    useEffect(() => {
        setSslEnabled(ssl);
    }, [ssl]);
    const [dnsResult, setDnsResult] = useState<{
        dns_status?: string;
        expected_ips?: string[];
        guidance?: DnsGuidanceRow[];
    } | null>(null);

    const dnsOk = useMemo(() => {
        const status = (dnsResult?.dns_status || dnsStatus || '').toLowerCase();
        if (status === 'dns_ok' || status === 'ok') return true;
        if (dnsResult?.guidance?.length) return dnsResult.guidance.every((g) => g.ok);
        return false;
    }, [dnsResult, dnsStatus]);

    const hasCert = sslDomains.some((d) => d.nginx_cert_present || d.caddy_cert_present);

    const stepStatus = useMemo(() => {
        return {
            dns: true,
            verify: dnsOk,
            ssl: sslEnabled,
            cert: hasCert,
        };
    }, [dnsOk, sslEnabled, hasCert]);

    const stepLabels: Record<(typeof STEPS)[number], string> = {
        dns: t('webSpaces.sslWizard.stepDns'),
        verify: t('webSpaces.sslWizard.stepVerify'),
        ssl: t('webSpaces.sslWizard.stepSsl'),
        cert: t('webSpaces.sslWizard.stepCert'),
    };

    const stepDescriptions: Record<(typeof STEPS)[number], string> = {
        dns: t('webSpaces.sslWizard.stepDnsDesc'),
        verify: t('webSpaces.sslWizard.stepVerifyDesc'),
        ssl: t('webSpaces.sslWizard.stepSslDesc'),
        cert: t('webSpaces.sslWizard.stepCertDesc'),
    };

    const checkDns = async () => {
        setChecking(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/dns-check`);
            setDnsResult(data.data as typeof dnsResult);
            toast.success(t('webSpaces.settings.dnsCheckComplete'));
            onUpdated?.();
        } catch (error) {
            let msg = t('webSpaces.settings.dnsCheckFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setChecking(false);
        }
    };

    const saveSsl = async () => {
        setSaving(true);
        try {
            await axios.patch(`/api/user/webspaces/${uuidShort}`, { ssl: sslEnabled });
            toast.success(t('webSpaces.settings.saved'));
            onUpdated?.();
        } catch (error) {
            let msg = t('webSpaces.settings.saveFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const renewSsl = async () => {
        if (!confirm(t('webSpaces.settings.forceRenewConfirm'))) return;
        setRenewing(true);
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/ssl/renew`);
            toast.success(t('webSpaces.settings.sslRenewed'));
            onUpdated?.();
        } catch (error) {
            let msg = t('webSpaces.settings.sslRenewFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setRenewing(false);
        }
    };

    const stepId = STEPS[current];

    return (
        <div className={cn('border-border/50 bg-card/60 overflow-hidden rounded-2xl border shadow-sm', className)}>
            <div className='flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between'>
                <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Sparkles className='text-primary h-5 w-5' />
                        <h3 className='text-base font-semibold'>{t('webSpaces.sslWizard.title')}</h3>
                        <span className='text-muted-foreground text-xs'>
                            {t('webSpaces.sslWizard.progress', {
                                current: String(current + 1),
                                total: String(STEPS.length),
                            })}
                        </span>
                    </div>
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.sslWizard.subtitle')}</p>
                </div>
            </div>

            <div className='grid gap-4 p-5 lg:grid-cols-[200px_1fr]'>
                <ol className='space-y-1 text-sm'>
                    {STEPS.map((id, idx) => (
                        <li key={id}>
                            <button
                                type='button'
                                onClick={() => setCurrent(idx)}
                                className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                                    idx === current ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60',
                                )}
                            >
                                {stepStatus[id] ? (
                                    <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-500' />
                                ) : (
                                    <CircleAlert className='h-4 w-4 shrink-0 text-amber-500' />
                                )}
                                <span className='truncate'>{stepLabels[id]}</span>
                            </button>
                        </li>
                    ))}
                </ol>

                <div className='border-border/40 bg-muted/20 space-y-4 rounded-xl border p-4'>
                    <div className='flex items-start gap-3'>
                        {stepId === 'dns' ? (
                            <Globe className='text-primary mt-0.5 h-5 w-5 shrink-0' />
                        ) : (
                            <ShieldCheck className='text-primary mt-0.5 h-5 w-5 shrink-0' />
                        )}
                        <div className='min-w-0 flex-1'>
                            <h4 className='font-semibold'>{stepLabels[stepId]}</h4>
                            <p className='text-muted-foreground mt-1 text-sm'>{stepDescriptions[stepId]}</p>
                        </div>
                    </div>

                    {stepId === 'dns' && (
                        <WebSpaceSslDnsGuide
                            ssl={sslEnabled}
                            nodeFqdn={nodeFqdn}
                            expectedIps={dnsResult?.expected_ips}
                            proxyProvider={proxyProvider}
                            variant='full'
                        />
                    )}

                    {stepId === 'verify' && (
                        <div className='space-y-3'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <Button loading={checking} onClick={() => void checkDns()}>
                                    {t('webSpaces.sslWizard.checkDns')}
                                </Button>
                                {dnsOk && (
                                    <span className='text-sm text-emerald-600'>{t('webSpaces.sslWizard.dnsOk')}</span>
                                )}
                                {dnsResult && !dnsOk && (
                                    <span className='text-sm text-amber-600'>
                                        {t('webSpaces.sslWizard.dnsNeedsFix')}
                                    </span>
                                )}
                            </div>
                            {dnsResult?.guidance && dnsResult.guidance.length > 0 && (
                                <WebSpaceSslDnsGuide
                                    dnsGuidance={dnsResult.guidance}
                                    expectedIps={dnsResult.expected_ips}
                                    variant='compact'
                                />
                            )}
                        </div>
                    )}

                    {stepId === 'ssl' && (
                        <div className='space-y-3'>
                            <label className='flex items-center gap-2 text-sm'>
                                <Checkbox
                                    checked={sslEnabled}
                                    onCheckedChange={(checked) => setSslEnabled(checked === true)}
                                />
                                {t('webSpaces.sslWizard.enableSsl')}
                            </label>
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.forceHttpsHelp')}</p>
                            {sslEnabled && (
                                <p className='text-sm text-emerald-600'>{t('webSpaces.sslWizard.sslEnabled')}</p>
                            )}
                            <Button loading={saving} onClick={() => void saveSsl()} size='sm'>
                                {t('webSpaces.sslWizard.saveSsl')}
                            </Button>
                        </div>
                    )}

                    {stepId === 'cert' && (
                        <div className='space-y-3'>
                            {sslDomains.length > 0 ? (
                                <ul className='divide-border divide-y rounded-lg border text-sm'>
                                    {sslDomains.map((d) => (
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
                                                        : t('webSpaces.sslWizard.certReady')
                                                    : t('webSpaces.sslWizard.certPending')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className='text-muted-foreground text-sm'>{t('webSpaces.sslWizard.certPending')}</p>
                            )}
                            {sslEnabled && (
                                <Button variant='outline' loading={renewing} onClick={() => void renewSsl()} size='sm'>
                                    {t('webSpaces.sslWizard.renewCert')}
                                </Button>
                            )}
                        </div>
                    )}

                    <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-4'>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={current <= 0}
                            onClick={() => setCurrent((v) => Math.max(0, v - 1))}
                        >
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('webSpaces.sslWizard.back')}
                        </Button>
                        <Button
                            type='button'
                            size='sm'
                            disabled={current >= STEPS.length - 1}
                            onClick={() => setCurrent((v) => Math.min(STEPS.length - 1, v + 1))}
                        >
                            {t('webSpaces.sslWizard.next')}
                            <ArrowRight className='ml-2 h-4 w-4' />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
