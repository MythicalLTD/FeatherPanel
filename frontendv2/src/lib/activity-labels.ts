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

type Translate = (key: string, params?: Record<string, string>) => string;

/** Activity names users see most often, with a written label. */
const EVENT_LABELS: Record<string, string> = {
    login: 'activityLabels.events.login',
    logout: 'activityLabels.events.logout',
    register: 'activityLabels.events.register',
    forgot_password: 'activityLabels.events.forgot_password',
    reset_password: 'activityLabels.events.reset_password',
    two_fa_enabled: 'activityLabels.events.two_fa_enabled',
    two_fa_disabled: 'activityLabels.events.two_fa_disabled',
    two_fa_verified: 'activityLabels.events.two_fa_verified',
    update_profile: 'activityLabels.events.update_profile',
    update_settings: 'activityLabels.events.update_settings',
    create_ticket: 'activityLabels.events.create_ticket',
    ticket_reply: 'activityLabels.events.ticket_reply',
    delete_ticket: 'activityLabels.events.delete_ticket',
    ssh_key_created: 'activityLabels.events.ssh_key_created',
    ssh_key_deleted: 'activityLabels.events.ssh_key_deleted',
    api_client_created: 'activityLabels.events.api_client_created',
    api_client_deleted: 'activityLabels.events.api_client_deleted',
    api_keys_regenerated: 'activityLabels.events.api_keys_regenerated',
    request_data_export: 'activityLabels.events.request_data_export',
    account_deletion_scheduled: 'activityLabels.events.account_deletion_scheduled',
    delete_server: 'activityLabels.events.delete_server',
    update_server: 'activityLabels.events.update_server',
    create_server: 'activityLabels.events.create_server',
    create_user: 'activityLabels.events.create_user',
    update_user: 'activityLabels.events.update_user',
    create_node: 'activityLabels.events.create_node',
    update_node: 'activityLabels.events.update_node',
    create_location: 'activityLabels.events.create_location',
    allocation_created: 'activityLabels.events.allocation_created',
    allocation_assigned: 'activityLabels.events.allocation_assigned',
    allocation_unassigned: 'activityLabels.events.allocation_unassigned',
};

/** Leading verbs ("create_ticket") and trailing past tenses ("ssh_key_created"). */
const VERB_LABELS: Record<string, string> = {
    create: 'activityLabels.verbs.created',
    created: 'activityLabels.verbs.created',
    add: 'activityLabels.verbs.added',
    added: 'activityLabels.verbs.added',
    update: 'activityLabels.verbs.updated',
    updated: 'activityLabels.verbs.updated',
    delete: 'activityLabels.verbs.deleted',
    deleted: 'activityLabels.verbs.deleted',
    remove: 'activityLabels.verbs.removed',
    removed: 'activityLabels.verbs.removed',
    upload: 'activityLabels.verbs.uploaded',
    uploaded: 'activityLabels.verbs.uploaded',
    restore: 'activityLabels.verbs.restored',
    restored: 'activityLabels.verbs.restored',
    enable: 'activityLabels.verbs.enabled',
    enabled: 'activityLabels.verbs.enabled',
    disable: 'activityLabels.verbs.disabled',
    disabled: 'activityLabels.verbs.disabled',
    suspend: 'activityLabels.verbs.suspended',
    unsuspend: 'activityLabels.verbs.unsuspended',
    assigned: 'activityLabels.verbs.assigned',
    unassigned: 'activityLabels.verbs.unassigned',
};

const humanize = (words: string[]) => words.join(' ').replace(/\s+/g, ' ').trim();

const capitalize = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * Turns an activity name such as `update_settings` or `vm_instance_suspend` into a sentence
 * ("Updated settings", "Suspended vm instance"). Known events have their own translation;
 * anything else is built from its verb and subject, or shown as plain words.
 */
export function activityLabel(name: string, t: Translate): string {
    const raw = (name || '').trim();
    if (!raw) return raw;
    const known = EVENT_LABELS[raw];
    if (known) return t(known);

    const words = raw.split(/[_.:\-\s]+/).filter(Boolean);
    if (words.length > 1) {
        const first = words[0].toLowerCase();
        if (VERB_LABELS[first]) {
            return t(VERB_LABELS[first], { subject: humanize(words.slice(1)) });
        }
        const last = words[words.length - 1].toLowerCase();
        if (VERB_LABELS[last]) {
            return t(VERB_LABELS[last], { subject: humanize(words.slice(0, -1)) });
        }
    }
    return capitalize(humanize(words));
}
