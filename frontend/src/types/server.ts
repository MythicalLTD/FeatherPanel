/*
MIT License

Copyright (c) 2025 MythicalSystems
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

export interface ServerAllocation {
    ip: string;
    port: number;
    ip_alias?: string;
}

export interface ServerSpell {
    id: number;
    name: string;
    banner?: string;
    features?: string[] | string;
}

export interface Server {
    id: number;
    name: string;
    description?: string;
    status: 'running' | 'stopped' | 'starting' | 'stopping' | 'installing' | 'error' | 'offline' | 'unknown';
    // Limits (from API)
    cpu: number; // CPU limit percentage
    memory: number; // Memory limit in MB
    disk: number; // Disk limit in MB
    swap?: number; // Swap limit in MB
    io?: number; // IO limit
    // Current usage (from Wings stats)
    cpuUsage?: number; // Current CPU usage percentage
    memoryUsage?: number; // Current memory usage in MB
    diskUsage?: number; // Current disk usage in MB
    uuidShort: string;
    uuid: string;
    started_at?: string;
    allocation?: ServerAllocation;
    spell?: ServerSpell;
}

export interface NetworkStats {
    upload: string;
    download: string;
}

export interface TerminalLine {
    id: number;
    content: string;
    timestamp: string;
    type: 'output' | 'error' | 'warning' | 'info' | 'command';
}

export interface JWTResponse {
    success: boolean;
    message: string;
    data: {
        token: string;
        expires_at: number;
        server_uuid: string;
        user_uuid: string;
        permissions: string[];
        connection_string: string;
    };
    error: boolean;
    error_message: string | null;
    error_code: string | null;
}

export interface WebSocketMessage {
    event:
        | 'console_output'
        | 'console_input'
        | 'error'
        | 'status_update'
        | 'auth'
        | 'auth success'
        | 'auth_error'
        | 'status'
        | 'stats';
    data: string;
    timestamp?: number;
}

export interface ServerStats {
    cpu_absolute: number;
    disk_bytes: number;
    memory_bytes: number;
    memory_limit_bytes: number;
    network: {
        rx_bytes: number;
        tx_bytes: number;
    };
    state: string;
    uptime: number;
}

export interface WebSocketAuthMessage {
    event: 'auth';
    args: [string]; // JWT token
}
