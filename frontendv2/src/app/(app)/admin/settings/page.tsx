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
import { Settings, Mail, Shield, Database, Server, Globe, Save, UploadCloud, Loader2, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

interface LogData {
    success: boolean;
    id?: string;
    url?: string;
    raw?: string;
    error?: string;
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organizedSettings, setOrganizedSettings] = useState<OrganizedSettings | null>(null);
    const [settings, setSettings] = useState<Record<string, Setting>>({});
    const [initialSettings, setInitialSettings] = useState<Record<string, Setting>>({});
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get('category');
    const [activeTab, setActiveTab] = useState<string>(urlCategory || 'general');

    const [showLogDialog, setShowLogDialog] = useState(false);
    const [uploadedLogs, setUploadedLogs] = useState<{ web: LogData; app: LogData } | null>(null);

    // Plugin Widgets
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-settings');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    // Update active tab when URL changes
    useEffect(() => {
        if (urlCategory && urlCategory !== activeTab) {
            setActiveTab(urlCategory);
        }
    }, [urlCategory, activeTab]);

    const handleCategoryChange = useCallback(
        (newTab: string) => {
            setActiveTab(newTab);
            const params = new URLSearchParams(searchParams.toString());
            params.set('category', newTab);
            router.push(`${pathname}?${params.toString()}`);
        },
        [pathname, router, searchParams]
    );

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const response = await adminSettingsApi.fetchSettings();
                if (response.success) {
                    setOrganizedSettings(response.data.organized_settings);
                    setSettings(response.data.settings);
                    // Store initial settings deep copy to compare later
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

    // Validate and set default category when settings load or URL changes
    useEffect(() => {
        if (organizedSettings) {
            const categories = Object.keys(organizedSettings);
            if (categories.length > 0) {
                if (!urlCategory || !categories.includes(urlCategory)) {
                    // Update to the first category if none or invalid
                    handleCategoryChange(categories[0]);
                }
            }
        }
    }, [organizedSettings, urlCategory, handleCategoryChange]);

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
            // Prepare payload: only send changed values
            const payload: Record<string, string | number | boolean> = {};

            Object.entries(settings).forEach(([key, setting]) => {
                const initial = initialSettings[key];
                // Compare as strings to handle potential type mismatches (e.g. "1" vs 1, "true" vs true)
                // which can happen between backend response and form state
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
                // Update initial settings to current state after successful save
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
            // If the API returns success: false, throw an error to trigger the error handler
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

    const formatSettingName = (name: string, key: string) => {
        // If name looks like a key (snake_case), format it. Otherwise use name but ensure Title Case.
        const textToFormat = name || key;
        return textToFormat
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
        );
    }

    if (!organizedSettings) {
        return <div className='p-8 text-center text-muted-foreground'>{t('admin.settings.no_settings')}</div>;
    }

    return (
        <div className='space-y-6'>
            {/* Plugin Widgets: Top of Page */}
            <WidgetRenderer widgets={getWidgets('admin-settings', 'top-of-page')} />

            <PageHeader
                title={t('admin.settings.title')}
                description={t('admin.settings.subtitle')}
                icon={Settings}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={handleUploadLogs}>
                            <UploadCloud className='w-4 h-4 mr-2' />
                            {t('admin.settings.actions.upload_logs')}
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
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

            {/* Plugin Widgets: After Header */}
            <WidgetRenderer widgets={getWidgets('admin-settings', 'after-header')} />

            <div className='block'>
                <Tabs
                    value={activeTab}
                    onValueChange={handleCategoryChange}
                    orientation='vertical'
                    className='w-full flex flex-col md:flex-row gap-6'
                >
                    <aside className='w-full md:w-64 shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0'>
                        <TabsList className='flex flex-row md:flex-col h-auto w-max md:w-full bg-card/30 border border-border/50 p-2 rounded-2xl gap-2 md:gap-1'>
                            {Object.entries(organizedSettings).map(([key, data]) => {
                                const Icon = getIconForCategory(key);
                                return (
                                    <TabsTrigger
                                        key={key}
                                        value={key}
                                        className='w-auto md:w-full justify-start px-4 py-3 h-auto text-sm md:text-base font-normal data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-medium transition-all rounded-xl border border-transparent data-[state=active]:border-primary/10 whitespace-nowrap'
                                    >
                                        <Icon className='w-4 h-4 mr-3' />
                                        {data.category.name}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </aside>

                    <div className='flex-1 space-y-6 min-w-0'>
                        {Object.entries(organizedSettings).map(([key, data]) => (
                            <TabsContent
                                key={key}
                                value={key}
                                className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                            >
                                <PageCard
                                    title={data.category.name}
                                    description={data.category.description}
                                    footer={
                                        <div className='flex justify-end'>
                                            <Button onClick={handleSave} disabled={saving}>
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
                                    <div className='space-y-6'>
                                        {Object.entries(data.settings).map(([settingKey, setting]) => {
                                            // Get the current value from state, fallback to initial if not found (should be there)
                                            const currentSetting = settings[settingKey] || setting;
                                            const formattedName = formatSettingName(currentSetting.name, settingKey);

                                            // Render based on type
                                            if (
                                                currentSetting.type === 'toggle' ||
                                                (currentSetting.type as string) === 'boolean'
                                            ) {
                                                return (
                                                    <div
                                                        key={settingKey}
                                                        className='flex flex-row items-center justify-between rounded-2xl border border-border/50 bg-card/30 p-4 transition-colors hover:bg-card/50'
                                                    >
                                                        <div className='space-y-0.5'>
                                                            <Label
                                                                htmlFor={settingKey}
                                                                className='text-base font-medium'
                                                            >
                                                                {formattedName}
                                                            </Label>
                                                            <p className='text-sm text-muted-foreground max-w-[80%]'>
                                                                {currentSetting.description}
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            id={settingKey}
                                                            checked={
                                                                currentSetting.value === true ||
                                                                currentSetting.value === 'true' ||
                                                                currentSetting.value === 1
                                                            }
                                                            onCheckedChange={(checked: boolean) =>
                                                                handleSettingChange(settingKey, checked)
                                                            }
                                                        />
                                                    </div>
                                                );
                                            }

                                            if (currentSetting.type === 'textarea') {
                                                return (
                                                    <div key={settingKey} className='space-y-3'>
                                                        <Label htmlFor={settingKey} className='text-base font-medium'>
                                                            {formattedName}
                                                        </Label>
                                                        <Textarea
                                                            id={settingKey}
                                                            value={currentSetting.value as string}
                                                            onChange={(e) =>
                                                                handleSettingChange(settingKey, e.target.value)
                                                            }
                                                            placeholder={currentSetting.placeholder}
                                                            className='min-h-[100px]'
                                                        />
                                                        <p className='text-sm text-muted-foreground'>
                                                            {currentSetting.description}
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            if (currentSetting.type === 'select') {
                                                return (
                                                    <div key={settingKey} className='space-y-3'>
                                                        <Label htmlFor={settingKey} className='text-base font-medium'>
                                                            {formattedName}
                                                        </Label>
                                                        <Select
                                                            id={settingKey}
                                                            value={currentSetting.value as string}
                                                            onChange={(e) =>
                                                                handleSettingChange(settingKey, e.target.value)
                                                            }
                                                        >
                                                            {currentSetting.options.map((opt) => {
                                                                let label = opt;
                                                                if (opt === 'true') label = 'Enabled';
                                                                if (opt === 'false') label = 'Disabled';
                                                                return (
                                                                    <option
                                                                        key={opt}
                                                                        value={opt}
                                                                        className='bg-card text-foreground'
                                                                    >
                                                                        {label}
                                                                    </option>
                                                                );
                                                            })}
                                                        </Select>
                                                        <p className='text-sm text-muted-foreground'>
                                                            {currentSetting.description}
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            // Default to Input (text, number, password, email)
                                            return (
                                                <div key={settingKey} className='space-y-3'>
                                                    <Label htmlFor={settingKey} className='text-base font-medium'>
                                                        {formattedName}
                                                    </Label>
                                                    <Input
                                                        id={settingKey}
                                                        type={currentSetting.type === 'password' ? 'password' : 'text'}
                                                        value={currentSetting.value as string}
                                                        onChange={(e) =>
                                                            handleSettingChange(settingKey, e.target.value)
                                                        }
                                                        placeholder={currentSetting.placeholder}
                                                    />
                                                    <p className='text-sm text-muted-foreground'>
                                                        {currentSetting.description}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </PageCard>
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </div>

            <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.settings.actions.upload_logs')}</DialogTitle>
                        <DialogDescription>
                            Logs have been successfully uploaded. You can share these URLs with support.
                        </DialogDescription>
                    </DialogHeader>
                    {uploadedLogs && (
                        <div className='space-y-4 pt-4'>
                            <div className='space-y-2'>
                                <Label>Panel Logs (Web)</Label>
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
                                        {uploadedLogs.web.error || 'Failed to upload web logs'}
                                    </p>
                                )}
                            </div>
                            <div className='space-y-2'>
                                <Label>System Logs (App)</Label>
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
                                        {uploadedLogs.app.error || 'Failed to upload app logs'}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Plugin Widgets: Bottom of Page */}
            <WidgetRenderer widgets={getWidgets('admin-settings', 'bottom-of-page')} />
        </div>
    );
}
