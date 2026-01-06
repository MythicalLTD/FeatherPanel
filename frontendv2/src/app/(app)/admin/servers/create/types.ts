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

export interface Spell {
    id: number;
    name: string;
    description?: string;
    startup: string;
    docker_images: string; // JSON string that needs to be parsed
}

export interface User {
    id: number;
    uuid: string;
    username: string;
    email: string;
}

export interface Location {
    id: number;
    name: string;
}

export interface Node {
    id: number;
    name: string;
    fqdn: string;
}

export interface Allocation {
    id: number;
    ip: string;
    port: number;
    ip_alias?: string;
    server_id: number | null;
    node_id: number;
}

export interface Realm {
    id: number;
    name: string;
}

// Server Creation Form Data
export interface ServerFormData {
    // Core Details
    name: string;
    description: string;
    ownerId: number | null;
    skipScripts: boolean;

    // Allocation
    locationId: number | null;
    nodeId: number | null;
    allocationId: number | null;

    // Application Configuration
    realmId: number | null;
    spellId: number | null;
    dockerImage: string;
    startup: string;

    // Resource Limits
    memory: number;
    swap: number;
    disk: number;
    cpu: number;
    io: number;
    oomKiller: boolean;
    threads: string;

    // Resource Toggle States
    memoryUnlimited: boolean;
    swapType: 'disabled' | 'unlimited' | 'limited';
    diskUnlimited: boolean;
    cpuUnlimited: boolean;

    // Feature Limits
    databaseLimit: number;
    allocationLimit: number;
    backupLimit: number;

    // Spell Variables
    spellVariables: Record<string, string>;
}

// Selected Entity Display Data
export interface SelectedEntities {
    owner: User | null;
    location: Location | null;
    node: Node | null;
    allocation: Allocation | null;
    realm: Realm | null;
    spell: Spell | null;
}

// Step Component Common Props
export interface StepProps {
    formData: ServerFormData;
    setFormData: React.Dispatch<React.SetStateAction<ServerFormData>>;
    selectedEntities: SelectedEntities;
    setSelectedEntities: React.Dispatch<React.SetStateAction<SelectedEntities>>;
    spellDetails: Spell | null;
    spellVariablesData: SpellVariable[];
}

// Wizard Step Definition
export interface WizardStep {
    title: string;
    subtitle: string;
}
