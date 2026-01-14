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
