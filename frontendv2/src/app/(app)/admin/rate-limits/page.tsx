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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Save, RotateCcw, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface RateLimitConfig {
    _enabled?: boolean;
    per_second?: number | null;
    per_minute?: number | null;
    per_hour?: number | null;
    per_day?: number | null;
    namespace?: string | null;
}

interface RateLimitsResponse {
    _enabled?: boolean;
    routes?: Record<string, RateLimitConfig>;
}

export default function RateLimitsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [globalEnabled, setGlobalEnabled] = useState(false);
    const [rateLimits, setRateLimits] = useState<Record<string, RateLimitConfig>>({});
    const [changedRoutes, setChangedRoutes] = useState<Set<string>>(new Set());
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-rate-limits');

    const fetchRateLimits = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get<{
                success: boolean;
                data?: RateLimitsResponse;
                message?: string;
            }>('/api/admin/rate-limits');
            if (response.data.success && response.data.data) {
                setGlobalEnabled(response.data.data._enabled ?? false);
                setRateLimits(response.data.data.routes || {});
                setChangedRoutes(new Set());
            } else {
                toast.error(response.data.message || t('admin.rate_limits.messages.load_failed'));
            }
        } catch {
            toast.error(t('admin.rate_limits.messages.load_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchRateLimits();
        fetchWidgets();
    }, [fetchRateLimits, fetchWidgets]);

    const handleGlobalToggle = async () => {
        setSaving(true);
        try {
            const newState = !globalEnabled;
            const response = await axios.patch<{ success: boolean; message?: string }>(
                '/api/admin/rate-limits/global',
                {
                    _enabled: newState,
                },
            );
            if (response.data.success) {
                setGlobalEnabled(newState);
                toast.success(
                    newState
                        ? t('admin.rate_limits.messages.global_enabled')
                        : t('admin.rate_limits.messages.global_disabled'),
                );
            } else {
                toast.error(response.data.message || t('admin.rate_limits.messages.global_update_failed'));
            }
        } catch {
            toast.error(t('admin.rate_limits.messages.global_update_failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleRouteChange = (
        routeName: string,
        field: keyof RateLimitConfig,
        value: number | string | boolean | null,
    ) => {
        setRateLimits((prev) => ({
            ...prev,
            [routeName]: {
                ...prev[routeName],
                [field]: value,
            },
        }));
        setChangedRoutes((prev) => {
            const newSet = new Set(prev);
            newSet.add(routeName);
            return newSet;
        });
    };

    const handleSaveRoute = async (routeName: string) => {
        setSaving(true);
        try {
            const config = rateLimits[routeName];

            // Validate: if enabled, at least one limit must be set
            if (config._enabled !== false) {
                const hasLimit =
                    (config.per_second && config.per_second > 0) ||
                    (config.per_minute && config.per_minute > 0) ||
                    (config.per_hour && config.per_hour > 0) ||
                    (config.per_day && config.per_day > 0);
                if (!hasLimit) {
                    toast.error(t('admin.rate_limits.messages.limit_required'));
                    setSaving(false);
                    return;
                }
            }

            const cleanConfig: Partial<RateLimitConfig> = {};
            if (config._enabled !== undefined) cleanConfig._enabled = config._enabled;
            if (config.per_second && Number(config.per_second) > 0) cleanConfig.per_second = Number(config.per_second);
            if (config.per_minute && Number(config.per_minute) > 0) cleanConfig.per_minute = Number(config.per_minute);
            if (config.per_hour && Number(config.per_hour) > 0) cleanConfig.per_hour = Number(config.per_hour);
            if (config.per_day && Number(config.per_day) > 0) cleanConfig.per_day = Number(config.per_day);
            if (config.namespace) cleanConfig.namespace = String(config.namespace);

            const response = await axios.put<{ success: boolean; message?: string }>(
                `/api/admin/rate-limits/${routeName}`,
                cleanConfig,
            );
            if (response.data.success) {
                toast.success(t('admin.rate_limits.messages.route_updated', { route: routeName }));
                setChangedRoutes((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(routeName);
                    return newSet;
                });
            } else {
                toast.error(response.data.message || t('admin.rate_limits.messages.route_update_failed'));
            }
        } catch {
            toast.error(t('admin.rate_limits.messages.route_update_failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleResetRoute = async (routeName: string) => {
        if (!confirm(t('admin.rate_limits.messages.reset_confirm', { route: routeName }))) return;

        setSaving(true);
        try {
            const response = await axios.delete<{ success: boolean; message?: string }>(
                `/api/admin/rate-limits/${routeName}`,
            );
            if (response.data.success) {
                toast.success(t('admin.rate_limits.messages.reset_success', { route: routeName }));
                fetchRateLimits();
            } else {
                toast.error(response.data.message || t('admin.rate_limits.messages.reset_failed'));
            }
        } catch {
            toast.error(t('admin.rate_limits.messages.reset_failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAll = async () => {
        if (changedRoutes.size === 0) return;
        setSaving(true);
        try {
            const routesToUpdate: Record<string, Record<string, unknown>> = {};
            changedRoutes.forEach((routeName) => {
                const config = rateLimits[routeName];
                const cleanConfig: Record<string, unknown> = {};
                // ... (similar cleaning logic)
                if (config._enabled !== undefined) cleanConfig._enabled = config._enabled;
                if (config.per_second && Number(config.per_second) > 0)
                    cleanConfig.per_second = Number(config.per_second);
                if (config.per_minute && Number(config.per_minute) > 0)
                    cleanConfig.per_minute = Number(config.per_minute);
                if (config.per_hour && Number(config.per_hour) > 0) cleanConfig.per_hour = Number(config.per_hour);
                if (config.per_day && Number(config.per_day) > 0) cleanConfig.per_day = Number(config.per_day);
                if (config.namespace) cleanConfig.namespace = String(config.namespace);

                routesToUpdate[routeName] = cleanConfig;
            });

            const response = await axios.patch<{
                success: boolean;
                data?: { total_updated?: number };
                message?: string;
            }>('/api/admin/rate-limits/bulk', { routes: routesToUpdate });
            if (response.data.success) {
                toast.success(
                    t('admin.rate_limits.messages.bulk_success', {
                        count: String(response.data.data?.total_updated || 0),
                    }),
                );
                setChangedRoutes(new Set());
            } else {
                toast.error(response.data.message || t('admin.rate_limits.messages.bulk_failed'));
            }
        } catch {
            toast.error(t('admin.rate_limits.messages.bulk_failed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-rate-limits', 'top-of-page')} />
            <PageHeader
                title={t('admin.rate_limits.title')}
                description={t('admin.rate_limits.description')}
                icon={Activity}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={fetchRateLimits} disabled={saving || loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('admin.rate_limits.actions.refresh')}
                        </Button>
                        <Button onClick={handleSaveAll} disabled={saving || changedRoutes.size === 0}>
                            {saving ? (
                                <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                            ) : (
                                <Save className='w-4 h-4 mr-2' />
                            )}
                            {t('admin.rate_limits.actions.save_all')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-rate-limits', 'after-header')} />

            <PageCard
                title={t('admin.rate_limits.global.title')}
                description={
                    globalEnabled
                        ? t('admin.rate_limits.global.description_enabled')
                        : t('admin.rate_limits.global.description_disabled')
                }
                footer={null}
            >
                <div className='flex items-center justify-between p-2'>
                    <div className='flex flex-col gap-1'>
                        <span className='font-medium text-base'>{t('admin.rate_limits.global.status_label')}</span>
                        <span className='text-sm text-muted-foreground'>
                            {t('admin.rate_limits.global.status_description')}
                        </span>
                    </div>
                    <div className='flex items-center gap-3'>
                        <span
                            className={`text-sm font-medium ${globalEnabled ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            {globalEnabled
                                ? t('admin.rate_limits.global.enabled')
                                : t('admin.rate_limits.global.disabled')}
                        </span>
                        <Switch checked={globalEnabled} onCheckedChange={handleGlobalToggle} disabled={saving} />
                    </div>
                </div>
            </PageCard>

            <WidgetRenderer widgets={getWidgets('admin-rate-limits', 'before-list')} />

            <PageCard
                title={t('admin.rate_limits.routes.title')}
                description={t('admin.rate_limits.routes.description')}
                footer={null}
            >
                <div className='overflow-x-auto'>
                    <table className='w-full'>
                        <thead>
                            <tr className='border-b border-white/5 text-left'>
                                <th className='p-4 font-medium text-muted-foreground'>
                                    {t('admin.rate_limits.routes.table.route')}
                                </th>
                                <th className='p-4 font-medium text-muted-foreground w-32'>
                                    {t('admin.rate_limits.routes.table.status')}
                                </th>
                                <th className='p-4 font-medium text-muted-foreground w-24'>
                                    {t('admin.rate_limits.routes.table.per_second')}
                                </th>
                                <th className='p-4 font-medium text-muted-foreground w-24'>
                                    {t('admin.rate_limits.routes.table.per_minute')}
                                </th>
                                <th className='p-4 font-medium text-muted-foreground w-24'>
                                    {t('admin.rate_limits.routes.table.per_hour')}
                                </th>
                                <th className='p-4 font-medium text-muted-foreground w-24'>
                                    {t('admin.rate_limits.routes.table.per_day')}
                                </th>
                                <th className='p-4 font-medium text-muted-foreground w-40'>
                                    {t('admin.rate_limits.routes.table.namespace')}
                                </th>
                                <th className='p-4 font-medium text-muted-foreground text-right'>
                                    {t('admin.rate_limits.routes.table.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(rateLimits).length === 0 ? (
                                <tr>
                                    <td colSpan={8} className='p-8 text-center text-muted-foreground'>
                                        {t('admin.rate_limits.routes.table.empty')}
                                    </td>
                                </tr>
                            ) : (
                                Object.entries(rateLimits).map(([route, config]) => (
                                    <tr
                                        key={route}
                                        className='border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors'
                                    >
                                        <td className='p-4 font-medium'>{route}</td>
                                        <td className='p-4'>
                                            <Switch
                                                checked={config._enabled !== false}
                                                onCheckedChange={(checked) =>
                                                    handleRouteChange(route, '_enabled', checked)
                                                }
                                            />
                                        </td>
                                        <td className='p-4'>
                                            <Input
                                                type='number'
                                                className='h-10 w-20 px-2 text-center'
                                                value={config.per_second ?? ''}
                                                onChange={(e) => handleRouteChange(route, 'per_second', e.target.value)}
                                                placeholder='-'
                                                disabled={config._enabled === false}
                                            />
                                        </td>
                                        <td className='p-4'>
                                            <Input
                                                type='number'
                                                className='h-10 w-20 px-2 text-center'
                                                value={config.per_minute ?? ''}
                                                onChange={(e) => handleRouteChange(route, 'per_minute', e.target.value)}
                                                placeholder='-'
                                                disabled={config._enabled === false}
                                            />
                                        </td>
                                        <td className='p-4'>
                                            <Input
                                                type='number'
                                                className='h-10 w-20 px-2 text-center'
                                                value={config.per_hour ?? ''}
                                                onChange={(e) => handleRouteChange(route, 'per_hour', e.target.value)}
                                                placeholder='-'
                                                disabled={config._enabled === false}
                                            />
                                        </td>
                                        <td className='p-4'>
                                            <Input
                                                type='number'
                                                className='h-10 w-20 px-2 text-center'
                                                value={config.per_day ?? ''}
                                                onChange={(e) => handleRouteChange(route, 'per_day', e.target.value)}
                                                placeholder='-'
                                                disabled={config._enabled === false}
                                            />
                                        </td>
                                        <td className='p-4'>
                                            <Input
                                                type='text'
                                                className='h-10 w-36'
                                                value={config.namespace ?? ''}
                                                onChange={(e) => handleRouteChange(route, 'namespace', e.target.value)}
                                                placeholder='rate_limit'
                                                disabled={config._enabled === false}
                                            />
                                        </td>
                                        <td className='p-4 text-right'>
                                            <div className='flex justify-end gap-2'>
                                                <Button
                                                    size='sm'
                                                    disabled={saving || !changedRoutes.has(route)}
                                                    onClick={() => handleSaveRoute(route)}
                                                >
                                                    <Save className='w-4 h-4' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='destructive'
                                                    disabled={saving}
                                                    onClick={() => handleResetRoute(route)}
                                                >
                                                    <RotateCcw className='w-4 h-4' />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </PageCard>
            <WidgetRenderer widgets={getWidgets('admin-rate-limits', 'bottom-of-page')} />
        </div>
    );
}
