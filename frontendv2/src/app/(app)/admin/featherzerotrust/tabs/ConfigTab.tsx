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
    malwarebazaar_enabled?: boolean;
    malwarebazaar_api_key?: string;
    malwarebazaar_selector?: string;
    malwarebazaar_import_limit?: number;
    malwarebazaar_confirm_imported?: boolean;
    malwarebazaar_require_signature?: boolean;
    malwarebazaar_default_detection_type?: string;
    malwarebazaar_max_age_hours?: number;
    malwarebazaar_allowed_file_types?: string[];
    malwarebazaar_blocked_tags?: string[];
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
    const [malwareBazaarAllowedTypesText, setMalwareBazaarAllowedTypesText] = useState('');
    const [malwareBazaarBlockedTagsText, setMalwareBazaarBlockedTagsText] = useState('');

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
            setMalwareBazaarAllowedTypesText(fetchedConfig.malwarebazaar_allowed_file_types?.join(', '));
            setMalwareBazaarBlockedTagsText(fetchedConfig.malwarebazaar_blocked_tags?.join(', '));
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
                malwarebazaar_allowed_file_types: malwareBazaarAllowedTypesText
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                malwarebazaar_blocked_tags: malwareBazaarBlockedTagsText
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
        if (!confirm(t('admin.featherzerotrust.config.messages.resetConfirm'))) return;
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
                    <RefreshCw className='text-primary h-6 w-6 animate-spin' />
                    <span className='text-muted-foreground'>{t('admin.featherzerotrust.config.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <Card className='border-border/70 border shadow-lg transition-all duration-300 hover:shadow-xl'>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <Settings className='text-primary h-5 w-5' />
                        <CardTitle>{t('admin.featherzerotrust.config.title')}</CardTitle>
                    </div>
                    <CardDescription>{t('admin.featherzerotrust.config.description')}</CardDescription>
                </CardHeader>
                <CardContent className='space-y-8'>
                    <div className='space-y-6'>
                        <div className='flex items-center justify-between'>
                            <h3 className='from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-lg font-semibold text-transparent'>
                                {t('admin.featherzerotrust.config.basicSettings')}
                            </h3>
                            <div className='flex gap-2'>
                                <Button variant='outline' size='sm' onClick={resetConfig} disabled={saving}>
                                    {t('admin.featherzerotrust.config.resetDefaults')}
                                </Button>
                                <Button size='sm' onClick={saveConfig} disabled={saving}>
                                    {saving ? (
                                        <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Save className='mr-2 h-4 w-4' />
                                    )}
                                    {t('admin.featherzerotrust.config.saveChanges')}
                                </Button>
                            </div>
                        </div>

                        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <div className='bg-muted/30 border-border/50 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-4 transition-all'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm font-medium'>
                                        {t('admin.featherzerotrust.config.systemEnabled')}
                                    </Label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.featherzerotrust.config.systemEnabledDesc')}
                                    </p>
                                </div>
                                <Switch
                                    checked={config.enabled}
                                    onCheckedChange={(val) => setConfig({ ...config, enabled: val })}
                                />
                            </div>

                            <div className='bg-muted/30 border-border/50 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-4 transition-all'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm font-medium'>
                                        {t('admin.featherzerotrust.config.autoSuspend')}
                                    </Label>
                                    <p className='text-muted-foreground text-xs'>
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
                                <p className='text-muted-foreground pl-1 text-[10px]'>
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
                                <p className='text-muted-foreground pl-1 text-[10px]'>
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
                                <p className='text-muted-foreground pl-1 text-[10px]'>
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
                                <p className='text-muted-foreground pl-1 text-[10px]'>
                                    {t('admin.featherzerotrust.config.maxJarSizeDesc')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className='space-y-6 border-t pt-6'>
                        <h3 className='from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-lg font-semibold text-transparent'>
                            {t('admin.featherzerotrust.config.notifications')}
                        </h3>
                        <div className='space-y-4'>
                            <div className='bg-muted/30 border-border/50 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-4 transition-all'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm font-medium'>
                                        {t('admin.featherzerotrust.config.discordWebhook')}
                                    </Label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.featherzerotrust.config.discordWebhookDesc')}
                                    </p>
                                </div>
                                <Switch
                                    checked={config.webhook_enabled}
                                    onCheckedChange={(val) => setConfig({ ...config, webhook_enabled: val })}
                                />
                            </div>
                            {config.webhook_enabled && (
                                <div className='animate-in fade-in slide-in-from-top-2 space-y-2 duration-300'>
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

                    <div className='space-y-6 border-t pt-6'>
                        <h3 className='from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-lg font-semibold text-transparent'>
                            {t('admin.featherzerotrust.config.malwarebazaar.title')}
                        </h3>
                        <div className='space-y-4'>
                            <div className='bg-muted/30 border-border/50 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-4 transition-all'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm font-medium'>
                                        {t('admin.featherzerotrust.config.malwarebazaar.enable')}
                                    </Label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.featherzerotrust.config.malwarebazaar.enableDesc')}
                                    </p>
                                </div>
                                <Switch
                                    checked={config.malwarebazaar_enabled}
                                    onCheckedChange={(val) => setConfig({ ...config, malwarebazaar_enabled: val })}
                                />
                            </div>

                            {config.malwarebazaar_enabled && (
                                <div className='animate-in fade-in slide-in-from-top-2 grid grid-cols-1 gap-4 duration-300 md:grid-cols-2'>
                                    <div className='space-y-2 md:col-span-2'>
                                        <Label>{t('admin.featherzerotrust.config.malwarebazaar.apiKey')}</Label>
                                        <Input
                                            type='password'
                                            value={config.malwarebazaar_api_key || ''}
                                            onChange={(e) =>
                                                setConfig({ ...config, malwarebazaar_api_key: e.target.value })
                                            }
                                            placeholder={t(
                                                'admin.featherzerotrust.config.malwarebazaar.apiKeyPlaceholder',
                                            )}
                                        />
                                        <p className='text-muted-foreground text-[10px]'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.apiKeyDesc')}
                                        </p>
                                    </div>

                                    <div className='space-y-2'>
                                        <Label>{t('admin.featherzerotrust.config.malwarebazaar.selector')}</Label>
                                        <select
                                            className='border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm'
                                            value={config.malwarebazaar_selector || '100'}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    malwarebazaar_selector: e.target.value || '100',
                                                })
                                            }
                                        >
                                            <option value='100'>
                                                {t(
                                                    'admin.featherzerotrust.config.malwarebazaar.selectorOptions.latest100',
                                                )}
                                            </option>
                                            <option value='time'>
                                                {t(
                                                    'admin.featherzerotrust.config.malwarebazaar.selectorOptions.lastHour',
                                                )}
                                            </option>
                                        </select>
                                        <p className='text-muted-foreground text-[10px]'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.selectorDesc')}
                                        </p>
                                    </div>

                                    <div className='space-y-2'>
                                        <Label>{t('admin.featherzerotrust.config.malwarebazaar.importLimit')}</Label>
                                        <Input
                                            type='number'
                                            min={1}
                                            max={1000}
                                            value={config.malwarebazaar_import_limit || 100}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    malwarebazaar_import_limit: Math.min(
                                                        1000,
                                                        Math.max(1, parseInt(e.target.value) || 100),
                                                    ),
                                                })
                                            }
                                            placeholder={t(
                                                'admin.featherzerotrust.config.malwarebazaar.importLimitPlaceholder',
                                            )}
                                        />
                                        <p className='text-muted-foreground text-[10px]'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.importLimitDesc')}
                                        </p>
                                    </div>

                                    <div className='space-y-2'>
                                        <Label>
                                            {t('admin.featherzerotrust.config.malwarebazaar.defaultDetectionType')}
                                        </Label>
                                        <Input
                                            value={config.malwarebazaar_default_detection_type || 'malware'}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    malwarebazaar_default_detection_type: e.target.value || 'malware',
                                                })
                                            }
                                            placeholder={t(
                                                'admin.featherzerotrust.config.malwarebazaar.defaultDetectionTypePlaceholder',
                                            )}
                                        />
                                        <p className='text-muted-foreground text-[10px]'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.defaultDetectionTypeDesc')}
                                        </p>
                                    </div>

                                    <div className='space-y-2'>
                                        <Label>{t('admin.featherzerotrust.config.malwarebazaar.maxAgeHours')}</Label>
                                        <Input
                                            type='number'
                                            min={0}
                                            value={config.malwarebazaar_max_age_hours || 0}
                                            onChange={(e) =>
                                                setConfig({
                                                    ...config,
                                                    malwarebazaar_max_age_hours: Math.max(
                                                        0,
                                                        parseInt(e.target.value) || 0,
                                                    ),
                                                })
                                            }
                                            placeholder={t(
                                                'admin.featherzerotrust.config.malwarebazaar.maxAgeHoursPlaceholder',
                                            )}
                                        />
                                        <p className='text-muted-foreground text-[10px]'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.maxAgeHoursDesc')}
                                        </p>
                                    </div>

                                    <div className='space-y-2 md:col-span-2'>
                                        <Label>
                                            {t('admin.featherzerotrust.config.malwarebazaar.allowedFileTypes')}
                                        </Label>
                                        <Textarea
                                            value={malwareBazaarAllowedTypesText}
                                            onChange={(e) => setMalwareBazaarAllowedTypesText(e.target.value)}
                                            placeholder={t(
                                                'admin.featherzerotrust.config.malwarebazaar.allowedFileTypesPlaceholder',
                                            )}
                                            className='min-h-[80px] font-mono text-xs'
                                        />
                                        <p className='text-muted-foreground text-[10px]'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.allowedFileTypesDesc')}
                                        </p>
                                    </div>

                                    <div className='space-y-2 md:col-span-2'>
                                        <Label>{t('admin.featherzerotrust.config.malwarebazaar.blockedTags')}</Label>
                                        <Textarea
                                            value={malwareBazaarBlockedTagsText}
                                            onChange={(e) => setMalwareBazaarBlockedTagsText(e.target.value)}
                                            placeholder={t(
                                                'admin.featherzerotrust.config.malwarebazaar.blockedTagsPlaceholder',
                                            )}
                                            className='min-h-[80px] font-mono text-xs'
                                        />
                                        <p className='text-muted-foreground text-[10px]'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.blockedTagsDesc')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {config.malwarebazaar_enabled && (
                            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                <div className='bg-muted/30 border-border/50 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-4 transition-all'>
                                    <div className='space-y-0.5'>
                                        <Label className='text-sm font-medium'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.autoConfirm')}
                                        </Label>
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.autoConfirmDesc')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={config.malwarebazaar_confirm_imported ?? true}
                                        onCheckedChange={(val) =>
                                            setConfig({ ...config, malwarebazaar_confirm_imported: val })
                                        }
                                    />
                                </div>

                                <div className='bg-muted/30 border-border/50 hover:bg-muted/50 flex items-center justify-between rounded-xl border p-4 transition-all'>
                                    <div className='space-y-0.5'>
                                        <Label className='text-sm font-medium'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.requireSignature')}
                                        </Label>
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.featherzerotrust.config.malwarebazaar.requireSignatureDesc')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={config.malwarebazaar_require_signature ?? false}
                                        onCheckedChange={(val) =>
                                            setConfig({ ...config, malwarebazaar_require_signature: val })
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className='space-y-6 border-t pt-6'>
                        <h3 className='from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-lg font-semibold text-transparent'>
                            {t('admin.featherzerotrust.config.exclusionRules')}
                        </h3>
                        <div className='grid grid-cols-1 gap-6'>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.ignoredExtensions')}</Label>
                                <Textarea
                                    value={ignoredExtensionsText}
                                    onChange={(e) => setIgnoredExtensionsText(e.target.value)}
                                    placeholder='.jar, .log, .txt'
                                    className='min-h-[80px] font-mono text-xs'
                                />
                                <p className='text-muted-foreground text-[10px]'>
                                    {t('admin.featherzerotrust.config.ignoredExtensionsDesc')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.ignoredFiles')}</Label>
                                <Textarea
                                    value={ignoredFilesText}
                                    onChange={(e) => setIgnoredFilesText(e.target.value)}
                                    placeholder='server.jar.old, latest.log'
                                    className='min-h-[80px] font-mono text-xs'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.ignoredPaths')}</Label>
                                <Textarea
                                    value={ignoredPathsText}
                                    onChange={(e) => setIgnoredPathsText(e.target.value)}
                                    placeholder='logs/, cache/, world/playerdata/'
                                    className='min-h-[80px] font-mono text-xs'
                                />
                            </div>
                        </div>
                    </div>

                    <div className='space-y-6 border-t pt-6'>
                        <h3 className='from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-lg font-semibold text-transparent'>
                            {t('admin.featherzerotrust.config.threatIndicators')}
                        </h3>
                        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.suspiciousPatterns')}</Label>
                                <Textarea
                                    value={suspiciousPatternsText}
                                    onChange={(e) => setSuspiciousPatternsText(e.target.value)}
                                    placeholder='stratum+tcp://&#10;pool.&#10;miningpool'
                                    className='min-h-[120px] font-mono text-xs'
                                />
                                <p className='text-muted-foreground text-[10px]'>
                                    {t('admin.featherzerotrust.config.suspiciousPatternsDesc')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.maliciousProcesses')}</Label>
                                <Textarea
                                    value={maliciousProcessesText}
                                    onChange={(e) => setMaliciousProcessesText(e.target.value)}
                                    placeholder='xmrig, earnfm, mcstorm.jar'
                                    className='min-h-[120px] font-mono text-xs'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.minerIndicators')}</Label>
                                <Textarea
                                    value={minerIndicatorsText}
                                    onChange={(e) => setMinerIndicatorsText(e.target.value)}
                                    placeholder='xmrig, ethminer, stratum+tcp'
                                    className='min-h-[100px] font-mono text-xs'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.config.whatsappIndicators')}</Label>
                                <Textarea
                                    value={whatsappIndicatorsText}
                                    onChange={(e) => setWhatsappIndicatorsText(e.target.value)}
                                    placeholder='whatsapp-web.js, baileys, wa-automate'
                                    className='min-h-[100px] font-mono text-xs'
                                />
                            </div>
                        </div>
                    </div>

                    <div className='space-y-6 border-t pt-6'>
                        <h3 className='from-foreground to-foreground/70 bg-linear-to-r bg-clip-text text-lg font-semibold text-transparent'>
                            {t('admin.featherzerotrust.config.monitoringThresholds')}
                        </h3>
                        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
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

                    <div className='flex gap-4 border-t pt-6'>
                        <Button className='flex-1 sm:flex-none' onClick={saveConfig} disabled={saving}>
                            {saving ? (
                                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Save className='mr-2 h-4 w-4' />
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
