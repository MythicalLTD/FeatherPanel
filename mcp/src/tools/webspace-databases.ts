import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { registerWebspaceToolDefs, webspaceId } from "./webspace-common.js";

const databaseId = z
  .union([z.string(), z.number()])
  .describe("Webspace database ID");

export function registerWebspaceDatabaseTools(server: McpServer): void {
  registerWebspaceToolDefs(server, [
    {
      name: "list_webspace_databases",
      title: "List webspace databases",
      description: "List databases for a webspace.",
      method: "GET",
      suffix: "/databases",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "list_webspace_database_hosts",
      title: "List database hosts",
      description: "Database hosts available for this webspace.",
      method: "GET",
      suffix: "/databases/hosts",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "create_webspace_database",
      title: "Create webspace database",
      description: "Create a new database on the webspace.",
      method: "POST",
      suffix: "/databases",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "delete_webspace_database",
      title: "Delete webspace database",
      description: "Delete a database by ID.",
      method: "DELETE",
      suffix: "/databases/{database_id}",
      schema: { webspace_id: webspaceId, database_id: databaseId },
      destructive: true,
    },
    {
      name: "reset_webspace_database_password",
      title: "Reset database password",
      description: "Generate a new password for a webspace database.",
      method: "POST",
      suffix: "/databases/{database_id}/reset-password",
      schema: { webspace_id: webspaceId, database_id: databaseId },
      withPayload: true,
    },
    {
      name: "dump_webspace_database",
      title: "Dump webspace database",
      description: "Start or download a SQL dump for a database.",
      method: "POST",
      suffix: "/databases/{database_id}/dump",
      schema: { webspace_id: webspaceId, database_id: databaseId },
      withPayload: true,
    },
    {
      name: "restore_webspace_database",
      title: "Restore webspace database",
      description: "Restore a database from a dump.",
      method: "POST",
      suffix: "/databases/{database_id}/restore",
      schema: { webspace_id: webspaceId, database_id: databaseId },
      withPayload: true,
      destructive: true,
    },
    {
      name: "check_webspace_phpmyadmin",
      title: "Check phpMyAdmin",
      description: "Whether phpMyAdmin is available for this webspace.",
      method: "GET",
      suffix: "/databases/phpmyadmin/check",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "create_webspace_phpmyadmin_token",
      title: "phpMyAdmin SSO token",
      description: "Generate a phpMyAdmin login token for a database.",
      method: "POST",
      suffix: "/databases/{database_id}/phpmyadmin/token",
      schema: { webspace_id: webspaceId, database_id: databaseId },
      withPayload: true,
    },
    {
      name: "check_webspace_phppgadmin",
      title: "Check phpPgAdmin",
      description: "Whether phpPgAdmin is available for this webspace.",
      method: "GET",
      suffix: "/databases/phppgadmin/check",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "create_webspace_phppgadmin_token",
      title: "phpPgAdmin SSO token",
      description: "Generate a phpPgAdmin login token for a database.",
      method: "POST",
      suffix: "/databases/{database_id}/phppgadmin/token",
      schema: { webspace_id: webspaceId, database_id: databaseId },
      withPayload: true,
    },
  ]);
}
