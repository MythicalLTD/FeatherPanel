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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Radar, Server, Scan, ShieldCheck, Activity, Zap, X, AlertTriangle, Terminal, Plus } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ServerSelectionModal } from '@/components/dashboard/ServerSelectionModal';
import { ResourceCard } from '@/components/featherui/ResourceCard';

interface Server {
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
    const [selectedServers, setSelectedServers] = useState<Server[]>([]);
    const [scanForm, setScanForm] = useState({
        directory: '/',
        max_depth: 10,
    });

    const [scanProgress, setScanProgress] = useState({
        message: '',
        filesScanned: 0,
        currentDirectory: '',
    });

    const [scanResults, setScanResults] = useState<ScanResult | null>(null);
    const [batchResults, setBatchResults] = useState<BatchScanResult[]>([]);

    const [serverModalOpen, setServerModalOpen] = useState(false);
    const [allServers, setAllServers] = useState<Server[]>([]);
    const [loadingServers, setLoadingServers] = useState(false);

    const progressTimer = useRef<NodeJS.Timeout | null>(null);

    const fetchServers = useCallback(async (query = '') => {
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
        } finally {
            setLoadingServers(false);
        }
    }, []);

    const startFakeProgress = () => {
        setScanProgress({
            message: t('admin.featherzerotrust.scanner.progress.initializing'),
            filesScanned: 0,
            currentDirectory: scanForm.directory,
        });

        const messages = [
            t('admin.featherzerotrust.scanner.progress.scanningDirectory'),
            t('admin.featherzerotrust.scanner.progress.analyzingFileSystem'),
            t('admin.featherzerotrust.scanner.progress.checkingPermissions'),
            t('admin.featherzerotrust.scanner.progress.calculatingHashes'),
            t('admin.featherzerotrust.scanner.progress.comparingDatabase'),
            t('admin.featherzerotrust.scanner.progress.validatingSignatures'),
            t('admin.featherzerotrust.scanner.progress.scanningPatterns'),
        ];

        let idx = 0;
        const dirs = ['/home', '/var', '/usr/bin', '/etc', '/opt', '/tmp', '/srv', '/lib64'];

        progressTimer.current = setInterval(() => {
            setScanProgress((prev) => {
                const nextCount = prev.filesScanned + Math.floor(Math.random() * 80) + 20;
                return {
                    message: messages[idx % messages.length],
                    filesScanned: nextCount,
                    currentDirectory: dirs[Math.floor((nextCount / 200) % dirs.length)],
                };
            });
            idx++;
        }, 1500);
    };

    const stopProgress = () => {
        if (progressTimer.current) clearInterval(progressTimer.current);
        setScanProgress({ message: '', filesScanned: 0, currentDirectory: '' });
    };

    const handlePerformScan = async () => {
        if (selectedServers.length === 0) {
            toast.error(t('admin.featherzerotrust.scanner.selectServer'));
            return;
        }

        setScanning(true);
        setScanResults(null);
        setBatchResults([]);
        startFakeProgress();

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
                    server_name: selectedServers.find((s) => s.uuid === r.server_uuid)?.name || 'Unknown',
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
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.scanner.scanFailed'));
        } finally {
            setScanning(false);
            stopProgress();
        }
    };

    const addServer = (server: Server) => {
        if (scanMode === 'single') {
            setSelectedServers([server]);
        } else {
            if (!selectedServers.find((s) => s.uuid === server.uuid)) {
                setSelectedServers([...selectedServers, server]);
            }
        }
    };

    useEffect(() => {
        return () => stopProgress();
    }, []);

    return (
        <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
                <Card className='border-border/50 bg-card/30 backdrop-blur-sm lg:col-span-2'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-lg'>
                            <Activity className='text-primary h-5 w-5' />
                            {t('admin.featherzerotrust.scanner.config')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-6'>
                        <div className='grid grid-cols-2 gap-4'>
                            {[
                                {
                                    id: 'single',
                                    label: t('admin.featherzerotrust.scanner.single'),
                                    icon: Scan,
                                    desc: t('admin.featherzerotrust.scanner.singleDesc'),
                                },
                                {
                                    id: 'batch',
                                    label: t('admin.featherzerotrust.scanner.batch'),
                                    icon: Zap,
                                    desc: t('admin.featherzerotrust.scanner.batchDesc'),
                                },
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => {
                                        setScanMode(mode.id as 'single' | 'batch');
                                        setSelectedServers([]);
                                    }}
                                    className={cn(
                                        'group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all',
                                        scanMode === mode.id
                                            ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(var(--primary),0.1)]'
                                            : 'border-border/50 hover:border-primary/30 hover:bg-muted/30',
                                    )}
                                >
                                    {scanMode === mode.id && (
                                        <div className='bg-primary/5 absolute inset-0 animate-pulse' />
                                    )}
                                    <div className='relative z-10'>
                                        <mode.icon
                                            className={cn(
                                                'mb-2 h-6 w-6',
                                                scanMode === mode.id ? 'text-primary' : 'text-muted-foreground',
                                            )}
                                        />
                                        <div className='text-sm font-bold'>{mode.label}</div>
                                        <div className='text-muted-foreground text-[10px]'>{mode.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className='grid grid-cols-2 gap-4 pt-2'>
                            <div className='space-y-2'>
                                <Label className='text-xs'>{t('admin.featherzerotrust.scanner.directory')}</Label>
                                <Input
                                    className='h-9'
                                    value={scanForm.directory}
                                    onChange={(e) => setScanForm({ ...scanForm, directory: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-xs'>{t('admin.featherzerotrust.scanner.maxDepth')}</Label>
                                <Input
                                    className='h-9'
                                    type='number'
                                    value={scanForm.max_depth}
                                    onChange={(e) => setScanForm({ ...scanForm, max_depth: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <Button
                            className='text-md h-12 w-full font-bold transition-all hover:scale-[1.01] active:scale-[0.99]'
                            disabled={scanning || selectedServers.length === 0}
                            onClick={handlePerformScan}
                        >
                            {scanning ? (
                                <Radar className='mr-2 h-5 w-5 animate-spin' />
                            ) : (
                                <ShieldCheck className='mr-2 h-5 w-5' />
                            )}
                            {scanning
                                ? t('admin.featherzerotrust.scanner.scanning')
                                : t('admin.featherzerotrust.scanner.startScan')}
                        </Button>
                    </CardContent>
                </Card>

                <Card className='border-border/50 bg-card/30 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='text-muted-foreground flex items-center justify-between text-sm font-medium tracking-wider uppercase'>
                            {t('admin.featherzerotrust.scanner.targets')}
                            <Badge variant='outline' className='text-[10px]'>
                                {selectedServers.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <Button
                            variant='outline'
                            className='border-primary/30 hover:border-primary/60 hover:bg-primary/5 h-10 w-full border-dashed'
                            onClick={() => {
                                setServerModalOpen(true);
                                fetchServers();
                            }}
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.featherzerotrust.scanner.addTarget')}
                        </Button>

                        <div className='custom-scrollbar max-h-[250px] space-y-2 overflow-y-auto pr-2'>
                            {selectedServers.length === 0 ? (
                                <div className='py-8 text-center opacity-40'>
                                    <Server className='mx-auto mb-2 h-8 w-8' />
                                    <p className='text-[10px]'>
                                        {t('admin.featherzerotrust.scanner.noServersSelected')}
                                    </p>
                                </div>
                            ) : (
                                selectedServers.map((s) => (
                                    <div
                                        key={s.uuid}
                                        className='bg-muted/30 border-border/50 group animate-in slide-in-from-right-2 flex items-center justify-between rounded-lg border p-2'
                                    >
                                        <div className='min-w-0'>
                                            <div className='truncate text-xs font-bold'>{s.name}</div>
                                            <div className='truncate font-mono text-[9px] opacity-50'>
                                                {s.uuidShort}
                                            </div>
                                        </div>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100'
                                            onClick={() =>
                                                setSelectedServers(selectedServers.filter((sv) => sv.uuid !== s.uuid))
                                            }
                                        >
                                            <X className='h-3 w-3' />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {scanning && (
                <Card className='border-primary/30 animate-in fade-in zoom-in overflow-hidden bg-black/40 backdrop-blur-xl duration-500'>
                    <div className='bg-primary/10 border-primary/20 flex items-center justify-between border-b px-4 py-2'>
                        <div className='flex items-center gap-2'>
                            <Terminal className='text-primary h-4 w-4' />
                            <span className='text-primary font-mono text-[10px] tracking-widest uppercase'>
                                {t('admin.featherzerotrust.scanner.liveFeed')}
                            </span>
                        </div>
                        <div className='flex items-center gap-1'>
                            <div className='h-1.5 w-1.5 animate-pulse rounded-full bg-red-500' />
                            <span className='text-[10px] font-bold text-red-500'>
                                {t('admin.featherzerotrust.scanner.analyzing')}
                            </span>
                        </div>
                    </div>
                    <CardContent className='space-y-4 p-4'>
                        <div className='mb-2 flex items-center justify-between'>
                            <span className='text-primary-foreground/80 text-sm font-medium'>
                                {scanProgress.message}
                            </span>
                            <span className='text-primary font-mono text-xs'>
                                {scanProgress.filesScanned.toLocaleString()} files
                            </span>
                        </div>
                        <div className='bg-muted/30 h-1 overflow-hidden rounded-full'>
                            <div
                                className='bg-primary h-full transition-all duration-500 ease-out'
                                style={{ width: `${Math.min((scanProgress.filesScanned / 1500) * 100, 98)}%` }}
                            />
                        </div>
                        <div className='rounded-lg border border-white/5 bg-black/50 p-3 font-mono text-[10px] text-green-500/80'>
                            <div className='flex items-center gap-2'>
                                <span className='opacity-50'>CUR_DIR:</span>
                                <span className='truncate'>{scanProgress.currentDirectory}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {(scanResults || batchResults.length > 0) && (
                <div className='animate-in slide-in-from-bottom-6 space-y-6 duration-700'>
                    <div className='flex items-center gap-3'>
                        <ShieldCheck className='h-6 w-6 text-green-500' />
                        <h2 className='text-xl font-bold'>{t('admin.featherzerotrust.scanner.resultsTitle')}</h2>
                    </div>

                    {scanResults && (
                        <div className='space-y-4'>
                            <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                                <Card className='border-blue-500/20 bg-blue-500/5 p-4'>
                                    <div className='text-[10px] font-bold text-blue-500 uppercase'>
                                        {t('admin.featherzerotrust.scanner.filesScanned')}
                                    </div>
                                    <div className='text-2xl font-bold'>
                                        {scanResults.files_scanned.toLocaleString()}
                                    </div>
                                </Card>
                                <Card
                                    className={cn(
                                        'p-4 transition-colors',
                                        scanResults.detections_count > 0
                                            ? 'border-red-500/30 bg-red-500/10'
                                            : 'border-green-500/20 bg-green-500/5',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'text-[10px] font-bold uppercase',
                                            scanResults.detections_count > 0 ? 'text-red-500' : 'text-green-500',
                                        )}
                                    >
                                        {t('admin.featherzerotrust.scanner.detections')}
                                    </div>
                                    <div className='text-2xl font-bold'>{scanResults.detections_count}</div>
                                </Card>
                                <Card className='bg-muted/30 border-border/50 p-4'>
                                    <div className='text-muted-foreground text-[10px] font-bold uppercase'>
                                        {t('admin.featherzerotrust.scanner.duration')}
                                    </div>
                                    <div className='text-2xl font-bold'>{scanResults.duration}</div>
                                </Card>
                            </div>

                            {scanResults.detections && scanResults.detections.length > 0 && (
                                <div className='space-y-3'>
                                    <h3 className='flex items-center gap-2 text-sm font-semibold text-red-500'>
                                        <AlertTriangle className='h-4 w-4' />
                                        {t('admin.featherzerotrust.scanner.threatsFound')}
                                    </h3>
                                    <div className='grid grid-cols-1 gap-3'>
                                        {scanResults.detections.map((d, i) => {
                                            const detection = d as {
                                                file_name?: string;
                                                file_path?: string;
                                                detection_type?: string;
                                            };
                                            return (
                                                <div
                                                    key={i}
                                                    className='flex items-start gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3'
                                                >
                                                    <div className='rounded-lg bg-red-500/20 p-2 text-red-500'>
                                                        <AlertTriangle className='h-4 w-4' />
                                                    </div>
                                                    <div className='min-w-0'>
                                                        <div className='text-sm font-bold text-red-200'>
                                                            {detection.file_name || 'Unknown'}
                                                        </div>
                                                        <div className='truncate font-mono text-[10px] text-red-500/80'>
                                                            {detection.file_path || 'N/A'}
                                                        </div>
                                                        <div className='mt-1'>
                                                            <Badge
                                                                variant='destructive'
                                                                className='text-[9px] tracking-tighter uppercase'
                                                            >
                                                                {detection.detection_type || 'Malicious Pattern'}
                                                            </Badge>
                                                        </div>
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
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                                                ? 'bg-red-500/20 text-red-500'
                                                : 'bg-green-500/20 text-green-500',
                                        },
                                    ]}
                                    description={
                                        r.error ? (
                                            <p className='mt-2 text-xs text-red-500 italic'>{r.error}</p>
                                        ) : (
                                            <div className='mt-2 flex items-center gap-6'>
                                                <div className='flex flex-col'>
                                                    <span className='text-muted-foreground text-[10px] uppercase'>
                                                        Files
                                                    </span>
                                                    <span className='text-xs font-bold'>
                                                        {r.result?.files_scanned || 0}
                                                    </span>
                                                </div>
                                                <div className='flex flex-col'>
                                                    <span className='text-muted-foreground text-[10px] uppercase'>
                                                        Detections
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'text-xs font-bold',
                                                            (r.result?.detections_count || 0) > 0 && 'text-red-500',
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
