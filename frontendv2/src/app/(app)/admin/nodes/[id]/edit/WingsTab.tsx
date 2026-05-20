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

interface CommandBlockProps {
    command: string;
    copyLabel: string;
    onCopy: () => void;
    preClassName?: string;
}

function CommandBlock({ command, copyLabel, onCopy, preClassName }: CommandBlockProps) {
    return (
        <div className='overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950'>
            <div className='flex justify-end border-b border-zinc-800 bg-zinc-900 px-3 py-2'>
                <Button
                    type='button'
                    variant='plain'
                    size='sm'
                    className='border border-zinc-600 bg-zinc-800 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-700 hover:text-white'
                    onClick={onCopy}
                >
                    <Copy className='mr-2 h-4 w-4 shrink-0' />
                    <span className='truncate'>{copyLabel}</span>
                </Button>
            </div>
            <pre
                className={
                    preClassName ?? 'overflow-x-auto p-4 font-mono text-xs break-all whitespace-pre-wrap text-zinc-300'
                }
            >
                {command}
            </pre>
        </div>
    );
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
                                <CommandBlock
                                    command={setupData.install_command}
                                    copyLabel={t('admin.node.wings.copy_setup_command')}
                                    onCopy={() => copyToClipboard(setupData.install_command, t)}
                                />
                            </div>
                            {/* Step 2: Fetch config and restart */}
                            {setupData.setup_command && (
                                <div className='space-y-2'>
                                    <p className='text-foreground text-xs font-semibold'>
                                        {t('admin.node.wings.setup_step_2')}
                                    </p>
                                    <CommandBlock
                                        command={setupData.setup_command}
                                        copyLabel={t('admin.node.wings.copy_setup_command')}
                                        onCopy={() => copyToClipboard(setupData.setup_command, t)}
                                    />
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
                    <CommandBlock
                        command={wingsConfigYaml}
                        copyLabel={t('admin.node.wings.copy_config')}
                        onCopy={() => copyToClipboard(wingsConfigYaml, t)}
                        preClassName='scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-x-auto p-6 font-mono text-xs whitespace-pre text-zinc-300'
                    />

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
