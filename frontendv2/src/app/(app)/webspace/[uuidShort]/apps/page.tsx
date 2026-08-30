/*
This file is part of FeatherPanel.
*/

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
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { AppWindow, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';

export default function WebSpaceAppsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const uuidShort = String(params.uuidShort || '');
    const [busy, setBusy] = useState<string | null>(null);
    const [form, setForm] = useState({
        directory: '/',
        site_title: 'WordPress',
        admin_user: 'admin',
        admin_password: '',
        admin_email: '',
    });
    const [result, setResult] = useState<{ url?: string; directory?: string } | null>(null);
    const [git, setGit] = useState({ repo: '', ref: 'main', directory: '/', token: '' });
    const [stagingDir, setStagingDir] = useState('/staging');
    const [pluginSlug, setPluginSlug] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [deployKeyPublic, setDeployKeyPublic] = useState('');

    const loadDeployKey = async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/apps/git-deploy-key`);
            setDeployKeyPublic(String(data?.data?.public_key ?? ''));
        } catch {
            setDeployKeyPublic('');
        }
    };

    useEffect(() => {
        void loadDeployKey();
    }, [uuidShort]);

    const regenerateDeployKey = async () => {
        setBusy('deploykey');
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/apps/git-deploy-key`);
            setDeployKeyPublic(String(data?.data?.public_key ?? ''));
            toast.success(t('webSpaces.apps.deployKeyRegenerated'));
        } catch (error) {
            let msg = t('webSpaces.apps.deployKeyFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const install = async () => {
        if (!form.admin_user.trim() || !form.admin_password || !form.admin_email.trim()) {
            toast.error(t('webSpaces.apps.wordpressFieldsRequired'));
            return;
        }
        setBusy('install');
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/apps/wordpress`, form);
            setResult(data?.data ?? null);
            toast.success(t('webSpaces.apps.wordpressSuccess'));
        } catch (error) {
            let msg = t('webSpaces.apps.wordpressFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const updateWp = async () => {
        setBusy('update');
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/apps/wordpress/update`, {
                directory: form.directory,
            });
            toast.success(t('webSpaces.apps.wordpressUpdated'));
        } catch (error) {
            let msg = t('webSpaces.apps.wordpressUpdateFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const createStaging = async () => {
        setBusy('staging');
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/apps/wordpress/staging`, {
                source: form.directory,
                directory: stagingDir,
            });
            setResult(data?.data ?? null);
            toast.success(t('webSpaces.apps.stagingSuccess'));
        } catch (error) {
            let msg = t('webSpaces.apps.stagingFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const installPlugin = async () => {
        if (!pluginSlug.trim()) {
            toast.error(t('webSpaces.apps.pluginSlugRequired'));
            return;
        }
        setBusy('plugin');
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/apps/wordpress/plugin`, {
                directory: form.directory,
                slug: pluginSlug.trim(),
            });
            toast.success(t('webSpaces.apps.pluginInstalled'));
        } catch (error) {
            let msg = t('webSpaces.apps.pluginFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const enableAutoUpdate = async () => {
        setBusy('autoupdate');
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/apps/wordpress/auto-update`, {
                directory: form.directory,
            });
            toast.success(t('webSpaces.apps.autoUpdateEnabled'));
        } catch (error) {
            let msg = t('webSpaces.apps.autoUpdateFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const deployGit = async () => {
        if (!git.repo.trim()) {
            toast.error(t('webSpaces.apps.gitRepoRequired'));
            return;
        }
        setBusy('git');
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/apps/git-deploy`, git);
            toast.success(t('webSpaces.apps.gitSuccess'));
        } catch (error) {
            let msg = t('webSpaces.apps.gitFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const saveWebhook = async () => {
        if (!git.repo.trim()) {
            toast.error(t('webSpaces.apps.gitRepoRequired'));
            return;
        }
        setBusy('webhook');
        try {
            const { data } = await axios.put(`/api/user/webspaces/${uuidShort}/apps/git-webhook`, {
                ...git,
                secret: webhookSecret || undefined,
            });
            setWebhookUrl(String(data?.data?.webhook_url ?? ''));
            setWebhookSecret(String(data?.data?.config?.secret ?? ''));
            toast.success(t('webSpaces.apps.webhookSaved'));
        } catch (error) {
            let msg = t('webSpaces.apps.webhookFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    return (
        <WebSpacePageWidgets pageId='webspace-apps'>
            <div className='mx-auto max-w-3xl space-y-8 pb-16'>
                <PageHeader title={t('webSpaces.apps.title')} description={t('webSpaces.apps.description')} />
                <PageCard title={t('webSpaces.apps.wordpressTitle')} icon={AppWindow}>
                    <div className='space-y-4'>
                        <p className='text-muted-foreground text-sm'>{t('webSpaces.apps.wordpressHelp')}</p>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <div className='space-y-2 sm:col-span-2'>
                                <Label>{t('webSpaces.apps.directory')}</Label>
                                <Input
                                    value={form.directory}
                                    onChange={(e) => setForm({ ...form, directory: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2 sm:col-span-2'>
                                <Label>{t('webSpaces.apps.siteTitle')}</Label>
                                <Input
                                    value={form.site_title}
                                    onChange={(e) => setForm({ ...form, site_title: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('webSpaces.apps.adminUser')}</Label>
                                <Input
                                    value={form.admin_user}
                                    onChange={(e) => setForm({ ...form, admin_user: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('webSpaces.apps.adminEmail')}</Label>
                                <Input
                                    type='email'
                                    value={form.admin_email}
                                    onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2 sm:col-span-2'>
                                <Label>{t('webSpaces.apps.adminPassword')}</Label>
                                <Input
                                    type='password'
                                    value={form.admin_password}
                                    onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            <Button loading={busy === 'install'} onClick={() => void install()}>
                                {busy === 'install' ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                                {t('webSpaces.apps.installWordPress')}
                            </Button>
                            <Button variant='outline' loading={busy === 'update'} onClick={() => void updateWp()}>
                                {t('webSpaces.apps.updateWordPress')}
                            </Button>
                        </div>
                        <div className='flex flex-wrap items-end gap-2'>
                            <div className='min-w-[12rem] flex-1 space-y-2'>
                                <Label>{t('webSpaces.apps.stagingDirectory')}</Label>
                                <Input value={stagingDir} onChange={(e) => setStagingDir(e.target.value)} />
                            </div>
                            <Button variant='outline' loading={busy === 'staging'} onClick={() => void createStaging()}>
                                {t('webSpaces.apps.createStaging')}
                            </Button>
                        </div>
                        <div className='flex flex-wrap items-end gap-2'>
                            <div className='min-w-[12rem] flex-1 space-y-2'>
                                <Label>{t('webSpaces.apps.pluginSlug')}</Label>
                                <Input
                                    value={pluginSlug}
                                    onChange={(e) => setPluginSlug(e.target.value)}
                                    placeholder='akismet'
                                />
                            </div>
                            <Button variant='outline' loading={busy === 'plugin'} onClick={() => void installPlugin()}>
                                {t('webSpaces.apps.installPlugin')}
                            </Button>
                        </div>
                        <Button
                            variant='outline'
                            loading={busy === 'autoupdate'}
                            onClick={() => void enableAutoUpdate()}
                        >
                            {t('webSpaces.apps.enableAutoUpdate')}
                        </Button>
                        {result?.url && (
                            <p className='text-sm'>
                                <a
                                    className='text-primary underline'
                                    href={result.url}
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    {result.url}
                                </a>
                            </p>
                        )}
                        <Button variant='outline' size='sm' onClick={() => router.push(`/webspace/${uuidShort}/files`)}>
                            {t('webSpaces.apps.openFileManager')}
                        </Button>
                    </div>
                </PageCard>
                <PageCard title={t('webSpaces.apps.gitTitle')} icon={AppWindow}>
                    <div className='space-y-4'>
                        <p className='text-muted-foreground text-sm'>{t('webSpaces.apps.gitHelp')}</p>
                        <div className='space-y-2'>
                            <Label>{t('webSpaces.apps.gitRepo')}</Label>
                            <Input
                                value={git.repo}
                                onChange={(e) => setGit({ ...git, repo: e.target.value })}
                                placeholder='https://github.com/org/repo.git or git@github.com:org/repo.git'
                            />
                        </div>
                        <div className='border-border/20 space-y-3 rounded-lg border p-3'>
                            <p className='text-muted-foreground text-sm'>{t('webSpaces.apps.deployKeyHelp')}</p>
                            {deployKeyPublic ? (
                                <p className='text-muted-foreground font-mono text-xs break-all'>{deployKeyPublic}</p>
                            ) : (
                                <p className='text-muted-foreground text-xs'>{t('webSpaces.apps.deployKeyMissing')}</p>
                            )}
                            <Button
                                variant='outline'
                                size='sm'
                                loading={busy === 'deploykey'}
                                onClick={() => void regenerateDeployKey()}
                            >
                                {t('webSpaces.apps.regenerateDeployKey')}
                            </Button>
                        </div>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <div className='space-y-2'>
                                <Label>{t('webSpaces.apps.gitRef')}</Label>
                                <Input value={git.ref} onChange={(e) => setGit({ ...git, ref: e.target.value })} />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('webSpaces.apps.directory')}</Label>
                                <Input
                                    value={git.directory}
                                    onChange={(e) => setGit({ ...git, directory: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('webSpaces.apps.gitToken')}</Label>
                            <Input
                                type='password'
                                value={git.token}
                                onChange={(e) => setGit({ ...git, token: e.target.value })}
                            />
                        </div>
                        <Button loading={busy === 'git'} onClick={() => void deployGit()}>
                            {t('webSpaces.apps.gitDeploy')}
                        </Button>
                        <div className='border-border/20 space-y-3 border-t pt-4'>
                            <p className='text-muted-foreground text-sm'>{t('webSpaces.apps.webhookHelp')}</p>
                            <Button variant='outline' loading={busy === 'webhook'} onClick={() => void saveWebhook()}>
                                {t('webSpaces.apps.saveWebhook')}
                            </Button>
                            {webhookUrl && (
                                <div className='space-y-1'>
                                    <p className='text-muted-foreground font-mono text-xs break-all'>{webhookUrl}</p>
                                    {webhookSecret && (
                                        <p className='text-muted-foreground font-mono text-xs break-all'>
                                            secret={webhookSecret}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </PageCard>
            </div>
        </WebSpacePageWidgets>
    );
}
