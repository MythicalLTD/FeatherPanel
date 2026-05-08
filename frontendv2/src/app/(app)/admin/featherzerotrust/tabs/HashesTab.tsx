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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import {
    ShieldCheck,
    Database,
    AlertTriangle,
    TrendingUp,
    Search,
    Trash2,
    CheckSquare,
    Plus,
    RefreshCw,
    X,
    Download,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';

interface HashRecord {
    id: number;
    hash: string;
    file_name: string;
    detection_type: string;
    server_uuid: string | null;
    server_name: string | null;
    node_id: number | null;
    file_path: string | null;
    file_size: number | null;
    times_detected: number;
    confirmed_malicious: 'true' | 'false';
    metadata: Record<string, unknown>;
    first_seen: string;
    last_seen: string;
}

interface HashStats {
    totalHashes: number;
    confirmedHashes: number;
    unconfirmedHashes: number;
    recentDetections: number;
    totalServers: number;
    topDetectionTypes: Array<{ detection_type: string; count: number }>;
}

const HashesTab = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<HashStats>({
        totalHashes: 0,
        confirmedHashes: 0,
        unconfirmedHashes: 0,
        recentDetections: 0,
        totalServers: 0,
        topDetectionTypes: [],
    });
    const [hashes, setHashes] = useState<HashRecord[]>([]);
    const [confirmedOnly, setConfirmedOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedHashes, setSelectedHashes] = useState<Set<string>>(new Set());

    const [addHashDialogOpen, setAddHashDialogOpen] = useState(false);
    const [checkHashesDialogOpen, setCheckHashesDialogOpen] = useState(false);

    const [addingHash, setAddingHash] = useState(false);
    const [newHash, setNewHash] = useState({
        hash: '',
        file_name: '',
        detection_type: 'suspicious',
        confirmed_malicious: false,
        server_uuid: '',
        file_path: '',
        file_size: '' as string,
    });

    const [hashCheckInput, setHashCheckInput] = useState('');
    const [hashCheckResults, setHashCheckResults] = useState<
        Array<{ hash: string; found: boolean; details?: HashRecord }>
    >([]);
    const [checkingHashes, setCheckingHashes] = useState(false);

    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [bulkConfirming, setBulkConfirming] = useState(false);
    const [importingMalwareBazaar, setImportingMalwareBazaar] = useState(false);

    const fetchStats = async () => {
        try {
            const { data } = await axios.get('/api/admin/featherzerotrust/hashes/stats');
            if (data.success && data.data) {
                setStats(data.data);
            }
        } catch (error: unknown) {
            console.error('Failed to fetch hash statistics', error);
        }
    };

    const fetchHashes = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/featherzerotrust/hashes', {
                params: {
                    confirmed_only: confirmedOnly ? 'true' : 'false',
                },
            });
            if (data.success && data.data) {
                setHashes(data.data || []);
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.hashes.messages.fetchFailed'));
        } finally {
            setLoading(false);
        }
    }, [confirmedOnly, t]);

    useEffect(() => {
        fetchStats();
        void fetchHashes();
    }, [fetchHashes]);

    const filteredHashes = useMemo(() => {
        if (!searchQuery) return hashes;
        const q = searchQuery.toLowerCase();
        return hashes.filter(
            (h) =>
                h.hash.toLowerCase().includes(q) ||
                h.file_name.toLowerCase().includes(q) ||
                h.detection_type.toLowerCase().includes(q) ||
                h.server_name?.toLowerCase().includes(q),
        );
    }, [hashes, searchQuery]);

    const handleAddHash = async () => {
        if (!newHash.hash.trim() || !newHash.file_name.trim()) {
            toast.error(t('admin.featherzerotrust.hashes.messages.hashRequired'));
            return;
        }

        if (!/^[a-f0-9]{64}$/i.test(newHash.hash.trim())) {
            toast.error(t('admin.featherzerotrust.hashes.messages.invalidHash'));
            return;
        }

        setAddingHash(true);
        try {
            const { data } = await axios.post('/api/admin/featherzerotrust/hashes', {
                ...newHash,
                hash: newHash.hash.trim(),
                file_name: newHash.file_name.trim(),
                file_size: newHash.file_size ? parseInt(newHash.file_size) : null,
            });

            if (data.success) {
                toast.success(t('admin.featherzerotrust.hashes.messages.hashAdded'));
                setAddHashDialogOpen(false);
                setNewHash({
                    hash: '',
                    file_name: '',
                    detection_type: 'suspicious',
                    confirmed_malicious: false,
                    server_uuid: '',
                    file_path: '',
                    file_size: '',
                });
                fetchHashes();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.hashes.messages.addFailed'));
        } finally {
            setAddingHash(false);
        }
    };

    const handleCheckHashes = async () => {
        if (!hashCheckInput.trim()) {
            toast.error(t('admin.featherzerotrust.hashes.messages.enterHashes'));
            return;
        }

        setCheckingHashes(true);
        setHashCheckResults([]);

        try {
            const hashLines = hashCheckInput
                .split('\n')
                .map((h) => h.trim())
                .filter(Boolean);
            if (hashLines.length > 1000) {
                toast.error(t('admin.featherzerotrust.hashes.messages.maxHashes'));
                setCheckingHashes(false);
                return;
            }

            const { data } = await axios.post('/api/admin/featherzerotrust/hashes/check', {
                hashes: hashLines,
                confirmed_only: confirmedOnly,
            });

            if (data.success && data.data) {
                const foundHashes = new Set(data.data.matches.map((m: HashRecord) => m.hash));
                setHashCheckResults(
                    hashLines.map((hash) => ({
                        hash,
                        found: foundHashes.has(hash),
                        details: data.data.matches.find((m: HashRecord) => m.hash === hash),
                    })),
                );
                toast.success(
                    t('admin.featherzerotrust.hashes.messages.checked', {
                        total: String(hashLines.length),
                        matches: String(data.data.matchesFound),
                    }),
                );
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.hashes.messages.checkFailed'));
        } finally {
            setCheckingHashes(false);
        }
    };

    const handleConfirmHash = async (hash: string) => {
        try {
            const { data } = await axios.put(`/api/admin/featherzerotrust/hashes/${hash}/confirm`);
            if (data.success) {
                toast.success(t('admin.featherzerotrust.hashes.messages.confirmed'));
                fetchHashes();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.hashes.messages.confirmFailed'));
        }
    };

    const handleDeleteHash = async (hash: string) => {
        if (!confirm(t('admin.featherzerotrust.hashes.messages.confirmDeleteSingle'))) return;
        try {
            const { data } = await axios.delete(`/api/admin/featherzerotrust/hashes/${hash}`);
            if (data.success) {
                toast.success(t('admin.featherzerotrust.hashes.messages.deleted'));
                fetchHashes();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.hashes.messages.deleteFailed'));
        }
    };

    const handleBulkConfirm = async () => {
        if (selectedHashes.size === 0) return;
        if (
            !confirm(
                t('admin.featherzerotrust.hashes.messages.confirmBulkConfirm', { count: String(selectedHashes.size) }),
            )
        )
            return;

        setBulkConfirming(true);
        try {
            const { data } = await axios.post('/api/admin/featherzerotrust/hashes/bulk/confirm', {
                hashes: Array.from(selectedHashes),
            });
            if (data.success) {
                toast.success(
                    t('admin.featherzerotrust.hashes.messages.bulkConfirmed', { count: data.data.confirmed }),
                );
                setSelectedHashes(new Set());
                fetchHashes();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.hashes.messages.bulkConfirmFailed'));
        } finally {
            setBulkConfirming(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedHashes.size === 0) return;
        if (
            !confirm(
                t('admin.featherzerotrust.hashes.messages.confirmBulkDelete', { count: String(selectedHashes.size) }),
            )
        )
            return;

        setBulkDeleting(true);
        try {
            const { data } = await axios.post('/api/admin/featherzerotrust/hashes/bulk/delete', {
                hashes: Array.from(selectedHashes),
            });
            if (data.success) {
                toast.success(t('admin.featherzerotrust.hashes.messages.bulkDeleted', { count: data.data.deleted }));
                setSelectedHashes(new Set());
                fetchHashes();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.hashes.messages.bulkDeleteFailed'));
        } finally {
            setBulkDeleting(false);
        }
    };

    const toggleSelection = (hash: string) => {
        const next = new Set(selectedHashes);
        if (next.has(hash)) next.delete(hash);
        else next.add(hash);
        setSelectedHashes(next);
    };

    const handleImportMalwareBazaar = async () => {
        if (!confirm(t('admin.featherzerotrust.hashes.messages.importConfirm'))) return;

        setImportingMalwareBazaar(true);
        try {
            const { data } = await axios.post('/api/admin/featherzerotrust/hashes/import/malwarebazaar');
            if (data.success) {
                const imported = data.data?.imported ?? 0;
                const failed = data.data?.failed ?? 0;
                const skipped = data.data?.skipped ?? 0;
                toast.success(
                    t('admin.featherzerotrust.hashes.messages.importCompleted', {
                        imported,
                        skipped,
                        failed,
                    }),
                );
                fetchHashes();
                fetchStats();
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || t('admin.featherzerotrust.hashes.messages.importFailed'));
        } finally {
            setImportingMalwareBazaar(false);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='bg-card/50 border-border/50 flex flex-col items-center justify-between gap-4 rounded-2xl border p-4 shadow-lg backdrop-blur-md sm:flex-row'>
                <div className='flex items-center gap-3'>
                    <Button onClick={() => setAddHashDialogOpen(true)}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.featherzerotrust.hashes.addHash')}
                    </Button>
                    <Button variant='outline' onClick={handleImportMalwareBazaar} disabled={importingMalwareBazaar}>
                        {importingMalwareBazaar ? (
                            <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <Download className='mr-2 h-4 w-4' />
                        )}
                        {t('admin.featherzerotrust.hashes.importMalwareBazaar')}
                    </Button>
                    <Button variant='outline' onClick={() => setCheckHashesDialogOpen(true)}>
                        <Search className='mr-2 h-4 w-4' />
                        {t('admin.featherzerotrust.hashes.checkHashes')}
                    </Button>
                </div>

                <div className='flex items-center gap-4'>
                    <div className='bg-muted/30 border-border/30 flex items-center gap-2 rounded-lg border px-3 py-1.5'>
                        <Switch checked={confirmedOnly} onCheckedChange={setConfirmedOnly} />
                        <Label className='text-xs font-medium'>
                            {t('admin.featherzerotrust.hashes.confirmedOnly')}
                        </Label>
                    </div>
                    <Button variant='ghost' size='sm' onClick={fetchHashes}>
                        <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                        {t('admin.featherzerotrust.hashes.refresh')}
                    </Button>
                </div>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                {[
                    {
                        label: t('admin.featherzerotrust.hashes.stats.total'),
                        value: stats.totalHashes,
                        icon: Database,
                        color: 'blue',
                        desc: t('admin.featherzerotrust.hashes.stats.totalDesc'),
                    },
                    {
                        label: t('admin.featherzerotrust.hashes.stats.confirmed'),
                        value: stats.confirmedHashes,
                        icon: ShieldCheck,
                        color: 'green',
                        desc: t('admin.featherzerotrust.hashes.stats.confirmedDesc'),
                    },
                    {
                        label: t('admin.featherzerotrust.hashes.stats.pending'),
                        value: stats.unconfirmedHashes,
                        icon: AlertTriangle,
                        color: 'orange',
                        desc: t('admin.featherzerotrust.hashes.stats.pendingDesc'),
                    },
                    {
                        label: t('admin.featherzerotrust.hashes.stats.recent'),
                        value: stats.recentDetections,
                        icon: TrendingUp,
                        color: 'red',
                        desc: t('admin.featherzerotrust.hashes.stats.recentDesc'),
                    },
                ].map((stat, i) => (
                    <Card
                        key={i}
                        className='group border-border/50 relative overflow-hidden transition-all duration-300 hover:scale-[1.02]'
                    >
                        <div className={cn('absolute inset-x-0 top-0 h-1', `bg-${stat.color}-500/50`)} />
                        <CardHeader className='pb-2'>
                            <div className='text-muted-foreground flex items-center justify-between'>
                                <span className='text-xs font-medium tracking-wider uppercase'>{stat.label}</span>
                                <stat.icon className={cn('h-4 w-4', `text-${stat.color}-500/60`)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className='text-2xl font-bold'>{stat.value.toLocaleString()}</div>
                            <p className='text-muted-foreground mt-1 text-[10px]'>{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className='flex flex-col items-center gap-4 sm:flex-row'>
                <div className='group relative flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.featherzerotrust.hashes.searchPlaceholder')}
                        className='pl-10'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {selectedHashes.size > 0 && (
                    <div className='bg-primary/10 border-primary/20 animate-in zoom-in flex items-center gap-2 rounded-xl border p-1.5 duration-300'>
                        <Button variant='outline' size='sm' onClick={handleBulkConfirm} disabled={bulkConfirming}>
                            {bulkConfirming ? (
                                <RefreshCw className='h-4 w-4 animate-spin' />
                            ) : (
                                <CheckSquare className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.featherzerotrust.hashes.bulkConfirm')} ({selectedHashes.size})
                        </Button>
                        <Button variant='destructive' size='sm' onClick={handleBulkDelete} disabled={bulkDeleting}>
                            {bulkDeleting ? (
                                <RefreshCw className='h-4 w-4 animate-spin' />
                            ) : (
                                <Trash2 className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.featherzerotrust.hashes.bulkDelete')}
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => setSelectedHashes(new Set())}>
                            <X className='h-4 w-4' />
                            {t('admin.featherzerotrust.hashes.clearSelection')}
                        </Button>
                    </div>
                )}
            </div>

            {loading ? (
                <TableSkeleton count={5} />
            ) : filteredHashes.length === 0 ? (
                <EmptyState
                    title={t('admin.featherzerotrust.hashes.noHashesFound')}
                    description={
                        searchQuery
                            ? t('admin.featherzerotrust.hashes.noResultsFor', { query: searchQuery })
                            : t('admin.featherzerotrust.hashes.emptyDatabase')
                    }
                    icon={Database}
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {filteredHashes.map((h) => (
                        <ResourceCard
                            key={h.hash}
                            icon={Database}
                            title={h.file_name}
                            subtitle={<span className='font-mono text-[10px] sm:text-xs'>{h.hash}</span>}
                            badges={[
                                {
                                    label: h.detection_type.toUpperCase(),
                                    className: cn(
                                        'bg-muted/50 text-muted-foreground border-border/50',
                                        h.detection_type === 'virus' && 'bg-red-500/10 text-red-500 border-red-500/20',
                                        h.detection_type === 'trojan' &&
                                            'bg-orange-500/10 text-orange-500 border-orange-500/20',
                                    ),
                                },
                                {
                                    label:
                                        h.confirmed_malicious === 'true'
                                            ? t('admin.featherzerotrust.hashes.confirmed')
                                            : t('admin.featherzerotrust.hashes.pending'),
                                    className:
                                        h.confirmed_malicious === 'true'
                                            ? 'bg-red-500/20 text-red-600 border-red-500/30'
                                            : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
                                },
                            ]}
                            description={
                                <div className='mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4'>
                                    <div className='flex flex-col'>
                                        <span className='text-muted-foreground text-[10px] tracking-tight uppercase'>
                                            {t('admin.featherzerotrust.hashes.detections')}
                                        </span>
                                        <span className='text-xs font-semibold'>{h.times_detected}</span>
                                    </div>
                                    <div className='flex flex-col'>
                                        <span className='text-muted-foreground text-[10px] tracking-tight uppercase'>
                                            {t('admin.featherzerotrust.hashes.lastServer')}
                                        </span>
                                        <span className='text-xs'>
                                            {h.server_name || t('admin.featherzerotrust.hashes.systemBulk')}
                                        </span>
                                    </div>
                                    <div className='flex flex-col'>
                                        <span className='text-muted-foreground text-[10px] tracking-tight uppercase'>
                                            {t('admin.featherzerotrust.hashes.firstSeen')}
                                        </span>
                                        <span className='text-[10px] opacity-80'>
                                            {new Date(h.first_seen).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className='flex flex-col'>
                                        <span className='text-muted-foreground text-[10px] tracking-tight uppercase'>
                                            {t('admin.featherzerotrust.hashes.lastSeen')}
                                        </span>
                                        <span className='text-[10px] opacity-80'>
                                            {new Date(h.last_seen).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    {h.confirmed_malicious === 'false' && (
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleConfirmHash(h.hash);
                                            }}
                                            title={t('admin.featherzerotrust.hashes.confirmMalicious')}
                                        >
                                            <ShieldCheck className='h-4 w-4' />
                                        </Button>
                                    )}
                                    <Button
                                        variant='destructive'
                                        size='sm'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteHash(h.hash);
                                        }}
                                        title={t('admin.featherzerotrust.hashes.deleteFromDb')}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedHashes.has(h.hash)}
                                            onCheckedChange={() => toggleSelection(h.hash)}
                                            className='ml-2 h-5 w-5'
                                        />
                                    </div>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            <Dialog open={addHashDialogOpen} onOpenChange={setAddHashDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.featherzerotrust.hashes.addHashTitle')}</DialogTitle>
                        <DialogDescription>{t('admin.featherzerotrust.hashes.noHashesDesc')}</DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.featherzerotrust.hashes.hashValue')}</Label>
                            <Input
                                value={newHash.hash}
                                onChange={(e) => setNewHash({ ...newHash, hash: e.target.value })}
                                placeholder='64 character hex string'
                                className='font-mono text-xs'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.featherzerotrust.hashes.fileName')}</Label>
                            <Input
                                value={newHash.file_name}
                                onChange={(e) => setNewHash({ ...newHash, file_name: e.target.value })}
                                placeholder='malicious.exe'
                            />
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.hashes.detectionType')}</Label>
                                <select
                                    className='border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm'
                                    value={newHash.detection_type}
                                    onChange={(e) => setNewHash({ ...newHash, detection_type: e.target.value })}
                                >
                                    <option value='suspicious'>
                                        {t('admin.featherzerotrust.hashes.types.suspicious')}
                                    </option>
                                    <option value='virus'>{t('admin.featherzerotrust.hashes.types.virus')}</option>
                                    <option value='trojan'>{t('admin.featherzerotrust.hashes.types.trojan')}</option>
                                    <option value='malware'>{t('admin.featherzerotrust.hashes.types.malware')}</option>
                                    <option value='miner'>{t('admin.featherzerotrust.hashes.types.miner')}</option>
                                    <option value='backdoor'>
                                        {t('admin.featherzerotrust.hashes.types.backdoor')}
                                    </option>
                                </select>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.hashes.fileSize')}</Label>
                                <Input
                                    type='number'
                                    value={newHash.file_size}
                                    onChange={(e) => setNewHash({ ...newHash, file_size: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className='bg-muted/30 border-border/50 flex translate-y-2 items-center gap-2 rounded-lg border p-4'>
                            <Switch
                                checked={newHash.confirmed_malicious}
                                onCheckedChange={(v) => setNewHash({ ...newHash, confirmed_malicious: v })}
                            />
                            <Label className='cursor-pointer text-sm'>
                                {t('admin.featherzerotrust.hashes.markConfirmed')}
                            </Label>
                        </div>
                        <div className='flex gap-3 pt-6'>
                            <Button variant='outline' className='flex-1' onClick={() => setAddHashDialogOpen(false)}>
                                {t('admin.featherzerotrust.hashes.cancel')}
                            </Button>
                            <Button className='flex-1' onClick={handleAddHash} disabled={addingHash}>
                                {addingHash ? (
                                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <Plus className='mr-2 h-4 w-4' />
                                )}
                                {t('admin.featherzerotrust.hashes.addHashButton')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={checkHashesDialogOpen} onOpenChange={setCheckHashesDialogOpen}>
                <DialogContent className='sm:max-w-xl'>
                    <DialogHeader>
                        <DialogTitle>{t('admin.featherzerotrust.hashes.checkHashesTitle')}</DialogTitle>
                        <DialogDescription>{t('admin.featherzerotrust.hashes.checkHashesDesc')}</DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.featherzerotrust.hashes.hashList')}</Label>
                            <textarea
                                value={hashCheckInput}
                                onChange={(e) => setHashCheckInput(e.target.value)}
                                className='border-border bg-background focus:ring-primary min-h-[150px] w-full rounded-lg border p-3 font-mono text-xs transition-all outline-none focus:ring-2'
                                placeholder='...'
                            />
                        </div>
                        <Button className='w-full' onClick={handleCheckHashes} disabled={checkingHashes}>
                            {checkingHashes ? (
                                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Search className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.featherzerotrust.hashes.checkButton')}
                        </Button>

                        {hashCheckResults.length > 0 && (
                            <div className='custom-scrollbar mt-4 max-h-[250px] space-y-2 overflow-y-auto pr-2'>
                                {hashCheckResults.map((r, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            'flex items-center justify-between rounded-lg border p-3 text-xs',
                                            r.found ? 'border-red-500/50 bg-red-500/5' : 'border-border/50 bg-muted/30',
                                        )}
                                    >
                                        <code className='max-w-[70%] truncate'>{r.hash}</code>
                                        <Badge variant={r.found ? 'destructive' : 'secondary'}>
                                            {r.found
                                                ? t('admin.featherzerotrust.hashes.checkResults.threatFound')
                                                : t('admin.featherzerotrust.hashes.checkResults.clear')}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HashesTab;
