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

import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import axios from 'axios';
import { KeyRound } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ReauthHeaders = Record<string, string>;
type ReauthFn = <T>(request: (headers: ReauthHeaders) => Promise<T>) => Promise<T>;

/** Thrown when the user closes the confirmation prompt; callers should stay silent. */
export class ReauthCancelledError extends Error {
    constructor() {
        super('reauth_cancelled');
        this.name = 'ReauthCancelledError';
    }
}

export const isReauthCancelled = (err: unknown): boolean => err instanceof ReauthCancelledError;

const ReauthContext = createContext<ReauthFn | null>(null);

interface Prompt {
    method: 'password' | '2fa';
    failed: boolean;
}

/**
 * Dangerous VDS actions (reinstall, rollback, restore, firewall policy) can require the user to
 * confirm their password or 2FA code, depending on the admin `vds_reauth_*` settings. Wrap the
 * request in `withReauth`; on REAUTH_REQUIRED the user is prompted and the request is retried with
 * the X-Confirm-* header. The secret is held only in memory for that single retry.
 */
export function VdsReauthProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [value, setValue] = useState('');
    const resolver = useRef<((v: string | null) => void) | null>(null);

    const ask = (p: Prompt) =>
        new Promise<string | null>((resolve) => {
            resolver.current = resolve;
            setValue('');
            setPrompt(p);
        });

    const finish = (v: string | null) => {
        resolver.current?.(v);
        resolver.current = null;
        setPrompt(null);
        setValue('');
    };

    const withReauth = useCallback<ReauthFn>(async (request) => {
        let headers: ReauthHeaders = {};
        for (let attempt = 0; attempt < 4; attempt++) {
            try {
                return await request(headers);
            } catch (err) {
                const body = axios.isAxiosError(err) ? err.response?.data : null;
                const code = body?.error_code;
                if (code !== 'REAUTH_REQUIRED' && code !== 'REAUTH_FAILED') throw err;
                const method = body?.data?.method === '2fa' ? '2fa' : 'password';
                const secret = await ask({ method, failed: code === 'REAUTH_FAILED' });
                if (secret === null) throw new ReauthCancelledError();
                headers = method === '2fa' ? { 'X-Confirm-Code': secret } : { 'X-Confirm-Password': secret };
            }
        }
        throw new ReauthCancelledError();
    }, []);

    return (
        <ReauthContext.Provider value={withReauth}>
            {children}
            <Dialog open={prompt !== null} onOpenChange={(o) => !o && finish(null)} className='max-w-sm space-y-4'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <KeyRound className='text-primary h-5 w-5' />
                        {t('vds.reauth.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {prompt?.method === '2fa'
                            ? t('vds.reauth.description_2fa')
                            : t('vds.reauth.description_password')}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className='space-y-4'
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (value.trim() !== '') finish(value.trim());
                    }}
                >
                    <Input
                        autoFocus
                        type={prompt?.method === '2fa' ? 'text' : 'password'}
                        inputMode={prompt?.method === '2fa' ? 'numeric' : undefined}
                        autoComplete={prompt?.method === '2fa' ? 'one-time-code' : 'current-password'}
                        placeholder={
                            prompt?.method === '2fa'
                                ? t('vds.reauth.code_placeholder')
                                : t('vds.reauth.password_placeholder')
                        }
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    {prompt?.failed && <p className='text-sm text-red-500'>{t('vds.reauth.failed')}</p>}
                    <DialogFooter>
                        <Button type='button' variant='outline' onClick={() => finish(null)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type='submit' disabled={value.trim() === ''}>
                            {t('vds.reauth.confirm')}
                        </Button>
                    </DialogFooter>
                </form>
            </Dialog>
        </ReauthContext.Provider>
    );
}

/** Falls back to a plain call when rendered outside the provider. */
export function useVdsReauth(): ReauthFn {
    const ctx = useContext(ReauthContext);
    return ctx ?? (<T,>(request: (headers: ReauthHeaders) => Promise<T>) => request({}));
}
