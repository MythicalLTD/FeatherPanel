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

export interface SubdomainSpellMapping {
    spell_id: number;
    protocol_service: string | null;
    protocol_type: string;
    protocol_types?: string[];
    priority: number;
    weight: number;
    ttl: number;
    spell?: {
        id: number;
        uuid: string;
        name: string;
    } | null;
}

export interface SubdomainDomain {
    id?: number;
    uuid: string;
    domain: string;
    description?: string | null;
    is_active: number | boolean;
    cloudflare_zone_id?: string | null;
    cloudflare_account_id?: string | null;
    subdomain_count?: number;
    spells: SubdomainSpellMapping[];
    created_at?: string;
    updated_at?: string;
}

export interface SubdomainDomainPayload {
    domain: string;
    cloudflare_account_id: string;
    description?: string | null;
    is_active?: boolean;
    cloudflare_zone_id?: string | null;
    spells: Array<{
        spell_id: number;
        protocol_service?: string | null;
        protocol_type?: string;
        protocol_types?: string[];
        priority?: number;
        weight?: number;
        ttl?: number;
    }>;
}

export interface SubdomainAdminResponse {
    domains: SubdomainDomain[];
    pagination: {
        current_page: number;
        per_page: number;
        total_records: number;
        total_pages: number;
    };
}

export interface SubdomainOverview {
    max_allowed: number;
    current_total: number;
    domains: Array<{
        uuid: string;
        domain: string;
        protocol_service: string | null;
        protocol_type: string;
        priority: number;
        weight: number;
        ttl: number;
    }>;
    subdomains: Array<{
        uuid: string;
        domain: string;
        subdomain: string;
        record_type: string;
        port: number | null;
        created_at: string | null;
    }>;
}

export interface SubdomainSettings {
    cloudflare_email: string;
    max_subdomains_per_server: number;
    cloudflare_api_key_set: boolean;
}

export interface SubdomainSettingsPayload {
    cloudflare_email?: string;
    cloudflare_api_key?: string;
    max_subdomains_per_server?: number;
}

export interface ServerSubdomainPayload {
    domain_uuid: string;
    subdomain: string;
}
