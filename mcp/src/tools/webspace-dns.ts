import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { registerWebspaceToolDefs, webspaceId } from "./webspace-common.js";

const zoneId = z.union([z.string(), z.number()]).describe("DNS zone ID");
const recordId = z.string().describe("DNS record ID");

export function registerWebspaceDnsTools(server: McpServer): void {
  registerWebspaceToolDefs(server, [
    {
      name: "list_webspace_dns_hosts",
      title: "List DNS hosts",
      description: "DNS hosts/providers linked to this webspace.",
      method: "GET",
      suffix: "/dns/hosts",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "list_webspace_dns_zones",
      title: "List DNS zones",
      description: "DNS zones linked to this webspace.",
      method: "GET",
      suffix: "/dns/zones",
      schema: { webspace_id: webspaceId },
      readOnly: true,
    },
    {
      name: "link_webspace_dns_zone",
      title: "Link DNS zone",
      description: "Link an existing DNS zone to the webspace.",
      method: "POST",
      suffix: "/dns/zones",
      schema: { webspace_id: webspaceId },
      withPayload: true,
    },
    {
      name: "unlink_webspace_dns_zone",
      title: "Unlink DNS zone",
      description: "Unlink a DNS zone from the webspace.",
      method: "DELETE",
      suffix: "/dns/zones/{zone_id}",
      schema: { webspace_id: webspaceId, zone_id: zoneId },
      destructive: true,
    },
    {
      name: "list_webspace_dns_records",
      title: "List DNS records",
      description: "List records in a DNS zone.",
      method: "GET",
      suffix: "/dns/zones/{zone_id}/records",
      schema: { webspace_id: webspaceId, zone_id: zoneId },
      readOnly: true,
    },
    {
      name: "create_webspace_dns_record",
      title: "Create DNS record",
      description: "Add a DNS record to a zone.",
      method: "POST",
      suffix: "/dns/zones/{zone_id}/records",
      schema: { webspace_id: webspaceId, zone_id: zoneId },
      withPayload: true,
    },
    {
      name: "update_webspace_dns_record",
      title: "Update DNS record",
      description: "Update a DNS record in a zone.",
      method: "PATCH",
      suffix: "/dns/zones/{zone_id}/records/{record_id}",
      schema: {
        webspace_id: webspaceId,
        zone_id: zoneId,
        record_id: recordId,
      },
      withPayload: true,
    },
    {
      name: "delete_webspace_dns_record",
      title: "Delete DNS record",
      description: "Delete a DNS record from a zone.",
      method: "DELETE",
      suffix: "/dns/zones/{zone_id}/records/{record_id}",
      schema: {
        webspace_id: webspaceId,
        zone_id: zoneId,
        record_id: recordId,
      },
      destructive: true,
    },
  ]);
}
