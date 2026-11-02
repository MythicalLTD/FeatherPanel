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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import {
    BlockOnlyNote,
    Card,
    ListEditor,
    NumberField,
    Switch,
    ToggleRow,
    makeId,
    type CustomRule,
    type WafException,
    type SettingsPatch,
    type WafCategory,
    type WafSettings,
} from '@/components/webspace/WafSettingsViews';

const HEADER_HSTS = 'Strict-Transport-Security';
const HEADER_NOSNIFF = 'X-Content-Type-Options';
const HEADER_REFERRER = 'Referrer-Policy';
const HEADER_PERMISSIONS = 'Permissions-Policy';

type Save = (p: SettingsPatch) => Promise<void>;

const inputCls =
    'bg-secondary/40 border-border/50 focus:border-primary min-w-0 rounded-lg border px-3 py-2 text-sm outline-none dark:scheme-dark';

function SaveBar({ onSave, disabled }: { onSave: () => Promise<void>; disabled?: boolean }) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    return (
        <div className='mt-5'>
            <Button
                loading={saving}
                disabled={disabled}
                onClick={async () => {
                    setSaving(true);
                    try {
                        await onSave();
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                {t('webSpaces.wafDashboard.save')}
            </Button>
        </div>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type='button'
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'rounded-lg border px-3 py-1.5 font-mono text-xs transition',
                active
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
        >
            {children}
        </button>
    );
}

/* ---------- Attack protection (engine) ---------- */

const LEVELS = [1, 2, 3, 4] as const;
const CATEGORIES: WafCategory[] = ['sqli', 'xss', 'rce', 'lfi', 'php', 'protocol', 'scanner', 'leakage'];

export function EngineView({ s, save }: { s: WafSettings; save: Save }) {
    const { t } = useTranslation();
    const e = s.engine;
    return (
        <div className='waf-view'>
            <Card
                title={t('webSpaces.wafDashboard.engineLevelTitle')}
                hint={t('webSpaces.wafDashboard.engineLevelHint')}
            >
                <div className='grid gap-3 sm:grid-cols-2 @2xl:grid-cols-4'>
                    {LEVELS.map((l) => (
                        <button
                            key={l}
                            type='button'
                            onClick={() => void save({ engine: { ...e, sensitivity: l } })}
                            aria-pressed={e.sensitivity === l}
                            className={cn(
                                'rounded-xl border p-4 text-left transition duration-300',
                                e.sensitivity === l
                                    ? 'border-primary/70 bg-primary/10 shadow-[0_0_24px_-8px_hsl(var(--primary))]'
                                    : 'border-border/50 bg-card/50 hover:border-primary/40',
                            )}
                        >
                            <p className={cn('text-sm font-medium', e.sensitivity === l && 'text-primary')}>
                                {t(`webSpaces.wafDashboard.level${l}`)}
                            </p>
                            <p className='text-muted-foreground mt-1 text-xs'>
                                {t(`webSpaces.wafDashboard.level${l}Hint`)}
                            </p>
                        </button>
                    ))}
                </div>
                {e.sensitivity >= 2 ? (
                    <p className='mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300'>
                        {t('webSpaces.wafDashboard.sensitivityWarn')}
                    </p>
                ) : null}
            </Card>
            <Card title={t('webSpaces.wafDashboard.categoriesTitle')} hint={t('webSpaces.wafDashboard.categoriesHint')}>
                {CATEGORIES.map((c) => (
                    <ToggleRow
                        key={c}
                        title={t(`webSpaces.wafDashboard.cat_${c}`)}
                        hint={t(`webSpaces.wafDashboard.cat_${c}Hint`)}
                        checked={e.categories[c]}
                        onChange={(v) => void save({ engine: { ...e, categories: { ...e.categories, [c]: v } } })}
                    />
                ))}
            </Card>
        </div>
    );
}

/* ---------- Custom rules ---------- */

const TARGETS: CustomRule['target'][] = ['path', 'query', 'user_agent', 'referer', 'method', 'host'];
const OPS: CustomRule['op'][] = ['contains', 'equals', 'starts', 'regex'];
const ACTIONS: CustomRule['action'][] = ['block', 'allow', 'log'];
const MAX_RULES = 30;

export function CustomRulesView({ s, save }: { s: WafSettings; save: Save }) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [target, setTarget] = useState<CustomRule['target']>('path');
    const [op, setOp] = useState<CustomRule['op']>('contains');
    const [value, setValue] = useState('');
    const [action, setAction] = useState<CustomRule['action']>('block');
    const [error, setError] = useState('');

    const rules = s.custom_rules.filter(
        (r) => TARGETS.includes(r.target) && OPS.includes(r.op) && ACTIONS.includes(r.action),
    );

    const add = () => {
        const v = value.trim();
        if (!v || v.length > 200) {
            setError(t('webSpaces.wafDashboard.ruleValueInvalid'));
            return;
        }
        if (op === 'regex') {
            try {
                new RegExp(v);
            } catch {
                setError(t('webSpaces.wafDashboard.ruleRegexInvalid'));
                return;
            }
        }
        if (rules.length >= MAX_RULES) {
            setError(t('webSpaces.wafDashboard.ruleLimit', { max: String(MAX_RULES) }));
            return;
        }
        setError('');
        const rule: CustomRule = {
            id: makeId(),
            name: (name.trim() || v).slice(0, 60),
            target,
            op,
            value: v,
            action,
            enabled: true,
        };
        void save({ custom_rules: [...rules, rule] });
        setName('');
        setValue('');
    };

    const patchRule = (id: string, p: Partial<CustomRule>) =>
        void save({ custom_rules: rules.map((r) => (r.id === id ? { ...r, ...p } : r)) });

    return (
        <div className='waf-view'>
            <Card
                title={t('webSpaces.wafDashboard.customRulesTitle')}
                hint={t('webSpaces.wafDashboard.customRulesHint')}
            >
                <div className='grid gap-2 @2xl:grid-cols-[1fr_9rem_9rem_1.4fr_7rem_auto]'>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('webSpaces.wafDashboard.ruleName')}
                        maxLength={60}
                        className={inputCls}
                    />
                    <select
                        value={target}
                        onChange={(e) => setTarget(e.target.value as CustomRule['target'])}
                        className={inputCls}
                    >
                        {TARGETS.map((x) => (
                            <option key={x} value={x}>
                                {t(`webSpaces.wafDashboard.target_${x}`)}
                            </option>
                        ))}
                    </select>
                    <select value={op} onChange={(e) => setOp(e.target.value as CustomRule['op'])} className={inputCls}>
                        {OPS.map((x) => (
                            <option key={x} value={x}>
                                {t(`webSpaces.wafDashboard.op_${x}`)}
                            </option>
                        ))}
                    </select>
                    <input
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            setError('');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') add();
                        }}
                        placeholder={t('webSpaces.wafDashboard.ruleValue')}
                        maxLength={200}
                        className={cn(inputCls, 'font-mono', error && 'border-red-500/60')}
                    />
                    <select
                        value={action}
                        onChange={(e) => setAction(e.target.value as CustomRule['action'])}
                        className={inputCls}
                    >
                        {ACTIONS.map((x) => (
                            <option key={x} value={x}>
                                {t(`webSpaces.wafDashboard.action_${x}`)}
                            </option>
                        ))}
                    </select>
                    <Button size='sm' onClick={add}>
                        <Plus className='mr-1 h-4 w-4' />
                        {t('webSpaces.wafDashboard.add')}
                    </Button>
                </div>
                {error ? <p className='mt-2 text-xs text-red-400'>{error}</p> : null}

                <div className='mt-4 space-y-2'>
                    {rules.length === 0 ? (
                        <p className='text-muted-foreground text-sm'>{t('webSpaces.wafDashboard.noRules')}</p>
                    ) : (
                        rules.map((r) => (
                            <div
                                key={r.id}
                                className={cn(
                                    'bg-secondary/30 flex items-center gap-3 rounded-lg px-3 py-2 transition',
                                    !r.enabled && 'opacity-50',
                                )}
                            >
                                <Switch
                                    checked={r.enabled}
                                    onChange={(v) => patchRule(r.id, { enabled: v })}
                                    label={r.name}
                                />
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm'>{r.name}</p>
                                    <p className='text-muted-foreground truncate font-mono text-xs'>
                                        {t(`webSpaces.wafDashboard.target_${r.target}`)}{' '}
                                        {t(`webSpaces.wafDashboard.op_${r.op}`)}{' '}
                                        <span className='text-foreground'>{r.value}</span>
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'rounded-md px-2 py-0.5 text-xs font-medium',
                                        r.action === 'block' && 'bg-red-500/15 text-red-400',
                                        r.action === 'allow' && 'bg-primary/15 text-primary',
                                        r.action === 'log' && 'bg-amber-400/15 text-amber-300',
                                    )}
                                >
                                    {t(`webSpaces.wafDashboard.action_${r.action}`)}
                                </span>
                                <button
                                    type='button'
                                    aria-label={t('webSpaces.wafDashboard.remove')}
                                    onClick={() => void save({ custom_rules: rules.filter((x) => x.id !== r.id) })}
                                    className='text-muted-foreground transition hover:text-red-400'
                                >
                                    <Trash2 className='h-4 w-4' />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}

/* ---------- Login protection ---------- */

export function LoginView({ s, save }: { s: WafSettings; save: Save }) {
    const { t } = useTranslation();
    const [lp, setLp] = useState({
        enabled: s.login.enabled,
        per_minute: s.login.per_minute,
        ban_minutes: s.login.ban_minutes,
    });
    return (
        <div className='waf-view'>
            <BlockOnlyNote mode={s.mode} />
            <Card title={t('webSpaces.wafDashboard.loginTitle')} hint={t('webSpaces.wafDashboard.loginHint')}>
                <ToggleRow
                    title={t('webSpaces.wafDashboard.loginEnable')}
                    hint={t('webSpaces.wafDashboard.loginEnableHint')}
                    checked={lp.enabled}
                    onChange={(v) => setLp({ ...lp, enabled: v })}
                />
                <div className={cn('mt-4 grid gap-4 sm:grid-cols-2', !lp.enabled && 'pointer-events-none opacity-40')}>
                    <NumberField
                        label={t('webSpaces.wafDashboard.loginPerMinute')}
                        value={lp.per_minute}
                        min={3}
                        max={600}
                        onChange={(v) => setLp({ ...lp, per_minute: v })}
                    />
                </div>
                <SaveBar onSave={() => save({ login: { ...s.login, ...lp } })} />
            </Card>
            <ListEditor
                title={t('webSpaces.wafDashboard.loginPaths')}
                hint={t('webSpaces.wafDashboard.loginPathsHint')}
                items={s.login.paths}
                placeholder='/wp-login.php'
                validate={(v) => /^\/[^\s]{0,199}$/.test(v)}
                invalidText={t('webSpaces.wafDashboard.pathInvalid')}
                onChange={(next) => void save({ login: { ...s.login, paths: next } })}
            />
        </div>
    );
}

/* ---------- Geo blocking ---------- */

const COUNTRY_CODES =
    'AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PS PT PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW'.split(
        ' ',
    );

function regionNames(): (code: string) => string {
    try {
        const lang =
            typeof document !== 'undefined' && document.documentElement.lang ? document.documentElement.lang : 'en';
        const dn = new Intl.DisplayNames([lang], { type: 'region' });
        return (code) => dn.of(code) ?? code;
    } catch {
        return (code) => code;
    }
}

export function GeoView({ s, save }: { s: WafSettings; save: Save }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const name = useMemo(() => regionNames(), []);
    const g = s.geo;

    const options = useMemo(() => {
        const q = query.trim().toLowerCase();
        return COUNTRY_CODES.filter((c) => !g.countries.includes(c))
            .map((c) => ({ code: c, label: name(c) }))
            .filter((o) => !q || o.label.toLowerCase().includes(q) || o.code.toLowerCase() === q)
            .sort((a, b) => a.label.localeCompare(b.label))
            .slice(0, 80);
    }, [query, g.countries, name]);

    const modes: { id: WafSettings['geo']['mode']; label: string; hint: string }[] = [
        { id: 'off', label: t('webSpaces.wafDashboard.geoOff'), hint: t('webSpaces.wafDashboard.geoOffHint') },
        { id: 'deny', label: t('webSpaces.wafDashboard.geoDeny'), hint: t('webSpaces.wafDashboard.geoDenyHint') },
        { id: 'allow', label: t('webSpaces.wafDashboard.geoAllow'), hint: t('webSpaces.wafDashboard.geoAllowHint') },
    ];

    return (
        <div className='waf-view'>
            <BlockOnlyNote mode={s.mode} />
            <Card title={t('webSpaces.wafDashboard.geoTitle')} hint={t('webSpaces.wafDashboard.geoBlockHint')}>
                <div className='grid gap-3 sm:grid-cols-3'>
                    {modes.map((m) => (
                        <button
                            key={m.id}
                            type='button'
                            aria-pressed={g.mode === m.id}
                            onClick={() => void save({ geo: { ...g, mode: m.id } })}
                            className={cn(
                                'rounded-xl border p-4 text-left transition duration-300',
                                g.mode === m.id
                                    ? 'border-primary/70 bg-primary/10 shadow-[0_0_24px_-8px_hsl(var(--primary))]'
                                    : 'border-border/50 bg-card/50 hover:border-primary/40',
                            )}
                        >
                            <p className={cn('text-sm font-medium', g.mode === m.id && 'text-primary')}>{m.label}</p>
                            <p className='text-muted-foreground mt-1 text-xs'>{m.hint}</p>
                        </button>
                    ))}
                </div>
                {g.mode === 'allow' && g.countries.length === 0 ? (
                    <p className='mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300'>
                        {t('webSpaces.wafDashboard.geoAllowEmpty')}
                    </p>
                ) : null}
            </Card>

            <Card title={t('webSpaces.wafDashboard.geoCountries')} hint={t('webSpaces.wafDashboard.geoCountriesHint')}>
                <div className='mb-4 flex min-h-8 flex-wrap gap-2'>
                    {g.countries.length === 0 ? (
                        <p className='text-muted-foreground text-sm'>{t('webSpaces.wafDashboard.none')}</p>
                    ) : (
                        g.countries.map((c) => (
                            <span
                                key={c}
                                className='bg-primary/10 text-primary flex items-center gap-1.5 rounded-lg py-1 pr-1.5 pl-3 text-xs'
                            >
                                {name(c)}
                                <button
                                    type='button'
                                    aria-label={t('webSpaces.wafDashboard.remove')}
                                    onClick={() =>
                                        void save({ geo: { ...g, countries: g.countries.filter((x) => x !== c) } })
                                    }
                                    className='hover:bg-primary/20 rounded p-0.5'
                                >
                                    <X className='h-3.5 w-3.5' />
                                </button>
                            </span>
                        ))
                    )}
                </div>
                <div className='relative'>
                    <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('webSpaces.wafDashboard.geoSearch')}
                        className={cn(inputCls, 'w-full pl-9')}
                    />
                </div>
                <div className='custom-scrollbar mt-2 flex max-h-44 flex-wrap gap-1.5 overflow-y-auto'>
                    {options.map((o) => (
                        <button
                            key={o.code}
                            type='button'
                            onClick={() => void save({ geo: { ...g, countries: [...g.countries, o.code] } })}
                            className='border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground rounded-lg border px-2.5 py-1 text-xs transition'
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    );
}

/* ---------- HTTP rules ---------- */

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export function HttpView({ s, save }: { s: WafSettings; save: Save }) {
    const { t } = useTranslation();
    const [h, setH] = useState(s.http);
    const toggle = (m: string) =>
        setH({ ...h, methods: h.methods.includes(m) ? h.methods.filter((x) => x !== m) : [...h.methods, m] });
    return (
        <div className='waf-view'>
            <Card title={t('webSpaces.wafDashboard.methodsTitle')} hint={t('webSpaces.wafDashboard.methodsHint')}>
                <div className='flex flex-wrap gap-2'>
                    {METHODS.map((m) => (
                        <Chip key={m} active={h.methods.includes(m)} onClick={() => toggle(m)}>
                            {m}
                        </Chip>
                    ))}
                </div>
                {h.methods.length === 0 ? (
                    <p className='mt-3 text-xs text-red-400'>{t('webSpaces.wafDashboard.methodsEmpty')}</p>
                ) : null}
            </Card>
            <Card title={t('webSpaces.wafDashboard.limitsTitle')} hint={t('webSpaces.wafDashboard.limitsHint')}>
                <div className='grid gap-4 sm:grid-cols-2'>
                    <NumberField
                        label={t('webSpaces.wafDashboard.maxBody')}
                        value={h.max_body_mb}
                        min={1}
                        max={1024}
                        onChange={(v) => setH({ ...h, max_body_mb: v })}
                    />
                    <NumberField
                        label={t('webSpaces.wafDashboard.maxUrl')}
                        value={h.max_url_length}
                        min={256}
                        max={8192}
                        onChange={(v) => setH({ ...h, max_url_length: v })}
                    />
                </div>
                <SaveBar disabled={h.methods.length === 0} onSave={() => save({ http: h })} />
            </Card>
        </div>
    );
}

/* ---------- Security headers ---------- */

export function HeadersView({ s, save }: { s: WafSettings; save: Save }) {
    const { t } = useTranslation();
    const h = s.headers;
    return (
        <div className='waf-view'>
            <Card title={t('webSpaces.wafDashboard.headersTitle')} hint={t('webSpaces.wafDashboard.headersHint')}>
                <ToggleRow
                    title={HEADER_HSTS}
                    hint={t('webSpaces.wafDashboard.hstsHint')}
                    checked={h.hsts}
                    onChange={(v) => void save({ headers: { ...h, hsts: v } })}
                />
                <ToggleRow
                    title={HEADER_NOSNIFF}
                    hint={t('webSpaces.wafDashboard.nosniffHint')}
                    checked={h.nosniff}
                    onChange={(v) => void save({ headers: { ...h, nosniff: v } })}
                />
                <ToggleRow
                    title={HEADER_REFERRER}
                    hint={t('webSpaces.wafDashboard.referrerHint')}
                    checked={h.referrer}
                    onChange={(v) => void save({ headers: { ...h, referrer: v } })}
                />
                <ToggleRow
                    title={HEADER_PERMISSIONS}
                    hint={t('webSpaces.wafDashboard.permissionsHint')}
                    checked={h.permissions}
                    onChange={(v) => void save({ headers: { ...h, permissions: v } })}
                />
                <div className='border-border/30 flex items-center justify-between gap-4 border-t py-3'>
                    <div className='min-w-0'>
                        <p className='text-sm'>X-Frame-Options</p>
                        <p className='text-muted-foreground text-xs'>{t('webSpaces.wafDashboard.frameHint')}</p>
                    </div>
                    <select
                        value={h.frame}
                        onChange={(e) => void save({ headers: { ...h, frame: e.target.value as typeof h.frame } })}
                        className={inputCls}
                    >
                        <option value='off'>{t('webSpaces.wafDashboard.frameOff')}</option>
                        <option value='sameorigin'>SAMEORIGIN</option>
                        <option value='deny'>DENY</option>
                    </select>
                </div>
            </Card>
        </div>
    );
}

/* ---------- Hotlink protection ---------- */

const MEDIA_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'mp3', 'pdf', 'zip'];
const HOST_RE = /^(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}$/i;

export function HotlinkView({ s, save }: { s: WafSettings; save: Save }) {
    const { t } = useTranslation();
    const h = s.hotlink;
    return (
        <div className='waf-view'>
            <Card title={t('webSpaces.wafDashboard.hotlinkTitle')} hint={t('webSpaces.wafDashboard.hotlinkHint')}>
                <ToggleRow
                    title={t('webSpaces.wafDashboard.hotlinkEnable')}
                    hint={t('webSpaces.wafDashboard.hotlinkEnableHint')}
                    checked={h.enabled}
                    onChange={(v) => void save({ hotlink: { ...h, enabled: v } })}
                />
                <p className='text-muted-foreground mt-4 mb-2 text-xs'>{t('webSpaces.wafDashboard.hotlinkTypes')}</p>
                <div className={cn('flex flex-wrap gap-2', !h.enabled && 'pointer-events-none opacity-40')}>
                    {MEDIA_EXT.map((x) => (
                        <Chip
                            key={x}
                            active={h.extensions.includes(x)}
                            onClick={() =>
                                void save({
                                    hotlink: {
                                        ...h,
                                        extensions: h.extensions.includes(x)
                                            ? h.extensions.filter((e) => e !== x)
                                            : [...h.extensions, x],
                                    },
                                })
                            }
                        >
                            .{x}
                        </Chip>
                    ))}
                </div>
            </Card>
            <ListEditor
                title={t('webSpaces.wafDashboard.hotlinkHosts')}
                hint={t('webSpaces.wafDashboard.hotlinkHostsHint')}
                items={h.allowed_hosts}
                placeholder='partner.example.com'
                validate={(v) => HOST_RE.test(v)}
                invalidText={t('webSpaces.wafDashboard.hostInvalid')}
                onChange={(next) => void save({ hotlink: { ...h, allowed_hosts: next } })}
            />
        </div>
    );
}

/* ---------- Block page ---------- */

const STATUSES = [403, 406, 429, 503];
const MAX_HTML = 65536;

export interface WafErrorPage {
    path: string;
    status: number | null;
    size: number;
    html: string;
}

const DEFAULT_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{status}}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1115;color:#e5e7eb;font-family:system-ui,sans-serif}
  main{text-align:center;padding:2rem}
  h1{font-size:4rem;margin:0}
  p{color:#9ca3af}
  small{color:#6b7280}
</style>
</head>
<body>
<main>
  <h1>{{status}}</h1>
  <p>{{message}}</p>
  <small>Request ID {{id}}</small>
</main>
</body>
</html>
`;

const PLACEHOLDERS = ['{{status}}', '{{message}}', '{{id}}', '{{ip}}'];

function fillSample(html: string, status: number, message: string): string {
    const esc = (v: string) => v.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
    return html
        .replace(/\{\{status\}\}/g, String(status))
        .replace(/\{\{message\}\}/g, esc(message))
        .replace(/\{\{id\}\}/g, 'a1b2c3d4')
        .replace(/\{\{ip\}\}/g, '203.0.113.7');
}

export function BlockPageView({
    s,
    save,
    loadPages,
}: {
    s: WafSettings;
    save: Save;
    loadPages: () => Promise<WafErrorPage[]>;
}) {
    const { t } = useTranslation();
    const [bp, setBp] = useState(s.block_page);
    const [custom, setCustom] = useState(s.block_page.html.trim() !== '');
    const [html, setHtml] = useState(s.block_page.html.trim() !== '' ? s.block_page.html : DEFAULT_HTML);
    const [pages, setPages] = useState<WafErrorPage[] | null>(null);
    const [scanning, setScanning] = useState(false);
    const [scanFailed, setScanFailed] = useState(false);
    const area = useRef<HTMLTextAreaElement>(null);

    const scan = async () => {
        setScanning(true);
        setScanFailed(false);
        try {
            setPages(await loadPages());
        } catch {
            setScanFailed(true);
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        void scan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const insert = (token: string) => {
        const el = area.current;
        if (!el) return;
        const a = el.selectionStart;
        const b = el.selectionEnd;
        const next = html.slice(0, a) + token + html.slice(b);
        setHtml(next);
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(a + token.length, a + token.length);
        });
    };

    const tooLong = html.length > MAX_HTML;
    const preview = useMemo(
        () => (custom ? fillSample(html, bp.status, bp.message) : fillSample(DEFAULT_HTML, bp.status, bp.message)),
        [custom, html, bp.status, bp.message],
    );

    return (
        <div className='waf-view'>
            <Card title={t('webSpaces.wafDashboard.blockPageTitle')} hint={t('webSpaces.wafDashboard.blockPageHint')}>
                <div className='grid gap-4 @2xl:grid-cols-[12rem_1fr]'>
                    <label className='block text-sm'>
                        <span className='text-muted-foreground mb-1 block text-xs'>
                            {t('webSpaces.wafDashboard.blockStatus')}
                        </span>
                        <select
                            value={bp.status}
                            onChange={(e) => setBp({ ...bp, status: Number(e.target.value) })}
                            className={cn(inputCls, 'w-full')}
                        >
                            {STATUSES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className='block text-sm'>
                        <span className='text-muted-foreground mb-1 block text-xs'>
                            {t('webSpaces.wafDashboard.blockMessage')}
                        </span>
                        <input
                            value={bp.message}
                            onChange={(e) => setBp({ ...bp, message: e.target.value.slice(0, 300) })}
                            maxLength={300}
                            className={cn(inputCls, 'w-full')}
                        />
                    </label>
                </div>
                <div className='mt-3'>
                    <ToggleRow
                        title={t('webSpaces.wafDashboard.blockCustomHtml')}
                        hint={t('webSpaces.wafDashboard.blockCustomHtmlHint')}
                        checked={custom}
                        onChange={setCustom}
                    />
                </div>
            </Card>

            <Card title={t('webSpaces.wafDashboard.foundPagesTitle')} hint={t('webSpaces.wafDashboard.foundPagesHint')}>
                <div className='mb-3'>
                    <Button size='sm' variant='outline' loading={scanning} onClick={() => void scan()}>
                        {t('webSpaces.wafDashboard.foundPagesScan')}
                    </Button>
                </div>
                {scanFailed ? (
                    <p className='text-sm text-red-400'>{t('webSpaces.wafDashboard.foundPagesFailed')}</p>
                ) : pages === null ? null : pages.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.wafDashboard.foundPagesNone')}</p>
                ) : (
                    <ul className='space-y-2'>
                        {pages.map((pg) => (
                            <li key={pg.path} className='bg-secondary/30 flex items-center gap-3 rounded-lg px-3 py-2'>
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate font-mono text-sm'>{pg.path}</p>
                                    <p className='text-muted-foreground text-xs'>
                                        {pg.status ? `HTTP ${pg.status} · ` : ''}
                                        {(pg.size / 1024).toFixed(1)} KB
                                        {pg.status === bp.status
                                            ? ` · ${t('webSpaces.wafDashboard.foundPagesMatch')}`
                                            : ''}
                                    </p>
                                </div>
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => {
                                        setHtml(pg.html.slice(0, MAX_HTML));
                                        setCustom(true);
                                        if (pg.status && STATUSES.includes(pg.status))
                                            setBp({ ...bp, status: pg.status });
                                    }}
                                >
                                    {t('webSpaces.wafDashboard.foundPagesUse')}
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <div className={cn('grid gap-4 @4xl:grid-cols-2', !custom && 'opacity-60')}>
                <Card title={t('webSpaces.wafDashboard.htmlEditor')} hint={t('webSpaces.wafDashboard.htmlEditorHint')}>
                    <div className='mb-2 flex flex-wrap items-center gap-2'>
                        {PLACEHOLDERS.map((ph) => (
                            <Chip key={ph} active={false} onClick={() => insert(ph)}>
                                {ph}
                            </Chip>
                        ))}
                        <button
                            type='button'
                            onClick={() => setHtml(DEFAULT_HTML)}
                            className='text-muted-foreground hover:text-foreground ml-auto text-xs underline-offset-2 hover:underline'
                        >
                            {t('webSpaces.wafDashboard.htmlReset')}
                        </button>
                    </div>
                    <textarea
                        ref={area}
                        value={html}
                        disabled={!custom}
                        onChange={(e) => setHtml(e.target.value)}
                        spellCheck={false}
                        className={cn(
                            inputCls,
                            'h-80 w-full resize-y font-mono text-xs leading-relaxed',
                            tooLong && 'border-red-500/60',
                        )}
                    />
                    <p className={cn('mt-1 text-right text-xs', tooLong ? 'text-red-400' : 'text-muted-foreground')}>
                        {html.length.toLocaleString()} / {MAX_HTML.toLocaleString()}
                    </p>
                </Card>
                <Card title={t('webSpaces.wafDashboard.blockPreview')} hint={t('webSpaces.wafDashboard.previewHint')}>
                    <iframe
                        title={t('webSpaces.wafDashboard.blockPreview')}
                        sandbox=''
                        srcDoc={preview}
                        className='border-border/50 h-80 w-full rounded-lg border bg-white'
                    />
                </Card>
            </div>

            <SaveBar
                disabled={custom && (tooLong || html.trim() === '')}
                onSave={() =>
                    save({
                        block_page: {
                            status: bp.status,
                            message: bp.message.trim(),
                            html: custom ? html : '',
                        },
                    })
                }
            />
        </div>
    );
}

/* ---------- Exceptions (trusted paths) ---------- */

export function ExceptionsView({ s, save }: { s: WafSettings; save: Save }) {
    const { t } = useTranslation();
    const [path, setPath] = useState('');
    const [cats, setCats] = useState<WafCategory[]>([]);
    const [error, setError] = useState(false);
    const list = s.exceptions;

    const add = () => {
        const p = path.trim().split('?')[0];
        if (!/^\/[^\s]{0,199}$/.test(p) || p === '/') {
            setError(true);
            return;
        }
        setError(false);
        const same = list.find((x) => x.path === p);
        const next: WafException = { id: same?.id ?? String(Date.now()), path: p, categories: cats };
        void save({ exceptions: same ? list.map((x) => (x.id === same.id ? next : x)) : [...list, next] });
        setPath('');
        setCats([]);
    };

    return (
        <div className='waf-view'>
            <Card title={t('webSpaces.wafDashboard.exceptionsTitle')} hint={t('webSpaces.wafDashboard.exceptionsHint')}>
                <div className='flex gap-2'>
                    <input
                        value={path}
                        onChange={(e) => {
                            setPath(e.target.value);
                            setError(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') add();
                        }}
                        placeholder='/wp-admin/admin-ajax.php'
                        maxLength={200}
                        className={cn(inputCls, 'flex-1 font-mono', error && 'border-red-500/60')}
                    />
                    <Button size='sm' onClick={add}>
                        <Plus className='mr-1 h-4 w-4' />
                        {t('webSpaces.wafDashboard.add')}
                    </Button>
                </div>
                {error ? (
                    <p className='mt-2 text-xs text-red-400'>{t('webSpaces.wafDashboard.exceptionPathInvalid')}</p>
                ) : null}
                <p className='text-muted-foreground mt-4 mb-2 text-xs'>{t('webSpaces.wafDashboard.exceptionsSkip')}</p>
                <div className='flex flex-wrap gap-2'>
                    <Chip active={cats.length === 0} onClick={() => setCats([])}>
                        {t('webSpaces.wafDashboard.exceptionsAll')}
                    </Chip>
                    {CATEGORIES.map((c) => (
                        <Chip
                            key={c}
                            active={cats.includes(c)}
                            onClick={() => setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c])}
                        >
                            {t(`webSpaces.wafDashboard.cat_${c}`)}
                        </Chip>
                    ))}
                </div>
            </Card>
            <Card title={t('webSpaces.wafDashboard.exceptionsList')}>
                {list.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.wafDashboard.exceptionsNone')}</p>
                ) : (
                    <ul className='space-y-2'>
                        {list.map((x) => (
                            <li key={x.id} className='bg-secondary/30 flex items-center gap-3 rounded-lg px-3 py-2'>
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate font-mono text-sm'>{x.path}</p>
                                    <p className='text-muted-foreground truncate text-xs'>
                                        {x.categories.length === 0
                                            ? t('webSpaces.wafDashboard.exceptionsAll')
                                            : x.categories.map((c) => t(`webSpaces.wafDashboard.cat_${c}`)).join(', ')}
                                    </p>
                                </div>
                                <button
                                    type='button'
                                    aria-label={t('webSpaces.wafDashboard.remove')}
                                    onClick={() => void save({ exceptions: list.filter((y) => y.id !== x.id) })}
                                    className='text-muted-foreground transition hover:text-red-400'
                                >
                                    <Trash2 className='h-4 w-4' />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
