import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { registerWebspaceToolDefs, webspaceId } from "./webspace-common.js";

const scheduleId = z
  .union([z.string(), z.number()])
  .describe("Schedule ID");

export function registerWebspaceScheduleTools(server: McpServer): void {
  registerWebspaceToolDefs(server, [
    {
      name: "list_webspace_schedules",
      title: "List webspace schedules",
      description: "List cron schedules for a webspace.",
      method: "GET",
      suffix: "/schedules",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "create_webspace_schedule",
      title: "Create webspace schedule",
      description: "Create a cron schedule.",
      method: "POST",
      suffix: "/schedules",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "get_webspace_schedule",
      title: "Get webspace schedule",
      description: "Get a single schedule by ID.",
      method: "GET",
      suffix: "/schedules/{schedule_id}",
      schema: { webspace_id: webspaceId, schedule_id: scheduleId },
      readOnly: true,
    },
    {
      name: "update_webspace_schedule",
      title: "Update webspace schedule",
      description: "Update a cron schedule.",
      method: "PUT",
      suffix: "/schedules/{schedule_id}",
      schema: { webspace_id: webspaceId, schedule_id: scheduleId },
      withPayload: true,
    },
    {
      name: "delete_webspace_schedule",
      title: "Delete webspace schedule",
      description: "Delete a cron schedule.",
      method: "DELETE",
      suffix: "/schedules/{schedule_id}",
      schema: { webspace_id: webspaceId, schedule_id: scheduleId },
      destructive: true,
    },
    {
      name: "execute_webspace_schedule",
      title: "Execute webspace schedule",
      description: "Run a schedule immediately.",
      method: "POST",
      suffix: "/schedules/{schedule_id}/execute",
      schema: { webspace_id: webspaceId, schedule_id: scheduleId },
      withPayload: true,
    },
    {
      name: "toggle_webspace_schedule",
      title: "Toggle webspace schedule",
      description: "Enable or disable a schedule.",
      method: "POST",
      suffix: "/schedules/{schedule_id}/toggle",
      schema: { webspace_id: webspaceId, schedule_id: scheduleId },
      withPayload: true,
    },
    {
      name: "abort_webspace_schedules",
      title: "Abort webspace schedules",
      description: "Abort running schedule tasks.",
      method: "POST",
      suffix: "/schedules/abort",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
  ]);
}
