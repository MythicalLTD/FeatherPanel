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

import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { usePluginRoutes } from '@/hooks/usePluginRoutes';
import { getAdminNavigationItems, getMainNavigationItems, getServerNavigationItems } from '@/config/navigation';
import {
    flattenNavCatalog,
    type SidebarCustomLink,
    type SidebarNavigationConfig,
    type SidebarScope,
    type SidebarScopeConfig,
} from '@/lib/sidebarCustomization';
import type { PluginSidebarItem } from '@/types/navigation';
import { Input } from '@/components/featherui/Input';
import { Button } from '@/components/featherui/Button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Props = {
    config: SidebarNavigationConfig;
    onConfigChange: (value: SidebarNavigationConfig) => void;
};

const SCOPES: SidebarScope[] = ['admin', 'main', 'server'];

function pluginCatalogRows(
    plugins: Record<string, PluginSidebarItem> | undefined,
): Array<{ id: string; name: string; group?: string }> {
    if (!plugins) return [];
    return Object.entries(plugins).map(([url, item]) => ({
        id: `plugin-${item.plugin}-${url}`,
        name: item.pluginName ? `${item.name} (${item.pluginName})` : item.name,
        group: item.group || 'plugins',
    }));
}

function ensureScope(config: SidebarNavigationConfig, scope: SidebarScope): SidebarScopeConfig {
    return {
        hidden: [...(config[scope]?.hidden ?? [])],
        order: [...(config[scope]?.order ?? [])],
        custom_links: [...(config[scope]?.custom_links ?? [])],
    };
}

export function PremiumSidebarEditor({ config, onConfigChange }: Props) {
    const { t } = useTranslation();
    const router = useRouter();
    const { settings } = useSettings();
    const { hasPermission } = useSession();
    const { isDeveloperModeEnabled } = useDeveloperMode();
    const { data: pluginRoutes } = usePluginRoutes();
    const [scope, setScope] = useState<SidebarScope>('admin');

    const catalog = useMemo(() => {
        let builtIn: Array<{ id: string; name: string; group?: string }> = [];
        if (scope === 'admin') {
            builtIn = flattenNavCatalog(getAdminNavigationItems(t, settings, isDeveloperModeEnabled ?? false));
        } else if (scope === 'server') {
            builtIn = flattenNavCatalog(getServerNavigationItems(t, 'preview', settings));
        } else {
            builtIn = flattenNavCatalog(getMainNavigationItems(t, settings, hasPermission));
        }

        const pluginBucket =
            scope === 'admin' ? pluginRoutes?.admin : scope === 'server' ? pluginRoutes?.server : pluginRoutes?.client;

        const plugins = pluginCatalogRows(pluginBucket);
        const seen = new Set(builtIn.map((row) => row.id));
        for (const row of plugins) {
            if (!seen.has(row.id)) {
                builtIn.push(row);
                seen.add(row.id);
            }
        }
        return builtIn;
    }, [scope, t, settings, isDeveloperModeEnabled, hasPermission, pluginRoutes]);

    const scopeConfig = ensureScope(config, scope);
    const hiddenSet = new Set(scopeConfig.hidden ?? []);

    const orderedCatalog = useMemo(() => {
        const order = scopeConfig.order ?? [];
        if (order.length === 0) return catalog;
        const indexMap = new Map(order.map((id, i) => [id, i]));
        return [...catalog].sort((a, b) => {
            const ai = indexMap.has(a.id) ? (indexMap.get(a.id) as number) : 10_000;
            const bi = indexMap.has(b.id) ? (indexMap.get(b.id) as number) : 10_000;
            return ai - bi;
        });
    }, [catalog, scopeConfig.order]);

    const updateScope = (next: SidebarScopeConfig) => {
        onConfigChange({
            ...config,
            [scope]: {
                hidden: next.hidden ?? [],
                order: next.order ?? [],
                custom_links: next.custom_links ?? [],
            },
        });
    };

    const setHidden = (id: string, visible: boolean) => {
        const hidden = new Set(scopeConfig.hidden ?? []);
        if (visible) hidden.delete(id);
        else hidden.add(id);
        updateScope({ ...scopeConfig, hidden: Array.from(hidden) });
    };

    const moveItem = (id: string, direction: -1 | 1) => {
        const currentOrder =
            (scopeConfig.order?.length ?? 0) > 0 ? [...(scopeConfig.order as string[])] : catalog.map((row) => row.id);
        const index = currentOrder.indexOf(id);
        if (index < 0) return;
        const target = index + direction;
        if (target < 0 || target >= currentOrder.length) return;
        const swapped = [...currentOrder];
        [swapped[index], swapped[target]] = [swapped[target], swapped[index]];
        updateScope({ ...scopeConfig, order: swapped });
    };

    const addCustomLink = () => {
        const links = [...(scopeConfig.custom_links ?? [])];
        const slug = `link-${Date.now().toString(36)}`;
        links.push({
            id: slug,
            name: 'Custom link',
            url: 'https://',
            group: 'overview',
            icon: 'external-link',
            open_in_new_tab: true,
            priority: 1000 + links.length,
        });
        updateScope({ ...scopeConfig, custom_links: links });
    };

    const updateCustomLink = (index: number, patch: Partial<SidebarCustomLink>) => {
        const links = [...(scopeConfig.custom_links ?? [])];
        if (!links[index]) return;
        links[index] = { ...links[index], ...patch };
        updateScope({ ...scopeConfig, custom_links: links });
    };

    const removeCustomLink = (index: number) => {
        const links = [...(scopeConfig.custom_links ?? [])];
        links.splice(index, 1);
        updateScope({ ...scopeConfig, custom_links: links });
    };

    const resetScope = () => {
        const next = { ...config };
        delete next[scope];
        onConfigChange(next);
    };

    return (
        <div className='space-y-6'>
            <p className='text-muted-foreground text-sm'>{t('admin.featherpanel_premium.sidebar.description')}</p>
            <p className='text-muted-foreground text-xs'>
                {t('admin.featherpanel_premium.sidebar.free_branding_hint')}{' '}
                <button
                    type='button'
                    className='text-primary underline-offset-2 hover:underline'
                    onClick={() => router.push('/admin/settings')}
                >
                    {t('admin.featherpanel_premium.sidebar.open_app_settings')}
                </button>
            </p>

            <div className='flex flex-wrap gap-2'>
                {SCOPES.map((key) => (
                    <Button
                        key={key}
                        size='sm'
                        variant={scope === key ? 'default' : 'outline'}
                        onClick={() => setScope(key)}
                    >
                        {t(`admin.featherpanel_premium.sidebar.scopes.${key}`)}
                    </Button>
                ))}
                <Button size='sm' variant='ghost' onClick={resetScope}>
                    {t('admin.featherpanel_premium.sidebar.reset_scope')}
                </Button>
            </div>

            <div className='space-y-2'>
                <Label>{t('admin.featherpanel_premium.sidebar.items')}</Label>
                <p className='text-muted-foreground text-xs'>{t('admin.featherpanel_premium.sidebar.items_help')}</p>
                <div className='border-border max-h-80 space-y-1 overflow-y-auto rounded-lg border p-2'>
                    {orderedCatalog.map((row, index) => {
                        const visible = !hiddenSet.has(row.id);
                        const isPlugin = row.id.startsWith('plugin-');
                        return (
                            <div
                                key={row.id}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-2 py-1.5',
                                    !visible && 'opacity-50',
                                )}
                            >
                                <div className='flex shrink-0 flex-col'>
                                    <button
                                        type='button'
                                        className='text-muted-foreground hover:text-foreground p-0.5'
                                        onClick={() => moveItem(row.id, -1)}
                                        disabled={index === 0}
                                        aria-label='Move up'
                                    >
                                        <ChevronUp className='h-3.5 w-3.5' />
                                    </button>
                                    <button
                                        type='button'
                                        className='text-muted-foreground hover:text-foreground p-0.5'
                                        onClick={() => moveItem(row.id, 1)}
                                        disabled={index === orderedCatalog.length - 1}
                                        aria-label='Move down'
                                    >
                                        <ChevronDown className='h-3.5 w-3.5' />
                                    </button>
                                </div>
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm font-medium'>
                                        {row.name}
                                        {isPlugin && (
                                            <span className='text-muted-foreground ml-2 text-[11px] font-normal'>
                                                plugin
                                            </span>
                                        )}
                                    </p>
                                    <p className='text-muted-foreground truncate font-mono text-[11px]'>{row.id}</p>
                                </div>
                                <Switch checked={visible} onCheckedChange={(checked) => setHidden(row.id, checked)} />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className='space-y-3'>
                <div className='flex items-center justify-between gap-2'>
                    <div>
                        <Label>{t('admin.featherpanel_premium.sidebar.custom_links')}</Label>
                        <p className='text-muted-foreground text-xs'>
                            {t('admin.featherpanel_premium.sidebar.custom_links_help')}
                        </p>
                    </div>
                    <Button size='sm' variant='outline' onClick={addCustomLink}>
                        <Plus className='mr-1 h-4 w-4' />
                        {t('admin.featherpanel_premium.sidebar.add_link')}
                    </Button>
                </div>

                {(scopeConfig.custom_links ?? []).length === 0 ? (
                    <p className='text-muted-foreground text-sm'>{t('admin.featherpanel_premium.sidebar.no_links')}</p>
                ) : (
                    <div className='space-y-3'>
                        {(scopeConfig.custom_links ?? []).map((link, index) => (
                            <div key={`${link.id}-${index}`} className='border-border space-y-3 rounded-lg border p-3'>
                                <div className='grid gap-3 md:grid-cols-2'>
                                    <div className='space-y-1'>
                                        <Label>{t('admin.featherpanel_premium.sidebar.link_name')}</Label>
                                        <Input
                                            value={link.name}
                                            onChange={(e) => updateCustomLink(index, { name: e.target.value })}
                                        />
                                    </div>
                                    <div className='space-y-1'>
                                        <Label>{t('admin.featherpanel_premium.sidebar.link_id')}</Label>
                                        <Input
                                            value={link.id}
                                            onChange={(e) =>
                                                updateCustomLink(index, {
                                                    id: e.target.value.replace(/[^a-zA-Z0-9._:-]/g, ''),
                                                })
                                            }
                                        />
                                    </div>
                                    <div className='space-y-1 md:col-span-2'>
                                        <Label>{t('admin.featherpanel_premium.sidebar.link_url')}</Label>
                                        <Input
                                            value={link.url}
                                            onChange={(e) => updateCustomLink(index, { url: e.target.value })}
                                            placeholder='https://… or /admin/…'
                                        />
                                    </div>
                                    <div className='space-y-1'>
                                        <Label>{t('admin.featherpanel_premium.sidebar.link_group')}</Label>
                                        <Input
                                            value={link.group || 'overview'}
                                            onChange={(e) => updateCustomLink(index, { group: e.target.value })}
                                        />
                                    </div>
                                    <div className='space-y-1'>
                                        <Label>{t('admin.featherpanel_premium.sidebar.link_icon')}</Label>
                                        <Input
                                            value={link.icon || 'external-link'}
                                            onChange={(e) => updateCustomLink(index, { icon: e.target.value })}
                                            placeholder='external-link'
                                        />
                                    </div>
                                </div>
                                <div className='flex items-center justify-between gap-3'>
                                    <div className='flex items-center gap-2'>
                                        <Switch
                                            checked={Boolean(link.open_in_new_tab)}
                                            onCheckedChange={(checked) =>
                                                updateCustomLink(index, { open_in_new_tab: checked })
                                            }
                                        />
                                        <span className='text-sm'>
                                            {t('admin.featherpanel_premium.sidebar.open_new_tab')}
                                        </span>
                                    </div>
                                    <Button size='sm' variant='destructive' onClick={() => removeCustomLink(index)}>
                                        <Trash2 className='mr-1 h-4 w-4' />
                                        {t('admin.featherpanel_premium.sidebar.remove_link')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
