import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const serverId = z.string().describe("Server short UUID (uuidShort)");

export function registerConsoleTools(server: McpServer): void {
  server.registerTool(
    "send_console_command",
    {
      title: "Send console command",
      description:
        "Send a command to the server console (like typing in the panel console).",
      inputSchema: {
        server_id: serverId,
        command: z.string().describe("Console command to send"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, command }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/command`,
          { command },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_console_websocket",
    {
      title: "Get console WebSocket credentials",
      description:
        "Issue a short-lived JWT and Wings WebSocket connection string for live console/stats. Does not stream logs by itself.",
      inputSchema: {
        server_id: serverId,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/jwt`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_server_logs",
    {
      title: "Get server logs",
      description:
        "Fetch recent console/log output. If the container already exited, expect a clear offline/crash message — then inspect install logs or fix the jar; do not blame the node.",
      inputSchema: {
        server_id: serverId,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/logs`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, { tool: "get_server_logs", server_id });
      }
    },
  );

  server.registerTool(
    "get_install_logs",
    {
      title: "Get install logs",
      description:
        "Fetch server install/reinstall logs. Use when start crashes or server.jar looks corrupt (e.g. Paper v2 API sunset leaving a JSON error as the jar).",
      inputSchema: {
        server_id: serverId,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/install-logs`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, { tool: "get_install_logs", server_id });
      }
    },
  );

  server.registerTool(
    "get_server_players",
    {
      title: "Get online players",
      description: "Get live player status for game servers that support it.",
      inputSchema: {
        server_id: serverId,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/players`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
