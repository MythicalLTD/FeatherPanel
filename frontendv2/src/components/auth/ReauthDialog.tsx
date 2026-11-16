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

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-errors';
import { setReauthHandler, type ReauthMethod, type ReauthRequest } from '@/lib/reauth';
import '@/lib/api';

const ACTION_KEYS: Record<string, string> = {
    impersonate: 'auth.reauth.actions.impersonate',
    admin_role: 'auth.reauth.actions.admin_role',
    api_key: 'auth.reauth.actions.api_key',
    custom_js: 'auth.reauth.actions.custom_js',
    account_security: 'auth.reauth.actions.account_security',
};

/**
 * Globally mounted dialog that confirms the signed-in account before a sensitive action.
 * Opened by the axios interceptor when an endpoint answers 403 REAUTH_REQUIRED.
 */
export default function ReauthDialog() {
    const { t } = useTranslation();
    const [request, setRequest] = useState<ReauthRequest | null>(null);
    const [method, setMethod] = useState<ReauthMethod>('password');
    const [secret, setSecret] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [codeSent, setCodeSent] = useState(false);
    const resolver = useRef<((confirmed: boolean) => void) | null>(null);

    useEffect(
        () =>
            setReauthHandler(
                (next) =>
                    new Promise<boolean>((resolve) => {
                        resolver.current = resolve;
                        setRequest(next);
                        setMethod(next.methods[0] ?? 'password');
                        setSecret('');
                        setError(null);
                        setCodeSent(false);
                        setBusy(false);
                    }),
            ),
        [],
    );

    const finish = useCallback((confirmed: boolean) => {
        resolver.current?.(confirmed);
        resolver.current = null;
        setRequest(null);
        setSecret('');
    }, []);

    const sendCode = async () => {
        setBusy(true);
        setError(null);
        try {
            await axios.post('/api/user/auth/reauth/email');
            setCodeSent(true);
            setMethod('email_code');
            setSecret('');
        } catch (err) {
            setError(getApiErrorMessage(err, t, 'auth.reauth.failed'));
        } finally {
            setBusy(false);
        }
    };

    const submit = async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (secret.trim() === '' || busy) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await axios.post(
                '/api/user/auth/reauth',
                method === 'password' ? { method, password: secret } : { method, code: secret.trim() },
            );
            finish(true);
        } catch (err) {
            setError(getApiErrorMessage(err, t, 'auth.reauth.failed'));
            setBusy(false);
        }
    };

    const methods = request?.methods ?? [];
    const actionKey = request?.action ? ACTION_KEYS[request.action] : undefined;
    const isCode = method !== 'password';

    return (
        <Dialog open={request !== null} onClose={() => (busy ? undefined : finish(false))} className='max-w-md'>
            <form onSubmit={submit} data-fp-save-shortcut>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <ShieldCheck className='text-primary h-5 w-5' />
                        {t('auth.reauth.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {actionKey ? t(actionKey) : t('auth.reauth.description')} {t('auth.reauth.validity')}
                    </DialogDescription>
                </DialogHeader>

                <div className='mt-4 space-y-2'>
                    <Label htmlFor='fp-reauth-secret' className='text-foreground'>
                        {method === 'password'
                            ? t('auth.reauth.password')
                            : method === 'totp'
                              ? t('auth.reauth.totp')
                              : t('auth.reauth.emailCode')}
                    </Label>
                    <Input
                        id='fp-reauth-secret'
                        type={method === 'password' ? 'password' : 'text'}
                        inputMode={isCode ? 'numeric' : undefined}
                        autoComplete={method === 'password' ? 'current-password' : 'one-time-code'}
                        maxLength={method === 'password' ? 255 : 6}
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        placeholder={isCode ? '000000' : ''}
                        autoFocus
                        disabled={busy || (method === 'email_code' && !codeSent)}
                    />
                    {method === 'totp' && <p className='text-muted-foreground text-xs'>{t('auth.reauth.totpHint')}</p>}
                    {method === 'email_code' && (
                        <p className='text-muted-foreground text-xs'>
                            {codeSent ? t('auth.reauth.codeSent') : t('auth.reauth.emailHint')}
                        </p>
                    )}
                    {request?.signInAgain && method === 'password' && (
                        <p className='text-muted-foreground text-xs'>
                            {t('auth.reauth.signInAgain', { minutes: String(request.signInAgainMinutes ?? 5) })}
                        </p>
                    )}
                    {error && (
                        <p className='text-destructive text-sm' role='alert'>
                            {error}
                        </p>
                    )}
                </div>

                <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm'>
                    {method !== 'password' && methods.includes('password') && (
                        <button
                            type='button'
                            className='text-primary underline-offset-4 focus-visible:underline'
                            onClick={() => {
                                setMethod('password');
                                setSecret('');
                                setError(null);
                            }}
                            disabled={busy}
                        >
                            {t('auth.reauth.usePassword')}
                        </button>
                    )}
                    {methods.includes('email_code') && (
                        <button
                            type='button'
                            className='text-primary underline-offset-4 focus-visible:underline'
                            onClick={() => void sendCode()}
                            disabled={busy}
                        >
                            {codeSent ? t('auth.reauth.resendCode') : t('auth.reauth.sendCode')}
                        </button>
                    )}
                </div>

                <DialogFooter className='mt-6'>
                    <Button type='button' variant='outline' onClick={() => finish(false)} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button type='submit' disabled={busy || secret.trim() === ''}>
                        {busy ? t('auth.reauth.confirming') : t('auth.reauth.confirm')}
                    </Button>
                </DialogFooter>
            </form>
        </Dialog>
    );
}
