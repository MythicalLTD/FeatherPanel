/*
MIT License

Copyright (c) 2025 MythicalSystems and Contributors
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export type UtilizationResponse = {
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
};

export type DockerResponse = {
    dockerDiskUsage: {
        containers_size: number;
        images_total: number;
        images_active: number;
        images_size: number;
        build_cache_size: number;
    };
};

export type NetworkResponse = {
    ips: {
        ip_addresses: string[];
    };
};

export type DiagnosticsResult = {
    format: 'text' | 'url';
    content: string | null;
    url: string | null;
    include_endpoints: boolean;
    include_logs: boolean;
    log_lines: number | null;
};

export type SystemInfoResponse = {
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
};

export type Node = {
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
};

export type Module = {
    name: string;
    description: string;
    enabled: boolean;
};

export type ModuleConfig = {
    name: string;
    description: string;
    enabled: boolean;
    config: Record<string, unknown>;
};
