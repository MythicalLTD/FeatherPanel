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

// Common types used across the application

export interface TableColumn {
    key: string;
    label: string;
    headerClass?: string;
    cellClass?: string;
    sortable?: boolean;
    searchable?: boolean;
}

export interface TableProps<T = Record<string, unknown>> {
    title: string;
    description?: string;
    columns: TableColumn[];
    data: T[];
    searchPlaceholder?: string;
    searchQuery?: string;
    showPagination?: boolean;
    pageSize?: number;
    localStorageKey?: string;
    getItemKey?: (item: T, index: number) => string | number;
    formatCellValue?: (value: unknown) => string;
    onSearch?: (query: string) => void;
    onPageChange?: (page: number) => void;
    serverSidePagination?: boolean;
    totalRecords?: number;
    totalPages?: number;
    currentPage?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    from?: number;
    to?: number;
}

// Common API response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: boolean;
    error_message?: string;
    error_code?: string;
}

export interface PaginationInfo {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
}

export interface SearchInfo {
    query: string;
    has_results: boolean;
}

// Common entity types
export interface BaseEntity {
    id: number;
    created_at: string;
    updated_at: string;
}

export interface Node extends BaseEntity {
    name: string;
    fqdn: string;
    location_id: number;
    is_active: boolean;
}

export interface Allocation extends BaseEntity {
    node_id: number;
    ip: string;
    port: number;
    ip_alias?: string;
    server_id?: number;
    server_name?: string;
    notes?: string;
}

export interface Location extends BaseEntity {
    name: string;
    description?: string;
    is_active: boolean;
}

export interface Realm extends BaseEntity {
    name: string;
    display_name: string;
    description?: string;
    logo?: string;
    author: string;
    is_active: boolean;
}

export interface Spell extends BaseEntity {
    name: string;
    display_name: string;
    description?: string;
    author: string;
    is_active: boolean;
    realm_id: number;
}

export interface User extends BaseEntity {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    is_active: boolean;
    role_id?: number;
}

export interface Role extends BaseEntity {
    name: string;
    display_name: string;
    color: string;
}

export interface Permission extends BaseEntity {
    role_id: number;
    permission: string;
}

// Form types
export interface FormState {
    [key: string]: unknown;
}

export interface ValidationError {
    field: string;
    message: string;
}

// UI state types
export interface MessageState {
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
}

export interface LoadingState {
    loading: boolean;
    error: string | null;
}

// Health check types
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

export interface HealthCheck {
    status: HealthStatus;
    message?: string;
    timestamp: string;
}

// Wings daemon types
export interface WingsSystemInfo {
    version: string;
    system: {
        type: string;
        release: string;
        architecture: string;
    };
    cpu: {
        cores: number;
        threads: number;
        model: string;
    };
    memory: {
        total: number;
        available: number;
        used: number;
    };
    disk: {
        total: number;
        available: number;
        used: number;
    };
}

export interface WingsIPAddresses {
    ip_addresses: string[];
}

// Game template types
export interface GameTemplate {
    name: string;
    display_name: string;
    port_ranges: {
        start: number;
        end: number;
        default_count: number;
    }[];
    description?: string;
}

// Utility types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
