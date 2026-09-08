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

import { useMemo, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/featherui/Button';
import { copyToClipboard } from '@/lib/utils';
import { Cable, Copy, Check, KeyRound, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface McpTabProps {
    slug?: string;
}

function ConfigBlock({
    title,
    value,
    onCopy,
    copied,
}: {
    title: string;
    value: string;
    onCopy: () => void;
    copied: boolean;
}) {
    return (
        <div className='border-border/60 bg-background/40 space-y-3 rounded-xl border p-4'>
            <div className='flex items-center justify-between gap-3'>
                <h4 className='text-foreground text-sm font-semibold'>{title}</h4>
                <Button type='button' variant='ghost' size='sm' onClick={onCopy} className='gap-1.5'>
                    {copied ? <Check className='h-3.5 w-3.5' /> : <Copy className='h-3.5 w-3.5' />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
            <pre className='bg-muted/50 text-muted-foreground overflow-x-auto rounded-lg p-3 text-xs leading-relaxed whitespace-pre'>
                {value}
            </pre>
        </div>
    );
}

export default function McpTab(_props: McpTabProps) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const router = useRouter();
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const panelOrigin = useMemo(() => {
        const fromSettings = settings?.app_url?.replace(/\/+$/, '');
        if (fromSettings) {
            return fromSettings;
        }
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return 'https://panel.example.com';
    }, [settings?.app_url]);

    const mcpUrl = `${panelOrigin}/mcp`;

    const remoteConfig = useMemo(
        () =>
            JSON.stringify(
                {
                    mcpServers: {
                        featherpanel: {
                            url: mcpUrl,
                            headers: {
                                Authorization: 'Bearer YOUR_API_KEY',
                            },
                        },
                    },
                },
                null,
                2,
            ),
        [mcpUrl],
    );

    const stdioConfig = useMemo(
        () =>
            JSON.stringify(
                {
                    mcpServers: {
                        featherpanel: {
                            command: 'node',
                            args: ['/path/to/featherpanel/mcp/dist/stdio.js'],
                            env: {
                                FEATHERPANEL_URL: panelOrigin,
                                FEATHERPANEL_API_KEY: 'YOUR_API_KEY',
                            },
                        },
                    },
                },
                null,
                2,
            ),
        [panelOrigin],
    );

    const copyValue = async (key: string, value: string) => {
        await copyToClipboard(value);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const capabilities = [
        t('account.mcp.capabilities.servers'),
        t('account.mcp.capabilities.power'),
        t('account.mcp.capabilities.files'),
        t('account.mcp.capabilities.search'),
        t('account.mcp.capabilities.console'),
        t('account.mcp.capabilities.startup'),
        t('account.mcp.capabilities.network'),
        t('account.mcp.capabilities.backups'),
        t('account.mcp.capabilities.databases'),
        t('account.mcp.capabilities.schedules'),
        t('account.mcp.capabilities.vds'),
        t('account.mcp.capabilities.knowledgebase'),
    ];

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                        <Cable className='text-primary h-5 w-5' />
                        <h3 className='text-foreground text-lg font-semibold'>{t('account.mcp.title')}</h3>
                    </div>
                    <p className='text-muted-foreground max-w-2xl text-sm'>{t('account.mcp.description')}</p>
                </div>
                <Button
                    type='button'
                    variant='outline'
                    className='gap-2'
                    onClick={() => router.replace('/dashboard/account?tab=api-keys')}
                >
                    <KeyRound className='h-4 w-4' />
                    {t('account.mcp.manageApiKeys')}
                </Button>
            </div>

            <div className='border-border/60 bg-card/40 space-y-3 rounded-2xl border p-5'>
                <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                    {t('account.mcp.endpointLabel')}
                </p>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                    <code className='bg-muted/60 text-foreground flex-1 overflow-x-auto rounded-lg px-3 py-2 text-sm'>
                        {mcpUrl}
                    </code>
                    <Button
                        type='button'
                        variant='secondary'
                        className='gap-2'
                        onClick={() => copyValue('url', mcpUrl)}
                    >
                        {copiedKey === 'url' ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
                        {t('account.mcp.copyUrl')}
                    </Button>
                </div>
                <p className='text-muted-foreground text-xs'>{t('account.mcp.endpointHelp')}</p>
            </div>

            <div className='space-y-3'>
                <h4 className='text-foreground text-sm font-semibold'>{t('account.mcp.whatItCanDo')}</h4>
                <ul className='text-muted-foreground grid gap-2 text-sm sm:grid-cols-2'>
                    {capabilities.map((item) => (
                        <li key={item} className='border-border/50 bg-background/30 rounded-lg border px-3 py-2'>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            <div className='border-border/60 bg-card/40 space-y-3 rounded-2xl border p-5'>
                <h4 className='text-foreground text-sm font-semibold'>{t('account.mcp.claudeConnectorTitle')}</h4>
                <p className='text-muted-foreground text-sm'>{t('account.mcp.claudeConnectorHelp')}</p>
                <ol className='text-muted-foreground list-decimal space-y-2 pl-5 text-sm'>
                    <li>{t('account.mcp.claudeStepName')}</li>
                    <li>
                        {t('account.mcp.claudeStepUrl')}{' '}
                        <code className='bg-muted/60 text-foreground rounded px-1.5 py-0.5 text-xs'>{mcpUrl}</code>
                    </li>
                    <li>{t('account.mcp.claudeStepConnect')}</li>
                    <li>{t('account.mcp.claudeStepConsent')}</li>
                </ol>
                <p className='text-muted-foreground text-xs'>{t('account.mcp.claudeHeadersOptional')}</p>
            </div>

            <div className='space-y-4'>
                <div>
                    <h4 className='text-foreground text-sm font-semibold'>{t('account.mcp.remoteTitle')}</h4>
                    <p className='text-muted-foreground mt-1 text-sm'>{t('account.mcp.remoteHelp')}</p>
                </div>
                <ConfigBlock
                    title={t('account.mcp.claudeCursorConfig')}
                    value={remoteConfig}
                    copied={copiedKey === 'remote'}
                    onCopy={() => copyValue('remote', remoteConfig)}
                />
            </div>

            <div className='space-y-4'>
                <div>
                    <h4 className='text-foreground text-sm font-semibold'>{t('account.mcp.stdioTitle')}</h4>
                    <p className='text-muted-foreground mt-1 text-sm'>{t('account.mcp.stdioHelp')}</p>
                </div>
                <ConfigBlock
                    title={t('account.mcp.stdioConfig')}
                    value={stdioConfig}
                    copied={copiedKey === 'stdio'}
                    onCopy={() => copyValue('stdio', stdioConfig)}
                />
            </div>

            <div className='border-border/60 bg-muted/20 text-muted-foreground flex flex-col gap-2 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between'>
                <p>{t('account.mcp.securityNote')}</p>
                <a
                    href='https://docs.mythical.systems/docs'
                    target='_blank'
                    rel='noreferrer'
                    className='text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline'
                >
                    {t('account.mcp.docsLink')}
                    <ExternalLink className='h-3.5 w-3.5' />
                </a>
            </div>
        </div>
    );
}
