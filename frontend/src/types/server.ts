export interface ServerAllocation {
    ip: string;
    port: number;
    ip_alias?: string;
}

export interface ServerSpell {
    id: number;
    name: string;
    banner?: string;
}

export interface Server {
    id: number;
    name: string;
    description?: string;
    status: 'running' | 'stopped' | 'starting' | 'stopping' | 'installing' | 'error' | 'offline' | 'unknown';
    cpu: number;
    memory: number;
    memoryLimit?: number;
    disk: number;
    uuidShort: string;
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
