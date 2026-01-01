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

import axios from 'axios';

export interface ActionCommand {
    type: 'server_power' | 'server_command' | 'navigate';
    action?: 'start' | 'stop' | 'restart' | 'kill';
    serverUuid?: string;
    serverName?: string;
    command?: string;
    url?: string;
    path?: string; // For file paths
    file?: string; // For file editing
    readonly?: boolean; // For file editor readonly mode
}

/**
 * Parse AI response for action commands
 * Supports formats like:
 * - "ACTION: start server abc123"
 * - "ACTION: stop server My Server"
 * - "ACTION: restart server abc123"
 * - "ACTION: navigate /server/abc123"
 * - "ACTION: navigate /server/abc123/files?path=/plugins"
 * - "ACTION: navigate /server/abc123/files/edit?file=config.yml&path=/plugins/bStats&readonly=false"
 * - "ACTION: navigate server My Server to files"
 * - "ACTION: navigate server abc123 to console"
 */
export function parseActionCommands(text: string): ActionCommand[] {
    const commands: ActionCommand[] = [];

    // Pattern 1: Simple navigate with full URL
    const navigateUrlRegex = /ACTION:\s*navigate\s+(\/server\/[^\s\n]+)/gi;
    let match;

    while ((match = navigateUrlRegex.exec(text)) !== null) {
        if (!match[1]) continue;
        const url = match[1].trim();

        // Parse query parameters if present
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.searchParams.get('path') || undefined;
        const file = urlObj.searchParams.get('file') || undefined;
        const readonly = urlObj.searchParams.get('readonly') === 'true' || undefined;

        commands.push({
            type: 'navigate',
            url: urlObj.pathname + urlObj.search,
            path,
            file,
            readonly,
        });
    }

    // Pattern 2: Navigate with server name/UUID and page
    const navigateServerRegex =
        /ACTION:\s*navigate\s+server\s+([^\s]+)\s+to\s+(\w+)(?:\s+path\s+([^\s\n]+))?(?:\s+file\s+([^\s\n]+))?(?:\s+readonly\s+(true|false))?/gi;

    while ((match = navigateServerRegex.exec(text)) !== null) {
        if (!match[1] || !match[2]) continue;
        const serverIdentifier = match[1].trim();
        const page = match[2].trim().toLowerCase();
        const path = match[3]?.trim() || undefined;
        const file = match[4]?.trim() || undefined;
        const readonly = match[5] === 'true' || undefined;

        // Map page names to URLs
        const pageMap: Record<string, string> = {
            console: '',
            logs: '/logs',
            activities: '/activities',
            files: '/files',
            databases: '/databases',
            schedules: '/schedules',
            users: '/users',
            backups: '/backups',
            allocations: '/allocations',
            subdomains: '/subdomains',
            startup: '/startup',
            settings: '/settings',
        };

        const pagePath = pageMap[page] || '';
        let url = '';

        if (page === 'files' && file) {
            // File editor
            url = `/server/${serverIdentifier}/files/edit`;
            const params = new URLSearchParams();
            if (file) params.set('file', file);
            if (path) params.set('path', path);
            if (readonly !== undefined) params.set('readonly', String(readonly));
            url += '?' + params.toString();
        } else if (page === 'files' && path) {
            // Files with path
            url = `/server/${serverIdentifier}/files?path=${encodeURIComponent(path)}`;
        } else {
            // Regular page
            url = `/server/${serverIdentifier}${pagePath}`;
        }

        // Check if serverIdentifier is a UUID (full or short)
        const isUuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$|^[a-z0-9]{8}$/i.test(serverIdentifier);

        commands.push({
            type: 'navigate',
            url,
            serverName: isUuid ? undefined : serverIdentifier,
            serverUuid: isUuid ? serverIdentifier : undefined,
            path,
            file,
            readonly,
        });
    }

    // Pattern 3: Server power actions
    const actionRegex = /ACTION:\s*(start|stop|restart|kill)\s+server\s+([^\n]+)/gi;

    while ((match = actionRegex.exec(text)) !== null) {
        if (!match[1] || !match[2]) continue;
        const action = match[1].toLowerCase();
        const target = match[2].trim();

        if (['start', 'stop', 'restart', 'kill'].includes(action)) {
            // Try to extract server UUID or name
            const uuidMatch = target.match(/([a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}|[a-z0-9]{8})/i);
            const serverUuid = uuidMatch ? uuidMatch[1] : undefined;
            const serverName = !serverUuid ? target : undefined;

            commands.push({
                type: 'server_power',
                action: action as 'start' | 'stop' | 'restart' | 'kill',
                serverUuid,
                serverName,
            });
        }
    }

    // Pattern 4: Server command execution
    const commandRegex =
        /ACTION:\s*send\s+command\s+to\s+server\s+([^\s]+)\s+command\s+"([^"]+)"|ACTION:\s*send\s+command\s+to\s+server\s+([^\s]+)\s+command\s+([^\n]+)/gi;

    while ((match = commandRegex.exec(text)) !== null) {
        const serverIdentifier = (match[1] || match[3])?.trim();
        const commandText = (match[2] || match[4])?.trim();

        if (serverIdentifier && commandText) {
            const isUuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$|^[a-z0-9]{8}$/i.test(serverIdentifier);

            commands.push({
                type: 'server_command',
                serverUuid: isUuid ? serverIdentifier : undefined,
                serverName: isUuid ? undefined : serverIdentifier,
                command: commandText,
            });
        }
    }

    return commands;
}

/**
 * Execute a server power action
 */
export async function executeServerPowerAction(
    action: 'start' | 'stop' | 'restart' | 'kill',
    serverUuid: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await axios.post(`/api/user/servers/${serverUuid}/power/${action}`);
        if (response.data.success) {
            return {
                success: true,
                message: `Server ${action} command sent successfully`,
            };
        }
        return {
            success: false,
            message: response.data.message || `Failed to ${action} server`,
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.message || error.message || `Failed to ${action} server`;
            return {
                success: false,
                message: errorMessage,
            };
        }
        return {
            success: false,
            message: `Failed to ${action} server: ${String(error)}`,
        };
    }
}

/**
 * Execute a server command
 */
export async function executeServerCommand(
    serverUuid: string,
    command: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await axios.post(`/api/user/servers/${serverUuid}/command`, {
            command: command,
        });
        if (response.data.success) {
            return {
                success: true,
                message: `Command sent successfully: ${command}`,
            };
        }
        return {
            success: false,
            message: response.data.message || 'Failed to send command',
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to send command';
            return {
                success: false,
                message: errorMessage,
            };
        }
        return {
            success: false,
            message: `Failed to send command: ${String(error)}`,
        };
    }
}

/**
 * Find server UUID by name
 */
export async function findServerUuidByName(serverName: string): Promise<string | null> {
    try {
        const response = await axios.get('/api/user/servers', {
            params: { limit: 100, search: serverName },
        });
        if (response.data?.success && response.data?.data?.servers) {
            const servers = response.data.data.servers as Array<{ name: string; uuidShort?: string }>;
            if (!servers || servers.length === 0) {
                return null;
            }
            // Try exact match first
            const exactMatch = servers.find((s) => s.name.toLowerCase() === serverName.toLowerCase());
            if (exactMatch?.uuidShort) {
                return exactMatch.uuidShort;
            }
            // Try partial match
            const partialMatch = servers.find((s) => s.name.toLowerCase().includes(serverName.toLowerCase()));
            if (partialMatch?.uuidShort) {
                return partialMatch.uuidShort;
            }
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Find server name by UUID
 */
export async function findServerNameByUuid(serverUuid: string): Promise<string | null> {
    try {
        const response = await axios.get('/api/user/servers', {
            params: { limit: 100 },
        });
        if (response.data?.success && response.data?.data?.servers) {
            const servers = response.data.data.servers as Array<{ name: string; uuidShort?: string }>;
            const server = servers.find((s) => s.uuidShort === serverUuid);
            return server?.name || null;
        }
        return null;
    } catch {
        return null;
    }
}
