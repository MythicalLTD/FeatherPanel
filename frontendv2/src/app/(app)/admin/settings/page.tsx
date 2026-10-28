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

import { AdminPageTips } from '@/components/admin/AdminPageTips';
import { EmailProviderHint } from '@/components/admin/EmailProviderHint';
import { VdsSettingsSections } from '@/components/admin/VdsSettingsSections';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { applyMailProviderPreset, shouldShowMailSetting } from '@/lib/mail-providers';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { adminSettingsApi, OrganizedSettings, Setting } from '@/lib/admin-settings-api';
import { useDemoMode } from '@/hooks/useDemoMode';
import { PageHeader } from '@/components/featherui/PageHeader';
import { UnsavedChangesBar } from '@/components/featherui/UnsavedChangesBar';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/featherui/Textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollableTabsList } from '@/components/ui/scrollable-tabs-list';
import { Select } from '@/components/ui/select-native';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import axios from 'axios';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
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
    Send,
    Link2,
    Lock,
    Smartphone,
    Boxes,
    Rocket,
} from 'lucide-react';
import { reopenSetup } from '@/lib/setup-wizard';
import { copyToClipboard, cn } from '@/lib/utils';
import { ImageAttachmentField } from '@/components/featherui/ImageAttachmentField';
import { matchesAdminSettingQuery, resolveAdminSettingLabel, vdsGroupSearchText } from '@/lib/admin-settings-search';

interface LogData {
    success: boolean;
    id?: string;
    url?: string;
    raw?: string;
    error?: string;
}

const UPDATE_PROGRESS_STORAGE_KEY = 'featherpanel:update_in_progress';
const UPDATE_PROGRESS_TTL_MS = 10 * 60 * 1000;

const ADMIN_SETTING_DISPLAY_NAMES: Record<string, string> = {
    server_require_subdomain: 'Require subdomain before server start',
    server_lifecycle_hooks_enabled: 'Lifecycle hooks (pre-start / pre-stop / post-start / crash)',
    server_lifecycle_hooks_container_shell_enabled: 'Container Shell (docker exec) for lifecycle hooks & schedules',
    auth_shell_tagline: 'Auth marketing tagline',
    auth_aside_title: 'Marketing panel title',
    auth_login_headline: 'Login headline',
    auth_login_subheadline: 'Login subheadline',
    auth_register_headline: 'Register headline',
    auth_register_subheadline: 'Register subheadline',
    auth_sso_headline: 'SSO portal headline',
    auth_sso_subheadline: 'SSO portal subheadline',
    auth_show_qr_login: 'QR code login',
    auth_show_marketing_panel: 'Marketing panel (desktop)',
    auth_aside_image_url: 'Marketing panel image',
    auth_template: 'Login page template',
    auth_visual_preset: 'Login visual preset',
    auth_form_density: 'Form density',
    auth_secondary_layout: 'Alternate methods layout',
    auth_show_theme_customizer: 'Theme customizer on auth',
    auth_footer_style: 'Auth footer style',
    login_default_method: 'Default login method',
    login_methods_order: 'Login methods order',
    login_hidden_methods: 'Hidden login methods',
    vnc_proxy_via_panel: 'Proxy VNC via panel',
    vnc_use_pve_redirect: 'Open Proxmox noVNC in new tab',
};

function formatSettingName(name: string, key: string) {
    if (ADMIN_SETTING_DISPLAY_NAMES[key]) {
        return ADMIN_SETTING_DISPLAY_NAMES[key];
    }
    const textToFormat = name || key;
    return textToFormat
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function matchesSettingsQuery(
    query: string,
    settingKey: string,
    currentSetting: Setting,
    categoryKey: string,
    categoryName: string,
    t: (key: string) => string,
): boolean {
    const { title, description } = resolveAdminSettingLabel(settingKey, currentSetting, t);
    const extra = categoryKey === 'vds' ? vdsGroupSearchText(settingKey, t) : '';
    return matchesAdminSettingQuery(
        query,
        settingKey,
        currentSetting,
        categoryKey,
        categoryName,
        title,
        description,
        extra,
    );
}

function SettingFieldRow({
    settingKey,
    currentSetting,
    onSettingChange,
    t,
    switchBooleans = false,
}: {
    settingKey: string;
    currentSetting: Setting;
    onSettingChange: (key: string, value: string | number | boolean) => void;
    t: (key: string) => string;
    /** Render true/false selects as switches (value stays the string 'true' / 'false'). */
    switchBooleans?: boolean;
}) {
    const labelKey = `admin.settings.fields.${settingKey}.label`;
    const descriptionKey = `admin.settings.fields.${settingKey}.description`;

    const translatedLabel = t(labelKey);
    const translatedDescription = t(descriptionKey);

    const rawName = translatedLabel !== labelKey ? translatedLabel : formatSettingName(currentSetting.name, settingKey);
    const formattedName = switchBooleans ? rawName.replace(/^Vds\s+/i, '') : rawName;
    const isBoolSelect =
        switchBooleans &&
        currentSetting.type === 'select' &&
        currentSetting.options.length === 2 &&
        currentSetting.options.includes('true') &&
        currentSetting.options.includes('false');
    const description = translatedDescription !== descriptionKey ? translatedDescription : currentSetting.description;

    if (
        settingKey === 'telemetry' ||
        currentSetting.type === 'toggle' ||
        (currentSetting.type as string) === 'boolean' ||
        isBoolSelect
    ) {
        return (
            <div className='fp-surface-inset hover:border-primary/25 flex flex-row items-center justify-between gap-4 rounded-xl border p-4 transition-colors'>
                <div className='min-w-0 space-y-0.5 pr-2'>
                    <Label htmlFor={settingKey} className='text-base font-medium'>
                        {formattedName}
                    </Label>
                    <p className='text-muted-foreground max-w-[min(100%,42rem)] text-sm'>{description}</p>
                </div>
                <Switch
                    id={settingKey}
                    checked={
                        currentSetting.value === true || currentSetting.value === 'true' || currentSetting.value === 1
                    }
                    onCheckedChange={(checked: boolean) =>
                        onSettingChange(
                            settingKey,
                            settingKey === 'telemetry' || isBoolSelect ? String(checked) : checked,
                        )
                    }
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
                    className='min-h-30'
                />
                <p className='text-muted-foreground text-sm'>{description}</p>
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
                        const optKey = `admin.settings.fields.${settingKey}.options.${opt}`;
                        const translated = t(optKey);
                        let label: string;
                        if (translated !== optKey) {
                            label = translated;
                        } else if (opt === 'true') {
                            label = t('common.enabled');
                        } else if (opt === 'false') {
                            label = t('common.disabled');
                        } else if (opt === 'hard_limit') {
                            label = t('admin.settings.optionLabels.hardLimit');
                        } else if (opt === 'fifo_rolling') {
                            label = t('admin.settings.optionLabels.fifoRolling');
                        } else {
                            label = opt;
                        }
                        return (
                            <option key={opt} value={opt} className='bg-card text-foreground'>
                                {label}
                            </option>
                        );
                    })}
                </Select>
                <p className='text-muted-foreground text-sm'>{description}</p>
            </div>
        );
    }

    if (
        settingKey === 'app_logo_white' ||
        settingKey === 'app_logo_dark' ||
        settingKey === 'app_background_image_url' ||
        (currentSetting as { type?: string }).type === 'image'
    ) {
        return (
            <ImageAttachmentField
                id={settingKey}
                label={formattedName}
                description={description}
                value={String(currentSetting.value ?? '')}
                onChange={(url) => onSettingChange(settingKey, url)}
                placeholder={currentSetting.placeholder}
            />
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
            <p className='text-muted-foreground text-sm'>{description}</p>
        </div>
    );
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const isDemo = useDemoMode();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingTestEmail, setSendingTestEmail] = useState(false);
    const [testingStorage, setTestingStorage] = useState(false);
    const [organizedSettings, setOrganizedSettings] = useState<OrganizedSettings | null>(null);
    const [settings, setSettings] = useState<Record<string, Setting>>({});
    const [initialSettings, setInitialSettings] = useState<Record<string, Setting>>({});
    const [settingsSearch, setSettingsSearch] = useState('');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get('category');
    const urlSearchQuery = searchParams.get('q') ?? searchParams.get('search') ?? '';

    const [showLogDialog, setShowLogDialog] = useState(false);
    const [uploadedLogs, setUploadedLogs] = useState<{
        web: LogData;
        app: LogData;
        runner?: LogData;
        mail?: LogData;
    } | null>(null);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-settings');

    const searchTrimmed = settingsSearch.trim();

    const categoryMatchCounts = useMemo(() => {
        if (!organizedSettings) return {} as Record<string, number>;
        const counts: Record<string, number> = {};
        for (const [catKey, data] of Object.entries(organizedSettings)) {
            let n = 0;
            for (const [settingKey, setting] of Object.entries(data.settings)) {
                const currentSetting = settings[settingKey] || setting;
                if (matchesSettingsQuery(searchTrimmed, settingKey, currentSetting, catKey, data.category.name, t)) {
                    n += 1;
                }
            }
            counts[catKey] = n;
        }
        return counts;
    }, [organizedSettings, settings, searchTrimmed, t]);

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

    useEffect(() => {
        if (urlSearchQuery) {
            setSettingsSearch(urlSearchQuery);
        }
    }, [urlSearchQuery]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const raw = window.localStorage.getItem(UPDATE_PROGRESS_STORAGE_KEY);
        if (!raw) return;
        const startedAt = Number(raw);
        if (Number.isFinite(startedAt) && Date.now() - startedAt <= UPDATE_PROGRESS_TTL_MS) {
            return;
        }
        window.localStorage.removeItem(UPDATE_PROGRESS_STORAGE_KEY);
    }, []);

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
                    toast.error(getApiErrorMessageFromPayload(response, t, 'admin.settings.messages.load_failed'));
                }
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'admin.settings.messages.load_failed'));
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
                if (matchesSettingsQuery(searchTrimmed, settingKey, currentSetting, catKey, data.category.name, t)) {
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
    }, [organizedSettings, categoryKeys, settings, searchTrimmed, urlCategory, pathname, router, t]);

    const handleSettingChange = (key: string, value: string | number | boolean) => {
        if (key === 'mail_provider_preset') {
            const next: Record<string, string> = {};
            applyMailProviderPreset(String(value), (k, v) => {
                next[k] = v;
            });
            setSettings((prev) => {
                const updated = { ...prev };
                for (const [k, v] of Object.entries(next)) {
                    if (!updated[k]) continue;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    updated[k] = { ...updated[k], value: v as any };
                }
                return updated;
            });
            return;
        }

        if (key === 'mail_api_region') {
            const region = String(value).trim();
            const presetId = String(settings.mail_provider_preset?.value ?? '');
            setSettings((prev) => {
                const updated: typeof prev = {
                    ...prev,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    [key]: { ...prev[key], value: value as any },
                };
                if (presetId === 'ses_smtp' && region && updated.smtp_host) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    updated.smtp_host = { ...updated.smtp_host, value: `email-smtp.${region}.amazonaws.com` as any };
                }
                return updated;
            });
            return;
        }

        setSettings((prev) => ({
            ...prev,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [key]: { ...prev[key], value: value as any },
        }));
    };

    const dirtyKeys = new Set(
        Object.entries(settings)
            .filter(([key, setting]) => {
                const initial = initialSettings[key];
                return Boolean(initial) && String(initial.value) !== String(setting.value);
            })
            .map(([key]) => key),
    );
    const unsaved = dirtyKeys.size > 0;

    const handleDiscard = () => {
        setSettings(JSON.parse(JSON.stringify(initialSettings)));
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
                toast.success(t('admin.settings.messages.save_success'));

                setInitialSettings(JSON.parse(JSON.stringify(settings)));
                if ('telemetry' in payload) window.location.reload();
            } else {
                toast.error(getApiErrorMessageFromPayload(response, t, 'admin.settings.messages.save_failed'));
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin.settings.messages.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    const handleUploadLogs = async () => {
        const promise = adminSettingsApi.uploadLogs().then((data) => {
            if (!data.success || !data.data) {
                throw new Error(getApiErrorMessageFromPayload(data, t, 'admin.settings.logs.upload_failed'));
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

    const handleTestBackupStorage = async () => {
        setTestingStorage(true);
        try {
            const response = await axios.post('/api/admin/settings/backup-storage/test');
            if (response.data.success) {
                toast.success(t('admin.settings.storage_test.success'));
            } else {
                toast.error(getApiErrorMessageFromPayload(response.data, t, 'admin.settings.storage_test.failed'));
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, t, 'admin.settings.storage_test.failed'));
        } finally {
            setTestingStorage(false);
        }
    };

    const handleSendTestEmail = async () => {
        setSendingTestEmail(true);
        try {
            const response = await axios.post('/api/admin/settings/email/test');
            if (response.data.success) {
                toast.success(t('admin.settings.email_test.success'));
            } else {
                toast.error(getApiErrorMessageFromPayload(response.data, t, 'admin.settings.email_test.failed_short'));
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, t, 'admin.settings.email_test.failed'));
        } finally {
            setSendingTestEmail(false);
        }
    };

    const getIconForCategory = (category: string) => {
        switch (category.toLowerCase()) {
            case 'general':
            case 'app':
                return Settings;
            case 'links':
                return Link2;
            case 'auth_page':
            case 'auth':
                return Lock;
            case 'mail':
                return Mail;
            case 'security':
                return Shield;
            case 'database':
            case 'backup_storage':
                return Database;
            case 'server':
            case 'servers':
            case 'vds':
                return Server;
            case 'seo':
                return Search;
            case 'pwa':
                return Smartphone;
            case 'modules':
                return Boxes;
            case 'advanced':
                return Globe;
            default:
                return Settings;
        }
    };

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center gap-4 p-16'>
                <Loader2 className='text-primary h-10 w-10 animate-spin' />
                <p className='text-muted-foreground text-sm'>{t('admin.settings.title')}…</p>
            </div>
        );
    }

    if (!organizedSettings) {
        return <div className='text-muted-foreground p-8 text-center'>{t('admin.settings.no_settings')}</div>;
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
                        <Button
                            variant='outline'
                            className='shrink-0'
                            disabled={isDemo}
                            onClick={async () => {
                                try {
                                    await reopenSetup();
                                    router.push('/setup');
                                } catch (error) {
                                    toast.error(getApiErrorMessage(error, t, 'setup_wizard.errors.save'));
                                }
                            }}
                        >
                            <Rocket className='mr-2 h-4 w-4' />
                            {t('setup_wizard.rerun')}
                        </Button>
                        <Button variant='outline' onClick={handleUploadLogs} className='shrink-0' disabled={isDemo}>
                            <UploadCloud className='mr-2 h-4 w-4' />
                            {t('admin.settings.actions.upload_logs')}
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className='shrink-0' data-fp-save-shortcut>
                            {saving ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Save className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.settings.actions.save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-settings', 'after-header')} />

            <div className='fp-surface relative rounded-2xl border p-1.5'>
                <Search
                    className='text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2'
                    aria-hidden
                />
                <Input
                    type='search'
                    value={settingsSearch}
                    onChange={(e) => setSettingsSearch(e.target.value)}
                    placeholder={t('admin.settings.search_placeholder')}
                    className='h-11 w-full border-0 bg-transparent pr-11 pl-11 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0'
                    aria-label={t('admin.settings.search_placeholder')}
                />
                {settingsSearch ? (
                    <button
                        type='button'
                        onClick={() => setSettingsSearch('')}
                        className='text-muted-foreground hover:bg-muted hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 transition-colors'
                        title={t('admin.settings.search_clear')}
                    >
                        <X className='h-4 w-4' />
                    </button>
                ) : null}
            </div>

            <div className='block overflow-visible'>
                <Tabs
                    value={activeTab || categoryKeys[0]}
                    onValueChange={handleCategoryChange}
                    orientation='vertical'
                    className='flex w-full flex-col gap-6 lg:flex-row lg:gap-8'
                >
                    <aside className='flex min-h-0 w-full shrink-0 flex-col gap-3 lg:sticky lg:top-24 lg:w-72 lg:self-start'>
                        <label className='sm:hidden'>
                            <span className='sr-only'>{t('admin.settings.category_select')}</span>
                            <select
                                value={activeTab || categoryKeys[0]}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className='fp-surface focus-visible:ring-ring h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2'
                            >
                                {Object.entries(organizedSettings).map(([key, data]) => (
                                    <option key={key} value={key}>
                                        {data.category.name}
                                        {searchTrimmed
                                            ? ` (${categoryMatchCounts[key] ?? 0}/${Object.keys(data.settings).length})`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <ScrollableTabsList
                            wrapperClassName='hidden sm:block'
                            className='fp-surface flex h-auto w-full flex-row gap-1 rounded-2xl border p-2 lg:max-h-[calc(100vh-12rem)] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto'
                        >
                            {Object.entries(organizedSettings).map(([key, data]) => {
                                const Icon = getIconForCategory(key);
                                const matchCount = categoryMatchCounts[key] ?? 0;
                                const total = Object.keys(data.settings).length;
                                const showCount = Boolean(searchTrimmed);

                                return (
                                    <TabsTrigger
                                        key={key}
                                        value={key}
                                        className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/10 h-auto w-auto shrink-0 justify-start rounded-xl border border-transparent px-3 py-2.5 text-sm font-normal whitespace-nowrap transition-all data-[state=active]:font-medium lg:w-full lg:shrink'
                                    >
                                        <Icon className='mr-2 h-4 w-4 shrink-0 opacity-80' />
                                        <span className='min-w-0 flex-1 truncate text-left'>{data.category.name}</span>
                                        {Object.keys(data.settings).some((k) => dirtyKeys.has(k)) && (
                                            <span
                                                className='ml-2 h-2 w-2 shrink-0 rounded-full bg-amber-500'
                                                title={t('admin.settings.sections.unsaved')}
                                            >
                                                <span className='sr-only'>{t('admin.settings.sections.unsaved')}</span>
                                            </span>
                                        )}
                                        {showCount ? (
                                            <span
                                                className={cn(
                                                    'ml-2 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase tabular-nums',
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
                        </ScrollableTabsList>
                    </aside>

                    <div className='min-w-0 flex-1 space-y-6'>
                        {Object.entries(organizedSettings).map(([key, data]) => {
                            const mailTransport = String(settings.mail_transport?.value ?? 'smtp');
                            const mailPresetId = String(settings.mail_provider_preset?.value ?? 'custom');
                            const filteredEntries = Object.entries(data.settings).filter(([settingKey, setting]) => {
                                if (
                                    key === 'email' &&
                                    !shouldShowMailSetting(settingKey, mailTransport, mailPresetId)
                                ) {
                                    return false;
                                }
                                const currentSetting = settings[settingKey] || setting;
                                return matchesSettingsQuery(
                                    searchTrimmed,
                                    settingKey,
                                    currentSetting,
                                    key,
                                    data.category.name,
                                    t,
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
                                                    <p className='text-muted-foreground text-sm'>
                                                        {t('admin.settings.search_try_other')}
                                                    </p>
                                                ) : (
                                                    <span />
                                                )}
                                                <Button
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    className='shrink-0'
                                                    data-fp-save-shortcut
                                                >
                                                    {saving ? (
                                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                    ) : (
                                                        <Save className='mr-2 h-4 w-4' />
                                                    )}
                                                    {t('admin.settings.actions.save')}
                                                </Button>
                                            </div>
                                        }
                                    >
                                        {!anySearchMatch ? (
                                            <div className='flex flex-col items-center justify-center gap-2 px-4 py-16 text-center'>
                                                <div className='bg-muted/50 rounded-full p-4'>
                                                    <Search className='text-muted-foreground h-8 w-8' />
                                                </div>
                                                <p className='text-foreground text-base font-medium'>
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
                                            <div className='flex flex-col items-center justify-center gap-2 px-4 py-14 text-center'>
                                                <p className='text-muted-foreground text-sm'>
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
                                                {key === 'backup_storage' && (
                                                    <div className='border-border/50 rounded-2xl border p-6'>
                                                        <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
                                                            <div className='space-y-1'>
                                                                <h3 className='text-foreground flex items-center gap-2 text-base font-semibold'>
                                                                    <Database className='text-primary h-5 w-5' />
                                                                    {t('admin.settings.storage_test.title')}
                                                                </h3>
                                                                <p className='text-muted-foreground max-w-xl text-sm'>
                                                                    {t('admin.settings.storage_test.description')}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                onClick={handleTestBackupStorage}
                                                                disabled={testingStorage}
                                                                className='w-full shrink-0 sm:w-auto'
                                                            >
                                                                {testingStorage ? (
                                                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                                ) : (
                                                                    <Send className='mr-2 h-4 w-4' />
                                                                )}
                                                                {testingStorage
                                                                    ? t('admin.settings.storage_test.testing')
                                                                    : t('admin.settings.storage_test.button')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                {key === 'email' && (
                                                    <div className='space-y-4'>
                                                        <EmailProviderHint
                                                            presetId={String(
                                                                settings.mail_provider_preset?.value ?? 'custom',
                                                            )}
                                                            t={t}
                                                        />
                                                        <div className='border-border/50 rounded-2xl border p-6'>
                                                            <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
                                                                <div className='space-y-1'>
                                                                    <h3 className='text-foreground flex items-center gap-2 text-base font-semibold'>
                                                                        <Mail className='text-primary h-5 w-5' />
                                                                        {t('admin.settings.email_test.title')}
                                                                    </h3>
                                                                    <p className='text-muted-foreground max-w-xl text-sm'>
                                                                        {t('admin.settings.email_test.description')}
                                                                    </p>
                                                                </div>
                                                                <Button
                                                                    onClick={handleSendTestEmail}
                                                                    disabled={sendingTestEmail}
                                                                    variant='default'
                                                                    className='w-full shrink-0 sm:w-auto'
                                                                >
                                                                    {sendingTestEmail ? (
                                                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                                                    ) : (
                                                                        <Send className='mr-2 h-4 w-4' />
                                                                    )}
                                                                    {sendingTestEmail
                                                                        ? t('admin.settings.email_test.sending')
                                                                        : t('admin.settings.email_test.button')}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className='rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4'>
                                                            <p className='font-mono text-xs text-amber-900 dark:text-amber-200'>
                                                                <strong className='font-semibold'>
                                                                    {t('ui.admin.settings.troubleshooting')}
                                                                </strong>{' '}
                                                                {t('admin.settings.email_test.troubleshooting')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {key === 'vds' ? (
                                                    <VdsSettingsSections
                                                        entries={filteredEntries}
                                                        settings={settings}
                                                        searching={searchTrimmed !== ''}
                                                        renderField={(settingKey, currentSetting) => (
                                                            <div
                                                                className={cn(
                                                                    'fp-setting-row',
                                                                    dirtyKeys.has(settingKey) && 'fp-setting-dirty',
                                                                )}
                                                            >
                                                                <SettingFieldRow
                                                                    settingKey={settingKey}
                                                                    currentSetting={currentSetting}
                                                                    onSettingChange={handleSettingChange}
                                                                    t={t}
                                                                    switchBooleans
                                                                />
                                                            </div>
                                                        )}
                                                    />
                                                ) : (
                                                    (() => {
                                                        const renderRow = ([
                                                            settingKey,
                                                            setting,
                                                        ]: (typeof filteredEntries)[number]) => {
                                                            const currentSetting = settings[settingKey] || setting;
                                                            return (
                                                                <div
                                                                    key={settingKey}
                                                                    className={cn(
                                                                        'fp-setting-row',
                                                                        dirtyKeys.has(settingKey) && 'fp-setting-dirty',
                                                                    )}
                                                                >
                                                                    <SettingFieldRow
                                                                        settingKey={settingKey}
                                                                        currentSetting={currentSetting}
                                                                        onSettingChange={handleSettingChange}
                                                                        t={t}
                                                                    />
                                                                </div>
                                                            );
                                                        };
                                                        const isSwitch = ([
                                                            settingKey,
                                                            setting,
                                                        ]: (typeof filteredEntries)[number]) => {
                                                            const s = settings[settingKey] || setting;
                                                            return (
                                                                settingKey === 'telemetry' ||
                                                                s.type === 'toggle' ||
                                                                (s.type as string) === 'boolean'
                                                            );
                                                        };
                                                        const fields = filteredEntries.filter((e) => !isSwitch(e));
                                                        const switches = filteredEntries.filter(isSwitch);
                                                        if (!fields.length || !switches.length) {
                                                            return filteredEntries.map(renderRow);
                                                        }
                                                        return (
                                                            <>
                                                                <section className='fp-settings-section space-y-4'>
                                                                    <h3 className='fp-settings-section-title'>
                                                                        {t('admin.settings.sections.values')}
                                                                    </h3>
                                                                    {fields.map(renderRow)}
                                                                </section>
                                                                <section className='fp-settings-section space-y-3'>
                                                                    <h3 className='fp-settings-section-title'>
                                                                        {t('admin.settings.sections.switches')}
                                                                    </h3>
                                                                    {switches.map(renderRow)}
                                                                </section>
                                                            </>
                                                        );
                                                    })()
                                                )}
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
                                    <p className='text-destructive text-sm'>
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
                                    <p className='text-destructive text-sm'>
                                        {uploadedLogs.app.error || t('admin.settings.logs.upload_failed_generic')}
                                    </p>
                                )}
                            </div>
                            {uploadedLogs.runner && (
                                <div className='space-y-2'>
                                    <Label>{t('admin.settings.logs.runner_logs')}</Label>
                                    {uploadedLogs.runner.success && uploadedLogs.runner.url ? (
                                        <div className='flex gap-2'>
                                            <Input value={uploadedLogs.runner.url} readOnly />
                                            <Button
                                                size='icon'
                                                variant='outline'
                                                onClick={() => {
                                                    if (uploadedLogs.runner!.url) {
                                                        copyToClipboard(uploadedLogs.runner!.url);
                                                    }
                                                }}
                                            >
                                                <Copy className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className='text-destructive text-sm'>
                                            {uploadedLogs.runner.error ||
                                                t('admin.settings.logs.upload_failed_generic')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AdminPageTips page='settings' />

            <WidgetRenderer widgets={getWidgets('admin-settings', 'bottom-of-page')} />

            <UnsavedChangesBar
                dirty={unsaved}
                onSave={() => void handleSave()}
                onDiscard={handleDiscard}
                saving={saving}
            />
        </div>
    );
}
