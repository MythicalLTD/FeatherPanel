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

import * as React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { PageCard } from '@/components/featherui/PageCard';
import { HardDrive, KeyRound, Server } from 'lucide-react';

export type DestinationType = 'sftp' | 's3';

export type DestinationCredentials = {
    host: string;
    port: string;
    username: string;
    password: string;
    private_key: string;
    endpoint: string;
    region: string;
    bucket: string;
    prefix: string;
    access_key: string;
    secret_key: string;
    path_style: '1' | '0';
};

export type DestinationFormState = {
    name: string;
    type: DestinationType;
    base_path: string;
    credentials: DestinationCredentials;
};

export function emptyDestinationForm(): DestinationFormState {
    return {
        name: '',
        type: 'sftp',
        base_path: '',
        credentials: {
            host: '',
            port: '22',
            username: '',
            password: '',
            private_key: '',
            endpoint: '',
            region: 'us-east-1',
            bucket: '',
            prefix: 'wings-backups',
            access_key: '',
            secret_key: '',
            path_style: '1',
        },
    };
}

export function buildDestinationPayload(form: DestinationFormState) {
    const { name, type, base_path, credentials: creds } = form;
    const credentials =
        type === 'sftp'
            ? {
                  host: creds.host,
                  port: Number(creds.port) || 22,
                  username: creds.username,
                  password: creds.password || undefined,
                  private_key: creds.private_key || undefined,
                  base_path,
              }
            : {
                  endpoint: creds.endpoint || undefined,
                  region: creds.region,
                  bucket: creds.bucket,
                  prefix: creds.prefix,
                  access_key: creds.access_key,
                  secret_key: creds.secret_key,
                  path_style: creds.path_style === '1',
              };
    return { name: name.trim(), type, base_path, credentials };
}

type Props = {
    form: DestinationFormState;
    setForm: React.Dispatch<React.SetStateAction<DestinationFormState>>;
    disabled?: boolean;
    /** Edit mode: type/credentials locked; only name + base path editable. */
    editMode?: boolean;
};

export function DestinationFormFields({ form, setForm, disabled = false, editMode = false }: Props) {
    const { t } = useTranslation();
    const setCred = (patch: Partial<DestinationCredentials>) =>
        setForm((prev) => ({ ...prev, credentials: { ...prev.credentials, ...patch } }));

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('adminWingsBackups.destinationBasics')}
                description={t('adminWingsBackups.destinationBasicsHelp')}
                icon={HardDrive}
                className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
            >
                <div className='space-y-6'>
                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('adminWingsBackups.name')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
                        <Input
                            value={form.name}
                            disabled={disabled}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder={t('adminWingsBackups.destinationNamePlaceholder')}
                            className='bg-muted/30 h-11'
                        />
                    </div>

                    {!editMode && (
                        <div className='space-y-3'>
                            <Label>{t('adminWingsBackups.type')}</Label>
                            <HeadlessSelect
                                value={form.type}
                                disabled={disabled}
                                onChange={(val) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        type: String(val) as DestinationType,
                                    }))
                                }
                                options={[
                                    { id: 'sftp', name: t('adminWingsBackups.typeSftp') },
                                    { id: 's3', name: t('adminWingsBackups.typeS3') },
                                ]}
                                placeholder={t('adminWingsBackups.selectType')}
                            />
                            <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.typeHelp')}</p>
                        </div>
                    )}

                    <div className='space-y-3'>
                        <Label>{t('adminWingsBackups.basePath')}</Label>
                        <Input
                            value={form.base_path}
                            disabled={disabled}
                            onChange={(e) => setForm((prev) => ({ ...prev, base_path: e.target.value }))}
                            placeholder={t('adminWingsBackups.basePathPlaceholder')}
                            className='bg-muted/30 h-11 font-mono'
                        />
                        <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.basePathHelp')}</p>
                    </div>
                </div>
            </PageCard>

            {!editMode && form.type === 'sftp' && (
                <PageCard
                    title={t('adminWingsBackups.sftpConnection')}
                    description={t('adminWingsBackups.sftpConnectionHelp')}
                    icon={Server}
                    className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
                >
                    <div className='space-y-6'>
                        <div className='grid gap-4 sm:grid-cols-3'>
                            <div className='space-y-3 sm:col-span-2'>
                                <Label className='flex items-center gap-1.5'>
                                    {t('adminWingsBackups.host')}
                                    <span className='font-bold text-red-500'>*</span>
                                </Label>
                                <Input
                                    value={form.credentials.host}
                                    disabled={disabled}
                                    onChange={(e) => setCred({ host: e.target.value })}
                                    placeholder={t('adminWingsBackups.hostPlaceholder')}
                                    className='bg-muted/30 h-11'
                                />
                            </div>
                            <div className='space-y-3'>
                                <Label>{t('adminWingsBackups.port')}</Label>
                                <Input
                                    value={form.credentials.port}
                                    disabled={disabled}
                                    onChange={(e) => setCred({ port: e.target.value })}
                                    placeholder='22'
                                    className='bg-muted/30 h-11 font-mono'
                                />
                            </div>
                        </div>
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('adminWingsBackups.username')}
                                <span className='font-bold text-red-500'>*</span>
                            </Label>
                            <Input
                                value={form.credentials.username}
                                disabled={disabled}
                                onChange={(e) => setCred({ username: e.target.value })}
                                placeholder={t('adminWingsBackups.usernamePlaceholder')}
                                className='bg-muted/30 h-11'
                            />
                        </div>
                        <div className='space-y-3'>
                            <Label>{t('adminWingsBackups.password')}</Label>
                            <Input
                                type='password'
                                value={form.credentials.password}
                                disabled={disabled}
                                onChange={(e) => setCred({ password: e.target.value })}
                                placeholder={t('adminWingsBackups.passwordPlaceholder')}
                                className='bg-muted/30 h-11'
                            />
                            <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.passwordHelp')}</p>
                        </div>
                    </div>
                </PageCard>
            )}

            {!editMode && form.type === 'sftp' && (
                <PageCard
                    title={t('adminWingsBackups.privateKey')}
                    description={t('adminWingsBackups.privateKeyHelp')}
                    icon={KeyRound}
                    className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
                >
                    <Textarea
                        value={form.credentials.private_key}
                        disabled={disabled}
                        onChange={(e) => setCred({ private_key: e.target.value })}
                        placeholder={t('adminWingsBackups.privateKeyPlaceholder')}
                        className='min-h-36 font-mono text-xs'
                    />
                </PageCard>
            )}

            {!editMode && form.type === 's3' && (
                <PageCard
                    title={t('adminWingsBackups.s3Connection')}
                    description={t('adminWingsBackups.s3ConnectionHelp')}
                    icon={Server}
                    className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
                >
                    <div className='space-y-6'>
                        <div className='space-y-3'>
                            <Label>{t('adminWingsBackups.endpoint')}</Label>
                            <Input
                                value={form.credentials.endpoint}
                                disabled={disabled}
                                onChange={(e) => setCred({ endpoint: e.target.value })}
                                placeholder={t('adminWingsBackups.endpointPlaceholder')}
                                className='bg-muted/30 h-11'
                            />
                            <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.endpointHelp')}</p>
                        </div>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <div className='space-y-3'>
                                <Label>{t('adminWingsBackups.region')}</Label>
                                <Input
                                    value={form.credentials.region}
                                    disabled={disabled}
                                    onChange={(e) => setCred({ region: e.target.value })}
                                    placeholder='us-east-1'
                                    className='bg-muted/30 h-11'
                                />
                            </div>
                            <div className='space-y-3'>
                                <Label className='flex items-center gap-1.5'>
                                    {t('adminWingsBackups.bucket')}
                                    <span className='font-bold text-red-500'>*</span>
                                </Label>
                                <Input
                                    value={form.credentials.bucket}
                                    disabled={disabled}
                                    onChange={(e) => setCred({ bucket: e.target.value })}
                                    placeholder={t('adminWingsBackups.bucketPlaceholder')}
                                    className='bg-muted/30 h-11'
                                />
                            </div>
                        </div>
                        <div className='space-y-3'>
                            <Label>{t('adminWingsBackups.prefix')}</Label>
                            <Input
                                value={form.credentials.prefix}
                                disabled={disabled}
                                onChange={(e) => setCred({ prefix: e.target.value })}
                                placeholder='wings-backups'
                                className='bg-muted/30 h-11 font-mono'
                            />
                        </div>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <div className='space-y-3'>
                                <Label className='flex items-center gap-1.5'>
                                    {t('adminWingsBackups.accessKey')}
                                    <span className='font-bold text-red-500'>*</span>
                                </Label>
                                <Input
                                    value={form.credentials.access_key}
                                    disabled={disabled}
                                    onChange={(e) => setCred({ access_key: e.target.value })}
                                    className='bg-muted/30 h-11'
                                />
                            </div>
                            <div className='space-y-3'>
                                <Label className='flex items-center gap-1.5'>
                                    {t('adminWingsBackups.secretKey')}
                                    <span className='font-bold text-red-500'>*</span>
                                </Label>
                                <Input
                                    type='password'
                                    value={form.credentials.secret_key}
                                    disabled={disabled}
                                    onChange={(e) => setCred({ secret_key: e.target.value })}
                                    className='bg-muted/30 h-11'
                                />
                            </div>
                        </div>
                        <div className='divide-border/50 border-border/50 divide-y rounded-xl border'>
                            <div className='flex items-center justify-between gap-4 px-4 py-3.5'>
                                <div className='min-w-0 space-y-0.5'>
                                    <Label className='text-sm font-medium'>{t('adminWingsBackups.pathStyle')}</Label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('adminWingsBackups.pathStyleHelp')}
                                    </p>
                                </div>
                                <Switch
                                    checked={form.credentials.path_style === '1'}
                                    disabled={disabled}
                                    onCheckedChange={(checked) => setCred({ path_style: checked ? '1' : '0' })}
                                />
                            </div>
                        </div>
                    </div>
                </PageCard>
            )}

            {editMode && (
                <PageCard
                    title={t('adminWingsBackups.credentialsLocked')}
                    icon={KeyRound}
                    className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
                >
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('adminWingsBackups.credentialsLockedHelp')}
                    </p>
                </PageCard>
            )}
        </div>
    );
}
