import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { createClient, toolError, toolText } from "../client.js";

const vdsId = z
  .union([z.string(), z.number()])
  .describe("VDS / VM instance ID");

const reinstallBody = z
  .record(z.string(), z.unknown())
  .optional()
  .describe("Reinstall payload (e.g. template_id, ci_user, ci_password)");

export function registerVdsTools(server: McpServer): void {
  server.registerTool(
    "list_vds",
    {
      title: "List VDS instances",
      description: "List VDS/VM instances for the authenticated user.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (_args, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          "/api/user/vm-instances",
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_details",
    {
      title: "Get VDS details",
      description: "Get details for a VDS/VM instance.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_status",
    {
      title: "Get VDS status",
      description: "Get power/status for a VDS/VM instance.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/status`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_qemu_hardware",
    {
      title: "Get VDS QEMU hardware",
      description: "Get QEMU hardware settings (EFI/TPM/serial) for a VM.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/qemu-hardware`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "patch_vds_qemu_hardware",
    {
      title: "Patch VDS QEMU hardware",
      description:
        "Update QEMU hardware (bios, efi_enabled, tpm_enabled, serial0_enabled).",
      inputSchema: {
        vds_id: vdsId,
        bios: z.enum(["seabios", "ovmf"]).optional(),
        efi_enabled: z.boolean().optional(),
        tpm_enabled: z.boolean().optional(),
        serial0_enabled: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ vds_id, ...body }, extra) => {
      try {
        const data = await createClient(extra.sessionId).patch(
          `/api/user/vm-instances/${vds_id}/qemu-hardware`,
          body,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_network_options",
    {
      title: "Get VDS network options",
      description: "List available network options (e.g. free IPs) for a VM.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/network-options`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_networking",
    {
      title: "Get VDS networking",
      description: "Get current networking configuration for a VM.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/networking`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "patch_vds_network_dns",
    {
      title: "Patch VDS network DNS",
      description: "Update nameserver and searchdomain for a VM.",
      inputSchema: {
        vds_id: vdsId,
        nameserver: z.string().optional(),
        searchdomain: z.string().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ vds_id, nameserver, searchdomain }, extra) => {
      try {
        const data = await createClient(extra.sessionId).patch(
          `/api/user/vm-instances/${vds_id}/network-dns`,
          { nameserver, searchdomain },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_iso_storages",
    {
      title: "Get VDS ISO storages",
      description: "List Proxmox storages available for ISO mount on a QEMU VM.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/iso-storages`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_iso_current",
    {
      title: "Get current VDS ISO",
      description: "Get currently mounted ISO for a QEMU VM.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/iso-current`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "vds_iso_fetch_and_mount",
    {
      title: "Fetch and mount VDS ISO",
      description: "Download an ISO from a URL and mount it on a QEMU VM.",
      inputSchema: {
        vds_id: vdsId,
        storage: z.string(),
        url: z.string().url(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ vds_id, storage, url }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/iso-fetch-and-mount`,
          { storage, url },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "vds_iso_unmount",
    {
      title: "Unmount VDS ISO",
      description: "Unmount the current ISO from a QEMU VM.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/iso-unmount`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_templates",
    {
      title: "Get VDS templates",
      description: "List OS templates available for reinstall on a VM.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/templates`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "vds_power_action",
    {
      title: "VDS power action",
      description: "Start, stop, or reboot a VDS/VM. Returns an async task_id.",
      inputSchema: {
        vds_id: vdsId,
        action: z.enum(["start", "stop", "reboot"]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ vds_id, action }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/power`,
          { action },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_vnc_ticket",
    {
      title: "Get VDS VNC ticket",
      description: "Get a VNC console ticket for a VM.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/vnc-ticket`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "vds_reinstall",
    {
      title: "Reinstall VDS",
      description:
        "Start async OS reinstall. Returns reinstall_id; poll get_vds_reinstall_status.",
      inputSchema: {
        vds_id: vdsId,
        body: reinstallBody,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ vds_id, body }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/reinstall`,
          body ?? {},
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_reinstall_status",
    {
      title: "Get VDS reinstall status",
      description: "Poll reinstall progress by reinstall_id.",
      inputSchema: { reinstall_id: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ reinstall_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/reinstall-status/${reinstall_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_task_status",
    {
      title: "Get VDS task status",
      description: "Poll async Proxmox task status by task_id.",
      inputSchema: { task_id: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ task_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/task-status/${task_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_backups",
    {
      title: "List VDS backups",
      description: "List backups for a VDS/VM instance.",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/backups`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_vds_backup",
    {
      title: "Create VDS backup",
      description:
        "Start async VM backup. Poll get_vds_backup_status with returned backup_id.",
      inputSchema: {
        vds_id: vdsId,
        compress: z.string().optional(),
        mode: z.enum(["snapshot", "suspend", "stop"]).optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ vds_id, compress, mode }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/backups`,
          { compress, mode },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_vds_backup",
    {
      title: "Delete VDS backup",
      description:
        "Delete a VDS backup by volid/storage, or backup_id for failed placeholders.",
      inputSchema: {
        vds_id: vdsId,
        volid: z.string().optional(),
        storage: z.string().optional(),
        backup_id: z.number().int().positive().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ vds_id, volid, storage, backup_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/vm-instances/${vds_id}/backups`,
          { volid, storage, backup_id },
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "restore_vds_backup",
    {
      title: "Restore VDS backup",
      description:
        "Start async restore from backup volid/storage. Poll get_vds_restore_status.",
      inputSchema: {
        vds_id: vdsId,
        volid: z.string(),
        storage: z.string(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ vds_id, volid, storage }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/backups/restore`,
          { volid, storage },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "recover_vds_backup",
    {
      title: "Recover VDS backup job",
      description:
        "Mark an interrupted VM backup job as failed after confirm_interrupted: true.",
      inputSchema: {
        vds_id: vdsId,
        backup_id: z.number().int().positive(),
        confirm_interrupted: z.literal(true),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ vds_id, backup_id, confirm_interrupted }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/backups/${backup_id}/recover`,
          { confirm_interrupted },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_backup_status",
    {
      title: "Get VDS backup status",
      description: "Poll VM backup job status by backup_id.",
      inputSchema: { backup_id: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ backup_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/backup-status/${backup_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_restore_status",
    {
      title: "Get VDS restore status",
      description: "Poll VM restore job status by restore_id.",
      inputSchema: { restore_id: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ restore_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/restore-status/${restore_id}`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_vds_activities",
    {
      title: "Get VDS activities",
      description: "List activity log entries for a VM instance.",
      inputSchema: {
        vds_id: vdsId,
        page: z.number().int().positive().optional(),
        per_page: z.number().int().positive().max(100).optional(),
        search: z.string().optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id, page, per_page, search }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/activities`,
          { page, per_page, search },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_vds_subusers",
    {
      title: "List VDS subusers",
      description: "List subusers for a VM instance (owner only).",
      inputSchema: { vds_id: vdsId },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ vds_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).get(
          `/api/user/vm-instances/${vds_id}/subusers`,
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "create_vds_subuser",
    {
      title: "Create VDS subuser",
      description: "Add a subuser with permissions to a VM (owner only).",
      inputSchema: {
        vds_id: vdsId,
        email: z.string(),
        permissions: z.array(z.string()).min(1),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ vds_id, email, permissions }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/vm-instances/${vds_id}/subusers`,
          { email, permissions },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "delete_vds_subuser",
    {
      title: "Delete VDS subuser",
      description: "Remove a subuser from a VM instance (owner only).",
      inputSchema: {
        vds_id: vdsId,
        subuser_id: z.number().int().positive(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ vds_id, subuser_id }, extra) => {
      try {
        const data = await createClient(extra.sessionId).delete(
          `/api/user/vm-instances/${vds_id}/subusers/${subuser_id}`,
        );
        return toolText(data ?? { success: true });
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
