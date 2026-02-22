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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Shield, Copy, RefreshCw, Terminal } from 'lucide-react';
import axios from 'axios';
import { copyToClipboard } from '@/lib/utils';

interface WingsTabProps {
    nodeId: string;
    wingsConfigYaml: string;
    handleResetKey: () => void;
    resetting: boolean;
}

interface SetupCommandData {
    panel_url: string;
    config_url: string;
    install_command: string;
    setup_command: string;
    config_path_hint: string;
}

export function WingsTab({ nodeId, wingsConfigYaml, handleResetKey, resetting }: WingsTabProps) {
    const { t } = useTranslation();
    const [setupData, setSetupData] = useState<SetupCommandData | null>(null);
    const [setupLoading, setSetupLoading] = useState(false);

    const fetchSetupCommand = useCallback(async () => {
        if (!nodeId) return;
        setSetupLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/nodes/${nodeId}/setup-command`);
            if (data?.data?.install_command != null || data?.data?.setup_command) {
                setSetupData(data.data);
            }
        } catch {
            setSetupData(null);
        } finally {
            setSetupLoading(false);
        }
    }, [nodeId]);

    useEffect(() => {
        fetchSetupCommand();
    }, [fetchSetupCommand]);

    return (
        <div className='space-y-6'>
            {/* Quick setup: fetch config from panel */}
            <PageCard title={t('admin.node.wings.setup_command_title')} icon={Terminal}>
                <div className='space-y-4'>
                    <p className='text-sm text-muted-foreground'>{t('admin.node.wings.setup_command_help')}</p>
                    {setupLoading ? (
                        <div className='bg-zinc-950/50 p-4 rounded-xl border border-white/5 text-sm text-muted-foreground'>
                            {t('common.loading')}...
                        </div>
                    ) : setupData ? (
                        <>
                            {/* Step 1: Install FeatherWings */}
                            <div className='space-y-2'>
                                <p className='text-xs font-semibold text-foreground'>
                                    {t('admin.node.wings.setup_step_1')}
                                </p>
                                <div className='relative group'>
                                    <pre className='bg-zinc-950 p-4 rounded-xl overflow-x-auto text-xs font-mono text-zinc-300 border border-white/5 break-all whitespace-pre-wrap'>
                                        {setupData.install_command}
                                    </pre>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='absolute top-2 right-2 bg-zinc-900/80 backdrop-blur-md border-white/10 hover:bg-zinc-800'
                                        onClick={() => copyToClipboard(setupData.install_command, t)}
                                    >
                                        <Copy className='h-4 w-4 mr-2' />
                                        {t('admin.node.wings.copy_setup_command')}
                                    </Button>
                                </div>
                            </div>
                            {/* Step 2: Fetch config and restart */}
                            {setupData.setup_command && (
                                <div className='space-y-2'>
                                    <p className='text-xs font-semibold text-foreground'>
                                        {t('admin.node.wings.setup_step_2')}
                                    </p>
                                    <div className='relative group'>
                                        <pre className='bg-zinc-950 p-4 rounded-xl overflow-x-auto text-xs font-mono text-zinc-300 border border-white/5 break-all whitespace-pre-wrap'>
                                            {setupData.setup_command}
                                        </pre>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            className='absolute top-2 right-2 bg-zinc-900/80 backdrop-blur-md border-white/10 hover:bg-zinc-800'
                                            onClick={() => copyToClipboard(setupData.setup_command, t)}
                                        >
                                            <Copy className='h-4 w-4 mr-2' />
                                            {t('admin.node.wings.copy_setup_command')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <p className='text-xs text-muted-foreground'>{t('admin.node.wings.setup_command_then')}</p>
                        </>
                    ) : (
                        <p className='text-sm text-muted-foreground'>
                            {t('admin.node.wings.setup_command_unavailable')}
                        </p>
                    )}
                </div>
            </PageCard>

            <PageCard title={t('admin.node.wings.config_title')} icon={Shield}>
                <div className='space-y-6'>
                    <p className='text-sm text-muted-foreground'>{t('admin.node.wings.config_help')}</p>
                    <div className='relative group'>
                        <pre className='bg-zinc-950 p-6 rounded-2xl overflow-x-auto text-xs font-mono text-zinc-300 border border-white/5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'>
                            {wingsConfigYaml}
                        </pre>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-md border-white/10 hover:bg-zinc-800'
                            onClick={() => copyToClipboard(wingsConfigYaml, t)}
                        >
                            <Copy className='h-4 w-4 mr-2' />
                            {t('admin.node.wings.copy_config')}
                        </Button>
                    </div>

                    <div className='pt-6 border-t border-white/5 space-y-4'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <h4 className='text-sm font-bold text-white'>{t('admin.node.wings.reset_key')}</h4>
                                <p className='text-xs text-muted-foreground mt-1'>
                                    {t('admin.node.wings.reset_key_help')}
                                </p>
                            </div>
                            <Button
                                type='button'
                                variant='destructive'
                                onClick={handleResetKey}
                                loading={resetting}
                                className='h-11 px-6 '
                            >
                                <RefreshCw className='h-4 w-4 mr-2' />
                                {t('admin.node.wings.reset_key')}
                            </Button>
                        </div>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
