import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const serverId = z.string().describe("Server short UUID (uuidShort)");

export function registerAllocationTools(server: McpServer): void {
  server.registerTool(
    "get_server_allocations",
    {
      title: "List allocations",
      description: "List IP:port allocations assigned to a server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/allocations`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_available_allocations",
    {
      title: "List available allocations",
      description: "List allocations available to assign to this server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/allocations/available`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "auto_allocate",
    {
      title: "Auto allocate",
      description:
        "Automatically assign an allocation, or a specific allocation_id if provided.",
      inputSchema: {
        server_id: serverId,
        allocation_id: z.union([z.string(), z.number()]).optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, allocation_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/allocations/auto`,
          allocation_id !== undefined ? { allocation_id } : {},
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "set_primary_allocation",
    {
      title: "Set primary allocation",
      description: "Mark an allocation as the primary IP:port for the server.",
      inputSchema: {
        server_id: serverId,
        allocation_id: z.union([z.string(), z.number()]),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, allocation_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/allocations/${allocation_id}/primary`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_allocation",
    {
      title: "Delete allocation",
      description: "Remove an allocation from the server.",
      inputSchema: {
        server_id: serverId,
        allocation_id: z.union([z.string(), z.number()]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, allocation_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/servers/${server_id}/allocations/${allocation_id}`,
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
