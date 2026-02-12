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
import Image from 'next/image';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Description, Field, Fieldset, Label } from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import axios from 'axios';
import { toast } from 'sonner';
import Turnstile from 'react-turnstile';
import { Switch } from '@/components/ui/switch';
import { cn, isEnabled } from '@/lib/utils';
import { getAnalyticsCookie, setAnalyticsCookie } from '@/lib/analytics-cookie';

interface FormData {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    avatar: string;
    ticket_signature: string;
}

export default function ProfileTab() {
    const { t } = useTranslation();
    const { user, fetchSession } = useSession();
    const { settings } = useSettings();

    const [formData, setFormData] = useState<FormData>({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        avatar: '',
        ticket_signature: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(0);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

    const allowAvatarChange = settings?.user_allow_avatar_change ?? true;
    const allowUsernameChange = settings?.user_allow_username_change ?? true;
    const allowEmailChange = settings?.user_allow_email_change ?? true;
    const allowFirstNameChange = settings?.user_allow_first_name_change ?? true;
    const allowLastNameChange = settings?.user_allow_last_name_change ?? true;

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                password: '',
                avatar: user.avatar || '',
                ticket_signature: user.ticket_signature || '',
            });
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        setAnalyticsEnabled(getAnalyticsCookie());
    }, []);

    const resetForm = () => {
        if (user) {
            setFormData({
                username: user.username || '',
                email: user.email || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                password: '',
                avatar: user.avatar || '',
                ticket_signature: user.ticket_signature || '',
            });
        }
        setAvatarFile(null);
        resetTurnstile();
    };

    const resetTurnstile = () => {
        if (isEnabled(settings?.turnstile_enabled)) {
            setTurnstileToken('');
            setTurnstileKey((prev) => prev + 1);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData((prev) => ({ ...prev, avatar: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyticsChange = (enabled: boolean) => {
        setAnalyticsCookie(enabled);
        setAnalyticsEnabled(enabled);
        window.location.reload();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (isEnabled(settings?.turnstile_enabled) && !turnstileToken) {
                toast.error('Please complete the CAPTCHA verification');
                return;
            }

            setIsSubmitting(true);

            const submitData: Record<string, string> = {};

            if (allowUsernameChange && formData.username !== (user?.username || '')) {
                submitData.username = formData.username;
            }

            if (allowFirstNameChange && formData.first_name !== (user?.first_name || '')) {
                submitData.first_name = formData.first_name;
            }

            if (allowLastNameChange && formData.last_name !== (user?.last_name || '')) {
                submitData.last_name = formData.last_name;
            }

            if (allowEmailChange && formData.email !== (user?.email || '')) {
                submitData.email = formData.email;
            }

            if (allowAvatarChange && avatarFile) {
                setIsUploadingAvatar(true);
                try {
                    const formDataUpload = new FormData();
                    formDataUpload.append('avatar', avatarFile);

                    const uploadResponse = await axios.post('/api/user/avatar', formDataUpload, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });

                    if (uploadResponse.data.success) {
                        submitData.avatar = uploadResponse.data.data.avatar_url;
                    } else {
                        toast.error(uploadResponse.data.message || t('account.avatarUploadFailed'));
                        resetTurnstile();
                        return;
                    }
                } finally {
                    setIsUploadingAvatar(false);
                }
            }

            if (formData.password && formData.password.trim() !== '') {
                submitData.password = formData.password;
            }

            if (formData.ticket_signature !== (user?.ticket_signature || '')) {
                submitData.ticket_signature = formData.ticket_signature;
            }

            if (isEnabled(settings?.turnstile_enabled)) {
                submitData.turnstile_token = turnstileToken;
            }

            const changedKeys = Object.keys(submitData).filter((key) => key !== 'turnstile_token');
            if (changedKeys.length === 0) {
                toast.info(t('account.noChanges'));
                resetTurnstile();
                return;
            }

            const response = await axios.patch('/api/user/session', submitData);

            if (response.data.success) {
                await fetchSession(true);
                toast.success(t('account.profileUpdated'));
                setFormData((prev) => ({ ...prev, password: '' }));
                setAvatarFile(null);
            } else {
                toast.error(response.data.message || t('account.updateFailed'));
                resetTurnstile();
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || t('account.unexpectedError'));
            resetTurnstile();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent'></div>
                    <span className='text-muted-foreground'>{t('account.loadingProfile')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div>
                <h3 className='text-lg font-semibold text-foreground'>{t('account.editProfile')}</h3>
                <p className='text-sm text-muted-foreground mt-1'>{t('account.editProfileDescription')}</p>
            </div>

            <form onSubmit={handleSubmit} className='space-y-6'>
                <Fieldset className='space-y-6'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        {allowUsernameChange && (
                            <Field>
                                <Label className='text-sm font-medium text-foreground'>{t('account.username')}</Label>
                                <Input
                                    value={formData.username}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                                    disabled={isSubmitting}
                                    placeholder={t('account.usernamePlaceholder')}
                                    className='mt-2'
                                />
                            </Field>
                        )}

                        {allowEmailChange && (
                            <Field>
                                <Label className='text-sm font-medium text-foreground'>{t('account.email')}</Label>
                                <Input
                                    type='email'
                                    value={formData.email}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                                    disabled={isSubmitting}
                                    placeholder={t('account.emailPlaceholder')}
                                    className='mt-2'
                                />
                            </Field>
                        )}

                        {allowFirstNameChange && (
                            <Field>
                                <Label className='text-sm font-medium text-foreground'>{t('account.firstName')}</Label>
                                <Input
                                    value={formData.first_name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                                    disabled={isSubmitting}
                                    placeholder={t('account.firstNamePlaceholder')}
                                    className='mt-2'
                                />
                            </Field>
                        )}

                        {allowLastNameChange && (
                            <Field>
                                <Label className='text-sm font-medium text-foreground'>{t('account.lastName')}</Label>
                                <Input
                                    value={formData.last_name}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                                    disabled={isSubmitting}
                                    placeholder={t('account.lastNamePlaceholder')}
                                    className='mt-2'
                                />
                            </Field>
                        )}

                        {allowAvatarChange && (
                            <Field>
                                <Label className='text-sm font-medium text-foreground'>{t('account.avatar')}</Label>
                                <input
                                    type='file'
                                    accept='image/*'
                                    onChange={handleAvatarChange}
                                    disabled={isSubmitting || isUploadingAvatar}
                                    className={cn(
                                        'mt-2 block w-full text-sm text-foreground',
                                        'file:mr-4 file:py-2 file:px-4',
                                        'file:rounded-lg file:border-0',
                                        'file:text-sm file:font-semibold',
                                        'file:bg-primary file:text-primary-foreground',
                                        'hover:file:bg-primary/90',
                                        'file:cursor-pointer cursor-pointer',
                                        'disabled:opacity-50 disabled:cursor-not-allowed',
                                    )}
                                />
                                {formData.avatar && (
                                    <div className='mt-3'>
                                        <Image
                                            src={formData.avatar}
                                            alt='Avatar preview'
                                            width={80}
                                            height={80}
                                            className='h-20 w-20 rounded-full object-cover border-2 border-primary/20'
                                            unoptimized
                                        />
                                    </div>
                                )}
                            </Field>
                        )}

                        <Field>
                            <Label className='text-sm font-medium text-foreground'>{t('account.newPassword')}</Label>
                            <Input
                                type='password'
                                value={formData.password}
                                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                                disabled={isSubmitting}
                                placeholder={t('account.passwordPlaceholder')}
                                className='mt-2'
                            />
                            <Description className='text-xs text-muted-foreground mt-1'>
                                {t('account.passwordHint')}
                            </Description>
                        </Field>
                    </div>

                    <Field>
                        <Label className='text-sm font-medium text-foreground'>{t('account.ticketSignature')}</Label>
                        <Textarea
                            value={formData.ticket_signature}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setFormData((prev) => ({ ...prev, ticket_signature: e.target.value }))
                            }
                            disabled={isSubmitting}
                            placeholder={t('account.ticketSignaturePlaceholder')}
                            rows={4}
                            className='mt-2 font-mono'
                        />
                        <Description className='text-xs text-muted-foreground mt-1'>
                            {t('account.ticketSignatureHint')}
                        </Description>
                    </Field>

                    <div className='space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4'>
                        <div>
                            <Label className='text-sm font-medium text-foreground'>{t('account.analytics')}</Label>
                            <p className='text-xs text-muted-foreground mt-0.5'>{t('account.analyticsDescription')}</p>
                        </div>
                        <div className='flex items-center justify-between gap-4'>
                            <span className='text-sm text-foreground'>{t('account.analyticsEnabled')}</span>
                            <Switch
                                checked={analyticsEnabled}
                                onCheckedChange={handleAnalyticsChange}
                                aria-label={t('account.analyticsEnabled')}
                            />
                        </div>
                    </div>
                </Fieldset>

                <div className='space-y-4 pt-4 border-t border-border'>
                    {isEnabled(settings?.turnstile_enabled) && settings?.turnstile_key_pub && (
                        <div className='flex justify-start'>
                            <Turnstile
                                key={turnstileKey}
                                sitekey={settings.turnstile_key_pub}
                                onVerify={(token) => setTurnstileToken(token)}
                            />
                        </div>
                    )}

                    <div className='flex gap-3'>
                        <Button type='submit' disabled={isSubmitting || isUploadingAvatar} className='min-w-[120px]'>
                            {isSubmitting ? t('account.saving') : t('account.saveChanges')}
                        </Button>

                        <Button type='button' variant='outline' disabled={isSubmitting} onClick={resetForm}>
                            {t('account.reset')}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
