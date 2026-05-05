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

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Server, User, Lock, Mail, Hash, Users, Shield, Network, Database } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface LdapProvider {
    uuid: string;
    name: string;
    host: string;
    port: number;
    use_tls: 'true' | 'false';
    use_ssl: 'true' | 'false';
    bind_dn?: string | null;
    base_dn: string;
    user_filter: string;
    username_attribute: string;
    email_attribute: string;
    first_name_attribute?: string | null;
    last_name_attribute?: string | null;
    group_filter?: string | null;
    group_attribute?: string | null;
    required_group?: string | null;
    auto_provision: 'true' | 'false';
    sync_attributes: 'true' | 'false';
    generate_email_if_missing: 'true' | 'false';
    enabled: 'true' | 'false';
}

export default function LdapProvidersPage() {
    const { t } = useTranslation();
    const [providers, setProviders] = useState<LdapProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [editing, setEditing] = useState<LdapProvider | null>(null);
    const [bindPassword, setBindPassword] = useState('');

    const fetchProviders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/ldap/providers', { cache: 'no-store' });
            const json = await res.json();
            if (json.success && Array.isArray(json.data?.providers)) {
                setProviders(json.data.providers);
            } else {
                toast.error(json.message || t('admin.ldapProviders.messages.fetch_failed'));
            }
        } catch {
            toast.error(t('admin.ldapProviders.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    const resetForm = () => {
        setEditing({
            uuid: '',
            name: '',
            host: '',
            port: 389,
            use_tls: 'false',
            use_ssl: 'false',
            bind_dn: '',
            base_dn: '',
            user_filter: '(uid={username})',
            username_attribute: 'uid',
            email_attribute: 'mail',
            first_name_attribute: 'givenName',
            last_name_attribute: 'sn',
            group_filter: '',
            group_attribute: 'memberOf',
            required_group: '',
            auto_provision: 'false',
            sync_attributes: 'false',
            generate_email_if_missing: 'false',
            enabled: 'true',
        });
        setBindPassword('');
    };

    const handleCreateNew = () => {
        resetForm();
    };

    const handleEdit = (provider: LdapProvider) => {
        setEditing(provider);
        setBindPassword('');
    };

    const handleDelete = async (provider: LdapProvider) => {
        if (!confirm(t('admin.ldapProviders.deleteConfirm', { name: provider.name }))) return;

        try {
            const res = await fetch(`/api/admin/ldap/providers/${provider.uuid}`, {
                method: 'DELETE',
            });
            const json = await res.json();
            if (json.success) {
                toast.success(t('admin.ldapProviders.messages.deleted'));
                fetchProviders();
            } else {
                toast.error(json.message || t('admin.ldapProviders.messages.delete_failed'));
            }
        } catch {
            toast.error(t('admin.ldapProviders.messages.delete_failed'));
        }
    };

    const handleTestConnection = async (provider: LdapProvider) => {
        setTesting(true);
        try {
            const res = await fetch(`/api/admin/ldap/providers/${provider.uuid}/test`, {
                method: 'POST',
            });
            const json = await res.json();
            if (json.success) {
                toast.success(t('admin.ldapProviders.messages.connection_success'));
            } else {
                toast.error(json.message || t('admin.ldapProviders.messages.connection_failed'));
            }
        } catch {
            toast.error(t('admin.ldapProviders.messages.connection_failed'));
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        if (!editing) return;
        setSaving(true);

        const payload: Partial<LdapProvider> & { bind_password?: string } = {
            name: editing.name,
            host: editing.host,
            port: editing.port,
            use_tls: editing.use_tls,
            use_ssl: editing.use_ssl,
            bind_dn: editing.bind_dn || '',
            base_dn: editing.base_dn,
            user_filter: editing.user_filter,
            username_attribute: editing.username_attribute,
            email_attribute: editing.email_attribute,
            first_name_attribute: editing.first_name_attribute || '',
            last_name_attribute: editing.last_name_attribute || '',
            group_filter: editing.group_filter || '',
            group_attribute: editing.group_attribute || '',
            required_group: editing.required_group || '',
            auto_provision: editing.auto_provision,
            sync_attributes: editing.sync_attributes,
            generate_email_if_missing: editing.generate_email_if_missing,
            enabled: editing.enabled,
        };

        if (bindPassword) {
            payload.bind_password = bindPassword;
        }

        try {
            const isNew = !editing.uuid;
            const res = await fetch(
                isNew ? '/api/admin/ldap/providers' : `/api/admin/ldap/providers/${editing.uuid}`,
                {
                    method: isNew ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                },
            );
            const json = await res.json();
            if (json.success) {
                toast.success(t('admin.ldapProviders.messages.saved'));
                setEditing(null);
                setBindPassword('');
                fetchProviders();
            } else {
                toast.error(json.message || t('admin.ldapProviders.messages.save_failed'));
            }
        } catch {
            toast.error(t('admin.ldapProviders.messages.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.ldapProviders.title')}
                description={t('admin.ldapProviders.description')}
                icon={Server}
            />

            <PageCard
                title={t('admin.ldapProviders.configuredProviders')}
                icon={Server}
                action={
                    <Button onClick={handleCreateNew} size='sm'>
                        {t('admin.ldapProviders.addProvider')}
                    </Button>
                }
            >
                {loading ? (
                    <div className='py-8 text-center text-muted-foreground'>{t('admin.ldapProviders.loading')}</div>
                ) : providers.length === 0 ? (
                    <div className='py-8 text-center text-muted-foreground'>
                        {t('admin.ldapProviders.noProviders')}
                    </div>
                ) : (
                    <div className='space-y-3'>
                        {providers.map((provider) => {
                            const isEnabled = provider.enabled === 'true';
                            const useTls = provider.use_tls === 'true';
                            const useSsl = provider.use_ssl === 'true';
                            const protocol = useSsl ? 'ldaps://' : 'ldap://';
                            return (
                                <div
                                    key={provider.uuid}
                                    className='flex items-center justify-between rounded-lg border border-border px-4 py-3'
                                >
                                    <div>
                                        <div className='font-medium flex items-center gap-2'>
                                            <Server className='h-4 w-4 text-primary' />
                                            <span>{provider.name}</span>
                                        </div>
                                        <div className='text-xs text-muted-foreground'>
                                            {protocol}
                                            {provider.host}:{provider.port}
                                            {useTls && !useSsl && ' (TLS)'}
                                        </div>
                                        <div className='text-xs text-muted-foreground mt-0.5'>
                                            {t('admin.ldapProviders.baseDn')}: {provider.base_dn}
                                        </div>
                                        <div className='mt-1 flex items-center gap-2'>
                                            <span
                                                className={
                                                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' +
                                                    (isEnabled
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40'
                                                        : 'bg-muted text-muted-foreground border border-border/60')
                                                }
                                            >
                                                {isEnabled ? t('admin.ldapProviders.enabled') : t('admin.ldapProviders.disabled')}
                                            </span>
                                            {provider.auto_provision === 'true' && (
                                                <span className='inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/40'>
                                                    {t('admin.ldapProviders.autoProvision')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => handleTestConnection(provider)}
                                            loading={testing}
                                        >
                                            {t('admin.ldapProviders.testConnection')}
                                        </Button>
                                        <Button variant='outline' size='sm' onClick={() => handleEdit(provider)}>
                                            {t('admin.ldapProviders.edit')}
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={async () => {
                                                const next = isEnabled ? 'false' : 'true';
                                                try {
                                                    const res = await fetch(`/api/admin/ldap/providers/${provider.uuid}`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify({ enabled: next }),
                                                    });
                                                    const json = await res.json();
                                                    if (json.success) {
                                                        fetchProviders();
                                                    } else {
                                                        toast.error(json.message || t('admin.ldapProviders.messages.toggle_failed'));
                                                    }
                                                } catch {
                                                    toast.error(t('admin.ldapProviders.messages.toggle_failed'));
                                                }
                                            }}
                                        >
                                            {isEnabled ? t('admin.ldapProviders.disable') : t('admin.ldapProviders.enable')}
                                        </Button>
                                        <Button variant='destructive' size='sm' onClick={() => handleDelete(provider)}>
                                            {t('admin.ldapProviders.delete')}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </PageCard>

            {editing && (
                <PageCard title={editing.uuid ? t('admin.ldapProviders.editProvider') : t('admin.ldapProviders.createProvider')} icon={Shield}>
                    <div className='space-y-4'>
                        {/* Basic Settings */}
                        <div className='space-y-4 pb-4 border-b border-border'>
                            <h3 className='text-sm font-semibold text-foreground'>{t('admin.ldapProviders.form.basicSettings')}</h3>
                            <div className='space-y-2'>
                                <Label htmlFor='ldap-name' className='flex items-center gap-2 text-foreground font-medium'>
                                    <User className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.ldapProviders.form.providerName')}
                                </Label>
                                <Input
                                    id='ldap-name'
                                    value={editing.name}
                                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                    placeholder={t('admin.ldapProviders.form.providerNamePlaceholder')}
                                    className='mt-0'
                                />
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label htmlFor='ldap-host' className='flex items-center gap-2 text-foreground font-medium'>
                                        <Network className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.ldapHost')}
                                    </Label>
                                    <Input
                                        id='ldap-host'
                                        value={editing.host}
                                        onChange={(e) => setEditing({ ...editing, host: e.target.value })}
                                        placeholder={t('admin.ldapProviders.form.ldapHostPlaceholder')}
                                        className='mt-0'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='ldap-port' className='flex items-center gap-2 text-foreground font-medium'>
                                        {t('admin.ldapProviders.form.port')}
                                    </Label>
                                    <Input
                                        id='ldap-port'
                                        type='number'
                                        value={editing.port}
                                        onChange={(e) => setEditing({ ...editing, port: parseInt(e.target.value) || 389 })}
                                        className='mt-0'
                                    />
                                </div>
                            </div>
                            <div className='flex flex-col gap-3'>
                                <div className='flex items-center justify-between gap-4'>
                                    <Label htmlFor='ldap-use-tls' className='flex items-center gap-2 text-foreground font-medium'>
                                        <Lock className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.useTls')}
                                    </Label>
                                    <Switch
                                        id='ldap-use-tls'
                                        checked={editing.use_tls === 'true'}
                                        onCheckedChange={(checked) =>
                                            setEditing({ ...editing, use_tls: checked ? 'true' : 'false' })
                                        }
                                    />
                                </div>
                                <div className='flex items-center justify-between gap-4'>
                                    <Label htmlFor='ldap-use-ssl' className='flex items-center gap-2 text-foreground font-medium'>
                                        <Lock className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.useSsl')}
                                    </Label>
                                    <Switch
                                        id='ldap-use-ssl'
                                        checked={editing.use_ssl === 'true'}
                                        onCheckedChange={(checked) =>
                                            setEditing({ ...editing, use_ssl: checked ? 'true' : 'false' })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bind Configuration */}
                        <div className='space-y-4 pb-4 border-b border-border'>
                            <h3 className='text-sm font-semibold text-foreground'>{t('admin.ldapProviders.form.bindConfiguration')}</h3>
                            <p className='text-xs text-muted-foreground'>
                                {t('admin.ldapProviders.form.bindConfigDescription')}
                            </p>
                            <div className='space-y-2'>
                                <Label htmlFor='ldap-bind-dn' className='flex items-center gap-2 text-foreground font-medium'>
                                    <User className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.ldapProviders.form.bindDn')}
                                </Label>
                                <Input
                                    id='ldap-bind-dn'
                                    value={editing.bind_dn || ''}
                                    onChange={(e) => setEditing({ ...editing, bind_dn: e.target.value })}
                                    placeholder={t('admin.ldapProviders.form.bindDnPlaceholder')}
                                    className='mt-0'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='ldap-bind-password' className='flex items-center gap-2 text-foreground font-medium'>
                                    <Lock className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.ldapProviders.form.bindPassword')}
                                </Label>
                                <Input
                                    id='ldap-bind-password'
                                    type='password'
                                    value={bindPassword}
                                    onChange={(e) => setBindPassword(e.target.value)}
                                    placeholder={editing.uuid ? t('admin.ldapProviders.form.bindPasswordPlaceholder') : ''}
                                    className='mt-0'
                                />
                            </div>
                        </div>

                        {/* User Search Configuration */}
                        <div className='space-y-4 pb-4 border-b border-border'>
                            <h3 className='text-sm font-semibold text-foreground'>{t('admin.ldapProviders.form.userSearchConfiguration')}</h3>
                            <div className='space-y-2'>
                                <Label htmlFor='ldap-base-dn' className='flex items-center gap-2 text-foreground font-medium'>
                                    <Database className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.ldapProviders.form.baseDnLabel')}
                                </Label>
                                <Input
                                    id='ldap-base-dn'
                                    value={editing.base_dn}
                                    onChange={(e) => setEditing({ ...editing, base_dn: e.target.value })}
                                    placeholder={t('admin.ldapProviders.form.baseDnPlaceholder')}
                                    className='mt-0'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='ldap-user-filter' className='flex items-center gap-2 text-foreground font-medium'>
                                    <Hash className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.ldapProviders.form.userFilter')}
                                </Label>
                                <Input
                                    id='ldap-user-filter'
                                    value={editing.user_filter}
                                    onChange={(e) => setEditing({ ...editing, user_filter: e.target.value })}
                                    placeholder={t('admin.ldapProviders.form.userFilterPlaceholder')}
                                    className='mt-0'
                                />
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.ldapProviders.form.userFilterHelp')}
                                </p>
                            </div>
                        </div>

                        {/* Attribute Mapping */}
                        <div className='space-y-4 pb-4 border-b border-border'>
                            <h3 className='text-sm font-semibold text-foreground'>{t('admin.ldapProviders.form.attributeMapping')}</h3>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='ldap-username-attr' className='flex items-center gap-2 text-foreground font-medium'>
                                        <User className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.usernameAttribute')}
                                    </Label>
                                    <Input
                                        id='ldap-username-attr'
                                        value={editing.username_attribute}
                                        onChange={(e) => setEditing({ ...editing, username_attribute: e.target.value })}
                                        placeholder={t('admin.ldapProviders.form.usernameAttributePlaceholder')}
                                        className='mt-0'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='ldap-email-attr' className='flex items-center gap-2 text-foreground font-medium'>
                                        <Mail className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.emailAttribute')}
                                    </Label>
                                    <Input
                                        id='ldap-email-attr'
                                        value={editing.email_attribute}
                                        onChange={(e) => setEditing({ ...editing, email_attribute: e.target.value })}
                                        placeholder={t('admin.ldapProviders.form.emailAttributePlaceholder')}
                                        className='mt-0'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='ldap-firstname-attr' className='flex items-center gap-2 text-foreground font-medium'>
                                        {t('admin.ldapProviders.form.firstNameAttribute')}
                                    </Label>
                                    <Input
                                        id='ldap-firstname-attr'
                                        value={editing.first_name_attribute || ''}
                                        onChange={(e) => setEditing({ ...editing, first_name_attribute: e.target.value })}
                                        placeholder={t('admin.ldapProviders.form.firstNameAttributePlaceholder')}
                                        className='mt-0'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='ldap-lastname-attr' className='flex items-center gap-2 text-foreground font-medium'>
                                        {t('admin.ldapProviders.form.lastNameAttribute')}
                                    </Label>
                                    <Input
                                        id='ldap-lastname-attr'
                                        value={editing.last_name_attribute || ''}
                                        onChange={(e) => setEditing({ ...editing, last_name_attribute: e.target.value })}
                                        placeholder={t('admin.ldapProviders.form.lastNameAttributePlaceholder')}
                                        className='mt-0'
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Group-Based Access */}
                        <div className='space-y-4 pb-4 border-b border-border'>
                            <h3 className='text-sm font-semibold text-foreground'>{t('admin.ldapProviders.form.groupBasedAccess')}</h3>
                            <div className='space-y-2'>
                                <Label htmlFor='ldap-group-attr' className='flex items-center gap-2 text-foreground font-medium'>
                                    <Users className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.ldapProviders.form.groupAttribute')}
                                </Label>
                                <Input
                                    id='ldap-group-attr'
                                    value={editing.group_attribute || ''}
                                    onChange={(e) => setEditing({ ...editing, group_attribute: e.target.value })}
                                    placeholder={t('admin.ldapProviders.form.groupAttributePlaceholder')}
                                    className='mt-0'
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='ldap-required-group' className='flex items-center gap-2 text-foreground font-medium'>
                                    <Users className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.ldapProviders.form.requiredGroup')}
                                </Label>
                                <Input
                                    id='ldap-required-group'
                                    value={editing.required_group || ''}
                                    onChange={(e) => setEditing({ ...editing, required_group: e.target.value })}
                                    placeholder={t('admin.ldapProviders.form.requiredGroupPlaceholder')}
                                    className='mt-0'
                                />
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.ldapProviders.form.requiredGroupHelp')}
                                </p>
                            </div>
                        </div>

                        {/* Provisioning Options */}
                        <div className='flex flex-col gap-4 pt-2'>
                            <h3 className='text-sm font-semibold text-foreground'>{t('admin.ldapProviders.form.provisioningOptions')}</h3>
                            <div className='flex items-center justify-between gap-4'>
                                <div>
                                    <Label htmlFor='ldap-auto-provision' className='flex items-center gap-2 text-foreground font-medium'>
                                        <Shield className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.autoProvisionLabel')}
                                    </Label>
                                    <p className='text-xs text-muted-foreground mt-1'>
                                        {t('admin.ldapProviders.form.autoProvisionHelp')}
                                    </p>
                                </div>
                                <Switch
                                    id='ldap-auto-provision'
                                    checked={editing.auto_provision === 'true'}
                                    onCheckedChange={(checked) =>
                                        setEditing({ ...editing, auto_provision: checked ? 'true' : 'false' })
                                    }
                                />
                            </div>
                            <div className='flex items-center justify-between gap-4'>
                                <div>
                                    <Label htmlFor='ldap-sync-attrs' className='flex items-center gap-2 text-foreground font-medium'>
                                        <Mail className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.syncAttributesLabel')}
                                    </Label>
                                    <p className='text-xs text-muted-foreground mt-1'>
                                        {t('admin.ldapProviders.form.syncAttributesHelp')}
                                    </p>
                                </div>
                                <Switch
                                    id='ldap-sync-attrs'
                                    checked={editing.sync_attributes === 'true'}
                                    onCheckedChange={(checked) =>
                                        setEditing({ ...editing, sync_attributes: checked ? 'true' : 'false' })
                                    }
                                />
                            </div>
                            <div className='flex items-center justify-between gap-4'>
                                <div>
                                    <Label htmlFor='ldap-generate-email' className='flex items-center gap-2 text-foreground font-medium'>
                                        <Mail className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.generateEmailLabel')}
                                    </Label>
                                    <p className='text-xs text-muted-foreground mt-1'>
                                        {t('admin.ldapProviders.form.generateEmailHelp')}
                                    </p>
                                </div>
                                <Switch
                                    id='ldap-generate-email'
                                    checked={editing.generate_email_if_missing === 'true'}
                                    onCheckedChange={(checked) =>
                                        setEditing({ ...editing, generate_email_if_missing: checked ? 'true' : 'false' })
                                    }
                                />
                            </div>
                            <div className='flex items-center justify-between gap-4'>
                                <div>
                                    <Label htmlFor='ldap-enabled' className='flex items-center gap-2 text-foreground font-medium'>
                                        <Server className='h-4 w-4 text-muted-foreground' />
                                        {t('admin.ldapProviders.form.enableProviderLabel')}
                                    </Label>
                                    <p className='text-xs text-muted-foreground mt-1'>
                                        {t('admin.ldapProviders.form.enableProviderHelp')}
                                    </p>
                                </div>
                                <Switch
                                    id='ldap-enabled'
                                    checked={editing.enabled === 'true'}
                                    onCheckedChange={(checked) =>
                                        setEditing({ ...editing, enabled: checked ? 'true' : 'false' })
                                    }
                                />
                            </div>
                        </div>

                        <div className='flex items-center justify-end gap-2 pt-4'>
                            <Button variant='outline' onClick={() => setEditing(null)} disabled={saving}>
                                {t('admin.ldapProviders.cancel')}
                            </Button>
                            <Button onClick={handleSave} loading={saving}>
                                {t('admin.ldapProviders.save')}
                            </Button>
                        </div>
                    </div>
                </PageCard>
            )}
        </div>
    );
}
