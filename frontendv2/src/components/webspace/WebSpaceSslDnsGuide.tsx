/*
This file is part of FeatherPanel.
 */

'use client';

import { ShieldCheck, Globe, Server, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface DnsGuidanceRow {
    domain: string;
    ok: boolean;
    record_type: string;
    expected_value: string;
    current_value: string;
    hint: string;
}

interface WebSpaceSslDnsGuideProps {
    ssl?: boolean;
    nodeFqdn?: string | null;
    expectedIps?: string[];
    dnsGuidance?: DnsGuidanceRow[];
    proxyProvider?: string | null;
    className?: string;
    variant?: 'full' | 'compact';
}

export function WebSpaceSslDnsGuide({
    ssl,
    nodeFqdn,
    expectedIps = [],
    dnsGuidance,
    proxyProvider,
    className,
    variant = 'full',
}: WebSpaceSslDnsGuideProps) {
    const { t } = useTranslation();
    const fqdn = nodeFqdn?.trim() || t('webSpaces.guide.yourWebNode');
    const provider = (proxyProvider || 'caddy').toLowerCase();
    const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);

    const sslStep1 =
        provider === 'nginx'
            ? t('webSpaces.guide.sslStep1Nginx')
            : provider === 'traefik'
              ? t('webSpaces.guide.sslStep1Traefik')
              : t('webSpaces.guide.sslStep1Caddy');

    return (
        <div className={cn('space-y-4', className)}>
            <div className='border-border/50 bg-muted/20 rounded-xl border p-4'>
                <h4 className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                    <Globe className='text-primary h-4 w-4' />
                    {t('webSpaces.guide.dnsTitle')}
                </h4>
                <ol className='text-muted-foreground list-decimal space-y-2 pl-5 text-sm'>
                    <li>{t('webSpaces.guide.dnsStep1', { node: fqdn })}</li>
                    <li>{t('webSpaces.guide.dnsStep2')}</li>
                    <li>{t('webSpaces.guide.dnsStep3')}</li>
                    {expectedIps.length > 0 && (
                        <li>
                            {t('webSpaces.guide.dnsExpectedIps')}{' '}
                            <code className='bg-muted rounded px-1 font-mono text-xs'>{expectedIps.join(', ')}</code>
                        </li>
                    )}
                </ol>
                {variant === 'full' && (
                    <div className='mt-3 overflow-x-auto rounded-lg border text-xs'>
                        <table className='w-full'>
                            <thead className='bg-muted/40'>
                                <tr>
                                    <th className='px-3 py-2 text-left font-medium'>{t('webSpaces.guide.tableType')}</th>
                                    <th className='px-3 py-2 text-left font-medium'>{t('webSpaces.guide.tableHost')}</th>
                                    <th className='px-3 py-2 text-left font-medium'>{t('webSpaces.guide.tableValue')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className='border-t'>
                                    <td className='px-3 py-2 font-mono'>A</td>
                                    <td className='px-3 py-2 font-mono'>@ or www</td>
                                    <td className='px-3 py-2 font-mono'>{expectedIps[0] || t('webSpaces.guide.nodeIp')}</td>
                                </tr>
                                <tr className='border-t'>
                                    <td className='px-3 py-2 font-mono'>AAAA</td>
                                    <td className='px-3 py-2 font-mono'>@ or www</td>
                                    <td className='px-3 py-2 text-muted-foreground'>{t('webSpaces.guide.optionalIpv6')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className='border-border/50 bg-muted/20 rounded-xl border p-4'>
                <h4 className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                    <ShieldCheck className='text-primary h-4 w-4' />
                    {t('webSpaces.guide.sslTitle')}
                    {proxyProvider && (
                        <span className='text-muted-foreground text-xs font-normal'>({providerLabel})</span>
                    )}
                </h4>
                <ul className='text-muted-foreground space-y-2 text-sm'>
                    <li className='flex gap-2'>
                        <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
                        <span>{sslStep1}</span>
                    </li>
                    <li className='flex gap-2'>
                        <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
                        <span>{t('webSpaces.guide.sslStep2')}</span>
                    </li>
                    <li className='flex gap-2'>
                        <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
                        <span>
                            {ssl ? t('webSpaces.guide.sslEnabledNote', { provider: providerLabel }) : t('webSpaces.guide.sslDisabledNote')}
                        </span>
                    </li>
                </ul>
            </div>

            <div className='border-border/50 bg-muted/20 rounded-xl border p-4'>
                <h4 className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                    <Server className='text-primary h-4 w-4' />
                    {t('webSpaces.guide.backendTitle')}
                </h4>
                <p className='text-muted-foreground text-sm'>{t('webSpaces.guide.backendBody')}</p>
                <p className='text-muted-foreground mt-2 flex gap-2 text-sm'>
                    <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
                    <span>{t('webSpaces.guide.backendWarning')}</span>
                </p>
            </div>

            {dnsGuidance && dnsGuidance.length > 0 && (
                <div className='space-y-2'>
                    <p className='text-sm font-medium'>{t('webSpaces.guide.liveDnsResults')}</p>
                    <ul className='divide-border divide-y rounded-lg border text-sm'>
                        {dnsGuidance.map((g) => (
                            <li key={g.domain} className='space-y-1 px-3 py-2'>
                                <div className='flex items-center justify-between gap-2'>
                                    <span className='font-mono'>{g.domain}</span>
                                    <span className={g.ok ? 'text-xs text-emerald-600' : 'text-xs text-amber-600'}>
                                        {g.ok ? t('webSpaces.settings.ok') : t('webSpaces.settings.needsFix')}
                                    </span>
                                </div>
                                <p className='text-muted-foreground text-xs'>
                                    {g.record_type} → {g.expected_value}; {t('webSpaces.settings.current')}{' '}
                                    {g.current_value}
                                </p>
                                <p className='text-xs'>{g.hint}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
