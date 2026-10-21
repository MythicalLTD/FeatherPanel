import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { registerWebspaceToolDefs, webspaceId } from "./webspace-common.js";

const backupUuid = z.string().describe("Backup UUID");
const jobId = z.string().describe("Backup job ID");

export function registerWebspaceBackupTools(server: McpServer): void {
  registerWebspaceToolDefs(server, [
    {
      name: "list_webspace_backups",
      title: "List webspace backups",
      description: "List backups for a webspace.",
      method: "GET",
      suffix: "/backups",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "create_webspace_backup",
      title: "Create webspace backup",
      description: "Start a new backup job.",
      method: "POST",
      suffix: "/backup",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "delete_webspace_backup",
      title: "Delete webspace backup",
      description: "Delete a backup by UUID.",
      method: "DELETE",
      suffix: "/backups/{backup_uuid}",
      schema: { webspace_id: webspaceId, backup_uuid: backupUuid },
      destructive: true,
    },
    {
      name: "restore_webspace_backup",
      title: "Restore webspace backup",
      description: "Restore files from a backup.",
      method: "POST",
      suffix: "/backups/{backup_uuid}/restore",
      schema: { webspace_id: webspaceId, backup_uuid: backupUuid },
      withPayload: true,
      destructive: true,
    },
    {
      name: "list_webspace_backup_files",
      title: "List backup files",
      description: "List files contained in a backup.",
      method: "GET",
      suffix: "/backups/{backup_uuid}/files",
      schema: { webspace_id: webspaceId, backup_uuid: backupUuid },
      readOnly: true,
      queryKeys: ["path", "directory"],
    },
    {
      name: "download_webspace_backup",
      title: "Download webspace backup",
      description: "Get download URL/info for a backup archive.",
      method: "GET",
      suffix: "/backups/{backup_uuid}/download",
      schema: { webspace_id: webspaceId, backup_uuid: backupUuid },
      readOnly: true,
    },
    {
      name: "import_webspace_backup",
      title: "Import webspace backup",
      description: "Import a backup from external storage.",
      method: "POST",
      suffix: "/backups/import",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "reconcile_webspace_backups",
      title: "Reconcile webspace backups",
      description: "Reconcile backup metadata with remote storage.",
      method: "POST",
      suffix: "/backups/reconcile",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_backup_job_status",
      title: "Get backup job status",
      description: "Status of a backup/restore job by job ID.",
      method: "GET",
      suffix: "/backups/jobs/{job_id}",
      schema: { webspace_id: webspaceId, job_id: jobId },
      readOnly: true,
    },
  ]);
}
