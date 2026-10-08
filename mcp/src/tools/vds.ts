import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const vdsId = z
  .union([z.string(), z.number()])
  .describe("VDS / VM instance ID");

export function registerVdsTools(server: McpServer): void {
  server.registerTool(
    "list_vds",
    {
      title: "List VDS instances",
      description: "List VDS/VM instances for the authenticated user.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/vm-instances",
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_details",
    {
      title: "Get VDS details",
      description: "Get details for a VDS/VM instance.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_status",
    {
      title: "Get VDS status",
      description: "Get power/status for a VDS/VM instance.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/status`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "vds_power_action",
    {
      title: "VDS power action",
      description: "Start, stop, or reboot a VDS/VM. Returns an async task_id.",
      inputSchema: {
        vds_id: vdsId,
        action: z.enum(["start", "stop", "reboot"]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ vds_id, action }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/power`,
          { action },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_backups",
    {
      title: "List VDS backups",
      description: "List backups for a VDS/VM instance.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/backups`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_vds_backup",
    {
      title: "Create VDS backup",
      description: "Create a backup of a VDS/VM instance.",
      inputSchema: {
        vds_id: vdsId,
        compress: z.boolean().optional(),
        mode: z.string().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ vds_id, compress, mode }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/backups`,
          { compress, mode },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_vds_backup",
    {
      title: "Delete VDS backup",
      description: "Delete a VDS backup by volid/storage.",
      inputSchema: {
        vds_id: vdsId,
        volid: z.string(),
        storage: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ vds_id, volid, storage }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/vm-instances/${vds_id}/backups`,
          { volid, storage },
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "restore_vds_backup",
    {
      title: "Restore VDS backup",
      description: "Restore a VDS from a backup volid/storage.",
      inputSchema: {
        vds_id: vdsId,
        volid: z.string(),
        storage: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ vds_id, volid, storage }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/backups/restore`,
          { volid, storage },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
