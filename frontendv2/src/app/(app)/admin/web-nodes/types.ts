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

export interface CustomHeaderEntry {
    key: string;
    value: string;
    secret: boolean;
    keepValue?: boolean;
}

export interface WebNodeForm {
    name: string;
    description: string;
    location_id: string;
    fqdn: string;
    scheme: string;
    public: string;
    behind_proxy: string;
    maintenance_mode: string;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemonListen: number;
    daemonBase: string;
    websitesPath: string;
    backupsPath: string;
    backupsProvider: string;
    backupsS3Endpoint: string;
    backupsS3Region: string;
    backupsS3Bucket: string;
    backupsS3AccessKey: string;
    backupsS3SecretKey: string;
    backupsS3Prefix: string;
    backupsS3ForcePathStyle: string;
    backupsResticRepository: string;
    backupsResticPassword: string;
    backupsResticBinary: string;
    backupsPbsRepository: string;
    backupsPbsPassword: string;
    backupsPbsFingerprint: string;
    backupsPbsBinary: string;
    addonsPath: string;
    quilldConfigOverrides: string;
    remoteTimeout: number;
    remoteRetryLimit: number;
    remoteCustomHeaderEntries: CustomHeaderEntry[];
    sftpEnabled: string;
    sftpKeyAlgorithm: string;
    sftpPort: number;
    sftpDisablePasswordAuth: string;
    proxyEnabled: string;
    proxyProvider: string;
    acmeEmail: string;
    acmeStaging: string;
    backendPortMin: number;
    backendPortMax: number;
}

export function parseCustomHeaderEntries(
    raw: string | null | undefined,
    options?: { fromApi?: boolean },
): CustomHeaderEntry[] {
    if (!raw || raw.trim() === '' || raw.trim() === '{}') {
        return [];
    }

    try {
        const parsed = JSON.parse(raw.trim()) as unknown;

        if (Array.isArray(parsed)) {
            return parsed
                .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
                .map((item) => {
                    const secret = Boolean(item.secret);
                    const rawValue = String(item.value ?? '');
                    const keepValue =
                        Boolean(item.keep_value) || (options?.fromApi === true && secret && rawValue.trim() === '');
                    return {
                        key: String(item.key ?? ''),
                        value: secret && keepValue ? '' : rawValue,
                        secret,
                        keepValue: secret && keepValue,
                    };
                })
                .filter((item) => item.key !== '' || item.value !== '');
        }

        if (typeof parsed === 'object' && parsed !== null) {
            return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
                key,
                value: String(value),
                secret: false,
            }));
        }
    } catch {
        return [];
    }

    return [];
}

export function serializeCustomHeaderEntries(entries: CustomHeaderEntry[]): string | null {
    const payload = entries
        .map((entry) => {
            const key = entry.key.trim();
            if (!key) {
                return null;
            }

            const item: Record<string, string | boolean> = {
                key,
                value: entry.value,
                secret: entry.secret,
            };

            if (entry.secret && entry.keepValue && entry.value.trim() === '') {
                item.keep_value = true;
            }

            return item;
        })
        .filter((item): item is Record<string, string | boolean> => item !== null);

    return payload.length === 0 ? null : JSON.stringify(payload);
}

export function defaultWebNodeForm(): WebNodeForm {
    return {
        name: '',
        description: '',
        location_id: '',
        fqdn: '',
        scheme: 'https',
        public: 'true',
        behind_proxy: 'false',
        maintenance_mode: 'false',
        memory: 1024,
        memory_overallocate: 0,
        disk: 4096,
        disk_overallocate: 0,
        upload_size: 100,
        daemonListen: 8989,
        daemonBase: '/var/lib/featherquilld',
        websitesPath: '',
        backupsPath: '',
        backupsProvider: 'local',
        backupsS3Endpoint: '',
        backupsS3Region: 'us-east-1',
        backupsS3Bucket: '',
        backupsS3AccessKey: '',
        backupsS3SecretKey: '',
        backupsS3Prefix: 'webspaces/',
        backupsS3ForcePathStyle: 'false',
        backupsResticRepository: '',
        backupsResticPassword: '',
        backupsResticBinary: '',
        backupsPbsRepository: '',
        backupsPbsPassword: '',
        backupsPbsFingerprint: '',
        backupsPbsBinary: '',
        addonsPath: '',
        quilldConfigOverrides: '',
        remoteTimeout: 30,
        remoteRetryLimit: 10,
        remoteCustomHeaderEntries: [],
        sftpEnabled: 'true',
        sftpKeyAlgorithm: 'ssh-ed25519',
        sftpPort: 2222,
        sftpDisablePasswordAuth: 'false',
        proxyEnabled: 'true',
        proxyProvider: 'caddy',
        acmeEmail: '',
        acmeStaging: 'false',
        backendPortMin: 20000,
        backendPortMax: 29999,
    };
}

export function buildWebNodeSubmitPayload(form: WebNodeForm) {
    const { remoteCustomHeaderEntries, ...rest } = form;

    const payload = {
        ...rest,
        location_id: parseInt(form.location_id, 10),
        public: form.public === 'true',
        behind_proxy: form.behind_proxy === 'true',
        maintenance_mode: form.maintenance_mode === 'true',
        memory: Number(form.memory),
        memory_overallocate: Number(form.memory_overallocate),
        disk: Number(form.disk),
        disk_overallocate: Number(form.disk_overallocate),
        upload_size: Number(form.upload_size),
        daemonListen: Number(form.daemonListen),
        websitesPath: form.websitesPath.trim() || null,
        backupsPath: form.backupsPath.trim() || null,
        backupsProvider: form.backupsProvider || 'local',
        backupsS3Endpoint: form.backupsS3Endpoint.trim() || null,
        backupsS3Region: form.backupsS3Region.trim() || null,
        backupsS3Bucket: form.backupsS3Bucket.trim() || null,
        backupsS3AccessKey: form.backupsS3AccessKey.trim() || null,
        backupsS3SecretKey: form.backupsS3SecretKey.trim() || null,
        backupsS3Prefix: form.backupsS3Prefix.trim() || null,
        backupsS3ForcePathStyle: form.backupsS3ForcePathStyle === 'true',
        backupsResticRepository: form.backupsResticRepository.trim() || null,
        backupsResticPassword: form.backupsResticPassword.trim() || null,
        backupsResticBinary: form.backupsResticBinary.trim() || null,
        backupsPbsRepository: form.backupsPbsRepository.trim() || null,
        backupsPbsPassword: form.backupsPbsPassword.trim() || null,
        backupsPbsFingerprint: form.backupsPbsFingerprint.trim() || null,
        backupsPbsBinary: form.backupsPbsBinary.trim() || null,
        addonsPath: form.addonsPath.trim() || null,
        quilldConfigOverrides: form.quilldConfigOverrides.trim() || null,
        remoteTimeout: Number(form.remoteTimeout),
        remoteRetryLimit: Number(form.remoteRetryLimit),
        remoteCustomHeaders: serializeCustomHeaderEntries(remoteCustomHeaderEntries),
        sftpEnabled: form.sftpEnabled === 'true',
        sftpKeyAlgorithm: form.sftpKeyAlgorithm,
        sftpPort: Number(form.sftpPort),
        sftpDisablePasswordAuth: form.sftpDisablePasswordAuth === 'true',
        proxyEnabled: form.proxyEnabled === 'true',
        proxyProvider: form.proxyProvider || 'caddy',
        acmeEmail: form.acmeEmail.trim() || null,
        acmeStaging: form.acmeStaging === 'true',
        backendPortMin: Number(form.backendPortMin),
        backendPortMax: Number(form.backendPortMax),
    };

    if (!form.backupsS3SecretKey.trim()) {
        delete (payload as { backupsS3SecretKey?: string | null }).backupsS3SecretKey;
    }
    if (!form.backupsResticPassword.trim()) {
        delete (payload as { backupsResticPassword?: string | null }).backupsResticPassword;
    }
    if (!form.backupsPbsPassword.trim()) {
        delete (payload as { backupsPbsPassword?: string | null }).backupsPbsPassword;
    }

    return payload;
}

export function validateWebNodeForm(
    form: WebNodeForm,
    t: (key: string) => string,
    options?: { validateFqdnFormat?: boolean },
): Record<string, string> {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = t('admin.webNodes.form.name_required');
    if (!form.fqdn.trim()) {
        newErrors.fqdn = t('admin.webNodes.form.fqdn_required');
    } else if (options?.validateFqdnFormat) {
        const fqdnRegex =
            /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!fqdnRegex.test(form.fqdn)) {
            newErrors.fqdn = t('admin.webNodes.form.fqdn_invalid');
        }
    }
    if (!form.location_id) newErrors.location_id = t('admin.webNodes.form.location_required');
    if (!form.daemonBase.trim()) newErrors.daemonBase = t('admin.webNodes.form.daemon_base_required');
    if (form.daemonListen < 1 || form.daemonListen > 65535) {
        newErrors.daemonListen = t('admin.webNodes.form.daemon_port_invalid');
    }
    if (form.remoteTimeout < 1) newErrors.remoteTimeout = t('admin.webNodes.form.remote_timeout_invalid');
    if (form.remoteRetryLimit < 0) newErrors.remoteRetryLimit = t('admin.webNodes.form.remote_retry_limit_invalid');
    if (form.sftpPort < 1 || form.sftpPort > 65535) {
        newErrors.sftpPort = t('admin.webNodes.form.sftp_port_invalid');
    }
    if (form.backendPortMin < 1 || form.backendPortMin > 65535) {
        newErrors.backendPortMin = t('admin.webNodes.form.backend_port_invalid');
    }
    if (form.backendPortMax < 1 || form.backendPortMax > 65535) {
        newErrors.backendPortMax = t('admin.webNodes.form.backend_port_invalid');
    }
    if (!newErrors.backendPortMin && !newErrors.backendPortMax && form.backendPortMax < form.backendPortMin) {
        newErrors.backendPortMax = t('admin.webNodes.form.backend_port_range_invalid');
    }

    const seenKeys = new Set<string>();
    for (const entry of form.remoteCustomHeaderEntries) {
        const key = entry.key.trim();
        const value = entry.value.trim();

        if (!key && value) {
            newErrors.remoteCustomHeaders = t('admin.webNodes.form.remote_custom_headers_key_required');
            break;
        }

        if (!key) {
            continue;
        }

        if (entry.secret && !entry.keepValue && value.trim() === '') {
            newErrors.remoteCustomHeaders = t('admin.webNodes.form.remote_custom_headers_secret_required');
            break;
        }

        if (seenKeys.has(key)) {
            newErrors.remoteCustomHeaders = t('admin.webNodes.form.remote_custom_headers_duplicate');
            break;
        }

        seenKeys.add(key);
    }

    return newErrors;
}

export type WebNodeFormTab = 'details' | 'config' | 'network' | 'remote' | 'advanced';

const WEB_NODE_FIELD_TABS: Record<string, WebNodeFormTab> = {
    name: 'details',
    description: 'details',
    location_id: 'details',
    public: 'details',
    memory: 'config',
    memory_overallocate: 'config',
    disk: 'config',
    disk_overallocate: 'config',
    daemonBase: 'config',
    websitesPath: 'config',
    backupsPath: 'config',
    backupsProvider: 'config',
    backupsS3Endpoint: 'config',
    backupsS3Bucket: 'config',
    backupsResticRepository: 'config',
    backupsPbsRepository: 'config',
    addonsPath: 'config',
    quilldConfigOverrides: 'config',
    fqdn: 'network',
    scheme: 'network',
    behind_proxy: 'network',
    daemonListen: 'network',
    sftpPort: 'network',
    backendPortMin: 'network',
    backendPortMax: 'network',
    acmeEmail: 'network',
    acmeStaging: 'network',
    remoteTimeout: 'remote',
    remoteRetryLimit: 'remote',
    remoteCustomHeaders: 'remote',
    sftpEnabled: 'remote',
    sftpKeyAlgorithm: 'remote',
    sftpDisablePasswordAuth: 'remote',
    maintenance_mode: 'advanced',
    upload_size: 'advanced',
};

/** Validation order — first failing field wins for tab focus. */
const WEB_NODE_VALIDATION_FIELD_ORDER = [
    'name',
    'location_id',
    'fqdn',
    'daemonBase',
    'daemonListen',
    'sftpPort',
    'backendPortMin',
    'backendPortMax',
    'remoteTimeout',
    'remoteRetryLimit',
    'remoteCustomHeaders',
    'maintenance_mode',
    'upload_size',
] as const;

export function getWebNodeTabForField(field: string): WebNodeFormTab {
    return WEB_NODE_FIELD_TABS[field] ?? 'details';
}

export function getFirstWebNodeErrorTab(errors: Record<string, string>): WebNodeFormTab | null {
    if (Object.keys(errors).length === 0) {
        return null;
    }

    for (const field of WEB_NODE_VALIDATION_FIELD_ORDER) {
        if (errors[field]) {
            return getWebNodeTabForField(field);
        }
    }

    const firstKey = Object.keys(errors)[0];
    return firstKey ? getWebNodeTabForField(firstKey) : null;
}

export function getWebNodeTabLabelKey(tab: WebNodeFormTab): string {
    switch (tab) {
        case 'details':
            return 'admin.webNodes.form.basic_details';
        case 'config':
            return 'admin.webNodes.form.configuration';
        case 'network':
            return 'admin.webNodes.form.network';
        case 'remote':
            return 'admin.webNodes.form.remote_sftp';
        case 'advanced':
            return 'admin.webNodes.form.advanced';
    }
}
