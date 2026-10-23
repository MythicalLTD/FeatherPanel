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

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Heart, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { FEATHERPANEL_DONATE_URL } from '@/lib/premium-links';

/** localStorage key, synced per account through ui-prefs-sync. */
export const DONATION_NUDGE_KEY = 'featherpanel_donation_nudge_dismissed_at';
const HIDE_FOR_MS = 30 * 24 * 60 * 60 * 1000;

function dismissedRecently(): boolean {
    try {
        const raw = window.localStorage.getItem(DONATION_NUDGE_KEY);
        const at = raw ? Number(raw) : 0;
        return Number.isFinite(at) && at > 0 && Date.now() - at < HIDE_FOR_MS;
    } catch {
        return false;
    }
}

/**
 * Small, dismissible admin-only card asking for an optional donation.
 * Hidden for 30 days after dismissing and never shown while Premium (paid or free claim) is active.
 */
export function DonationNudge() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (dismissedRecently()) {
            return;
        }
        let cancelled = false;
        axios
            .get<{ success: boolean; data?: { premium?: { active?: boolean } } }>('/api/admin/featherpanel-premium', {
                params: { refresh: '0' },
            })
            .then((res) => {
                if (!cancelled && res.data.success && res.data.data?.premium?.active === false) {
                    setVisible(true);
                }
            })
            .catch(() => {
                // No access or no status: stay hidden.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!visible) {
        return null;
    }

    const dismiss = () => {
        try {
            window.localStorage.setItem(DONATION_NUDGE_KEY, String(Date.now()));
        } catch {
            // Ignore storage errors; hiding for this session is enough.
        }
        setVisible(false);
    };

    return (
        <div className='border-primary/20 bg-primary/5 flex items-start gap-3 rounded-xl border p-4'>
            <Heart className='text-primary mt-0.5 h-5 w-5 shrink-0' />
            <div className='min-w-0 flex-1 space-y-1'>
                <p className='text-foreground text-sm font-semibold'>{t('admin.donation_nudge.title')}</p>
                <p className='text-muted-foreground text-sm'>{t('admin.donation_nudge.body')}</p>
                <div className='flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm'>
                    <a
                        href={FEATHERPANEL_DONATE_URL}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary font-medium underline-offset-2 hover:underline'
                    >
                        {t('admin.donation_nudge.donate')}
                    </a>
                    <Link
                        href='/admin/featherpanel-premium'
                        className='text-muted-foreground underline-offset-2 hover:underline'
                    >
                        {t('admin.donation_nudge.free')}
                    </Link>
                </div>
            </div>
            <button
                type='button'
                onClick={dismiss}
                className='text-muted-foreground hover:text-foreground rounded-md p-1'
                aria-label={t('admin.donation_nudge.dismiss')}
            >
                <X className='h-4 w-4' />
            </button>
        </div>
    );
}
