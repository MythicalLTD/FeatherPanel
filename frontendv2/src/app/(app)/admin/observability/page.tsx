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

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Radar,
    Gauge,
    KeyRound,
    HeartPulse,
    FileJson,
    Send,
    Copy,
    RefreshCw,
    Trash2,
    Loader2,
    ShieldCheck,
    AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import { copyToClipboard, formatFileSize } from '@/lib/utils';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { UnsavedChangesBar } from '@/components/featherui/UnsavedChangesBar';
import { Select } from '@/components/ui/select-native';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AdminPageTips } from '@/components/admin/AdminPageTips';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type AuthMode = 'token' | 'ip';
type JsonTarget = 'file' | 'stderr' | 'both';
type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

interface Settings {
    metrics_enabled: boolean;
    metrics_auth_mode: AuthMode;
    metrics_allowed_ips: string;
    metrics_node_probes: boolean;
    metrics_token: { exists: boolean; hint: string | null; created_at: string | null };
    log_json_enabled: boolean;
    log_json_target: JsonTarget;
    log_access_enabled: boolean;
    log_min_level: LogLevel;
    loki_enabled: boolean;
    loki_url: string;
    loki_username: string;
    loki_has_password: boolean;
    loki_tenant: string;
    loki_labels: string;
}

interface LokiStats {
    queue_length: number;
    pushed_total: number;
    failures_total: number;
    dropped_total: number;
    last_success_at: number;
    last_error: string | null;
    last_error_at: number;
    backend: 'redis' | 'file';
}

interface Payload {
    settings: Settings;
    status: {
        redis_available: boolean;
        json_log_file: string;
        json_log_file_bytes: number;
        json_log_env_override: boolean;
        loki: LokiStats;
        loki_push_url: string | null;
    };
    endpoints: { base_url: string; metrics: string; health_live: string; health_ready: string };
}

type Form = Omit<Settings, 'metrics_token' | 'loki_has_password'> & { loki_password: string };

const EDITABLE_KEYS: (keyof Form)[] = [
    'metrics_enabled',
    'metrics_auth_mode',
    'metrics_allowed_ips',
    'metrics_node_probes',
    'log_json_enabled',
    'log_json_target',
    'log_access_enabled',
    'log_min_level',
    'loki_enabled',
    'loki_url',
    'loki_username',
    'loki_password',
    'loki_tenant',
    'loki_labels',
];

function toForm(settings: Settings): Form {
    return {
        metrics_enabled: settings.metrics_enabled,
        metrics_auth_mode: settings.metrics_auth_mode,
        metrics_allowed_ips: settings.metrics_allowed_ips,
        metrics_node_probes: settings.metrics_node_probes,
        log_json_enabled: settings.log_json_enabled,
        log_json_target: settings.log_json_target,
        log_access_enabled: settings.log_access_enabled,
        log_min_level: settings.log_min_level,
        loki_enabled: settings.loki_enabled,
        loki_url: settings.loki_url,
        loki_username: settings.loki_username,
        loki_password: '',
        loki_tenant: settings.loki_tenant,
        loki_labels: settings.loki_labels,
    };
}

function CodeBlock({ code, onCopy, copyLabel }: { code: string; onCopy: () => void; copyLabel: string }) {
    return (
        <div className='relative'>
            <pre className='bg-muted/40 border-border/60 overflow-x-auto rounded-lg border p-3 pr-12 font-mono text-xs leading-relaxed'>
                {code}
            </pre>
            <Button
                type='button'
                variant='ghost'
                size='sm'
                className='absolute top-2 right-2'
                onClick={onCopy}
                aria-label={copyLabel}
            >
                <Copy className='h-4 w-4' />
            </Button>
        </div>
    );
}

function SwitchRow({
    id,
    label,
    description,
    checked,
    onChange,
    disabled,
}: {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className='flex items-start justify-between gap-4'>
            <div className='min-w-0 space-y-1'>
                <Label htmlFor={id} className='text-sm font-semibold'>
                    {label}
                </Label>
                {description && <p className='text-muted-foreground text-sm'>{description}</p>}
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
        </div>
    );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className='border-border/60 rounded-lg border px-3 py-2'>
            <div className='text-muted-foreground text-xs'>{label}</div>
            <div className='mt-0.5 truncate text-sm font-semibold'>{value}</div>
        </div>
    );
}

export default function ObservabilityPage() {
    const { t } = useTranslation();
    const [data, setData] = useState<Payload | null>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tokenBusy, setTokenBusy] = useState(false);
    const [testing, setTesting] = useState(false);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [clearPassword, setClearPassword] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'rotate' | 'revoke' | null>(null);

    const apply = useCallback((payload: Payload) => {
        setData(payload);
        setForm(toForm(payload.settings));
        setClearPassword(false);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await axios.get('/api/admin/observability');
            if (res?.success && res.data) {
                apply(res.data as Payload);
            } else {
                toast.error(getApiErrorMessageFromPayload(res, t, 'admin.observability.load_failed'));
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.observability.load_failed'));
        } finally {
            setLoading(false);
        }
    }, [apply, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const baseline = useMemo(() => (data ? toForm(data.settings) : null), [data]);
    const dirty = useMemo(() => {
        if (!form || !baseline) return false;
        return clearPassword || EDITABLE_KEYS.some((key) => form[key] !== baseline[key]);
    }, [form, baseline, clearPassword]);

    const set = <K extends keyof Form>(key: K, value: Form[K]) => {
        setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const save = async () => {
        if (!form || !baseline) return;
        const body: Record<string, unknown> = {};
        for (const key of EDITABLE_KEYS) {
            if (key === 'loki_password') continue;
            if (form[key] !== baseline[key]) body[key] = form[key];
        }
        if (clearPassword) body.loki_password_clear = true;
        else if (form.loki_password !== '') body.loki_password = form.loki_password;

        setSaving(true);
        try {
            const { data: res } = await axios.patch('/api/admin/observability', body);
            if (res?.success) {
                apply(res.data as Payload);
                toast.success(t('admin.observability.saved'));
            } else {
                toast.error(getApiErrorMessageFromPayload(res, t, 'admin.observability.save_failed'));
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.observability.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    const rotateToken = async () => {
        setTokenBusy(true);
        try {
            const { data: res } = await axios.post('/api/admin/observability/metrics-token');
            if (res?.success && res.data?.token) {
                setNewToken(String(res.data.token));
                apply(res.data as Payload);
                toast.success(t('admin.observability.metrics.token_generated'));
            } else {
                toast.error(getApiErrorMessageFromPayload(res, t, 'admin.observability.metrics.token_failed'));
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.observability.metrics.token_failed'));
        } finally {
            setTokenBusy(false);
        }
    };

    const revokeToken = async () => {
        setTokenBusy(true);
        try {
            const { data: res } = await axios.delete('/api/admin/observability/metrics-token');
            if (res?.success) {
                setNewToken(null);
                apply(res.data as Payload);
                toast.success(t('admin.observability.metrics.token_revoked'));
            } else {
                toast.error(getApiErrorMessageFromPayload(res, t, 'admin.observability.metrics.token_failed'));
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.observability.metrics.token_failed'));
        } finally {
            setTokenBusy(false);
        }
    };

    const testLoki = async () => {
        if (!form) return;
        setTesting(true);
        try {
            const { data: res } = await axios.post('/api/admin/observability/loki-test', {
                loki_url: form.loki_url,
                loki_username: form.loki_username,
                loki_password: form.loki_password,
                loki_tenant: form.loki_tenant,
                loki_labels: form.loki_labels,
            });
            if (res?.success && res.data?.ok) {
                toast.success(t('admin.observability.loki.test_ok', { ms: String(res.data.took_ms ?? 0) }));
            } else if (res?.success) {
                toast.error(t('admin.observability.loki.test_failed', { error: String(res.data?.error ?? '') }));
            } else {
                toast.error(getApiErrorMessageFromPayload(res, t, 'admin.observability.loki.test_failed_generic'));
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.observability.loki.test_failed_generic'));
        } finally {
            setTesting(false);
        }
    };

    const copy = (text: string) => void copyToClipboard(text, t);

    const metricsUrl = data?.endpoints.metrics ?? '';
    const scrapeConfig = useMemo(() => {
        if (!metricsUrl) return '';
        let host = metricsUrl;
        let scheme = 'https';
        try {
            const url = new URL(metricsUrl);
            host = url.host;
            scheme = url.protocol.replace(':', '');
        } catch {
            // keep the raw value
        }
        const lines = [
            'scrape_configs:',
            '  - job_name: featherpanel',
            '    scrape_interval: 30s',
            '    metrics_path: /api/system/metrics',
            `    scheme: ${scheme}`,
        ];
        if (form?.metrics_auth_mode !== 'ip') {
            lines.push(
                '    authorization:',
                '      type: Bearer',
                '      credentials_file: /etc/prometheus/featherpanel.token',
            );
        }
        lines.push('    static_configs:', `      - targets: ['${host}']`);
        return lines.join('\n');
    }, [metricsUrl, form?.metrics_auth_mode]);

    const probeConfig = useMemo(() => {
        if (!data) return '';
        return [
            'livenessProbe:',
            '  httpGet: { path: /api/health/live, port: 80 }',
            '  periodSeconds: 10',
            'readinessProbe:',
            '  httpGet: { path: /api/health/ready, port: 80 }',
            '  periodSeconds: 15',
            '  failureThreshold: 3',
        ].join('\n');
    }, [data]);

    const alloyConfig = useMemo(() => {
        if (!data) return '';
        return [
            'local.file_match "featherpanel" {',
            `  path_targets = [{ __path__ = "${data.status.json_log_file}", app = "featherpanel" }]`,
            '}',
            'loki.source.file "featherpanel" {',
            '  targets    = local.file_match.featherpanel.targets',
            '  forward_to = [loki.process.featherpanel.receiver]',
            '}',
            'loki.process "featherpanel" {',
            '  stage.json { expressions = { level = "level", request_id = "request_id", route = "route" } }',
            '  stage.labels { values = { level = "" } }',
            '  forward_to = [loki.write.default.receiver]',
            '}',
        ].join('\n');
    }, [data]);

    if (loading && !data) {
        return (
            <div className='text-muted-foreground flex items-center gap-2 p-6 text-sm'>
                <Loader2 className='h-4 w-4 animate-spin' />
                {t('common.loading')}
            </div>
        );
    }

    if (!data || !form) {
        return (
            <div className='space-y-4'>
                <PageHeader
                    title={t('admin.observability.title')}
                    description={t('admin.observability.description')}
                    icon={Radar}
                />
                <Button variant='outline' onClick={() => void load()}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('common.retry')}
                </Button>
            </div>
        );
    }

    const token = data.settings.metrics_token;
    const loki = data.status.loki;
    const formatTime = (seconds: number) =>
        seconds > 0 ? new Date(seconds * 1000).toLocaleString() : t('admin.observability.never');
    const metricsWarning =
        form.metrics_enabled && form.metrics_auth_mode === 'token' && !token.exists
            ? t('admin.observability.metrics.warning_no_token')
            : null;

    return (
        <div className='space-y-6 pb-24'>
            <PageHeader
                title={t('admin.observability.title')}
                description={t('admin.observability.description')}
                icon={Radar}
                actions={
                    <Button variant='outline' onClick={() => void load()} disabled={loading}>
                        <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                        {t('common.refresh')}
                    </Button>
                }
            />

            {!data.status.redis_available && (
                <div className='flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400'>
                    <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
                    {t('admin.observability.redis_missing')}
                </div>
            )}

            <PageCard
                title={t('admin.observability.metrics.title')}
                description={t('admin.observability.metrics.description')}
                icon={Gauge}
            >
                <SwitchRow
                    id='metrics-enabled'
                    label={t('admin.observability.metrics.enabled')}
                    description={t('admin.observability.metrics.enabled_help')}
                    checked={form.metrics_enabled}
                    onChange={(v) => set('metrics_enabled', v)}
                />
                <div className='grid gap-4 md:grid-cols-2'>
                    <Select
                        label={t('admin.observability.metrics.auth_mode')}
                        description={t('admin.observability.metrics.auth_mode_help')}
                        value={form.metrics_auth_mode}
                        onChange={(e) => set('metrics_auth_mode', e.target.value as AuthMode)}
                    >
                        <option value='token'>{t('admin.observability.metrics.auth_token')}</option>
                        <option value='ip'>{t('admin.observability.metrics.auth_ip')}</option>
                    </Select>
                    <Textarea
                        label={t('admin.observability.metrics.allowed_ips')}
                        description={t('admin.observability.metrics.allowed_ips_help')}
                        value={form.metrics_allowed_ips}
                        onChange={(e) => set('metrics_allowed_ips', e.target.value)}
                        placeholder={t('admin.observability.metrics.allowed_ips_placeholder')}
                        className='min-h-[96px] font-mono'
                    />
                </div>
                <SwitchRow
                    id='metrics-node-probes'
                    label={t('admin.observability.metrics.node_probes')}
                    description={t('admin.observability.metrics.node_probes_help')}
                    checked={form.metrics_node_probes}
                    onChange={(v) => set('metrics_node_probes', v)}
                />

                <div className='border-border/60 space-y-3 rounded-lg border p-4'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='flex items-center gap-2'>
                            <KeyRound className='text-muted-foreground h-4 w-4' />
                            <span className='text-sm font-semibold'>{t('admin.observability.metrics.token')}</span>
                            {token.exists ? (
                                <Badge variant='default'>
                                    {t('admin.observability.metrics.token_active', { hint: token.hint ?? '' })}
                                </Badge>
                            ) : (
                                <Badge variant='secondary'>{t('admin.observability.metrics.token_none')}</Badge>
                            )}
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            <Button
                                size='sm'
                                onClick={() => (token.exists ? setConfirmAction('rotate') : void rotateToken())}
                                disabled={tokenBusy}
                            >
                                {tokenBusy ? (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <RefreshCw className='mr-2 h-4 w-4' />
                                )}
                                {token.exists
                                    ? t('admin.observability.metrics.rotate')
                                    : t('admin.observability.metrics.generate')}
                            </Button>
                            {token.exists && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => setConfirmAction('revoke')}
                                    disabled={tokenBusy}
                                >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    {t('admin.observability.metrics.revoke')}
                                </Button>
                            )}
                        </div>
                    </div>
                    {token.created_at && (
                        <p className='text-muted-foreground text-xs'>
                            {t('admin.observability.metrics.token_created', {
                                date: new Date(token.created_at).toLocaleString(),
                            })}
                        </p>
                    )}
                    {newToken && (
                        <div className='space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3'>
                            <p className='flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400'>
                                <ShieldCheck className='h-4 w-4' />
                                {t('admin.observability.metrics.token_once')}
                            </p>
                            <div className='flex gap-2'>
                                <Input
                                    readOnly
                                    value={newToken}
                                    className='font-mono text-xs'
                                    onFocus={(e) => e.target.select()}
                                />
                                <Button variant='outline' onClick={() => copy(newToken)} aria-label={t('common.copy')}>
                                    <Copy className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    )}
                    {metricsWarning && (
                        <p className='flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400'>
                            <AlertTriangle className='h-4 w-4' />
                            {metricsWarning}
                        </p>
                    )}
                </div>

                <div className='space-y-2'>
                    <Label className='text-sm font-semibold'>{t('admin.observability.metrics.endpoint')}</Label>
                    <div className='flex gap-2'>
                        <Input readOnly value={metricsUrl} className='font-mono text-xs' />
                        <Button variant='outline' onClick={() => copy(metricsUrl)} aria-label={t('common.copy')}>
                            <Copy className='h-4 w-4' />
                        </Button>
                    </div>
                </div>
                <div className='space-y-2'>
                    <Label className='text-sm font-semibold'>{t('admin.observability.metrics.scrape_config')}</Label>
                    <p className='text-muted-foreground text-sm'>
                        {t('admin.observability.metrics.scrape_config_help')}
                    </p>
                    <CodeBlock code={scrapeConfig} onCopy={() => copy(scrapeConfig)} copyLabel={t('common.copy')} />
                </div>
            </PageCard>

            <PageCard
                title={t('admin.observability.health.title')}
                description={t('admin.observability.health.description')}
                icon={HeartPulse}
            >
                <div className='grid gap-3 md:grid-cols-2'>
                    {[
                        { label: t('admin.observability.health.live'), url: data.endpoints.health_live },
                        { label: t('admin.observability.health.ready'), url: data.endpoints.health_ready },
                    ].map((item) => (
                        <div key={item.url} className='space-y-2'>
                            <Label className='text-sm font-semibold'>{item.label}</Label>
                            <div className='flex gap-2'>
                                <Input readOnly value={item.url} className='font-mono text-xs' />
                                <Button variant='outline' onClick={() => copy(item.url)} aria-label={t('common.copy')}>
                                    <Copy className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className='text-muted-foreground text-sm'>{t('admin.observability.health.help')}</p>
                <CodeBlock code={probeConfig} onCopy={() => copy(probeConfig)} copyLabel={t('common.copy')} />
            </PageCard>

            <PageCard
                title={t('admin.observability.logs.title')}
                description={t('admin.observability.logs.description')}
                icon={FileJson}
            >
                <SwitchRow
                    id='log-json-enabled'
                    label={t('admin.observability.logs.enabled')}
                    description={t('admin.observability.logs.enabled_help')}
                    checked={form.log_json_enabled}
                    onChange={(v) => set('log_json_enabled', v)}
                />
                {data.status.json_log_env_override && (
                    <p className='text-muted-foreground text-sm'>{t('admin.observability.logs.env_override')}</p>
                )}
                <div className='grid gap-4 md:grid-cols-2'>
                    <Select
                        label={t('admin.observability.logs.target')}
                        value={form.log_json_target}
                        onChange={(e) => set('log_json_target', e.target.value as JsonTarget)}
                    >
                        <option value='file'>{t('admin.observability.logs.target_file')}</option>
                        <option value='stderr'>{t('admin.observability.logs.target_stderr')}</option>
                        <option value='both'>{t('admin.observability.logs.target_both')}</option>
                    </Select>
                    <Select
                        label={t('admin.observability.logs.min_level')}
                        value={form.log_min_level}
                        onChange={(e) => set('log_min_level', e.target.value as LogLevel)}
                    >
                        <option value='debug'>{t('admin.observability.levels.debug')}</option>
                        <option value='info'>{t('admin.observability.levels.info')}</option>
                        <option value='warning'>{t('admin.observability.levels.warning')}</option>
                        <option value='error'>{t('admin.observability.levels.error')}</option>
                        <option value='critical'>{t('admin.observability.levels.critical')}</option>
                    </Select>
                </div>
                <SwitchRow
                    id='log-access-enabled'
                    label={t('admin.observability.logs.access')}
                    description={t('admin.observability.logs.access_help')}
                    checked={form.log_access_enabled}
                    onChange={(v) => set('log_access_enabled', v)}
                />
                <div className='grid gap-3 sm:grid-cols-2'>
                    <Stat
                        label={t('admin.observability.logs.file')}
                        value={<span className='font-mono text-xs'>{data.status.json_log_file}</span>}
                    />
                    <Stat
                        label={t('admin.observability.logs.file_size')}
                        value={formatFileSize(data.status.json_log_file_bytes)}
                    />
                </div>
                <div className='space-y-2'>
                    <Label className='text-sm font-semibold'>{t('admin.observability.logs.alloy_config')}</Label>
                    <p className='text-muted-foreground text-sm'>{t('admin.observability.logs.alloy_config_help')}</p>
                    <CodeBlock code={alloyConfig} onCopy={() => copy(alloyConfig)} copyLabel={t('common.copy')} />
                </div>
            </PageCard>

            <PageCard
                title={t('admin.observability.loki.title')}
                description={t('admin.observability.loki.description')}
                icon={Send}
            >
                <SwitchRow
                    id='loki-enabled'
                    label={t('admin.observability.loki.enabled')}
                    description={t('admin.observability.loki.enabled_help')}
                    checked={form.loki_enabled}
                    onChange={(v) => set('loki_enabled', v)}
                />
                <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-2 md:col-span-2'>
                        <Label htmlFor='loki-url' className='text-sm font-semibold'>
                            {t('admin.observability.loki.url')}
                        </Label>
                        <Input
                            id='loki-url'
                            value={form.loki_url}
                            onChange={(e) => set('loki_url', e.target.value)}
                            placeholder={t('admin.observability.loki.url_placeholder')}
                        />
                        <p className='text-muted-foreground text-xs'>{t('admin.observability.loki.url_help')}</p>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='loki-username' className='text-sm font-semibold'>
                            {t('admin.observability.loki.username')}
                        </Label>
                        <Input
                            id='loki-username'
                            value={form.loki_username}
                            onChange={(e) => set('loki_username', e.target.value)}
                            autoComplete='off'
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='loki-password' className='text-sm font-semibold'>
                            {t('admin.observability.loki.password')}
                        </Label>
                        <div className='flex gap-2'>
                            <Input
                                id='loki-password'
                                type='password'
                                value={form.loki_password}
                                onChange={(e) => {
                                    set('loki_password', e.target.value);
                                    setClearPassword(false);
                                }}
                                placeholder={
                                    data.settings.loki_has_password && !clearPassword
                                        ? t('admin.observability.loki.password_saved')
                                        : t('admin.observability.loki.password_placeholder')
                                }
                                autoComplete='new-password'
                            />
                            {data.settings.loki_has_password && (
                                <Button
                                    type='button'
                                    variant='outline'
                                    onClick={() => {
                                        setClearPassword(true);
                                        set('loki_password', '');
                                    }}
                                    disabled={clearPassword}
                                    aria-label={t('admin.observability.loki.password_clear')}
                                >
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='loki-tenant' className='text-sm font-semibold'>
                            {t('admin.observability.loki.tenant')}
                        </Label>
                        <Input
                            id='loki-tenant'
                            value={form.loki_tenant}
                            onChange={(e) => set('loki_tenant', e.target.value)}
                            placeholder={t('admin.observability.loki.tenant_placeholder')}
                        />
                    </div>
                    <Textarea
                        label={t('admin.observability.loki.labels')}
                        description={t('admin.observability.loki.labels_help')}
                        value={form.loki_labels}
                        onChange={(e) => set('loki_labels', e.target.value)}
                        placeholder={t('admin.observability.loki.labels_placeholder')}
                        className='min-h-[96px] font-mono'
                    />
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <Button
                        variant='outline'
                        onClick={() => void testLoki()}
                        disabled={testing || form.loki_url.trim() === ''}
                    >
                        {testing ? (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <Send className='mr-2 h-4 w-4' />
                        )}
                        {t('admin.observability.loki.test')}
                    </Button>
                    <span className='text-muted-foreground text-xs'>{t('admin.observability.loki.test_help')}</span>
                </div>
                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                    <Stat label={t('admin.observability.loki.queue')} value={loki.queue_length} />
                    <Stat label={t('admin.observability.loki.pushed')} value={loki.pushed_total} />
                    <Stat label={t('admin.observability.loki.failures')} value={loki.failures_total} />
                    <Stat label={t('admin.observability.loki.last_success')} value={formatTime(loki.last_success_at)} />
                </div>
                {loki.last_error && (
                    <div className='rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400'>
                        <div className='font-semibold'>
                            {t('admin.observability.loki.last_error', { date: formatTime(loki.last_error_at) })}
                        </div>
                        <div className='mt-1 font-mono text-xs break-all'>{loki.last_error}</div>
                    </div>
                )}
            </PageCard>

            <AdminPageTips page='observability' />

            <ConfirmDialog
                open={confirmAction !== null}
                onOpenChange={(open) => !open && setConfirmAction(null)}
                title={
                    confirmAction === 'revoke'
                        ? t('admin.observability.metrics.revoke_title')
                        : t('admin.observability.metrics.rotate_title')
                }
                description={
                    confirmAction === 'revoke'
                        ? t('admin.observability.metrics.revoke_confirm')
                        : t('admin.observability.metrics.rotate_confirm')
                }
                confirmLabel={
                    confirmAction === 'revoke'
                        ? t('admin.observability.metrics.revoke')
                        : t('admin.observability.metrics.rotate')
                }
                cancelLabel={t('common.cancel')}
                destructive
                loading={tokenBusy}
                onConfirm={async () => {
                    const action = confirmAction;
                    setConfirmAction(null);
                    if (action === 'revoke') await revokeToken();
                    else await rotateToken();
                }}
            />

            <UnsavedChangesBar
                dirty={dirty}
                saving={saving}
                onSave={() => void save()}
                onDiscard={() => data && apply(data)}
            />
        </div>
    );
}
