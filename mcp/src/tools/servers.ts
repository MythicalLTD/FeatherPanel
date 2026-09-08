import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const serverId = z
  .string()
  .describe("Server short UUID (uuidShort), e.g. a1b2c3d4");

export function registerServerTools(server: McpServer): void {
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

  server.registerTool(
    "list_servers",
    {
      title: "List servers",
      description: "List game servers visible to the authenticated user.",
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
}
