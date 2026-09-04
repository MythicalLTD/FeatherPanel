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
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'fp:pwa:install-dismissed';
const SW_PATH = '/sw.js';

function isIosDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOS || iPadOs;
}

function isStandaloneDisplay(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    );
}

function readDismissed(): boolean {
    if (typeof window === 'undefined') return true;
    try {
        return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

export function PwaInstaller() {
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { theme } = useTheme();

    const enabled = settings?.app_pwa_enabled === 'true';
    const appName = settings?.app_name?.trim() || 'FeatherPanel';
    const logoUrl =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png'
            : settings?.app_logo_white || settings?.app_logo_dark || '/assets/logo.png';

    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [iosHint, setIosHint] = useState(false);

    const dismiss = useCallback(() => {
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            /* ignore */
        }
        setVisible(false);
        setIosHint(false);
        setDeferred(null);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

        if (!enabled) {
            if ('serviceWorker' in navigator) {
                void navigator.serviceWorker.getRegistrations().then((regs) => {
                    for (const reg of regs) {
                        const script =
                            reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
                        if (script.includes('/sw.js')) {
                            void reg.unregister();
                        }
                    }
                });
            }
            return;
        }

        if (isStandaloneDisplay()) return;

        if ('serviceWorker' in navigator) {
            void navigator.serviceWorker.register(SW_PATH).catch(() => undefined);
        }

        const onBeforeInstall = (event: Event) => {
            event.preventDefault();
            setDeferred(event as BeforeInstallPromptEvent);
            if (!readDismissed()) setVisible(true);
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);

        if (isIosDevice() && !readDismissed()) {
            const timer = window.setTimeout(() => setIosHint(true), 1800);
            return () => {
                window.clearTimeout(timer);
                window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
            };
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
        };
    }, [enabled]);

    const install = async () => {
        if (!deferred) return;
        try {
            await deferred.prompt();
            await deferred.userChoice;
        } catch {
            /* user dismissed */
        } finally {
            dismiss();
        }
    };

    if (!enabled || isStandaloneDisplay()) return null;
    if (!visible && !iosHint) return null;

    return (
        <div
            className={cn(
                'animate-fade-in-up border-border/60 bg-card/95 fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-[80] mx-auto max-w-md rounded-2xl border p-4 shadow-2xl backdrop-blur-md sm:right-4 sm:left-auto',
            )}
            role='dialog'
            aria-label={t('pwa.installTitle', { name: appName })}
        >
            <div className='flex items-start gap-3'>
                <div className='border-border/60 bg-background relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt='' className='h-full w-full object-contain p-1' />
                </div>
                <div className='min-w-0 flex-1'>
                    <p className='text-foreground text-sm font-semibold'>{t('pwa.installTitle', { name: appName })}</p>
                    <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                        {iosHint ? t('pwa.iosHint') : t('pwa.installSubtitle')}
                    </p>
                    {iosHint ? (
                        <p className='text-muted-foreground mt-2 flex items-center gap-1.5 text-xs'>
                            <Share className='h-3.5 w-3.5 shrink-0' />
                            {t('pwa.iosSteps')}
                        </p>
                    ) : null}
                </div>
                <button
                    type='button'
                    className='text-muted-foreground hover:text-foreground rounded-md p-1'
                    onClick={dismiss}
                    aria-label={t('common.close')}
                >
                    <X className='h-4 w-4' />
                </button>
            </div>

            <div className='mt-3 flex gap-2'>
                {!iosHint && deferred ? (
                    <Button type='button' className='h-10 flex-1' onClick={() => void install()}>
                        <Download className='mr-2 h-4 w-4' />
                        {t('pwa.installAction')}
                    </Button>
                ) : null}
                <Button
                    type='button'
                    variant='outline'
                    className={cn('h-10 tracking-normal normal-case', iosHint || !deferred ? 'flex-1' : '')}
                    onClick={dismiss}
                >
                    {t('pwa.dismiss')}
                </Button>
            </div>
        </div>
    );
}
