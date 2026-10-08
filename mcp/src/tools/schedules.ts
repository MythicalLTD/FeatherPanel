import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { createClient, toolError, toolText } from '../client.js';

const serverId = z.string().describe('Server short UUID (uuidShort)');

export function registerScheduleTools(server: McpServer): void {
    server.registerTool(
        'get_server_schedules',
        {
            title: 'List schedules',
            description: 'List schedules for a server.',
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
                    `/api/user/servers/${server_id}/schedules`,
                    { page, per_page, search },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'create_schedule',
        {
            title: 'Create schedule',
            description: 'Create a cron schedule for a server.',
            inputSchema: {
                server_id: serverId,
                name: z.string(),
                cron_minute: z.string(),
                cron_hour: z.string(),
                cron_day_of_month: z.string(),
                cron_month: z.string(),
                cron_day_of_week: z.string(),
                timezone: z.string().optional(),
                is_active: z.boolean().optional(),
                only_when_online: z.boolean().optional(),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async (args, extra) => {
            try {
                const { server_id, ...body } = args;
                const data = await createClient(extra.sessionId).post(
                    `/api/user/servers/${server_id}/schedules`,
                    body,
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'update_schedule',
        {
            title: 'Update schedule',
            description: 'Update an existing server schedule.',
            inputSchema: {
                server_id: serverId,
                schedule_id: z.union([z.string(), z.number()]),
                name: z.string().optional(),
                cron_minute: z.string().optional(),
                cron_hour: z.string().optional(),
                cron_day_of_month: z.string().optional(),
                cron_month: z.string().optional(),
                cron_day_of_week: z.string().optional(),
                timezone: z.string().optional(),
                is_active: z.boolean().optional(),
                only_when_online: z.boolean().optional(),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async (args, extra) => {
            try {
                const { server_id, schedule_id, ...body } = args;
                const data = await createClient(extra.sessionId).put(
                    `/api/user/servers/${server_id}/schedules/${schedule_id}`,
                    body,
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'delete_schedule',
        {
            title: 'Delete schedule',
            description: 'Delete a server schedule.',
            inputSchema: {
                server_id: serverId,
                schedule_id: z.union([z.string(), z.number()]),
            },
            annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        },
        async ({ server_id, schedule_id }, extra) => {
            try {
                const data = await createClient(extra.sessionId).delete(
                    `/api/user/servers/${server_id}/schedules/${schedule_id}`,
                );
                return toolText(data ?? { success: true });
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'get_schedule_tasks',
        {
            title: 'List schedule tasks',
            description: 'List tasks belonging to a schedule.',
            inputSchema: {
                server_id: serverId,
                schedule_id: z.union([z.string(), z.number()]),
                page: z.number().int().positive().optional(),
                per_page: z.number().int().positive().optional(),
            },
            annotations: { readOnlyHint: true, openWorldHint: false },
        },
        async ({ server_id, schedule_id, page, per_page }, extra) => {
            try {
                const data = await createClient(extra.sessionId).get(
                    `/api/user/servers/${server_id}/schedules/${schedule_id}/tasks`,
                    { page, per_page },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'create_task',
        {
            title: 'Create schedule task',
            description:
                'Create a task on a schedule. Actions include power, backup, command, restart, kill, start, stop, etc.',
            inputSchema: {
                server_id: serverId,
                schedule_id: z.union([z.string(), z.number()]),
                action: z.string().describe('Task action type'),
                payload: z.string().optional().describe('Required for power/command actions'),
                time_offset: z.number().optional(),
                continue_on_failure: z.boolean().optional(),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ server_id, schedule_id, action, payload, time_offset, continue_on_failure }, extra) => {
            try {
                const data = await createClient(extra.sessionId).post(
                    `/api/user/servers/${server_id}/schedules/${schedule_id}/tasks`,
                    { action, payload, time_offset, continue_on_failure },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'update_task',
        {
            title: 'Update schedule task',
            description: 'Update a task on a schedule.',
            inputSchema: {
                server_id: serverId,
                schedule_id: z.union([z.string(), z.number()]),
                task_id: z.union([z.string(), z.number()]),
                action: z.string().optional(),
                payload: z.string().optional(),
                time_offset: z.number().optional(),
                continue_on_failure: z.boolean().optional(),
            },
            annotations: { readOnlyHint: false, openWorldHint: false },
        },
        async ({ server_id, schedule_id, task_id, action, payload, time_offset, continue_on_failure }, extra) => {
            try {
                const data = await createClient(extra.sessionId).put(
                    `/api/user/servers/${server_id}/schedules/${schedule_id}/tasks/${task_id}`,
                    { action, payload, time_offset, continue_on_failure },
                );
                return toolText(data);
            } catch (error) {
                return toolError(error);
            }
        },
    );

    server.registerTool(
        'delete_task',
        {
            title: 'Delete schedule task',
            description: 'Delete a task from a schedule.',
            inputSchema: {
                server_id: serverId,
                schedule_id: z.union([z.string(), z.number()]),
                task_id: z.union([z.string(), z.number()]),
            },
            annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        },
        async ({ server_id, schedule_id, task_id }, extra) => {
            try {
                const data = await createClient(extra.sessionId).delete(
                    `/api/user/servers/${server_id}/schedules/${schedule_id}/tasks/${task_id}`,
                );
                return toolText(data ?? { success: true });
            } catch (error) {
                return toolError(error);
            }
        },
    );
}
