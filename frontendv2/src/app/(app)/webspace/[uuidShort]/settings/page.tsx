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

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { AlertTriangle, Code, Globe, Loader2, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select-native';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { WebSpaceAccessLinks } from '@/components/webspace/WebSpaceAccessLinks';
import { WebSpaceUsageBar } from '@/components/webspace/WebSpaceUsageBar';
import type { WebSpaceAccessUrls } from '@/lib/webspace-urls';

interface WebSpace {
    uuid: string;
    uuidShort?: string;
    name: string;
    description?: string;
    status?: string;
    domains?: string[];
    ssl?: boolean;
    owner_id?: number;
    webplate_id?: number;
    webplate_runtime?: string;
    web_node_fqdn?: string | null;
    backend_port?: number;
    cpu_limit?: number;
    memory_limit?: number;
    bandwidth_limit_gb?: number | null;
    effective_bandwidth_limit_gb?: number;
    bandwidth_used_bytes?: number;
    bandwidth_limit_bytes?: number;
    bandwidth_over_quota?: boolean;
    access?: WebSpaceAccessUrls;
}

export default function WebSpaceSettingsPage() {
    const params = useParams();
    const { t } = useTranslation();
    const uuidShort = String(params.uuidShort || '');
    const { user } = useSession();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [showReinstall, setShowReinstall] = useState(false);
    const [space, setSpace] = useState<WebSpace | null>(null);
    const [utilBandwidth, setUtilBandwidth] = useState<{ used?: number; limit?: number; overQuota?: boolean } | null>(
        null,
    );
    const [form, setForm] = useState({
        name: '',
        description: '',
        webplateId: '',
    });
    const [phpPlates, setPhpPlates] = useState<{ id: number; name: string; docker_image?: string }[]>([]);
    const [currentRuntime, setCurrentRuntime] = useState('');
    const [phpIni, setPhpIni] = useState('');
    const [savingPhpIni, setSavingPhpIni] = useState(false);
    const [phpExtCatalog, setPhpExtCatalog] = useState<string[]>([]);
    const [phpExtSelected, setPhpExtSelected] = useState<string[]>([]);
    const [savingPhpExt, setSavingPhpExt] = useState(false);
    const [redisEnabled, setRedisEnabled] = useState(false);
    const [redisPassword, setRedisPassword] = useState('');
    const [savingRedis, setSavingRedis] = useState(false);

    const isOwner = space != null && user != null && Number(space.owner_id) === Number(user.id);

    const load = useCallback(async () => {
        try {
            const [showRes, utilRes, catalogRes, phpIniRes, phpExtRes, redisRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}`),
                axios.get(`/api/user/webspaces/${uuidShort}/utilization`).catch(() => null),
                axios.get('/api/user/webspaces/catalog').catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/php-ini`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/php-extensions`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/redis`).catch(() => null),
            ]);
            const ws = showRes.data.data.webspace as WebSpace;
            setSpace(ws);
            setForm({
                name: ws.name || '',
                description: ws.description || '',
                webplateId: ws.webplate_id ? String(ws.webplate_id) : '',
            });
            const plates =
                (catalogRes?.data?.data?.webplates as {
                    id: number;
                    name: string;
                    runtime?: string;
                    docker_image?: string;
                }[]) || [];
            const current = plates.find((p) => p.id === ws.webplate_id);
            setCurrentRuntime((current?.runtime || ws.webplate_runtime || '').toLowerCase());
            setPhpPlates(plates.filter((p) => (p.runtime || '').toLowerCase() === 'php'));
            setPhpIni(String(phpIniRes?.data?.data?.contents ?? ''));
            setPhpExtCatalog((phpExtRes?.data?.data?.catalog as string[]) || []);
            setPhpExtSelected((phpExtRes?.data?.data?.extensions as string[]) || []);
            setRedisEnabled(!!redisRes?.data?.data?.enabled);
            setRedisPassword(String(redisRes?.data?.data?.password ?? ''));
            const util = utilRes?.data?.data?.utilization;
            if (util) {
                setUtilBandwidth({
                    used: util.bandwidth_used_bytes,
                    limit: util.bandwidth_limit_bytes,
                    overQuota: !!util.bandwidth_over_quota,
                });
            }
        } catch (error) {
            console.error(error);
            toast.error(t('webSpaces.settings.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const saveSettings = async () => {
        if (!form.name.trim()) {
            toast.error(t('webSpaces.settings.nameRequired'));
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: form.name.trim(),
                description: form.description,
            };
            if (form.webplateId) {
                payload.webplate_id = Number(form.webplateId);
            }
            const { data } = await axios.patch(`/api/user/webspaces/${uuidShort}`, payload);
            if (data.data?.webspace) {
                setSpace(data.data.webspace);
            }
            toast.success(t('webSpaces.settings.saved'));
        } catch (error) {
            let msg = t('webSpaces.settings.saveFailed');
            if (isAxiosError(error)) {
                if (error.response?.status === 403) {
                    msg = t('webSpaces.settings.noPermission');
                } else if (error.response?.data?.message) {
                    msg = error.response.data.message;
                }
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const savePhpIni = async () => {
        setSavingPhpIni(true);
        try {
            await axios.put(`/api/user/webspaces/${uuidShort}/php-ini`, { contents: phpIni });
            toast.success(t('webSpaces.settings.phpIniSaved'));
        } catch (error) {
            let msg = t('webSpaces.settings.phpIniSaveFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setSavingPhpIni(false);
        }
    };

    const savePhpExtensions = async () => {
        setSavingPhpExt(true);
        try {
            const { data } = await axios.put(`/api/user/webspaces/${uuidShort}/php-extensions`, {
                extensions: phpExtSelected,
            });
            setPhpExtSelected((data.data?.extensions as string[]) || phpExtSelected);
            toast.success(t('webSpaces.settings.phpExtensionsSaved'));
        } catch (error) {
            let msg = t('webSpaces.settings.phpExtensionsSaveFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setSavingPhpExt(false);
        }
    };

    const saveRedis = async (enabled: boolean) => {
        setSavingRedis(true);
        try {
            const { data } = await axios.put(`/api/user/webspaces/${uuidShort}/redis`, { enabled });
            setRedisEnabled(!!data.data?.enabled);
            setRedisPassword(String(data.data?.password ?? ''));
            toast.success(t('webSpaces.settings.redisSaved'));
            void load();
        } catch (error) {
            let msg = t('webSpaces.settings.redisSaveFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setSavingRedis(false);
        }
    };

    const reinstall = async () => {
        setBusy('reinstall');
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/reinstall`, {
                wipe_files: true,
                start_on_completion: true,
            });
            if (data?.data?.webspace) {
                setSpace(data.data.webspace);
            }
            toast.success(t('webSpaces.overview.reinstallStarted'));
        } catch (error) {
            let msg = t('webSpaces.overview.reinstallFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
            setShowReinstall(false);
        }
    };

    if (loading || !space) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <WebSpacePageWidgets pageId='webspace-settings'>
            <div className='mx-auto max-w-6xl space-y-8 pb-16'>
                <PageHeader title={t('webSpaces.settings.title')} description={t('webSpaces.settings.description')} />

                <div className='grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12'>
                    <div className='min-w-0 space-y-8 lg:col-span-8'>
                        <PageCard
                            title={t('webSpaces.settings.information')}
                            description={t('webSpaces.settings.informationDescription')}
                            icon={Settings}
                        >
                            <div className='space-y-4'>
                                {!isOwner && (
                                    <p className='text-muted-foreground text-xs'>
                                        {t('webSpaces.settings.permissionHint')}
                                    </p>
                                )}
                                <div className='space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('webSpaces.settings.name')}
                                    </Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className='bg-secondary/50 border-border/10 focus:border-primary/50 h-12 rounded-xl text-base font-medium'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('webSpaces.settings.descriptionLabel')}
                                    </Label>
                                    <Input
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className='bg-secondary/50 border-border/10 focus:border-primary/50 h-12 rounded-xl text-base font-medium'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                        {t('webSpaces.settings.bandwidthLimit')}
                                    </Label>
                                    <WebSpaceUsageBar
                                        label={t('webSpaces.settings.used')}
                                        used={utilBandwidth?.used ?? space.bandwidth_used_bytes}
                                        limit={utilBandwidth?.limit ?? space.bandwidth_limit_bytes}
                                    />
                                    {utilBandwidth?.overQuota || space.bandwidth_over_quota ? (
                                        <p className='text-destructive text-xs'>
                                            {t('webSpaces.overview.bandwidthOverQuota')}
                                        </p>
                                    ) : null}
                                    <p className='text-muted-foreground text-xs'>
                                        {(space.effective_bandwidth_limit_gb ?? space.bandwidth_limit_gb ?? 0) > 0
                                            ? t('webSpaces.settings.bandwidthLimitGb', {
                                                  n: String(
                                                      space.effective_bandwidth_limit_gb ?? space.bandwidth_limit_gb,
                                                  ),
                                              })
                                            : t('webSpaces.settings.unlimited')}
                                    </p>
                                </div>
                                <div className='grid gap-4 sm:grid-cols-2'>
                                    <div className='space-y-1'>
                                        <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                            {t('webSpaces.settings.cpuLimit')}
                                        </Label>
                                        <p className='text-sm font-medium'>
                                            {(space.cpu_limit ?? 0) > 0
                                                ? t('webSpaces.settings.cores', { n: String(space.cpu_limit) })
                                                : t('webSpaces.settings.unlimited')}
                                        </p>
                                    </div>
                                    <div className='space-y-1'>
                                        <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                            {t('webSpaces.settings.memoryLimit')}
                                        </Label>
                                        <p className='text-sm font-medium'>
                                            {(space.memory_limit ?? 0) > 0
                                                ? t('webSpaces.settings.mib', { n: String(space.memory_limit) })
                                                : t('webSpaces.settings.unlimited')}
                                        </p>
                                    </div>
                                </div>
                                <p className='text-muted-foreground text-xs'>
                                    {t('webSpaces.settings.resourceLimitsHelp')}
                                </p>
                                <Button loading={saving} onClick={() => void saveSettings()} size='sm'>
                                    <Save className='mr-2 h-4 w-4' />
                                    {t('webSpaces.settings.saveSettings')}
                                </Button>
                            </div>
                        </PageCard>

                        {currentRuntime === 'php' && phpPlates.length > 0 && (
                            <PageCard title={t('webSpaces.settings.phpTitle')} icon={Code}>
                                <div className='space-y-4'>
                                    <p className='text-muted-foreground text-sm'>{t('webSpaces.settings.phpHelp')}</p>
                                    <div className='space-y-2'>
                                        <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                            {t('webSpaces.settings.phpVersion')}
                                        </Label>
                                        <Select
                                            value={form.webplateId}
                                            onChange={(e) => setForm({ ...form, webplateId: e.target.value })}
                                        >
                                            {phpPlates.map((plate) => (
                                                <option key={plate.id} value={String(plate.id)}>
                                                    {plate.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                            php.ini
                                        </Label>
                                        <textarea
                                            value={phpIni}
                                            onChange={(e) => setPhpIni(e.target.value)}
                                            rows={10}
                                            spellCheck={false}
                                            className='bg-secondary/50 border-border/10 focus:border-primary/50 w-full rounded-xl border p-3 font-mono text-xs'
                                        />
                                    </div>
                                    {phpExtCatalog.length > 0 && (
                                        <div className='space-y-2'>
                                            <Label className='text-muted-foreground ml-1 text-xs font-bold tracking-wider uppercase'>
                                                {t('webSpaces.settings.phpExtensions')}
                                            </Label>
                                            <p className='text-muted-foreground text-xs'>
                                                {t('webSpaces.settings.phpExtensionsHelp')}
                                            </p>
                                            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                                                {phpExtCatalog.map((ext) => (
                                                    <label key={ext} className='flex items-center gap-2 text-sm'>
                                                        <Checkbox
                                                            checked={phpExtSelected.includes(ext)}
                                                            onCheckedChange={(checked) => {
                                                                setPhpExtSelected((prev) =>
                                                                    checked === true
                                                                        ? [...prev, ext].sort()
                                                                        : prev.filter((e) => e !== ext),
                                                                );
                                                            }}
                                                        />
                                                        <span className='font-mono text-xs'>{ext}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className='flex flex-wrap gap-2'>
                                        <Button loading={saving} onClick={() => void saveSettings()} size='sm'>
                                            <Save className='mr-2 h-4 w-4' />
                                            {t('webSpaces.settings.saveSettings')}
                                        </Button>
                                        <Button
                                            loading={savingPhpIni}
                                            variant='outline'
                                            onClick={() => void savePhpIni()}
                                            size='sm'
                                        >
                                            {t('webSpaces.settings.savePhpIni')}
                                        </Button>
                                        <Button
                                            loading={savingPhpExt}
                                            variant='outline'
                                            onClick={() => void savePhpExtensions()}
                                            size='sm'
                                        >
                                            {t('webSpaces.settings.savePhpExtensions')}
                                        </Button>
                                    </div>
                                </div>
                            </PageCard>
                        )}

                        {currentRuntime === 'php' && (
                            <PageCard title={t('webSpaces.settings.redisTitle')} icon={Code}>
                                <div className='space-y-4'>
                                    <p className='text-muted-foreground text-sm'>{t('webSpaces.settings.redisHelp')}</p>
                                    <label className='flex items-center gap-2 text-sm'>
                                        <Checkbox
                                            checked={redisEnabled}
                                            onCheckedChange={(checked) => void saveRedis(checked === true)}
                                        />
                                        {t('webSpaces.settings.redisEnabled')}
                                    </label>
                                    {redisEnabled && redisPassword && (
                                        <div className='space-y-1'>
                                            <p className='text-muted-foreground font-mono text-xs'>
                                                REDIS_HOST=redis · REDIS_PORT=6379
                                            </p>
                                            <p className='text-muted-foreground font-mono text-xs break-all'>
                                                REDIS_PASSWORD={redisPassword}
                                            </p>
                                        </div>
                                    )}
                                    <Button
                                        loading={savingRedis}
                                        size='sm'
                                        variant='outline'
                                        onClick={() => void saveRedis(!redisEnabled)}
                                    >
                                        {redisEnabled
                                            ? t('webSpaces.settings.redisDisable')
                                            : t('webSpaces.settings.redisEnable')}
                                    </Button>
                                </div>
                            </PageCard>
                        )}
                    </div>

                    <div className='min-w-0 space-y-8 lg:col-span-4'>
                        <PageCard title={t('webSpaces.access.title')} icon={Globe}>
                            <WebSpaceAccessLinks
                                domains={(space.domains || []).filter(Boolean)}
                                ssl={space.ssl}
                                backendPort={space.backend_port}
                                nodeFqdn={space.web_node_fqdn}
                                access={space.access}
                            />
                        </PageCard>

                        <PageCard title={t('webSpaces.overview.dangerZone')} variant='warning' icon={AlertTriangle}>
                            <p className='text-muted-foreground mb-4 text-sm'>{t('webSpaces.overview.reinstall')}</p>
                            <Button
                                variant='outline'
                                loading={busy === 'reinstall'}
                                disabled={!!busy}
                                onClick={() => setShowReinstall(true)}
                            >
                                {t('webSpaces.overview.reinstall')}
                            </Button>
                        </PageCard>
                    </div>
                </div>

                <ConfirmDialog
                    open={showReinstall}
                    onOpenChange={setShowReinstall}
                    title={t('webSpaces.overview.reinstall')}
                    description={t('webSpaces.overview.reinstallConfirm')}
                    confirmLabel={t('webSpaces.overview.reinstall')}
                    cancelLabel={t('common.cancel')}
                    onConfirm={() => void reinstall()}
                />
            </div>
        </WebSpacePageWidgets>
    );
}
