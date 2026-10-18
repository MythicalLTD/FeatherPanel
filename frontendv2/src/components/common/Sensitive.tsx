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

import { useEffect, useState, type ReactNode } from 'react';
import { usePrivacyMode } from '@/contexts/PreferencesContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { HIDDEN_IP_PLACEHOLDER } from '@/lib/ip-mask';
import { cn } from '@/lib/utils';

interface SensitiveProps {
    children?: ReactNode;
    /** Allow revealing the value with a click (default true). */
    revealable?: boolean;
    className?: string;
}

/**
 * Wraps a sensitive value (IP, host, email, key, password). While privacy mode
 * is on it renders the placeholder; a click reveals that one value until
 * privacy mode changes or the component unmounts.
 *
 * @example
 * <Sensitive>{user.email}</Sensitive>
 */
export function Sensitive({ children, revealable = true, className }: SensitiveProps) {
    const { t } = useTranslation();
    const { enabled } = usePrivacyMode();
    const [revealed, setRevealed] = useState(false);
    const [prevEnabled, setPrevEnabled] = useState(enabled);

    // Turning privacy mode on again hides anything that was revealed.
    if (prevEnabled !== enabled) {
        setPrevEnabled(enabled);
        setRevealed(false);
    }

    useEffect(() => {
        if (!revealed) return;
        const timer = window.setTimeout(() => setRevealed(false), 30_000);
        return () => window.clearTimeout(timer);
    }, [revealed]);

    if (children === null || children === undefined || children === '' || children === false) return null;
    if (!enabled) return <>{children}</>;

    if (revealed) {
        return (
            <span
                className={cn('cursor-pointer', className)}
                title={t('privacy.hideAgain')}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRevealed(false);
                }}
            >
                {children}
            </span>
        );
    }

    if (!revealable) {
        return (
            <span className={cn('select-none', className)} aria-label={t('privacy.hiddenValue')}>
                {HIDDEN_IP_PLACEHOLDER}
            </span>
        );
    }

    return (
        <span
            role='button'
            tabIndex={0}
            className={cn(
                'hover:text-foreground cursor-pointer rounded select-none hover:underline hover:decoration-dotted',
                className,
            )}
            title={t('privacy.revealHint')}
            aria-label={t('privacy.revealHint')}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRevealed(true);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setRevealed(true);
                }
            }}
        >
            {HIDDEN_IP_PLACEHOLDER}
        </span>
    );
}

/**
 * Block-level variant for large sensitive content (config files, editors):
 * while privacy mode is on, shows a notice with a reveal button instead of the
 * content.
 */
export function SensitiveBlock({ children, className }: { children: ReactNode; className?: string }) {
    const { t } = useTranslation();
    const { enabled } = usePrivacyMode();
    const [revealed, setRevealed] = useState(false);
    const [prevEnabled, setPrevEnabled] = useState(enabled);

    if (prevEnabled !== enabled) {
        setPrevEnabled(enabled);
        setRevealed(false);
    }

    if (!enabled || revealed) return <>{children}</>;

    return (
        <div
            className={cn(
                'border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center',
                className,
            )}
        >
            <p className='text-muted-foreground text-sm'>{t('privacy.blockHidden')}</p>
            <button
                type='button'
                onClick={() => setRevealed(true)}
                className='border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors'
            >
                {t('privacy.reveal')}
            </button>
        </div>
    );
}
