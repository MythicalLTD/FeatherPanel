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
import { ShieldCheck, User, Link, Key, Lock, Mail, Hash, Users, Shield } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface OidcProvider {
    uuid: string;
    name: string;
    issuer_url: string;
    client_id: string;
    scopes: string;
    email_claim: string;
    subject_claim: string;
    group_claim?: string | null;
    group_value?: string | null;
    auto_provision: 'true' | 'false';
    require_email_verified: 'true' | 'false';
    enabled: 'true' | 'false';
}

export default function OidcProvidersPage() {
    const { t } = useTranslation();
    const [providers, setProviders] = useState<OidcProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<OidcProvider | null>(null);
    const [clientSecret, setClientSecret] = useState('');

    const fetchProviders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/oidc/providers', { cache: 'no-store' });
            const json = await res.json();
            if (json.success && Array.isArray(json.data?.providers)) {
                setProviders(json.data.providers);
            } else {
                toast.error(json.message || t('admin.oidcProviders.messages.fetch_failed'));
            }
        } catch {
            toast.error(t('admin.oidcProviders.messages.fetch_failed'));
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
            issuer_url: '',
            client_id: '',
            scopes: 'openid email profile',
            email_claim: 'email',
            subject_claim: 'sub',
            group_claim: '',
            group_value: '',
            auto_provision: 'false',
            require_email_verified: 'false',
            enabled: 'true',
        });
        setClientSecret('');
    };

    const handleCreateNew = () => {
        resetForm();
    };

    const handleEdit = (provider: OidcProvider) => {
        setEditing(provider);
        setClientSecret('');
    };

    const handleDelete = async (provider: OidcProvider) => {
        if (!confirm(t('admin.oidcProviders.deleteConfirm', { name: provider.name }))) return;

        try {
            const res = await fetch(`/api/admin/oidc/providers/${provider.uuid}`, {
                method: 'DELETE',
            });
            const json = await res.json();
            if (json.success) {
                toast.success(t('admin.oidcProviders.messages.deleted'));
                fetchProviders();
            } else {
                toast.error(json.message || t('admin.oidcProviders.messages.delete_failed'));
            }
        } catch {
            toast.error(t('admin.oidcProviders.messages.delete_failed'));
        }
    };

    const handleSave = async () => {
        if (!editing) return;
        setSaving(true);

        const payload: Partial<OidcProvider> & { client_secret?: string } = {
            name: editing.name,
            issuer_url: editing.issuer_url,
            client_id: editing.client_id,
            scopes: editing.scopes,
            email_claim: editing.email_claim,
            subject_claim: editing.subject_claim,
            group_claim: editing.group_claim || '',
            group_value: editing.group_value || '',
            auto_provision: editing.auto_provision,
            require_email_verified: editing.require_email_verified,
            enabled: editing.enabled,
        };

        if (clientSecret) {
            payload.client_secret = clientSecret;
        }

        try {
            const isNew = !editing.uuid;
            const res = await fetch(isNew ? '/api/admin/oidc/providers' : `/api/admin/oidc/providers/${editing.uuid}`, {
                method: isNew ? 'PUT' : 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (json.success) {
                toast.success(t('admin.oidcProviders.messages.saved'));
                setEditing(null);
                setClientSecret('');
                fetchProviders();
            } else {
                toast.error(json.message || t('admin.oidcProviders.messages.save_failed'));
            }
        } catch {
            toast.error(t('admin.oidcProviders.messages.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.oidcProviders.title')}
                description={t('admin.oidcProviders.description')}
                icon={ShieldCheck}
            />

            <PageCard
                title={t('admin.oidcProviders.configuredProviders')}
                icon={ShieldCheck}
                action={
                    <Button onClick={handleCreateNew} size='sm'>
                        {t('admin.oidcProviders.addProvider')}
                    </Button>
                }
            >
                {loading ? (
                    <div className='py-8 text-center text-muted-foreground'>{t('admin.oidcProviders.loading')}</div>
                ) : providers.length === 0 ? (
                    <div className='py-8 text-center text-muted-foreground'>{t('admin.oidcProviders.noProviders')}</div>
                ) : (
                    <div className='space-y-3'>
                        {providers.map((provider) => {
                            const isEnabled = provider.enabled === 'true';
                            return (
                                <div
                                    key={provider.uuid}
                                    className='flex items-center justify-between rounded-lg border border-border px-4 py-3'
                                >
                                    <div>
                                        <div className='font-medium flex items-center gap-2'>
                                            <ShieldCheck className='h-4 w-4 text-primary' />
                                            <span>{provider.name}</span>
                                        </div>
                                        <div className='text-xs text-muted-foreground'>{provider.issuer_url}</div>
                                        <div className='mt-1'>
                                            <span
                                                className={
                                                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' +
                                                    (isEnabled
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40'
                                                        : 'bg-muted text-muted-foreground border border-border/60')
                                                }
                                            >
                                                {isEnabled
                                                    ? t('admin.oidcProviders.enabled')
                                                    : t('admin.oidcProviders.disabled')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <Button variant='outline' size='sm' onClick={() => handleEdit(provider)}>
                                            {t('admin.oidcProviders.edit')}
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={async () => {
                                                const next = isEnabled ? 'false' : 'true';
                                                try {
                                                    const res = await fetch(
                                                        `/api/admin/oidc/providers/${provider.uuid}`,
                                                        {
                                                            method: 'PATCH',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                            },
                                                            body: JSON.stringify({ enabled: next }),
                                                        },
                                                    );
                                                    const json = await res.json();
                                                    if (json.success) {
                                                        fetchProviders();
                                                    } else {
                                                        toast.error(
                                                            json.message ||
                                                                t('admin.oidcProviders.messages.toggle_failed'),
                                                        );
                                                    }
                                                } catch {
                                                    toast.error(t('admin.oidcProviders.messages.toggle_failed'));
                                                }
                                            }}
                                        >
                                            {isEnabled
                                                ? t('admin.oidcProviders.disable')
                                                : t('admin.oidcProviders.enable')}
                                        </Button>
                                        <Button variant='destructive' size='sm' onClick={() => handleDelete(provider)}>
                                            {t('admin.oidcProviders.delete')}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </PageCard>

            {editing && (
                <PageCard
                    title={
                        editing.uuid ? t('admin.oidcProviders.editProvider') : t('admin.oidcProviders.createProvider')
                    }
                    icon={Shield}
                >
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='oidc-name' className='flex items-center gap-2 text-foreground font-medium'>
                                <User className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.name')}
                            </Label>
                            <Input
                                id='oidc-name'
                                value={editing.name}
                                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                                className='mt-0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='oidc-issuer'
                                className='flex items-center gap-2 text-foreground font-medium'
                            >
                                <Link className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.issuerUrl')}
                            </Label>
                            <Input
                                id='oidc-issuer'
                                value={editing.issuer_url}
                                onChange={(e) => setEditing({ ...editing, issuer_url: e.target.value })}
                                placeholder={t('admin.oidcProviders.form.issuerUrlPlaceholder')}
                                className='mt-0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='oidc-client-id'
                                className='flex items-center gap-2 text-foreground font-medium'
                            >
                                <Key className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.clientId')}
                            </Label>
                            <Input
                                id='oidc-client-id'
                                value={editing.client_id}
                                onChange={(e) => setEditing({ ...editing, client_id: e.target.value })}
                                className='mt-0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='oidc-client-secret'
                                className='flex items-center gap-2 text-foreground font-medium'
                            >
                                <Lock className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.clientSecret')}
                            </Label>
                            <Input
                                id='oidc-client-secret'
                                type='password'
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder={editing.uuid ? t('admin.oidcProviders.form.clientSecretPlaceholder') : ''}
                                className='mt-0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='oidc-scopes'
                                className='flex items-center gap-2 text-foreground font-medium'
                            >
                                <Hash className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.scopes')}
                            </Label>
                            <Input
                                id='oidc-scopes'
                                value={editing.scopes}
                                onChange={(e) => setEditing({ ...editing, scopes: e.target.value })}
                                placeholder={t('admin.oidcProviders.form.scopesPlaceholder')}
                                className='mt-0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='oidc-email-claim'
                                className='flex items-center gap-2 text-foreground font-medium'
                            >
                                <Mail className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.emailClaim')}
                            </Label>
                            <Input
                                id='oidc-email-claim'
                                value={editing.email_claim}
                                onChange={(e) => setEditing({ ...editing, email_claim: e.target.value })}
                                placeholder={t('admin.oidcProviders.form.emailClaimPlaceholder')}
                                className='mt-0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='oidc-subject-claim'
                                className='flex items-center gap-2 text-foreground font-medium'
                            >
                                <User className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.subjectClaim')}
                            </Label>
                            <Input
                                id='oidc-subject-claim'
                                value={editing.subject_claim}
                                onChange={(e) => setEditing({ ...editing, subject_claim: e.target.value })}
                                placeholder={t('admin.oidcProviders.form.subjectClaimPlaceholder')}
                                className='mt-0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='oidc-group-claim'
                                className='flex items-center gap-2 text-foreground font-medium'
                            >
                                <Users className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.groupClaim')}
                            </Label>
                            <Input
                                id='oidc-group-claim'
                                value={editing.group_claim || ''}
                                onChange={(e) => setEditing({ ...editing, group_claim: e.target.value })}
                                placeholder={t('admin.oidcProviders.form.groupClaimPlaceholder')}
                                className='mt-0'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label
                                htmlFor='oidc-group-value'
                                className='flex items-center gap-2 text-foreground font-medium'
                            >
                                <Users className='h-4 w-4 text-muted-foreground' />
                                {t('admin.oidcProviders.form.groupValue')}
                            </Label>
                            <Input
                                id='oidc-group-value'
                                value={editing.group_value || ''}
                                onChange={(e) => setEditing({ ...editing, group_value: e.target.value })}
                                placeholder={t('admin.oidcProviders.form.groupValuePlaceholder')}
                                className='mt-0'
                            />
                        </div>

                        <div className='flex flex-col gap-4 pt-2 border-t border-border'>
                            <div className='flex items-center justify-between gap-4'>
                                <Label
                                    htmlFor='oidc-auto-provision'
                                    className='flex items-center gap-2 text-foreground font-medium'
                                >
                                    <Shield className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.oidcProviders.form.autoProvision')}
                                </Label>
                                <Switch
                                    id='oidc-auto-provision'
                                    checked={editing.auto_provision === 'true'}
                                    onCheckedChange={(checked) =>
                                        setEditing({ ...editing, auto_provision: checked ? 'true' : 'false' })
                                    }
                                />
                            </div>
                            <div className='flex items-center justify-between gap-4'>
                                <Label
                                    htmlFor='oidc-require-email'
                                    className='flex items-center gap-2 text-foreground font-medium'
                                >
                                    <Mail className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.oidcProviders.form.requireEmailVerified')}
                                </Label>
                                <Switch
                                    id='oidc-require-email'
                                    checked={editing.require_email_verified === 'true'}
                                    onCheckedChange={(checked) =>
                                        setEditing({ ...editing, require_email_verified: checked ? 'true' : 'false' })
                                    }
                                />
                            </div>
                            <div className='flex items-center justify-between gap-4'>
                                <Label
                                    htmlFor='oidc-enabled'
                                    className='flex items-center gap-2 text-foreground font-medium'
                                >
                                    <ShieldCheck className='h-4 w-4 text-muted-foreground' />
                                    {t('admin.oidcProviders.form.enabledLabel')}
                                </Label>
                                <Switch
                                    id='oidc-enabled'
                                    checked={editing.enabled === 'true'}
                                    onCheckedChange={(checked) =>
                                        setEditing({ ...editing, enabled: checked ? 'true' : 'false' })
                                    }
                                />
                            </div>
                        </div>

                        <div className='flex items-center justify-end gap-2 pt-4'>
                            <Button variant='outline' onClick={() => setEditing(null)} disabled={saving}>
                                {t('admin.oidcProviders.cancel')}
                            </Button>
                            <Button onClick={handleSave} loading={saving}>
                                {t('admin.oidcProviders.save')}
                            </Button>
                        </div>
                    </div>
                </PageCard>
            )}
        </div>
    );
}
