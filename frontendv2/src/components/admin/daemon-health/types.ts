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

export type DaemonKind = 'wings' | 'web';

export type DaemonStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unreachable' | 'unsupported';

export type MetricsState =
    'ok' | 'unauthorized' | 'forbidden' | 'not_enabled' | 'unsupported' | 'unreachable' | 'error';

export interface DaemonHealthCheck {
    name: string;
    status: 'ok' | 'degraded' | 'fail';
    critical: boolean | null;
    message: string | null;
    error: string | null;
    duration_ms: number | null;
    data: Record<string, string | number | boolean | null> | null;
}

export interface DaemonHost {
    source: 'utilization' | 'metrics';
    cpu_percent: number | null;
    cpu_threads: number | null;
    memory_total: number | null;
    memory_used: number | null;
    swap_total: number | null;
    swap_used: number | null;
    disk_total: number | null;
    disk_used: number | null;
    load_average1: number | null;
    load_average5: number | null;
    load_average15: number | null;
}

export interface WingsTopServer {
    uuid: string;
    uuid_short: string | null;
    server_id: number | null;
    name: string | null;
    state: string;
    cpu_percent: number;
    memory_bytes: number;
    memory_limit_bytes: number;
    disk_bytes: number;
    uptime_seconds: number;
}

export interface WingsSummary {
    servers: { total: number; by_state: Record<string, number>; per_server_metrics: boolean };
    resources: {
        cpu_percent: number;
        memory_bytes: number;
        memory_limit_bytes: number;
        disk_bytes: number;
        network_rx_bytes: number;
        network_tx_bytes: number;
    };
    top_servers: WingsTopServer[];
    backups: { in_progress: number; succeeded_total: number; failed_total: number };
    transfers: { incoming: number; outgoing: number; succeeded_total: number; failed_total: number };
    sftp: { sessions: number; listening: boolean | null };
    websockets: number;
    docker_up: boolean | null;
    http: { in_flight: number; requests_total: number; errors_5xx_total: number };
    panel: { last_contact_at: number | null; requests: Record<string, number> };
    daemon: {
        uptime_seconds: number | null;
        resident_memory_bytes: number | null;
        cpu_seconds_total: number | null;
        goroutines: number | null;
    };
}

export interface QuilldProxy {
    provider: string;
    enabled: boolean | null;
    running: boolean | null;
    last_reload_success: boolean | null;
    last_reload_at: number | null;
    reloads_succeeded_total: number;
    reloads_failed_total: number;
}

export interface QuilldSummary {
    version: string | null;
    uptime_seconds: number | null;
    maintenance_mode: boolean | null;
    panel_reachable: boolean | null;
    webspaces: {
        total: number;
        by_state: Record<string, number>;
        by_status: Record<string, number>;
        suspended: number;
        waf_enabled: number;
    };
    domains: number;
    proxies: QuilldProxy[];
    firewall: {
        events_total: number;
        blocked_total: number;
        detected_total: number;
        by_category: Record<string, number>;
        top_webspaces: { uuid: string; name: string; events: number }[];
    };
    sftp: { auth_failures_total: number; lockouts_total: number };
    host: DaemonHost | null;
}

export interface DaemonMetrics {
    state: MetricsState;
    http_status: number | null;
    token_source: 'metrics_token' | 'node_token' | 'none';
    custom_url: boolean;
    error: string | null;
    samples: number;
    summary: WingsSummary | QuilldSummary | null;
}

export interface DaemonMetricsSettings {
    metrics_url: string | null;
    has_metrics_token: boolean;
}

export interface DaemonHealthReport {
    node_id: number;
    kind: DaemonKind;
    status: DaemonStatus;
    fetched_at: number;
    cached: boolean;
    cache_ttl: number;
    health: {
        supported: boolean;
        status: string | null;
        http_status: number | null;
        detailed: boolean;
        latency_ms: number | null;
        version: string | null;
        error: string | null;
        checks: DaemonHealthCheck[];
    };
    legacy: { online: boolean; error: string | null } | null;
    metrics: DaemonMetrics | null;
    host: DaemonHost | null;
    settings: DaemonMetricsSettings;
}

export interface DaemonHealthSummary {
    node_id: number;
    kind: DaemonKind;
    status: DaemonStatus;
    failing_checks: string[];
    http_status: number | null;
    latency_ms: number | null;
    error: string | null;
    fetched_at: number;
    cached: boolean;
}
