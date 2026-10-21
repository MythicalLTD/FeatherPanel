import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const serverId = z
  .string()
  .describe("Server short UUID (uuidShort), e.g. a1b2c3d4");

export function registerWhoamiTool(server: McpServer): void {
  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "Return the authenticated FeatherPanel user session (profile and permissions).",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/session",
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

export function registerGameServerTools(server: McpServer): void {
  server.registerTool(
    "list_servers",
    {
      title: "List servers",
      description:
        "List game servers visible to the authenticated user. Call this first when the user names a server (e.g. dasdas) — match name → uuidShort, then use that server_id on all other tools. Do not refuse or give manual steps; use this tool.",
      inputSchema: {
        page: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Page number (default 1)"),
        limit: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Page size (default 10, max 100)"),
        search: z.string().optional().describe("Search query"),
        status: z.string().optional().describe("Filter by status"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ page, limit, search, status }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/servers",
          {
            page,
            limit,
            search,
            status,
          },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_server_details",
    {
      title: "Get server details",
      description: "Get full details for a server by short UUID.",
      inputSchema: {
        server_id: serverId,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_server_status",
    {
      title: "Get server status",
      description:
        "Get server details including panel lifecycle/install status. Live CPU/RAM is not exposed via REST; use details for configuration and status fields.",
      inputSchema: {
        server_id: serverId,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_server_activities",
    {
      title: "Get server activities",
      description: "List recent activity entries for a server.",
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
          `/api/user/servers/${server_id}/activities`,
          { page, per_page },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "server_power_action",
    {
      title: "Server power action",
      description:
        "Start, stop, restart, or kill a game server. A successful start only means Wings accepted the action — if the process crashes (e.g. missing/corrupt jar), the server will go offline again; then check console logs or reinstall.",
      inputSchema: {
        server_id: serverId,
        action: z
          .enum(["start", "stop", "restart", "kill"])
          .describe("Power action to perform"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, action }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/power/${action}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "server_power_action",
          server_id,
          action,
        });
      }
    },
  );

  server.registerTool(
    "get_server_resources",
    {
      title: "Get server resources",
      description: "Get live CPU/RAM/disk resource usage for a game server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/resources`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_server_resource_history",
    {
      title: "Get server resource history",
      description: "Get recent CPU/RAM/disk sample history for a game server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/resource-history`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_server_trash",
    {
      title: "List server file trash",
      description: "List files in the server file trash bin.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/trash`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "restore_server_trash",
    {
      title: "Restore server trash files",
      description: "Restore files from the server trash bin by trash entry IDs.",
      inputSchema: {
        server_id: serverId,
        ids: z.array(z.string()).min(1),
        overwrite: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, ids, overwrite }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/trash/restore`,
          { ids, overwrite },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_server_trash_entries",
    {
      title: "Delete server trash entries",
      description: "Permanently delete selected entries from the server trash bin.",
      inputSchema: {
        server_id: serverId,
        ids: z.array(z.string()).min(1),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ server_id, ids }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/trash/delete`,
          { ids },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "empty_server_trash",
    {
      title: "Empty server trash",
      description: "Permanently empty the entire server file trash bin.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/trash/empty`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_server_fastdl",
    {
      title: "Get FastDL config",
      description: "Get FastDL configuration for a game server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/fastdl`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "enable_server_fastdl",
    {
      title: "Enable FastDL",
      description: "Enable FastDL for a game server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/fastdl/enable`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "disable_server_fastdl",
    {
      title: "Disable FastDL",
      description: "Disable FastDL for a game server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/fastdl/disable`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

/** @deprecated Use registerWhoamiTool + registerGameServerTools */
export function registerServerTools(server: McpServer): void {
  registerWhoamiTool(server);
  registerGameServerTools(server);
}
