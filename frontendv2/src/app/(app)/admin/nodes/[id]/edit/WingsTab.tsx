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
                    <p className='text-muted-foreground text-sm'>{t('admin.node.wings.setup_command_help')}</p>
                    {setupLoading ? (
                        <div className='text-muted-foreground rounded-xl border border-white/5 bg-zinc-950/50 p-4 text-sm'>
                            {t('common.loading')}...
                        </div>
                    ) : setupData ? (
                        <>
                            {/* Step 1: Install FeatherWings */}
                            <div className='space-y-2'>
                                <p className='text-foreground text-xs font-semibold'>
                                    {t('admin.node.wings.setup_step_1')}
                                </p>
                                <div className='group relative'>
                                    <pre className='overflow-x-auto rounded-xl border border-white/5 bg-zinc-950 p-4 font-mono text-xs break-all whitespace-pre-wrap text-zinc-300'>
                                        {setupData.install_command}
                                    </pre>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='absolute top-2 right-2 border-white/10 bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-800'
                                        onClick={() => copyToClipboard(setupData.install_command, t)}
                                    >
                                        <Copy className='mr-2 h-4 w-4' />
                                        {t('admin.node.wings.copy_setup_command')}
                                    </Button>
                                </div>
                            </div>
                            {/* Step 2: Fetch config and restart */}
                            {setupData.setup_command && (
                                <div className='space-y-2'>
                                    <p className='text-foreground text-xs font-semibold'>
                                        {t('admin.node.wings.setup_step_2')}
                                    </p>
                                    <div className='group relative'>
                                        <pre className='overflow-x-auto rounded-xl border border-white/5 bg-zinc-950 p-4 font-mono text-xs break-all whitespace-pre-wrap text-zinc-300'>
                                            {setupData.setup_command}
                                        </pre>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            className='absolute top-2 right-2 border-white/10 bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-800'
                                            onClick={() => copyToClipboard(setupData.setup_command, t)}
                                        >
                                            <Copy className='mr-2 h-4 w-4' />
                                            {t('admin.node.wings.copy_setup_command')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <p className='text-muted-foreground text-xs'>{t('admin.node.wings.setup_command_then')}</p>
                        </>
                    ) : (
                        <p className='text-muted-foreground text-sm'>
                            {t('admin.node.wings.setup_command_unavailable')}
                        </p>
                    )}
                </div>
            </PageCard>

            <PageCard title={t('admin.node.wings.config_title')} icon={Shield}>
                <div className='space-y-6'>
                    <p className='text-muted-foreground text-sm'>{t('admin.node.wings.config_help')}</p>
                    <div className='group relative'>
                        <pre className='scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-x-auto rounded-2xl border border-white/5 bg-zinc-950 p-6 font-mono text-xs text-zinc-300'>
                            {wingsConfigYaml}
                        </pre>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='absolute top-3 right-3 border-white/10 bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-800'
                            onClick={() => copyToClipboard(wingsConfigYaml, t)}
                        >
                            <Copy className='mr-2 h-4 w-4' />
                            {t('admin.node.wings.copy_config')}
                        </Button>
                    </div>

                    <div className='space-y-4 border-t border-white/5 pt-6'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <h4 className='text-sm font-bold text-white'>{t('admin.node.wings.reset_key')}</h4>
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {t('admin.node.wings.reset_key_help')}
                                </p>
                            </div>
                            <Button
                                type='button'
                                variant='destructive'
                                onClick={handleResetKey}
                                loading={resetting}
                                className='h-11 px-6'
                            >
                                <RefreshCw className='mr-2 h-4 w-4' />
                                {t('admin.node.wings.reset_key')}
                            </Button>
                        </div>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
