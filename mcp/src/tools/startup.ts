import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const serverId = z.string().describe("Server short UUID (uuidShort)");

/** Spell docker_images may be a string[], a label→image map, or a JSON string. */
function normalizeDockerImages(raw: unknown): string[] {
  let value = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [trimmed];
    }
  }
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  }
  return [];
}

export function registerStartupTools(server: McpServer): void {
  server.registerTool(
    "get_server_startup",
    {
      title: "Get startup config",
      description:
        "Get startup command, current Docker image (Java runtime for MC eggs), allowed docker_images from the spell (pick only from this list unless the panel allows custom images), spell info, and egg variables (respect user_editable). Use this before changing Java version / image / name.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = (await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}`,
        )) as Record<string, unknown>;
        const spell =
          data.spell && typeof data.spell === "object"
            ? (data.spell as Record<string, unknown>)
            : null;
        const dockerImages = normalizeDockerImages(spell?.docker_images);
        const variables = Array.isArray(data.variables) ? data.variables : [];
        const focused = {
          name: data.name,
          description: data.description,
          uuid: data.uuid,
          uuidShort: data.uuidShort ?? data.uuid_short,
          startup: data.startup,
          image: data.image,
          spell_id: data.spell_id ?? data.egg_id,
          spell: spell
            ? {
                id: spell.id,
                name: spell.name,
                description: spell.description,
                default_docker_image: spell.default_docker_image,
                docker_images: dockerImages,
                features: spell.features,
              }
            : null,
          /** Allowed Docker/Java images for update_server.image — API rejects others unless admin enabled custom images. */
          allowed_docker_images: dockerImages,
          variables,
          editable_variables: variables.filter(
            (v) =>
              v &&
              typeof v === "object" &&
              (v as { user_editable?: unknown }).user_editable,
          ),
          custom_variables: data.custom_variables,
          subuser_permissions: data.subuser_permissions,
          notes:
            "To change Java version, set image to one of allowed_docker_images via update_server (e.g. ghcr.io/pterodactyl/yolks:java_21). Name/description via update_server.name. Startup/image/spell changes require the matching API permissions and admin settings; invalid images return INVALID_DOCKER_IMAGE.",
        };
        return toolText(focused);
      } catch (error) {
        return toolError(error, { tool: "get_server_startup", server_id });
      }
    },
  );

  server.registerTool(
    "update_server",
    {
      title: "Update server settings",
      description:
        "Update server name, description, startup command, Docker image (Java runtime), spell, and/or spell variables. image MUST be from get_server_startup.allowed_docker_images unless the panel allows custom images (API enforces this). Only editable variables may be changed. Subuser permissions and admin flags (startup change / custom docker image) apply — failures return clear API errors, not silent ignores.",
      inputSchema: {
        server_id: serverId,
        name: z.string().optional().describe("Display name of the server"),
        description: z.string().optional(),
        startup: z
          .string()
          .optional()
          .describe(
            "Startup command (may be disabled by admin SERVER_ALLOW_STARTUP_CHANGE)",
          ),
        image: z
          .string()
          .optional()
          .describe(
            "Docker image / Java yolk, e.g. ghcr.io/pterodactyl/yolks:java_21 — must be in allowed_docker_images",
          ),
        spell_id: z.union([z.string(), z.number()]).optional(),
        wipe_files: z
          .boolean()
          .optional()
          .describe("Wipe files when changing spell"),
        variables: z
          .array(
            z.object({
              variable_id: z.union([z.string(), z.number()]),
              variable_value: z.string(),
            }),
          )
          .optional()
          .describe("Only variables with user_editable=true"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        const { server_id, ...body } = args;
        const data = await createClient(extra.sessionId).put(
          `/api/user/servers/${server_id}`,
          body,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "update_server",
          server_id: args.server_id,
        });
      }
    },
  );

  server.registerTool(
    "reinstall_server",
    {
      title: "Reinstall server",
      description: "Trigger a server reinstall. Optionally wipe files first.",
      inputSchema: {
        server_id: serverId,
        wipe_files: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, wipe_files }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/reinstall`,
          { wipe_files },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "wipe_server_files",
    {
      title: "Wipe all server files",
      description: "Delete all files on the server filesystem. Destructive.",
      inputSchema: { server_id: serverId },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/wipe-all-files`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "abort_server_install",
    {
      title: "Abort install",
      description: "Abort an in-progress server install/reinstall.",
      inputSchema: { server_id: serverId },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/install/abort`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
