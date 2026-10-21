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

    server.registerTool(
        'restore_backup',
        {
            title: 'Restore backup',
            description: 'Restore a server from a backup UUID.',
            inputSchema: {
                server_id: serverId,
                backup_uuid: z.string().describe('Backup UUID'),
            },
            annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        },
        async ({ server_id, backup_uuid }, extra) => {
            try {
                const data = await createClient(extra.sessionId).post(
                    `/api/user/servers/${server_id}/backups/${backup_uuid}/restore`,
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'lock_backup',
        {
            title: 'Lock backup',
            description: 'Lock a server backup so it cannot be deleted until unlocked.',
            inputSchema: {
                server_id: serverId,
                backup_uuid: z.string().describe('Backup UUID'),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ server_id, backup_uuid }, extra) => {
            try {
                const data = await createClient(extra.sessionId).post(
                    `/api/user/servers/${server_id}/backups/${backup_uuid}/lock`,
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'unlock_backup',
        {
            title: 'Unlock backup',
            description: 'Unlock a previously locked server backup.',
            inputSchema: {
                server_id: serverId,
                backup_uuid: z.string().describe('Backup UUID'),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ server_id, backup_uuid }, extra) => {
            try {
                const data = await createClient(extra.sessionId).post(
                    `/api/user/servers/${server_id}/backups/${backup_uuid}/unlock`,
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'get_backup_download',
        {
            title: 'Get backup download URL',
            description: 'Get a download URL for a server backup archive.',
            inputSchema: {
                server_id: serverId,
                backup_uuid: z.string().describe('Backup UUID'),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ server_id, backup_uuid }, extra) => {
            try {
                const data = await createClient(extra.sessionId).get(
                    `/api/user/servers/${server_id}/backups/${backup_uuid}/download`,
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'recover_backup',
        {
            title: 'Recover stalled backup',
            description:
                'Mark a stalled/incomplete backup as interrupted after confirming the Wings job stopped (confirm_interrupted: true).',
            inputSchema: {
                server_id: serverId,
                backup_uuid: z.string().describe('Backup UUID'),
                confirm_interrupted: z
                    .literal(true)
                    .describe('Must be true to confirm the backup job is no longer running'),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ server_id, backup_uuid, confirm_interrupted }, extra) => {
            try {
                const data = await createClient(extra.sessionId).post(
                    `/api/user/servers/${server_id}/backups/${backup_uuid}/recover`,
                    { confirm_interrupted },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );
}
