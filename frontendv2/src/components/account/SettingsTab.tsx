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

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { usePreferences, useDateFormatOptions } from '@/contexts/PreferencesContext';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Check, Fingerprint, Pencil, FileText, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Captcha } from '@/components/Captcha';
import { isEnabled } from '@/lib/utils';
import { isCaptchaConfigured, obtainCaptchaResponseToken } from '@/lib/captchaGate';
import { startRegistration } from '@simplewebauthn/browser';
import { passkeysApi } from '@/lib/api/passkeys';
import { format } from 'date-fns';
import {
    formatDateTimeInTz,
    getEffectiveTimezone,
    listSupportedTimezones,
    parseApiDate,
    resolveDateFnsLocale,
} from '@/lib/dateUtils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function SettingsTab() {
    const { t } = useTranslation();
    const { user, fetchSession, logout } = useSession();
    const { settings } = useSettings();
    const { preferences, timezone, setTimezone, ready: preferencesReady } = usePreferences();
    const dateOpts = useDateFormatOptions();
    const router = useRouter();
    const browserTimezone = useMemo(() => getEffectiveTimezone(null), []);
    const supportedTimezones = useMemo(() => listSupportedTimezones(), []);
    const [savingTimezone, setSavingTimezone] = useState(false);
    const [tzNowTick, setTzNowTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setTzNowTick((n) => n + 1), 30_000);
        return () => clearInterval(interval);
    }, []);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRequestingData, setIsRequestingData] = useState(false);
    const [passkeys, setPasskeys] = useState<{ id: number; label?: string | null; created_at?: string }[]>([]);
    const [passkeysLoading, setPasskeysLoading] = useState(false);
    const [addPasskeyOpen, setAddPasskeyOpen] = useState(false);
    const [passkeyNameDraft, setPasskeyNameDraft] = useState('');
    const [renamePasskeyOpen, setRenamePasskeyOpen] = useState(false);
    const [renamePasskeyId, setRenamePasskeyId] = useState<number | null>(null);
    const [renamePasskeyDraft, setRenamePasskeyDraft] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(0);

    useEffect(() => {
        const init = async () => {
            await fetchSession();
            setLoading(false);
        };
        init();
    }, [fetchSession]);

    useEffect(() => {
        if (loading || !user?.uuid) {
            return;
        }
        const load = async () => {
            setPasskeysLoading(true);
            try {
                const res = await passkeysApi.list();
                if (res.success && Array.isArray(res.data?.passkeys)) {
                    setPasskeys(res.data.passkeys);
                }
            } catch {
                toast.error(t('auth.passkey.loadFailed'));
            } finally {
                setPasskeysLoading(false);
            }
        };
        void load();
    }, [loading, user?.uuid, t]);

    const resetTurnstile = () => {
        if (settings?.turnstile_enabled) {
            setTurnstileToken('');
            setTurnstileKey((prev) => prev + 1);
        }
    };

    const handleEnable2FA = () => {
        router.push('/auth/setup-2fa');
    };

    const handleDisable2FA = async () => {
        try {
            if (isEnabled(settings?.turnstile_enabled) && !turnstileToken) {
                toast.error(t('validation.captcha_required'));
                return;
            }

            setIsSubmitting(true);
            const payload: { two_fa_enabled: boolean; turnstile_token?: string } = {
                two_fa_enabled: false,
            };

            if (isEnabled(settings?.turnstile_enabled)) {
                payload.turnstile_token = turnstileToken;
            }

            const response = await axios.patch('/api/user/session', payload);

            if (response.data?.success) {
                toast.success(t('account.twoFactor.disabledSuccessfully'));
                await fetchSession(true);
                resetTurnstile();
            } else {
                toast.error(response.data?.message || t('account.twoFactor.disableFailed'));
                resetTurnstile();
            }
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('account.twoFactor.disableFailed'));
            }
            resetTurnstile();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLinkDiscord = () => {
        window.location.href = '/api/user/auth/discord/login';
    };

    const handleUnlinkDiscord = async () => {
        try {
            setIsSubmitting(true);
            const response = await axios.delete('/api/user/auth/discord/unlink');
            if (response.data?.success) {
                toast.success(t('account.discordUnlinkedSuccessfully'));
                await fetchSession(true);
            } else {
                toast.error(t('account.discordUnlinkFailed'));
            }
        } catch (error) {
            console.error('Error unlinking Discord:', error);
            toast.error(t('account.discordUnlinkFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestData = async () => {
        if (!isEnabled(settings?.ticket_system_enabled)) {
            toast.error(t('account.dataRequest.ticketSystemDisabled'));
            return;
        }

        try {
            setIsRequestingData(true);
            let captchaToken = '';
            if (isCaptchaConfigured(settings)) {
                captchaToken = await obtainCaptchaResponseToken(settings ?? null, turnstileToken);
                if (!captchaToken) {
                    toast.error(t('validation.captcha_required'));
                    resetTurnstile();
                    return;
                }
            }

            const payload: { turnstile_token?: string } = {};
            if (isCaptchaConfigured(settings)) {
                payload.turnstile_token = captchaToken;
            }

            const response = await axios.post('/api/user/data-request', payload);
            const ticketUuid = response.data?.data?.ticket?.uuid;

            if (response.data?.success && ticketUuid) {
                toast.success(t('account.dataRequest.success'));
                resetTurnstile();
                router.push(`/dashboard/tickets/${ticketUuid}`);
            } else {
                toast.error(response.data?.message || t('account.dataRequest.failed'));
                resetTurnstile();
            }
        } catch (error) {
            console.error('Error requesting account data:', error);
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('account.dataRequest.failed'));
            }
            resetTurnstile();
        } finally {
            setIsRequestingData(false);
        }
    };

    const handleOpenAddPasskeyDialog = () => {
        setPasskeyNameDraft('');
        setAddPasskeyOpen(true);
    };

    const handleConfirmRegisterPasskey = async () => {
        try {
            setIsSubmitting(true);
            const opt = await passkeysApi.registrationOptions();
            if (!opt.success || !opt.data?.options || !opt.data?.challenge_token) {
                toast.error(opt.message || t('auth.passkey.registerFailed'));
                return;
            }
            const credential = await startRegistration({
                optionsJSON: opt.data.options as never,
            });
            const labelTrim = passkeyNameDraft.trim();
            const vr = await passkeysApi.registrationVerify({
                challenge_token: String(opt.data.challenge_token),
                credential,
                ...(labelTrim ? { label: labelTrim } : {}),
            });
            if (vr.success) {
                toast.success(t('auth.passkey.added'));
                setAddPasskeyOpen(false);
                setPasskeyNameDraft('');
                const list = await passkeysApi.list();
                if (list.success && Array.isArray(list.data?.passkeys)) {
                    setPasskeys(list.data.passkeys);
                }
            } else {
                toast.error(vr.message || t('auth.passkey.registerFailed'));
            }
        } catch {
            toast.error(t('auth.passkey.registerFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const openRenamePasskey = (p: { id: number; label?: string | null }) => {
        setRenamePasskeyId(p.id);
        setRenamePasskeyDraft(p.label?.trim() ?? '');
        setRenamePasskeyOpen(true);
    };

    const handleSaveRenamePasskey = async () => {
        if (renamePasskeyId === null) {
            return;
        }
        try {
            setIsSubmitting(true);
            const trimmed = renamePasskeyDraft.trim();
            const res = await passkeysApi.updateLabel(renamePasskeyId, trimmed === '' ? null : trimmed);
            if (res.success) {
                toast.success(t('auth.passkey.renamed'));
                setRenamePasskeyOpen(false);
                const idSaved = renamePasskeyId;
                setRenamePasskeyId(null);
                setPasskeys((prev) =>
                    prev.map((p) => (p.id === idSaved ? { ...p, label: trimmed === '' ? null : trimmed } : p)),
                );
            } else {
                toast.error(res.message || t('auth.passkey.renameFailed'));
            }
        } catch {
            toast.error(t('auth.passkey.renameFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemovePasskey = async (id: number) => {
        try {
            setIsSubmitting(true);
            const res = await passkeysApi.delete(id);
            if (res.success) {
                toast.success(t('auth.passkey.removed'));
                setPasskeys((prev) => prev.filter((p) => p.id !== id));
            } else {
                toast.error(res.message || t('auth.passkey.removeFailed'));
            }
        } catch {
            toast.error(t('auth.passkey.removeFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            setIsSubmitting(true);
            await logout();
            router.push('/auth/login');
        } catch (error) {
            console.error('Error during logout:', error);
            toast.error(t('account.logoutFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // `tzNowTick` is referenced here so the preview re-renders periodically.
    const tzPreviewLabel = useMemo(
        () => formatDateTimeInTz(new Date(), dateOpts),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dateOpts, tzNowTick],
    );

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                    <span className='text-muted-foreground'>{t('account.loadingSettings')}</span>
                </div>
            </div>
        );
    }

    const explicitTimezone =
        typeof preferences.timezone === 'string' && preferences.timezone.trim() !== '' ? preferences.timezone : '';
    const handleTimezoneChange = async (value: string) => {
        const trimmed = value.trim();
        // Empty string clears the preference and falls back to browser detection.
        const nextValue = trimmed === '' ? null : trimmed;
        setSavingTimezone(true);
        try {
            const ok = await setTimezone(nextValue);
            if (ok) {
                toast.success(t('account.timezone.saved'));
            } else {
                toast.error(t('account.timezone.saveFailed'));
            }
        } catch {
            toast.error(t('account.timezone.saveFailed'));
        } finally {
            setSavingTimezone(false);
        }
    };

    return (
        <div className='space-y-6'>
            <div className='border-border/50 bg-muted/20 rounded-xl border p-4'>
                <h3 className='text-foreground text-lg font-semibold'>{t('account.preferences.title')}</h3>
                <p className='text-muted-foreground mt-1 text-sm'>{t('account.preferences.description')}</p>
            </div>

            <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                <div className='flex items-start gap-4'>
                    <div className='shrink-0'>
                        <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg'>
                            <Clock className='text-primary h-6 w-6' />
                        </div>
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='flex-1'>
                                <h4 className='text-foreground text-sm font-medium'>{t('account.timezone.title')}</h4>
                                <p className='text-muted-foreground mt-1 max-w-xl text-sm'>
                                    {t('account.timezone.description')}
                                </p>
                            </div>
                        </div>
                        <div className='mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center'>
                            <select
                                value={explicitTimezone}
                                onChange={(e) => void handleTimezoneChange(e.target.value)}
                                disabled={!preferencesReady || savingTimezone}
                                className='border-border bg-background focus:ring-primary w-full rounded-lg border p-2.5 text-sm focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                            >
                                <option value=''>
                                    {t('account.timezone.useBrowser', { timezone: browserTimezone })}
                                </option>
                                {supportedTimezones.map((tz) => (
                                    <option key={tz} value={tz}>
                                        {tz}
                                    </option>
                                ))}
                            </select>
                            <div className='text-muted-foreground text-xs sm:text-right'>
                                <div>
                                    <span className='font-medium'>{t('account.timezone.current')}:</span> {timezone}
                                </div>
                                <div className='font-mono text-[11px] opacity-80'>{tzPreviewLabel}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='border-border/50 bg-muted/20 rounded-xl border p-4'>
                <h3 className='text-foreground text-lg font-semibold'>{t('account.securitySettings')}</h3>
                <p className='text-muted-foreground mt-1 text-sm'>{t('account.securitySettingsDescription')}</p>
            </div>

            <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                <div className='flex items-start gap-4'>
                    <div className='shrink-0'>
                        <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg'>
                            <ShieldCheck className='text-primary h-6 w-6' />
                        </div>
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='flex-1'>
                                <h4 className='text-foreground text-sm font-medium'>{t('account.twoFactor.title')}</h4>
                                <p className='text-muted-foreground mt-1 text-sm'>
                                    {t('account.twoFactor.description')}
                                </p>
                                {user?.two_fa_enabled === '1' && (
                                    <div className='mt-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950'>
                                        <div className='flex items-center gap-2'>
                                            <Check className='h-4 w-4 text-green-600 dark:text-green-400' />
                                            <span className='text-sm text-green-800 dark:text-green-200'>
                                                {t('account.twoFactor.enabled')}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className='flex shrink-0 gap-2'>
                                {user?.two_fa_enabled !== '1' ? (
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={isSubmitting}
                                        onClick={handleEnable2FA}
                                    >
                                        {t('account.twoFactor.enable')}
                                    </Button>
                                ) : (
                                    <div className='flex flex-col items-end gap-2'>
                                        <Captcha
                                            refreshKey={turnstileKey}
                                            onVerify={(token) => setTurnstileToken(token)}
                                            onExpire={() => setTurnstileToken('')}
                                            onError={() => setTurnstileToken('')}
                                        />
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            disabled={isSubmitting}
                                            onClick={handleDisable2FA}
                                        >
                                            {t('account.twoFactor.disable')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                <div className='flex items-start gap-4'>
                    <div className='shrink-0'>
                        <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg'>
                            <Fingerprint className='text-primary h-6 w-6' />
                        </div>
                    </div>
                    <div className='min-w-0 flex-1 space-y-4'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                            <div>
                                <h4 className='text-foreground text-sm font-medium'>{t('auth.passkey.title')}</h4>
                                <p className='text-muted-foreground mt-1 max-w-xl text-sm'>
                                    {t('auth.passkey.description')}
                                </p>
                            </div>
                            <Button
                                type='button'
                                variant='default'
                                size='sm'
                                className='shrink-0'
                                disabled={isSubmitting}
                                onClick={handleOpenAddPasskeyDialog}
                            >
                                {t('auth.passkey.add')}
                            </Button>
                        </div>
                        {passkeysLoading ? (
                            <p className='text-muted-foreground text-sm'>{t('account.loadingSettings')}</p>
                        ) : passkeys.length === 0 ? (
                            <div className='border-border/60 bg-muted/30 rounded-lg border border-dashed px-4 py-6 text-center'>
                                <p className='text-muted-foreground text-sm'>{t('auth.passkey.emptyList')}</p>
                            </div>
                        ) : (
                            <ul className='space-y-2'>
                                {passkeys.map((p) => {
                                    const title = p.label?.trim() ? p.label : t('auth.passkey.unnamed');
                                    let dateLine = '';
                                    if (p.created_at) {
                                        const parsed = parseApiDate(p.created_at);
                                        if (parsed) {
                                            try {
                                                dateLine = format(parsed, 'PP', {
                                                    locale: resolveDateFnsLocale(dateOpts.locale),
                                                });
                                            } catch {
                                                dateLine = '';
                                            }
                                        }
                                    }
                                    return (
                                        <li
                                            key={p.id}
                                            className='border-border/60 bg-muted/10 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'
                                        >
                                            <div className='min-w-0 flex-1'>
                                                <p className='text-foreground truncate font-medium'>{title}</p>
                                                {dateLine ? (
                                                    <p className='text-muted-foreground mt-0.5 text-xs'>
                                                        {t('auth.passkey.addedOn', { date: dateLine })}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className='flex shrink-0 items-center gap-2'>
                                                <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='icon'
                                                    className='h-9 w-9'
                                                    disabled={isSubmitting}
                                                    onClick={() => openRenamePasskey(p)}
                                                    aria-label={t('auth.passkey.rename')}
                                                >
                                                    <Pencil className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                    disabled={isSubmitting}
                                                    onClick={() => void handleRemovePasskey(p.id)}
                                                >
                                                    {t('auth.passkey.remove')}
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {isEnabled(settings?.discord_oauth_enabled) && (
                <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex-1'>
                            <h4 className='text-foreground text-sm font-medium'>{t('account.discordAccount')}</h4>
                            <p className='text-muted-foreground mt-1 text-sm'>
                                {t('account.discordAccountDescription')}
                            </p>
                            {user?.discord_oauth2_linked === 'true' && (
                                <p className='text-muted-foreground mt-2 text-sm'>
                                    <span className='font-medium'>{t('account.linkedAs')}:</span>{' '}
                                    {user?.discord_oauth2_name || t('account.unknown')}
                                </p>
                            )}
                        </div>
                        <div className='flex shrink-0 gap-2'>
                            {user?.discord_oauth2_linked !== 'true' ? (
                                <Button variant='outline' size='sm' disabled={isSubmitting} onClick={handleLinkDiscord}>
                                    {t('account.linkDiscord')}
                                </Button>
                            ) : (
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    disabled={isSubmitting}
                                    onClick={handleUnlinkDiscord}
                                >
                                    {t('account.unlinkDiscord')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                <div className='flex items-start gap-4'>
                    <div className='shrink-0'>
                        <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg'>
                            <FileText className='text-primary h-6 w-6' />
                        </div>
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='flex-1'>
                                <h4 className='text-foreground text-sm font-medium'>
                                    {t('account.dataRequest.title')}
                                </h4>
                                <p className='text-muted-foreground mt-1 text-sm'>
                                    {isEnabled(settings?.ticket_system_enabled)
                                        ? t('account.dataRequest.description')
                                        : t('account.dataRequest.ticketSystemDisabledDescription')}
                                </p>
                            </div>
                            <div className='flex shrink-0 flex-col items-end gap-2'>
                                {isCaptchaConfigured(settings) && (
                                    <Captcha
                                        refreshKey={turnstileKey}
                                        onVerify={(token) => setTurnstileToken(token)}
                                        onExpire={() => setTurnstileToken('')}
                                        onError={() => setTurnstileToken('')}
                                    />
                                )}
                                <Button
                                    type='button'
                                    variant='outline'
                                    size='sm'
                                    className='shrink-0'
                                    disabled={
                                        isSubmitting || isRequestingData || !isEnabled(settings?.ticket_system_enabled)
                                    }
                                    onClick={() => void handleRequestData()}
                                >
                                    {isRequestingData ? t('common.loading') : t('account.dataRequest.button')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex-1'>
                        <h4 className='text-foreground text-sm font-medium'>{t('account.sessionManagement')}</h4>
                        <p className='text-muted-foreground mt-1 text-sm'>
                            {t('account.sessionManagementDescription')}
                        </p>
                    </div>
                    <Button variant='outline' size='sm' disabled={isSubmitting} onClick={handleLogout}>
                        {t('account.logout')}
                    </Button>
                </div>
            </div>

            <Dialog open={addPasskeyOpen} onOpenChange={setAddPasskeyOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>{t('auth.passkey.addDialogTitle')}</DialogTitle>
                        <DialogDescription>{t('auth.passkey.addDialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className='space-y-2 py-2'>
                        <label htmlFor='passkey-display-name' className='text-foreground text-sm font-medium'>
                            {t('auth.passkey.nameLabel')}{' '}
                            <span className='text-muted-foreground font-normal'>({t('common.optional')})</span>
                        </label>
                        <Input
                            id='passkey-display-name'
                            value={passkeyNameDraft}
                            onChange={(e) => setPasskeyNameDraft(e.target.value)}
                            placeholder={t('auth.passkey.namePlaceholder')}
                            maxLength={128}
                            autoComplete='off'
                            disabled={isSubmitting}
                        />
                    </div>
                    <DialogFooter className='gap-2 sm:gap-0'>
                        <Button
                            type='button'
                            variant='outline'
                            disabled={isSubmitting}
                            onClick={() => setAddPasskeyOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type='button'
                            disabled={isSubmitting}
                            onClick={() => void handleConfirmRegisterPasskey()}
                        >
                            {isSubmitting ? t('common.loading') : t('auth.passkey.continueRegistration')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={renamePasskeyOpen} onOpenChange={setRenamePasskeyOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>{t('auth.passkey.renameDialogTitle')}</DialogTitle>
                        <DialogDescription>{t('auth.passkey.renameDialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className='space-y-2 py-2'>
                        <label htmlFor='passkey-rename' className='text-foreground text-sm font-medium'>
                            {t('auth.passkey.nameLabel')}
                        </label>
                        <Input
                            id='passkey-rename'
                            value={renamePasskeyDraft}
                            onChange={(e) => setRenamePasskeyDraft(e.target.value)}
                            placeholder={t('auth.passkey.namePlaceholder')}
                            maxLength={128}
                            autoComplete='off'
                            disabled={isSubmitting}
                        />
                    </div>
                    <DialogFooter className='gap-2 sm:gap-0'>
                        <Button
                            type='button'
                            variant='outline'
                            disabled={isSubmitting}
                            onClick={() => setRenamePasskeyOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type='button' disabled={isSubmitting} onClick={() => void handleSaveRenamePasskey()}>
                            {isSubmitting ? t('common.saving') : t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
