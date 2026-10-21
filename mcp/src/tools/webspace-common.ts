import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

export const webspaceId = z
  .string()
  .describe("Webspace short UUID (uuidShort)");

export const payload = z
  .record(z.string(), z.unknown())
  .optional()
  .describe("JSON request body (panel-specific fields)");

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type WebspaceToolDef = {
  name: string;
  title: string;
  description: string;
  method: HttpMethod;
  /** Full API path when the route is not under a specific webspace */
  globalPath?: string;
  /** Suffix after `/api/user/webspaces/{webspace_id}`; may include `{param}` placeholders */
  suffix?: string;
  schema: z.ZodRawShape;
  readOnly?: boolean;
  destructive?: boolean;
  /** Include optional `payload` in schema and send as JSON body */
  withPayload?: boolean;
  /** Argument keys forwarded as query string (GET) */
  queryKeys?: string[];
};

function resolvePath(suffix: string, args: Record<string, unknown>): string {
  return suffix.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = args[key];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

function pickQuery(
  args: Record<string, unknown>,
  keys: string[] | undefined,
): Record<string, string | number | boolean | undefined | null> | undefined {
  if (!keys?.length) {
    return undefined;
  }
  const query: Record<string, string | number | boolean | undefined | null> =
    {};
  for (const key of keys) {
    if (args[key] !== undefined) {
      query[key] = args[key] as string | number | boolean;
    }
  }
  return Object.keys(query).length > 0 ? query : undefined;
}

function pathParamNames(suffix: string | undefined): string[] {
  if (!suffix) {
    return [];
  }
  return [...suffix.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}

/** Body = `payload` when withPayload, else remaining args (not path/query/webspace_id). */
function pickBody(
  def: WebspaceToolDef,
  args: Record<string, unknown>,
): unknown {
  if (def.withPayload) {
    return args.payload;
  }
  if (def.method === "GET") {
    return undefined;
  }
  const reserved = new Set<string>([
    "webspace_id",
    "payload",
    ...pathParamNames(def.suffix),
    ...(def.queryKeys ?? []),
  ]);
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (reserved.has(key) || value === undefined) {
      continue;
    }
    body[key] = value;
  }
  return Object.keys(body).length > 0 ? body : undefined;
}

const pathParamSchema = z
  .union([z.string(), z.number()])
  .describe("Path parameter");

const queryParamSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .optional()
  .describe("Optional query parameter");

function buildInputSchema(def: WebspaceToolDef): z.ZodRawShape {
  // ZodRawShape values are $ZodType; keep a loose bag then cast once at return.
  const inputSchema: Record<string, unknown> = { ...def.schema };

  if (def.suffix) {
    for (const key of def.suffix.matchAll(/\{(\w+)\}/g)) {
      const name = key[1];
      if (!(name in inputSchema)) {
        inputSchema[name] = pathParamSchema.describe(name.replace(/_/g, " "));
      }
    }
  }

  for (const key of def.queryKeys ?? []) {
    if (!(key in inputSchema)) {
      inputSchema[key] = queryParamSchema.describe(key.replace(/_/g, " "));
    }
  }

  if (def.withPayload && !("payload" in inputSchema)) {
    inputSchema.payload = payload;
  }

  return inputSchema as z.ZodRawShape;
}

export function registerWebspaceToolDefs(
  server: McpServer,
  defs: WebspaceToolDef[],
): void {
  for (const def of defs) {
    const inputSchema = buildInputSchema(def);
    const description = def.withPayload
      ? `${def.description} Put API JSON body fields in \`payload\`.`
      : def.description;

    server.registerTool(
      def.name,
      {
        title: def.title,
        description,
        inputSchema,
        annotations: {
          readOnlyHint:
            def.readOnly ?? (def.method === "GET" && !def.destructive),
          destructiveHint: def.destructive ?? false,
          openWorldHint: false,
        },
      },
      async (args, extra) => {
        try {
          const record = args as Record<string, unknown>;
          const path = def.globalPath
            ? def.globalPath
            : (() => {
                const id = String(record.webspace_id ?? "");
                const suffix = resolvePath(def.suffix ?? "", record);
                return `/api/user/webspaces/${encodeURIComponent(id)}${suffix}`;
              })();
          const client = createClient(extra.sessionId);
          const query = pickQuery(record, def.queryKeys);
          const body = pickBody(def, record);

          let data: unknown;
          switch (def.method) {
            case "GET":
              data = await client.get(path, query);
              break;
            case "POST":
              data = await client.post(path, body, query);
              break;
            case "PUT":
              data = await client.put(path, body);
              break;
            case "PATCH":
              data = await client.patch(path, body);
              break;
            case "DELETE":
              data = await client.delete(path, body);
              break;
            default:
              throw new Error(`Unsupported method: ${def.method}`);
          }
          return toolText(data);
        } catch (error) {
          return toolError(error, { tool: def.name });
        }
      },
    );
  }
}

export const ws = (webspace_id: string, suffix: string): string =>
  `/api/user/webspaces/${webspace_id}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
