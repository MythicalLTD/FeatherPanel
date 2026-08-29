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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { PageCard } from '@/components/featherui/PageCard';
import { Select } from '@/components/ui/select-native';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, LayoutTemplate, Container, Terminal, FileCode, Clock } from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import {
    WEBPLATE_RUNTIMES,
    emptyWebPlateForm,
    inferRuntimeFromDockerImage,
    webPlateFormPayload,
    type WebPlateFormState,
    type WebPlateRuntime,
} from '../types';
import { WebPlateDefaultSchedulesEditor } from '@/components/webspace/WebPlateDefaultSchedulesEditor';
import type { WebSpaceScheduleDraft } from '@/lib/webspace-schedules';

export default function CreateWebPlatePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-webplates-create');
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [form, setForm] = useState<WebPlateFormState>(emptyWebPlateForm);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const runtimeLabel = (value: string) => {
        const key = `admin.webPlates.runtimes.${value}`;
        const translated = t(key);
        return translated === key ? value : translated;
    };

    const handleCreate = async () => {
        if (!form.name.trim()) {
            toast.error(t('admin.webPlates.messages.name_required'));
            return;
        }

        setSaving(true);
        try {
            await axios.put('/api/admin/webplates', webPlateFormPayload(form));
            toast.success(t('admin.webPlates.messages.created'));
            router.push('/admin/webplates');
        } catch (error) {
            console.error(error);
            let msg = t('admin.webPlates.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const setField = <K extends keyof WebPlateFormState>(key: K, value: WebPlateFormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const setDockerImage = (value: string) => {
        setForm((prev) => ({
            ...prev,
            docker_image: value,
            runtime: inferRuntimeFromDockerImage(value),
        }));
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-webplates-create', 'top-of-page')} />

            <PageHeader
                title={t('admin.webPlates.form.create_title')}
                description={t('admin.webPlates.form.create_description')}
                icon={LayoutTemplate}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' onClick={() => router.push('/admin/webplates')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        <Button onClick={handleCreate} loading={saving}>
                            {t('admin.webPlates.form.submit_create')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-webplates-create', 'after-header')} />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className='grid w-full grid-cols-4'>
                    <TabsTrigger value='general'>{t('admin.webPlates.form.basic')}</TabsTrigger>
                    <TabsTrigger value='runtime'>{t('admin.webPlates.form.runtime_section')}</TabsTrigger>
                    <TabsTrigger value='install'>{t('admin.webPlates.form.install_section')}</TabsTrigger>
                    <TabsTrigger value='schedules'>{t('admin.webPlates.form.schedules_section')}</TabsTrigger>
                </TabsList>

                <TabsContent value='general' className='space-y-4'>
                    <PageCard title={t('admin.webPlates.form.basic')} icon={LayoutTemplate}>
                        <div className='space-y-4'>
                            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.webPlates.form.name')} *</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setField('name', e.target.value)}
                                        placeholder={t('admin.webPlates.form.name_placeholder')}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.webPlates.form.author')}</Label>
                                    <Input value={form.author} onChange={(e) => setField('author', e.target.value)} />
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.webPlates.form.description')}</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setField('description', e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='runtime' className='space-y-4'>
                    <PageCard title={t('admin.webPlates.form.runtime_section')} icon={Container}>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.webPlates.form.docker_image')}</Label>
                                <Input
                                    value={form.docker_image}
                                    onChange={(e) => setDockerImage(e.target.value)}
                                    placeholder='php:8.3-fpm'
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.webPlates.form.docker_image_help')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.webPlates.form.runtime')}</Label>
                                <Select
                                    value={form.runtime}
                                    onChange={(e) => setField('runtime', e.target.value as WebPlateRuntime)}
                                    disabled={!form.docker_image.trim()}
                                >
                                    {WEBPLATE_RUNTIMES.map((r) => (
                                        <option key={r} value={r}>
                                            {runtimeLabel(r)}
                                        </option>
                                    ))}
                                </Select>
                                <p className='text-muted-foreground text-xs'>
                                    {form.docker_image.trim()
                                        ? t('admin.webPlates.form.runtime_auto_help')
                                        : t('admin.webPlates.form.runtime_static_help')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.webPlates.form.document_root')}</Label>
                                <Input
                                    value={form.document_root}
                                    onChange={(e) => setField('document_root', e.target.value)}
                                    placeholder={t('admin.webPlates.form.document_root_placeholder')}
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.webPlates.form.document_root_help')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.webPlates.form.startup')}</Label>
                                <Input
                                    value={form.startup}
                                    onChange={(e) => setField('startup', e.target.value)}
                                    placeholder='node server.js'
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.webPlates.form.startup_help')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.webPlates.form.container_port')}</Label>
                                <Input
                                    type='number'
                                    min={0}
                                    value={form.container_port}
                                    onChange={(e) => setField('container_port', e.target.value)}
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.webPlates.form.container_port_help')}
                                </p>
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='install' className='space-y-4'>
                    <PageCard title={t('admin.webPlates.form.install_section')} icon={Terminal}>
                        <div className='space-y-4'>
                            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.webPlates.form.script_container')}</Label>
                                    <Input
                                        value={form.script_container}
                                        onChange={(e) => setField('script_container', e.target.value)}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.webPlates.form.script_entry')}</Label>
                                    <Input
                                        value={form.script_entry}
                                        onChange={(e) => setField('script_entry', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label className='flex items-center gap-2'>
                                    <FileCode className='h-4 w-4' />
                                    {t('admin.webPlates.form.script_install')}
                                </Label>
                                <Textarea
                                    value={form.script_install}
                                    onChange={(e) => setField('script_install', e.target.value)}
                                    rows={12}
                                    className='font-mono text-sm'
                                    placeholder={'#!/bin/ash\necho "Installing…"'}
                                />
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='schedules' className='space-y-4'>
                    <PageCard title={t('admin.webPlates.form.schedules_section')} icon={Clock}>
                        <WebPlateDefaultSchedulesEditor
                            schedules={form.default_schedules as WebSpaceScheduleDraft[]}
                            onChange={(schedules) => setField('default_schedules', schedules)}
                            disabled={saving}
                        />
                    </PageCard>
                </TabsContent>
            </Tabs>

            <WidgetRenderer widgets={getWidgets('admin-webplates-create', 'bottom-of-page')} />
        </div>
    );
}
