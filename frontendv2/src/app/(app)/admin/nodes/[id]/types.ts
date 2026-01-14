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

export interface UtilizationResponse {
    utilization: {
        memory_total: number;
        memory_used: number;
        swap_total: number;
        swap_used: number;
        load_average1: number;
        load_average5: number;
        load_average15: number;
        cpu_percent: number;
        disk_total: number;
        disk_used: number;
        disk_details: Array<{
            device: string;
            mountpoint: string;
            total_space: number;
            used_space: number;
            tags: string[];
        }>;
    };
}

export interface DockerResponse {
    dockerDiskUsage: {
        containers_size: number;
        images_total: number;
        images_active: number;
        images_size: number;
        build_cache_size: number;
    };
}

export interface NetworkResponse {
    ips: {
        ip_addresses: string[];
    };
}

export interface DiagnosticsResult {
    format: 'text' | 'url';
    content: string | null;
    url: string | null;
    include_endpoints: boolean;
    include_logs: boolean;
    log_lines: number | null;
}

export interface SystemInfoResponse {
    wings: {
        version: string;
        docker: {
            version: string;
            cgroups: {
                driver: string;
                version: string;
            };
            containers: {
                total: number;
                running: number;
                paused: number;
                stopped: number;
            };
            storage: {
                driver: string;
                filesystem: string;
            };
            runc: {
                version: string;
            };
        };
        system: {
            architecture: string;
            cpu_threads: number;
            memory_bytes: number;
            kernel_version: string;
            os: string;
            os_type: string;
        };
    };
}

export interface NodeData {
    id: number;
    uuid: string;
    name: string;
    description?: string;
    fqdn: string;
    location_id?: number;
    public: number | string | boolean;
    scheme: string;
    behind_proxy: number | string | boolean;
    maintenance_mode: number | string | boolean;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemon_token_id: string;
    daemon_token: string;
    daemonListen: number;
    daemonSFTP: number;
    daemonBase: string;
    public_ip_v4?: string | null;
    public_ip_v6?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CommandExecutionRequest {
    command: string;
    timeout_seconds?: number;
    working_directory?: string;
    environment?: Record<string, string>;
}

export interface CommandExecutionResponse {
    exit_code: number;
    stdout: string;
    stderr: string;
    timed_out: boolean;
    duration_ms: number;
}

export interface WingsConfigResponse {
    success: boolean;
    data: {
        config: string;
    };
    message?: string;
}

export interface Module {
    name: string;
    description: string;
    version: string;
    enabled: boolean;
    config?: Record<string, unknown>;
}

export interface ModuleConfig {
    name: string;
    config: Record<string, unknown>;
}

export interface Location {
    id: number;
    name: string;
    description?: string;
}

export interface VersionStatus {
    current_version: string;
    latest_version: string | null;
    is_up_to_date: boolean;
    update_available: boolean;
    github_error: string | null;
}
