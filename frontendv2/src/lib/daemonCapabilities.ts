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

export type DaemonType = 'featherwings' | 'wings_rs';

export type DaemonFeature =
    | 'core'
    | 'modules'
    | 'live_config'
    | 'host_terminal'
    | 'self_update'
    | 'trash'
    | 'firewall'
    | 'fastdl'
    | 'diagnostics'
    | 'docker'
    | 'docker_disk'
    | 'proxy'
    | 'import'
    | 'share'
    | 'archive_browse'
    | 'file_search'
    | 'reconcile'
    | 'deauthorize'
    | 'container_exec'
    | 'system_logs'
    | 'install_abort'
    | 'directory_download'
    | 'file_op_progress'
    | 'backup_browse'
    | 'server_script'
    | 'ws_live_permissions'
    | 'file_fingerprints'
    | 'paginated_file_list'
    | 'transfer_backups'
    | 'compress_7z'
    | 'file_history'
    | 'file_collaboration';

export type DaemonCapabilitiesMap = Record<DaemonFeature, boolean>;

const FEATHERWINGS_CAPS: DaemonCapabilitiesMap = {
    core: true,
    modules: true,
    live_config: true,
    host_terminal: true,
    self_update: true,
    trash: true,
    firewall: true,
    fastdl: true,
    diagnostics: true,
    docker: true,
    docker_disk: true,
    proxy: true,
    import: true,
    share: true,
    archive_browse: true,
    file_search: true,
    reconcile: true,
    deauthorize: true,
    container_exec: true,
    system_logs: false,
    install_abort: false,
    directory_download: false,
    file_op_progress: false,
    backup_browse: false,
    server_script: false,
    ws_live_permissions: false,
    file_fingerprints: false,
    paginated_file_list: false,
    transfer_backups: false,
    compress_7z: false,
    file_history: true,
    file_collaboration: true,
};

const WINGS_RS_CAPS: DaemonCapabilitiesMap = {
    core: true,
    modules: false,
    live_config: false,
    host_terminal: false,
    self_update: true,
    trash: false,
    firewall: false,
    fastdl: false,
    diagnostics: false,
    docker: true,
    docker_disk: false,
    proxy: false,
    import: false,
    share: false,
    archive_browse: true,
    file_search: true,
    reconcile: false,
    deauthorize: true,
    container_exec: false,
    system_logs: true,
    install_abort: true,
    directory_download: true,
    file_op_progress: true,
    backup_browse: true,
    server_script: true,
    ws_live_permissions: true,
    file_fingerprints: true,
    paginated_file_list: true,
    transfer_backups: true,
    compress_7z: true,
    file_history: true,
    file_collaboration: true,
};

export function normalizeDaemonType(type?: string | null): DaemonType {
    return type === 'wings_rs' ? 'wings_rs' : 'featherwings';
}

export function capabilitiesForType(type?: string | null): DaemonCapabilitiesMap {
    return normalizeDaemonType(type) === 'wings_rs' ? { ...WINGS_RS_CAPS } : { ...FEATHERWINGS_CAPS };
}

/**
 * Resolve whether a feature is supported.
 * Prefer explicit caps when present; otherwise fall back to the matrix for daemonType.
 * Missing keys in a partial caps object are resolved from the daemon type matrix (not treated as allowed).
 */
export function supportsDaemonFeature(
    caps: Partial<DaemonCapabilitiesMap> | null | undefined,
    feature: DaemonFeature,
    daemonType?: string | null,
): boolean {
    const fallback = capabilitiesForType(daemonType);
    if (caps && typeof caps[feature] === 'boolean') {
        return caps[feature] === true;
    }
    return fallback[feature] === true;
}

/**
 * Merge API-provided caps with the static matrix so missing keys default correctly for the daemon type.
 */
export function resolveCapabilities(
    caps: Partial<DaemonCapabilitiesMap> | null | undefined,
    daemonType?: string | null,
): DaemonCapabilitiesMap {
    return { ...capabilitiesForType(daemonType), ...(caps ?? {}) };
}

export function defaultDaemonBase(type?: string | null): string {
    return normalizeDaemonType(type) === 'wings_rs'
        ? '/var/lib/calagopus-wings/volumes'
        : '/var/lib/featherpanel/volumes';
}
