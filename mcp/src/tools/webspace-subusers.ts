import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { registerWebspaceToolDefs, webspaceId } from "./webspace-common.js";

const subuserId = z
  .union([z.string(), z.number()])
  .describe("Webspace subuser ID");

export function registerWebspaceSubuserTools(server: McpServer): void {
  registerWebspaceToolDefs(server, [
    {
      name: "list_webspace_subusers",
      title: "List webspace subusers",
      description: "List subusers with access to this webspace.",
      method: "GET",
      suffix: "/users",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "create_webspace_subuser",
      title: "Create webspace subuser",
      description: "Invite/create a subuser for this webspace.",
      method: "POST",
      suffix: "/users",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "update_webspace_subuser",
      title: "Update webspace subuser",
      description: "Update subuser permissions.",
      method: "PUT",
      suffix: "/users/{subuser_id}",
      schema: { webspace_id: webspaceId, subuser_id: subuserId },
      withPayload: true,
    },
    {
      name: "delete_webspace_subuser",
      title: "Delete webspace subuser",
      description: "Remove a subuser from this webspace.",
      method: "DELETE",
      suffix: "/users/{subuser_id}",
      schema: { webspace_id: webspaceId, subuser_id: subuserId },
      destructive: true,
    },
  ]);
}
