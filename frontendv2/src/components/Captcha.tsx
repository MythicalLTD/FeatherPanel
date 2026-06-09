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

import React, { useEffect, useRef } from 'react';
import Turnstile from 'react-turnstile';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import ReCAPTCHA from 'react-google-recaptcha';
import { useSettings } from '@/contexts/SettingsContext';
import { executeRecaptchaV3 } from '@/lib/recaptchaV3';
import { loadReforgeWidgetScript } from '@/lib/reforgeCaptcha';

declare global {
    interface Window {
        grecaptcha?: {
            ready: (cb: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
        friendlyChallenge?: {
            WidgetInstance: new (
                element: HTMLElement,
                options?: Record<string, unknown>,
            ) => {
                reset: () => void;
                destroy: () => void;
            };
        };
    }
}

interface CaptchaProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    refreshKey?: number;
    /** Auth forms: full-width, no extra vertical margin (parent controls spacing). */
    layout?: 'default' | 'auth';
}

let friendlyChallengeScriptPromise: Promise<void> | null = null;

function loadFriendlyChallengeScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.resolve();
    }
    if (window.friendlyChallenge?.WidgetInstance) {
        return Promise.resolve();
    }
    if (friendlyChallengeScriptPromise) {
        return friendlyChallengeScriptPromise;
    }

    const SCRIPT_ID = 'friendly-challenge-widget-js';

    friendlyChallengeScriptPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

        const done = () => {
            if (window.friendlyChallenge?.WidgetInstance) {
                resolve();
            } else {
                friendlyChallengeScriptPromise = null;
                reject(new Error('Friendly Captcha script loaded without API'));
            }
        };

        if (existing?.dataset.loaded === 'true' && window.friendlyChallenge?.WidgetInstance) {
            resolve();
            return;
        }

        if (existing) {
            const s = existing as HTMLScriptElement & { complete?: boolean };
            if (s.complete && s.dataset.loaded !== 'true') {
                s.dataset.loaded = 'true';
            }
            if (s.complete && window.friendlyChallenge?.WidgetInstance) {
                done();
                return;
            }
            existing.addEventListener(
                'load',
                () => {
                    existing.dataset.loaded = 'true';
                    done();
                },
                { once: true },
            );
            existing.addEventListener(
                'error',
                () => {
                    friendlyChallengeScriptPromise = null;
                    reject(new Error('Friendly Captcha script failed'));
                },
                { once: true },
            );
            return;
        }

        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = 'https://cdn.jsdelivr.net/npm/friendly-challenge@0.9.14/widget.min.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            script.dataset.loaded = 'true';
            done();
        };
        script.onerror = () => {
            friendlyChallengeScriptPromise = null;
            script.remove();
            reject(new Error('Friendly Captcha script failed'));
        };
        document.head.appendChild(script);
    });

    return friendlyChallengeScriptPromise;
}

/** Preloads reCAPTCHA v3 and runs `execute` when `refreshKey` changes. Submit handlers call `execute` again via `obtainCaptchaResponseToken` for a fresh token. */
const ReCaptchaV3Widget: React.FC<{
    siteKey: string;
    action: string;
    refreshKey?: number;
    onVerify: (token: string) => void;
    onError?: () => void;
}> = ({ siteKey, action, refreshKey, onVerify, onError }) => {
    const callbacksRef = useRef({ onVerify, onError });
    callbacksRef.current = { onVerify, onError };

    useEffect(() => {
        if (!siteKey) {
            return;
        }

        let cancelled = false;

        void executeRecaptchaV3(siteKey, action).then((token) => {
            if (cancelled) {
                return;
            }
            if (token) {
                callbacksRef.current.onVerify(token);
            } else {
                callbacksRef.current.onError?.();
            }
        });

        return () => {
            cancelled = true;
        };
    }, [siteKey, action, refreshKey]);

    return (
        <p className='text-muted-foreground max-w-md text-center text-xs leading-relaxed'>
            This site is protected by reCAPTCHA and the Google{' '}
            <a
                href='https://policies.google.com/privacy'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline underline-offset-2'
            >
                Privacy Policy
            </a>{' '}
            and{' '}
            <a
                href='https://policies.google.com/terms'
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary underline underline-offset-2'
            >
                Terms of Service
            </a>{' '}
            apply.
        </p>
    );
};

/** Friendly Captcha only auto-inits on DOMContentLoaded; SPA mounts need `WidgetInstance` after `widget.min.js` loads. */
function FriendlyCaptchaInner({
    sitekey,
    theme,
    onVerify,
    onError,
}: {
    sitekey: string;
    theme: 'dark' | 'light';
    onVerify: (token: string) => void;
    onError?: () => void;
}) {
    const elRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<{ reset: () => void } | null>(null);
    const callbacksRef = useRef({ onVerify, onError });
    callbacksRef.current = { onVerify, onError };

    useEffect(() => {
        const el = elRef.current;
        if (!el || !sitekey) {
            return;
        }
        let cancelled = false;

        const attach = () => {
            const node = elRef.current;
            if (cancelled || !node || widgetRef.current) {
                return;
            }
            const FC = window.friendlyChallenge;
            if (!FC?.WidgetInstance) {
                callbacksRef.current.onError?.();
                return;
            }
            node.classList.add('frc-captcha');
            node.classList.toggle('dark', theme === 'dark');
            widgetRef.current = new FC.WidgetInstance(node, {
                sitekey,
                // 'focus' avoids fetching a puzzle on every effect re-run / parent render (was hammering the API).
                startMode: 'focus',
                language: (typeof navigator !== 'undefined' && navigator.language?.split('-')[0]) || 'en',
                doneCallback: (solution: string) => {
                    callbacksRef.current.onVerify(solution);
                },
                errorCallback: () => {
                    callbacksRef.current.onError?.();
                },
            });
        };

        void loadFriendlyChallengeScript()
            .then(() => {
                if (!cancelled) {
                    attach();
                }
            })
            .catch(() => {
                callbacksRef.current.onError?.();
            });

        return () => {
            cancelled = true;
            try {
                widgetRef.current?.reset();
            } catch {
                /* ignore */
            }
            widgetRef.current = null;
        };
    }, [sitekey, theme]);

    return (
        <div
            ref={elRef}
            className='frc-captcha-host flex w-full min-w-0 justify-center [&_.frc-captcha]:w-full [&_.frc-captcha]:max-w-full'
        />
    );
}

/** Supported reForge widget types (invisible / managed are not supported). */
const REFORGE_WIDGET_TYPES = new Set(['checkbox', 'image']);

function ReforgeCaptchaInner({
    siteKey,
    widgetType,
    widgetTheme,
    widgetSize,
    widgetLang,
    refreshKey,
    onVerify,
    onError,
}: {
    siteKey: string;
    widgetType: string;
    widgetTheme: string;
    widgetSize: string;
    widgetLang: string;
    refreshKey?: number;
    onVerify: (token: string) => void;
    onError?: () => void;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const lastTokenRef = useRef('');
    const callbacksRef = useRef({ onVerify, onError });
    callbacksRef.current = { onVerify, onError };

    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval> | undefined;
        let cancelled = false;
        lastTokenRef.current = '';

        const poll = () => {
            const form = hostRef.current?.closest('form') ?? null;
            const root: Document | HTMLElement = form ?? document;
            const inp = root.querySelector<HTMLInputElement>('input[name="reforge-captcha-token"]');
            const v = inp?.value?.trim() ?? '';
            if (v && v !== lastTokenRef.current) {
                lastTokenRef.current = v;
                callbacksRef.current.onVerify(v);
            }
        };

        void loadReforgeWidgetScript()
            .then(() => {
                if (cancelled) {
                    return;
                }
                intervalId = setInterval(poll, 300);
                poll();
            })
            .catch(() => {
                callbacksRef.current.onError?.();
            });

        return () => {
            cancelled = true;
            if (intervalId !== undefined) {
                clearInterval(intervalId);
            }
        };
    }, [siteKey, widgetType, widgetTheme, widgetSize, widgetLang, refreshKey]);

    const langProps = widgetLang !== '' ? { 'data-lang': widgetLang } : {};

    return (
        <div
            ref={hostRef}
            className='reforge-captcha flex justify-center'
            data-sitekey={siteKey}
            data-type={widgetType}
            data-theme={widgetTheme}
            data-size={widgetSize}
            {...langProps}
        />
    );
}

export const Captcha: React.FC<CaptchaProps> = ({ onVerify, onExpire, onError, refreshKey, layout = 'default' }) => {
    const { settings } = useSettings();

    const captchaEnabled = settings?.turnstile_enabled === 'true';
    const provider = settings?.captcha_provider || 'turnstile';
    const theme = settings?.app_theme_default === 'dark' ? 'dark' : 'light';

    if (!captchaEnabled) return null;

    const containerStyle =
        layout === 'auth'
            ? 'flex w-full min-w-0 justify-center [&_.reforge-captcha]:w-full [&_iframe]:max-w-full'
            : 'my-4 flex justify-center';
    const recaptchaV3ContainerStyle =
        layout === 'auth'
            ? 'flex w-full min-w-0 flex-col items-center justify-center gap-2'
            : 'my-4 flex flex-col items-center justify-center gap-2';

    switch (provider) {
        case 'hcaptcha':
            if (!settings?.hcaptcha_site_key) return null;
            return (
                <div className={containerStyle}>
                    <HCaptcha
                        key={refreshKey}
                        sitekey={settings.hcaptcha_site_key}
                        onVerify={onVerify}
                        onExpire={onExpire}
                        onError={onError}
                        theme={theme}
                    />
                </div>
            );
        case 'recaptcha': {
            if (!settings?.recaptcha_site_key) return null;
            const recaptchaVersion = settings.recaptcha_version === 'v3' ? 'v3' : 'v2';
            const v3Action = (settings.recaptcha_v3_action || 'submit').trim() || 'submit';
            if (recaptchaVersion === 'v3') {
                return (
                    <div className={recaptchaV3ContainerStyle}>
                        <ReCaptchaV3Widget
                            siteKey={settings.recaptcha_site_key}
                            action={v3Action}
                            refreshKey={refreshKey}
                            onVerify={onVerify}
                            onError={onError}
                        />
                    </div>
                );
            }
            return (
                <div className={containerStyle}>
                    <ReCAPTCHA
                        key={refreshKey}
                        sitekey={settings.recaptcha_site_key}
                        onChange={(token) => token && onVerify(token)}
                        onExpired={onExpire}
                        onErrored={onError}
                        theme={theme}
                    />
                </div>
            );
        }
        case 'friendlycaptcha':
            if (!settings?.friendly_captcha_site_key) return null;
            return (
                <div className={containerStyle}>
                    <FriendlyCaptchaInner
                        key={refreshKey ?? 0}
                        sitekey={settings.friendly_captcha_site_key}
                        theme={theme}
                        onVerify={onVerify}
                        onError={onError}
                    />
                </div>
            );
        case 'reforge': {
            if (!settings?.reforge_captcha_site_key?.trim()) return null;
            const rawType = (settings.reforge_captcha_widget_type || 'checkbox').toLowerCase();
            const normalizedType = rawType === 'invisible' || rawType === 'managed' ? 'checkbox' : rawType;
            const wType = REFORGE_WIDGET_TYPES.has(normalizedType) ? normalizedType : 'checkbox';
            const rawTheme = (settings.reforge_captcha_theme || 'auto').toLowerCase();
            const wTheme = rawTheme === 'dark' || rawTheme === 'light' || rawTheme === 'auto' ? rawTheme : 'auto';
            const rawSize = (settings.reforge_captcha_size || 'normal').toLowerCase();
            const wSize = rawSize === 'compact' ? 'compact' : 'normal';
            const wLang = (settings.reforge_captcha_lang || '').trim();
            return (
                <div className={containerStyle}>
                    <ReforgeCaptchaInner
                        key={refreshKey ?? 0}
                        siteKey={settings.reforge_captcha_site_key.trim()}
                        widgetType={wType}
                        widgetTheme={wTheme}
                        widgetSize={wSize}
                        widgetLang={wLang}
                        refreshKey={refreshKey}
                        onVerify={onVerify}
                        onError={onError}
                    />
                </div>
            );
        }
        case 'turnstile':
        default:
            if (!settings?.turnstile_key_pub) return null;
            return (
                <div className={containerStyle}>
                    <Turnstile
                        key={refreshKey}
                        sitekey={settings.turnstile_key_pub}
                        onVerify={onVerify}
                        onExpire={onExpire}
                        onError={onError}
                        theme={theme}
                    />
                </div>
            );
    }
};
