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
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/featherui/EmptyState';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { toast } from 'sonner';
import { Code, ArrowLeft, Save, Loader2, Lock } from 'lucide-react';

interface DependencyItem {
    type: 'php' | 'php-ext' | 'plugin';
    value: string;
}

interface ConfigField {
    name: string;
    display_name: string;
    type: 'text' | 'email' | 'url' | 'password' | 'number' | 'boolean';
    description: string;
    required: boolean;
    validation: {
        regex?: string;
        message?: string;
        min?: number;
        max?: number;
    };
    default: string;
}

interface EditPluginData {
    identifier: string;
    name: string;
    description: string;
    version: string;
    target: string;
    author: string[];
    flags: string[];
    dependencies: DependencyItem[];
    requiredConfigs: ConfigField[];
}

export default function EditPluginPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const identifier = params.identifier as string;
    const { isDeveloperModeEnabled, loading: developerModeLoading } = useDeveloperMode();
    const [loading, setLoading] = useState(false);
    const [loadingPlugin, setLoadingPlugin] = useState(true);

    const [form, setForm] = useState<EditPluginData>({
        identifier: '',
        name: '',
        description: '',
        version: '1.0.0',
        target: 'v3',
        author: [''],
        flags: [],
        dependencies: [],
        requiredConfigs: [],
    });

    const pluginFlags = [
        'hasInstallScript',
        'hasRemovalScript',
        'hasUpdateScript',
        'developerIgnoreInstallScript',
        'developerEscalateInstallScript',
        'userEscalateInstallScript',
        'hasEvents',
    ];

    const dependencyTypes = [
        { value: 'php', label: t('admin.dev.plugins.create.dependency_types.php') },
        { value: 'php-ext', label: t('admin.dev.plugins.create.dependency_types.php_ext') },
        { value: 'plugin', label: t('admin.dev.plugins.create.dependency_types.plugin') },
    ];

    const phpVersions = ['8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];
    const phpExtensions = [
        'pdo',
        'curl',
        'json',
        'mbstring',
        'gd',
        'zip',
        'xml',
        'openssl',
        'sqlite3',
        'mysql',
        'pgsql',
    ];
    const availableTargets = ['v1', 'v2', 'v3'];

    const fieldTypes = [
        { value: 'text', label: t('admin.dev.plugins.create.field_types.text') },
        { value: 'email', label: t('admin.dev.plugins.create.field_types.email') },
        { value: 'url', label: t('admin.dev.plugins.create.field_types.url') },
        { value: 'password', label: t('admin.dev.plugins.create.field_types.password') },
        { value: 'number', label: t('admin.dev.plugins.create.field_types.number') },
        { value: 'boolean', label: t('admin.dev.plugins.create.field_types.boolean') },
    ];

    const loadPlugin = useCallback(async () => {
        if (!identifier) {
            toast.error(t('admin.dev.plugins.edit.messages.identifier_required'));
            router.push('/admin/dev/plugins');
            return;
        }

        setLoadingPlugin(true);
        try {
            const response = await axios.get(`/api/admin/plugin-manager/${identifier}`);
            if (response.data.success && response.data.data) {
                const plugin = response.data.data;

                const dependencies: DependencyItem[] = (plugin.dependencies || []).map((dep: string) => {
                    const [type, value] = dep.split('=');
                    return { type: type as 'php' | 'php-ext' | 'plugin', value: value || '' };
                });

                setForm({
                    identifier: plugin.identifier || identifier,
                    name: plugin.name || '',
                    description: plugin.description || '',
                    version: plugin.version || '1.0.0',
                    target: plugin.target || 'v3',
                    author: Array.isArray(plugin.author) ? [...plugin.author] : [plugin.author || ''],
                    flags: Array.isArray(plugin.flags) ? [...plugin.flags] : [],
                    dependencies,
                    requiredConfigs:
                        plugin.config && Array.isArray(plugin.config)
                            ? plugin.config.map((config: ConfigField) => ({
                                  name: config.name || '',
                                  display_name: config.display_name || '',
                                  type: config.type || 'text',
                                  description: config.description || '',
                                  required: config.required !== undefined ? config.required : true,
                                  validation: config.validation || {},
                                  default: config.default || '',
                              }))
                            : [],
                });
            } else {
                toast.error(response.data.message || t('admin.dev.plugins.edit.messages.load_failed'));
                router.push('/admin/dev/plugins');
            }
        } catch (error) {
            console.error('Failed to load plugin:', error);
            toast.error(t('admin.dev.plugins.edit.messages.load_failed'));
            router.push('/admin/dev/plugins');
        } finally {
            setLoadingPlugin(false);
        }
    }, [identifier, router, t]);

    useEffect(() => {
        // Only load plugin if developer mode is enabled
        if (isDeveloperModeEnabled === true) {
            loadPlugin();
        }
    }, [loadPlugin, isDeveloperModeEnabled]);

    const updatePlugin = async () => {
        if (!form.identifier || !form.name) {
            toast.error(t('admin.dev.plugins.edit.validation.identifier_name_required'));
            return;
        }

        const hasValidAuthors = form.author.some((author) => author.trim() !== '');
        const hasValidFlags = form.flags.length > 0;
        const hasValidDependencies = form.dependencies.length > 0;

        if (!hasValidAuthors && !hasValidFlags && !hasValidDependencies) {
            toast.error(t('admin.dev.plugins.edit.validation.author_flag_dependency_required'));
            return;
        }

        const formattedData = {
            ...form,
            dependencies: form.dependencies.map((dep) => `${dep.type}=${dep.value}`),
            requiredConfigs: form.requiredConfigs.map((config) => config.name),
            configSchema: form.requiredConfigs,
        };

        setLoading(true);
        try {
            const response = await axios.put(`/api/admin/plugin-manager/${form.identifier}`, formattedData);
            if (response.data.success) {
                toast.success(t('admin.dev.plugins.edit.messages.updated'));
                router.push('/admin/dev/plugins');
            } else {
                toast.error(response.data.message || t('admin.dev.plugins.edit.messages.update_failed'));
            }
        } catch (error) {
            console.error('Failed to update plugin:', error);
            toast.error(t('admin.dev.plugins.edit.messages.update_failed'));
        } finally {
            setLoading(false);
        }
    };

    const hasPhpVersionDependency = form.dependencies.some((dep) => dep.type === 'php');

    // Developer Mode Check
    if (developerModeLoading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
        );
    }

    if (isDeveloperModeEnabled === false) {
        return (
            <div className='max-w-4xl mx-auto py-8 px-4'>
                <EmptyState
                    title={t('admin.dev.developerModeRequired') || 'Developer Mode Required'}
                    description={
                        t('admin.dev.developerModeDescription') ||
                        'Developer mode must be enabled in settings to access developer tools.'
                    }
                    icon={Lock}
                    action={
                        <Button variant='outline' onClick={() => router.push('/admin/settings')}>
                            {t('admin.dev.goToSettings') || 'Go to Settings'}
                        </Button>
                    }
                />
            </div>
        );
    }

    if (loadingPlugin) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
        );
    }

    return (
        <div className='max-w-4xl mx-auto py-8 px-4'>
            <PageHeader
                title={t('admin.dev.plugins.edit.title')}
                description={t('admin.dev.plugins.edit.description')}
                icon={Code}
                actions={
                    <Button variant='outline' onClick={() => router.back()}>
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        {t('common.back')}
                    </Button>
                }
            />

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    updatePlugin();
                }}
                className='space-y-8 mt-8'
            >
                <PageCard title={t('admin.dev.plugins.create.basic_info')} icon={Code}>
                    <div className='space-y-6'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div>
                                <Label className='text-sm font-semibold mb-2 block'>
                                    {t('admin.dev.plugins.create.name')} *
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder='MyAwesomePlugin'
                                    maxLength={32}
                                />
                            </div>
                            <div>
                                <Label className='text-sm font-semibold mb-2 block'>
                                    {t('admin.dev.plugins.create.identifier')}
                                </Label>
                                <Input value={form.identifier} disabled className='bg-muted lowercase' />
                                <p className='text-xs text-muted-foreground mt-1'>
                                    {t('admin.dev.plugins.edit.identifier_cannot_change')}
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label className='text-sm font-semibold mb-2 block'>
                                {t('admin.dev.plugins.create.description')}
                            </Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder={t('admin.dev.plugins.create.description_placeholder')}
                                rows={3}
                            />
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                            <div>
                                <Label className='text-sm font-semibold mb-2 block'>
                                    {t('admin.dev.plugins.create.version')}
                                </Label>
                                <Input
                                    value={form.version}
                                    onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
                                    placeholder='1.0.0'
                                />
                            </div>
                            <div>
                                <Label className='text-sm font-semibold mb-2 block'>
                                    {t('admin.dev.plugins.create.target')}
                                </Label>
                                <Select
                                    value={form.target}
                                    onChange={(e) => setForm((prev) => ({ ...prev, target: e.target.value }))}
                                >
                                    {availableTargets.map((target) => (
                                        <option key={target} value={target}>
                                            {target}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>
                </PageCard>

                <PageCard title={t('admin.dev.plugins.create.authors')} icon={Code}>
                    <div className='space-y-2'>
                        {form.author.map((author, index) => (
                            <div key={index} className='flex gap-2'>
                                <Input
                                    value={author}
                                    onChange={(e) => {
                                        const newAuthors = [...form.author];
                                        newAuthors[index] = e.target.value;
                                        setForm((prev) => ({ ...prev, author: newAuthors }));
                                    }}
                                    placeholder={t('admin.dev.plugins.create.author_placeholder')}
                                    className='flex-1'
                                />
                                {form.author.length > 1 && (
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() => {
                                            const newAuthors = form.author.filter((_, i) => i !== index);
                                            setForm((prev) => ({ ...prev, author: newAuthors }));
                                        }}
                                    >
                                        {t('common.remove')}
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => setForm((prev) => ({ ...prev, author: [...prev.author, ''] }))}
                        >
                            {t('admin.dev.plugins.create.add_author')}
                        </Button>
                        <p className='text-xs text-muted-foreground'>{t('admin.dev.plugins.create.authors_help')}</p>
                    </div>
                </PageCard>

                <PageCard title={t('admin.dev.plugins.create.flags')} icon={Code}>
                    <div className='space-y-2'>
                        {form.flags.map((flag, index) => (
                            <div key={index} className='flex gap-2'>
                                <Select
                                    value={flag}
                                    onChange={(e) => {
                                        const newFlags = [...form.flags];
                                        newFlags[index] = e.target.value;
                                        setForm((prev) => ({ ...prev, flags: newFlags }));
                                    }}
                                    className='flex-1'
                                >
                                    {pluginFlags.map((availableFlag) => (
                                        <option
                                            key={availableFlag}
                                            value={availableFlag}
                                            disabled={flag !== availableFlag && form.flags.includes(availableFlag)}
                                        >
                                            {availableFlag}
                                            {flag !== availableFlag && form.flags.includes(availableFlag)
                                                ? ' (already selected)'
                                                : ''}
                                        </option>
                                    ))}
                                </Select>
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() => {
                                        const newFlags = form.flags.filter((_, i) => i !== index);
                                        setForm((prev) => ({ ...prev, flags: newFlags }));
                                    }}
                                >
                                    {t('common.remove')}
                                </Button>
                            </div>
                        ))}
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => setForm((prev) => ({ ...prev, flags: [...prev.flags, ''] }))}
                        >
                            {t('admin.dev.plugins.create.add_flag')}
                        </Button>
                    </div>
                </PageCard>

                <PageCard title={t('admin.dev.plugins.create.dependencies')} icon={Code}>
                    <div className='space-y-2'>
                        {form.dependencies.map((dep, index) => (
                            <div key={index} className='flex gap-2'>
                                <Select
                                    value={dep.type}
                                    onChange={(e) => {
                                        const newDeps = [...form.dependencies];
                                        newDeps[index] = {
                                            ...newDeps[index],
                                            type: e.target.value as 'php' | 'php-ext' | 'plugin',
                                        };
                                        setForm((prev) => ({ ...prev, dependencies: newDeps }));
                                    }}
                                    className='w-32'
                                >
                                    {dependencyTypes.map((type) => (
                                        <option
                                            key={type.value}
                                            value={type.value}
                                            disabled={
                                                type.value === 'php' && hasPhpVersionDependency && dep.type !== 'php'
                                            }
                                        >
                                            {type.label}
                                        </option>
                                    ))}
                                </Select>
                                {dep.type === 'php' && (
                                    <div className='flex-1'>
                                        <Select
                                            value={dep.value}
                                            onChange={(e) => {
                                                const newDeps = [...form.dependencies];
                                                newDeps[index] = { ...newDeps[index], value: e.target.value };
                                                setForm((prev) => ({ ...prev, dependencies: newDeps }));
                                            }}
                                        >
                                            {phpVersions.map((version) => (
                                                <option
                                                    key={version}
                                                    value={version}
                                                    disabled={
                                                        dep.value !== version &&
                                                        form.dependencies.some(
                                                            (d) => d.type === 'php' && d.value === version,
                                                        )
                                                    }
                                                >
                                                    {version}
                                                </option>
                                            ))}
                                        </Select>
                                        <Input
                                            value={dep.value}
                                            onChange={(e) => {
                                                const newDeps = [...form.dependencies];
                                                newDeps[index] = { ...newDeps[index], value: e.target.value };
                                                setForm((prev) => ({ ...prev, dependencies: newDeps }));
                                            }}
                                            placeholder={t('admin.dev.plugins.create.custom_php_version')}
                                            className='mt-1'
                                        />
                                    </div>
                                )}
                                {dep.type === 'php-ext' && (
                                    <div className='flex-1'>
                                        <Select
                                            value={dep.value}
                                            onChange={(e) => {
                                                const newDeps = [...form.dependencies];
                                                newDeps[index] = { ...newDeps[index], value: e.target.value };
                                                setForm((prev) => ({ ...prev, dependencies: newDeps }));
                                            }}
                                        >
                                            {phpExtensions.map((ext) => (
                                                <option
                                                    key={ext}
                                                    value={ext}
                                                    disabled={
                                                        dep.value !== ext &&
                                                        form.dependencies.some(
                                                            (d) => d.type === 'php-ext' && d.value === ext,
                                                        )
                                                    }
                                                >
                                                    {ext}
                                                </option>
                                            ))}
                                        </Select>
                                        <Input
                                            value={dep.value}
                                            onChange={(e) => {
                                                const newDeps = [...form.dependencies];
                                                newDeps[index] = { ...newDeps[index], value: e.target.value };
                                                setForm((prev) => ({ ...prev, dependencies: newDeps }));
                                            }}
                                            placeholder={t('admin.dev.plugins.create.custom_extension')}
                                            className='mt-1'
                                        />
                                    </div>
                                )}
                                {dep.type === 'plugin' && (
                                    <Input
                                        value={dep.value}
                                        onChange={(e) => {
                                            const newDeps = [...form.dependencies];
                                            newDeps[index] = { ...newDeps[index], value: e.target.value };
                                            setForm((prev) => ({ ...prev, dependencies: newDeps }));
                                        }}
                                        placeholder={t('admin.dev.plugins.create.plugin_identifier')}
                                        className='flex-1'
                                    />
                                )}
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    onClick={() => {
                                        const newDeps = form.dependencies.filter((_, i) => i !== index);
                                        setForm((prev) => ({ ...prev, dependencies: newDeps }));
                                    }}
                                >
                                    {t('common.remove')}
                                </Button>
                            </div>
                        ))}
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() =>
                                setForm((prev) => ({
                                    ...prev,
                                    dependencies: [...prev.dependencies, { type: 'php-ext', value: '' }],
                                }))
                            }
                        >
                            {t('admin.dev.plugins.create.add_dependency')}
                        </Button>
                    </div>
                </PageCard>

                <PageCard title={t('admin.dev.plugins.create.config_fields')} icon={Code}>
                    <div className='space-y-4'>
                        {form.requiredConfigs.map((config, index) => (
                            <div key={index} className='p-4 border rounded-lg space-y-3'>
                                <div className='flex items-center justify-between'>
                                    <h4 className='font-medium'>
                                        {t('admin.dev.plugins.create.config_field')} {index + 1}
                                    </h4>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={() => {
                                            const newConfigs = form.requiredConfigs.filter((_, i) => i !== index);
                                            setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                        }}
                                    >
                                        {t('common.remove')}
                                    </Button>
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                    <div>
                                        <Label className='text-xs font-medium mb-1 block'>
                                            {t('admin.dev.plugins.create.field_name')} *
                                        </Label>
                                        <Input
                                            value={config.name}
                                            onChange={(e) => {
                                                const newConfigs = [...form.requiredConfigs];
                                                newConfigs[index] = { ...newConfigs[index], name: e.target.value };
                                                setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                            }}
                                            placeholder='api_key'
                                            className='text-sm'
                                        />
                                    </div>
                                    <div>
                                        <Label className='text-xs font-medium mb-1 block'>
                                            {t('admin.dev.plugins.create.display_name')} *
                                        </Label>
                                        <Input
                                            value={config.display_name}
                                            onChange={(e) => {
                                                const newConfigs = [...form.requiredConfigs];
                                                newConfigs[index] = {
                                                    ...newConfigs[index],
                                                    display_name: e.target.value,
                                                };
                                                setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                            }}
                                            placeholder='API Key'
                                            className='text-sm'
                                        />
                                    </div>
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                    <div>
                                        <Label className='text-xs font-medium mb-1 block'>
                                            {t('admin.dev.plugins.create.field_type')}
                                        </Label>
                                        <Select
                                            value={config.type}
                                            onChange={(e) => {
                                                const newConfigs = [...form.requiredConfigs];
                                                newConfigs[index] = {
                                                    ...newConfigs[index],
                                                    type: e.target.value as ConfigField['type'],
                                                };
                                                setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                            }}
                                            className='text-sm'
                                        >
                                            {fieldTypes.map((type) => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className='text-xs font-medium mb-1 block'>
                                            {t('admin.dev.plugins.create.default_value')}
                                        </Label>
                                        <Input
                                            value={config.default}
                                            onChange={(e) => {
                                                const newConfigs = [...form.requiredConfigs];
                                                newConfigs[index] = { ...newConfigs[index], default: e.target.value };
                                                setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                            }}
                                            placeholder={t('admin.dev.plugins.create.default_value_placeholder')}
                                            className='text-sm'
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className='text-xs font-medium mb-1 block'>
                                        {t('admin.dev.plugins.create.description')}
                                    </Label>
                                    <Textarea
                                        value={config.description}
                                        onChange={(e) => {
                                            const newConfigs = [...form.requiredConfigs];
                                            newConfigs[index] = { ...newConfigs[index], description: e.target.value };
                                            setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                        }}
                                        placeholder={t('admin.dev.plugins.create.config_description_placeholder')}
                                        rows={2}
                                        className='text-sm'
                                    />
                                </div>

                                <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                    <div>
                                        <Label className='text-xs font-medium mb-1 block'>
                                            {t('admin.dev.plugins.create.validation_regex')}
                                        </Label>
                                        <Input
                                            value={config.validation.regex || ''}
                                            onChange={(e) => {
                                                const newConfigs = [...form.requiredConfigs];
                                                newConfigs[index] = {
                                                    ...newConfigs[index],
                                                    validation: {
                                                        ...newConfigs[index].validation,
                                                        regex: e.target.value,
                                                    },
                                                };
                                                setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                            }}
                                            placeholder='/^[a-zA-Z0-9]+$/'
                                            className='text-sm'
                                        />
                                    </div>
                                    <div>
                                        <Label className='text-xs font-medium mb-1 block'>
                                            {t('admin.dev.plugins.create.validation_message')}
                                        </Label>
                                        <Input
                                            value={config.validation.message || ''}
                                            onChange={(e) => {
                                                const newConfigs = [...form.requiredConfigs];
                                                newConfigs[index] = {
                                                    ...newConfigs[index],
                                                    validation: {
                                                        ...newConfigs[index].validation,
                                                        message: e.target.value,
                                                    },
                                                };
                                                setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                            }}
                                            placeholder={t('admin.dev.plugins.create.validation_message_placeholder')}
                                            className='text-sm'
                                        />
                                    </div>
                                </div>

                                <div className='flex items-center gap-2'>
                                    <input
                                        type='checkbox'
                                        id={`required-${index}`}
                                        checked={config.required}
                                        onChange={(e) => {
                                            const newConfigs = [...form.requiredConfigs];
                                            newConfigs[index] = { ...newConfigs[index], required: e.target.checked };
                                            setForm((prev) => ({ ...prev, requiredConfigs: newConfigs }));
                                        }}
                                    />
                                    <Label htmlFor={`required-${index}`} className='text-sm'>
                                        {t('admin.dev.plugins.create.required_field')}
                                    </Label>
                                </div>
                            </div>
                        ))}
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() =>
                                setForm((prev) => ({
                                    ...prev,
                                    requiredConfigs: [
                                        ...prev.requiredConfigs,
                                        {
                                            name: '',
                                            display_name: '',
                                            type: 'text',
                                            description: '',
                                            required: true,
                                            validation: {},
                                            default: '',
                                        },
                                    ],
                                }))
                            }
                        >
                            {t('admin.dev.plugins.create.add_config_field')}
                        </Button>
                    </div>
                </PageCard>

                <div className='flex justify-end gap-2 pt-4'>
                    <Button type='button' variant='outline' onClick={() => router.push('/admin/dev/plugins')}>
                        {t('common.cancel')}
                    </Button>
                    <Button type='submit' loading={loading}>
                        <Save className='h-4 w-4 mr-2' />
                        {loading ? t('admin.dev.plugins.edit.updating') : t('admin.dev.plugins.edit.update_plugin')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
