/**
 * Admin-area MCP tools. Registered only when the caller's API key has admin.*
 * permissions. Every call still hits the existing /api/admin/* PHP routes —
 * AdminMiddleware enforces the route permission. Non-admins never see these
 * tools in tools/list.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";
import {
  ADMIN_HTTP_METHODS,
  assertAdminApiPath,
  type AdminHttpMethod,
} from "./admin-common.js";
import { ADMIN_ROUTES } from "./admin-routes.generated.js";

const pageSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe("Page number (default 1)");
const limitSchema = z
  .number()
  .int()
  .positive()
  .max(100)
  .optional()
  .describe("Page size (default panel default, max 100)");
const searchSchema = z.string().optional().describe("Search query");

const jsonBodySchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe("JSON body object for write methods");

function queryFrom(args: {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}): Record<string, string | number | boolean | undefined | null> {
  const out: Record<string, string | number | boolean | undefined | null> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return out;
}

export function registerAdminTools(server: McpServer): void {
  server.registerTool(
    "admin_capabilities",
    {
      title: "Admin capabilities",
      description:
        "Return whether this API key has admin access, admin.root, and the list of admin.* permissions. Call first before other admin_* tools.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/session",
        );
        const session = data as {
          permissions?: string[];
          user?: Record<string, unknown>;
        };
        const permissions = Array.isArray(session.permissions)
          ? session.permissions.filter(
              (p): p is string =>
                typeof p === "string" &&
                (p === "admin.root" || p.startsWith("admin.")),
            )
          : [];
        return toolText({
          admin: permissions.length > 0,
          has_root: permissions.includes("admin.root"),
          admin_permissions: permissions,
          route_catalog_size: ADMIN_ROUTES.length,
          hint: "Use admin_list_routes to discover endpoints, then admin_api (or named admin_* tools) to call them. Panel AdminMiddleware still enforces each route permission.",
        });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_routes",
    {
      title: "List admin API routes",
      description:
        "Search the mirrored /api/admin/* route catalog (generated from backend/app/routes/admin). Use path templates with admin_api. Filter by domain (users, nodes, servers, settings, audit-log, node-alerts, …), HTTP method, or free-text search.",
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe("Match name, path, permission, or file (case-insensitive)"),
        domain: z
          .string()
          .optional()
          .describe(
            "Top path segment after /api/admin/, e.g. users, nodes, servers, settings, audit-log, node-alerts, webspaces, databases, roles",
          ),
        method: z
          .enum(ADMIN_HTTP_METHODS)
          .optional()
          .describe("Only routes that allow this HTTP method"),
        limit: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe("Max results (default 50, max 200)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ search, domain, method, limit }) => {
      const max = limit ?? 50;
      const q = search?.trim().toLowerCase();
      const dom = domain?.trim().toLowerCase();
      const meth = method?.toUpperCase();

      const matched = ADMIN_ROUTES.filter((route) => {
        if (dom) {
          const segment = route.path.replace(/^\/api\/admin\/?/, "").split("/")[0];
          if ((segment ?? "").toLowerCase() !== dom) {
            return false;
          }
        }
        if (meth && !route.methods.map((m) => m.toUpperCase()).includes(meth)) {
          return false;
        }
        if (!q) {
          return true;
        }
        const hay = `${route.name} ${route.path} ${route.permission ?? ""} ${route.file}`.toLowerCase();
        return hay.includes(q);
      });

      return toolText({
        total_catalog: ADMIN_ROUTES.length,
        matched: matched.length,
        showing: Math.min(matched.length, max),
        routes: matched.slice(0, max).map((route) => ({
          name: route.name,
          methods: route.methods,
          path: route.path,
          permission: route.permission,
          file: route.file,
        })),
      });
    },
  );

  server.registerTool(
    "admin_api",
    {
      title: "Call admin API",
      description:
        "Full admin coverage: call any mirrored panel admin REST endpoint under /api/admin/*. Prefer named admin_* tools for common CRUD; use this for everything else. Path must start with /api/admin/. Replace {id}/{uuid}/… path params yourself. Panel permission checks still apply (403 if the key lacks the route node).",
      inputSchema: {
        method: z
          .enum(ADMIN_HTTP_METHODS)
          .describe("HTTP method"),
        path: z
          .string()
          .describe(
            "Absolute admin path, e.g. /api/admin/users or /api/admin/nodes/3/diagnostics",
          ),
        query: z
          .record(
            z.string(),
            z.union([z.string(), z.number(), z.boolean(), z.null()]),
          )
          .optional()
          .describe("Query string parameters"),
        body: jsonBodySchema,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ method, path, query, body }, extra) => {
      try {
        const safePath = assertAdminApiPath(path);
        const client = createClient(extra.sessionId);
        const m = method.toUpperCase() as AdminHttpMethod;
        const data = await client.request(m, safePath, {
          query: query ?? undefined,
          body: body !== undefined && m !== "GET" ? body : undefined,
        });
        return toolText(data);
      } catch (error) {
        return toolError(error, { path });
      }
    },
  );

  // —— Named convenience tools (same backends as the panel admin UI) ——

  server.registerTool(
    "admin_dashboard",
    {
      title: "Admin dashboard",
      description: "GET /api/admin/dashboard — admin home stats.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get("/api/admin/dashboard"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_users",
    {
      title: "Admin list users",
      description: "List panel users (admin.users.list).",
      inputSchema: {
        page: pageSchema,
        limit: limitSchema,
        search: searchSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/users",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_get_user",
    {
      title: "Admin get user",
      description: "Get a user by UUID (admin.users.list).",
      inputSchema: {
        uuid: z.string().describe("User UUID"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ uuid }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(`/api/admin/users/${uuid}`),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_create_user",
    {
      title: "Admin create user",
      description: "Create a user (admin.users.create). Body matches the panel form.",
      inputSchema: { body: z.record(z.string(), z.unknown()) },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ body }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).post("/api/admin/users", body),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_update_user",
    {
      title: "Admin update user",
      description: "PATCH /api/admin/users/{uuid} (admin.users.edit).",
      inputSchema: {
        uuid: z.string(),
        body: z.record(z.string(), z.unknown()),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ uuid, body }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).patch(
            `/api/admin/users/${uuid}`,
            body,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_delete_user",
    {
      title: "Admin delete user",
      description: "DELETE /api/admin/users/{uuid} (admin.users.delete).",
      inputSchema: { uuid: z.string() },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ uuid }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).delete(
            `/api/admin/users/${uuid}`,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_roles",
    {
      title: "Admin list roles",
      description: "List roles (admin.roles.view).",
      inputSchema: { page: pageSchema, limit: limitSchema, search: searchSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/roles",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_get_role",
    {
      title: "Admin get role",
      description: "GET /api/admin/roles/{id}.",
      inputSchema: { id: z.union([z.string(), z.number()]) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(`/api/admin/roles/${id}`),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_update_role",
    {
      title: "Admin update role",
      description: "PATCH /api/admin/roles/{id} (admin.roles.edit).",
      inputSchema: {
        id: z.union([z.string(), z.number()]),
        body: z.record(z.string(), z.unknown()),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ id, body }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).patch(
            `/api/admin/roles/${id}`,
            body,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_nodes",
    {
      title: "Admin list Wings nodes",
      description: "List game/Wings nodes (admin.nodes.view).",
      inputSchema: { page: pageSchema, limit: limitSchema, search: searchSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/nodes",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_get_node",
    {
      title: "Admin get node",
      description: "GET /api/admin/nodes/{id} including diagnostics-related fields.",
      inputSchema: { id: z.union([z.string(), z.number()]) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(`/api/admin/nodes/${id}`),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_create_node",
    {
      title: "Admin create node",
      description: "POST /api/admin/nodes (admin.nodes.create).",
      inputSchema: { body: z.record(z.string(), z.unknown()) },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ body }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).post("/api/admin/nodes", body),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_update_node",
    {
      title: "Admin update node",
      description: "PATCH /api/admin/nodes/{id} (admin.nodes.edit).",
      inputSchema: {
        id: z.union([z.string(), z.number()]),
        body: z.record(z.string(), z.unknown()),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ id, body }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).patch(
            `/api/admin/nodes/${id}`,
            body,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_delete_node",
    {
      title: "Admin delete node",
      description: "DELETE /api/admin/nodes/{id} (admin.nodes.delete).",
      inputSchema: { id: z.union([z.string(), z.number()]) },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).delete(`/api/admin/nodes/${id}`),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_nodes_status_global",
    {
      title: "Admin global node status",
      description: "GET /api/admin/nodes/status/global — fleet status overview.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/nodes/status/global",
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_servers",
    {
      title: "Admin list servers",
      description: "List all game servers (admin.servers.view).",
      inputSchema: { page: pageSchema, limit: limitSchema, search: searchSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/servers",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_get_server",
    {
      title: "Admin get server",
      description: "GET /api/admin/servers/{idOrUuid}.",
      inputSchema: {
        id: z
          .union([z.string(), z.number()])
          .describe("Server id or uuid"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(`/api/admin/servers/${id}`),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_create_server",
    {
      title: "Admin create server",
      description: "POST /api/admin/servers (admin.servers.create).",
      inputSchema: { body: z.record(z.string(), z.unknown()) },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ body }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).post("/api/admin/servers", body),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_update_server",
    {
      title: "Admin update server",
      description: "PATCH /api/admin/servers/{id} (admin.servers.edit).",
      inputSchema: {
        id: z.union([z.string(), z.number()]),
        body: z.record(z.string(), z.unknown()),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ id, body }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).patch(
            `/api/admin/servers/${id}`,
            body,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_delete_server",
    {
      title: "Admin delete server",
      description: "DELETE /api/admin/servers/{id} (admin.servers.delete).",
      inputSchema: { id: z.union([z.string(), z.number()]) },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).delete(
            `/api/admin/servers/${id}`,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_get_settings",
    {
      title: "Admin get settings",
      description: "GET /api/admin/settings (admin.settings.view).",
      inputSchema: {
        category: z
          .string()
          .optional()
          .describe("Optional settings category filter if supported"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ category }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/settings",
            category ? { category } : undefined,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_update_settings",
    {
      title: "Admin update settings",
      description: "PATCH/PUT settings via /api/admin/settings (admin.settings.edit).",
      inputSchema: {
        body: z.record(z.string(), z.unknown()),
        method: z
          .enum(["PATCH", "PUT", "POST"])
          .optional()
          .describe("HTTP method (default PATCH)"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ body, method }, extra) => {
      try {
        const client = createClient(extra.sessionId);
        const m = (method ?? "PATCH").toUpperCase();
        if (m === "PUT") {
          return toolText(await client.put("/api/admin/settings", body));
        }
        if (m === "POST") {
          return toolText(await client.post("/api/admin/settings", body));
        }
        return toolText(await client.patch("/api/admin/settings", body));
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_databases",
    {
      title: "Admin list database hosts",
      description: "GET /api/admin/databases (admin.databases.view).",
      inputSchema: { page: pageSchema, limit: limitSchema, search: searchSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/databases",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_webspaces",
    {
      title: "Admin list webspaces",
      description: "GET /api/admin/webspaces.",
      inputSchema: { page: pageSchema, limit: limitSchema, search: searchSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/webspaces",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_locations",
    {
      title: "Admin list locations",
      description: "GET /api/admin/locations (admin.locations.view).",
      inputSchema: { page: pageSchema, limit: limitSchema, search: searchSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/locations",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_allocations",
    {
      title: "Admin list allocations",
      description: "GET /api/admin/allocations (admin.allocations.view).",
      inputSchema: {
        page: pageSchema,
        limit: limitSchema,
        search: searchSchema,
        node_id: z.union([z.string(), z.number()]).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/allocations",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_audit_log",
    {
      title: "Admin audit log",
      description:
        "Search the admin audit log (GET /api/admin/audit-log). Supports search/filters the UI uses.",
      inputSchema: {
        page: pageSchema,
        limit: limitSchema,
        search: searchSchema,
        action: z.string().optional(),
        actor: z.string().optional().describe("Actor user uuid or search"),
        target: z.string().optional(),
        from: z.string().optional().describe("ISO date/time from"),
        to: z.string().optional().describe("ISO date/time to"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/audit-log",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_node_alerts_overview",
    {
      title: "Admin node alerts overview",
      description: "GET /api/admin/node-alerts/overview — current alert state across nodes.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/node-alerts/overview",
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_node_alerts_history",
    {
      title: "Admin node alerts history",
      description: "GET /api/admin/node-alerts/history.",
      inputSchema: { page: pageSchema, limit: limitSchema, search: searchSchema },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            "/api/admin/node-alerts/history",
            queryFrom(args),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_node_alerts_settings",
    {
      title: "Admin node alerts settings",
      description: "GET or PUT /api/admin/node-alerts/settings (notification/email/webhook config).",
      inputSchema: {
        body: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("If set, PUT settings; otherwise GET"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ body }, extra) => {
      try {
        const client = createClient(extra.sessionId);
        if (body) {
          return toolText(
            await client.put("/api/admin/node-alerts/settings", body),
          );
        }
        return toolText(
          await client.get("/api/admin/node-alerts/settings"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_node_alerts_test",
    {
      title: "Admin test node alert channel",
      description: "POST /api/admin/node-alerts/test.",
      inputSchema: { body: z.record(z.string(), z.unknown()).optional() },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ body }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).post(
            "/api/admin/node-alerts/test",
            body ?? {},
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_health",
    {
      title: "Admin system health",
      description: "GET /api/admin/health — database, Redis, nodes, queues, disk.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get("/api/admin/health"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_user_sessions",
    {
      title: "Admin list user sessions",
      description: "GET /api/admin/users/{uuid}/sessions — sessions for one user.",
      inputSchema: {
        uuid: z.string().describe("User UUID"),
        page: pageSchema,
        limit: limitSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ uuid, page, limit }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get(
            `/api/admin/users/${uuid}/sessions`,
            queryFrom({ page, limit }),
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_revoke_user_sessions",
    {
      title: "Admin revoke user sessions",
      description: "POST /api/admin/users/{uuid}/sessions/revoke-all.",
      inputSchema: { uuid: z.string() },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ uuid }, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).post(
            `/api/admin/users/${uuid}/sessions/revoke-all`,
          ),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "admin_list_permissions",
    {
      title: "Admin list permission nodes",
      description: "GET /api/admin/permissions — all permission nodes for role editing.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        return toolText(
          await createClient(extra.sessionId).get("/api/admin/permissions"),
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
