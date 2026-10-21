import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const ticketUuid = z.string().describe("Ticket UUID");

export function registerTicketTools(server: McpServer): void {
  server.registerTool(
    "list_ticket_categories",
    {
      title: "List ticket categories",
      description: "List support ticket categories (needed before create_ticket).",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get("/api/user/tickets/categories"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_ticket_priorities",
    {
      title: "List ticket priorities",
      description: "List support ticket priorities (needed before create_ticket).",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get("/api/user/tickets/priorities"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_ticket_statuses",
    {
      title: "List ticket statuses",
      description: "List support ticket status values.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get("/api/user/tickets/statuses"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_ticket_servers",
    {
      title: "List ticket-linkable servers",
      description: "List servers that can be attached to a support ticket.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get("/api/user/tickets/servers"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_tickets",
    {
      title: "List tickets",
      description: "List support tickets for the authenticated user.",
      inputSchema: {
        page: z.number().int().positive().optional(),
        per_page: z.number().int().positive().max(100).optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/tickets",
          args,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_ticket",
    {
      title: "Get ticket",
      description: "Get a support ticket by UUID.",
      inputSchema: { ticket_uuid: ticketUuid },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ ticket_uuid }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/tickets/${ticket_uuid}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_ticket",
    {
      title: "Create ticket",
      description:
        "Create a support ticket (title, description, category_id, priority_id; optional server_id).",
      inputSchema: {
        title: z.string(),
        description: z.string(),
        category_id: z.number().int().positive(),
        priority_id: z.number().int().positive(),
        server_id: z.number().int().positive().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (body, extra) => {
      try {
        const data = await createClient(extra.sessionId).request(
          "PUT",
          "/api/user/tickets",
          { body },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "reply_to_ticket",
    {
      title: "Reply to ticket",
      description: "Post a reply message on a support ticket.",
      inputSchema: {
        ticket_uuid: ticketUuid,
        message: z.string().describe("Reply body"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ ticket_uuid, message }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/tickets/${ticket_uuid}/reply`,
          { message },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_ticket_message",
    {
      title: "Delete ticket message",
      description: "Delete a message on a support ticket.",
      inputSchema: {
        ticket_uuid: ticketUuid,
        message_id: z.union([z.string(), z.number()]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ ticket_uuid, message_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/tickets/${ticket_uuid}/messages/${message_id}`,
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "close_ticket",
    {
      title: "Close ticket",
      description: "Close (delete) a support ticket owned by the user.",
      inputSchema: { ticket_uuid: ticketUuid },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ ticket_uuid }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/tickets/${ticket_uuid}`,
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
