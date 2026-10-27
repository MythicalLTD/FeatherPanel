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

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Boxes,
    Check,
    Egg,
    Globe,
    Heart,
    Languages,
    Loader2,
    Mail,
    MapPin,
    PartyPopper,
    Rocket,
    Server,
    Settings,
    ShieldCheck,
    Sparkles,
    Store,
    Users,
} from 'lucide-react';
import BackgroundWrapper from '@/components/theme/BackgroundWrapper';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ImageAttachmentField } from '@/components/featherui/ImageAttachmentField';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Switch } from '@/components/ui/switch';
import { TipCard } from '@/components/featherui/TipCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { completeSetup, setSetupDeferred, SETUP_STEP_KEY } from '@/lib/setup-wizard';
import { cn } from '@/lib/utils';
import { FEATHERPANEL_DONATE_URL } from '@/lib/premium-links';
import { usePremiumInactive } from '@/components/admin/DonationNudge';

type StepId = 'welcome' | 'locale' | 'mail' | 'modules' | 'security' | 'infrastructure' | 'done';

const STEPS: { id: StepId; icon: ComponentType<{ className?: string }> }[] = [
    { id: 'welcome', icon: Rocket },
    { id: 'locale', icon: Languages },
    { id: 'mail', icon: Mail },
    { id: 'modules', icon: Boxes },
    { id: 'security', icon: ShieldCheck },
    { id: 'infrastructure', icon: Server },
    { id: 'done', icon: PartyPopper },
];

const STEP_TITLES: Record<StepId, string> = {
    welcome: 'setup_wizard.steps.welcome.title',
    locale: 'setup_wizard.steps.locale.title',
    mail: 'setup_wizard.steps.mail.title',
    modules: 'setup_wizard.steps.modules.title',
    security: 'setup_wizard.steps.security.title',
    infrastructure: 'setup_wizard.steps.infrastructure.title',
    done: 'setup_wizard.steps.done.title',
};

const STEP_DESCRIPTIONS: Record<StepId, string> = {
    welcome: 'setup_wizard.steps.welcome.description',
    locale: 'setup_wizard.steps.locale.description',
    mail: 'setup_wizard.steps.mail.description',
    modules: 'setup_wizard.steps.modules.description',
    security: 'setup_wizard.steps.security.description',
    infrastructure: 'setup_wizard.steps.infrastructure.description',
    done: 'setup_wizard.steps.done.description',
};

/** Settings each step writes. Only changed values are sent. */
const STEP_KEYS: Partial<Record<StepId, string[]>> = {
    welcome: ['app_url', 'app_name', 'app_logo_dark', 'app_logo_white'],
    locale: ['app_timezone', 'app_locale_default'],
    mail: ['smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_encryption'],
    modules: [
        'module_game_enabled',
        'module_web_enabled',
        'module_vds_enabled',
        'ticket_system_enabled',
        'knowledgebase_enabled',
        'status_page_enabled',
    ],
    security: [
        'registration_enabled',
        'require_two_fa_admins',
        'turnstile_enabled',
        'turnstile_key_pub',
        'turnstile_key_priv',
    ],
};

const MODULES = [
    {
        key: 'module_game_enabled',
        title: 'setup_wizard.modules.game_title',
        body: 'setup_wizard.modules.game_body',
        defaultOn: true,
    },
    {
        key: 'module_web_enabled',
        title: 'setup_wizard.modules.web_title',
        body: 'setup_wizard.modules.web_body',
        defaultOn: true,
    },
    {
        key: 'module_vds_enabled',
        title: 'setup_wizard.modules.vds_title',
        body: 'setup_wizard.modules.vds_body',
        defaultOn: true,
    },
    {
        key: 'ticket_system_enabled',
        title: 'setup_wizard.modules.tickets_title',
        body: 'setup_wizard.modules.tickets_body',
        defaultOn: true,
    },
    {
        key: 'knowledgebase_enabled',
        title: 'setup_wizard.modules.knowledgebase_title',
        body: 'setup_wizard.modules.knowledgebase_body',
        defaultOn: true,
    },
    {
        key: 'status_page_enabled',
        title: 'setup_wizard.modules.status_page_title',
        body: 'setup_wizard.modules.status_page_body',
        defaultOn: false,
    },
] as const;

type Values = Record<string, string>;

function urlIssues(value: string): { error?: string; warnings: string[] } {
    const warnings: string[] = [];
    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        return { error: 'setup_wizard.welcome.url_invalid', warnings };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { error: 'setup_wizard.welcome.url_invalid', warnings };
    }
    if (parsed.pathname !== '/' && parsed.pathname !== '') warnings.push('setup_wizard.welcome.url_path');
    if (parsed.protocol === 'http:') warnings.push('setup_wizard.welcome.url_http');
    if (typeof window !== 'undefined' && parsed.origin !== window.location.origin) {
        warnings.push('setup_wizard.welcome.url_mismatch');
    }
    return { warnings };
}

export function SetupWizard() {
    const { t } = useTranslation();
    const router = useRouter();
    const { refetch: refetchSettings, settings } = useSettings();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [initial, setInitial] = useState<Values>({});
    const [values, setValues] = useState<Values>({});
    const [options, setOptions] = useState<Record<string, string[]>>({});
    const [counts, setCounts] = useState<{ locations: number; nodes: number }>({ locations: 0, nodes: 0 });
    const [locationName, setLocationName] = useState('');
    const [creatingLocation, setCreatingLocation] = useState(false);
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');
    const [showErrors, setShowErrors] = useState(false);

    const step = STEPS[stepIndex];

    const loadCounts = useCallback(async () => {
        const [loc, nodes] = await Promise.all([
            axios.get('/api/admin/locations', { params: { limit: 1 } }).catch(() => null),
            axios.get('/api/admin/nodes', { params: { limit: 1 } }).catch(() => null),
        ]);
        setCounts({
            locations: Number(loc?.data?.data?.pagination?.total_records ?? 0),
            nodes: Number(nodes?.data?.data?.pagination?.total_records ?? 0),
        });
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await adminSettingsApi.fetchSettings();
                const settings = (res.data?.settings || {}) as unknown as Record<
                    string,
                    { value?: unknown; options?: unknown[] }
                >;
                const next: Values = {};
                const opts: Record<string, string[]> = {};
                for (const keys of Object.values(STEP_KEYS)) {
                    for (const key of keys ?? []) {
                        next[key] = String(settings[key]?.value ?? '');
                        const keyOptions = settings[key]?.options;
                        if (keyOptions?.length) opts[key] = keyOptions.map(String);
                    }
                }
                const tzOptions = settings.app_timezone?.options;
                if (tzOptions?.length) opts.app_timezone = tzOptions.map(String);
                const localeOptions = settings.app_locale_default?.options;
                if (localeOptions?.length) opts.app_locale_default = localeOptions.map(String);
                setInitial(next);
                // Fresh installs still carry the placeholder URL; suggest the address the admin is using now.
                const stored = next.app_url || '';
                const placeholder = !stored || stored.includes('featherpanel.mythical.systems');
                setValues({ ...next, app_url: placeholder ? window.location.origin : stored });
                setOptions(opts);
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'setup_wizard.errors.load'));
            } finally {
                setLoading(false);
            }
        };
        void load();
        void loadCounts();
        const saved = Number(window.localStorage.getItem(SETUP_STEP_KEY) || 0);
        if (saved > 0 && saved < STEPS.length - 1) setStepIndex(saved);
    }, [loadCounts, t]);

    useEffect(() => {
        window.localStorage.setItem(SETUP_STEP_KEY, String(stepIndex));
    }, [stepIndex]);

    const set = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
    const bool = (key: string, fallback = true) => (values[key] ? values[key] === 'true' : fallback);
    const setBool = (key: string, value: boolean) => set(key, value ? 'true' : 'false');

    const url = useMemo(() => urlIssues(values.app_url || ''), [values.app_url]);

    const saveKeys = async (keys: string[]): Promise<boolean> => {
        const changed: Record<string, string> = {};
        for (const key of keys) {
            const value = values[key] ?? '';
            if (value === (initial[key] ?? '')) continue;
            if ((key === 'smtp_pass' || key === 'turnstile_key_priv') && value === '') continue;
            changed[key] = value;
        }
        if (Object.keys(changed).length === 0) return true;
        try {
            const res = await adminSettingsApi.updateSettings(changed);
            if (!res.success) {
                toast.error(res.message || t('setup_wizard.errors.save'));
                return false;
            }
            setInitial((prev) => ({ ...prev, ...changed }));
            return true;
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'setup_wizard.errors.save'));
            return false;
        }
    };

    /** Inline validation for the current step (translation keys). */
    const errors = useMemo(() => {
        const e: Record<string, string> = {};
        if (step.id === 'welcome') {
            if (url.error) e.app_url = url.error;
            if (!values.app_name?.trim()) e.app_name = 'setup_wizard.welcome.name_required';
        }
        if (step.id === 'mail' && values.smtp_enabled === 'true') {
            if (!values.smtp_host?.trim()) e.smtp_host = 'setup_wizard.validation.host_required';
            const port = Number(values.smtp_port || 0);
            if (!port || port < 1 || port > 65535) e.smtp_port = 'setup_wizard.validation.port_invalid';
            if (values.smtp_from && !/^[^\s@]+@[^\s@]+$/.test(values.smtp_from))
                e.smtp_from = 'setup_wizard.validation.email_invalid';
        }
        if (step.id === 'security' && values.turnstile_enabled === 'true') {
            if (!values.turnstile_key_pub?.trim()) e.turnstile_key_pub = 'setup_wizard.validation.key_required';
            if (!values.turnstile_key_priv?.trim() && !initial.turnstile_key_priv)
                e.turnstile_key_priv = 'setup_wizard.validation.key_required';
        }
        return e;
    }, [step.id, url.error, values, initial.turnstile_key_priv]);

    const goTo = (index: number) => {
        const target = Math.max(0, Math.min(STEPS.length - 1, index));
        setDirection(target < stepIndex ? 'back' : 'forward');
        setShowErrors(false);
        setStepIndex(target);
    };

    const back = () => {
        if (stepIndex > 0 && step.id !== 'done') goTo(stepIndex - 1);
    };

    const next = async () => {
        if (Object.keys(errors).length > 0) {
            setShowErrors(true);
            toast.error(t(Object.values(errors)[0]));
            return;
        }
        const keys = STEP_KEYS[step.id];
        setSaving(true);
        const ok = keys ? await saveKeys(keys) : true;
        if (ok && STEPS[stepIndex + 1]?.id === 'done') {
            try {
                await completeSetup();
                void refetchSettings();
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'setup_wizard.errors.save'));
                setSaving(false);
                return;
            }
        }
        setSaving(false);
        if (ok) goTo(stepIndex + 1);
    };

    const skipCurrentStep = async () => {
        setSaving(true);
        const ok = await saveKeys(STEP_KEYS[step.id] ?? []);
        // Skip on infrastructure lands on "done" — same completion as Finish, or admin links bounce via SetupGate.
        if (ok && STEPS[stepIndex + 1]?.id === 'done') {
            try {
                await completeSetup();
                void refetchSettings();
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'setup_wizard.errors.save'));
                setSaving(false);
                return;
            }
        }
        setSaving(false);
        if (ok) goTo(stepIndex + 1);
    };

    const finishLater = async () => {
        setSaving(true);
        const ok = await saveKeys(STEP_KEYS[step.id] ?? []);
        setSaving(false);
        if (!ok) return;
        setSetupDeferred(true);
        router.push('/admin');
    };

    const nextRef = useRef<() => void>(() => undefined);
    const backRef = useRef<() => void>(() => undefined);
    nextRef.current = () => {
        if (!saving && !loading && step.id !== 'done') void next();
    };
    backRef.current = () => {
        if (!saving) back();
    };
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const typing = !!target?.closest('input, textarea, select, [contenteditable="true"], [role="listbox"]');
            if (
                e.key === 'Enter' &&
                (e.metaKey || e.ctrlKey || (!typing && target?.tagName !== 'BUTTON' && target?.tagName !== 'A'))
            ) {
                e.preventDefault();
                nextRef.current();
            } else if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                nextRef.current();
            } else if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                backRef.current();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const sendTest = async () => {
        setTesting(true);
        const ok = await saveKeys(STEP_KEYS.mail ?? []);
        if (ok) {
            try {
                await axios.post('/api/admin/settings/email/test');
                toast.success(t('setup_wizard.mail.test_sent'));
            } catch (error) {
                toast.error(getApiErrorMessage(error, t, 'setup_wizard.mail.test_failed'));
            }
        }
        setTesting(false);
    };

    const createLocation = async () => {
        if (!locationName.trim()) return;
        setCreatingLocation(true);
        try {
            await axios.put('/api/admin/locations', { name: locationName.trim(), type: 'game' });
            toast.success(t('setup_wizard.infrastructure.location_created'));
            setLocationName('');
            await loadCounts();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'setup_wizard.infrastructure.location_failed'));
        } finally {
            setCreatingLocation(false);
        }
    };

    const languageName = useMemo(() => {
        try {
            const names = new Intl.DisplayNames(['en'], { type: 'language' });
            return (code: string) => {
                try {
                    return `${names.of(code) ?? code} (${code})`;
                } catch {
                    return code;
                }
            };
        } catch {
            return (code: string) => code;
        }
    }, []);

    const isLast = step.id === 'done';
    const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);
    const logoUrl = settings?.app_logo_dark?.trim() || settings?.app_logo_white?.trim() || '/logo.png';
    const premiumInactive = usePremiumInactive();

    return (
        <BackgroundWrapper>
            <div className='motion-content relative mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:gap-8 lg:py-10'>
                <div
                    aria-hidden
                    className='pointer-events-none fixed inset-0 -z-10 overflow-hidden motion-reduce:hidden'
                >
                    <div className='bg-primary/15 absolute -top-32 -left-24 h-96 w-96 animate-pulse rounded-full blur-3xl [animation-duration:6s]' />
                    <div className='bg-primary/10 absolute -right-24 bottom-0 h-[28rem] w-[28rem] animate-pulse rounded-full blur-3xl [animation-delay:2s] [animation-duration:8s]' />
                </div>

                <aside className='fp-surface animate-in fade-in slide-in-from-left-4 shrink-0 rounded-2xl border p-4 shadow-sm duration-500 motion-reduce:animate-none sm:p-5 lg:sticky lg:top-8 lg:w-72'>
                    <div className='mb-5 flex items-center gap-3'>
                        <div className='fp-icon-tile flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl p-1.5'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={logoUrl}
                                alt={settings?.app_name || 'Panel'}
                                className='h-full w-full object-contain'
                            />
                        </div>
                        <div className='min-w-0'>
                            <p className='text-sm font-semibold'>{t('setup_wizard.title')}</p>
                            <p className='text-muted-foreground text-xs'>
                                {t('setup_wizard.progress', {
                                    current: String(stepIndex + 1),
                                    total: String(STEPS.length),
                                })}
                            </p>
                        </div>
                    </div>

                    <div
                        className='bg-muted/40 mb-4 h-1.5 overflow-hidden rounded-full'
                        role='progressbar'
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                        aria-label={t('setup_wizard.progress_label')}
                    >
                        <div
                            className='from-primary/70 to-primary h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out'
                            style={{ width: `${Math.max(progress, 4)}%` }}
                        />
                    </div>

                    <div className='mb-1 flex items-center justify-between gap-3 lg:hidden'>
                        <span className='text-xs font-medium'>{t(STEP_TITLES[step.id])}</span>
                        <span className='text-muted-foreground text-xs tabular-nums'>{progress}%</span>
                    </div>

                    <ol className='relative hidden lg:block'>
                        <span aria-hidden className='bg-border absolute top-4 bottom-4 left-[1.15rem] w-px' />
                        {STEPS.map((s, i) => {
                            const done = i < stepIndex;
                            const active = i === stepIndex;
                            const clickable = !isLast && i < stepIndex;
                            return (
                                <li key={s.id} className='relative'>
                                    <button
                                        type='button'
                                        disabled={!clickable}
                                        onClick={() => goTo(i)}
                                        aria-current={active ? 'step' : undefined}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-all duration-300',
                                            active && 'bg-primary/10 text-primary',
                                            !active && done && 'text-foreground hover:bg-muted/30',
                                            !active && !done && 'text-muted-foreground',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'bg-background relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300',
                                                active &&
                                                    'border-primary bg-primary text-primary-foreground scale-110 shadow-md',
                                                done && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
                                            )}
                                        >
                                            {done ? (
                                                <Check className='animate-in zoom-in h-3.5 w-3.5 duration-300' />
                                            ) : (
                                                <s.icon className='h-3.5 w-3.5' />
                                            )}
                                        </span>
                                        <span className='truncate font-medium'>{t(STEP_TITLES[s.id])}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    <p className='text-muted-foreground mt-4 hidden text-[11px] leading-relaxed lg:block'>
                        {t('setup_wizard.keyboard_hint')}
                    </p>
                </aside>

                <main className='fp-surface animate-in fade-in slide-in-from-bottom-4 min-w-0 flex-1 overflow-hidden rounded-2xl border shadow-sm duration-500 motion-reduce:animate-none'>
                    <header className='flex items-start gap-4 border-b p-5 sm:p-7'>
                        <div
                            key={`icon-${step.id}`}
                            className='bg-primary/10 text-primary animate-in zoom-in-75 fade-in flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl duration-500 motion-reduce:animate-none'
                        >
                            <step.icon className='h-5 w-5' />
                        </div>
                        <div key={`head-${step.id}`} className='animate-in fade-in min-w-0 duration-500'>
                            <p className='text-primary mb-1 text-[11px] font-semibold tracking-[0.16em] uppercase'>
                                {t('setup_wizard.progress', {
                                    current: String(stepIndex + 1),
                                    total: String(STEPS.length),
                                })}
                            </p>
                            <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>
                                {t(STEP_TITLES[step.id])}
                            </h1>
                            <p className='text-muted-foreground mt-1 max-w-2xl text-sm'>
                                {t(STEP_DESCRIPTIONS[step.id])}
                            </p>
                        </div>
                    </header>

                    <div
                        key={step.id}
                        className={cn(
                            'animate-in fade-in space-y-6 p-5 duration-500 ease-out motion-reduce:animate-none sm:p-7',
                            direction === 'forward' ? 'slide-in-from-right-6' : 'slide-in-from-left-6',
                        )}
                    >
                        {loading ? (
                            <div className='space-y-3 py-6' aria-busy>
                                <div className='bg-muted/40 h-24 animate-pulse rounded-2xl' />
                                <div className='grid gap-3 sm:grid-cols-2'>
                                    <div className='bg-muted/40 h-11 animate-pulse rounded-lg' />
                                    <div className='bg-muted/40 h-11 animate-pulse rounded-lg' />
                                </div>
                                <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {t('setup_wizard.loading')}
                                </p>
                            </div>
                        ) : step.id === 'welcome' ? (
                            <>
                                <WelcomeHero logoUrl={logoUrl} />
                                <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]'>
                                    <div className='space-y-5'>
                                        <div className='grid gap-5 sm:grid-cols-2'>
                                            <Input
                                                label={t('setup_wizard.welcome.name_label')}
                                                value={values.app_name || ''}
                                                onChange={(e) => set('app_name', e.target.value)}
                                                maxLength={64}
                                                error={showErrors && errors.app_name ? t(errors.app_name) : undefined}
                                            />
                                            <Input
                                                label={t('setup_wizard.welcome.url_label')}
                                                value={values.app_url || ''}
                                                onChange={(e) => set('app_url', e.target.value.trim())}
                                                error={
                                                    url.error && (showErrors || values.app_url)
                                                        ? t(url.error)
                                                        : undefined
                                                }
                                                icon={<Globe className='h-4 w-4' />}
                                                inputMode='url'
                                                description={t('setup_wizard.welcome.url_help')}
                                            />
                                        </div>
                                        {!url.error && url.warnings.length > 0 ? (
                                            <div className='space-y-2'>
                                                {url.warnings.map((w) => (
                                                    <TipCard
                                                        key={w}
                                                        variant='warning'
                                                        icon={AlertTriangle}
                                                        title={t('setup_wizard.welcome.url_check')}
                                                    >
                                                        <p>{t(w, { origin: window.location.origin })}</p>
                                                    </TipCard>
                                                ))}
                                                {values.app_url !== window.location.origin ? (
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        onClick={() => set('app_url', window.location.origin)}
                                                    >
                                                        {t('setup_wizard.welcome.use_current', {
                                                            origin: window.location.origin,
                                                        })}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        <div className='border-border/70 bg-muted/15 rounded-2xl border p-4 sm:p-5'>
                                            <ImageAttachmentField
                                                id='setup-panel-logo'
                                                label={t('setup_wizard.welcome.logo_label')}
                                                description={t('setup_wizard.welcome.logo_help')}
                                                value={values.app_logo_dark || ''}
                                                onChange={(value) => {
                                                    set('app_logo_dark', value.trim());
                                                    set('app_logo_white', value.trim());
                                                }}
                                                allowManualUrl
                                                placeholder='https://… or /attachments/…'
                                            />
                                        </div>
                                    </div>
                                    <BrandPreview
                                        name={values.app_name || ''}
                                        url={values.app_url || ''}
                                        logo={values.app_logo_dark || logoUrl}
                                    />
                                </div>
                            </>
                        ) : step.id === 'locale' ? (
                            <div className='grid gap-4 sm:grid-cols-2'>
                                <HeadlessSelect
                                    label={t('setup_wizard.locale.timezone_label')}
                                    description={t('setup_wizard.locale.timezone_help')}
                                    value={values.app_timezone || 'UTC'}
                                    onChange={(v) => set('app_timezone', String(v))}
                                    searchable
                                    searchPlaceholder={t('setup_wizard.locale.search_timezone')}
                                    buttonClassName='h-11 rounded-lg'
                                    options={(options.app_timezone ?? ['UTC']).map((tz) => ({ id: tz, name: tz }))}
                                />
                                <HeadlessSelect
                                    label={t('setup_wizard.locale.language_label')}
                                    description={t('setup_wizard.locale.language_help')}
                                    value={values.app_locale_default || 'en'}
                                    onChange={(v) => set('app_locale_default', String(v))}
                                    options={(options.app_locale_default ?? ['en']).map((code) => ({
                                        id: code,
                                        name: languageName(code),
                                    }))}
                                />
                                {Intl.DateTimeFormat().resolvedOptions().timeZone !== values.app_timezone ? (
                                    <div className='sm:col-span-2'>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            onClick={() =>
                                                set('app_timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
                                            }
                                        >
                                            {t('setup_wizard.locale.use_browser', {
                                                zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                            })}
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                        ) : step.id === 'mail' ? (
                            <>
                                <ToggleRow
                                    title={t('setup_wizard.mail.enable_title')}
                                    body={t('setup_wizard.mail.enable_body')}
                                    checked={bool('smtp_enabled', false)}
                                    onChange={(v) => setBool('smtp_enabled', v)}
                                />
                                {bool('smtp_enabled', false) ? (
                                    <div className='grid gap-4 sm:grid-cols-2'>
                                        <Input
                                            label={t('setup_wizard.mail.host')}
                                            value={values.smtp_host || ''}
                                            onChange={(e) => set('smtp_host', e.target.value.trim())}
                                            error={showErrors && errors.smtp_host ? t(errors.smtp_host) : undefined}
                                        />
                                        <div className='grid grid-cols-2 gap-4'>
                                            <Input
                                                label={t('setup_wizard.mail.port')}
                                                value={values.smtp_port || ''}
                                                onChange={(e) => set('smtp_port', e.target.value.replace(/\D/g, ''))}
                                                error={showErrors && errors.smtp_port ? t(errors.smtp_port) : undefined}
                                                inputMode='numeric'
                                            />
                                            <HeadlessSelect
                                                label={t('setup_wizard.mail.encryption')}
                                                value={values.smtp_encryption || 'tls'}
                                                onChange={(v) => set('smtp_encryption', String(v))}
                                                options={(options.smtp_encryption ?? ['tls']).map((o) => ({
                                                    id: o,
                                                    name: o,
                                                }))}
                                            />
                                        </div>
                                        <Input
                                            label={t('setup_wizard.mail.user')}
                                            value={values.smtp_user || ''}
                                            onChange={(e) => set('smtp_user', e.target.value.trim())}
                                            autoComplete='off'
                                        />
                                        <Input
                                            label={t('setup_wizard.mail.password')}
                                            type='password'
                                            value={values.smtp_pass === '••••••••' ? '' : values.smtp_pass || ''}
                                            placeholder={initial.smtp_pass ? '••••••••' : ''}
                                            onChange={(e) => set('smtp_pass', e.target.value)}
                                            autoComplete='new-password'
                                        />
                                        <Input
                                            label={t('setup_wizard.mail.from')}
                                            value={values.smtp_from || ''}
                                            onChange={(e) => set('smtp_from', e.target.value.trim())}
                                            error={showErrors && errors.smtp_from ? t(errors.smtp_from) : undefined}
                                            className='sm:col-span-2'
                                        />
                                        <div className='sm:col-span-2'>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => void sendTest()}
                                                loading={testing}
                                            >
                                                {!testing ? <Mail className='mr-2 h-4 w-4' /> : null}
                                                {t('setup_wizard.mail.send_test')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <TipCard title={t('setup_wizard.mail.later_title')}>
                                        <p>{t('setup_wizard.mail.later_body')}</p>
                                    </TipCard>
                                )}
                            </>
                        ) : step.id === 'modules' ? (
                            <div className='grid gap-3 sm:grid-cols-2'>
                                {MODULES.map((m, idx) => (
                                    <ToggleRow
                                        key={m.key}
                                        delay={idx * 45}
                                        title={t(m.title)}
                                        body={t(m.body)}
                                        checked={bool(m.key, m.defaultOn)}
                                        onChange={(v) => setBool(m.key, v)}
                                    />
                                ))}
                                <p className='text-muted-foreground text-xs sm:col-span-2'>
                                    {t('setup_wizard.modules.note')}
                                </p>
                            </div>
                        ) : step.id === 'security' ? (
                            <div className='grid gap-3'>
                                <ToggleRow
                                    title={t('setup_wizard.security.registration_title')}
                                    body={t('setup_wizard.security.registration_body')}
                                    checked={bool('registration_enabled')}
                                    onChange={(v) => setBool('registration_enabled', v)}
                                />
                                <ToggleRow
                                    title={t('setup_wizard.security.two_fa_title')}
                                    body={t('setup_wizard.security.two_fa_body')}
                                    checked={bool('require_two_fa_admins', false)}
                                    onChange={(v) => setBool('require_two_fa_admins', v)}
                                />
                                <ToggleRow
                                    title={t('setup_wizard.security.turnstile_title')}
                                    body={t('setup_wizard.security.turnstile_body')}
                                    checked={bool('turnstile_enabled', false)}
                                    onChange={(v) => setBool('turnstile_enabled', v)}
                                >
                                    {bool('turnstile_enabled', false) ? (
                                        <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                                            <Input
                                                label={t('setup_wizard.security.site_key')}
                                                value={values.turnstile_key_pub || ''}
                                                onChange={(e) => set('turnstile_key_pub', e.target.value.trim())}
                                                error={
                                                    showErrors && errors.turnstile_key_pub
                                                        ? t(errors.turnstile_key_pub)
                                                        : undefined
                                                }
                                            />
                                            <Input
                                                label={t('setup_wizard.security.secret_key')}
                                                type='password'
                                                value={
                                                    values.turnstile_key_priv === '••••••••'
                                                        ? ''
                                                        : values.turnstile_key_priv || ''
                                                }
                                                placeholder={initial.turnstile_key_priv ? '••••••••' : ''}
                                                onChange={(e) => set('turnstile_key_priv', e.target.value.trim())}
                                                error={
                                                    showErrors && errors.turnstile_key_priv
                                                        ? t(errors.turnstile_key_priv)
                                                        : undefined
                                                }
                                                autoComplete='new-password'
                                            />
                                        </div>
                                    ) : null}
                                </ToggleRow>
                            </div>
                        ) : step.id === 'infrastructure' ? (
                            <div className='grid gap-4 md:grid-cols-2'>
                                <TaskCard
                                    icon={MapPin}
                                    done={counts.locations > 0}
                                    title={t('setup_wizard.infrastructure.location_title')}
                                    body={
                                        counts.locations > 0
                                            ? t('setup_wizard.infrastructure.location_done', {
                                                  count: String(counts.locations),
                                              })
                                            : t('setup_wizard.infrastructure.location_body')
                                    }
                                    doneLabel={t('setup_wizard.infrastructure.done')}
                                >
                                    {counts.locations === 0 ? (
                                        <div className='flex gap-2'>
                                            <Input
                                                value={locationName}
                                                onChange={(e) => setLocationName(e.target.value)}
                                                placeholder={t('setup_wizard.infrastructure.location_placeholder')}
                                                aria-label={t('setup_wizard.infrastructure.location_title')}
                                            />
                                            <Button
                                                onClick={() => void createLocation()}
                                                loading={creatingLocation}
                                                disabled={!locationName.trim()}
                                            >
                                                {t('setup_wizard.infrastructure.create')}
                                            </Button>
                                        </div>
                                    ) : null}
                                </TaskCard>
                                <TaskCard
                                    icon={Server}
                                    done={counts.nodes > 0}
                                    title={t('setup_wizard.infrastructure.node_title')}
                                    body={
                                        counts.nodes > 0
                                            ? t('setup_wizard.infrastructure.node_done', {
                                                  count: String(counts.nodes),
                                              })
                                            : t('setup_wizard.infrastructure.node_body')
                                    }
                                    doneLabel={t('setup_wizard.infrastructure.done')}
                                >
                                    <Button asChild variant={counts.nodes > 0 ? 'outline' : 'default'} size='sm'>
                                        <Link
                                            href={counts.nodes > 0 ? '/admin/nodes' : '/admin/nodes/create'}
                                            onClick={() => setSetupDeferred(true)}
                                        >
                                            {counts.nodes > 0
                                                ? t('setup_wizard.infrastructure.view_nodes')
                                                : t('setup_wizard.infrastructure.add_node')}
                                            <ArrowRight className='ml-2 h-4 w-4' />
                                        </Link>
                                    </Button>
                                </TaskCard>
                                <div className='md:col-span-2'>
                                    <TipCard title={t('setup_wizard.infrastructure.tip_title')}>
                                        <p>{t('setup_wizard.infrastructure.tip_body')}</p>
                                    </TipCard>
                                </div>
                            </div>
                        ) : (
                            <DoneScreen premiumInactive={premiumInactive} />
                        )}
                    </div>

                    <footer className='bg-muted/10 flex flex-col-reverse gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
                        {isLast ? (
                            <span />
                        ) : (
                            <div className='flex gap-2'>
                                {stepIndex > 0 ? (
                                    <Button variant='ghost' onClick={back} disabled={saving}>
                                        <ArrowLeft className='mr-2 h-4 w-4' />
                                        {t('setup_wizard.actions.back')}
                                    </Button>
                                ) : null}
                                <Button variant='ghost' onClick={() => void finishLater()} disabled={saving}>
                                    {t('setup_wizard.actions.finish_later')}
                                </Button>
                            </div>
                        )}
                        <div className='flex gap-2 sm:justify-end'>
                            {step.id === 'mail' || step.id === 'infrastructure' ? (
                                <Button variant='outline' onClick={() => void skipCurrentStep()} disabled={saving}>
                                    {t('setup_wizard.actions.skip')}
                                </Button>
                            ) : null}
                            {isLast ? (
                                <Button onClick={() => router.push('/admin')}>
                                    {t('setup_wizard.actions.go_admin')}
                                    <ArrowRight className='ml-2 h-4 w-4' />
                                </Button>
                            ) : (
                                <Button onClick={() => void next()} loading={saving} disabled={loading}>
                                    {STEPS[stepIndex + 1]?.id === 'done'
                                        ? t('setup_wizard.actions.finish')
                                        : t('setup_wizard.actions.next')}
                                    {!saving ? <ArrowRight className='ml-2 h-4 w-4' /> : null}
                                </Button>
                            )}
                        </div>
                    </footer>
                </main>
            </div>
        </BackgroundWrapper>
    );
}

function WelcomeHero({ logoUrl }: { logoUrl: string }) {
    const { t } = useTranslation();
    return (
        <div className='border-primary/20 from-primary/15 via-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br to-transparent p-5 sm:p-6'>
            <Sparkles
                aria-hidden
                className='text-primary/30 absolute top-4 right-4 h-16 w-16 animate-pulse motion-reduce:animate-none'
            />
            <div className='relative flex items-center gap-4'>
                <div className='fp-icon-tile animate-in zoom-in-50 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl p-2 shadow-sm duration-700 motion-reduce:animate-none'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt='' className='h-full w-full object-contain' />
                </div>
                <div className='min-w-0'>
                    <h2 className='text-lg font-semibold tracking-tight sm:text-xl'>{t('setup_wizard.hero.title')}</h2>
                    <p className='text-muted-foreground mt-0.5 text-sm'>{t('setup_wizard.hero.body')}</p>
                </div>
            </div>
            <div className='relative mt-4 flex flex-wrap gap-2'>
                {(['time', 'later', 'saves'] as const).map((chip, idx) => (
                    <span
                        key={chip}
                        style={{ animationDelay: `${150 + idx * 90}ms` }}
                        className='bg-background/70 animate-in fade-in slide-in-from-bottom-2 fill-mode-both rounded-full border px-3 py-1 text-xs font-medium backdrop-blur duration-500 motion-reduce:animate-none'
                    >
                        {t(`setup_wizard.hero.chip_${chip}`)}
                    </span>
                ))}
            </div>
        </div>
    );
}

function BrandPreview({ name, url, logo }: { name: string; url: string; logo: string }) {
    const { t } = useTranslation();
    let host = url;
    try {
        host = new URL(url).host;
    } catch {
        // Keep the raw value while the admin is typing.
    }
    return (
        <div className='space-y-2'>
            <p className='text-muted-foreground text-xs font-medium'>{t('setup_wizard.preview.label')}</p>
            <div className='fp-surface-inset overflow-hidden rounded-2xl border shadow-sm'>
                <div className='bg-muted/30 flex items-center gap-1.5 border-b px-3 py-2'>
                    <span className='h-2 w-2 rounded-full bg-red-400/70' />
                    <span className='h-2 w-2 rounded-full bg-amber-400/70' />
                    <span className='h-2 w-2 rounded-full bg-emerald-400/70' />
                    <span className='bg-background/80 text-muted-foreground ml-2 min-w-0 flex-1 truncate rounded-md px-2 py-0.5 text-[10px]'>
                        {host || '-'}
                    </span>
                </div>
                <div className='flex'>
                    <div className='w-full space-y-3 p-3'>
                        <div className='flex items-center gap-2'>
                            <div className='fp-icon-tile flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg p-1'>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    key={logo}
                                    src={logo}
                                    alt=''
                                    className='animate-in fade-in h-full w-full object-contain'
                                />
                            </div>
                            <span className='truncate text-sm font-semibold transition-all'>
                                {name.trim() || t('setup_wizard.preview.placeholder_name')}
                            </span>
                        </div>
                        {[70, 55, 80, 45].map((w, idx) => (
                            <div key={idx} className='flex items-center gap-2'>
                                <span className={cn('h-3 w-3 rounded', idx === 0 ? 'bg-primary/60' : 'bg-muted')} />
                                <span
                                    className={cn('h-2 rounded-full', idx === 0 ? 'bg-primary/40' : 'bg-muted')}
                                    style={{ width: `${w}%` }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <p className='text-muted-foreground text-[11px]'>{t('setup_wizard.preview.hint')}</p>
        </div>
    );
}

function DoneScreen({ premiumInactive }: { premiumInactive: boolean }) {
    const { t } = useTranslation();
    const items: { href: string; icon: ComponentType<{ className?: string }>; key: string; external?: boolean }[] = [
        { href: '/admin/locations', icon: MapPin, key: 'location' },
        { href: '/admin/nodes/create', icon: Server, key: 'node' },
        { href: '/admin/spells', icon: Egg, key: 'spell' },
        { href: '/admin/servers/create', icon: Rocket, key: 'server' },
        { href: 'https://docs.featherpanel.com', icon: BookOpen, key: 'docs', external: true },
        { href: '/admin/feathercloud/marketplace', icon: Store, key: 'marketplace' },
        { href: '/admin/users', icon: Users, key: 'users' },
        { href: '/admin/settings', icon: Settings, key: 'settings' },
    ];
    return (
        <div className='space-y-6'>
            <div className='flex flex-col items-center gap-3 py-4 text-center'>
                <div className='relative'>
                    <span className='absolute inset-0 animate-ping rounded-full bg-emerald-500/30 [animation-iteration-count:2] motion-reduce:hidden' />
                    <div className='animate-in zoom-in-50 relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 duration-700 motion-reduce:animate-none'>
                        <PartyPopper className='h-8 w-8' />
                    </div>
                </div>
                <h2 className='animate-in fade-in slide-in-from-bottom-2 text-xl font-semibold tracking-tight duration-500 sm:text-2xl'>
                    {t('setup_wizard.done.headline')}
                </h2>
                <p className='text-muted-foreground max-w-lg text-sm'>{t('setup_wizard.done.saved')}</p>
            </div>
            <div>
                <p className='text-muted-foreground mb-3 text-xs font-semibold tracking-[0.14em] uppercase'>
                    {t('setup_wizard.done.next_steps')}
                </p>
                <div className='grid gap-3 sm:grid-cols-2'>
                    {items.map((item, idx) => (
                        <NextLink
                            key={item.key}
                            href={item.href}
                            external={item.external}
                            delay={idx * 60}
                            icon={item.icon}
                            title={t(`setup_wizard.done.${item.key}_title`)}
                            body={t(`setup_wizard.done.${item.key}_body`)}
                        />
                    ))}
                </div>
            </div>
            {premiumInactive ? (
                <p className='text-muted-foreground flex items-center justify-center gap-1.5 text-center text-xs'>
                    <Heart className='text-primary h-3.5 w-3.5 shrink-0' />
                    <span>
                        {t('setup_wizard.done.support_note')}{' '}
                        <a
                            href={FEATHERPANEL_DONATE_URL}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-primary underline-offset-2 hover:underline'
                        >
                            {t('setup_wizard.done.support_link')}
                        </a>
                    </span>
                </p>
            ) : null}
        </div>
    );
}

function ToggleRow({
    title,
    body,
    checked,
    onChange,
    children,
    delay = 0,
}: {
    title: string;
    body: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    children?: ReactNode;
    delay?: number;
}) {
    return (
        <div
            style={delay ? { animationDelay: `${delay}ms` } : undefined}
            className={cn(
                'fp-surface-inset animate-in fade-in slide-in-from-bottom-2 fill-mode-both rounded-xl border p-4 transition-colors duration-300 motion-reduce:animate-none',
                checked && 'border-primary/30 bg-primary/[0.04]',
            )}
        >
            <label className='flex cursor-pointer items-start justify-between gap-4'>
                <span className='min-w-0'>
                    <span className='block text-sm font-medium'>{title}</span>
                    <span className='text-muted-foreground mt-0.5 block text-xs leading-relaxed'>{body}</span>
                </span>
                <Switch checked={checked} onCheckedChange={onChange} />
            </label>
            {children}
        </div>
    );
}

function TaskCard({
    icon: Icon,
    title,
    body,
    done,
    doneLabel,
    children,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    body: string;
    done: boolean;
    doneLabel: string;
    children?: ReactNode;
}) {
    return (
        <div className='fp-surface-inset flex flex-col gap-4 rounded-xl border p-4'>
            <div className='flex items-start gap-3'>
                <div
                    className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        done ? 'bg-emerald-500/10 text-emerald-500' : 'fp-icon-tile',
                    )}
                >
                    {done ? <Check className='h-4 w-4' /> : <Icon className='h-4 w-4' />}
                </div>
                <div className='min-w-0'>
                    <p className='flex items-center gap-2 text-sm font-medium'>
                        {title}
                        {done ? <span className='text-xs font-normal text-emerald-500'>{doneLabel}</span> : null}
                    </p>
                    <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>{body}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

function NextLink({
    href,
    icon: Icon,
    title,
    body,
    external = false,
    delay = 0,
}: {
    href: string;
    icon: ComponentType<{ className?: string }>;
    title: string;
    body: string;
    external?: boolean;
    delay?: number;
}) {
    return (
        <Link
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            style={delay ? { animationDelay: `${delay}ms` } : undefined}
            className='fp-surface-inset group hover:border-primary/30 animate-in fade-in slide-in-from-bottom-2 fill-mode-both flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 motion-reduce:animate-none motion-reduce:hover:translate-y-0'
        >
            <div className='fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                <Icon className='h-4 w-4 transition-transform duration-300 group-hover:scale-110' />
            </div>
            <div className='min-w-0 flex-1'>
                <p className='text-sm font-medium'>{title}</p>
                <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>{body}</p>
            </div>
            <ArrowRight className='text-muted-foreground group-hover:text-primary mt-0.5 h-4 w-4 shrink-0 transition-colors' />
        </Link>
    );
}
