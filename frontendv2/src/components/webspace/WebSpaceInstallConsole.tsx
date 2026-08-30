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

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { WebSpaceTerminalPanel } from '@/components/webspace/WebSpaceTerminalPanel';
import { WebSpaceInfrastructurePanel } from '@/components/webspace/WebSpaceInfrastructurePanel';
import { toast } from 'sonner';

interface WebSpaceInstallConsoleProps {
    uuid: string;
    name?: string;
    jwtEndpoint: string;
    onCompleteRedirect?: string;
    backHref?: string;
    initialStatus?: string;
    webNodeId?: number;
    ssl?: boolean;
    databaseLimit?: number;
    mailboxLimit?: number;
}

export function WebSpaceInstallConsole({
    uuid,
    name,
    jwtEndpoint,
    onCompleteRedirect,
    backHref = '/admin/webspaces',
    initialStatus,
    webNodeId,
    ssl = false,
    databaseLimit = 0,
    mailboxLimit = 0,
}: WebSpaceInstallConsoleProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const completedRef = useRef(false);
    const [status, setStatus] = useState(initialStatus ?? 'installing');
    const isInstalling = status === 'installing' || status === 'reinstalling';
    const isFailed = status === 'failed' || status === 'installation_failed' || status === 'daemon_sync_failed';
    const isDone = status === 'installed';

    const statusLabel = (value: string) => {
        const key = `admin.webSpaces.status.${value}`;
        const translated = t(key);
        return translated === key ? value : translated;
    };

    return (
        <div className='mx-auto max-w-6xl space-y-6 pb-20'>
            <PageHeader
                title={name || t('admin.webSpaces.install.title')}
                description={t('admin.webSpaces.install.in_progress')}
                icon={Loader2}
                actions={
                    <Button variant='outline' onClick={() => router.push(backHref)}>
                        {t('common.back')}
                    </Button>
                }
            />

            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <PageCard title={t('admin.webSpaces.install.status')} className='md:col-span-3'>
                    <div className='flex items-center gap-3'>
                        {isDone ? (
                            <CheckCircle2 className='h-6 w-6 text-green-500' />
                        ) : isFailed ? (
                            <XCircle className='h-6 w-6 text-red-500' />
                        ) : (
                            <Loader2 className='text-primary h-6 w-6 animate-spin' />
                        )}
                        <div>
                            <p className='text-sm font-semibold capitalize'>{statusLabel(status)}</p>
                            <p className='text-muted-foreground text-xs'>
                                {isInstalling
                                    ? t('admin.webSpaces.install.wings_hint')
                                    : isFailed
                                      ? t('admin.webSpaces.install.daemon_sync_failed')
                                      : t('admin.webSpaces.install.complete_hint')}
                            </p>
                        </div>
                    </div>
                </PageCard>

                {isFailed && webNodeId && (
                    <PageCard title={t('webSpaces.infrastructure.title')} className='md:col-span-3'>
                        <p className='text-muted-foreground text-sm'>{t('admin.webNodes.hostingSetup.openQuilld')}</p>
                        <Button variant='outline' size='sm' className='mt-3' asChild>
                            <a href={`/admin/web-nodes/${webNodeId}/edit?tab=hosting`}>
                                {t('admin.webNodes.hostingSetup.title')}
                            </a>
                        </Button>
                    </PageCard>
                )}
            </div>

            <WebSpaceTerminalPanel
                jwtEndpoint={jwtEndpoint}
                enabled={!!uuid}
                installMode
                showPopoutButton={false}
                onStatus={setStatus}
                onInstallCompleted={() => {
                    if (completedRef.current) return;
                    completedRef.current = true;
                    setStatus('installed');
                    toast.success(t('admin.webSpaces.messages.created'));
                    router.push(onCompleteRedirect ?? `/admin/webspaces/${uuid}`);
                }}
                onInstallFailed={(msg) => {
                    setStatus('installation_failed');
                    toast.error(msg || t('admin.webSpaces.status.installation_failed'));
                }}
            />

            {isDone && (
                <div className='flex justify-end'>
                    <Button onClick={() => router.push(onCompleteRedirect ?? `/admin/webspaces/${uuid}`)}>
                        {t('admin.webSpaces.install.open_webspace')}
                    </Button>
                </div>
            )}
        </div>
    );
}
