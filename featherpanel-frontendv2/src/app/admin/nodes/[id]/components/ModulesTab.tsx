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

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/featherui/Button';
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
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Config modal state
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [configData, setConfigData] = useState<string>('');
    const [fetchingConfig, setFetchingConfig] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);

    const fetchModules = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`/api/wings/admin/node/${node.id}/modules`);
            if (data.success) {
                setModules(data.data?.data || data.data || []);
            } else {
                setError(data.message || 'Failed to fetch modules');
            }
        } catch (err: unknown) {
            let msg = 'Failed to fetch modules';
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [node.id]);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    const toggleModule = async (moduleName: string, currentlyEnabled: boolean) => {
        const action = currentlyEnabled ? 'disable' : 'enable';
        setActionLoading(`${action}-${moduleName}`);
        try {
            const { data } = await axios.post(`/api/wings/admin/node/${node.id}/modules/${moduleName}/${action}`);
            if (data.success) {
                toast.success(t(`admin.node.view.modules.${action}_success`, { name: moduleName }));
                await fetchModules();
            } else {
                toast.error(data.message || t(`admin.node.view.modules.${action}_failed`, { name: moduleName }));
            }
        } catch (err: unknown) {
            let msg = t(`admin.node.view.modules.${action}_failed`, { name: moduleName });
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.message;
            }
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    const handleConfigure = async (module: Module) => {
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
            <Card className='border-none shadow-none bg-transparent'>
                <CardHeader className='px-0 pt-0'>
                    <div className='flex items-center justify-between'>
                        <div className='space-y-1'>
                            <CardTitle className='text-lg flex items-center gap-2'>
                                <LayoutGrid className='h-5 w-5 text-primary' />
                                {t('admin.node.view.modules.title')}
                            </CardTitle>
                            <CardDescription>{t('admin.node.view.modules.description')}</CardDescription>
                        </div>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={fetchModules}
                            disabled={loading}
                            className='h-10 rounded-xl'
                        >
                            <RotateCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('common.reload')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className='px-0 space-y-6'>
                    {loading && !modules.length ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className='h-40 rounded-2xl bg-muted/30 animate-pulse border border-border/50'
                                />
                            ))}
                        </div>
                    ) : error ? (
                        <div className='rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center'>
                            <AlertTriangle className='h-10 w-10 text-destructive mx-auto mb-4' />
                            <h3 className='text-base font-bold text-destructive mb-2'>Failed to Load Modules</h3>
                            <p className='text-sm text-destructive/80 mb-6'>{error}</p>
                            <Button variant='outline' onClick={fetchModules} className='rounded-xl'>
                                Try Again
                            </Button>
                        </div>
                    ) : !modules.length ? (
                        <div className='rounded-2xl border border-border/50 bg-muted/10 p-12 text-center'>
                            <LayoutGrid className='h-12 w-12 text-muted-foreground/30 mx-auto mb-4' />
                            <h3 className='text-base font-bold text-muted-foreground mb-2'>
                                {t('admin.node.view.modules.no_modules')}
                            </h3>
                            <p className='text-sm text-muted-foreground/60'>
                                {t('admin.node.view.modules.no_modules_description')}
                            </p>
                        </div>
                    ) : (
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            {modules.map((module) => (
                                <div
                                    key={module.name}
                                    className='group relative rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5'
                                >
                                    <div className='p-6'>
                                        <div className='flex items-start justify-between mb-4'>
                                            <div className='flex items-center gap-3'>
                                                <div
                                                    className={`p-3 rounded-xl ${module.enabled ? 'bg-primary/10' : 'bg-muted'} group-hover:scale-110 transition-transform duration-300`}
                                                >
                                                    <LayoutGrid
                                                        className={`h-6 w-6 ${module.enabled ? 'text-primary' : 'text-muted-foreground'}`}
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className='font-bold text-foreground group-hover:text-primary transition-colors'>
                                                        {module.name}
                                                    </h3>
                                                    <div className='flex items-center gap-2 mt-1'>
                                                        <Badge
                                                            variant={module.enabled ? 'default' : 'secondary'}
                                                            className='text-[10px] uppercase font-bold tracking-wider rounded-md'
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
                                                        <span className='text-[10px] text-muted-foreground font-medium'>
                                                            v{module.version}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={module.enabled}
                                                onCheckedChange={() => toggleModule(module.name, module.enabled)}
                                                disabled={!!actionLoading}
                                                className='data-[state=checked]:bg-primary'
                                            />
                                        </div>
                                        <p className='text-sm text-muted-foreground line-clamp-2 leading-relaxed'>
                                            {module.description}
                                        </p>
                                    </div>
                                    <div className='px-6 py-4 bg-muted/30 border-t border-border/50 flex items-center justify-between'>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            disabled={!module.enabled || fetchingConfig}
                                            onClick={() => handleConfigure(module)}
                                            className='h-9 rounded-lg text-xs font-bold hover:bg-primary/10 hover:text-primary'
                                        >
                                            <Settings className='h-3.5 w-3.5 mr-2' />
                                            {t('admin.node.view.modules.configure')}
                                        </Button>
                                        {actionLoading === `enable-${module.name}` ||
                                        actionLoading === `disable-${module.name}` ? (
                                            <Loader2 className='h-4 w-4 text-primary animate-spin' />
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
                <DialogHeader>
                    <DialogTitleComponent>
                        {t('admin.node.view.modules.configure_title', { name: selectedModule?.name || '' })}
                    </DialogTitleComponent>
                    <DialogDescription>{t('admin.node.view.modules.configure_description')}</DialogDescription>
                </DialogHeader>

                <div className='py-4'>
                    <textarea
                        className='w-full h-80 p-4 rounded-xl bg-muted/50 border border-border font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none'
                        value={configData}
                        onChange={(e) => setConfigData(e.target.value)}
                        placeholder='{ ... }'
                        disabled={fetchingConfig || savingConfig}
                    />
                </div>

                <DialogFooter>
                    <Button variant='outline' onClick={() => setConfigModalOpen(false)} disabled={savingConfig}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSaveConfig} loading={savingConfig} disabled={fetchingConfig}>
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
