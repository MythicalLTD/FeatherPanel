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

interface FeatherQuilldTabProps {
    nodeId: string;
    handleResetToken: () => void;
    resetting: boolean;
    configRefreshKey?: number;
}

interface SetupCommandData {
    panel_url: string;
    config_url: string;
    install_command: string;
    setup_command: string;
    config_path_hint: string;
    daemon_type?: string;
    daemon_display_name?: string;
    systemd_unit?: string;
    join_data?: string;
    join_config?: string;
    runtime_config?: string;
    config?: string;
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

export function FeatherQuilldTab({ nodeId, handleResetToken, resetting, configRefreshKey = 0 }: FeatherQuilldTabProps) {
    const { t } = useTranslation();
    const [setupData, setSetupData] = useState<SetupCommandData | null>(null);
    const [setupLoading, setSetupLoading] = useState(false);
    const [joinYaml, setJoinYaml] = useState('');
    const [runtimeYaml, setRuntimeYaml] = useState('');
    const [configLoading, setConfigLoading] = useState(false);

    const fetchSetupCommand = useCallback(async () => {
        if (!nodeId) return;
        setSetupLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/web-nodes/${nodeId}/setup-command`);
            if (data?.data?.install_command != null || data?.data?.setup_command) {
                setSetupData(data.data);
                setJoinYaml(data.data.join_config || '');
            }
        } catch {
            setSetupData(null);
            setJoinYaml('');
        } finally {
            setSetupLoading(false);
        }
    }, [nodeId]);

    useEffect(() => {
        fetchSetupCommand();
    }, [fetchSetupCommand, configRefreshKey]);

    const fetchConfig = useCallback(async () => {
        if (!nodeId) return;
        setConfigLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/web-nodes/${nodeId}/config`);
            if (data?.data) {
                if (data.data.join_config) {
                    setJoinYaml(data.data.join_config);
                }
                setRuntimeYaml(data.data.runtime_config || data.data.config || '');
            }
        } catch {
            setRuntimeYaml('');
        } finally {
            setConfigLoading(false);
        }
    }, [nodeId]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig, configRefreshKey]);

    return (
        <div className='space-y-6'>
            <PageCard title={t('admin.webNodes.quilld.setup_command_title')} icon={Terminal}>
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm'>{t('admin.webNodes.quilld.setup_command_help')}</p>
                    {setupData?.daemon_display_name ? (
                        <p className='text-foreground text-sm font-medium'>
                            Daemon: {setupData.daemon_display_name}
                            {setupData.config_path_hint ? ` · ${setupData.config_path_hint}` : ''}
                        </p>
                    ) : null}
                    {setupLoading ? (
                        <div className='text-muted-foreground rounded-xl border border-white/5 bg-zinc-950/50 p-4 text-sm'>
                            {t('common.loading')}...
                        </div>
                    ) : setupData ? (
                        <>
                            <div className='space-y-2'>
                                <p className='text-foreground text-xs font-semibold'>
                                    {t('admin.webNodes.quilld.setup_step_1')}
                                </p>
                                <CommandBlock
                                    command={setupData.install_command}
                                    copyLabel={t('admin.webNodes.quilld.copy_setup_command')}
                                    onCopy={() => copyToClipboard(setupData.install_command, t)}
                                />
                            </div>
                            {setupData.setup_command && (
                                <div className='space-y-4'>
                                    <div className='space-y-2'>
                                        <p className='text-foreground text-xs font-semibold'>
                                            {t('admin.webNodes.quilld.setup_step_2')}
                                        </p>
                                        <CommandBlock
                                            command={setupData.setup_command}
                                            copyLabel={t('admin.webNodes.quilld.copy_full_command')}
                                            onCopy={() => copyToClipboard(setupData.setup_command, t)}
                                        />
                                    </div>
                                    {setupData.join_data && (
                                        <div className='space-y-2'>
                                            <p className='text-foreground text-xs font-semibold'>
                                                {t('admin.webNodes.quilld.join_data_title')}
                                            </p>
                                            <p className='text-muted-foreground text-xs'>
                                                {t('admin.webNodes.quilld.join_data_help')}
                                            </p>
                                            <CommandBlock
                                                command={setupData.join_data}
                                                copyLabel={t('admin.webNodes.quilld.copy_join_data')}
                                                onCopy={() => copyToClipboard(setupData.join_data!, t)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            {joinYaml && (
                                <div className='space-y-2'>
                                    <p className='text-foreground text-xs font-semibold'>
                                        {t('admin.webNodes.quilld.join_config_title')}
                                    </p>
                                    <CommandBlock
                                        command={joinYaml}
                                        copyLabel={t('admin.webNodes.quilld.copy_join_config')}
                                        onCopy={() => copyToClipboard(joinYaml, t)}
                                        preClassName='scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-x-auto p-6 font-mono text-xs whitespace-pre text-zinc-300 max-h-[24rem]'
                                    />
                                </div>
                            )}
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.webNodes.quilld.setup_command_then')}
                            </p>
                        </>
                    ) : (
                        <p className='text-muted-foreground text-sm'>
                            {t('admin.webNodes.quilld.setup_command_unavailable')}
                        </p>
                    )}
                </div>
            </PageCard>

            <PageCard title={t('admin.webNodes.quilld.runtime_config_title')} icon={Shield}>
                <div className='space-y-6'>
                    <p className='text-muted-foreground text-sm'>{t('admin.webNodes.quilld.runtime_config_help')}</p>
                    {configLoading ? (
                        <div className='text-muted-foreground rounded-xl border border-white/5 bg-zinc-950/50 p-4 text-sm'>
                            {t('common.loading')}...
                        </div>
                    ) : runtimeYaml ? (
                        <CommandBlock
                            command={runtimeYaml}
                            copyLabel={t('admin.webNodes.quilld.copy_runtime_config')}
                            onCopy={() => copyToClipboard(runtimeYaml, t)}
                            preClassName='scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent overflow-x-auto p-6 font-mono text-xs whitespace-pre text-zinc-300 max-h-[32rem]'
                        />
                    ) : (
                        <p className='text-muted-foreground text-sm'>{t('admin.webNodes.quilld.config_unavailable')}</p>
                    )}

                    <div className='space-y-4 border-t border-white/5 pt-6'>
                        <div className='flex items-center justify-between'>
                            <div>
                                <h4 className='text-sm font-bold text-white'>{t('admin.webNodes.daemon.reset_key')}</h4>
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {t('admin.webNodes.quilld.reset_key_help')}
                                </p>
                            </div>
                            <Button
                                type='button'
                                variant='destructive'
                                onClick={handleResetToken}
                                loading={resetting}
                                className='h-11 px-6'
                            >
                                <RefreshCw className='mr-2 h-4 w-4' />
                                {t('admin.webNodes.daemon.reset_key')}
                            </Button>
                        </div>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
