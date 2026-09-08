import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

export function registerKnowledgebaseTools(server: McpServer): void {
  server.registerTool(
    "search_knowledgebase",
    {
      title: "Search knowledgebase",
      description: "Search FeatherPanel knowledgebase articles.",
      inputSchema: {
        search: z.string().optional(),
        page: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
        category_id: z.union([z.string(), z.number()]).optional(),
        status: z.string().optional(),
        pinned: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/knowledgebase/articles",
          args,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_knowledgebase_article",
    {
      title: "Get knowledgebase article",
      description: "Get a knowledgebase article by ID.",
      inputSchema: {
        article_id: z.union([z.string(), z.number()]),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ article_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/knowledgebase/articles/${article_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_knowledgebase_categories",
    {
      title: "List knowledgebase categories",
      description: "List knowledgebase categories.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/knowledgebase/categories",
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
