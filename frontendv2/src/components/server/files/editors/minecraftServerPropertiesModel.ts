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

export interface MinecraftServerPropertiesForm {
    motd: string;
    serverName: string;
    difficulty: string;
    gamemode: string;
    levelType: string;
    maxPlayers: number;
    whiteList: boolean;
    enforceWhitelist: boolean;
    onlineMode: boolean;
    pvp: boolean;
    enableCommandBlock: boolean;
    allowFlight: boolean;
    spawnMonsters: boolean;
    allowNether: boolean;
    forceGamemode: boolean;
    broadcastConsoleToOps: boolean;
    broadcastRconToOps: boolean;
    spawnProtection: number;
    viewDistance: number;
    simulationDistance: number;
    levelName: string;
    levelSeed: string;
    generatorSettings: string;
    generateStructures: boolean;
    hardcore: boolean;
    requireResourcePack: boolean;
    hideOnlinePlayers: boolean;
    enforceSecureProfile: boolean;
    previewsChat: boolean;
    useNativeTransport: boolean;
    resourcePack: string;
    resourcePackSha1: string;
    resourcePackId: string;
    resourcePackPrompt: string;
    opPermissionLevel: number;
    functionPermissionLevel: number;
    entityBroadcastRangePercentage: number;
    maxChainedNeighborUpdates: number;
    maxWorldSize: number;
    acceptsTransfers: boolean;
    bugReportLink: string;
    debug: boolean;
    enableCodeOfConduct: boolean;
    enableJmxMonitoring: boolean;
    enableQuery: boolean;
    enableRcon: boolean;
    enableStatus: boolean;
    initialDisabledPacks: string;
    initialEnabledPacks: string;
    logIps: boolean;
    managementServerAllowedOrigins: string;
    managementServerEnabled: boolean;
    managementServerHost: string;
    managementServerPort: number;
    managementServerSecret: string;
    managementServerTlsEnabled: boolean;
    managementServerTlsKeystore: string;
    managementServerTlsKeystorePassword: string;
    maxTickTime: number;
    networkCompressionThreshold: number;
    pauseWhenEmptySeconds: number;
    playerIdleTimeout: number;
    preventProxyConnections: boolean;
    queryPort: number;
    rateLimit: number;
    rconPassword: string;
    rconPort: number;
    regionFileCompression: string;
    serverIp: string;
    serverPort: number;
    statusHeartbeatInterval: number;
    syncChunkWrites: boolean;
    textFilteringConfig: string;
    textFilteringVersion: number;
}

export function parseProperties(content: string): Map<string, string> {
    const map = new Map<string, string>();
    content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .forEach((line) => {
            if (!line || line.startsWith('#')) {
                return;
            }

            const separatorIndex = line.indexOf('=');
            if (separatorIndex === -1) {
                return;
            }

            const key = line.slice(0, separatorIndex).trim();
            const value = unescapePropertyValue(line.slice(separatorIndex + 1).trim());
            if (key) {
                map.set(key, value);
            }
        });

    return map;
}

export function unescapePropertyValue(value: string): string {
    let result = '';
    for (let i = 0; i < value.length; i += 1) {
        if (value[i] === '\\' && i + 1 < value.length) {
            result += value[i + 1];
            i += 1;
        } else {
            result += value[i];
        }
    }
    return result;
}

export function escapePropertyValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/=/g, '\\=');
}

export function getDefaultForm(): MinecraftServerPropertiesForm {
    return {
        motd: 'A Minecraft Server',
        serverName: 'Unknown Server',
        difficulty: 'easy',
        gamemode: 'survival',
        levelType: 'minecraft:normal',
        maxPlayers: 20,
        whiteList: false,
        enforceWhitelist: false,
        onlineMode: true,
        pvp: true,
        enableCommandBlock: false,
        allowFlight: false,
        spawnMonsters: true,
        allowNether: true,
        forceGamemode: false,
        broadcastConsoleToOps: true,
        broadcastRconToOps: true,
        spawnProtection: 16,
        viewDistance: 10,
        simulationDistance: 10,
        levelName: 'world',
        levelSeed: '',
        generatorSettings: '{}',
        generateStructures: true,
        hardcore: false,
        requireResourcePack: false,
        hideOnlinePlayers: false,
        enforceSecureProfile: true,
        previewsChat: true,
        useNativeTransport: true,
        resourcePack: '',
        resourcePackSha1: '',
        resourcePackId: '',
        resourcePackPrompt: '',
        opPermissionLevel: 4,
        functionPermissionLevel: 2,
        entityBroadcastRangePercentage: 100,
        maxChainedNeighborUpdates: 1000000,
        maxWorldSize: 29999984,
        acceptsTransfers: false,
        bugReportLink: '',
        debug: false,
        enableCodeOfConduct: false,
        enableJmxMonitoring: false,
        enableQuery: false,
        enableRcon: false,
        enableStatus: true,
        initialDisabledPacks: '',
        initialEnabledPacks: 'vanilla',
        logIps: true,
        managementServerAllowedOrigins: '',
        managementServerEnabled: false,
        managementServerHost: 'localhost',
        managementServerPort: 0,
        managementServerSecret: '',
        managementServerTlsEnabled: true,
        managementServerTlsKeystore: '',
        managementServerTlsKeystorePassword: '',
        maxTickTime: 60000,
        networkCompressionThreshold: 256,
        pauseWhenEmptySeconds: -1,
        playerIdleTimeout: 0,
        preventProxyConnections: false,
        queryPort: 25565,
        rateLimit: 0,
        rconPassword: '',
        rconPort: 25575,
        regionFileCompression: 'deflate',
        serverIp: '',
        serverPort: 25565,
        statusHeartbeatInterval: 0,
        syncChunkWrites: true,
        textFilteringConfig: '',
        textFilteringVersion: 0,
    };
}

function parseBoolean(parsed: Map<string, string>, key: string, fallback: boolean): boolean {
    const value = parsed.get(key);
    if (value === undefined) {
        return fallback;
    }
    return value === 'true';
}

function parseIntValue(parsed: Map<string, string>, key: string, fallback: number): number {
    const value = parsed.get(key);
    if (value === undefined || value === '') {
        return fallback;
    }
    const parsedValue = Number.parseInt(value, 10);
    return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

function parseString(parsed: Map<string, string>, key: string, fallback: string): string {
    return parsed.get(key) ?? fallback;
}

export function parseForm(content: string): MinecraftServerPropertiesForm {
    const parsed = parseProperties(content);
    const form = getDefaultForm();

    return {
        motd: parseString(parsed, 'motd', form.motd),
        serverName: parseString(parsed, 'server-name', form.serverName),
        difficulty: parseString(parsed, 'difficulty', form.difficulty),
        gamemode: parseString(parsed, 'gamemode', form.gamemode),
        levelType: parseString(parsed, 'level-type', form.levelType),
        maxPlayers: parseIntValue(parsed, 'max-players', form.maxPlayers),
        whiteList: parseBoolean(parsed, 'white-list', form.whiteList),
        enforceWhitelist: parseBoolean(parsed, 'enforce-whitelist', form.enforceWhitelist),
        onlineMode: parseBoolean(parsed, 'online-mode', form.onlineMode),
        pvp: parseBoolean(parsed, 'pvp', form.pvp),
        enableCommandBlock: parseBoolean(parsed, 'enable-command-block', form.enableCommandBlock),
        allowFlight: parseBoolean(parsed, 'allow-flight', form.allowFlight),
        spawnMonsters: parseBoolean(parsed, 'spawn-monsters', form.spawnMonsters),
        allowNether: parseBoolean(parsed, 'allow-nether', form.allowNether),
        forceGamemode: parseBoolean(parsed, 'force-gamemode', form.forceGamemode),
        broadcastConsoleToOps: parseBoolean(parsed, 'broadcast-console-to-ops', form.broadcastConsoleToOps),
        broadcastRconToOps: parseBoolean(parsed, 'broadcast-rcon-to-ops', form.broadcastRconToOps),
        spawnProtection: parseIntValue(parsed, 'spawn-protection', form.spawnProtection),
        viewDistance: parseIntValue(parsed, 'view-distance', form.viewDistance),
        simulationDistance: parseIntValue(parsed, 'simulation-distance', form.simulationDistance),
        levelName: parseString(parsed, 'level-name', form.levelName),
        levelSeed: parseString(parsed, 'level-seed', form.levelSeed),
        generatorSettings: parseString(parsed, 'generator-settings', form.generatorSettings),
        generateStructures: parseBoolean(parsed, 'generate-structures', form.generateStructures),
        hardcore: parseBoolean(parsed, 'hardcore', form.hardcore),
        requireResourcePack: parseBoolean(parsed, 'require-resource-pack', form.requireResourcePack),
        hideOnlinePlayers: parseBoolean(parsed, 'hide-online-players', form.hideOnlinePlayers),
        enforceSecureProfile: parseBoolean(parsed, 'enforce-secure-profile', form.enforceSecureProfile),
        previewsChat: parseBoolean(parsed, 'previews-chat', form.previewsChat),
        useNativeTransport: parseBoolean(parsed, 'use-native-transport', form.useNativeTransport),
        resourcePack: parseString(parsed, 'resource-pack', form.resourcePack),
        resourcePackSha1: parseString(parsed, 'resource-pack-sha1', form.resourcePackSha1),
        resourcePackId: parseString(parsed, 'resource-pack-id', form.resourcePackId),
        resourcePackPrompt: parseString(parsed, 'resource-pack-prompt', form.resourcePackPrompt),
        opPermissionLevel: parseIntValue(parsed, 'op-permission-level', form.opPermissionLevel),
        functionPermissionLevel: parseIntValue(parsed, 'function-permission-level', form.functionPermissionLevel),
        entityBroadcastRangePercentage: parseIntValue(
            parsed,
            'entity-broadcast-range-percentage',
            form.entityBroadcastRangePercentage,
        ),
        maxChainedNeighborUpdates: parseIntValue(
            parsed,
            'max-chained-neighbor-updates',
            form.maxChainedNeighborUpdates,
        ),
        maxWorldSize: parseIntValue(parsed, 'max-world-size', form.maxWorldSize),
        acceptsTransfers: parseBoolean(parsed, 'accepts-transfers', form.acceptsTransfers),
        bugReportLink: parseString(parsed, 'bug-report-link', form.bugReportLink),
        debug: parseBoolean(parsed, 'debug', form.debug),
        enableCodeOfConduct: parseBoolean(parsed, 'enable-code-of-conduct', form.enableCodeOfConduct),
        enableJmxMonitoring: parseBoolean(parsed, 'enable-jmx-monitoring', form.enableJmxMonitoring),
        enableQuery: parseBoolean(parsed, 'enable-query', form.enableQuery),
        enableRcon: parseBoolean(parsed, 'enable-rcon', form.enableRcon),
        enableStatus: parseBoolean(parsed, 'enable-status', form.enableStatus),
        initialDisabledPacks: parseString(parsed, 'initial-disabled-packs', form.initialDisabledPacks),
        initialEnabledPacks: parseString(parsed, 'initial-enabled-packs', form.initialEnabledPacks),
        logIps: parseBoolean(parsed, 'log-ips', form.logIps),
        managementServerAllowedOrigins: parseString(
            parsed,
            'management-server-allowed-origins',
            form.managementServerAllowedOrigins,
        ),
        managementServerEnabled: parseBoolean(parsed, 'management-server-enabled', form.managementServerEnabled),
        managementServerHost: parseString(parsed, 'management-server-host', form.managementServerHost),
        managementServerPort: parseIntValue(parsed, 'management-server-port', form.managementServerPort),
        managementServerSecret: parseString(parsed, 'management-server-secret', form.managementServerSecret),
        managementServerTlsEnabled: parseBoolean(
            parsed,
            'management-server-tls-enabled',
            form.managementServerTlsEnabled,
        ),
        managementServerTlsKeystore: parseString(
            parsed,
            'management-server-tls-keystore',
            form.managementServerTlsKeystore,
        ),
        managementServerTlsKeystorePassword: parseString(
            parsed,
            'management-server-tls-keystore-password',
            form.managementServerTlsKeystorePassword,
        ),
        maxTickTime: parseIntValue(parsed, 'max-tick-time', form.maxTickTime),
        networkCompressionThreshold: parseIntValue(
            parsed,
            'network-compression-threshold',
            form.networkCompressionThreshold,
        ),
        pauseWhenEmptySeconds: parseIntValue(parsed, 'pause-when-empty-seconds', form.pauseWhenEmptySeconds),
        playerIdleTimeout: parseIntValue(parsed, 'player-idle-timeout', form.playerIdleTimeout),
        preventProxyConnections: parseBoolean(parsed, 'prevent-proxy-connections', form.preventProxyConnections),
        queryPort: parseIntValue(parsed, 'query.port', form.queryPort),
        rateLimit: parseIntValue(parsed, 'rate-limit', form.rateLimit),
        rconPassword: parseString(parsed, 'rcon.password', form.rconPassword),
        rconPort: parseIntValue(parsed, 'rcon.port', form.rconPort),
        regionFileCompression: parseString(parsed, 'region-file-compression', form.regionFileCompression),
        serverIp: parseString(parsed, 'server-ip', form.serverIp),
        serverPort: parseIntValue(parsed, 'server-port', form.serverPort),
        statusHeartbeatInterval: parseIntValue(parsed, 'status-heartbeat-interval', form.statusHeartbeatInterval),
        syncChunkWrites: parseBoolean(parsed, 'sync-chunk-writes', form.syncChunkWrites),
        textFilteringConfig: parseString(parsed, 'text-filtering-config', form.textFilteringConfig),
        textFilteringVersion: parseIntValue(parsed, 'text-filtering-version', form.textFilteringVersion),
    };
}

function formatBoolean(value: boolean): string {
    return value ? 'true' : 'false';
}

export function serializeForm(form: MinecraftServerPropertiesForm): Record<string, string> {
    return {
        motd: form.motd,
        'server-name': form.serverName,
        difficulty: form.difficulty,
        gamemode: form.gamemode,
        'level-type': form.levelType,
        'max-players': String(form.maxPlayers),
        'white-list': formatBoolean(form.whiteList),
        'enforce-whitelist': formatBoolean(form.enforceWhitelist),
        'online-mode': formatBoolean(form.onlineMode),
        pvp: formatBoolean(form.pvp),
        'enable-command-block': formatBoolean(form.enableCommandBlock),
        'allow-flight': formatBoolean(form.allowFlight),
        'spawn-monsters': formatBoolean(form.spawnMonsters),
        'allow-nether': formatBoolean(form.allowNether),
        'force-gamemode': formatBoolean(form.forceGamemode),
        'broadcast-console-to-ops': formatBoolean(form.broadcastConsoleToOps),
        'broadcast-rcon-to-ops': formatBoolean(form.broadcastRconToOps),
        'spawn-protection': String(form.spawnProtection),
        'view-distance': String(form.viewDistance),
        'simulation-distance': String(form.simulationDistance),
        'level-name': form.levelName,
        'level-seed': form.levelSeed,
        'generator-settings': form.generatorSettings,
        'generate-structures': formatBoolean(form.generateStructures),
        hardcore: formatBoolean(form.hardcore),
        'require-resource-pack': formatBoolean(form.requireResourcePack),
        'hide-online-players': formatBoolean(form.hideOnlinePlayers),
        'enforce-secure-profile': formatBoolean(form.enforceSecureProfile),
        'previews-chat': formatBoolean(form.previewsChat),
        'use-native-transport': formatBoolean(form.useNativeTransport),
        'resource-pack': form.resourcePack,
        'resource-pack-sha1': form.resourcePackSha1,
        'resource-pack-id': form.resourcePackId,
        'resource-pack-prompt': form.resourcePackPrompt,
        'op-permission-level': String(form.opPermissionLevel),
        'function-permission-level': String(form.functionPermissionLevel),
        'entity-broadcast-range-percentage': String(form.entityBroadcastRangePercentage),
        'max-chained-neighbor-updates': String(form.maxChainedNeighborUpdates),
        'max-world-size': String(form.maxWorldSize),
        'accepts-transfers': formatBoolean(form.acceptsTransfers),
        'bug-report-link': form.bugReportLink,
        debug: formatBoolean(form.debug),
        'enable-code-of-conduct': formatBoolean(form.enableCodeOfConduct),
        'enable-jmx-monitoring': formatBoolean(form.enableJmxMonitoring),
        'enable-query': formatBoolean(form.enableQuery),
        'enable-rcon': formatBoolean(form.enableRcon),
        'enable-status': formatBoolean(form.enableStatus),
        'initial-disabled-packs': form.initialDisabledPacks,
        'initial-enabled-packs': form.initialEnabledPacks,
        'log-ips': formatBoolean(form.logIps),
        'management-server-allowed-origins': form.managementServerAllowedOrigins,
        'management-server-enabled': formatBoolean(form.managementServerEnabled),
        'management-server-host': form.managementServerHost,
        'management-server-port': String(form.managementServerPort),
        'management-server-secret': form.managementServerSecret,
        'management-server-tls-enabled': formatBoolean(form.managementServerTlsEnabled),
        'management-server-tls-keystore': form.managementServerTlsKeystore,
        'management-server-tls-keystore-password': form.managementServerTlsKeystorePassword,
        'max-tick-time': String(form.maxTickTime),
        'network-compression-threshold': String(form.networkCompressionThreshold),
        'pause-when-empty-seconds': String(form.pauseWhenEmptySeconds),
        'player-idle-timeout': String(form.playerIdleTimeout),
        'prevent-proxy-connections': formatBoolean(form.preventProxyConnections),
        'query.port': String(form.queryPort),
        'rate-limit': String(form.rateLimit),
        'rcon.password': form.rconPassword,
        'rcon.port': String(form.rconPort),
        'region-file-compression': form.regionFileCompression,
        'server-ip': form.serverIp,
        'server-port': String(form.serverPort),
        'status-heartbeat-interval': String(form.statusHeartbeatInterval),
        'sync-chunk-writes': formatBoolean(form.syncChunkWrites),
        'text-filtering-config': form.textFilteringConfig,
        'text-filtering-version': String(form.textFilteringVersion),
    };
}

/** Only write keys that already exist in the file, so legacy keys are not injected into modern templates. */
export function filterUpdatesForExistingKeys(
    updates: Record<string, string>,
    existingKeys: Set<string>,
): Record<string, string> {
    return Object.fromEntries(Object.entries(updates).filter(([key]) => existingKeys.has(key)));
}

export function mergeProperties(original: string, updates: Record<string, string>): string {
    const lines = original.split(/\r?\n/);
    const handled = new Set<string>();

    const updatedLines = lines.map((line) => {
        if (!line || line.trim().startsWith('#')) {
            return line;
        }

        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) {
            return line;
        }

        const rawKey = line.slice(0, separatorIndex).trim();
        if (rawKey && updates[rawKey] !== undefined) {
            handled.add(rawKey);
            return `${rawKey}=${escapePropertyValue(updates[rawKey])}`;
        }

        return line;
    });

    const appended = Object.entries(updates)
        .filter(([key]) => !handled.has(key))
        .map(([key, value]) => `${key}=${escapePropertyValue(value)}`);

    return [...updatedLines, ...appended]
        .filter((line, index, array) => !(line === '' && index === array.length - 1))
        .join('\n');
}
