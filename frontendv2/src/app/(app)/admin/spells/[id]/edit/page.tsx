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
import { useRouter, useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, ArrowLeft, Trash2, Plus, Pencil, Settings, Container, Zap, FileCode, Terminal } from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Variable {
    id: number;
    name: string;
    env_variable: string;
    description: string;
    default_value: string;
    field_type: string;
    rules?: string;
    user_viewable: string;
    user_editable: string;
}

export default function EditSpellPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const spellId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const [form, setForm] = useState({
        name: '',
        author: '',
        description: '',
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

    const [variables, setVariables] = useState<Variable[]>([]);
    const [addingVariable, setAddingVariable] = useState(false);
    const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
    const [variableForm, setVariableForm] = useState({
        name: '',
        env_variable: '',
        description: '',
        default_value: '',
        field_type: 'text',
        rules: '',
        user_viewable: 'true',
        user_editable: 'true',
    });
    const [confirmDeleteVariable, setConfirmDeleteVariable] = useState<number | null>(null);
    const [deletingVariable, setDeletingVariable] = useState(false);

    const [dockerImages, setDockerImages] = useState<{ name: string; value: string }[]>([]);
    const [features, setFeatures] = useState<string[]>([]);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-spells-edit');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const fetchSpell = async () => {
            try {
                const { data } = await axios.get(`/api/admin/spells/${spellId}`);
                const spell = data.data.spell;

                setForm({
                    name: spell.name || '',
                    author: spell.author || '',
                    description: spell.description || '',
                    update_url: spell.update_url || '',
                    banner: spell.banner || '',
                    docker_images: spell.docker_images || '{}',
                    script_container: spell.script_container || '',
                    script_entry: spell.script_entry || '',
                    force_outgoing_ip: spell.force_outgoing_ip || false,
                    features: spell.features || '[]',
                    file_denylist: spell.file_denylist || '[]',
                    config_files: spell.config_files || '{}',
                    config_startup: spell.config_startup || '{}',
                    config_logs: spell.config_logs || '{}',
                    config_stop: spell.config_stop || '',
                    script_install: spell.script_install || '',
                    script_is_privileged: spell.script_is_privileged || false,
                    startup: spell.startup || '',
                });

                try {
                    const dockerImagesData = spell.docker_images || '{}';
                    const images = JSON.parse(dockerImagesData);

                    setDockerImages(Object.entries(images).map(([name, value]) => ({ name, value: value as string })));
                } catch (e) {
                    console.error('Failed to parse docker images:', e);
                    setDockerImages([]);
                }

                try {
                    const featuresData = spell.features || '[]';
                    const parsedFeatures = JSON.parse(featuresData);
                    setFeatures(Array.isArray(parsedFeatures) ? parsedFeatures : []);
                } catch (e) {
                    console.error('Failed to parse features:', e);
                    setFeatures([]);
                }
            } catch (error) {
                console.error('Error fetching spell:', error);
                toast.error(t('admin.spells.messages.fetch_failed'));
                router.push('/admin/spells');
            } finally {
                setLoading(false);
            }
        };

        fetchSpell();
    }, [spellId, router, t]);

    useEffect(() => {
        const fetchVariables = async () => {
            try {
                const { data } = await axios.get(`/api/admin/spells/${spellId}/variables`);
                setVariables(data.data.variables || []);
            } catch (error) {
                console.error('Error fetching variables:', error);
            }
        };

        if (!loading) {
            fetchVariables();
        }
    }, [spellId, loading]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const dockerImagesObj = dockerImages.reduce(
                (acc, img) => {
                    acc[img.name] = img.value;
                    return acc;
                },
                {} as Record<string, string>,
            );

            await axios.patch(`/api/admin/spells/${spellId}`, {
                ...form,
                docker_images: JSON.stringify(dockerImagesObj),
                features: JSON.stringify(features),
            });

            toast.success(t('admin.spells.messages.updated'));
            router.push('/admin/spells');
        } catch (error) {
            console.error('Error updating spell:', error);
            let msg = t('admin.spells.messages.update_failed');
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

    const startAddVariable = () => {
        setVariableForm({
            name: '',
            env_variable: '',
            description: '',
            default_value: '',
            field_type: 'text',
            rules: '',
            user_viewable: 'true',
            user_editable: 'true',
        });
        setAddingVariable(true);
        setEditingVariable(null);
    };

    const startEditVariable = (variable: Variable) => {
        setVariableForm({
            name: variable.name,
            env_variable: variable.env_variable,
            description: variable.description,
            default_value: variable.default_value,
            field_type: variable.field_type,
            rules: variable.rules || '',
            user_viewable: variable.user_viewable,
            user_editable: variable.user_editable,
        });
        setEditingVariable(variable);
        setAddingVariable(false);
    };

    const cancelVariableEdit = () => {
        setAddingVariable(false);
        setEditingVariable(null);
        setVariableForm({
            name: '',
            env_variable: '',
            description: '',
            default_value: '',
            field_type: 'text',
            rules: '',
            user_viewable: 'true',
            user_editable: 'true',
        });
    };

    const submitVariable = async () => {
        try {
            if (editingVariable) {
                await axios.patch(`/api/admin/spell-variables/${editingVariable.id}`, variableForm);
                toast.success(t('admin.spells.messages.variable_updated'));
            } else {
                await axios.post(`/api/admin/spells/${spellId}/variables`, variableForm);
                toast.success(t('admin.spells.messages.variable_created'));
            }

            const { data } = await axios.get(`/api/admin/spells/${spellId}/variables`);
            setVariables(data.data.variables || []);
            cancelVariableEdit();
        } catch (error) {
            console.error('Error saving variable:', error);
            toast.error(
                editingVariable
                    ? t('admin.spells.messages.variable_update_failed')
                    : t('admin.spells.messages.variable_create_failed'),
            );
        }
    };

    const deleteVariable = async (variable: Variable) => {
        if (confirmDeleteVariable !== variable.id) {
            setConfirmDeleteVariable(variable.id);
            return;
        }

        setDeletingVariable(true);
        try {
            await axios.delete(`/api/admin/spell-variables/${variable.id}`);
            toast.success(t('admin.spells.messages.variable_deleted'));

            const { data } = await axios.get(`/api/admin/spells/${spellId}/variables`);
            setVariables(data.data.variables || []);
            setConfirmDeleteVariable(null);
        } catch (error) {
            console.error('Error deleting variable:', error);
            toast.error(t('admin.spells.messages.variable_delete_failed'));
        } finally {
            setDeletingVariable(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent'></div>
                    <span className='text-muted-foreground'>Loading spell...</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-spells-edit', 'top-of-page')} context={{ id: spellId }} />

            <PageHeader
                title={t('admin.spells.form.edit_title')}
                description={t('admin.spells.form.edit_description', { name: form.name })}
                icon={Sparkles}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' onClick={() => router.push('/admin/spells')}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            Back
                        </Button>
                        <Button onClick={handleSave} loading={saving}>
                            {t('admin.spells.form.submit_update')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-spells-edit', 'after-header')} context={{ id: spellId }} />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className='grid w-full grid-cols-6'>
                    <TabsTrigger value='general'>{t('admin.spells.tabs.general')}</TabsTrigger>
                    <TabsTrigger value='docker'>{t('admin.spells.tabs.docker')}</TabsTrigger>
                    <TabsTrigger value='features'>{t('admin.spells.tabs.features')}</TabsTrigger>
                    <TabsTrigger value='config'>{t('admin.spells.tabs.config')}</TabsTrigger>
                    <TabsTrigger value='script'>{t('admin.spells.tabs.script')}</TabsTrigger>
                    <TabsTrigger value='variables'>{t('admin.spells.tabs.variables')}</TabsTrigger>
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
                                    <Label>{t('admin.spells.form.author')}</Label>
                                    <Input
                                        value={form.author}
                                        onChange={(e) => setForm({ ...form, author: e.target.value })}
                                    />
                                </div>
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

                <TabsContent value='variables' className='space-y-6'>
                    <PageCard
                        title={t('admin.spells.variables.title')}
                        description={t('admin.spells.variables.description')}
                        icon={Settings}
                        action={
                            <Button
                                size='sm'
                                disabled={addingVariable || editingVariable !== null}
                                onClick={startAddVariable}
                            >
                                <Plus className='h-4 w-4 mr-2' />
                                {t('admin.spells.variables.add')}
                            </Button>
                        }
                    >
                        <div className='text-sm text-muted-foreground space-y-2'>
                            <p>{t('admin.spells.variables.help_text')}</p>
                            <div className='space-y-1'>
                                <p className='font-semibold text-foreground'>
                                    {t('admin.spells.variables.field_types_help')}
                                </p>
                                <ul className='space-y-0.5 list-disc list-inside ml-2'>
                                    <li>{t('admin.spells.variables.field_types_info')}</li>
                                    <li>{t('admin.spells.variables.rules_info')}</li>
                                </ul>
                            </div>
                        </div>
                    </PageCard>

                    {addingVariable && (
                        <PageCard
                            title={t('admin.spells.variables.new')}
                            description={t('admin.spells.variables.adding')}
                            icon={Plus}
                            variant='default'
                            footer={
                                <div className='flex justify-end gap-2'>
                                    <Button size='sm' variant='outline' onClick={cancelVariableEdit}>
                                        Cancel
                                    </Button>
                                    <Button size='sm' onClick={submitVariable}>
                                        <Plus className='h-4 w-4 mr-2' />
                                        {t('admin.spells.variables.create_variable')}
                                    </Button>
                                </div>
                            }
                        >
                            <div className='space-y-4'>
                                <div className='grid grid-cols-2 gap-3'>
                                    <div className='space-y-2'>
                                        <Label>{t('admin.spells.variables.name')} *</Label>
                                        <Input
                                            value={variableForm.name}
                                            onChange={(e) => setVariableForm({ ...variableForm, name: e.target.value })}
                                            placeholder='Server Port'
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label>{t('admin.spells.variables.env_variable')} *</Label>
                                        <Input
                                            value={variableForm.env_variable}
                                            onChange={(e) =>
                                                setVariableForm({ ...variableForm, env_variable: e.target.value })
                                            }
                                            placeholder='SERVER_PORT'
                                        />
                                    </div>
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.spells.variables.description_label')} *</Label>
                                    <Textarea
                                        value={variableForm.description}
                                        onChange={(e) =>
                                            setVariableForm({ ...variableForm, description: e.target.value })
                                        }
                                        placeholder='The port that the server will run on'
                                        rows={2}
                                    />
                                </div>
                                <div className='grid grid-cols-2 gap-3'>
                                    <div className='space-y-2'>
                                        <Label>{t('admin.spells.variables.default_value')} *</Label>
                                        <Input
                                            value={variableForm.default_value}
                                            onChange={(e) =>
                                                setVariableForm({ ...variableForm, default_value: e.target.value })
                                            }
                                            placeholder='25565'
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label>{t('admin.spells.variables.field_type')}</Label>
                                        <Select
                                            value={variableForm.field_type}
                                            onChange={(e) =>
                                                setVariableForm({ ...variableForm, field_type: e.target.value })
                                            }
                                        >
                                            <option value='text'>{t('admin.spells.variables.field_types.text')}</option>
                                            <option value='number'>
                                                {t('admin.spells.variables.field_types.number')}
                                            </option>
                                            <option value='boolean'>
                                                {t('admin.spells.variables.field_types.boolean')}
                                            </option>
                                            <option value='select'>
                                                {t('admin.spells.variables.field_types.select')}
                                            </option>
                                            <option value='textarea'>
                                                {t('admin.spells.variables.field_types.textarea')}
                                            </option>
                                        </Select>
                                    </div>
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.spells.variables.validation_rules')}</Label>
                                    <Input
                                        value={variableForm.rules}
                                        onChange={(e) => setVariableForm({ ...variableForm, rules: e.target.value })}
                                        placeholder='required|numeric|min:1|max:65535'
                                    />
                                </div>
                                <div className='flex items-center gap-6'>
                                    <div className='flex items-center space-x-2'>
                                        <Checkbox
                                            id='add-viewable'
                                            checked={variableForm.user_viewable === 'true'}
                                            onCheckedChange={(checked) =>
                                                setVariableForm({
                                                    ...variableForm,
                                                    user_viewable: checked ? 'true' : 'false',
                                                })
                                            }
                                        />
                                        <label htmlFor='add-viewable' className='text-sm font-medium cursor-pointer'>
                                            {t('admin.spells.variables.user_viewable')}
                                        </label>
                                    </div>
                                    <div className='flex items-center space-x-2'>
                                        <Checkbox
                                            id='add-editable'
                                            checked={variableForm.user_editable === 'true'}
                                            onCheckedChange={(checked) =>
                                                setVariableForm({
                                                    ...variableForm,
                                                    user_editable: checked ? 'true' : 'false',
                                                })
                                            }
                                        />
                                        <label htmlFor='add-editable' className='text-sm font-medium cursor-pointer'>
                                            {t('admin.spells.variables.user_editable')}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </PageCard>
                    )}

                    <div className='space-y-3'>
                        {variables.map((variable) => (
                            <PageCard
                                key={variable.id}
                                title={variable.name}
                                description={variable.env_variable}
                                icon={Settings}
                                variant='default'
                                action={
                                    editingVariable?.id !== variable.id && (
                                        <div className='flex gap-2'>
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                disabled={addingVariable || editingVariable !== null}
                                                onClick={() => startEditVariable(variable)}
                                            >
                                                <Pencil className='h-4 w-4' />
                                            </Button>
                                            {confirmDeleteVariable === variable.id ? (
                                                <>
                                                    <Button
                                                        size='sm'
                                                        variant='destructive'
                                                        loading={deletingVariable}
                                                        onClick={() => deleteVariable(variable)}
                                                    >
                                                        Confirm
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        disabled={deletingVariable}
                                                        onClick={() => setConfirmDeleteVariable(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size='sm'
                                                    variant='destructive'
                                                    disabled={addingVariable || editingVariable !== null}
                                                    onClick={() => deleteVariable(variable)}
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            )}
                                        </div>
                                    )
                                }
                                footer={
                                    editingVariable?.id === variable.id && (
                                        <div className='flex justify-end gap-2'>
                                            <Button size='sm' variant='outline' onClick={cancelVariableEdit}>
                                                Cancel
                                            </Button>
                                            <Button size='sm' onClick={submitVariable}>
                                                <Pencil className='h-4 w-4 mr-2' />
                                                {t('admin.spells.variables.save_changes')}
                                            </Button>
                                        </div>
                                    )
                                }
                            >
                                {editingVariable?.id === variable.id ? (
                                    <div className='space-y-4'>
                                        <div className='grid grid-cols-2 gap-3'>
                                            <div className='space-y-2'>
                                                <Label>{t('admin.spells.variables.name')} *</Label>
                                                <Input
                                                    value={variableForm.name}
                                                    onChange={(e) =>
                                                        setVariableForm({ ...variableForm, name: e.target.value })
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-2'>
                                                <Label>{t('admin.spells.variables.env_variable')} *</Label>
                                                <Input
                                                    value={variableForm.env_variable}
                                                    onChange={(e) =>
                                                        setVariableForm({
                                                            ...variableForm,
                                                            env_variable: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className='space-y-2'>
                                            <Label>{t('admin.spells.variables.description_label')} *</Label>
                                            <Textarea
                                                value={variableForm.description}
                                                onChange={(e) =>
                                                    setVariableForm({
                                                        ...variableForm,
                                                        description: e.target.value,
                                                    })
                                                }
                                                rows={2}
                                            />
                                        </div>
                                        <div className='grid grid-cols-2 gap-3'>
                                            <div className='space-y-2'>
                                                <Label>{t('admin.spells.variables.default_value')} *</Label>
                                                <Input
                                                    value={variableForm.default_value}
                                                    onChange={(e) =>
                                                        setVariableForm({
                                                            ...variableForm,
                                                            default_value: e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className='space-y-2'>
                                                <Label>{t('admin.spells.variables.field_type')}</Label>
                                                <Select
                                                    value={variableForm.field_type}
                                                    onChange={(e) =>
                                                        setVariableForm({
                                                            ...variableForm,
                                                            field_type: e.target.value,
                                                        })
                                                    }
                                                >
                                                    <option value='text'>
                                                        {t('admin.spells.variables.field_types.text')}
                                                    </option>
                                                    <option value='number'>
                                                        {t('admin.spells.variables.field_types.number')}
                                                    </option>
                                                    <option value='boolean'>
                                                        {t('admin.spells.variables.field_types.boolean')}
                                                    </option>
                                                    <option value='select'>
                                                        {t('admin.spells.variables.field_types.select')}
                                                    </option>
                                                    <option value='textarea'>
                                                        {t('admin.spells.variables.field_types.textarea')}
                                                    </option>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className='space-y-2'>
                                            <Label>{t('admin.spells.variables.validation_rules')}</Label>
                                            <Input
                                                value={variableForm.rules}
                                                onChange={(e) =>
                                                    setVariableForm({ ...variableForm, rules: e.target.value })
                                                }
                                                placeholder='required|numeric|min:1|max:65535'
                                            />
                                        </div>
                                        <div className='flex items-center gap-6'>
                                            <div className='flex items-center space-x-2'>
                                                <Checkbox
                                                    id={`edit-viewable-${variable.id}`}
                                                    checked={variableForm.user_viewable === 'true'}
                                                    onCheckedChange={(checked) =>
                                                        setVariableForm({
                                                            ...variableForm,
                                                            user_viewable: checked ? 'true' : 'false',
                                                        })
                                                    }
                                                />
                                                <label
                                                    htmlFor={`edit-viewable-${variable.id}`}
                                                    className='text-sm font-medium cursor-pointer'
                                                >
                                                    {t('admin.spells.variables.user_viewable')}
                                                </label>
                                            </div>
                                            <div className='flex items-center space-x-2'>
                                                <Checkbox
                                                    id={`edit-editable-${variable.id}`}
                                                    checked={variableForm.user_editable === 'true'}
                                                    onCheckedChange={(checked) =>
                                                        setVariableForm({
                                                            ...variableForm,
                                                            user_editable: checked ? 'true' : 'false',
                                                        })
                                                    }
                                                />
                                                <label
                                                    htmlFor={`edit-editable-${variable.id}`}
                                                    className='text-sm font-medium cursor-pointer'
                                                >
                                                    {t('admin.spells.variables.user_editable')}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='space-y-3'>
                                        <p className='text-sm text-muted-foreground leading-relaxed'>
                                            {variable.description}
                                        </p>
                                        <div className='grid grid-cols-2 gap-4 text-sm'>
                                            <div className='space-y-2'>
                                                <div className='flex justify-between'>
                                                    <span className='text-muted-foreground'>Default Value:</span>
                                                    <span className='font-mono text-xs'>
                                                        {variable.default_value || '-'}
                                                    </span>
                                                </div>
                                                <div className='flex justify-between'>
                                                    <span className='text-muted-foreground'>Field Type:</span>
                                                    <Badge variant='outline' className='text-xs'>
                                                        {variable.field_type || 'text'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className='space-y-2'>
                                                <div className='flex justify-between'>
                                                    <span className='text-muted-foreground'>User Viewable:</span>
                                                    <Badge
                                                        variant={
                                                            variable.user_viewable === 'true' ? 'default' : 'secondary'
                                                        }
                                                        className='text-xs'
                                                    >
                                                        {variable.user_viewable === 'true' ? 'Yes' : 'No'}
                                                    </Badge>
                                                </div>
                                                <div className='flex justify-between'>
                                                    <span className='text-muted-foreground'>User Editable:</span>
                                                    <Badge
                                                        variant={
                                                            variable.user_editable === 'true' ? 'default' : 'secondary'
                                                        }
                                                        className='text-xs'
                                                    >
                                                        {variable.user_editable === 'true' ? 'Yes' : 'No'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        {variable.rules && (
                                            <div className='text-sm pt-2 border-t'>
                                                <span className='text-muted-foreground'>Validation Rules:</span>
                                                <code className='ml-2 text-xs bg-muted px-2 py-1 rounded font-mono'>
                                                    {variable.rules}
                                                </code>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </PageCard>
                        ))}
                    </div>

                    {!addingVariable && variables.length === 0 && (
                        <div className='text-center py-8'>
                            <Settings className='h-12 w-12 mx-auto text-muted-foreground mb-3' />
                            <p className='text-sm text-muted-foreground'>{t('admin.spells.variables.no_variables')}</p>
                            <p className='text-xs text-muted-foreground mt-1'>
                                {t('admin.spells.variables.no_variables_help')}
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <WidgetRenderer widgets={getWidgets('admin-spells-edit', 'bottom-of-page')} context={{ id: spellId }} />
        </div>
    );
}
