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
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Database, Search, Trash2, CheckSquare, Plus, RefreshCw, X, Download } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { ResourceCard, ResourceTable } from '@/components/featherui/ResourceCard';
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

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/featherzerotrust/hashes/stats');
            if (data.success && data.data) {
                setStats(data.data);
            }
        } catch (error: unknown) {
            console.error('Failed to fetch hash statistics', error);
            toast.error(getApiErrorMessage(error, t, 'common.error'));
        }
    }, [t]);

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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.hashes.messages.fetchFailed'));
        } finally {
            setLoading(false);
        }
    }, [confirmedOnly, t]);

    useEffect(() => {
        fetchStats();
        void fetchHashes();
    }, [fetchHashes, fetchStats]);

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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.hashes.messages.addFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.hashes.messages.checkFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.hashes.messages.confirmFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.hashes.messages.deleteFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.hashes.messages.bulkConfirmFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.hashes.messages.bulkDeleteFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.featherzerotrust.hashes.messages.importFailed'));
        } finally {
            setImportingMalwareBazaar(false);
        }
    };

    const statItems = [
        { label: t('admin.featherzerotrust.hashes.stats.total'), value: stats.totalHashes },
        { label: t('admin.featherzerotrust.hashes.stats.confirmed'), value: stats.confirmedHashes },
        { label: t('admin.featherzerotrust.hashes.stats.pending'), value: stats.unconfirmedHashes },
        { label: t('admin.featherzerotrust.hashes.stats.recent'), value: stats.recentDetections },
    ];

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between'>
                <div className='flex flex-wrap gap-2'>
                    <Button size='sm' className='h-11' onClick={() => setAddHashDialogOpen(true)}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.featherzerotrust.hashes.addHash')}
                    </Button>
                    <Button
                        size='sm'
                        variant='outline'
                        className='h-11'
                        onClick={handleImportMalwareBazaar}
                        disabled={importingMalwareBazaar}
                    >
                        {importingMalwareBazaar ? (
                            <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <Download className='mr-2 h-4 w-4' />
                        )}
                        {t('admin.featherzerotrust.hashes.importMalwareBazaar')}
                    </Button>
                    <Button size='sm' variant='outline' className='h-11' onClick={() => setCheckHashesDialogOpen(true)}>
                        <Search className='mr-2 h-4 w-4' />
                        {t('admin.featherzerotrust.hashes.checkHashes')}
                    </Button>
                </div>
                <div className='flex flex-wrap items-center gap-3'>
                    <label className='fp-surface-solid flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-3'>
                        <Switch checked={confirmedOnly} onCheckedChange={setConfirmedOnly} />
                        <span className='text-sm font-medium'>{t('admin.featherzerotrust.hashes.confirmedOnly')}</span>
                    </label>
                    <Button
                        size='sm'
                        variant='outline'
                        className='h-11'
                        onClick={() => void fetchHashes()}
                        disabled={loading}
                    >
                        <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                        {t('admin.featherzerotrust.hashes.refresh')}
                    </Button>
                </div>
            </div>

            <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
                {statItems.map((stat) => (
                    <div key={stat.label} className='fp-surface-solid rounded-xl border px-4 py-3'>
                        <p className='text-muted-foreground text-xs'>{stat.label}</p>
                        <p className='mt-1 text-sm font-medium'>{stat.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                <div className='relative min-w-0 flex-1'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        placeholder={t('admin.featherzerotrust.hashes.searchPlaceholder')}
                        variant='surface'
                        className='h-11 pl-10'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {selectedHashes.size > 0 && (
                    <div className='fp-surface-solid flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2'>
                        <Button
                            size='sm'
                            variant='outline'
                            className='h-9'
                            onClick={handleBulkConfirm}
                            disabled={bulkConfirming}
                        >
                            {bulkConfirming ? (
                                <RefreshCw className='h-4 w-4 animate-spin' />
                            ) : (
                                <CheckSquare className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.featherzerotrust.hashes.bulkConfirm')} ({selectedHashes.size})
                        </Button>
                        <Button
                            size='sm'
                            variant='destructive'
                            className='h-9'
                            onClick={handleBulkDelete}
                            disabled={bulkDeleting}
                        >
                            {bulkDeleting ? (
                                <RefreshCw className='h-4 w-4 animate-spin' />
                            ) : (
                                <Trash2 className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.featherzerotrust.hashes.bulkDelete')} ({selectedHashes.size})
                        </Button>
                        <Button size='sm' variant='ghost' className='h-9' onClick={() => setSelectedHashes(new Set())}>
                            <X className='mr-2 h-4 w-4' />
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
                <ResourceTable>
                    {filteredHashes.map((h) => (
                        <ResourceCard
                            key={h.hash}
                            icon={Database}
                            title={h.file_name}
                            subtitle={<span className='font-mono text-[10px] sm:text-xs'>{h.hash}</span>}
                            badges={[
                                {
                                    label: h.detection_type.toUpperCase(),
                                    className: 'bg-secondary text-secondary-foreground border-transparent',
                                },
                                {
                                    label:
                                        h.confirmed_malicious === 'true'
                                            ? t('admin.featherzerotrust.hashes.confirmed')
                                            : t('admin.featherzerotrust.hashes.pending'),
                                    className:
                                        h.confirmed_malicious === 'true'
                                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                                            : 'bg-muted text-muted-foreground border-transparent',
                                },
                            ]}
                            description={
                                <div className='grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4'>
                                    <div className='flex flex-col'>
                                        <span className='text-muted-foreground text-[10px] tracking-tight uppercase'>
                                            {t('admin.featherzerotrust.hashes.detections')}
                                        </span>
                                        <span className='text-xs font-medium'>{h.times_detected}</span>
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
                                        <span className='text-muted-foreground text-xs'>
                                            {new Date(h.first_seen).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className='flex flex-col'>
                                        <span className='text-muted-foreground text-[10px] tracking-tight uppercase'>
                                            {t('admin.featherzerotrust.hashes.lastSeen')}
                                        </span>
                                        <span className='text-muted-foreground text-xs'>
                                            {new Date(h.last_seen).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedHashes.has(h.hash)}
                                            onCheckedChange={() => toggleSelection(h.hash)}
                                            aria-label={h.file_name}
                                        />
                                    </div>
                                    {h.confirmed_malicious === 'false' && (
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleConfirmHash(h.hash);
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
                                            void handleDeleteHash(h.hash);
                                        }}
                                        title={t('admin.featherzerotrust.hashes.deleteFromDb')}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        />
                    ))}
                </ResourceTable>
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
                                variant='surface'
                                className='h-11 font-mono text-xs'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.featherzerotrust.hashes.fileName')}</Label>
                            <Input
                                value={newHash.file_name}
                                onChange={(e) => setNewHash({ ...newHash, file_name: e.target.value })}
                                placeholder='malicious.exe'
                                variant='surface'
                                className='h-11'
                            />
                        </div>
                        <div className='grid grid-cols-2 gap-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.featherzerotrust.hashes.detectionType')}</Label>
                                <select
                                    className='border-border bg-background flex h-11 w-full rounded-xl border px-3 text-sm'
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
                                    variant='surface'
                                    className='h-11'
                                />
                            </div>
                        </div>
                        <label className='fp-surface-solid flex cursor-pointer items-center gap-3 rounded-xl border p-4'>
                            <Switch
                                checked={newHash.confirmed_malicious}
                                onCheckedChange={(v) => setNewHash({ ...newHash, confirmed_malicious: v })}
                            />
                            <span className='text-sm font-medium'>
                                {t('admin.featherzerotrust.hashes.markConfirmed')}
                            </span>
                        </label>
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
                                className='border-border focus:border-primary/60 focus:ring-primary/10 min-h-[150px] w-full rounded-xl border bg-[hsl(var(--fp-surface-tint)/0.92)] p-3 font-mono text-xs outline-none focus:ring-4'
                                placeholder='...'
                            />
                        </div>
                        <Button className='h-11 w-full' onClick={handleCheckHashes} disabled={checkingHashes}>
                            {checkingHashes ? (
                                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Search className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.featherzerotrust.hashes.checkButton')}
                        </Button>

                        {hashCheckResults.length > 0 && (
                            <div className='mt-4 max-h-[250px] space-y-2 overflow-y-auto pr-1'>
                                {hashCheckResults.map((r, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            'fp-surface-solid flex items-center justify-between rounded-xl border p-3 text-xs',
                                            r.found && 'border-destructive/30',
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
