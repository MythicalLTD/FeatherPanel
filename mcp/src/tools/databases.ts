import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { createClient, toolError, toolText } from '../client.js';

const serverId = z.string().describe('Server short UUID (uuidShort)');

export function registerDatabaseTools(server: McpServer): void {
    server.registerTool(
        'get_databases',
        {
            title: 'List databases',
            description: 'List databases for a server (includes host metadata).',
            inputSchema: {
                server_id: serverId,
                page: z.number().int().positive().optional(),
                per_page: z.number().int().positive().optional(),
                search: z.string().optional(),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ server_id, page, per_page, search }, extra) => {
            try {
                const data = await createClient(extra.sessionId).get(
                    `/api/user/servers/${server_id}/databases`,
                    { page, per_page, search },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'get_database_credentials',
        {
            title: 'Get database credentials',
            description: 'Get details/credentials for a single database (password may be redacted without permission).',
            inputSchema: {
                server_id: serverId,
                database_id: z.union([z.string(), z.number()]).describe('Database ID'),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ server_id, database_id }, extra) => {
            try {
                const data = await createClient(extra.sessionId).get(
                    `/api/user/servers/${server_id}/databases/${database_id}`,
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'list_database_hosts',
        {
            title: 'List database hosts',
            description: 'List available database hosts for creating a database on a server.',
            inputSchema: {
                server_id: serverId,
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ server_id }, extra) => {
            try {
                const data = await createClient(extra.sessionId).get(
                    `/api/user/servers/${server_id}/databases/hosts`,
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'create_database',
        {
            title: 'Create database',
            description: 'Create a MySQL database for a server.',
            inputSchema: {
                server_id: serverId,
                database_host_id: z.union([z.string(), z.number()]),
                database_name: z.string().describe('Short name (panel prefixes with s{id}_)'),
                remote: z.string().optional().describe('Remote host allowlist, default %'),
                max_connections: z.number().int().optional(),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ server_id, database_host_id, database_name, remote, max_connections }, extra) => {
            try {
                const data = await createClient(extra.sessionId).post(
                    `/api/user/servers/${server_id}/databases`,
                    { database_host_id, database_name, remote, max_connections },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'update_database',
        {
            title: 'Update database',
            description: 'Update database remote host or max connections.',
            inputSchema: {
                server_id: serverId,
                database_id: z.union([z.string(), z.number()]),
                remote: z.string().optional(),
                max_connections: z.number().int().optional(),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ server_id, database_id, remote, max_connections }, extra) => {
            try {
                const data = await createClient(extra.sessionId).patch(
                    `/api/user/servers/${server_id}/databases/${database_id}`,
                    { remote, max_connections },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'delete_database',
        {
            title: 'Delete database',
            description: 'Delete a server database.',
            inputSchema: {
                server_id: serverId,
                database_id: z.union([z.string(), z.number()]),
            },
            annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        },
        async ({ server_id, database_id }, extra) => {
            try {
                const data = await createClient(extra.sessionId).delete(
                    `/api/user/servers/${server_id}/databases/${database_id}`,
                );
                return toolText(data ?? { success: true });
            } catch (error) {
                return toolError(error);
            }
        },
    );
}
