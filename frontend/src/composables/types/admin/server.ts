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

// Server-related API types
export interface ApiLocation {
    id: number;
    name: string;
    description?: string;
}

export interface ApiNode {
    id: number;
    name: string;
    fqdn?: string;
    location_id: number;
}

export interface ApiUser {
    id: number;
    username: string;
    email: string;
    avatar?: string;
}

export interface ApiRealm {
    id: number;
    name: string;
    description?: string;
    location_id: number;
}

export interface ApiSpell {
    id: number;
    name: string;
    description?: string;
    realm_id: number;
    startup?: string;
    docker_images?: string;
    features?: string;
}

export interface ApiAllocation {
    id: number;
    ip: string;
    port: number;
    node_id: number;
}

export interface ApiSpellVariable {
    id: number;
    spell_id: number;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: number;
    user_editable: number;
    rules: string;
    field_type: string;
}

export interface ApiServer {
    id: number;
    node_id: number;
    name: string;
    description: string;
    suspended?: number;
    owner_id: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    allocation_id: number;
    realms_id: number;
    spell_id: number;
    startup: string;
    image: string;
    database_limit?: number;
    allocation_limit?: number;
    backup_limit?: number;
    skip_scripts: number;
    skip_zerotrust?: number;
    external_id?: string | null;
    node?: { location_id: number };
    variables?: Array<{
        id: number;
        server_id: number;
        variable_id: number;
        variable_value: string;
        name: string;
        description: string;
        env_variable: string;
        default_value: string;
        user_viewable: number;
        user_editable: number;
        rules: string;
        field_type: string;
        created_at: string;
        updated_at: string;
    }>;
}

// Form types
export interface CreateForm {
    node_id: string;
    name: string;
    description: string;
    owner_id: string;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    allocation_id: string;
    realms_id: string;
    spell_id: string;
    startup: string;
    image: string;
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;
    skip_scripts: boolean;
    location_id: string; // For UI filtering only, not sent to API
}

export interface EditForm {
    node_id: string;
    name: string;
    description: string; // Can be empty string, converted to null on submit
    status?: string;
    suspended?: number;
    owner_id: string;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    allocation_id: string;
    realms_id: string;
    spell_id: string;
    startup: string;
    image: string;
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;
    skip_scripts: boolean;
    skip_zerotrust: boolean;
    external_id: string;
    location_id: string; // For UI filtering only, not sent to API
}

export interface SubmitData {
    node_id: number;
    name: string;
    description: string | null;
    owner_id: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    allocation_id: number;
    realms_id: number;
    spell_id: number;
    startup: string;
    image: string;
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;
    skip_scripts: boolean;
    skip_zerotrust?: boolean;
    external_id?: string | null;
    variables: Array<{ variable_id: number; variable_value: string }>;
}

export interface AxiosError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

// Skip scripts options
export interface SkipScriptsOption {
    value: boolean;
    label: string;
}

export const SKIP_SCRIPTS_OPTIONS: SkipScriptsOption[] = [
    { value: false, label: 'No - Run scripts normally' },
    { value: true, label: 'Yes - Skip startup scripts' },
];

// Skip zero trust options
export interface SkipZeroTrustOption {
    value: boolean;
    label: string;
}

export const SKIP_ZEROTRUST_OPTIONS: SkipZeroTrustOption[] = [
    { value: false, label: 'No - Run zero trust checks normally' },
    { value: true, label: 'Yes - Skip zero trust checks' },
];

// Server transfer status
export interface TransferStatus {
    status: string;
    progress?: number;
    started_at?: string;
    completed_at?: string;
    error?: string;
}
