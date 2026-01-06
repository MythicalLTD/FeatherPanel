/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

export interface ApiServer {
    id: number;
    uuid: string;
    uuidShort: string;
    node_id: number;
    name: string;
    description: string;
    status?: string;
    suspended?: number;
    skip_scripts: number;
    owner_id: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads?: string;
    oom_disabled: number;
    allocation_id: number;
    realms_id: number;
    spell_id: number;
    startup: string;
    image: string;
    allocation_limit?: number;
    database_limit: number;
    backup_limit: number;
    created_at: string;
    updated_at: string;
    installed_at?: string;
    external_id?: string;
    owner?: {
        id: number;
        username: string;
        email: string;
        avatar?: string;
    };
    node?: {
        id: number;
        name: string;
        fqdn?: string;
    };
    realm?: {
        id: number;
        name: string;
        description?: string;
    };
    spell?: {
        id: number;
        name: string;
        description?: string;
    };
    allocation?: {
        id: number;
        ip: string;
        port: number;
    };
}

export interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    from: number;
    to: number;
}

export interface ApiNode {
    id: number;
    name: string;
    fqdn: string;
}

export interface ApiAllocation {
    id: number;
    ip: string;
    port: number;
    ip_alias?: string;
}
