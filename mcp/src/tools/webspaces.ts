import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { registerWebspaceToolDefs, webspaceId } from "./webspace-common.js";
import { createClient, toolError, toolText } from "../client.js";
import { registerWebspaceAppTools } from "./webspace-apps.js";
import { registerWebspaceBackupTools } from "./webspace-backups.js";
import { registerWebspaceDatabaseTools } from "./webspace-databases.js";
import { registerWebspaceDnsTools } from "./webspace-dns.js";
import { registerWebspaceFileTools } from "./webspace-files.js";
import { registerWebspaceMailTools } from "./webspace-mail.js";
import { registerWebspaceScheduleTools } from "./webspace-schedules.js";
import { registerWebspaceSftpTools } from "./webspace-sftp.js";
import { registerWebspaceSubuserTools } from "./webspace-subusers.js";

export function registerWebSpaceTools(server: McpServer): void {
  registerWebspaceCoreTools(server);
  registerWebspaceFileTools(server);
  registerWebspaceDatabaseTools(server);
  registerWebspaceMailTools(server);
  registerWebspaceDnsTools(server);
  registerWebspaceBackupTools(server);
  registerWebspaceScheduleTools(server);
  registerWebspaceSftpTools(server);
  registerWebspaceSubuserTools(server);
  registerWebspaceAppTools(server);
}

function registerWebspaceCoreTools(server: McpServer): void {
  registerWebspaceToolDefs(server, [
    {
      name: "list_webspaces",
      title: "List webspaces",
      description: "List web hosting spaces for the authenticated user.",
      method: "GET",
      globalPath: "/api/user/webspaces",
      schema: {},
      readOnly: true,
    },
    {
      name: "list_webspace_catalog",
      title: "List webspace catalog",
      description: "List available webspace products/plans in the catalog.",
      method: "GET",
      globalPath: "/api/user/webspaces/catalog",
      schema: {},
      readOnly: true,
    },
    {
      name: "get_webspace",
      title: "Get webspace",
      description: "Get details for a webspace by short UUID.",
      method: "GET",
      suffix: "",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "update_webspace",
      title: "Update webspace",
      description: "Update webspace settings (PATCH body fields).",
      method: "PATCH",
      suffix: "",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_utilization",
      title: "Get webspace utilization",
      description: "Disk/bandwidth utilization for a webspace.",
      method: "GET",
      suffix: "/utilization",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "get_webspace_transfer_status",
      title: "Get webspace transfer status",
      description: "Migration/transfer job status for a webspace.",
      method: "GET",
      suffix: "/transfer/status",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "get_webspace_infrastructure_readiness",
      title: "Get infrastructure readiness",
      description: "Check whether backend infrastructure is ready for this webspace.",
      method: "GET",
      suffix: "/infrastructure-readiness",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "get_webspace_php_ini",
      title: "Get PHP ini",
      description: "Read php.ini configuration for a webspace.",
      method: "GET",
      suffix: "/php-ini",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "save_webspace_php_ini",
      title: "Save PHP ini",
      description: "Write php.ini configuration for a webspace.",
      method: "PUT",
      suffix: "/php-ini",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_php_extensions",
      title: "Get PHP extensions",
      description: "List enabled PHP extensions for a webspace.",
      method: "GET",
      suffix: "/php-extensions",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "save_webspace_php_extensions",
      title: "Save PHP extensions",
      description: "Update enabled PHP extensions for a webspace.",
      method: "PUT",
      suffix: "/php-extensions",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_redis",
      title: "Get Redis settings",
      description: "Read Redis configuration for a webspace.",
      method: "GET",
      suffix: "/redis",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "save_webspace_redis",
      title: "Save Redis settings",
      description: "Update Redis configuration for a webspace.",
      method: "PUT",
      suffix: "/redis",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "start_webspace_malware_scan",
      title: "Start malware scan",
      description: "Trigger a malware scan on a webspace.",
      method: "POST",
      suffix: "/malware-scan",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_malware_scan_status",
      title: "Get malware scan status",
      description: "Malware scan progress/results for a webspace.",
      method: "GET",
      suffix: "/malware-scan",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "schedule_webspace_malware_scan",
      title: "Schedule malware scan",
      description: "Enable or configure scheduled malware scans.",
      method: "POST",
      suffix: "/malware-scan/schedule",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_status",
      title: "Get webspace status",
      description: "Lifecycle/status for a webspace.",
      method: "GET",
      suffix: "/status",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "get_webspace_logs",
      title: "Get webspace logs",
      description: "Application/service logs for a webspace.",
      method: "GET",
      suffix: "/logs",
      schema: { webspace_id: webspaceId },
      readOnly: true,
      queryKeys: ["lines", "since"],
    },
    {
      name: "get_webspace_install_logs",
      title: "Get webspace install logs",
      description: "Provisioning/install log output for a webspace.",
      method: "GET",
      suffix: "/logs/install",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "reinstall_webspace",
      title: "Reinstall webspace",
      description: "Reinstall/reprovision a webspace stack.",
      method: "POST",
      suffix: "/reinstall",
      schema: { webspace_id: webspaceId },
      withPayload: true,
      destructive: true,
    },
    {
      name: "abort_webspace_install",
      title: "Abort webspace install",
      description: "Abort an in-progress webspace installation.",
      method: "POST",
      suffix: "/install/abort",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_ssl",
      title: "Get webspace SSL",
      description: "SSL certificate status for a webspace.",
      method: "GET",
      suffix: "/ssl",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "renew_webspace_ssl",
      title: "Renew webspace SSL",
      description: "Renew Let's Encrypt (or managed) SSL for a webspace.",
      method: "POST",
      suffix: "/ssl/renew",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_custom_ssl",
      title: "Get custom SSL status",
      description: "Custom SSL upload status for a webspace.",
      method: "GET",
      suffix: "/ssl/custom",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "upload_webspace_custom_ssl",
      title: "Upload custom SSL",
      description: "Upload custom certificate/key (JSON body, not multipart).",
      method: "PUT",
      suffix: "/ssl/custom",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "delete_webspace_custom_ssl",
      title: "Delete custom SSL",
      description: "Remove custom SSL certificate from a webspace.",
      method: "DELETE",
      suffix: "/ssl/custom",
      schema: { webspace_id: webspaceId },
      destructive: true,
    },
    {
      name: "get_webspace_proxy_logs",
      title: "Get proxy logs",
      description: "Reverse-proxy access/error logs for a webspace.",
      method: "GET",
      suffix: "/proxy-logs",
      schema: { webspace_id: webspaceId },
      readOnly: true,
      queryKeys: ["type", "lines"],
    },
    {
      name: "rotate_webspace_proxy_logs",
      title: "Rotate proxy logs",
      description: "Rotate proxy log files for a webspace.",
      method: "POST",
      suffix: "/proxy-logs/rotate",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_analytics",
      title: "Get webspace analytics",
      description: "Traffic/analytics summary for a webspace.",
      method: "GET",
      suffix: "/analytics",
      schema: { webspace_id: webspaceId },
      readOnly: true,
      queryKeys: ["period", "from", "to"],
    },
    {
      name: "get_webspace_activities",
      title: "Get webspace activities",
      description: "Activity/audit log for a webspace.",
      method: "GET",
      suffix: "/activities",
      schema: { webspace_id: webspaceId },
      readOnly: true,
      queryKeys: ["page", "per_page"],
    },
    {
      name: "create_webspace_jwt",
      title: "Create webspace JWT",
      description: "Issue a short-lived JWT (e.g. for websocket/live console).",
      method: "POST",
      suffix: "/jwt",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "webspace_dns_check",
      title: "Webspace DNS check",
      description: "Verify DNS records point correctly for this webspace.",
      method: "POST",
      suffix: "/dns-check",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "provision_webspace_dns",
      title: "Provision webspace DNS",
      description: "Provision panel-managed DNS for the webspace domain.",
      method: "POST",
      suffix: "/dns/provision",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
  ]);

  // Power action sends { action } in body - override via custom registration
  server.registerTool(
    "webspace_power_action",
    {
      title: "Webspace power action",
      description: "Start, stop, restart, or kill a webspace.",
      inputSchema: {
        webspace_id: webspaceId,
        action: z.enum(["start", "stop", "restart", "kill"]),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ webspace_id, action }, extra) => {
      try {
        const data = await createClient(extra.sessionId).post(
          `/api/user/webspaces/${webspace_id}/power`,
          { action },
        );
        return toolText(data);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
