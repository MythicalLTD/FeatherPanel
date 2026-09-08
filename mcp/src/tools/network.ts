import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const serverId = z.string().describe("Server short UUID (uuidShort)");

export function registerNetworkTools(server: McpServer): void {
  server.registerTool(
    "get_server_firewall_rules",
    {
      title: "List firewall rules",
      description: "List firewall rules for a server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/firewall`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_firewall_rule",
    {
      title: "Create firewall rule",
      description: "Create a firewall rule on a server.",
      inputSchema: {
        server_id: serverId,
        remote_ip: z.string(),
        server_port: z.union([z.string(), z.number()]),
        type: z.string().describe("allow or deny (panel-specific)"),
        protocol: z.string().optional(),
        priority: z.number().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, ...body }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/firewall`,
          body,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_firewall_rule",
    {
      title: "Delete firewall rule",
      description: "Delete a firewall rule by ID.",
      inputSchema: {
        server_id: serverId,
        rule_id: z.union([z.string(), z.number()]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, rule_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/servers/${server_id}/firewall/${rule_id}`,
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "sync_firewall",
    {
      title: "Sync firewall",
      description: "Force-sync firewall rules to the node.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/firewall/sync`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_server_proxies",
    {
      title: "List proxies",
      description: "List reverse-proxy mappings for a server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/proxy`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_proxy",
    {
      title: "Create proxy",
      description: "Create a reverse-proxy domain mapping for a server port.",
      inputSchema: {
        server_id: serverId,
        domain: z.string(),
        port: z.union([z.string(), z.number()]),
        ssl: z.boolean().optional(),
        use_lets_encrypt: z.boolean().optional(),
        client_email: z.string().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, ...body }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/proxy/create`,
          body,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_proxy",
    {
      title: "Delete proxy",
      description: "Delete a reverse-proxy mapping by id or domain+port.",
      inputSchema: {
        server_id: serverId,
        id: z.union([z.string(), z.number()]).optional(),
        domain: z.string().optional(),
        port: z.union([z.string(), z.number()]).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, id, domain, port }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/proxy/delete`,
          { id, domain, port },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_subdomains",
    {
      title: "List subdomains",
      description: "List subdomains configured for a server.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/subdomains`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_subdomain",
    {
      title: "Create subdomain",
      description: "Create a subdomain for a server.",
      inputSchema: {
        server_id: serverId,
        domain_uuid: z.string(),
        subdomain: z.string(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, domain_uuid, subdomain }, extra) => {
      try {
        const data = await createClient(extra.sessionId).put(
          `/api/user/servers/${server_id}/subdomains`,
          { domain_uuid, subdomain },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_subdomain",
    {
      title: "Delete subdomain",
      description: "Delete a subdomain by UUID.",
      inputSchema: {
        server_id: serverId,
        subdomain_uuid: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, subdomain_uuid }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/servers/${server_id}/subdomains/${subdomain_uuid}`,
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
