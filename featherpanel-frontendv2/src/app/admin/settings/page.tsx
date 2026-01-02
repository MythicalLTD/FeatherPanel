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

import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { Settings, Mail, Shield, Database, Server, Globe, Save, UploadCloud, Loader2, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';

interface LogData {
    success: boolean;
    id: string;
    url: string;
    raw: string;
}

export default function SettingsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organizedSettings, setOrganizedSettings] = useState<OrganizedSettings | null>(null);
    const [settings, setSettings] = useState<Record<string, Setting>>({});
    const [activeTab, setActiveTab] = useState<string>('general');

    // Log Upload State
    const [showLogDialog, setShowLogDialog] = useState(false);
    const [uploadedLogs, setUploadedLogs] = useState<{ web: LogData; app: LogData } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const response = await adminSettingsApi.fetchSettings();
                if (response.success) {
                    setOrganizedSettings(response.data.organized_settings);
                    setSettings(response.data.settings);
                    // Set first tab as active if available
                    const categories = Object.keys(response.data.organized_settings);
                    if (categories.length > 0) {
                        setActiveTab(categories[0]);
                    }
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
            // Prepare payload: only send values
            const payload = Object.entries(settings).reduce(
                (acc, [key, setting]) => {
                    acc[key] = setting.value;
                    return acc;
                },
                {} as Record<string, string | number | boolean>,
            );

            const response = await adminSettingsApi.updateSettings(payload);
            if (response.success) {
                toast.success(response.message || t('admin.settings.messages.save_success'));
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
        const promise = adminSettingsApi.uploadLogs();
        toast.promise(promise, {
            loading: t('admin.settings.logs.uploading'),
            success: (data) => {
                if (data.success && data.data) {
                    setUploadedLogs(data.data);
                    setShowLogDialog(true);
                    return t('admin.settings.messages.save_success');
                }
                return t('admin.settings.logs.upload_failed');
            },
            error: t('admin.settings.logs.upload_failed'),
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

            <div className='block'>
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
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
                                                            className='min-h-[100px] bg-white/5 border-white/5 focus:border-primary/50 transition-colors rounded-xl'
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
                                                            className='flex h-12 w-full rounded-xl border border-white/5 bg-white/5 px-5 py-2 text-base shadow-sm backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 font-semibold'
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
                                <div className='flex gap-2'>
                                    <Input value={uploadedLogs.web.url} readOnly />
                                    <Button
                                        size='icon'
                                        variant='outline'
                                        onClick={() => copyToClipboard(uploadedLogs.web.url)}
                                    >
                                        <Copy className='h-4 w-4' />
                                    </Button>
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label>System Logs (App)</Label>
                                <div className='flex gap-2'>
                                    <Input value={uploadedLogs.app.url} readOnly />
                                    <Button
                                        size='icon'
                                        variant='outline'
                                        onClick={() => copyToClipboard(uploadedLogs.app.url)}
                                    >
                                        <Copy className='h-4 w-4' />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
