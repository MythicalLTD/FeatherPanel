import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { createClient, toolError, toolText } from '../client.js';

const serverId = z.string().describe('Server short UUID (uuidShort)');

export function registerBackupTools(server: McpServer): void {
    server.registerTool(
        'get_server_backups',
        {
            title: 'List backups',
            description: 'List backups for a server.',
            inputSchema: {
                server_id: serverId,
                page: z.number().int().positive().optional(),
                per_page: z.number().int().positive().max(100).optional(),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ server_id, page, per_page }, extra) => {
            try {
                const data = await createClient(extra.sessionId).get(
                    `/api/user/servers/${server_id}/backups`,
                    { page, per_page },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'create_backup',
        {
            title: 'Create backup',
            description: 'Create a new backup for a server.',
            inputSchema: {
                server_id: serverId,
                name: z.string().optional().describe('Backup name'),
                ignore: z.string().optional().describe('Ignore patterns'),
                type: z.string().optional().describe('Backup type (e.g. files, full)'),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ server_id, name, ignore, type }, extra) => {
            try {
                const data = await createClient(extra.sessionId).post(
                    `/api/user/servers/${server_id}/backups`,
                    { name, ignore, type },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'delete_backup',
        {
            title: 'Delete backup',
            description: 'Delete a server backup by UUID.',
            inputSchema: {
                server_id: serverId,
                backup_uuid: z.string().describe('Backup UUID'),
            },
            annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        },
        async ({ server_id, backup_uuid }, extra) => {
            try {
                const data = await createClient(extra.sessionId).delete(
                    `/api/user/servers/${server_id}/backups/${backup_uuid}`,
                );
                return toolText(data ?? { success: true });
            } catch (error) {
                return toolError(error);
            }
        },
    );
}
