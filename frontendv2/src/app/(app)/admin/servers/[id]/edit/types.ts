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

export interface Server {
    id: number;
    uuid: string;
    uuid_short: string;
    name: string;
    description: string | null;
    suspended: number;
    owner_id: number;
    node_id: number;
    allocation_id: number;
    realms_id: number;
    spell_id: number;
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
    threads: string | null;
    oom_killer: number;
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;
    startup: string;
    image: string;
    skip_scripts: number;
    external_id: string | null;
    installed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: number;
    uuid: string;
    username: string;
    email: string;
    avatar?: string;
    last_seen?: string;
    role?: {
        name: string;
        display_name: string;
        color: string;
    };
}

export interface Location {
    id: number;
    name: string;
}

export interface Node {
    id: number;
    name: string;
    fqdn: string;
    location_id: number;
}

export interface Allocation {
    id: number;
    ip: string;
    port: number;
    ip_alias: string | null;
    server_id: number | null;
    node_id: number;
    is_primary?: boolean;
}

export interface Realm {
    id: number;
    name: string;
    description?: string;
}

export interface Spell {
    id: number;
    name: string;
    description?: string;
    startup: string;
    docker_images: string; // JSON string
    realms_id: number;
}

export interface SpellVariable {
    id: number;
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: number;
    user_editable: number;
    rules: string;
    field_type: string;
}

export interface ServerFormData {
    name: string;
    description: string;
    owner_id: number | null;
    skip_scripts: boolean;
    skip_zerotrust: boolean;
    external_id: string;

    // Application
    realms_id: number | null;
    spell_id: number | null;
    image: string;
    startup: string;

    // Resources
    memory: number;
    swap: number;
    disk: number;
    cpu: number;
    io: number;
    oom_killer: boolean;
    threads: string;

    // Limits
    database_limit: number;
    allocation_limit: number;
    backup_limit: number;

    // Allocations
    allocation_id: number | null;

    // Spell variables
    variables: Record<string, string>;
}

export interface SelectedEntities {
    owner: User | null;
    realm: Realm | null;
    spell: Spell | null;
    allocation: Allocation | null;
}

export interface ServerAllocations {
    allocations: Allocation[];
    server: {
        current_allocations: number;
        allocation_limit: number;
        can_add_more: boolean;
    } | null;
}

export interface TabProps {
    form: ServerFormData;
    setForm: React.Dispatch<React.SetStateAction<ServerFormData>>;
    errors: Record<string, string>;
}
