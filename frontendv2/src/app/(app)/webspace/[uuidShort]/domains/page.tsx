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
import { Globe, Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select-native';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { WebSpaceDomainsManager, type DomainRoute } from '@/components/webspace/WebSpaceDomainsManager';
import { WebSpaceDnsZoneEditor } from '@/components/webspace/WebSpaceDnsZoneEditor';
import { WebSpaceSslWizard } from '@/components/webspace/WebSpaceSslWizard';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { detectWwwPreference, domainRoutesFromWebSpace } from '@/lib/webspace-settings-utils';

interface WebSpaceDomainsData {
    domains?: string[];
    domain_routes?: DomainRoute[];
    ssl?: boolean;
    ssl_mode?: string;
    dns_status?: string | null;
    web_node_fqdn?: string | null;
}

export default function WebSpaceDomainsPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const { hasPermission } = useWebSpacePermissions(uuidShort);
    const canDnsRead = hasPermission(WebSpaceSubuserPermissions['dns.read']);
    const canDnsManage = hasPermission(WebSpaceSubuserPermissions['dns.manage']);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checking, setChecking] = useState(false);
    const [renewing, setRenewing] = useState(false);
    const [provisioningDns, setProvisioningDns] = useState(false);
    const [uploadingSsl, setUploadingSsl] = useState(false);
    const [removingSsl, setRemovingSsl] = useState(false);
    const [space, setSpace] = useState<WebSpaceDomainsData | null>(null);
    const [domainRoutes, setDomainRoutes] = useState<DomainRoute[]>([]);
    const [form, setForm] = useState({
        ssl: false,
        sslMode: 'acme',
        wwwPreference: 'none' as 'apex' | 'www' | 'none',
    });
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
    const [customCertFile, setCustomCertFile] = useState<File | null>(null);
    const [customKeyFile, setCustomKeyFile] = useState<File | null>(null);
    const [customSsl, setCustomSsl] = useState<{
        present?: boolean;
        not_after?: string;
        days_remaining?: number | null;
    } | null>(null);

    const load = useCallback(async () => {
        try {
            const [showRes, sslRes, customSslRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}`),
                axios.get(`/api/user/webspaces/${uuidShort}/ssl`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/ssl/custom`).catch(() => null),
            ]);
            const ws = showRes.data.data.webspace as WebSpaceDomainsData;
            setSpace(ws);
            const routes = domainRoutesFromWebSpace(ws);
            setDomainRoutes(routes);
            setForm({
                ssl: !!ws.ssl,
                sslMode: (ws.ssl_mode || 'acme').toLowerCase(),
                wwwPreference: detectWwwPreference(routes),
            });
            setSslInfo((sslRes?.data?.data?.ssl as typeof sslInfo) || null);
            setCustomSsl((customSslRes?.data?.data as typeof customSsl) ?? null);
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

    const saveDomains = async () => {
        const domains = domainRoutes.filter((r) => r.domain.trim()).map((r) => r.domain.trim().toLowerCase());

        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                domain_routes: domainRoutes.filter((r) => r.domain.trim()),
                domains,
                ssl: form.ssl,
                www_preference: form.wwwPreference,
            };
            if (form.ssl && form.sslMode !== 'custom') {
                payload.ssl_mode = form.sslMode === 'dns01' ? 'dns01' : 'acme';
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

    const provisionDns = async () => {
        setProvisioningDns(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/dns/provision`);
            if (data.data?.results) {
                toast.success(t('webSpaces.settings.dnsProvisioned'));
            }
            await checkDns();
        } catch (error) {
            let msg = t('webSpaces.settings.dnsProvisionFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setProvisioningDns(false);
        }
    };

    const uploadCustomSsl = async () => {
        if (!customCertFile || !customKeyFile) {
            toast.error(t('webSpaces.settings.customSslFilesRequired'));
            return;
        }
        setUploadingSsl(true);
        try {
            const body = new FormData();
            body.append('cert', customCertFile);
            body.append('key', customKeyFile);
            await axios.put(`/api/user/webspaces/${uuidShort}/ssl/custom`, body);
            toast.success(t('webSpaces.settings.customSslUploaded'));
            setCustomCertFile(null);
            setCustomKeyFile(null);
            await load();
        } catch (error) {
            let msg = t('webSpaces.settings.customSslUploadFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setUploadingSsl(false);
        }
    };

    const removeCustomSsl = async () => {
        if (!confirm(t('webSpaces.settings.customSslRemoveConfirm'))) return;
        setRemovingSsl(true);
        try {
            await axios.delete(`/api/user/webspaces/${uuidShort}/ssl/custom`);
            toast.success(t('webSpaces.settings.customSslRemoved'));
            setCustomSsl(null);
            await load();
        } catch (error) {
            let msg = t('webSpaces.settings.customSslRemoveFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setRemovingSsl(false);
        }
    };

    if (loading || !space) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <WebSpacePageWidgets pageId='webspace-domains'>
            <div className='mx-auto max-w-4xl space-y-8 pb-16'>
                <PageHeader
                    title={t('webSpaces.domainsPage.title')}
                    description={t('webSpaces.domainsPage.description')}
                />

                <WebSpaceSslWizard
                    uuidShort={uuidShort}
                    nodeFqdn={space.web_node_fqdn}
                    ssl={form.ssl}
                    dnsStatus={space.dns_status}
                    proxyProvider={sslInfo?.provider}
                    sslDomains={sslInfo?.domains ?? []}
                    onUpdated={() => void load()}
                />

                <PageCard title={t('webSpaces.settings.domainsTitle')} icon={Globe}>
                    <div className='space-y-4'>
                        <WebSpaceDomainsManager value={domainRoutes} onChange={setDomainRoutes} />
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                                checked={form.ssl}
                                onCheckedChange={(checked) => setForm({ ...form, ssl: checked === true })}
                            />
                            {t('webSpaces.settings.forceHttps')}
                        </label>
                        <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.forceHttpsHelp')}</p>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                {t('webSpaces.settings.wwwPreference')}
                            </Label>
                            <Select
                                value={form.wwwPreference}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        wwwPreference: e.target.value as 'apex' | 'www' | 'none',
                                    })
                                }
                            >
                                <option value='none'>{t('webSpaces.settings.wwwNone')}</option>
                                <option value='apex'>{t('webSpaces.settings.wwwPreferApex')}</option>
                                <option value='www'>{t('webSpaces.settings.wwwPreferWww')}</option>
                            </Select>
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.wwwPreferenceHelp')}</p>
                        </div>
                        {form.ssl && form.sslMode !== 'custom' && (
                            <label className='flex items-center gap-2 text-sm'>
                                <Checkbox
                                    checked={form.sslMode === 'dns01'}
                                    onCheckedChange={(checked) =>
                                        setForm({
                                            ...form,
                                            sslMode: checked === true ? 'dns01' : 'acme',
                                        })
                                    }
                                />
                                {t('webSpaces.settings.wildcardSsl')}
                            </label>
                        )}
                        {form.sslMode === 'dns01' && (
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.wildcardSslHelp')}</p>
                        )}
                        <Button loading={saving} onClick={() => void saveDomains()} size='sm'>
                            <Save className='mr-2 h-4 w-4' />
                            {t('webSpaces.settings.saveSettings')}
                        </Button>
                    </div>
                </PageCard>

                <PageCard title={t('webSpaces.settings.sslDnsTitle')} icon={Shield}>
                    <div className='space-y-4'>
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
                            <Button variant='outline' loading={provisioningDns} onClick={() => void provisionDns()}>
                                {t('webSpaces.settings.provisionDns')}
                            </Button>
                            {form.ssl && (
                                <Button variant='outline' loading={renewing} onClick={() => void renewSsl()}>
                                    {t('webSpaces.settings.renewSsl')}
                                </Button>
                            )}
                        </div>
                        <WebSpaceDnsZoneEditor
                            apiBase={`/api/user/webspaces/${uuidShort}`}
                            canRead={canDnsRead}
                            canManage={canDnsManage}
                        />
                        <div className='space-y-2'>
                            <p className='text-sm font-medium'>{t('webSpaces.settings.customSslTitle')}</p>
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.customSslHelp')}</p>
                            {customSsl?.present && (
                                <p className='text-muted-foreground text-sm'>
                                    {customSsl.days_remaining != null
                                        ? t('webSpaces.settings.certExpires', {
                                              days: String(customSsl.days_remaining),
                                          })
                                        : t('webSpaces.settings.certPresent')}
                                    {customSsl.not_after ? ` (${customSsl.not_after})` : ''}
                                </p>
                            )}
                            <div className='grid gap-2 sm:grid-cols-2'>
                                <Input
                                    type='file'
                                    accept='.pem,.crt,.cer'
                                    onChange={(e) => setCustomCertFile(e.target.files?.[0] ?? null)}
                                />
                                <Input
                                    type='file'
                                    accept='.pem,.key'
                                    onChange={(e) => setCustomKeyFile(e.target.files?.[0] ?? null)}
                                />
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                <Button variant='outline' loading={uploadingSsl} onClick={() => void uploadCustomSsl()}>
                                    {t('webSpaces.settings.uploadCustomSsl')}
                                </Button>
                                {customSsl?.present && (
                                    <Button
                                        variant='ghost'
                                        loading={removingSsl}
                                        onClick={() => void removeCustomSsl()}
                                    >
                                        {t('webSpaces.settings.removeCustomSsl')}
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
