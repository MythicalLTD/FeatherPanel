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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { adminSettingsApi, OrganizedSettings, Setting } from '@/lib/admin-settings-api';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/featherui/Textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select-native';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import {
    Settings,
    Mail,
    Shield,
    Database,
    Server,
    Globe,
    Save,
    UploadCloud,
    Loader2,
    Copy,
    Search,
    X,
} from 'lucide-react';
import { copyToClipboard, cn } from '@/lib/utils';

interface LogData {
    success: boolean;
    id?: string;
    url?: string;
    raw?: string;
    error?: string;
}

function formatSettingName(name: string, key: string) {
    const textToFormat = name || key;
    return textToFormat
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function settingValueAsSearchText(setting: Setting): string {
    if (setting.type === 'password') return '';
    const v = setting.value;
    if (v === null || v === undefined) return '';
    return String(v);
}

function matchesSettingsQuery(
    query: string,
    settingKey: string,
    currentSetting: Setting,
    categoryKey: string,
    categoryName: string,
): boolean {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return true;
    const haystack = [
        settingKey,
        formatSettingName(currentSetting.name, settingKey),
        currentSetting.description,
        currentSetting.placeholder,
        settingValueAsSearchText(currentSetting),
        categoryKey,
        categoryName,
    ]
        .join('\n')
        .toLowerCase();
    const terms = trimmed.split(/\s+/).filter(Boolean);
    return terms.every((term) => haystack.includes(term));
}

function SettingFieldRow({
    settingKey,
    currentSetting,
    formattedName,
    onSettingChange,
}: {
    settingKey: string;
    currentSetting: Setting;
    formattedName: string;
    onSettingChange: (key: string, value: string | number | boolean) => void;
}) {
    if (currentSetting.type === 'toggle' || (currentSetting.type as string) === 'boolean') {
        return (
            <div className='flex flex-row items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/30 p-4 transition-colors hover:bg-card/50'>
                <div className='min-w-0 space-y-0.5 pr-2'>
                    <Label htmlFor={settingKey} className='text-base font-medium'>
                        {formattedName}
                    </Label>
                    <p className='text-sm text-muted-foreground max-w-[min(100%,42rem)]'>
                        {currentSetting.description}
                    </p>
                </div>
                <Switch
                    id={settingKey}
                    checked={
                        currentSetting.value === true || currentSetting.value === 'true' || currentSetting.value === 1
                    }
                    onCheckedChange={(checked: boolean) => onSettingChange(settingKey, checked)}
                    className='shrink-0'
                />
            </div>
        );
    }

    if (currentSetting.type === 'textarea') {
        return (
            <div className='space-y-3'>
                <Label htmlFor={settingKey} className='text-base font-medium'>
                    {formattedName}
                </Label>
                <Textarea
                    id={settingKey}
                    value={currentSetting.value as string}
                    onChange={(e) => onSettingChange(settingKey, e.target.value)}
                    placeholder={currentSetting.placeholder}
                    className='min-h-[120px]'
                />
                <p className='text-sm text-muted-foreground'>{currentSetting.description}</p>
            </div>
        );
    }

    if (currentSetting.type === 'select') {
        return (
            <div className='space-y-3'>
                <Label htmlFor={settingKey} className='text-base font-medium'>
                    {formattedName}
                </Label>
                <Select
                    id={settingKey}
                    value={currentSetting.value as string}
                    onChange={(e) => onSettingChange(settingKey, e.target.value)}
                >
                    {currentSetting.options.map((opt) => {
                        let label = opt;
                        if (opt === 'true') label = 'Enabled';
                        if (opt === 'false') label = 'Disabled';
                        if (opt === 'hard_limit') label = 'Hard limit (block at max)';
                        if (opt === 'fifo_rolling') label = 'FIFO rolling (drop oldest)';
                        return (
                            <option key={opt} value={opt} className='bg-card text-foreground'>
                                {label}
                            </option>
                        );
                    })}
                </Select>
                <p className='text-sm text-muted-foreground'>{currentSetting.description}</p>
            </div>
        );
    }

    return (
        <div className='space-y-3'>
            <Label htmlFor={settingKey} className='text-base font-medium'>
                {formattedName}
            </Label>
            <Input
                id={settingKey}
                type={currentSetting.type === 'password' ? 'password' : 'text'}
                value={currentSetting.value as string}
                onChange={(e) => onSettingChange(settingKey, e.target.value)}
                placeholder={currentSetting.placeholder}
            />
            <p className='text-sm text-muted-foreground'>{currentSetting.description}</p>
        </div>
    );
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organizedSettings, setOrganizedSettings] = useState<OrganizedSettings | null>(null);
    const [settings, setSettings] = useState<Record<string, Setting>>({});
    const [initialSettings, setInitialSettings] = useState<Record<string, Setting>>({});
    const [settingsSearch, setSettingsSearch] = useState('');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get('category');

    const [showLogDialog, setShowLogDialog] = useState(false);
    const [uploadedLogs, setUploadedLogs] = useState<{ web: LogData; app: LogData } | null>(null);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-settings');

    const searchTrimmed = settingsSearch.trim();

    const categoryMatchCounts = useMemo(() => {
        if (!organizedSettings) return {} as Record<string, number>;
        const counts: Record<string, number> = {};
        for (const [catKey, data] of Object.entries(organizedSettings)) {
            let n = 0;
            for (const [settingKey, setting] of Object.entries(data.settings)) {
                const currentSetting = settings[settingKey] || setting;
                if (matchesSettingsQuery(searchTrimmed, settingKey, currentSetting, catKey, data.category.name)) {
                    n += 1;
                }
            }
            counts[catKey] = n;
        }
        return counts;
    }, [organizedSettings, settings, searchTrimmed]);

    const anySearchMatch = useMemo(
        () => !searchTrimmed || Object.values(categoryMatchCounts).some((c) => c > 0),
        [searchTrimmed, categoryMatchCounts],
    );

    const categoryKeys = useMemo(() => (organizedSettings ? Object.keys(organizedSettings) : []), [organizedSettings]);

    /** Single source of truth with URL: avoids setState+URL races that caused infinite update loops. */
    const activeTab = useMemo(() => {
        if (categoryKeys.length === 0) return '';
        if (urlCategory && categoryKeys.includes(urlCategory)) return urlCategory;
        return categoryKeys[0];
    }, [categoryKeys, urlCategory]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const handleCategoryChange = useCallback(
        (newTab: string) => {
            router.push(`${pathname}?category=${encodeURIComponent(newTab)}`);
        },
        [pathname, router],
    );

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const response = await adminSettingsApi.fetchSettings();
                if (response.success) {
                    setOrganizedSettings(response.data.organized_settings);
                    setSettings(response.data.settings);

                    setInitialSettings(JSON.parse(JSON.stringify(response.data.settings)));
                } else {
                    toast.error(response.message || t('admin.settings.messages.load_failed'));
                }
            } catch {
                toast.error(t('admin.settings.messages.load_failed'));
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [t]);

    useEffect(() => {
        if (!organizedSettings) return;
        if (categoryKeys.length === 0) return;
        if (urlCategory && categoryKeys.includes(urlCategory)) return;
        router.replace(`${pathname}?category=${encodeURIComponent(categoryKeys[0])}`);
    }, [organizedSettings, categoryKeys, urlCategory, pathname, router]);

    useEffect(() => {
        if (!organizedSettings || !searchTrimmed) return;
        if (categoryKeys.length === 0) return;

        const counts: Record<string, number> = {};
        for (const catKey of categoryKeys) {
            const data = organizedSettings[catKey];
            let n = 0;
            for (const [settingKey, setting] of Object.entries(data.settings)) {
                const currentSetting = settings[settingKey] || setting;
                if (matchesSettingsQuery(searchTrimmed, settingKey, currentSetting, catKey, data.category.name)) {
                    n += 1;
                }
            }
            counts[catKey] = n;
        }

        const resolvedTab = urlCategory && categoryKeys.includes(urlCategory) ? urlCategory : categoryKeys[0];
        const firstWithMatches = categoryKeys.find((k) => (counts[k] ?? 0) > 0);
        if (!firstWithMatches) return;

        // Stay on current category if it still has hits; otherwise jump to the first category (sidebar order) that does.
        if ((counts[resolvedTab] ?? 0) > 0) return;

        if (firstWithMatches !== resolvedTab) {
            router.replace(`${pathname}?category=${encodeURIComponent(firstWithMatches)}`);
        }
    }, [organizedSettings, categoryKeys, settings, searchTrimmed, urlCategory, pathname, router]);

    const handleSettingChange = (key: string, value: string | number | boolean) => {
        setSettings((prev) => ({
            ...prev,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [key]: { ...prev[key], value: value as any },
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: Record<string, string | number | boolean> = {};

            Object.entries(settings).forEach(([key, setting]) => {
                const initial = initialSettings[key];

                if (initial && String(initial.value) !== String(setting.value)) {
                    payload[key] = setting.value;
                }
            });

            if (Object.keys(payload).length === 0) {
                toast.info(t('admin.settings.messages.no_changes'));
                setSaving(false);
                return;
            }

            const response = await adminSettingsApi.updateSettings(payload);
            if (response.success) {
                toast.success(response.message || t('admin.settings.messages.save_success'));

                setInitialSettings(JSON.parse(JSON.stringify(settings)));
            } else {
                toast.error(response.message || t('admin.settings.messages.save_failed'));
            }
        } catch {
            toast.error(t('admin.settings.messages.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleUploadLogs = async () => {
        const promise = adminSettingsApi.uploadLogs().then((data) => {
            if (!data.success || !data.data) {
                throw new Error(data.message || t('admin.settings.logs.upload_failed'));
            }
            return data;
        });
        toast.promise(promise, {
            loading: t('admin.settings.logs.uploading'),
            success: (data) => {
                setUploadedLogs(data.data);
                setShowLogDialog(true);
                return t('admin.settings.messages.save_success');
            },
            error: (error) => {
                return error instanceof Error ? error.message : t('admin.settings.logs.upload_failed');
            },
        });
    };

    const getIconForCategory = (category: string) => {
        switch (category.toLowerCase()) {
            case 'general':
            case 'app':
                return Settings;
            case 'mail':
                return Mail;
            case 'security':
                return Shield;
            case 'database':
                return Database;
            case 'server':
                return Server;
            case 'advanced':
                return Globe;
            default:
                return Settings;
        }
    };

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center gap-4 p-16'>
                <Loader2 className='w-10 h-10 animate-spin text-primary' />
                <p className='text-sm text-muted-foreground'>{t('admin.settings.title')}…</p>
            </div>
        );
    }

    if (!organizedSettings) {
        return <div className='p-8 text-center text-muted-foreground'>{t('admin.settings.no_settings')}</div>;
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-settings', 'top-of-page')} />

            <PageHeader
                title={t('admin.settings.title')}
                description={t('admin.settings.subtitle')}
                icon={Settings}
                actions={
                    <div className='flex flex-wrap items-center justify-end gap-2'>
                        <Button variant='outline' onClick={handleUploadLogs} className='shrink-0'>
                            <UploadCloud className='w-4 h-4 mr-2' />
                            {t('admin.settings.actions.upload_logs')}
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className='shrink-0'>
                            {saving ? (
                                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                            ) : (
                                <Save className='w-4 h-4 mr-2' />
                            )}
                            {t('admin.settings.actions.save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-settings', 'after-header')} />

            <div className='relative rounded-2xl border border-border/50 bg-card/40 p-1.5 shadow-sm'>
                <Search
                    className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground'
                    aria-hidden
                />
                <Input
                    type='search'
                    value={settingsSearch}
                    onChange={(e) => setSettingsSearch(e.target.value)}
                    placeholder={t('admin.settings.search_placeholder')}
                    className='h-11 w-full border-0 bg-transparent pl-11 pr-11 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0'
                    aria-label={t('admin.settings.search_placeholder')}
                />
                {settingsSearch ? (
                    <button
                        type='button'
                        onClick={() => setSettingsSearch('')}
                        className='absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                        title={t('admin.settings.search_clear')}
                    >
                        <X className='h-4 w-4' />
                    </button>
                ) : null}
            </div>

            <div className='block'>
                <Tabs
                    value={activeTab || categoryKeys[0]}
                    onValueChange={handleCategoryChange}
                    orientation='vertical'
                    className='w-full flex flex-col lg:flex-row gap-6 lg:gap-8'
                >
                    <aside className='w-full lg:w-72 shrink-0 flex flex-col gap-3 min-h-0'>
                        <TabsList className='flex flex-row lg:flex-col h-auto w-full max-w-full overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible lg:max-h-[calc(100vh-12rem)] bg-card/30 border border-border/50 p-2 rounded-2xl gap-1 custom-scrollbar'>
                            {Object.entries(organizedSettings).map(([key, data]) => {
                                const Icon = getIconForCategory(key);
                                const matchCount = categoryMatchCounts[key] ?? 0;
                                const total = Object.keys(data.settings).length;
                                const showCount = Boolean(searchTrimmed);

                                return (
                                    <TabsTrigger
                                        key={key}
                                        value={key}
                                        className='w-auto lg:w-full justify-start px-3 py-2.5 h-auto text-sm font-normal data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-medium transition-all rounded-xl border border-transparent data-[state=active]:border-primary/10 whitespace-nowrap shrink-0 lg:shrink'
                                    >
                                        <Icon className='w-4 h-4 mr-2 shrink-0 opacity-80' />
                                        <span className='truncate text-left flex-1 min-w-0'>{data.category.name}</span>
                                        {showCount ? (
                                            <span
                                                className={cn(
                                                    'ml-2 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide tabular-nums',
                                                    matchCount > 0
                                                        ? 'bg-primary/15 text-primary'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {matchCount}/{total}
                                            </span>
                                        ) : null}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </aside>

                    <div className='flex-1 space-y-6 min-w-0'>
                        {Object.entries(organizedSettings).map(([key, data]) => {
                            const filteredEntries = Object.entries(data.settings).filter(([settingKey, setting]) => {
                                const currentSetting = settings[settingKey] || setting;
                                return matchesSettingsQuery(
                                    searchTrimmed,
                                    settingKey,
                                    currentSetting,
                                    key,
                                    data.category.name,
                                );
                            });
                            const totalInCategory = Object.keys(data.settings).length;
                            const shown = filteredEntries.length;

                            return (
                                <TabsContent
                                    key={key}
                                    value={key}
                                    className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                                >
                                    <PageCard
                                        title={data.category.name}
                                        description={
                                            searchTrimmed
                                                ? `${data.category.description} · ${t('admin.settings.search_showing', {
                                                      shown: String(shown),
                                                      total: String(totalInCategory),
                                                  })}`
                                                : data.category.description
                                        }
                                        footer={
                                            <div className='flex flex-wrap items-center justify-between gap-3'>
                                                {searchTrimmed && !anySearchMatch ? (
                                                    <p className='text-sm text-muted-foreground'>
                                                        {t('admin.settings.search_try_other')}
                                                    </p>
                                                ) : (
                                                    <span />
                                                )}
                                                <Button onClick={handleSave} disabled={saving} className='shrink-0'>
                                                    {saving ? (
                                                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                                                    ) : (
                                                        <Save className='w-4 h-4 mr-2' />
                                                    )}
                                                    {t('admin.settings.actions.save')}
                                                </Button>
                                            </div>
                                        }
                                    >
                                        {!anySearchMatch ? (
                                            <div className='flex flex-col items-center justify-center gap-2 py-16 text-center px-4'>
                                                <div className='rounded-full bg-muted/50 p-4'>
                                                    <Search className='h-8 w-8 text-muted-foreground' />
                                                </div>
                                                <p className='text-base font-medium text-foreground'>
                                                    {t('admin.settings.search_no_results')}
                                                </p>
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() => setSettingsSearch('')}
                                                >
                                                    {t('admin.settings.search_clear')}
                                                </Button>
                                            </div>
                                        ) : shown === 0 ? (
                                            <div className='flex flex-col items-center justify-center gap-2 py-14 text-center px-4'>
                                                <p className='text-sm text-muted-foreground'>
                                                    {t('admin.settings.search_no_results')}
                                                </p>
                                                <Button
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={() => setSettingsSearch('')}
                                                >
                                                    {t('admin.settings.search_clear')}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className='space-y-6'>
                                                {filteredEntries.map(([settingKey, setting]) => {
                                                    const currentSetting = settings[settingKey] || setting;
                                                    const formattedName = formatSettingName(
                                                        currentSetting.name,
                                                        settingKey,
                                                    );
                                                    return (
                                                        <SettingFieldRow
                                                            key={settingKey}
                                                            settingKey={settingKey}
                                                            currentSetting={currentSetting}
                                                            formattedName={formattedName}
                                                            onSettingChange={handleSettingChange}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </PageCard>
                                </TabsContent>
                            );
                        })}
                    </div>
                </Tabs>
            </div>

            <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.settings.actions.upload_logs')}</DialogTitle>
                        <DialogDescription>{t('admin.settings.logs.dialog_description')}</DialogDescription>
                    </DialogHeader>
                    {uploadedLogs && (
                        <div className='space-y-4 pt-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.settings.logs.panel_logs')}</Label>
                                {uploadedLogs.web.success && uploadedLogs.web.url ? (
                                    <div className='flex gap-2'>
                                        <Input value={uploadedLogs.web.url} readOnly />
                                        <Button
                                            size='icon'
                                            variant='outline'
                                            onClick={() => {
                                                if (uploadedLogs.web.url) {
                                                    copyToClipboard(uploadedLogs.web.url);
                                                }
                                            }}
                                        >
                                            <Copy className='h-4 w-4' />
                                        </Button>
                                    </div>
                                ) : (
                                    <p className='text-sm text-destructive'>
                                        {uploadedLogs.web.error || t('admin.settings.logs.upload_failed_generic')}
                                    </p>
                                )}
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.settings.logs.system_logs')}</Label>
                                {uploadedLogs.app.success && uploadedLogs.app.url ? (
                                    <div className='flex gap-2'>
                                        <Input value={uploadedLogs.app.url} readOnly />
                                        <Button
                                            size='icon'
                                            variant='outline'
                                            onClick={() => {
                                                if (uploadedLogs.app.url) {
                                                    copyToClipboard(uploadedLogs.app.url);
                                                }
                                            }}
                                        >
                                            <Copy className='h-4 w-4' />
                                        </Button>
                                    </div>
                                ) : (
                                    <p className='text-sm text-destructive'>
                                        {uploadedLogs.app.error || t('admin.settings.logs.upload_failed_generic')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <WidgetRenderer widgets={getWidgets('admin-settings', 'bottom-of-page')} />
        </div>
    );
}
