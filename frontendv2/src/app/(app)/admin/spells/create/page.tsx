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

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Sparkles, ArrowLeft, Trash2, Plus, Container, Zap, FileCode, Terminal } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';

interface Realm {
    id: number;
    name: string;
}

export default function CreateSpellPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const realmIdParam = searchParams?.get('realm_id');

    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [realms, setRealms] = useState<Realm[]>([]);

    const [form, setForm] = useState({
        name: '',
        author: '',
        description: '',
        realm_id: realmIdParam || '',
        update_url: '',
        banner: '',
        docker_images: '{}',
        script_container: '',
        script_entry: '',
        force_outgoing_ip: false,
        features: '[]',
        file_denylist: '[]',
        config_files: '{}',
        config_startup: '{}',
        config_logs: '{}',
        config_stop: '',
        script_install: '',
        script_is_privileged: false,
        startup: '',
    });

    const [dockerImages, setDockerImages] = useState<{ name: string; value: string }[]>([]);
    const [features, setFeatures] = useState<string[]>([]);

    useEffect(() => {
        const fetchRealms = async () => {
            try {
                const { data } = await axios.get('/api/admin/realms');
                setRealms(data.data.realms || []);
            } catch (error) {
                console.error('Error fetching realms:', error);
            }
        };
        fetchRealms();
    }, []);

    const handleCreate = async () => {
        if (!form.name || !form.realm_id) {
            toast.error('Name and Realm are required');
            return;
        }

        setSaving(true);
        try {
            const dockerImagesObj = dockerImages.reduce(
                (acc, img) => {
                    acc[img.name] = img.value;
                    return acc;
                },
                {} as Record<string, string>,
            );

            await axios.put('/api/admin/spells', {
                ...form,
                docker_images: JSON.stringify(dockerImagesObj),
                features: JSON.stringify(features),
            });

            toast.success(t('admin.spells.messages.created'));
            router.push('/admin/spells');
        } catch (error) {
            console.error('Error creating spell:', error);
            let msg = t('admin.spells.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const addDockerImage = () => {
        setDockerImages([...dockerImages, { name: '', value: '' }]);
    };

    const removeDockerImage = (index: number) => {
        setDockerImages(dockerImages.filter((_, i) => i !== index));
    };

    const updateDockerImage = (index: number, field: 'name' | 'value', value: string) => {
        const updated = [...dockerImages];
        updated[index][field] = value;
        setDockerImages(updated);
    };

    const addFeature = () => {
        setFeatures([...features, '']);
    };

    const removeFeature = (index: number) => {
        setFeatures(features.filter((_, i) => i !== index));
    };

    const updateFeature = (index: number, value: string) => {
        const updated = [...features];
        updated[index] = value;
        setFeatures(updated);
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.spells.form.create_title')}
                description={t('admin.spells.form.create_description')}
                icon={Sparkles}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' onClick={() => router.push('/admin/spells')}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            Back
                        </Button>
                        <Button onClick={handleCreate} loading={saving}>
                            {t('admin.spells.form.submit_create')}
                        </Button>
                    </div>
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className='grid w-full grid-cols-5'>
                    <TabsTrigger value='general'>{t('admin.spells.tabs.general')}</TabsTrigger>
                    <TabsTrigger value='docker'>{t('admin.spells.tabs.docker')}</TabsTrigger>
                    <TabsTrigger value='features'>{t('admin.spells.tabs.features')}</TabsTrigger>
                    <TabsTrigger value='config'>{t('admin.spells.tabs.config')}</TabsTrigger>
                    <TabsTrigger value='script'>{t('admin.spells.tabs.script')}</TabsTrigger>
                </TabsList>

                <TabsContent value='general' className='space-y-4'>
                    <PageCard title='Basic Information' icon={Sparkles}>
                        <div className='space-y-4'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.spells.form.name')} *</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.spells.form.realm')} *</Label>
                                    <Select
                                        value={form.realm_id}
                                        onChange={(e) => setForm({ ...form, realm_id: e.target.value })}
                                    >
                                        <option value=''>{t('admin.spells.form.realm_placeholder')}</option>
                                        {realms.map((realm) => (
                                            <option key={realm.id} value={realm.id}>
                                                {realm.name}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.author')}</Label>
                                <Input
                                    value={form.author}
                                    onChange={(e) => setForm({ ...form, author: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.description')}</Label>
                                <Textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.update_url')}</Label>
                                <Input
                                    value={form.update_url}
                                    onChange={(e) => setForm({ ...form, update_url: e.target.value })}
                                    placeholder='https://example.com/update'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.banner_url')}</Label>
                                <Input
                                    value={form.banner}
                                    onChange={(e) => setForm({ ...form, banner: e.target.value })}
                                    placeholder='https://example.com/banner.jpg'
                                />
                                {form.banner && (
                                    <div className='mt-2'>
                                        <div className='text-sm text-muted-foreground mb-1'>
                                            {t('admin.spells.form.banner_preview')}
                                        </div>
                                        <div
                                            className='w-full h-24 rounded-lg border border-border bg-cover bg-center bg-no-repeat'
                                            style={{ backgroundImage: `url(${form.banner})` }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='docker' className='space-y-4'>
                    <PageCard title='Docker Configuration' icon={Container}>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.docker_images')}</Label>
                                <div className='space-y-2'>
                                    {dockerImages.map((image, index) => (
                                        <div key={index} className='flex gap-2'>
                                            <Input
                                                value={image.name}
                                                onChange={(e) => updateDockerImage(index, 'name', e.target.value)}
                                                placeholder='Java 8'
                                                className='flex-1'
                                            />
                                            <Input
                                                value={image.value}
                                                onChange={(e) => updateDockerImage(index, 'value', e.target.value)}
                                                placeholder='ghcr.io/parkervcp/yolks:java_8'
                                                className='flex-1'
                                            />
                                            <Button
                                                type='button'
                                                size='sm'
                                                variant='destructive'
                                                onClick={() => removeDockerImage(index)}
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type='button' size='sm' variant='outline' onClick={addDockerImage}>
                                        <Plus className='h-4 w-4 mr-2' />
                                        {t('admin.spells.form.add_docker_image')}
                                    </Button>
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.spells.form.script_container')}</Label>
                                    <Input
                                        value={form.script_container}
                                        onChange={(e) => setForm({ ...form, script_container: e.target.value })}
                                        placeholder='alpine:3.4'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.spells.form.script_entry')}</Label>
                                    <Input
                                        value={form.script_entry}
                                        onChange={(e) => setForm({ ...form, script_entry: e.target.value })}
                                        placeholder='ash'
                                    />
                                </div>
                            </div>
                            <div className='flex items-center space-x-2'>
                                <Checkbox
                                    id='force-ip'
                                    checked={form.force_outgoing_ip}
                                    onCheckedChange={(checked) =>
                                        setForm({ ...form, force_outgoing_ip: checked as boolean })
                                    }
                                />
                                <label htmlFor='force-ip' className='text-sm font-medium cursor-pointer'>
                                    {t('admin.spells.form.force_outgoing_ip')}
                                </label>
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='features' className='space-y-4'>
                    <PageCard title='Server Features' icon={Zap}>
                        <div className='space-y-2'>
                            <Label>{t('admin.spells.form.features')}</Label>
                            <div className='space-y-2'>
                                {features.map((feature, index) => (
                                    <div key={index} className='flex gap-2'>
                                        <Input
                                            value={feature}
                                            onChange={(e) => updateFeature(index, e.target.value)}
                                            placeholder='eula'
                                            className='flex-1'
                                        />
                                        <Button
                                            type='button'
                                            size='sm'
                                            variant='destructive'
                                            onClick={() => removeFeature(index)}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                ))}
                                <Button type='button' size='sm' variant='outline' onClick={addFeature}>
                                    <Plus className='h-4 w-4 mr-2' />
                                    {t('admin.spells.form.add_feature')}
                                </Button>
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='config' className='space-y-4'>
                    <PageCard title='Server Configuration' icon={FileCode}>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.file_denylist')}</Label>
                                <Textarea
                                    value={form.file_denylist}
                                    onChange={(e) => setForm({ ...form, file_denylist: e.target.value })}
                                    placeholder='["file1", "file2"]'
                                    rows={3}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.config_files')}</Label>
                                <Textarea
                                    value={form.config_files}
                                    onChange={(e) => setForm({ ...form, config_files: e.target.value })}
                                    placeholder='{"file.properties": {...}}'
                                    rows={4}
                                />
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-2'>
                                    <Label>{t('admin.spells.form.config_startup')}</Label>
                                    <Textarea
                                        value={form.config_startup}
                                        onChange={(e) => setForm({ ...form, config_startup: e.target.value })}
                                        placeholder='{"done": "text"}'
                                        rows={3}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.spells.form.config_logs')}</Label>
                                    <Textarea
                                        value={form.config_logs}
                                        onChange={(e) => setForm({ ...form, config_logs: e.target.value })}
                                        placeholder='{}'
                                        rows={3}
                                    />
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.config_stop')}</Label>
                                <Input
                                    value={form.config_stop}
                                    onChange={(e) => setForm({ ...form, config_stop: e.target.value })}
                                    placeholder='stop'
                                />
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='script' className='space-y-4'>
                    <PageCard title='Installation & Startup Scripts' icon={Terminal}>
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.script_install')}</Label>
                                <Textarea
                                    value={form.script_install}
                                    onChange={(e) => setForm({ ...form, script_install: e.target.value })}
                                    placeholder='#!/bin/bash...'
                                    rows={8}
                                    className='font-mono text-sm'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.script_privilege')}</Label>
                                <Select
                                    value={form.script_is_privileged ? 'true' : 'false'}
                                    onChange={(e) =>
                                        setForm({ ...form, script_is_privileged: e.target.value === 'true' })
                                    }
                                >
                                    <option value='true'>{t('admin.spells.form.privileged')}</option>
                                    <option value='false'>{t('admin.spells.form.non_privileged')}</option>
                                </Select>
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.spells.form.script_privilege_help')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.spells.form.startup_command')}</Label>
                                <Textarea
                                    value={form.startup}
                                    onChange={(e) => setForm({ ...form, startup: e.target.value })}
                                    placeholder='java -jar server.jar'
                                    rows={3}
                                />
                            </div>
                        </div>
                    </PageCard>
                </TabsContent>
            </Tabs>
        </div>
    );
}
