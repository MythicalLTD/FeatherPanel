/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { RefreshCw, ArrowUpCircle, CheckCircle2, Shield, Info } from 'lucide-react';
import axios from 'axios';
import { SystemInfoResponse, VersionStatus } from '../types';
import { toast } from 'sonner';

interface SelfUpdateTabProps {
    nodeId: number;
    systemData: SystemInfoResponse | null;
    onRefresh: () => void;
}

export function SelfUpdateTab({ nodeId, systemData, onRefresh }: SelfUpdateTabProps) {
    const { t } = useTranslation();
    const [updating, setUpdating] = useState(false);
    const [versionStatus, setVersionStatus] = useState<VersionStatus | null>(null);
    const [loading, setLoading] = useState(false);

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
            const { data } = await axios.post(`/api/admin/nodes/${nodeId}/self-update`);
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
            <PageCard
                title={t('admin.node.view.self_update.title')}
                description={t('admin.node.view.self_update.description')}
                icon={ArrowUpCircle}
            >
                <div className='space-y-8'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div className='p-6 rounded-2xl bg-muted/30 border border-border/50'>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2'>
                                {t('admin.node.view.self_update.current_version')}
                            </p>
                            <h3 className='text-2xl font-bold font-mono'>
                                {systemData?.wings.version || t('common.unknown')}
                            </h3>
                        </div>
                        <div className='p-6 rounded-2xl bg-muted/30 border border-border/50'>
                            <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2'>
                                {t('admin.node.view.self_update.latest_version')}
                            </p>
                            <h3 className='text-2xl font-bold font-mono'>
                                {loading ? (
                                    <RefreshCw className='h-6 w-6 animate-spin text-primary inline' />
                                ) : (
                                    versionStatus?.latest_version || t('common.unknown')
                                )}
                            </h3>
                        </div>
                    </div>

                    {versionStatus?.update_available ? (
                        <div className='p-6 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col md:flex-row items-center gap-6'>
                            <div className='p-4 rounded-2xl bg-orange-500/20'>
                                <ArrowUpCircle className='h-8 w-8 text-orange-500' />
                            </div>
                            <div className='flex-1 text-center md:text-left'>
                                <h3 className='text-lg font-bold text-orange-500 mb-1'>
                                    {t('admin.node.view.self_update.update_ready')}
                                </h3>
                                <p className='text-sm text-orange-500/70 mb-4'>
                                    {t('admin.node.view.self_update.update_help')}
                                </p>
                                <Button
                                    className='bg-orange-500 hover:bg-orange-600 text-white border-none h-11 px-8 rounded-xl shadow-lg shadow-orange-500/20'
                                    loading={updating}
                                    onClick={handleUpdate}
                                >
                                    <RefreshCw className='h-4 w-4 mr-2' />
                                    {t('admin.node.view.self_update.install_now')}
                                </Button>
                            </div>
                        </div>
                    ) : versionStatus?.is_up_to_date ? (
                        <div className='p-8 rounded-2xl bg-green-500/10 border border-green-500/20 text-center space-y-6'>
                            <div className='p-4 rounded-full bg-green-500/20 w-fit mx-auto'>
                                <CheckCircle2 className='h-10 w-10 text-green-500' />
                            </div>
                            <div className='space-y-4'>
                                <div>
                                    <h3 className='text-xl font-bold text-green-500'>
                                        {t('admin.node.view.self_update.is_latest')}
                                    </h3>
                                    <p className='text-sm text-muted-foreground'>
                                        {t('admin.node.view.self_update.latest_help')}
                                    </p>
                                </div>
                                <div className='pt-2 border-t border-green-500/10'>
                                    <p className='text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-3'>
                                        Administrative Actions
                                    </p>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        className='rounded-xl border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-600 dark:text-green-400'
                                        loading={updating}
                                        onClick={handleUpdate}
                                    >
                                        <RefreshCw className='h-3 w-3 mr-2' />
                                        Force Reinstall {systemData?.wings.version}
                                    </Button>
                                    <p className='mt-2 text-[10px] text-muted-foreground italic'>
                                        Reinstalls the current version. Useful if binary is corrupted.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className='p-6 rounded-2xl bg-muted/20 border border-dashed border-border text-center'>
                            <p className='text-sm text-muted-foreground italic'>
                                {t('admin.node.view.self_update.version_check_failed')}
                            </p>
                            <Button
                                variant='ghost'
                                size='sm'
                                className='mt-2'
                                onClick={fetchVersionStatus}
                                loading={loading}
                            >
                                <RefreshCw className='h-3 w-3 mr-2' />
                                {t('common.retry')}
                            </Button>
                        </div>
                    )}
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
