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

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { RefreshCw, ArrowUpCircle, Shield, Info, Github, Globe, Settings2, Terminal } from 'lucide-react';
import axios from 'axios';
import { SystemInfoResponse, VersionStatus } from '../types';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface SelfUpdateTabProps {
    nodeId: number;
    systemData: SystemInfoResponse | null;
    onRefresh: () => void;
}

const DEFAULT_OPTIONS = {
    repoOwner: 'mythicalltd',
    repoName: 'featherwings',
    downloadUrl: 'https://github.com/mythicalltd/featherwings/releases/latest/download/featherwings',
};

export function SelfUpdateTab({ nodeId, systemData, onRefresh }: SelfUpdateTabProps) {
    const { t } = useTranslation();
    const [updating, setUpdating] = useState(false);
    const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(null);
    const [loading, setLoading] = useState(false);

    const [options, setOptions] = useState({
        source: 'github' as 'github' | 'url',
        repoOwner: DEFAULT_OPTIONS.repoOwner,
        repoName: DEFAULT_OPTIONS.repoName,
        version: '',
        url: DEFAULT_OPTIONS.downloadUrl,
        sha256: '',
        force: false,
        disableChecksum: false,
    });

    const fetchVersionStatus = async () => {
        if (!nodeId) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/nodes/${nodeId}/version-status`);
            if (res.data.success) {
                setVersionStatus(res.data.data);
            }
        } catch (e) {
            console.error('Failed to fetch version status', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVersionStatus();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    const handleUpdate = async () => {
        if (!confirm(t('admin.node.view.self_update.confirm'))) return;

        setUpdating(true);
        try {
            const { data } = await axios.post(`/api/admin/nodes/${nodeId}/self-update`, {
                source: options.source,
                repo_owner: options.source === 'github' ? options.repoOwner : undefined,
                repo_name: options.source === 'github' ? options.repoName : undefined,
                version: options.version || undefined,
                url: options.source === 'url' ? options.url : undefined,
                sha256: options.source === 'url' ? options.sha256 : undefined,
                force: options.force,
                disable_checksum: options.disableChecksum,
            });

            if (data.success) {
                toast.success(t('admin.node.view.self_update.success'));
                onRefresh();
                fetchVersionStatus();
            } else {
                toast.error(data.message || t('admin.node.view.self_update.failed'));
            }
        } catch (e: unknown) {
            let msg = t('admin.node.view.self_update.failed');
            if (axios.isAxiosError(e)) {
                msg = e.response?.data?.message || e.message;
            }
            toast.error(msg);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <PageCard
                    title={t('admin.node.view.self_update.current_version')}
                    description='Currently installed binary'
                    icon={Terminal}
                    className='h-full'
                >
                    <h3 className='text-3xl font-bold font-mono text-primary'>
                        {systemData?.wings.version || t('common.unknown')}
                    </h3>
                </PageCard>

                <PageCard
                    title={t('admin.node.view.self_update.latest_version')}
                    description='Available from upstream'
                    icon={RefreshCw}
                    className='h-full'
                >
                    <div className='flex items-center gap-4'>
                        <h3 className='text-3xl font-bold font-mono'>
                            {loading ? (
                                <RefreshCw className='h-8 w-8 animate-spin text-primary' />
                            ) : (
                                versionStatus?.latest_version || t('common.unknown')
                            )}
                        </h3>
                        {versionStatus?.update_available && (
                            <div className='px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-bold uppercase tracking-wider'>
                                {t('admin.node.view.self_update.update_ready')}
                            </div>
                        )}
                    </div>
                </PageCard>
            </div>

            <PageCard
                title={t('admin.node.view.self_update.options_title')}
                description={t('admin.node.view.self_update.options_description')}
                icon={Settings2}
            >
                <div className='space-y-8'>
                    <div className='space-y-4'>
                        <Label className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
                            {t('admin.node.view.self_update.source')}
                        </Label>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <button
                                type='button'
                                onClick={() => setOptions({ ...options, source: 'github' })}
                                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${
                                    options.source === 'github'
                                        ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5'
                                        : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                                }`}
                            >
                                <div
                                    className={`p-3 rounded-xl transition-all ${
                                        options.source === 'github'
                                            ? 'bg-primary text-white scale-110'
                                            : 'bg-muted text-muted-foreground group-hover:scale-105'
                                    }`}
                                >
                                    <Github className='h-5 w-5' />
                                </div>
                                <div className='flex-1'>
                                    <h4 className='font-bold text-sm'>
                                        {t('admin.node.view.self_update.source_github')}
                                    </h4>
                                    <p className='text-[11px] text-muted-foreground mt-1'>
                                        {t('admin.node.view.self_update.source_github_help')}
                                    </p>
                                </div>
                            </button>

                            <button
                                type='button'
                                onClick={() => setOptions({ ...options, source: 'url' })}
                                className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${
                                    options.source === 'url'
                                        ? 'bg-blue-500/5 border-blue-500 shadow-lg shadow-blue-500/5'
                                        : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                                }`}
                            >
                                <div
                                    className={`p-3 rounded-xl transition-all ${
                                        options.source === 'url'
                                            ? 'bg-blue-500 text-white scale-110'
                                            : 'bg-muted text-muted-foreground group-hover:scale-105'
                                    }`}
                                >
                                    <Globe className='h-5 w-5' />
                                </div>
                                <div className='flex-1'>
                                    <h4 className='font-bold text-sm'>{t('admin.node.view.self_update.source_url')}</h4>
                                    <p className='text-[11px] text-muted-foreground mt-1'>
                                        {t('admin.node.view.self_update.source_url_help')}
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50'>
                        {options.source === 'github' ? (
                            <>
                                <div className='space-y-2'>
                                    <Label className='text-xs font-bold' htmlFor='repoOrder'>
                                        {t('admin.node.view.self_update.repo_owner')}
                                    </Label>
                                    <Input
                                        id='repoOrder'
                                        value={options.repoOwner}
                                        onChange={(e) => setOptions({ ...options, repoOwner: e.target.value })}
                                        className='rounded-xl bg-muted/30'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-xs font-bold' htmlFor='repoName'>
                                        {t('admin.node.view.self_update.repo_name')}
                                    </Label>
                                    <Input
                                        id='repoName'
                                        value={options.repoName}
                                        onChange={(e) => setOptions({ ...options, repoName: e.target.value })}
                                        className='rounded-xl bg-muted/30'
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label className='text-xs font-bold' htmlFor='url'>
                                        {t('admin.node.view.self_update.download_url')}
                                    </Label>
                                    <Input
                                        id='url'
                                        value={options.url}
                                        onChange={(e) => setOptions({ ...options, url: e.target.value })}
                                        className='rounded-xl bg-muted/30'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-xs font-bold' htmlFor='sha256'>
                                        {t('admin.node.view.self_update.checksum_optional')}
                                    </Label>
                                    <Input
                                        id='sha256'
                                        value={options.sha256}
                                        onChange={(e) => setOptions({ ...options, sha256: e.target.value })}
                                        className='rounded-xl bg-muted/30'
                                    />
                                </div>
                            </>
                        )}

                        <div className='space-y-2'>
                            <Label className='text-xs font-bold' htmlFor='version'>
                                {t('admin.node.view.self_update.version_optional')}
                            </Label>
                            <Input
                                id='version'
                                value={options.version}
                                onChange={(e) => setOptions({ ...options, version: e.target.value })}
                                placeholder='e.g. v1.11.0'
                                className='rounded-xl bg-muted/30'
                            />
                            <p className='text-[10px] text-muted-foreground leading-tight'>
                                {t('admin.node.view.self_update.version_help')}
                            </p>
                        </div>
                    </div>

                    <div className='space-y-4 pt-6 border-t border-border/50'>
                        <Label className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
                            {t('admin.node.view.self_update.flags')}
                        </Label>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <div className='flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/30'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm font-bold'>
                                        {t('admin.node.view.self_update.force')}
                                    </Label>
                                    <p className='text-[10px] text-muted-foreground'>
                                        {t('admin.node.view.self_update.force_help')}
                                    </p>
                                </div>
                                <Switch
                                    checked={options.force}
                                    onCheckedChange={(checked) => setOptions({ ...options, force: checked })}
                                />
                            </div>
                            {options.source === 'url' && (
                                <div className='flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/30'>
                                    <div className='space-y-0.5'>
                                        <Label className='text-sm font-bold'>
                                            {t('admin.node.view.self_update.disable_checksum')}
                                        </Label>
                                        <p className='text-[10px] text-muted-foreground'>
                                            {t('admin.node.view.self_update.disable_checksum_help')}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={options.disableChecksum}
                                        onCheckedChange={(checked) =>
                                            setOptions({ ...options, disableChecksum: checked })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className='flex justify-end pt-4 '>
                        <Button
                            className='h-12 px-10 rounded-2xl shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white'
                            loading={updating}
                            onClick={handleUpdate}
                        >
                            <ArrowUpCircle className='h-4 w-4 mr-2' />
                            {t('admin.node.view.self_update.trigger')}
                        </Button>
                    </div>
                </div>
            </PageCard>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-4'>
                    <div className='p-2 bg-primary/20 rounded-xl h-fit'>
                        <Shield className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                        <h4 className='text-sm font-bold text-primary mb-1'>
                            {t('admin.node.view.self_update.safe_title')}
                        </h4>
                        <p className='text-[11px] text-primary/70 leading-relaxed'>
                            {t('admin.node.view.self_update.safe_description')}
                        </p>
                    </div>
                </div>
                <div className='p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-4'>
                    <div className='p-2 bg-blue-500/20 rounded-xl h-fit'>
                        <Info className='h-5 w-5 text-blue-500' />
                    </div>
                    <div>
                        <h4 className='text-sm font-bold text-blue-500 mb-1'>
                            {t('admin.node.view.self_update.auto_title')}
                        </h4>
                        <p className='text-[11px] text-blue-500/70 leading-relaxed'>
                            {t('admin.node.view.self_update.auto_description')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
