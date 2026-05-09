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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
    RefreshCcw, 
    Download, 
    Server, 
    Package, 
    CheckCircle2, 
    AlertTriangle,
    ArrowUpCircle,
    Info,
    Loader2,
    ShieldCheck,
    Cpu,
    ExternalLink,
    Search,
    ChevronRight,
    Filter,
    Layers,
    CheckSquare,
    Square
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import axios from 'axios';
import { toast } from 'sonner';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/featherui/Input';

interface Node {
    id: number;
    name: string;
    fqdn: string;
}

interface NodeVersionInfo {
    current_version: string;
    latest_version: string;
    is_up_to_date: boolean;
    update_available: boolean;
    loading: boolean;
    error?: string;
}

interface Plugin {
    identifier: string;
    name: string;
    version: string;
    icon?: string;
}

interface PluginUpdateInfo {
    identifier: string;
    latest_version: string;
    update_available: boolean;
    loading: boolean;
}

export default function AdminUpdatesPage() {
    const { t } = useTranslation();
    const { data: dashboardData, loading: dashboardLoading, refresh: refreshDashboard } = useAdminDashboard();
    
    const [nodes, setNodes] = useState<Node[]>([]);
    const [nodesLoading, setNodesLoading] = useState(true);
    const [nodeVersions, setNodeVersions] = useState<Record<number, NodeVersionInfo>>({});
    
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [pluginsLoading, setPluginsLoading] = useState(true);
    const [pluginUpdates, setPluginUpdates] = useState<Record<string, PluginUpdateInfo>>({});
    
    const [isUpdatingPanel, setIsUpdatingPanel] = useState(false);
    const [isCheckingAll, setIsCheckingAll] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNodes, setSelectedNodes] = useState<Set<number>>(new Set());
    const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());
    
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const normalizeVersion = (v: string): string => v.replace(/^v/i, '');

    const compareVersions = (v1: string, v2: string): number => {
        const parts1 = normalizeVersion(v1).split('.').map(Number);
        const parts2 = normalizeVersion(v2).split('.').map(Number);
        const maxLength = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < maxLength; i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }
        return 0;
    };

    const fetchNodes = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/nodes?limit=100');
            setNodes(response.data.data.nodes || []);
        } catch (error) {
            console.error('Failed to fetch nodes', error);
            toast.error(t('admin_updates.wings.failed'));
        } finally {
            setNodesLoading(false);
        }
    }, [t]);

    const fetchPlugins = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pluginList = Object.values(response.data.data.plugins || {}).map((p: any) => ({
                identifier: p.plugin.identifier,
                name: p.plugin.name,
                version: p.plugin.version,
                icon: p.plugin.icon
            }));
            setPlugins(pluginList);
        } catch (error) {
            console.error('Failed to fetch plugins', error);
        } finally {
            setPluginsLoading(false);
        }
    }, []);

    const checkNodeVersion = async (id: number) => {
        setNodeVersions(prev => ({
            ...prev,
            [id]: { ...prev[id], loading: true }
        }));
        
        try {
            const response = await axios.get(`/api/admin/nodes/${id}/version-status`);
            const data = response.data.data;
            setNodeVersions(prev => ({
                ...prev,
                [id]: {
                    current_version: data.current_version,
                    latest_version: data.latest_version,
                    is_up_to_date: data.is_up_to_date,
                    update_available: data.update_available,
                    loading: false
                }
            }));
        } catch (error) {
            setNodeVersions(prev => ({
                ...prev,
                [id]: { ...prev[id], loading: false, error: 'Failed' }
            }));
        }
    };

    const checkPluginVersion = async (identifier: string, currentVersion: string) => {
        setPluginUpdates(prev => ({
            ...prev,
            [identifier]: { ...prev[identifier], loading: true, identifier }
        }));
        
        try {
            const response = await axios.get(`/api/admin/plugins/online/${encodeURIComponent(identifier)}`);
            const packageData = response.data.data?.package;
            const latest = packageData?.latest_version?.version;
            
            if (latest) {
                const updateAvailable = compareVersions(currentVersion, latest) < 0;
                setPluginUpdates(prev => ({
                    ...prev,
                    [identifier]: {
                        identifier,
                        latest_version: latest,
                        update_available: updateAvailable,
                        loading: false
                    }
                }));
            } else {
                setPluginUpdates(prev => ({
                    ...prev,
                    [identifier]: { ...prev[identifier], loading: false }
                }));
            }
        } catch (error) {
            setPluginUpdates(prev => ({
                ...prev,
                [identifier]: { ...prev[identifier], loading: false }
            }));
        }
    };

    const checkAllUpdates = async () => {
        setIsCheckingAll(true);
        const nodePromises = nodes.map(node => checkNodeVersion(node.id));
        const pluginPromises = plugins.map(plugin => checkPluginVersion(plugin.identifier, plugin.version));
        
        await Promise.all([...nodePromises, ...pluginPromises]);
        await refreshDashboard();
        setIsCheckingAll(false);
    };

    useEffect(() => {
        fetchNodes();
        fetchPlugins();
    }, [fetchNodes, fetchPlugins]);

    useEffect(() => {
        if (nodes.length > 0 || plugins.length > 0) {
            checkAllUpdates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes.length, plugins.length]);

    const handleUpdatePanel = async () => {
        if (isUpdatingPanel) return;
        setIsUpdatingPanel(true);
        try {
            const response = await adminSettingsApi.triggerDockerUpdate();
            if (response.success) {
                toast.success(response.message || t('admin_updates.messages.update_started'));
            } else {
                toast.error(response.message || t('admin_updates.messages.update_failed'));
            }
        } catch (error) {
            toast.error(t('admin_updates.messages.update_failed'));
        } finally {
            setIsUpdatingPanel(false);
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedNodes.size === 0 && selectedPlugins.size === 0) return;
        setIsBulkUpdating(true);
        const toastId = toast.loading('Starting bulk updates...');
        
        try {
            const nodeUpdates = Array.from(selectedNodes).map(id => 
                axios.post(`/api/admin/nodes/${id}/self-update`, { source: 'github' })
            );
            
            const pluginUpdatesReq = Array.from(selectedPlugins).map(identifier => 
                axios.post('/api/admin/cloud-plugins/install', { identifier })
            );
            
            await Promise.allSettled([...nodeUpdates, ...pluginUpdatesReq]);
            
            toast.success('Bulk update process initiated!', { id: toastId });
            setSelectedNodes(new Set());
            setSelectedPlugins(new Set());
            checkAllUpdates();
        } catch (error) {
            toast.error('Some updates failed to start.', { id: toastId });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const toggleNodeSelection = (id: number) => {
        const newSelection = new Set(selectedNodes);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedNodes(newSelection);
    };

    const togglePluginSelection = (id: string) => {
        const newSelection = new Set(selectedPlugins);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedPlugins(newSelection);
    };

    const filteredNodes = useMemo(() => {
        return nodes.filter(n => 
            n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            n.fqdn.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [nodes, searchQuery]);

    const filteredPlugins = useMemo(() => {
        return plugins.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.identifier.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [plugins, searchQuery]);

    const panelVersion = dashboardData?.version;
    const totalUpdatesAvailable = 
        (panelVersion?.update_available ? 1 : 0) + 
        Object.values(nodeVersions).filter(v => v.update_available).length +
        Object.values(pluginUpdates).filter(v => v.update_available).length;

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('admin_updates.title')}
                description={t('admin_updates.description')}
                icon={RefreshCcw}
            >
                <div className="flex items-center gap-2">
                    <div className="bg-card/30 border-border/50 hidden items-center gap-2 rounded-xl border px-3 py-1.5 md:flex">
                        <Search className="text-muted-foreground h-4 w-4" />
                        <input 
                            type="text" 
                            placeholder={t('common.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-sm outline-none w-40"
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={checkAllUpdates} 
                        disabled={isCheckingAll}
                        className="gap-2 rounded-xl"
                    >
                        {isCheckingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                        <span className="hidden sm:inline">{t('common.refresh')}</span>
                    </Button>
                </div>
            </PageHeader>

            {/* FLOATING ACTION BAR */}
            {(selectedNodes.size > 0 || selectedPlugins.size > 0) && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-primary border-primary/20 shadow-primary/20 flex items-center gap-6 rounded-2xl border px-6 py-4 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary-foreground/20 rounded-lg p-2">
                                <Layers className="text-primary-foreground h-5 w-5" />
                            </div>
                            <div className="text-primary-foreground">
                                <p className="text-sm font-black tracking-tight">{selectedNodes.size + selectedPlugins.size} items selected</p>
                                <p className="text-[10px] font-bold uppercase opacity-70">Bulk update ready</p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-primary-foreground/10" />
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => { setSelectedNodes(new Set()); setSelectedPlugins(new Set()); }}
                                className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 h-10 px-4 rounded-xl font-bold text-xs"
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button 
                                onClick={handleBulkUpdate} 
                                disabled={isBulkUpdating}
                                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-10 px-6 rounded-xl font-black text-xs uppercase tracking-widest"
                            >
                                {isBulkUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                                Update selected
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* PANEL COMPACT WIDGET */}
                <div className="lg:col-span-1">
                    <PageCard 
                        title="FeatherPanel" 
                        icon={ArrowUpCircle}
                        className="h-full border-primary/20 bg-primary/[0.02]"
                    >
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-muted-foreground text-[9px] font-black tracking-widest uppercase opacity-60">Version</p>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xl font-black">{panelVersion?.current?.version || '...'}</h4>
                                        <Badge variant="secondary" className="text-[9px] h-4 font-black uppercase tracking-tighter">
                                            {panelVersion?.current?.type || 'Stable'}
                                        </Badge>
                                    </div>
                                </div>
                                {panelVersion?.update_available && (
                                    <div className="text-right space-y-0.5">
                                        <p className="text-amber-500 text-[9px] font-black tracking-widest uppercase">Latest</p>
                                        <h4 className="text-xl font-black text-amber-500">{panelVersion?.latest?.version || '...'}</h4>
                                    </div>
                                )}
                            </div>

                            {panelVersion?.update_available ? (
                                <div className="bg-amber-500/10 border-amber-500/20 text-amber-500 rounded-2xl border p-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Download className="h-5 w-5 animate-bounce" />
                                        <p className="text-xs font-black uppercase tracking-tight">System Update Available</p>
                                    </div>
                                    <Button 
                                        onClick={handleUpdatePanel} 
                                        disabled={isUpdatingPanel}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-black uppercase text-[10px] tracking-widest rounded-xl h-11"
                                    >
                                        {isUpdatingPanel ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                                        Update panel now
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 rounded-2xl border p-4 flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Running Latest Build</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/30 border-border/50 rounded-2xl border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Cpu className="h-3 w-3 text-primary" />
                                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Runtime</span>
                                    </div>
                                    <p className="text-xs font-bold">PHP {panelVersion?.current?.php_version || 'N/A'}</p>
                                </div>
                                <div className="bg-muted/30 border-border/50 rounded-2xl border p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldCheck className="h-3 w-3 text-primary" />
                                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Integrity</span>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-500">Verified</p>
                                </div>
                            </div>
                        </div>
                    </PageCard>
                </div>

                {/* COMPACT PLUGINS LIST */}
                <div className="lg:col-span-2">
                    <PageCard 
                        title={t('admin_updates.plugins.title')} 
                        icon={Package}
                        className="h-full"
                    >
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {pluginsLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                </div>
                            ) : filteredPlugins.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-border/30 rounded-3xl border border-dashed">
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">{t('admin_updates.plugins.no_plugins')}</p>
                                </div>
                            ) : (
                                filteredPlugins.map(plugin => {
                                    const update = pluginUpdates[plugin.identifier];
                                    const isSelected = selectedPlugins.has(plugin.identifier);
                                    return (
                                        <div 
                                            key={plugin.identifier}
                                            onClick={() => update?.update_available && togglePluginSelection(plugin.identifier)}
                                            className={cn(
                                                "bg-muted/10 border-border/40 hover:bg-muted/20 transition-all rounded-2xl border p-3 flex items-center justify-between group cursor-pointer",
                                                isSelected && "border-primary bg-primary/5",
                                                !update?.update_available && "cursor-default opacity-60 grayscale-[0.5]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="shrink-0">
                                                    {update?.update_available ? (
                                                        isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground opacity-50" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500/40" />
                                                    )}
                                                </div>
                                                <div className="h-9 w-9 rounded-xl bg-background border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {plugin.icon ? (
                                                        <img src={plugin.icon} alt="" className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Package className="h-4 w-4 text-primary/40" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <h5 className="font-black truncate text-xs">{plugin.name || plugin.identifier}</h5>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">{plugin.version}</span>
                                                        {update?.update_available && (
                                                            <div className="flex items-center gap-1 text-amber-500 font-black text-[9px] uppercase">
                                                                <ChevronRight className="h-2 w-2" />
                                                                {update.latest_version}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {update?.loading && <Loader2 className="h-3 w-3 animate-spin opacity-20" />}
                                                {update?.update_available && !isSelected && (
                                                    <Badge variant="outline" className="text-[8px] border-amber-500/50 text-amber-500 font-black uppercase tracking-tighter px-1.5 h-5">
                                                        Update available
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </PageCard>
                </div>
            </div>

            {/* NODES WIDGET-LIKE LIST */}
            <PageCard 
                title={t('admin_updates.wings.title')} 
                description="Monitor and update Wings daemon across your infrastructure."
                icon={Server}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {nodesLoading ? (
                        [1,2,3].map(i => <div key={i} className="h-40 rounded-3xl bg-muted/20 animate-pulse border border-border/50" />)
                    ) : filteredNodes.length === 0 ? (
                        <div className="md:col-span-2 xl:col-span-3 py-12 flex flex-col items-center justify-center border-border/30 rounded-3xl border border-dashed text-muted-foreground">
                            <Server className="h-8 w-8 opacity-10 mb-2" />
                            <p className="text-xs font-bold uppercase tracking-widest opacity-40">No nodes matching your search</p>
                        </div>
                    ) : (
                        filteredNodes.map(node => {
                            const version = nodeVersions[node.id];
                            const isSelected = selectedNodes.has(node.id);
                            const hasUpdate = version?.update_available;

                            return (
                                <div 
                                    key={node.id}
                                    onClick={() => hasUpdate && toggleNodeSelection(node.id)}
                                    className={cn(
                                        "relative overflow-hidden transition-all rounded-3xl border p-4 group cursor-pointer",
                                        isSelected ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "bg-muted/10 border-border/40 hover:bg-muted/20",
                                        !hasUpdate && "cursor-default opacity-80"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {hasUpdate ? (
                                                isSelected ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground opacity-50" />
                                            ) : (
                                                <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h5 className="font-black text-sm tracking-tight truncate">{node.name}</h5>
                                                <p className="text-[9px] text-muted-foreground font-bold truncate opacity-60 uppercase tracking-tighter">{node.fqdn}</p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border",
                                            hasUpdate ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-secondary/50 border-border/50 text-primary"
                                        )}>
                                            <Server className="h-4 w-4" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between text-[8px] font-black uppercase text-muted-foreground tracking-widest opacity-50">
                                                <span>{t('admin_updates.wings.version')}</span>
                                                <span>{t('admin_updates.panel.latest')}</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-background/40 rounded-xl px-3 py-2 border border-border/50">
                                                <span className="text-[10px] font-bold">{version?.current_version || '...'}</span>
                                                <ChevronRight className="h-3 w-3 text-muted-foreground opacity-30" />
                                                <span className={cn("text-[10px] font-bold", hasUpdate ? "text-amber-500" : "text-emerald-500")}>
                                                    {version?.latest_version || '...'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {version?.loading && (
                                        <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px] flex items-center justify-center">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </PageCard>

            <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                    <h4 className="font-black text-lg uppercase tracking-tight">System Integrity & Infrastructure Health</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                        Regularly updating your infrastructure ensures security, performance, and stability. FeatherPanel automates version checking for all your Wings nodes and marketplace plugins.
                        <span className="block mt-1 font-bold italic text-primary/70">Updates are non-destructive and preserve all your configurations.</span>
                    </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                    <a 
                        href="https://docs.mythical.systems" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        View Documentation
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </div>
        </div>
    );
}

const Zap = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);
