/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bell, Compass, LayoutGrid, LayoutDashboard, Server, UserRound, X } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { parseApiDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

/** Synced through the UI preference sync (see lib/ui-prefs-sync.ts) so the tour shows once per account. */
export const ONBOARDING_TOUR_KEY = 'featherpanel_onboarding_tour';
/** Only accounts younger than this get the tour automatically; everyone can start it from the account menu. */
const AUTO_START_MAX_AGE_DAYS = 14;

interface TourStep {
    id: string;
    icon: ComponentType<{ className?: string }>;
    /** CSS selector of the element to highlight; the card is centered when it is missing. */
    target?: string;
}

const STEPS: TourStep[] = [
    { id: 'welcome', icon: Compass },
    { id: 'dashboard', icon: LayoutDashboard, target: '[data-tour="dashboard-hero"]' },
    { id: 'arrange', icon: LayoutGrid, target: '[data-tour="dashboard-arrange"]' },
    { id: 'notifications', icon: Bell, target: '[data-testid="notification-bell"]' },
    { id: 'server', icon: Server, target: 'a[href^="/server/"]' },
    { id: 'account', icon: UserRound, target: '[data-tour="user-menu"]' },
];

const TITLES: Record<string, string> = {
    welcome: 'onboarding.tour.welcome_title',
    dashboard: 'onboarding.tour.dashboard_title',
    arrange: 'onboarding.tour.arrange_title',
    notifications: 'onboarding.tour.notifications_title',
    server: 'onboarding.tour.server_title',
    account: 'onboarding.tour.account_title',
};

const BODIES: Record<string, string> = {
    welcome: 'onboarding.tour.welcome_body',
    dashboard: 'onboarding.tour.dashboard_body',
    arrange: 'onboarding.tour.arrange_body',
    notifications: 'onboarding.tour.notifications_body',
    server: 'onboarding.tour.server_body',
    account: 'onboarding.tour.account_body',
};

function visibleElement(selector: string | undefined): HTMLElement | null {
    if (!selector) return null;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
    }
    return null;
}

export function OnboardingTour() {
    const { t } = useTranslation();
    const { user } = useSession();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [index, setIndex] = useState<number | null>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);

    const forced = searchParams.get('tour') === '1';

    useEffect(() => {
        if (pathname !== '/dashboard' || !user) return;
        if (forced) {
            setIndex(0);
            return;
        }
        if (window.localStorage.getItem(ONBOARDING_TOUR_KEY)) return;
        const created = parseApiDate(user.first_seen);
        const ageDays = created ? (Date.now() - created.getTime()) / 86_400_000 : Infinity;
        if (ageDays > AUTO_START_MAX_AGE_DAYS) return;
        const timer = window.setTimeout(() => setIndex(0), 1200);
        return () => window.clearTimeout(timer);
    }, [pathname, user, forced]);

    const step = index !== null ? STEPS[index] : null;

    const measure = useCallback(() => {
        const el = visibleElement(step?.target);
        setRect(el ? el.getBoundingClientRect() : null);
    }, [step]);

    useLayoutEffect(() => {
        if (!step) return;
        const el = visibleElement(step.target);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const timer = window.setTimeout(measure, 350);
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [step, measure]);

    const close = useCallback(
        (state: 'done' | 'dismissed') => {
            window.localStorage.setItem(ONBOARDING_TOUR_KEY, state);
            setIndex(null);
            if (forced) router.replace('/dashboard');
        },
        [forced, router],
    );

    useEffect(() => {
        if (index === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close('dismissed');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [index, close]);

    const cardStyle = useMemo(() => {
        if (!rect || typeof window === 'undefined') return undefined;
        const width = Math.min(360, window.innerWidth - 24);
        const below = rect.bottom + 16 + 220 < window.innerHeight;
        const top = below ? rect.bottom + 14 : Math.max(12, rect.top - 14 - 220);
        const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 12);
        return { top, left, width };
    }, [rect]);

    if (index === null || !step || typeof document === 'undefined') return null;

    const last = index === STEPS.length - 1;
    const pad = 6;

    return createPortal(
        <div className='fixed inset-0 z-[90]' role='dialog' aria-modal='true' aria-labelledby='fp-tour-title'>
            {rect ? (
                <div
                    aria-hidden
                    className='ring-primary pointer-events-none absolute rounded-xl ring-2 transition-all duration-300'
                    style={{
                        top: rect.top - pad,
                        left: rect.left - pad,
                        width: rect.width + pad * 2,
                        height: rect.height + pad * 2,
                        boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
                    }}
                />
            ) : (
                <div aria-hidden className='absolute inset-0 bg-black/55' />
            )}

            <div
                className={cn(
                    'fp-menu-surface absolute rounded-2xl border p-5 shadow-2xl',
                    !rect && 'top-1/2 left-1/2 w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2',
                )}
                style={cardStyle}
            >
                <div className='flex items-start gap-3'>
                    <div className='fp-icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                        <step.icon className='h-5 w-5' />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <p className='text-muted-foreground text-xs'>
                            {t('onboarding.tour.progress', {
                                current: String(index + 1),
                                total: String(STEPS.length),
                            })}
                        </p>
                        <h2 id='fp-tour-title' className='mt-0.5 font-semibold'>
                            {t(TITLES[step.id])}
                        </h2>
                    </div>
                    <button
                        type='button'
                        onClick={() => close('dismissed')}
                        className='text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors'
                        aria-label={t('onboarding.tour.close')}
                    >
                        <X className='h-4 w-4' />
                    </button>
                </div>
                <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
                    {t(BODIES[step.id])}
                    {step.target && !rect ? ' ' + t('onboarding.tour.not_visible') : ''}
                </p>
                <div className='mt-4 flex items-center justify-between gap-2'>
                    <div className='flex gap-1' aria-hidden>
                        {STEPS.map((s, i) => (
                            <span
                                key={s.id}
                                className={cn(
                                    'h-1.5 rounded-full transition-all',
                                    i === index ? 'bg-primary w-4' : 'bg-muted-foreground/30 w-1.5',
                                )}
                            />
                        ))}
                    </div>
                    <div className='flex gap-2'>
                        {index > 0 ? (
                            <Button size='sm' variant='ghost' onClick={() => setIndex(index - 1)}>
                                {t('onboarding.tour.back')}
                            </Button>
                        ) : (
                            <Button size='sm' variant='ghost' onClick={() => close('dismissed')}>
                                {t('onboarding.tour.skip')}
                            </Button>
                        )}
                        <Button size='sm' onClick={() => (last ? close('done') : setIndex(index + 1))}>
                            {last ? t('onboarding.tour.finish') : t('onboarding.tour.next')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
