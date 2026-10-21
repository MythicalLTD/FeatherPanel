import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { registerWebspaceToolDefs, webspaceId } from "./webspace-common.js";

const accountId = z
  .union([z.string(), z.number()])
  .describe("SFTP account ID");

export function registerWebspaceSftpTools(server: McpServer): void {
  registerWebspaceToolDefs(server, [
    {
      name: "list_webspace_sftp_accounts",
      title: "List SFTP accounts",
      description: "List SFTP accounts for a webspace.",
      method: "GET",
      suffix: "/sftp-accounts",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "create_webspace_sftp_account",
      title: "Create SFTP account",
      description: "Create an SFTP account.",
      method: "POST",
      suffix: "/sftp-accounts",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "update_webspace_sftp_account",
      title: "Update SFTP account",
      description: "Update SFTP account settings.",
      method: "PATCH",
      suffix: "/sftp-accounts/{account_id}",
      schema: { webspace_id: webspaceId, account_id: accountId },
      withPayload: true,
    },
    {
      name: "delete_webspace_sftp_account",
      title: "Delete SFTP account",
      description: "Delete an SFTP account.",
      method: "DELETE",
      suffix: "/sftp-accounts/{account_id}",
      schema: { webspace_id: webspaceId, account_id: accountId },
      destructive: true,
    },
    {
      name: "reset_webspace_sftp_password",
      title: "Reset SFTP password",
      description: "Reset password for an SFTP account.",
      method: "POST",
      suffix: "/sftp-accounts/{account_id}/reset-password",
      schema: { webspace_id: webspaceId, account_id: accountId },
      withPayload: true,
    },
  ]);
}
