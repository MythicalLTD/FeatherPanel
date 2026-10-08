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

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CheckCircle2,
    EyeOff,
    Globe,
    Loader2,
    Package,
    Puzzle,
    RefreshCw,
    Save,
    Search,
    Settings,
    ShieldCheck,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { invalidatePluginRoutesCache } from '@/hooks/usePluginRoutes';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

interface ConfigField {
    name: string;
    display_name: string;
    type: 'text' | 'email' | 'url' | 'password' | 'number' | 'boolean';
    description: string;
    required: boolean;
    default: string;
}

interface Plugin {
    identifier: string;
    name?: string;
    version?: string;
    author?: string | string[];
    description?: string;
    website?: string;
    icon?: string;
    flags?: string[];
    target?: string;
    dependencies?: string[];
    requiredConfigs?: unknown[];
    loaded?: boolean;
    unmetDependencies?: string[];
    missingConfigs?: string[];
}

interface PluginConfig {
    config: Plugin;
    plugin: Plugin;
    settings: Record<string, string>;
    configSchema?: ConfigField[];
    allowedOnlyOnSpells?: number[];
}

interface PluginVisibilityEntry {
    scope: 'sidebar' | 'widget' | 'public-page' | 'ui-pack' | 'ui-page' | 'ui-action';
    id: string;
    label: string;
    settingKey: string;
    hidden: boolean;
    meta?: Record<string, string>;
}

interface PluginVisibilityPayload {
    sidebar: PluginVisibilityEntry[];
    widgets: PluginVisibilityEntry[];
    publicPages: PluginVisibilityEntry[];
    uiPacks: PluginVisibilityEntry[];
}

interface SpellOption {
    id: number;
    name: string;
    description?: string;
    realm_id?: number;
    realm_name?: string;
}

function normalizeAuthor(author: string | string[] | undefined): string {
    return Array.isArray(author) ? author.join(', ') : author || '';
}

function updateVisibilityEntry(
    payload: PluginVisibilityPayload | null,
    settingKey: string,
    hidden: boolean,
): PluginVisibilityPayload | null {
    if (!payload) return payload;
    const update = (entries: PluginVisibilityEntry[]) =>
        entries.map((entry) => (entry.settingKey === settingKey ? { ...entry, hidden } : entry));
    return {
        sidebar: update(payload.sidebar),
        widgets: update(payload.widgets),
        publicPages: update(payload.publicPages),
        uiPacks: update(payload.uiPacks),
    };
}

const surfaceClass = 'border-border/40 bg-card/45 shadow-sm ring-1 ring-white/5';
const softPanelClass = 'border-border/35 bg-background/35';
const mutedPanelClass = 'border-border/30 bg-muted/20';

export default function PluginDetailPage({ params }: { params: Promise<{ identifier: string }> }) {
    const { identifier } = use(params);
    const decodedIdentifier = decodeURIComponent(identifier);
    const { t } = useTranslation();
    const { fetchWidgets } = usePluginWidgets();

    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<PluginConfig | null>(null);
    const [visibility, setVisibility] = useState<PluginVisibilityPayload | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingVisibilityKey, setSavingVisibilityKey] = useState<string | null>(null);
    const [selectedSpellIds, setSelectedSpellIds] = useState<Set<number>>(new Set());
    const [selectedSpellsDetails, setSelectedSpellsDetails] = useState<SpellOption[]>([]);
    const [spells, setSpells] = useState<SpellOption[]>([]);
    const [spellSearchQuery, setSpellSearchQuery] = useState('');
    const [spellsLoading, setSpellsLoading] = useState(false);
    const [savingSpellRestrictions, setSavingSpellRestrictions] = useState(false);
    const [resyncingAssets, setResyncingAssets] = useState(false);

    const loadSelectedSpellsDetails = useCallback(async (spellIds: number[]) => {
        const spellResponses = await Promise.all(
            spellIds.map((id) => axios.get(`/api/admin/spells/${id}`).catch(() => null)),
        );
        setSelectedSpellsDetails(
            spellResponses
                .filter((response) => response?.data?.success && response.data.data?.spell)
                .map((response) => ({
                    id: response!.data.data.spell.id,
                    name: response!.data.data.spell.name,
                    description: response!.data.data.spell.description,
                    realm_id: response!.data.data.spell.realm_id,
                    realm_name: response!.data.data.spell.realm_name,
                })),
        );
    }, []);

    const loadPlugin = useCallback(async () => {
        setLoading(true);
        try {
            const [configResponse, visibilityResponse] = await Promise.all([
                axios.get(`/api/admin/plugins/${decodedIdentifier}/config`),
                axios.get(`/api/admin/plugins/${decodedIdentifier}/visibility`),
            ]);
            const apiData = configResponse.data.data;
            const configPlugin = apiData.config.plugin || apiData.config;
            const pluginData = apiData.plugin.plugin || apiData.plugin;
            const settings =
                apiData.settings && typeof apiData.settings === 'object' && !Array.isArray(apiData.settings)
                    ? apiData.settings
                    : {};

            setConfig({
                config: configPlugin,
                plugin: pluginData,
                settings,
                configSchema: apiData.configSchema || [],
                allowedOnlyOnSpells: apiData.allowedOnlyOnSpells || [],
            });
            setVisibility(visibilityResponse.data.data.visibility || null);

            const spellIds = Array.isArray(apiData.allowedOnlyOnSpells) ? apiData.allowedOnlyOnSpells : [];
            setSelectedSpellIds(new Set(spellIds));
            if (spellIds.length > 0) {
                await loadSelectedSpellsDetails(spellIds);
            } else {
                setSelectedSpellsDetails([]);
            }
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.plugins.messages.config_load_failed'));
        } finally {
            setLoading(false);
        }
    }, [decodedIdentifier, loadSelectedSpellsDetails, t]);

    const fetchSpells = useCallback(async () => {
        setSpellsLoading(true);
        try {
            const response = await axios.get('/api/admin/spells', {
                params: { page: 1, limit: 50, search: spellSearchQuery.trim() || undefined },
            });
            setSpells(response.data.data.spells || []);
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.plugins.messages.spells_load_failed'));
        } finally {
            setSpellsLoading(false);
        }
    }, [spellSearchQuery, t]);

    useEffect(() => {
        void loadPlugin();
    }, [loadPlugin]);

    useEffect(() => {
        const timer = setTimeout(() => void fetchSpells(), spellSearchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchSpells, spellSearchQuery]);

    const configFields = config?.configSchema || [];
    const plugin = config?.plugin || config?.config;
    const author = normalizeAuthor(plugin?.author);
    const hasIssues = Boolean(
        plugin &&
        ((plugin.unmetDependencies?.length || 0) > 0 || (plugin.missingConfigs?.length || 0) > 0 || !plugin.loaded),
    );

    const visibilityGroups = useMemo(
        () =>
            visibility
                ? [
                      {
                          key: 'sidebar',
                          title: t('admin.plugins.drawers.config.visibility.groups.sidebar'),
                          entries: visibility.sidebar,
                      },
                      {
                          key: 'widgets',
                          title: t('admin.plugins.drawers.config.visibility.groups.widgets'),
                          entries: visibility.widgets,
                      },
                      {
                          key: 'publicPages',
                          title: t('admin.plugins.drawers.config.visibility.groups.public_pages'),
                          entries: visibility.publicPages,
                      },
                      {
                          key: 'uiPacks',
                          title: t('admin.plugins.drawers.config.visibility.groups.ui_packs'),
                          entries: visibility.uiPacks,
                      },
                  ]
                : [],
        [t, visibility],
    );
    const visibilityEntryCount = visibilityGroups.reduce((total, group) => total + group.entries.length, 0);
    const hiddenEntryCount = visibilityGroups.reduce(
        (total, group) => total + group.entries.filter((entry) => entry.hidden).length,
        0,
    );

    const saveAllSettings = async () => {
        if (!config) return;
        setSavingSettings(true);
        try {
            await Promise.all(
                Object.entries(config.settings).map(([key, value]) =>
                    axios.post(`/api/admin/plugins/${decodedIdentifier}/settings/set`, { key, value }),
                ),
            );
            toast.success(t('admin.plugins.messages.save_success'));
            await loadPlugin();
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.plugins.messages.save_failed'));
        } finally {
            setSavingSettings(false);
        }
    };

    const toggleVisibility = async (entry: PluginVisibilityEntry, hidden: boolean) => {
        setSavingVisibilityKey(entry.settingKey);
        setVisibility((prev) => updateVisibilityEntry(prev, entry.settingKey, hidden));
        try {
            await axios.post(`/api/admin/plugins/${decodedIdentifier}/settings/set`, {
                key: entry.settingKey,
                value: hidden ? 'true' : 'false',
            });
            invalidatePluginRoutesCache();
            await fetchWidgets(undefined, true);
            toast.success(t('admin.plugins.messages.visibility_saved'));
        } catch (error) {
            console.error(error);
            setVisibility((prev) => updateVisibilityEntry(prev, entry.settingKey, entry.hidden));
            toast.error(getApiErrorMessage(error, t, 'admin.plugins.messages.visibility_save_failed'));
        } finally {
            setSavingVisibilityKey(null);
        }
    };

    const saveSpellRestrictions = async () => {
        setSavingSpellRestrictions(true);
        try {
            await axios.post(`/api/admin/plugins/${decodedIdentifier}/spell-restrictions`, {
                allowedOnlyOnSpells: Array.from(selectedSpellIds),
            });
            invalidatePluginRoutesCache();
            toast.success(t('admin.plugins.messages.spell_restrictions_saved'));
            await loadPlugin();
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.plugins.messages.spell_restrictions_save_failed'));
        } finally {
            setSavingSpellRestrictions(false);
        }
    };

    const resyncAssets = async () => {
        setResyncingAssets(true);
        try {
            await axios.post(`/api/admin/plugins/${decodedIdentifier}/resync-symlinks`);
            toast.success(t('admin.plugins.messages.assets_resynced'));
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.plugins.messages.assets_resync_failed'));
        } finally {
            setResyncingAssets(false);
        }
    };

    const spellsByRealm = useMemo(() => {
        const groups = new Map<string, SpellOption[]>();
        spells.forEach((spell) => {
            const realm = spell.realm_name || t('admin.plugins.detail.spells.no_realm');
            groups.set(realm, [...(groups.get(realm) || []), spell]);
        });
        return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [spells, t]);

    const toggleSpell = (spell: SpellOption) => {
        const next = new Set(selectedSpellIds);
        if (next.has(spell.id)) {
            next.delete(spell.id);
            setSelectedSpellsDetails((prev) => prev.filter((item) => item.id !== spell.id));
        } else {
            next.add(spell.id);
            setSelectedSpellsDetails((prev) => (prev.some((item) => item.id === spell.id) ? prev : [...prev, spell]));
        }
        setSelectedSpellIds(next);
    };

    if (loading) {
        return (
            <div className='text-muted-foreground flex items-center gap-2 py-16 text-sm'>
                <Loader2 className='h-4 w-4 animate-spin' />
                {t('admin.plugins.drawers.config.loading')}
            </div>
        );
    }

    if (!plugin || !config) {
        return (
            <div className='space-y-4'>
                <Button variant='outline' asChild>
                    <Link href='/admin/plugins'>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('admin.plugins.detail.back')}
                    </Link>
                </Button>
                <PageCard title={t('admin.plugins.detail.not_found')} icon={Puzzle}>
                    <p className='text-muted-foreground text-sm'>{decodedIdentifier}</p>
                </PageCard>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={plugin.name || decodedIdentifier}
                description={plugin.description || t('admin.plugins.grid.no_description')}
                icon={Puzzle}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button size='sm' variant='outline' asChild>
                            <Link href='/admin/plugins'>
                                <ArrowLeft className='mr-2 h-4 w-4' />
                                {t('admin.plugins.detail.back')}
                            </Link>
                        </Button>
                        <Button size='sm' variant='outline' onClick={() => void loadPlugin()}>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            {t('admin.plugins.actions.refresh')}
                        </Button>
                        <Button size='sm' variant='outline' onClick={resyncAssets} disabled={resyncingAssets}>
                            {resyncingAssets ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Package className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.plugins.detail.actions.resync_assets')}
                        </Button>
                    </div>
                }
            />

            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                <div className={cn('rounded-lg border px-4 py-3', surfaceClass)}>
                    <p className='text-muted-foreground text-xs'>{t('admin.plugins.grid.version')}</p>
                    <p className='mt-1 text-sm font-medium'>v{plugin.version || '?'}</p>
                </div>
                <div className={cn('rounded-lg border px-4 py-3', surfaceClass)}>
                    <p className='text-muted-foreground text-xs'>{t('admin.plugins.grid.author')}</p>
                    <p className='mt-1 truncate text-sm font-medium'>
                        {author || t('admin.plugins.grid.author_unknown')}
                    </p>
                </div>
                <div className={cn('rounded-lg border px-4 py-3', surfaceClass)}>
                    <p className='text-muted-foreground text-xs'>{t('admin.plugins.detail.status')}</p>
                    <p className='mt-1 inline-flex items-center gap-1.5 text-sm font-medium'>
                        {plugin.loaded ? (
                            <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                        ) : (
                            <X className='h-4 w-4 text-amber-500' />
                        )}
                        {plugin.loaded ? t('admin.plugins.detail.loaded') : t('admin.plugins.grid.not_loaded')}
                    </p>
                </div>
                <div className={cn('rounded-lg border px-4 py-3', surfaceClass)}>
                    <p className='text-muted-foreground text-xs'>
                        {t('admin.plugins.drawers.config.visibility.title')}
                    </p>
                    <p className='mt-1 text-sm font-medium'>
                        {hiddenEntryCount}/{visibilityEntryCount} {t('admin.plugins.detail.hidden')}
                    </p>
                </div>
            </div>

            <Tabs defaultValue='overview' className='space-y-6'>
                <TabsList className='border-border/30 bg-card/40 flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg border p-1 shadow-sm'>
                    <TabsTrigger value='overview'>{t('admin.plugins.detail.tabs.overview')}</TabsTrigger>
                    <TabsTrigger value='settings'>{t('admin.plugins.detail.tabs.settings')}</TabsTrigger>
                    <TabsTrigger value='visibility'>{t('admin.plugins.detail.tabs.visibility')}</TabsTrigger>
                    <TabsTrigger value='spells'>{t('admin.plugins.detail.tabs.spells')}</TabsTrigger>
                    <TabsTrigger value='actions'>{t('admin.plugins.detail.tabs.actions')}</TabsTrigger>
                </TabsList>

                <TabsContent value='overview'>
                    <PageCard
                        title={t('admin.plugins.detail.tabs.overview')}
                        icon={ShieldCheck}
                        className='border-border/40 bg-card/45 rounded-lg p-6 shadow-sm ring-1 ring-white/5'
                    >
                        <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]'>
                            <div className='space-y-4'>
                                <div>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.plugins.detail.identifier')}
                                    </p>
                                    <p className='mt-1 font-mono text-sm break-all'>{decodedIdentifier}</p>
                                </div>
                                {plugin.target ? (
                                    <div>
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.plugins.detail.target')}
                                        </p>
                                        <p className='mt-1 text-sm'>{plugin.target}</p>
                                    </div>
                                ) : null}
                                {plugin.website ? (
                                    <Button variant='outline' size='sm' asChild>
                                        <a href={plugin.website} target='_blank' rel='noreferrer'>
                                            <Globe className='mr-2 h-4 w-4' />
                                            {t('admin.plugins.grid.visit_action')}
                                        </a>
                                    </Button>
                                ) : null}
                            </div>
                            <div className='space-y-3'>
                                <InfoList
                                    title={t('admin.plugins.detail.dependencies')}
                                    items={plugin.dependencies || []}
                                    empty='-'
                                />
                                <InfoList
                                    title={t('admin.plugins.detail.flags')}
                                    items={plugin.flags || []}
                                    empty='-'
                                />
                            </div>
                        </div>
                        {hasIssues ? (
                            <div className='mt-6 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4'>
                                <p className='text-sm font-medium text-amber-700 dark:text-amber-400'>
                                    {t('admin.plugins.detail.attention')}
                                </p>
                                <div className='mt-3 flex flex-wrap gap-2'>
                                    {plugin.unmetDependencies?.map((dep) => (
                                        <Badge key={dep} variant='outline'>
                                            {t('admin.plugins.grid.missing_badge', { dep })}
                                        </Badge>
                                    ))}
                                    {plugin.missingConfigs?.map((cfg) => (
                                        <Badge key={String(cfg)} variant='outline'>
                                            {t('admin.plugins.grid.config_badge', { cfg: String(cfg) })}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </PageCard>
                </TabsContent>

                <TabsContent value='settings'>
                    <PageCard
                        title={t('admin.plugins.drawers.config.settings_title')}
                        description={t('admin.plugins.detail.settings_description')}
                        icon={Settings}
                        className='border-border/40 bg-card/45 rounded-lg p-6 shadow-sm ring-1 ring-white/5'
                        action={
                            configFields.length > 0 ? (
                                <Button size='sm' onClick={saveAllSettings} disabled={savingSettings} data-fp-save-shortcut>
                                    {savingSettings ? (
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Save className='mr-2 h-4 w-4' />
                                    )}
                                    {t('admin.plugins.actions.save_settings')}
                                </Button>
                            ) : null
                        }
                    >
                        {configFields.length === 0 ? (
                            <div className='border-border/30 bg-muted/15 text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm'>
                                {t('admin.plugins.drawers.config.no_schema')}
                            </div>
                        ) : (
                            <div className='grid gap-5 lg:grid-cols-2'>
                                {configFields.map((field) => (
                                    <div key={field.name} className='space-y-2'>
                                        <div className='flex items-center justify-between gap-3'>
                                            <label className='text-sm font-medium'>{field.display_name}</label>
                                            {field.required ? (
                                                <Badge variant='secondary'>
                                                    {t('admin.plugins.drawers.config.required')}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        {field.type === 'boolean' ? (
                                            <label
                                                className={cn(
                                                    'flex items-center gap-3 rounded-lg border p-3',
                                                    mutedPanelClass,
                                                )}
                                            >
                                                <input
                                                    type='checkbox'
                                                    checked={config.settings[field.name] === 'true'}
                                                    onChange={(event) =>
                                                        setConfig((prev) =>
                                                            prev
                                                                ? {
                                                                      ...prev,
                                                                      settings: {
                                                                          ...prev.settings,
                                                                          [field.name]: event.currentTarget.checked
                                                                              ? 'true'
                                                                              : 'false',
                                                                      },
                                                                  }
                                                                : prev,
                                                        )
                                                    }
                                                    className='h-4 w-4'
                                                />
                                                <span className='text-sm'>
                                                    {field.description || field.display_name}
                                                </span>
                                            </label>
                                        ) : (
                                            <Input
                                                type={
                                                    field.type === 'password'
                                                        ? 'password'
                                                        : field.type === 'number'
                                                          ? 'number'
                                                          : 'text'
                                                }
                                                value={config.settings[field.name] || ''}
                                                placeholder={field.default}
                                                onChange={(event) =>
                                                    setConfig((prev) =>
                                                        prev
                                                            ? {
                                                                  ...prev,
                                                                  settings: {
                                                                      ...prev.settings,
                                                                      [field.name]: event.target.value,
                                                                  },
                                                              }
                                                            : prev,
                                                    )
                                                }
                                            />
                                        )}
                                        {field.description && field.type !== 'boolean' ? (
                                            <p className='text-muted-foreground text-xs'>{field.description}</p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}
                    </PageCard>
                </TabsContent>

                <TabsContent value='visibility'>
                    <PageCard
                        title={t('admin.plugins.drawers.config.visibility.title')}
                        description={t('admin.plugins.drawers.config.visibility.description')}
                        icon={EyeOff}
                        className='border-border/40 bg-card/45 rounded-lg p-6 shadow-sm ring-1 ring-white/5'
                    >
                        {visibilityEntryCount === 0 ? (
                            <div className='border-border/30 bg-muted/15 text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm'>
                                {t('admin.plugins.drawers.config.visibility.empty')}
                            </div>
                        ) : (
                            <div className='grid gap-5 xl:grid-cols-2'>
                                {visibilityGroups
                                    .filter((group) => group.entries.length > 0)
                                    .map((group) => (
                                        <div key={group.key} className='space-y-2'>
                                            <div className='flex items-center justify-between'>
                                                <h3 className='text-sm font-medium'>{group.title}</h3>
                                                <Badge variant='outline'>{group.entries.length}</Badge>
                                            </div>
                                            <div
                                                className={cn(
                                                    'divide-border/40 divide-y overflow-hidden rounded-lg border',
                                                    softPanelClass,
                                                )}
                                            >
                                                {group.entries.map((entry) => (
                                                    <VisibilityRow
                                                        key={entry.settingKey}
                                                        entry={entry}
                                                        saving={savingVisibilityKey === entry.settingKey}
                                                        hiddenLabel={t(
                                                            'admin.plugins.drawers.config.visibility.hidden_badge',
                                                        )}
                                                        onToggle={(hidden) => void toggleVisibility(entry, hidden)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </PageCard>
                </TabsContent>

                <TabsContent value='spells'>
                    <PageCard
                        title={t('admin.plugins.drawers.config.spell_restrictions.title')}
                        description={t('admin.plugins.drawers.config.spell_restrictions.description')}
                        icon={SlidersHorizontal}
                        className='border-border/40 bg-card/45 rounded-lg p-6 shadow-sm ring-1 ring-white/5'
                        action={
                            <Button size='sm' onClick={saveSpellRestrictions} disabled={savingSpellRestrictions} data-fp-save-shortcut>
                                {savingSpellRestrictions ? (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <Save className='mr-2 h-4 w-4' />
                                )}
                                {t('admin.plugins.drawers.config.spell_restrictions.save')}
                            </Button>
                        }
                    >
                        {selectedSpellsDetails.length > 0 ? (
                            <div className='mb-5 flex flex-wrap gap-2'>
                                {selectedSpellsDetails.map((spell) => (
                                    <Badge
                                        key={spell.id}
                                        variant='secondary'
                                        className='bg-primary/10 text-primary border-primary/20 gap-1.5'
                                    >
                                        <span className='text-primary/70'>
                                            {spell.realm_name || t('admin.plugins.detail.spells.no_realm')}
                                        </span>
                                        <span>{spell.name}</span>
                                        <button onClick={() => toggleSpell(spell)}>
                                            <X className='h-3 w-3' />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        ) : null}
                        <div className='relative mb-4'>
                            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                            <Input
                                value={spellSearchQuery}
                                onChange={(event) => setSpellSearchQuery(event.target.value)}
                                placeholder={t('admin.plugins.drawers.config.spell_restrictions.search_placeholder')}
                                className='pl-9'
                            />
                        </div>
                        <div
                            className={cn(
                                'divide-border/40 divide-y overflow-hidden rounded-lg border',
                                softPanelClass,
                            )}
                        >
                            {spellsLoading ? (
                                <div className='text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {t('admin.plugins.drawers.config.spell_restrictions.loading')}
                                </div>
                            ) : spells.length === 0 ? (
                                <div className='text-muted-foreground py-10 text-center text-sm'>
                                    {t('admin.plugins.drawers.config.spell_restrictions.no_spells')}
                                </div>
                            ) : (
                                spellsByRealm.map(([realm, realmSpells]) => (
                                    <div key={realm} className='bg-background/20'>
                                        <div className='border-border/30 bg-muted/20 flex items-center justify-between border-b px-3 py-2'>
                                            <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                                                {realm}
                                            </span>
                                            <Badge
                                                variant='outline'
                                                className='border-border/40 bg-background/40 text-[10px]'
                                            >
                                                {realmSpells.length}
                                            </Badge>
                                        </div>
                                        <div className='divide-border/30 divide-y'>
                                            {realmSpells.map((spell) => {
                                                const selected = selectedSpellIds.has(spell.id);
                                                return (
                                                    <button
                                                        key={spell.id}
                                                        type='button'
                                                        onClick={() => toggleSpell(spell)}
                                                        className={cn(
                                                            'flex w-full items-start justify-between gap-4 p-3 text-left transition-colors',
                                                            selected ? 'bg-primary/10' : 'hover:bg-muted/30',
                                                        )}
                                                    >
                                                        <span className='min-w-0'>
                                                            <span className='block text-sm font-medium'>
                                                                {spell.name}
                                                            </span>
                                                            {spell.description ? (
                                                                <span className='text-muted-foreground mt-1 line-clamp-2 block text-xs'>
                                                                    {spell.description}
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                        <input
                                                            type='checkbox'
                                                            readOnly
                                                            checked={selected}
                                                            className='accent-primary mt-0.5 h-4 w-4'
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='actions'>
                    <PageCard
                        title={t('admin.plugins.detail.tabs.actions')}
                        icon={Package}
                        className='border-border/40 bg-card/45 rounded-lg p-6 shadow-sm ring-1 ring-white/5'
                    >
                        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                            <Button variant='outline' onClick={() => void loadPlugin()}>
                                <RefreshCw className='mr-2 h-4 w-4' />
                                {t('admin.plugins.actions.refresh')}
                            </Button>
                            <Button variant='outline' onClick={resyncAssets} disabled={resyncingAssets}>
                                <Package className='mr-2 h-4 w-4' />
                                {t('admin.plugins.detail.actions.resync_assets')}
                            </Button>
                        </div>
                    </PageCard>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function InfoList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
    return (
        <div>
            <p className='text-muted-foreground text-xs'>{title}</p>
            <div className='mt-2 flex flex-wrap gap-1.5'>
                {items.length > 0 ? (
                    items.map((item) => (
                        <Badge key={item} variant='secondary' className='bg-muted/50 text-foreground/80'>
                            {item}
                        </Badge>
                    ))
                ) : (
                    <span className='text-sm'>{empty}</span>
                )}
            </div>
        </div>
    );
}

function VisibilityRow({
    entry,
    saving,
    hiddenLabel,
    onToggle,
}: {
    entry: PluginVisibilityEntry;
    saving: boolean;
    hiddenLabel: string;
    onToggle: (hidden: boolean) => void;
}) {
    return (
        <label className='hover:bg-muted/30 flex cursor-pointer items-start gap-3 p-3 transition-colors'>
            <input
                type='checkbox'
                checked={entry.hidden}
                disabled={saving}
                onChange={(event) => onToggle(event.currentTarget.checked)}
                className='accent-primary mt-0.5 h-4 w-4'
            />
            <span className='min-w-0 flex-1'>
                <span className='flex min-w-0 items-center gap-2'>
                    <span className='truncate text-sm font-medium'>{entry.label}</span>
                    {entry.hidden ? (
                        <Badge variant='secondary' className='bg-primary/10 text-primary border-primary/20 text-[10px]'>
                            {hiddenLabel}
                        </Badge>
                    ) : null}
                </span>
                <span className='text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs'>
                    {entry.meta?.section ? <span>{entry.meta.section}</span> : null}
                    {entry.meta?.page ? <span>{entry.meta.page}</span> : null}
                    {entry.meta?.location ? <span>{entry.meta.location}</span> : null}
                    {entry.meta?.path ? <span>{entry.meta.path}</span> : null}
                    {entry.meta?.match ? <span>{entry.meta.match}</span> : null}
                    {entry.meta?.slot ? <span>{entry.meta.slot}</span> : null}
                </span>
            </span>
            {saving ? <Loader2 className='text-muted-foreground mt-0.5 h-4 w-4 animate-spin' /> : null}
        </label>
    );
}
