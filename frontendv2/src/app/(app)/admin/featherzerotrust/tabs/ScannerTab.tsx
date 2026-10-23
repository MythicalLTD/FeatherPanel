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

import React, { useState, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { PageCard } from '@/components/featherui/PageCard';
import { Server, Scan, ShieldCheck, X, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { ServerSelectionModal } from '@/components/dashboard/ServerSelectionModal';
import { ResourceCard } from '@/components/featherui/ResourceCard';

interface ServerItem {
    id: number;
    uuid: string;
    uuidShort: string;
    name: string;
}

interface ScanResult {
    files_scanned: number;
    detections_count: number;
    errors?: Array<{ message: string; directory?: string; file?: string }>;
    duration: string;
    detections: Array<Record<string, unknown>>;
}

interface BatchScanResult {
    server_uuid: string;
    server_name: string;
    result: ScanResult | null;
    error: string | null;
}

const ScannerTab = () => {
    const { t } = useTranslation();
    const [scanning, setScanning] = useState(false);
    const [scanMode, setScanMode] = useState<'single' | 'batch'>('single');
    const [selectedServers, setSelectedServers] = useState<ServerItem[]>([]);
    const [scanForm, setScanForm] = useState({
        directory: '/',
        max_depth: 10,
    });

    const [scanResults, setScanResults] = useState<ScanResult | null>(null);
    const [batchResults, setBatchResults] = useState<BatchScanResult[]>([]);

    const [serverModalOpen, setServerModalOpen] = useState(false);
    const [allServers, setAllServers] = useState<ServerItem[]>([]);
    const [loadingServers, setLoadingServers] = useState(false);

    const fetchServers = useCallback(
        async (query = '') => {
            setLoadingServers(true);
            try {
                const { data } = await axios.get('/api/admin/servers', {
                    params: { search: query, page: 1, limit: 100 },
                });
                if (data.success && data.data) {
                    setAllServers(data.data.servers || data.data);
                }
            } catch (error) {
                console.error('Failed to fetch servers', error);
                toast.error(getApiErrorMessage(error, t, 'common.error'));
            } finally {
                setLoadingServers(false);
            }
        },
        [t],
    );

    const handlePerformScan = async () => {
        if (selectedServers.length === 0) {
            toast.error(t('admin.featherzerotrust.scanner.selectServer'));
            return;
        }

        setScanning(true);
        setScanResults(null);
        setBatchResults([]);

        try {
            if (scanMode === 'single') {
                const { data } = await axios.post('/api/admin/featherzerotrust/scan', {
                    server_uuid: selectedServers[0].uuid,
                    ...scanForm,
                });
                setScanResults(data.data);
                toast.success(t('admin.featherzerotrust.scanner.scanComplete', { count: data.data.detections_count }));
            } else {
                const { data } = await axios.post('/api/admin/featherzerotrust/scan/batch', {
                    server_uuids: selectedServers.map((s) => s.uuid),
                    ...scanForm,
                });

                const results = data.data.results.map((r: BatchScanResult & Record<string, unknown>) => ({
                    server_uuid: r.server_uuid,
                    server_name: selectedServers.find((s) => s.uuid === r.server_uuid)?.name || t('common.unknown'),
                    result: r.detections || r.detections_count ? r : null,
                    error: r.error || null,
                }));

                setBatchResults(results);
                const total = results.reduce(
                    (sum: number, r: BatchScanResult) => sum + (r.result?.detections_count || 0),
                    0,
                );
                toast.success(t('admin.featherzerotrust.scanner.batchComplete', { count: total }));
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.scanner.scanFailed'));
        } finally {
            setScanning(false);
        }
    };

    const addServer = (server: ServerItem) => {
        if (scanMode === 'single') {
            setSelectedServers([server]);
        } else if (!selectedServers.find((s) => s.uuid === server.uuid)) {
            setSelectedServers([...selectedServers, server]);
        }
    };

    const modes = [
        {
            id: 'single' as const,
            label: t('admin.featherzerotrust.scanner.single'),
            desc: t('admin.featherzerotrust.scanner.singleDesc'),
            icon: Scan,
        },
        {
            id: 'batch' as const,
            label: t('admin.featherzerotrust.scanner.batch'),
            desc: t('admin.featherzerotrust.scanner.batchDesc'),
            icon: Server,
        },
    ];

    return (
        <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
                <PageCard
                    className='lg:col-span-2'
                    title={t('admin.featherzerotrust.scanner.config')}
                    icon={ShieldCheck}
                >
                    <div className='space-y-5'>
                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                            {modes.map((mode) => (
                                <button
                                    key={mode.id}
                                    type='button'
                                    onClick={() => {
                                        setScanMode(mode.id);
                                        setSelectedServers([]);
                                    }}
                                    className={cn(
                                        'fp-surface-solid rounded-xl border p-4 text-left transition-colors',
                                        scanMode === mode.id
                                            ? 'border-primary/50 bg-primary/5'
                                            : 'hover:border-primary/30',
                                    )}
                                >
                                    <mode.icon
                                        className={cn(
                                            'mb-2 h-5 w-5',
                                            scanMode === mode.id ? 'text-primary' : 'text-muted-foreground',
                                        )}
                                    />
                                    <div className='text-sm font-semibold'>{mode.label}</div>
                                    <div className='text-muted-foreground mt-0.5 text-xs'>{mode.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <div className='space-y-2'>
                                <Label className='text-sm'>{t('admin.featherzerotrust.scanner.directory')}</Label>
                                <Input
                                    variant='surface'
                                    className='h-11'
                                    value={scanForm.directory}
                                    onChange={(e) => setScanForm({ ...scanForm, directory: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm'>{t('admin.featherzerotrust.scanner.maxDepth')}</Label>
                                <Input
                                    variant='surface'
                                    className='h-11'
                                    type='number'
                                    value={scanForm.max_depth}
                                    onChange={(e) =>
                                        setScanForm({ ...scanForm, max_depth: parseInt(e.target.value) || 0 })
                                    }
                                />
                            </div>
                        </div>

                        <Button
                            className='h-11 w-full'
                            disabled={scanning || selectedServers.length === 0}
                            onClick={() => void handlePerformScan()}
                        >
                            {scanning ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <ShieldCheck className='mr-2 h-4 w-4' />
                            )}
                            {scanning
                                ? t('admin.featherzerotrust.scanner.scanning')
                                : t('admin.featherzerotrust.scanner.startScan')}
                        </Button>
                    </div>
                </PageCard>

                <PageCard
                    title={t('admin.featherzerotrust.scanner.targets')}
                    icon={Server}
                    action={
                        <Badge variant='secondary' className='text-xs'>
                            {selectedServers.length}
                        </Badge>
                    }
                >
                    <div className='space-y-3'>
                        <Button
                            variant='outline'
                            className='h-11 w-full'
                            onClick={() => {
                                setServerModalOpen(true);
                                void fetchServers();
                            }}
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.featherzerotrust.scanner.addTarget')}
                        </Button>

                        <div className='max-h-[240px] space-y-2 overflow-y-auto'>
                            {selectedServers.length === 0 ? (
                                <p className='text-muted-foreground py-8 text-center text-xs'>
                                    {t('admin.featherzerotrust.scanner.noServersSelected')}
                                </p>
                            ) : (
                                selectedServers.map((s) => (
                                    <div
                                        key={s.uuid}
                                        className='fp-surface-solid flex items-center justify-between gap-2 rounded-xl border px-3 py-2'
                                    >
                                        <div className='min-w-0'>
                                            <div className='truncate text-sm font-medium'>{s.name}</div>
                                            <div className='text-muted-foreground truncate font-mono text-[10px]'>
                                                {s.uuidShort}
                                            </div>
                                        </div>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-8 w-8 shrink-0 p-0'
                                            onClick={() =>
                                                setSelectedServers(selectedServers.filter((sv) => sv.uuid !== s.uuid))
                                            }
                                            aria-label={t('common.remove')}
                                        >
                                            <X className='h-4 w-4' />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </PageCard>
            </div>

            {(scanResults || batchResults.length > 0) && (
                <div className='space-y-4'>
                    <h2 className='text-base font-semibold'>{t('admin.featherzerotrust.scanner.resultsTitle')}</h2>

                    {scanResults && (
                        <div className='space-y-4'>
                            <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
                                <div className='fp-surface-solid rounded-xl border px-4 py-3'>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.featherzerotrust.scanner.filesScanned')}
                                    </p>
                                    <p className='mt-1 text-sm font-medium'>
                                        {scanResults.files_scanned.toLocaleString()}
                                    </p>
                                </div>
                                <div className='fp-surface-solid rounded-xl border px-4 py-3'>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.featherzerotrust.scanner.detections')}
                                    </p>
                                    <p
                                        className={cn(
                                            'mt-1 text-sm font-medium',
                                            scanResults.detections_count > 0 && 'text-destructive',
                                        )}
                                    >
                                        {scanResults.detections_count}
                                    </p>
                                </div>
                                <div className='fp-surface-solid rounded-xl border px-4 py-3'>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.featherzerotrust.scanner.duration')}
                                    </p>
                                    <p className='mt-1 text-sm font-medium'>{scanResults.duration}</p>
                                </div>
                            </div>

                            {scanResults.detections && scanResults.detections.length > 0 && (
                                <div className='space-y-3'>
                                    <h3 className='text-destructive flex items-center gap-2 text-sm font-semibold'>
                                        <AlertTriangle className='h-4 w-4' />
                                        {t('admin.featherzerotrust.scanner.threatsFound')}
                                    </h3>
                                    <div className='space-y-2'>
                                        {scanResults.detections.map((d, i) => {
                                            const detection = d as {
                                                file_name?: string;
                                                file_path?: string;
                                                detection_type?: string;
                                            };
                                            return (
                                                <div
                                                    key={i}
                                                    className='fp-surface-solid border-destructive/20 flex items-start gap-3 rounded-xl border p-3'
                                                >
                                                    <AlertTriangle className='text-destructive mt-0.5 h-4 w-4 shrink-0' />
                                                    <div className='min-w-0'>
                                                        <div className='text-sm font-medium'>
                                                            {detection.file_name || t('common.unknown')}
                                                        </div>
                                                        <div className='text-muted-foreground truncate font-mono text-[10px]'>
                                                            {detection.file_path || 'N/A'}
                                                        </div>
                                                        <Badge variant='destructive' className='mt-2 text-[10px]'>
                                                            {detection.detection_type || 'Malicious Pattern'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {batchResults.length > 0 && (
                        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                            {batchResults.map((r) => (
                                <ResourceCard
                                    key={r.server_uuid}
                                    title={r.server_name}
                                    icon={Server}
                                    subtitle={r.server_uuid}
                                    badges={[
                                        {
                                            label: r.error ? 'FAILED' : 'COMPLETED',
                                            className: r.error
                                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                                : 'bg-secondary text-secondary-foreground border-transparent',
                                        },
                                    ]}
                                    description={
                                        r.error ? (
                                            <p className='text-destructive text-xs'>{r.error}</p>
                                        ) : (
                                            <div className='flex items-center gap-6'>
                                                <div className='flex flex-col'>
                                                    <span className='text-muted-foreground text-[10px] uppercase'>
                                                        {t('ui.admin.featherzerotrust.tabs.scannerTab.files')}
                                                    </span>
                                                    <span className='text-xs font-medium'>
                                                        {r.result?.files_scanned || 0}
                                                    </span>
                                                </div>
                                                <div className='flex flex-col'>
                                                    <span className='text-muted-foreground text-[10px] uppercase'>
                                                        {t('ui.admin.featherzerotrust.tabs.scannerTab.detections')}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'text-xs font-medium',
                                                            (r.result?.detections_count || 0) > 0 && 'text-destructive',
                                                        )}
                                                    >
                                                        {r.result?.detections_count || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <ServerSelectionModal
                isOpen={serverModalOpen}
                onClose={() => setServerModalOpen(false)}
                onSelect={addServer}
                servers={allServers}
                loading={loadingServers}
                onSearch={fetchServers}
            />
        </div>
    );
};

export default ScannerTab;
