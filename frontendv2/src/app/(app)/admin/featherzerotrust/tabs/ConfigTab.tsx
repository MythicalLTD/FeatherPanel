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

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, RefreshCw, Save } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

interface ZeroTrustConfig {
    enabled?: boolean;
    scan_interval?: number;
    max_file_size?: number;
    max_depth?: number;
    auto_suspend?: boolean;
    webhook_enabled?: boolean;
    webhook_url?: string;
    ignored_extensions?: string[];
    ignored_files?: string[];
    ignored_paths?: string[];
    suspicious_extensions?: string[];
    suspicious_names?: string[];
    suspicious_patterns?: string[];
    malicious_processes?: string[];
    whatsapp_indicators?: string[];
    miner_indicators?: string[];
    suspicious_words?: string[];
    suspicious_content?: string[];
    high_cpu_threshold?: number;
    high_network_usage?: number;
    small_volume_size?: number;
    max_jar_size?: number;
}

const ConfigTab = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<ZeroTrustConfig>({});

    const [ignoredExtensionsText, setIgnoredExtensionsText] = useState('');
    const [ignoredFilesText, setIgnoredFilesText] = useState('');
    const [ignoredPathsText, setIgnoredPathsText] = useState('');
    const [suspiciousExtensionsText, setSuspiciousExtensionsText] = useState('');
    const [suspiciousNamesText, setSuspiciousNamesText] = useState('');
    const [suspiciousPatternsText, setSuspiciousPatternsText] = useState('');
    const [maliciousProcessesText, setMaliciousProcessesText] = useState('');
    const [whatsappIndicatorsText, setWhatsappIndicatorsText] = useState('');
    const [minerIndicatorsText, setMinerIndicatorsText] = useState('');
    const [suspiciousWordsText, setSuspiciousWordsText] = useState('');
    const [suspiciousContentText, setSuspiciousContentText] = useState('');

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/featherzerotrust/config');
            const fetchedConfig = data.data || {};
            setConfig(fetchedConfig);

            setIgnoredExtensionsText(fetchedConfig.ignored_extensions?.join(', '));
            setIgnoredFilesText(fetchedConfig.ignored_files?.join(', '));
            setIgnoredPathsText(fetchedConfig.ignored_paths?.join(', '));
            setSuspiciousExtensionsText(fetchedConfig.suspicious_extensions?.join(', '));
            setSuspiciousNamesText(fetchedConfig.suspicious_names?.join(', '));
            setSuspiciousPatternsText(fetchedConfig.suspicious_patterns?.join('\n'));
            setMaliciousProcessesText(fetchedConfig.malicious_processes?.join(', '));
            setWhatsappIndicatorsText(fetchedConfig.whatsapp_indicators?.join(', '));
            setMinerIndicatorsText(fetchedConfig.miner_indicators?.join(', '));
            setSuspiciousWordsText(fetchedConfig.suspicious_words?.join(', '));
            setSuspiciousContentText(fetchedConfig.suspicious_content?.join(', '));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.config.messages.loadFailed'));
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const updatedConfig: ZeroTrustConfig = {
                ...config,
                ignored_extensions: ignoredExtensionsText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                ignored_files: ignoredFilesText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                ignored_paths: ignoredPathsText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                suspicious_extensions: suspiciousExtensionsText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                suspicious_names: suspiciousNamesText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                suspicious_patterns: suspiciousPatternsText
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                malicious_processes: maliciousProcessesText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                whatsapp_indicators: whatsappIndicatorsText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                miner_indicators: minerIndicatorsText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                suspicious_words: suspiciousWordsText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                suspicious_content: suspiciousContentText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
            };

            await axios.put('/api/admin/featherzerotrust/config', updatedConfig);
            toast.success(t('admin.featherzerotrust.config.messages.saved'));
            fetchConfig();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.config.messages.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const resetConfig = async () => {
        if (!confirm('Are you sure you want to reset all configuration to defaults?')) return;
        setSaving(true);
        try {
            await axios.put('/api/admin/featherzerotrust/config', {});
            toast.success(t('admin.featherzerotrust.config.messages.reset'));
            fetchConfig();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.config.messages.resetFailed'));
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        void fetchConfig();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <RefreshCw className='h-6 w-6 animate-spin text-primary' />
                    <span className='text-muted-foreground'>{t('admin.featherzerotrust.config.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <Card className='border border-border/70 shadow-lg transition-all duration-300 hover:shadow-xl'>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <Settings className='h-5 w-5 text-primary' />
                        <CardTitle>{t('admin.featherzerotrust.config.title')}</CardTitle>
                    </div>
                    <CardDescription>{t('admin.featherzerotrust.config.description')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-8'>
                    <div className='space-y-6'>
                        <div className='flex items-center justify-between'>
                            <h3 className='text-lg font-semibold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                                {t('admin.featherzerotrust.config.basicSettings')}
                            </h3>
                            <div className='flex gap-2'>
                                <Button variant='outline' size='sm' onClick={resetConfig} disabled={saving}>
                                    {t('admin.featherzerotrust.config.resetDefaults')}
                                </Button>
                                <Button size='sm' onClick={saveConfig} disabled={saving}>
                                    {saving ? (
                                        <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                    ) : (
                                        <Save className='h-4 w-4 mr-2' />
                                    )}
                                    {t('admin.featherzerotrust.config.saveChanges')}
                                </Button>
                            </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div className='flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-xl transition-all hover:bg-muted/50'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm font-medium'>
                                        {t('admin.featherzerotrust.config.systemEnabled')}
                                    </Label>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.featherzerotrust.config.systemEnabledDesc')}
                                    </p>
                                </div>
                                <Switch
                                    checked={config.enabled}
                                    onCheckedChange={(val) => setConfig({ ...config, enabled: val })}
                                />
                            </div>

                            <div className='flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-xl transition-all hover:bg-muted/50'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm font-medium'>
                                        {t('admin.featherzerotrust.config.autoSuspend')}
                                    </Label>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.featherzerotrust.config.autoSuspendDesc')}
                                    </p>
                                </div>
                                <Switch
                                    checked={config.auto_suspend}
                                    onCheckedChange={(val) => setConfig({ ...config, auto_suspend: val })}
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.scanInterval')}</Label>
                                <Input
                                    type='number'
                                    value={config.scan_interval || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, scan_interval: parseInt(e.target.value) || 0 })
                                    }
                                    placeholder='15'
                                />
                                <p className='text-[10px] text-muted-foreground pl-1'>
                                    {t('admin.featherzerotrust.config.scanIntervalDesc')}
                                </p>
                            </div>

                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.maxDepth')}</Label>
                                <Input
                                    type='number'
                                    value={config.max_depth || ''}
                                    onChange={(e) => setConfig({ ...config, max_depth: parseInt(e.target.value) || 0 })}
                                    placeholder='10'
                                />
                                <p className='text-[10px] text-muted-foreground pl-1'>
                                    {t('admin.featherzerotrust.config.maxDepthDesc')}
                                </p>
                            </div>

                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.maxFileSize')}</Label>
                                <Input
                                    type='number'
                                    value={config.max_file_size || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, max_file_size: parseInt(e.target.value) || 0 })
                                    }
                                    placeholder='0 for unlimited'
                                />
                                <p className='text-[10px] text-muted-foreground pl-1'>
                                    {t('admin.featherzerotrust.config.maxFileSizeDesc')}
                                </p>
                            </div>

                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.maxJarSize')}</Label>
                                <Input
                                    type='number'
                                    value={config.max_jar_size || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, max_jar_size: parseInt(e.target.value) || 0 })
                                    }
                                    placeholder='Small JARs are suspicious'
                                />
                                <p className='text-[10px] text-muted-foreground pl-1'>
                                    {t('admin.featherzerotrust.config.maxJarSizeDesc')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='space-y-6 pt-6 border-t'>
                        <h3 className='text-lg font-semibold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                            {t('admin.featherzerotrust.config.notifications')}
                        </h3>
                        <div className='space-y-4'>
                            <div className='flex items-center justify-between p-4 bg-muted/30 border border-border/50 rounded-xl transition-all hover:bg-muted/50'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm font-medium'>
                                        {t('admin.featherzerotrust.config.discordWebhook')}
                                    </Label>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.featherzerotrust.config.discordWebhookDesc')}
                                    </p>
                                </div>
                                <Switch
                                    checked={config.webhook_enabled}
                                    onCheckedChange={(val) => setConfig({ ...config, webhook_enabled: val })}
                                />
                            </div>
                            {config.webhook_enabled && (
                                <div className='space-y-2 animate-in fade-in slide-in-from-top-2 duration-300'>
                                    <Label>{t('admin.featherzerotrust.config.webhookUrl')}</Label>
                                    <Input
                                        value={config.webhook_url || ''}
                                        onChange={(e) => setConfig({ ...config, webhook_url: e.target.value })}
                                        placeholder='https://discord.com/api/webhooks/...'
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className='space-y-6 pt-6 border-t'>
                        <h3 className='text-lg font-semibold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                            {t('admin.featherzerotrust.config.exclusionRules')}
                        </h3>
                        <div className='grid grid-cols-1 gap-6'>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.ignoredExtensions')}</Label>
                                <Textarea
                                    value={ignoredExtensionsText}
                                    onChange={(e) => setIgnoredExtensionsText(e.target.value)}
                                    placeholder='.jar, .log, .txt'
                                    className='font-mono text-xs min-h-[80px]'
                                />
                                <p className='text-[10px] text-muted-foreground'>
                                    {t('admin.featherzerotrust.config.ignoredExtensionsDesc')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.ignoredFiles')}</Label>
                                <Textarea
                                    value={ignoredFilesText}
                                    onChange={(e) => setIgnoredFilesText(e.target.value)}
                                    placeholder='server.jar.old, latest.log'
                                    className='font-mono text-xs min-h-[80px]'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.ignoredPaths')}</Label>
                                <Textarea
                                    value={ignoredPathsText}
                                    onChange={(e) => setIgnoredPathsText(e.target.value)}
                                    placeholder='logs/, cache/, world/playerdata/'
                                    className='font-mono text-xs min-h-[80px]'
                                />
                            </div>
                        </div>
                    </div>

                    <div className='space-y-6 pt-6 border-t'>
                        <h3 className='text-lg font-semibold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                            {t('admin.featherzerotrust.config.threatIndicators')}
                        </h3>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.suspiciousPatterns')}</Label>
                                <Textarea
                                    value={suspiciousPatternsText}
                                    onChange={(e) => setSuspiciousPatternsText(e.target.value)}
                                    placeholder='stratum+tcp://&#10;pool.&#10;miningpool'
                                    className='font-mono text-xs min-h-[120px]'
                                />
                                <p className='text-[10px] text-muted-foreground'>
                                    {t('admin.featherzerotrust.config.suspiciousPatternsDesc')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.maliciousProcesses')}</Label>
                                <Textarea
                                    value={maliciousProcessesText}
                                    onChange={(e) => setMaliciousProcessesText(e.target.value)}
                                    placeholder='xmrig, earnfm, mcstorm.jar'
                                    className='font-mono text-xs min-h-[120px]'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.minerIndicators')}</Label>
                                <Textarea
                                    value={minerIndicatorsText}
                                    onChange={(e) => setMinerIndicatorsText(e.target.value)}
                                    placeholder='xmrig, ethminer, stratum+tcp'
                                    className='font-mono text-xs min-h-[100px]'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.whatsappIndicators')}</Label>
                                <Textarea
                                    value={whatsappIndicatorsText}
                                    onChange={(e) => setWhatsappIndicatorsText(e.target.value)}
                                    placeholder='whatsapp-web.js, baileys, wa-automate'
                                    className='font-mono text-xs min-h-[100px]'
                                />
                            </div>
                        </div>
                    </div>

                    <div className='space-y-6 pt-6 border-t'>
                        <h3 className='text-lg font-semibold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
                            {t('admin.featherzerotrust.config.monitoringThresholds')}
                        </h3>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.highCpuThreshold')}</Label>
                                <Input
                                    type='number'
                                    step='0.01'
                                    value={config.high_cpu_threshold || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, high_cpu_threshold: parseFloat(e.target.value) || 0 })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.highNetwork')}</Label>
                                <Input
                                    type='number'
                                    value={config.high_network_usage || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, high_network_usage: parseInt(e.target.value) || 0 })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.smallVolumeSize')}</Label>
                                <Input
                                    type='number'
                                    step='0.1'
                                    value={config.small_volume_size || ''}
                                    onChange={(e) =>
                                        setConfig({ ...config, small_volume_size: parseFloat(e.target.value) || 0 })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className='flex gap-4 pt-6 border-t'>
                        <Button className='flex-1 sm:flex-none' onClick={saveConfig} disabled={saving}>
                            {saving ? (
                                <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                            ) : (
                                <Save className='h-4 w-4 mr-2' />
                            )}
                            {t('admin.featherzerotrust.config.saveChanges')}
                        </Button>
                        <Button
                            variant='outline'
                            className='flex-1 sm:flex-none'
                            onClick={fetchConfig}
                            disabled={saving}
                        >
                            {t('admin.featherzerotrust.config.discardChanges')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ConfigTab;
