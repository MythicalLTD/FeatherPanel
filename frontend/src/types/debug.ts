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

export interface NetworkLog {
    url: string;
    method?: string;
    status: number;
    statusText: string;
    requestBody?: unknown;
    responseBody?: unknown;
    time?: string;
}

export interface ErrorLog {
    message: string;
    stack?: string;
    time?: string;
}

export interface ConsoleLog {
    message: string;
    time?: string;
}

export interface DebugSettings {
    useRedis: boolean;
    rateLimit: {
        enabled: boolean;
        limit: number;
    };
}

export interface AppSettings {
    value: {
        app_name: string;
        app_version: string;
        app_lang: string;
        app_timezone: string;
        app_url: string;
        currency: string;
        currency_symbol: string;
        company_name: string;
        company_address: string;
        company_city: string;
        company_state: string;
        company_country: string;
        company_zip: string;
        company_vat: string;
        default_cpu: string;
        default_ram: string;
        default_disk: string;
        default_ports: string;
        default_databases: string;
        default_backups: string;
        default_server_slots: string;
        server_renew_days: string;
        server_renew_cost: string;
        afk_enabled: string;
        allow_coins_sharing: string;
        allow_public_profiles: string;
        allow_servers: string;
        allow_tickets: string;
        code_redemption_enabled: string;
        credits_recharge_enabled: string;
        early_supporters_enabled: string;
        leaderboard_enabled: string;
        referrals_enabled: string;
        server_renew_enabled: string;
        store_enabled: string;
        zero_trust_enabled: string;
        debug_debug: boolean;
        debug_version: string;
        debug_os: string;
        debug_os_kernel: string;
        debug_name: string;
        debug_telemetry: boolean;
        debug: DebugSettings;
    };
    timestamp: number;
}
