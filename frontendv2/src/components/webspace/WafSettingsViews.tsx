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

import { useState } from 'react';
import { Plus, ShieldCheck, ShieldOff, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

const AGENT_EXAMPLE = 'BadBot/1.0';

/** Identifier for a new list entry (module level so it is not an impure call during render). */
export function makeId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

export type WafMode = 'off' | 'detect' | 'block';

export type WafCategory = 'sqli' | 'xss' | 'rce' | 'lfi' | 'php' | 'protocol' | 'scanner' | 'leakage';

export interface CustomRule {
    id: string;
    name: string;
    target: 'path' | 'query' | 'user_agent' | 'referer' | 'method' | 'host';
    op: 'contains' | 'equals' | 'starts' | 'regex';
    value: string;
    action: 'block' | 'allow' | 'log';
    enabled: boolean;
}

export interface WafException {
    id: string;
    path: string;
    /** Empty means every attack type is skipped for this path. */
    categories: WafCategory[];
}

export interface WafSettings {
    mode: WafMode;
    allow_ips: string[];
    deny_ips: string[];
    deny_paths: string[];
    rate_limit: { enabled: boolean; per_minute: number; ban_minutes: number };
    anti_bot: { scanner_paths: boolean; bad_agents: boolean; empty_agent: boolean; custom_agents: string[] };
    exceptions: WafException[];
    engine: { sensitivity: 1 | 2 | 3 | 4; categories: Record<WafCategory, boolean> };
    custom_rules: CustomRule[];
    geo: { mode: 'off' | 'deny' | 'allow'; countries: string[] };
    http: { methods: string[]; max_body_mb: number; max_url_length: number };
    headers: {
        hsts: boolean;
        nosniff: boolean;
        referrer: boolean;
        permissions: boolean;
        frame: 'off' | 'sameorigin' | 'deny';
    };
    hotlink: { enabled: boolean; allowed_hosts: string[]; extensions: string[] };
    login: { enabled: boolean; paths: string[]; per_minute: number; ban_minutes: number };
    block_page: { status: number; message: string; html: string };
}

export type SettingsPatch = Partial<WafSettings>;

const DEFAULT_SETTINGS: WafSettings = {
    mode: 'detect',
    allow_ips: [],
    deny_ips: [],
    deny_paths: [],
    rate_limit: { enabled: false, per_minute: 240, ban_minutes: 15 },
    anti_bot: { scanner_paths: true, bad_agents: false, empty_agent: false, custom_agents: [] },
    exceptions: [],
    engine: {
        sensitivity: 1,
        categories: {
            sqli: true,
            xss: true,
            rce: true,
            lfi: true,
            php: true,
            protocol: true,
            scanner: true,
            leakage: false,
        },
    },
    custom_rules: [],
    geo: { mode: 'off', countries: [] },
    http: {
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        max_body_mb: 10,
        max_url_length: 2048,
    },
    headers: { hsts: false, nosniff: true, referrer: true, permissions: false, frame: 'sameorigin' },
    hotlink: { enabled: false, allowed_hosts: [], extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
    login: {
        enabled: false,
        paths: ['/wp-login.php', '/xmlrpc.php', '/administrator', '/login'],
        per_minute: 10,
        ban_minutes: 30,
    },
    block_page: { status: 403, message: 'Access denied', html: '' },
};

/** Fills missing fields so an older backend response never breaks the UI. */
export function normalizeSettings(raw: Partial<WafSettings>): WafSettings {
    const d = DEFAULT_SETTINGS;
    return {
        ...d,
        ...raw,
        rate_limit: { ...d.rate_limit, ...raw.rate_limit },
        anti_bot: { ...d.anti_bot, ...raw.anti_bot },
        engine: { ...d.engine, ...raw.engine, categories: { ...d.engine.categories, ...raw.engine?.categories } },
        geo: { ...d.geo, ...raw.geo },
        http: { ...d.http, ...raw.http },
        headers: { ...d.headers, ...raw.headers },
        hotlink: { ...d.hotlink, ...raw.hotlink },
        login: { ...d.login, ...raw.login },
        block_page: { ...d.block_page, ...raw.block_page },
    };
}

export const IP_RE = /^[0-9a-fA-F:.]{2,45}(\/\d{1,3})?$/;

export function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section className='border-border/50 bg-card/50 rounded-xl border p-5 backdrop-blur-xl'>
            <h3 className='text-sm font-medium'>{title}</h3>
            {hint ? <p className='text-muted-foreground mt-1 mb-4 text-xs'>{hint}</p> : <div className='mb-4' />}
            {children}
        </section>
    );
}

export function Switch({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
}) {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300',
                checked ? 'bg-primary' : 'bg-secondary',
            )}
        >
            <span
                className={cn(
                    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300',
                    checked && 'translate-x-5',
                )}
            />
        </button>
    );
}

export function ToggleRow({
    title,
    hint,
    checked,
    onChange,
}: {
    title: string;
    hint: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className='border-border/30 flex items-center justify-between gap-4 border-b py-3 last:border-b-0'>
            <div className='min-w-0'>
                <p className='text-sm'>{title}</p>
                <p className='text-muted-foreground text-xs'>{hint}</p>
            </div>
            <Switch checked={checked} onChange={onChange} label={title} />
        </div>
    );
}

export function ListEditor({
    title,
    hint,
    items,
    placeholder,
    validate,
    invalidText,
    onChange,
    mono = true,
}: {
    title: string;
    hint: string;
    items: string[];
    placeholder: string;
    validate: (v: string) => boolean;
    invalidText: string;
    onChange: (next: string[]) => void;
    mono?: boolean;
}) {
    const { t } = useTranslation();
    const [value, setValue] = useState('');
    const [error, setError] = useState(false);

    const add = () => {
        const v = value.trim();
        if (!validate(v)) {
            setError(true);
            return;
        }
        setError(false);
        if (!items.includes(v)) onChange([...items, v]);
        setValue('');
    };

    return (
        <Card title={title} hint={hint}>
            <div className='flex gap-2'>
                <input
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        setError(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') add();
                    }}
                    placeholder={placeholder}
                    maxLength={200}
                    className={cn(
                        'bg-secondary/40 focus:border-primary min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none',
                        mono && 'font-mono',
                        error ? 'border-red-500/60' : 'border-border/50',
                    )}
                />
                <Button size='sm' onClick={add}>
                    <Plus className='mr-1 h-4 w-4' />
                    {t('webSpaces.wafDashboard.add')}
                </Button>
            </div>
            {error ? <p className='mt-1.5 text-xs text-red-400'>{invalidText}</p> : null}
            {items.length === 0 ? (
                <p className='text-muted-foreground mt-4 text-sm'>{t('webSpaces.wafDashboard.listEmpty')}</p>
            ) : (
                <ul className='mt-4 space-y-1.5'>
                    {items.map((it) => (
                        <li
                            key={it}
                            className='bg-secondary/30 flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm'
                        >
                            <span className={cn('truncate', mono && 'font-mono text-xs')}>{it}</span>
                            <button
                                type='button'
                                aria-label={t('webSpaces.wafDashboard.remove')}
                                className='text-muted-foreground transition hover:text-red-400'
                                onClick={() => onChange(items.filter((x) => x !== it))}
                            >
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

export function AllowDenyView({ s, save }: { s: WafSettings; save: (p: SettingsPatch) => Promise<void> }) {
    const { t } = useTranslation();
    return (
        <div className='waf-view grid gap-4 lg:grid-cols-2'>
            <ListEditor
                title={t('webSpaces.wafDashboard.allowedIps')}
                hint={t('webSpaces.wafDashboard.allowedIpsHint')}
                items={s.allow_ips}
                placeholder='203.0.113.7 / 198.51.100.0/24'
                validate={(v) => IP_RE.test(v)}
                invalidText={t('webSpaces.wafDashboard.invalidIp')}
                onChange={(next) => void save({ allow_ips: next })}
            />
            <ListEditor
                title={t('webSpaces.wafDashboard.blockedIps')}
                hint={t('webSpaces.wafDashboard.blockedIpsHint')}
                items={s.deny_ips}
                placeholder='192.0.2.10'
                validate={(v) => IP_RE.test(v)}
                invalidText={t('webSpaces.wafDashboard.invalidIp')}
                onChange={(next) => void save({ deny_ips: next })}
            />
            <div className='lg:col-span-2'>
                <ListEditor
                    title={t('webSpaces.wafDashboard.blockedPaths')}
                    hint={t('webSpaces.wafDashboard.blockedPathsHint')}
                    items={s.deny_paths}
                    placeholder='/wp-admin/install.php'
                    validate={(v) => v.startsWith('/') && v.length <= 200 && !/\s/.test(v)}
                    invalidText={t('webSpaces.wafDashboard.invalidPath')}
                    onChange={(next) => void save({ deny_paths: next })}
                />
            </div>
        </div>
    );
}

export function NumberField({
    label,
    value,
    min,
    max,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
}) {
    // Keep what the user is typing as text; "2" on the way to "240" must not jump to the minimum.
    const [draft, setDraft] = useState<string | null>(null);
    const commit = () => {
        if (draft === null) return;
        const n = Number(draft);
        if (draft.trim() !== '' && Number.isFinite(n)) {
            onChange(Math.min(max, Math.max(min, Math.round(n))));
        }
        setDraft(null);
    };

    return (
        <label className='block text-sm'>
            <span className='text-muted-foreground mb-1 block text-xs'>{label}</span>
            <input
                type='number'
                min={min}
                max={max}
                value={draft ?? String(value)}
                onChange={(e) => {
                    setDraft(e.target.value);
                    const n = Number(e.target.value);
                    // A value that is already valid goes to the form at once (Ctrl+S while the field is focused).
                    if (e.target.value.trim() !== '' && Number.isInteger(n) && n >= min && n <= max) onChange(n);
                }}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                }}
                className='bg-secondary/40 border-border/50 focus:border-primary w-full rounded-lg border px-3 py-2 outline-none'
            />
        </label>
    );
}

/** Rate limit, login limit and country filter cannot merely report, so they only act while the firewall blocks. */
export function BlockOnlyNote({ mode }: { mode: WafMode }) {
    const { t } = useTranslation();
    if (mode === 'block') return null;
    return (
        <p className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300'>
            {t('webSpaces.wafDashboard.blockOnlyNote')}
        </p>
    );
}

export function RateLimitView({ s, save }: { s: WafSettings; save: (p: SettingsPatch) => Promise<void> }) {
    const { t } = useTranslation();
    const [rl, setRl] = useState(s.rate_limit);
    const [saving, setSaving] = useState(false);
    return (
        <div className='waf-view'>
            <BlockOnlyNote mode={s.mode} />
            <Card title={t('webSpaces.wafDashboard.rateLimitTitle')} hint={t('webSpaces.wafDashboard.rateLimitHint')}>
                <ToggleRow
                    title={t('webSpaces.wafDashboard.rateLimitEnable')}
                    hint={t('webSpaces.wafDashboard.rateLimitEnableHint')}
                    checked={rl.enabled}
                    onChange={(v) => setRl({ ...rl, enabled: v })}
                />
                <div className={cn('mt-4 grid gap-4 sm:grid-cols-2', !rl.enabled && 'pointer-events-none opacity-40')}>
                    <NumberField
                        label={t('webSpaces.wafDashboard.perMinute')}
                        value={rl.per_minute}
                        min={10}
                        max={10000}
                        onChange={(v) => setRl({ ...rl, per_minute: v })}
                    />
                </div>
                <div className='mt-5'>
                    <Button
                        loading={saving}
                        onClick={async () => {
                            setSaving(true);
                            await save({ rate_limit: rl });
                            setSaving(false);
                        }}
                    >
                        {t('webSpaces.wafDashboard.save')}
                    </Button>
                </div>
            </Card>
        </div>
    );
}

export function AntiBotView({ s, save }: { s: WafSettings; save: (p: SettingsPatch) => Promise<void> }) {
    const { t } = useTranslation();
    const ab = s.anti_bot;
    return (
        <div className='waf-view'>
            <Card title={t('webSpaces.wafDashboard.antiBotTitle')} hint={t('webSpaces.wafDashboard.antiBotHint')}>
                <ToggleRow
                    title={t('webSpaces.wafDashboard.scannerPaths')}
                    hint={t('webSpaces.wafDashboard.scannerPathsHint')}
                    checked={ab.scanner_paths}
                    onChange={(v) => void save({ anti_bot: { ...ab, scanner_paths: v } })}
                />
                <ToggleRow
                    title={t('webSpaces.wafDashboard.badAgents')}
                    hint={t('webSpaces.wafDashboard.badAgentsHint')}
                    checked={ab.bad_agents}
                    onChange={(v) => void save({ anti_bot: { ...ab, bad_agents: v } })}
                />
                <ToggleRow
                    title={t('webSpaces.wafDashboard.emptyAgent')}
                    hint={t('webSpaces.wafDashboard.emptyAgentHint')}
                    checked={ab.empty_agent}
                    onChange={(v) => void save({ anti_bot: { ...ab, empty_agent: v } })}
                />
            </Card>
            <ListEditor
                title={t('webSpaces.wafDashboard.customAgents')}
                hint={t('webSpaces.wafDashboard.customAgentsHint')}
                items={ab.custom_agents}
                placeholder={AGENT_EXAMPLE}
                validate={(v) => v.length >= 2 && v.length <= 80 && !/[\u0000-\u001f]/.test(v)}
                invalidText={t('webSpaces.wafDashboard.customAgentInvalid')}
                onChange={(next) => void save({ anti_bot: { ...ab, custom_agents: next } })}
                mono={false}
            />
        </div>
    );
}

export function ModeView({
    s,
    engineAvailable,
    setMode,
}: {
    s: WafSettings;
    engineAvailable: boolean;
    setMode: (m: WafMode) => Promise<void>;
}) {
    const { t } = useTranslation();
    const modes: { id: WafMode; label: string; hint: string; icon: typeof ShieldOff }[] = [
        {
            id: 'off',
            label: t('webSpaces.wafDashboard.modeOff'),
            hint: t('webSpaces.wafDashboard.modeOffHint'),
            icon: ShieldOff,
        },
        {
            id: 'detect',
            label: t('webSpaces.wafDashboard.modeDetect'),
            hint: t('webSpaces.wafDashboard.modeDetectHint'),
            icon: Eye,
        },
        {
            id: 'block',
            label: t('webSpaces.wafDashboard.modeBlock'),
            hint: t('webSpaces.wafDashboard.modeBlockHint'),
            icon: ShieldCheck,
        },
    ];
    return (
        <div className='waf-view space-y-4'>
            <div className='grid gap-4 sm:grid-cols-3'>
                {modes.map((m) => {
                    const Icon = m.icon;
                    const active = s.mode === m.id;
                    return (
                        <button
                            key={m.id}
                            type='button'
                            onClick={() => void setMode(m.id)}
                            className={cn(
                                'rounded-xl border p-5 text-left transition duration-300 hover:-translate-y-0.5',
                                active
                                    ? 'border-primary/70 bg-primary/10 shadow-[0_0_24px_-8px_hsl(var(--primary))]'
                                    : 'border-border/50 bg-card/50 hover:border-primary/40',
                            )}
                        >
                            <Icon className={cn('h-6 w-6', active ? 'text-primary' : 'text-muted-foreground')} />
                            <p className='mt-3 text-sm font-semibold'>{m.label}</p>
                            <p className='text-muted-foreground mt-1 text-xs'>{m.hint}</p>
                        </button>
                    );
                })}
            </div>
            <Card title={t('webSpaces.wafDashboard.engineTitle')}>
                <p className='flex items-center gap-2 text-sm'>
                    <span
                        className={cn(
                            'h-2 w-2 rounded-full',
                            engineAvailable ? 'bg-primary animate-pulse' : 'bg-amber-400',
                        )}
                    />
                    {engineAvailable ? t('webSpaces.wafDashboard.engineOk') : t('webSpaces.wafDashboard.engineMissing')}
                </p>
            </Card>
        </div>
    );
}
