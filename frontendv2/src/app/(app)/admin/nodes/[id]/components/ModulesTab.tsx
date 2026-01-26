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

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/featherui/Button';
import { PageCard } from '@/components/featherui/PageCard';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LayoutGrid, AlertTriangle, Loader2, RotateCw, CheckCircle2, XCircle, Settings } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitleComponent, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { NodeData, Module } from '../types';
import axios from 'axios';
import { toast } from 'sonner';

interface ModulesTabProps {
    node: NodeData;
}

export function ModulesTab({ node }: ModulesTabProps) {
    const { t } = useTranslation();
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);

    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [configData, setConfigData] = useState<string>('');
    const [fetchingConfig, setFetchingConfig] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);

    const fetchModules = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/wings/admin/node/${node.id}/modules`);
            if (data.success) {
                setModules(data.data?.data || data.data || []);
            } else {
                console.error(data.message || 'Failed to fetch modules');
            }
        } catch (err: unknown) {
            console.error('Failed to fetch modules', err);
        } finally {
            setLoading(false);
        }
    }, [node.id]);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    const handleToggle = async (module: Module) => {
        const action = module.enabled ? 'disable' : 'enable';
        setToggling(module.name);
        try {
            const { data } = await axios.post(`/api/wings/admin/node/${node.id}/modules/${module.name}/${action}`);
            if (data.success) {
                toast.success(t(`admin.node.view.modules.${action}_success`, { name: module.name }));
                await fetchModules();
            } else {
                toast.error(data.message || t(`admin.node.view.modules.${action}_failed`, { name: module.name }));
            }
        } catch (err: unknown) {
            let msg = t(`admin.node.view.modules.${action}_failed`, { name: module.name });
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.message;
            }
            toast.error(msg);
        } finally {
            setToggling(null);
        }
    };

    const handleConfigure = async (module: Module) => {
        if (module.enabled) {
            toast.error(t('admin.node.view.modules.configure_disabled_notice'));
            return;
        }
        setSelectedModule(module);
        setFetchingConfig(true);
        setConfigModalOpen(true);
        try {
            const { data } = await axios.get(`/api/wings/admin/node/${node.id}/modules/${module.name}/config`);
            if (data.success) {
                setConfigData(JSON.stringify(data.data.config || {}, null, 4));
            } else {
                toast.error(data.message || 'Failed to fetch module configuration');
                setConfigModalOpen(false);
            }
        } catch (err: unknown) {
            let msg = 'Failed to fetch module configuration';
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.message;
            }
            toast.error(msg);
            setConfigModalOpen(false);
        } finally {
            setFetchingConfig(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!selectedModule) return;
        setSavingConfig(true);
        try {
            let parsedConfig;
            try {
                parsedConfig = JSON.parse(configData);
            } catch {
                toast.error('Invalid JSON configuration');
                setSavingConfig(false);
                return;
            }

            const { data } = await axios.put(`/api/wings/admin/node/${node.id}/modules/${selectedModule.name}/config`, {
                config: parsedConfig,
            });

            if (data.success) {
                toast.success(t('admin.node.view.modules.config_save_success', { name: selectedModule.name }));
                setConfigModalOpen(false);
                await fetchModules();
            } else {
                toast.error(
                    data.message || t('admin.node.view.modules.config_save_failed', { name: selectedModule.name }),
                );
            }
        } catch (err: unknown) {
            let msg = t('admin.node.view.modules.config_save_failed', { name: selectedModule.name });
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.message;
            }
            toast.error(msg);
        } finally {
            setSavingConfig(false);
        }
    };

    return (
        <>
            <PageCard
                title={t('admin.node.view.modules.title')}
                description={t('admin.node.view.modules.description')}
                icon={LayoutGrid}
            >
                <div className='space-y-6'>
                    <div className='flex justify-end'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={fetchModules}
                            loading={loading}
                            className='rounded-xl'
                        >
                            <RotateCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('common.reload')}
                        </Button>
                    </div>

                    <div className='relative min-h-[400px]'>
                        {loading && !modules.length ? (
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className='h-48 rounded-2xl bg-muted/20 border border-border/50 animate-pulse'
                                    />
                                ))}
                            </div>
                        ) : !modules.length ? (
                            <div className='flex flex-col items-center justify-center h-[400px] text-center space-y-4'>
                                <div className='p-6 rounded-full bg-muted/30'>
                                    <LayoutGrid className='h-12 w-12 text-muted-foreground/30' />
                                </div>
                                <div className='max-w-xs'>
                                    <h3 className='text-lg font-bold'>{t('admin.node.view.modules.no_modules')}</h3>
                                    <p className='text-sm text-muted-foreground'>
                                        {t('admin.node.view.modules.no_modules_description')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                {modules.map((module) => (
                                    <Card
                                        key={module.name}
                                        className={`group relative overflow-hidden transition-all duration-300 border-border/50 bg-muted/10 hover:bg-muted/20 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 rounded-2xl`}
                                    >
                                        <CardHeader className='pb-4'>
                                            <div className='flex items-start justify-between'>
                                                <div className='flex items-center gap-4'>
                                                    <div className='p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300'>
                                                        <LayoutGrid className='h-5 w-5' />
                                                    </div>
                                                    <div className='space-y-1'>
                                                        <div className='flex items-center gap-2'>
                                                            <CardTitle className='text-base font-bold'>
                                                                {module.name}
                                                            </CardTitle>
                                                            <span className='text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded'>
                                                                v{module.version}
                                                            </span>
                                                        </div>
                                                        <Badge
                                                            variant={module.enabled ? 'default' : 'outline'}
                                                            className={`text-[10px] uppercase tracking-wider font-bold h-5 ${
                                                                module.enabled
                                                                    ? 'bg-primary/20 text-primary border-primary/20'
                                                                    : 'text-muted-foreground'
                                                            }`}
                                                        >
                                                            {module.enabled ? (
                                                                <>
                                                                    <CheckCircle2 className='h-3 w-3 mr-1' />
                                                                    {t('admin.node.view.modules.enabled_badge')}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle className='h-3 w-3 mr-1' />
                                                                    {t('admin.node.view.modules.disabled_badge')}
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Switch
                                                    checked={module.enabled}
                                                    onCheckedChange={() => handleToggle(module)}
                                                    disabled={toggling === module.name}
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className='space-y-4'>
                                            <CardDescription className='text-xs line-clamp-2 min-h-[32px]'>
                                                {module.description}
                                            </CardDescription>

                                            <div className='pt-2 border-t border-border/50'>
                                                <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    className='h-8'
                                                    onClick={() => handleConfigure(module)}
                                                    loading={fetchingConfig && selectedModule?.name === module.name}
                                                    disabled={module.enabled}
                                                >
                                                    <Settings className='h-3 w-3 mr-2' />
                                                    {t('admin.node.view.modules.configure')}
                                                </Button>
                                            </div>
                                        </CardContent>
                                        {toggling === module.name && (
                                            <div className='absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10'>
                                                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PageCard>

            <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
                <DialogHeader>
                    <DialogTitleComponent>
                        {t('admin.node.view.modules.configure_title', { name: selectedModule?.name || '' })}
                    </DialogTitleComponent>
                    <DialogDescription>{t('admin.node.view.modules.configure_description')}</DialogDescription>
                </DialogHeader>

                <div className='py-4 space-y-4'>
                    {selectedModule?.enabled && (
                        <div className='p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs flex items-center gap-3'>
                            <AlertTriangle className='h-4 w-4 shrink-0' />
                            {t('admin.node.view.modules.configure_disabled_notice')}
                        </div>
                    )}
                    <textarea
                        className='w-full h-80 p-4 rounded-xl bg-muted/50 border border-border font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none'
                        value={configData}
                        onChange={(e) => setConfigData(e.target.value)}
                        placeholder='{ ... }'
                        disabled={fetchingConfig || savingConfig || selectedModule?.enabled}
                    />
                </div>

                <DialogFooter>
                    <Button variant='outline' onClick={() => setConfigModalOpen(false)} disabled={savingConfig}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleSaveConfig}
                        loading={savingConfig}
                        disabled={fetchingConfig || selectedModule?.enabled}
                    >
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
