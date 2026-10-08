import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const serverId = z.string().describe("Server short UUID (uuidShort)");

export function registerSubuserTools(server: McpServer): void {
  server.registerTool(
    "get_server_subusers",
    {
      title: "List subusers",
      description: "List subusers with access to a server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/subusers`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_subuser_permissions",
    {
      title: "List subuser permission nodes",
      description:
        "List available permission nodes that can be granted to subusers.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/subusers/permissions`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_subuser",
    {
      title: "Create subuser",
      description:
        "Invite a subuser by email. Set permissions afterward with update_subuser.",
      inputSchema: {
        server_id: serverId,
        email: z.string().email(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, email }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/subusers`,
          { email },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "update_subuser",
    {
      title: "Update subuser permissions",
      description: "Update the permission list for a subuser.",
      inputSchema: {
        server_id: serverId,
        subuser_id: z.union([z.string(), z.number()]),
        permissions: z.array(z.string()),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, subuser_id, permissions }, extra) => {
      try {
        const data = await createClient(extra.sessionId).patch(
          `/api/user/servers/${server_id}/subusers/${subuser_id}`,
          { permissions },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_subuser",
    {
      title: "Delete subuser",
      description: "Remove a subuser from the server.",
      inputSchema: {
        server_id: serverId,
        subuser_id: z.union([z.string(), z.number()]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, subuser_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/servers/${server_id}/subusers/${subuser_id}`,
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
