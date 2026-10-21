import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const idParam = z.union([z.string(), z.number()]).describe("Resource ID");

export function registerAccountTools(server: McpServer): void {
  server.registerTool(
    "list_notifications",
    {
      title: "List notifications",
      description: "List panel notifications for the authenticated user.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/notifications",
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "dismiss_notification",
    {
      title: "Dismiss notification",
      description: "Dismiss a notification by ID.",
      inputSchema: { notification_id: idParam },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ notification_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/notifications/${notification_id}/dismiss`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_notification_inbox",
    {
      title: "List notification inbox",
      description: "List inbox messages for the authenticated user.",
      inputSchema: {
        page: z.number().int().positive().optional(),
        per_page: z.number().int().positive().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ page, per_page }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/notifications/inbox",
          { page, per_page },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "mark_notification_inbox_read",
    {
      title: "Mark inbox read",
      description: "Mark inbox messages as read.",
      inputSchema: {
        payload: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Inbox mark-read body (e.g. ids)"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ payload }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          "/api/user/notifications/inbox/read",
          payload,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_ssh_keys",
    {
      title: "List SSH keys",
      description: "List SSH public keys on the user account.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/ssh-keys",
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_ssh_key",
    {
      title: "Get SSH key",
      description: "Get a single SSH key by ID.",
      inputSchema: { ssh_key_id: idParam },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ ssh_key_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/ssh-keys/${ssh_key_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_ssh_key",
    {
      title: "Create SSH key",
      description: "Add an SSH public key to the account.",
      inputSchema: {
        payload: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("SSH key create body (name, public_key, etc.)"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ payload }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          "/api/user/ssh-keys",
          payload,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "update_ssh_key",
    {
      title: "Update SSH key",
      description: "Update an SSH key by ID.",
      inputSchema: {
        ssh_key_id: idParam,
        payload: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("SSH key update body"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ ssh_key_id, payload }, extra) => {
      try {
        const data = await createClient(extra.sessionId).put(
          `/api/user/ssh-keys/${ssh_key_id}`,
          payload,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_ssh_key",
    {
      title: "Delete SSH key",
      description: "Soft-delete an SSH key by ID.",
      inputSchema: { ssh_key_id: idParam },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ ssh_key_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/ssh-keys/${ssh_key_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_sessions",
    {
      title: "List sessions",
      description: "List active login sessions for the account.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/sessions",
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "revoke_session",
    {
      title: "Revoke session",
      description: "Revoke a session by ID.",
      inputSchema: { session_id: idParam },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ session_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/sessions/${session_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "revoke_other_sessions",
    {
      title: "Revoke other sessions",
      description: "Revoke all sessions except the current one.",
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          "/api/user/sessions/revoke-others",
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
