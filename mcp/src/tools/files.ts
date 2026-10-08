import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";
import { normalizeServerPath } from "../paths.js";

const serverId = z.string().describe("Server short UUID (uuidShort)");

const PATH_HINT =
  "Panel path is relative to the server volume root. Use / for root (e.g. /server.jar). NEVER use /home/container — that is only inside Docker and creates literal home/container folders on the volume.";

export function registerFileTools(server: McpServer): void {
  server.registerTool(
    "get_files",
    {
      title: "List files",
      description: `List files and directories on a server. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        path: z
          .string()
          .optional()
          .describe(`Directory path (default /). ${PATH_HINT}`),
        search: z.string().optional().describe("Optional filename search"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id, path, search }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/files`,
          {
            path: normalizeServerPath(path ?? "/"),
            search,
          },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "get_files",
          server_id,
          path: path ?? "/",
        });
      }
    },
  );

  server.registerTool(
    "get_file_content",
    {
      title: "Read file",
      description: `Read the contents of a text file on a server. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        path: z
          .string()
          .describe(`File path, e.g. /server.properties. ${PATH_HINT}`),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ server_id, path }, extra) => {
      try {
        const data = await createClient(extra.sessionId).getRaw(
          `/api/user/servers/${server_id}/file`,
          {
            path: normalizeServerPath(path),
          },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, { tool: "get_file_content", server_id, path });
      }
    },
  );

  server.registerTool(
    "write_file",
    {
      title: "Write file",
      description: `Write or overwrite a file on a server (raw text body). ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        path: z
          .string()
          .describe(`File path to write, e.g. /eula.txt. ${PATH_HINT}`),
        content: z.string().describe("File contents"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, path, content }, extra) => {
      try {
        const normalized = normalizeServerPath(path);
        const data = await createClient(extra.sessionId).postRaw(
          `/api/user/servers/${server_id}/write-file`,
          content,
          { path: normalized },
        );
        return toolText(data ?? { success: true, path: normalized });
      } catch (error) {
        return toolError(error, { tool: "write_file", server_id, path });
      }
    },
  );

  server.registerTool(
    "create_directory",
    {
      title: "Create directory",
      description: `Create a directory on a server. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        path: z
          .string()
          .describe(`Parent directory (use / for root). ${PATH_HINT}`),
        name: z.string().describe("New directory name"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, path, name }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/create-directory`,
          { path: normalizeServerPath(path), name },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, { tool: "create_directory", server_id, path });
      }
    },
  );

  server.registerTool(
    "delete_files",
    {
      title: "Delete files",
      description: `Delete one or more files/directories on a server. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        root: z
          .string()
          .describe(`Root directory containing the files. ${PATH_HINT}`),
        files: z
          .array(z.string())
          .describe("Relative file/directory names to delete"),
        permanent: z
          .boolean()
          .optional()
          .describe("Permanently delete if supported"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ server_id, root, files, permanent }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/servers/${server_id}/delete-files`,
          { root: normalizeServerPath(root), files, permanent },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "delete_files",
          server_id,
          path: root,
        });
      }
    },
  );

  server.registerTool(
    "rename_file",
    {
      title: "Rename / move files",
      description: `Rename or move files within a server directory. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        root: z.string().describe(`Root directory. ${PATH_HINT}`),
        files: z
          .array(
            z.object({
              from: z.string(),
              to: z.string(),
            }),
          )
          .describe("Rename mappings"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, root, files }, extra) => {
      try {
        const data = await createClient(extra.sessionId).put(
          `/api/user/servers/${server_id}/rename`,
          {
            root: normalizeServerPath(root),
            files,
          },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, { tool: "rename_file", server_id, path: root });
      }
    },
  );

  server.registerTool(
    "copy_files",
    {
      title: "Copy files",
      description: `Copy files on a server. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        files: z.array(z.string()).describe("Source file paths"),
        location: z.string().describe(`Destination directory. ${PATH_HINT}`),
        name: z
          .string()
          .optional()
          .describe("Optional new name for single-file copy"),
        overwrite: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, files, location, name, overwrite }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/copy-files`,
          {
            files: files.map((f) => normalizeServerPath(f)),
            location: normalizeServerPath(location),
            name,
            overwrite,
          },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "copy_files",
          server_id,
          path: location,
        });
      }
    },
  );

  server.registerTool(
    "compress_files",
    {
      title: "Compress files",
      description: `Compress files into an archive on a server (async processing). ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        root: z.string().describe(PATH_HINT),
        files: z.array(z.string()),
        name: z.string().optional(),
        extension: z
          .string()
          .optional()
          .describe("Archive extension, default tar.gz"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, root, files, name, extension }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/compress-files`,
          {
            root: normalizeServerPath(root),
            files,
            name,
            extension,
          },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "compress_files",
          server_id,
          path: root,
        });
      }
    },
  );

  server.registerTool(
    "decompress_archive",
    {
      title: "Decompress archive",
      description: `Extract an archive on a server. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        root: z.string().describe(PATH_HINT),
        file: z.string().describe("Archive filename relative to root"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, root, file }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/decompress-archive`,
          { root: normalizeServerPath(root), file },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "decompress_archive",
          server_id,
          path: root,
        });
      }
    },
  );

  server.registerTool(
    "pull_file",
    {
      title: "Pull remote file",
      description: `Download a remote URL into the server filesystem. MUST be a direct binary URL. root MUST be / for server root (e.g. pull server.jar into /) — NEVER /home/container. Minecraft: avoid download.getbukkit.org; prefer Paper fill-data URLs from fill.papermc.io/v3. Pass fileName (e.g. server.jar). Foreground by default. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        url: z
          .string()
          .url()
          .describe(
            "Direct https file URL (CDN/object). Not a browser download page.",
          ),
        root: z
          .string()
          .describe(
            `Destination directory. Use / for server root. ${PATH_HINT}`,
          ),
        fileName: z
          .string()
          .optional()
          .describe(
            "Destination filename (recommended: server.jar). Inferred from URL/headers if omitted",
          ),
        foreground: z
          .boolean()
          .optional()
          .describe(
            "Wait for completion (default true). Set false only for large background pulls.",
          ),
        useHeader: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (
      { server_id, url, root, fileName, foreground, useHeader },
      extra,
    ) => {
      try {
        const normalizedRoot = normalizeServerPath(root);
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/pull-file`,
          {
            url,
            root: normalizedRoot,
            fileName,
            foreground: foreground ?? true,
            useHeader,
          },
        );
        return toolText({
          ...(data && typeof data === "object" ? data : { result: data }),
          root_used: normalizedRoot,
        });
      } catch (error) {
        return toolError(error, { tool: "pull_file", server_id, url });
      }
    },
  );

  server.registerTool(
    "search_files",
    {
      title: "Search files",
      description: `Powerful recursive file search on a server by name pattern and/or file contents (grep-style). Prefer this over listing every directory. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        directory: z
          .string()
          .optional()
          .describe(`Root directory to search (default /). ${PATH_HINT}`),
        pattern: z.string().optional().describe("Filename/glob pattern"),
        include: z.string().optional().describe("Include glob (e.g. *.yml)"),
        exclude: z.string().optional().describe("Exclude glob"),
        case_insensitive: z.boolean().optional(),
        content: z
          .string()
          .optional()
          .describe("Search file contents for this string"),
        content_case_insensitive: z.boolean().optional(),
        min_size: z.number().optional(),
        max_size: z.number().optional(),
        max_content_size: z.number().optional(),
        include_oversized: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args, extra) => {
      try {
        const { server_id, directory, ...rest } = args;
        const data = await createClient(extra.sessionId).get(
          `/api/user/servers/${server_id}/search-files`,
          {
            ...rest,
            directory: normalizeServerPath(directory ?? "/"),
          },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "search_files",
          server_id: args.server_id,
          path: args.directory ?? "/",
        });
      }
    },
  );

  server.registerTool(
    "change_file_permissions",
    {
      title: "Change file permissions",
      description: `Change Unix permissions (chmod) on files/directories. ${PATH_HINT}`,
      inputSchema: {
        server_id: serverId,
        root: z.string().describe(`Root directory. ${PATH_HINT}`),
        files: z
          .array(
            z.object({
              file: z.string().describe("Relative path"),
              mode: z.string().describe("Octal mode, e.g. 755"),
            }),
          )
          .describe("Files and modes to apply"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ server_id, root, files }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/servers/${server_id}/change-permissions`,
          { root: normalizeServerPath(root), files },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error, {
          tool: "change_file_permissions",
          server_id,
          path: root,
        });
      }
    },
  );
}
