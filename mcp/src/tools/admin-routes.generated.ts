// Auto-generated from backend/app/routes/admin/*.php — do not edit by hand.
// Regenerate: python3 mcp/scripts/generate-admin-routes.py
export type AdminRoute = {
  name: string;
  path: string;
  methods: string[];
  permission: string | null;
  file: string;
};

export const ADMIN_ROUTES: AdminRoute[] = [
  {
    "name": "admin-abuseipdb-categories",
    "path": "/api/admin/abuseipdb/categories",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "abuseipdb.php"
  },
  {
    "name": "admin-abuseipdb-check",
    "path": "/api/admin/abuseipdb/check",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "abuseipdb.php"
  },
  {
    "name": "admin-abuseipdb-scan",
    "path": "/api/admin/abuseipdb/scan",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "abuseipdb.php"
  },
  {
    "name": "admin-abuseipdb-status",
    "path": "/api/admin/abuseipdb/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "abuseipdb.php"
  },
  {
    "name": "admin-allocations",
    "path": "/api/admin/allocations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-create",
    "path": "/api/admin/allocations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-available",
    "path": "/api/admin/allocations/available",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-bulk-address",
    "path": "/api/admin/allocations/bulk-address",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-bulk-delete",
    "path": "/api/admin/allocations/bulk-delete",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-delete-unused",
    "path": "/api/admin/allocations/delete-unused",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-delete",
    "path": "/api/admin/allocations/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-show",
    "path": "/api/admin/allocations/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-update",
    "path": "/api/admin/allocations/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-assign",
    "path": "/api/admin/allocations/{id}/assign",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-allocations-unassign",
    "path": "/api/admin/allocations/{id}/unassign",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "allocations.php"
  },
  {
    "name": "admin-analytics-activity-breakdown",
    "path": "/api/admin/analytics/activity/breakdown",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-activity-hourly",
    "path": "/api/admin/analytics/activity/hourly",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-activity-recent",
    "path": "/api/admin/analytics/activity/recent",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-activity-stats",
    "path": "/api/admin/analytics/activity/stats",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-activity-top",
    "path": "/api/admin/analytics/activity/top",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-activity-trend",
    "path": "/api/admin/analytics/activity/trend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-allocations-by-node",
    "path": "/api/admin/analytics/allocations/by-node",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-allocations-overview",
    "path": "/api/admin/analytics/allocations/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-content-dashboard",
    "path": "/api/admin/analytics/content/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/content.php"
  },
  {
    "name": "admin-analytics-databases-overview",
    "path": "/api/admin/analytics/databases/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-images-overview",
    "path": "/api/admin/analytics/images/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/content.php"
  },
  {
    "name": "admin-analytics-infrastructure-dashboard",
    "path": "/api/admin/analytics/infrastructure/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-ips-usage",
    "path": "/api/admin/analytics/ips/usage",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-knowledgebase-dashboard",
    "path": "/api/admin/analytics/knowledgebase/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/features.php"
  },
  {
    "name": "admin-analytics-languages",
    "path": "/api/admin/analytics/languages",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "analytics.php"
  },
  {
    "name": "admin-analytics-languages-trends",
    "path": "/api/admin/analytics/languages/trends",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "analytics.php"
  },
  {
    "name": "admin-analytics-locations-overview",
    "path": "/api/admin/analytics/locations/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-mail-queue-stats",
    "path": "/api/admin/analytics/mail-queue/stats",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/system.php"
  },
  {
    "name": "admin-analytics-mail-templates-overview",
    "path": "/api/admin/analytics/mail-templates/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/content.php"
  },
  {
    "name": "admin-analytics-nodes-by-location",
    "path": "/api/admin/analytics/nodes/by-location",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-nodes-overview",
    "path": "/api/admin/analytics/nodes/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-nodes-resources",
    "path": "/api/admin/analytics/nodes/resources",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-overview",
    "path": "/api/admin/analytics/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-plugins-dashboard",
    "path": "/api/admin/analytics/plugins/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/features.php"
  },
  {
    "name": "admin-analytics-ports-usage",
    "path": "/api/admin/analytics/ports/usage",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-realms-overview",
    "path": "/api/admin/analytics/realms/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/content.php"
  },
  {
    "name": "admin-analytics-servers-age-distribution",
    "path": "/api/admin/analytics/servers/age-distribution",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-allocation-usage",
    "path": "/api/admin/analytics/servers/allocation-usage",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-backups",
    "path": "/api/admin/analytics/servers/backups",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-by-node",
    "path": "/api/admin/analytics/servers/by-node",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/infrastructure.php"
  },
  {
    "name": "admin-analytics-servers-by-realm",
    "path": "/api/admin/analytics/servers/by-realm",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-by-spell",
    "path": "/api/admin/analytics/servers/by-spell",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-configuration",
    "path": "/api/admin/analytics/servers/configuration",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-creation-trend",
    "path": "/api/admin/analytics/servers/creation-trend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-dashboard",
    "path": "/api/admin/analytics/servers/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-database-usage",
    "path": "/api/admin/analytics/servers/database-usage",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-images",
    "path": "/api/admin/analytics/servers/images",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-installation",
    "path": "/api/admin/analytics/servers/installation",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-limits",
    "path": "/api/admin/analytics/servers/limits",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-overview",
    "path": "/api/admin/analytics/servers/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-resource-distribution",
    "path": "/api/admin/analytics/servers/resource-distribution",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-resource-trends",
    "path": "/api/admin/analytics/servers/resource-trends",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-resources",
    "path": "/api/admin/analytics/servers/resources",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-schedules",
    "path": "/api/admin/analytics/servers/schedules",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-server-activities",
    "path": "/api/admin/analytics/servers/server-activities",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-status",
    "path": "/api/admin/analytics/servers/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-subusers",
    "path": "/api/admin/analytics/servers/subusers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-servers-variables",
    "path": "/api/admin/analytics/servers/variables",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/servers.php"
  },
  {
    "name": "admin-analytics-spells-by-realm",
    "path": "/api/admin/analytics/spells/by-realm",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/content.php"
  },
  {
    "name": "admin-analytics-spells-overview",
    "path": "/api/admin/analytics/spells/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/content.php"
  },
  {
    "name": "admin-analytics-spells-variables",
    "path": "/api/admin/analytics/spells/variables",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/content.php"
  },
  {
    "name": "admin-analytics-system-dashboard",
    "path": "/api/admin/analytics/system/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/system.php"
  },
  {
    "name": "admin-analytics-system-feature-adoption",
    "path": "/api/admin/analytics/system/feature-adoption",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/system.php"
  },
  {
    "name": "admin-analytics-tickets-dashboard",
    "path": "/api/admin/analytics/tickets/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/features.php"
  },
  {
    "name": "admin-analytics-users-activity",
    "path": "/api/admin/analytics/users/activity",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-users-banned",
    "path": "/api/admin/analytics/users/banned",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-users-by-role",
    "path": "/api/admin/analytics/users/by-role",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-users-dashboard",
    "path": "/api/admin/analytics/users/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-users-growth",
    "path": "/api/admin/analytics/users/growth",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-users-overview",
    "path": "/api/admin/analytics/users/overview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-users-registration-trend",
    "path": "/api/admin/analytics/users/registration-trend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-users-security",
    "path": "/api/admin/analytics/users/security",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-users-top-by-servers",
    "path": "/api/admin/analytics/users/top-by-servers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/analytics.php"
  },
  {
    "name": "admin-analytics-vds-dashboard",
    "path": "/api/admin/analytics/vds/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "kpi/vds.php"
  },
  {
    "name": "admin-audit-log",
    "path": "/api/admin/audit-log",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "audit-log.php"
  },
  {
    "name": "admin-audit-log-export",
    "path": "/api/admin/audit-log/export",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_AUDIT_LOG_VIEW",
    "file": "audit-log.php"
  },
  {
    "name": "admin-audit-log-filters",
    "path": "/api/admin/audit-log/filters",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "audit-log.php"
  },
  {
    "name": "admin-backup-schedules",
    "path": "/api/admin/backup-schedules",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-create",
    "path": "/api/admin/backup-schedules",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-calendar",
    "path": "/api/admin/backup-schedules/calendar",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-preview-targets",
    "path": "/api/admin/backup-schedules/preview-targets",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-delete",
    "path": "/api/admin/backup-schedules/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-show",
    "path": "/api/admin/backup-schedules/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-update",
    "path": "/api/admin/backup-schedules/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-run",
    "path": "/api/admin/backup-schedules/{id}/run",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-runs",
    "path": "/api/admin/backup-schedules/{id}/runs",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-backup-schedules-run-show",
    "path": "/api/admin/backup-schedules/{id}/runs/{runId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "backup-schedules.php"
  },
  {
    "name": "admin-blocked-email-domains",
    "path": "/api/admin/blocked-email-domains",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-email-domains.php"
  },
  {
    "name": "admin-blocked-email-domains-create",
    "path": "/api/admin/blocked-email-domains",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-email-domains.php"
  },
  {
    "name": "admin-blocked-email-domains-import-preset",
    "path": "/api/admin/blocked-email-domains/import-preset",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-email-domains.php"
  },
  {
    "name": "admin-blocked-email-domains-import-text",
    "path": "/api/admin/blocked-email-domains/import-text",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-email-domains.php"
  },
  {
    "name": "admin-blocked-email-domains-import-url",
    "path": "/api/admin/blocked-email-domains/import-url",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-email-domains.php"
  },
  {
    "name": "admin-blocked-email-domains-delete",
    "path": "/api/admin/blocked-email-domains/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-email-domains.php"
  },
  {
    "name": "admin-blocked-ips",
    "path": "/api/admin/blocked-ips",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-ips.php"
  },
  {
    "name": "admin-blocked-ips-create",
    "path": "/api/admin/blocked-ips",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-ips.php"
  },
  {
    "name": "admin-blocked-ips-delete",
    "path": "/api/admin/blocked-ips/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "blocked-ips.php"
  },
  {
    "name": "admin-cloud-credentials",
    "path": "/api/admin/cloud/credentials",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-credentials-cloud",
    "path": "/api/admin/cloud/credentials/cloud",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-credentials-panel",
    "path": "/api/admin/cloud/credentials/panel",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-credentials-rotate",
    "path": "/api/admin/cloud/credentials/rotate",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-cloud",
    "path": "/api/admin/cloud/data/cloud",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-credits",
    "path": "/api/admin/cloud/data/credits",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-download-package",
    "path": "/api/admin/cloud/data/download/{packageName}/{version}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-eggs",
    "path": "/api/admin/cloud/data/eggs",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-egg-get",
    "path": "/api/admin/cloud/data/eggs/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-eggs-download",
    "path": "/api/admin/cloud/data/eggs/{id}/download",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-egg-reviews-delete",
    "path": "/api/admin/cloud/data/eggs/{id}/reviews",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-egg-reviews-get",
    "path": "/api/admin/cloud/data/eggs/{id}/reviews",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-egg-reviews-post",
    "path": "/api/admin/cloud/data/eggs/{id}/reviews",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-issues-projects",
    "path": "/api/admin/cloud/data/issues/projects",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-issues-create",
    "path": "/api/admin/cloud/data/issues/{project}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-issues-list",
    "path": "/api/admin/cloud/data/issues/{project}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-issues-get",
    "path": "/api/admin/cloud/data/issues/{project}/{number}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-issues-comment",
    "path": "/api/admin/cloud/data/issues/{project}/{number}/comments",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-pastes-create",
    "path": "/api/admin/cloud/data/pastes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-pastes-get",
    "path": "/api/admin/cloud/data/pastes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-products",
    "path": "/api/admin/cloud/data/products",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-product-releases",
    "path": "/api/admin/cloud/data/products/{slug}/releases",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-product-release-download",
    "path": "/api/admin/cloud/data/products/{slug}/releases/{version}/download",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-product-reviews-get",
    "path": "/api/admin/cloud/data/products/{slug}/reviews",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-product-reviews-post",
    "path": "/api/admin/cloud/data/products/{slug}/reviews",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-product-reviews-delete",
    "path": "/api/admin/cloud/data/products/{slug}/reviews/{reviewId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-report",
    "path": "/api/admin/cloud/data/report",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-store",
    "path": "/api/admin/cloud/data/store",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-store-product",
    "path": "/api/admin/cloud/data/store/products/{slug}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-store-product-questions-get",
    "path": "/api/admin/cloud/data/store/products/{slug}/questions",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-store-product-questions-post",
    "path": "/api/admin/cloud/data/store/products/{slug}/questions",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-store-product-question-reply",
    "path": "/api/admin/cloud/data/store/products/{slug}/questions/{questionId}/replies",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-store-product-reviews-get",
    "path": "/api/admin/cloud/data/store/products/{slug}/reviews",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-store-product-reviews-post",
    "path": "/api/admin/cloud/data/store/products/{slug}/reviews",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-store-product-versions",
    "path": "/api/admin/cloud/data/store/products/{slug}/versions",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-suggestion",
    "path": "/api/admin/cloud/data/suggestion",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-summary",
    "path": "/api/admin/cloud/data/summary",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-data-team",
    "path": "/api/admin/cloud/data/team",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-disconnect",
    "path": "/api/admin/cloud/disconnect",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-members-sync",
    "path": "/api/admin/cloud/members/sync",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-oauth2-callback",
    "path": "/api/admin/cloud/oauth2/callback",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-oauth2-link",
    "path": "/api/admin/cloud/oauth2/link",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-settings-get",
    "path": "/api/admin/cloud/settings",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-settings-put",
    "path": "/api/admin/cloud/settings",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-sync",
    "path": "/api/admin/cloud/sync",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-translations-projects",
    "path": "/api/admin/cloud/translations/projects",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-translations-project",
    "path": "/api/admin/cloud/translations/projects/{slug}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-translations-locales",
    "path": "/api/admin/cloud/translations/projects/{slug}/locales",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-translations-locale-get",
    "path": "/api/admin/cloud/translations/projects/{slug}/locales/{locale}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-translations-locale-download",
    "path": "/api/admin/cloud/translations/projects/{slug}/locales/{locale}/download",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-translations-locale-install",
    "path": "/api/admin/cloud/translations/projects/{slug}/locales/{locale}/install",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-cloud-translations-settings",
    "path": "/api/admin/cloud/translations/settings",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-console-execute",
    "path": "/api/admin/console/execute",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "console.php"
  },
  {
    "name": "admin-console-system-info",
    "path": "/api/admin/console/system-info",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "console.php"
  },
  {
    "name": "admin-dashboard",
    "path": "/api/admin/dashboard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dashboard.php"
  },
  {
    "name": "admin-cache-clear",
    "path": "/api/admin/dashboard/cache/clear",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cache.php"
  },
  {
    "name": "admin-dashboard-default-layout-clear",
    "path": "/api/admin/dashboard/default-layout",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dashboard.php"
  },
  {
    "name": "admin-dashboard-default-layout-update",
    "path": "/api/admin/dashboard/default-layout",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dashboard.php"
  },
  {
    "name": "admin-database-snapshots-create",
    "path": "/api/admin/database-snapshots",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "database-snapshots.php"
  },
  {
    "name": "admin-database-snapshots-list",
    "path": "/api/admin/database-snapshots",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "database-snapshots.php"
  },
  {
    "name": "admin-database-snapshots-fresh-restore",
    "path": "/api/admin/database-snapshots/fresh-restore",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "database-snapshots.php"
  },
  {
    "name": "admin-database-snapshots-restore-upload",
    "path": "/api/admin/database-snapshots/restore-upload",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "database-snapshots.php"
  },
  {
    "name": "admin-database-snapshots-delete",
    "path": "/api/admin/database-snapshots/{filename}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "database-snapshots.php"
  },
  {
    "name": "admin-database-snapshots-download",
    "path": "/api/admin/database-snapshots/{filename}/download",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "database-snapshots.php"
  },
  {
    "name": "admin-database-snapshots-restore",
    "path": "/api/admin/database-snapshots/{filename}/restore",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "database-snapshots.php"
  },
  {
    "name": "admin-databases",
    "path": "/api/admin/databases",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases.php"
  },
  {
    "name": "admin-databases-create",
    "path": "/api/admin/databases",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases.php"
  },
  {
    "name": "admin-databases-management-install-phpmyadmin",
    "path": "/api/admin/databases/management/install-phpmyadmin",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases-management.php"
  },
  {
    "name": "admin-databases-management-migrate",
    "path": "/api/admin/databases/management/migrate",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases-management.php"
  },
  {
    "name": "admin-databases-management-delete-phpmyadmin",
    "path": "/api/admin/databases/management/phpmyadmin",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases-management.php"
  },
  {
    "name": "admin-databases-management-phpmyadmin-status",
    "path": "/api/admin/databases/management/phpmyadmin/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases-management.php"
  },
  {
    "name": "admin-databases-management-status",
    "path": "/api/admin/databases/management/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases-management.php"
  },
  {
    "name": "admin-databases-by-node",
    "path": "/api/admin/databases/node/{nodeId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases.php"
  },
  {
    "name": "admin-databases-test-connection",
    "path": "/api/admin/databases/test-connection",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases.php"
  },
  {
    "name": "admin-databases-delete",
    "path": "/api/admin/databases/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases.php"
  },
  {
    "name": "admin-databases-show",
    "path": "/api/admin/databases/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases.php"
  },
  {
    "name": "admin-databases-update",
    "path": "/api/admin/databases/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases.php"
  },
  {
    "name": "admin-databases-health-check",
    "path": "/api/admin/databases/{id}/health",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "databases.php"
  },
  {
    "name": "admin-debug-runtime",
    "path": "/api/admin/debug/runtime",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "health.php"
  },
  {
    "name": "admin-devices-clear-all",
    "path": "/api/admin/devices",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-disk-quota-settings",
    "path": "/api/admin/disk-quota/settings",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_USERS_VIEW",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-disk-quota-settings-update",
    "path": "/api/admin/disk-quota/settings",
    "methods": [
      "PUT"
    ],
    "permission": "ADMIN_SETTINGS_EDIT",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-disk-quota-user",
    "path": "/api/admin/disk-quota/users/{id}",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_USERS_VIEW",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-disk-quota-user-update",
    "path": "/api/admin/disk-quota/users/{id}",
    "methods": [
      "PUT"
    ],
    "permission": "ADMIN_USERS_EDIT",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-dns-hosts",
    "path": "/api/admin/dns-hosts",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dns-hosts.php"
  },
  {
    "name": "admin-dns-hosts-create",
    "path": "/api/admin/dns-hosts",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dns-hosts.php"
  },
  {
    "name": "admin-dns-hosts-delete",
    "path": "/api/admin/dns-hosts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dns-hosts.php"
  },
  {
    "name": "admin-dns-hosts-show",
    "path": "/api/admin/dns-hosts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dns-hosts.php"
  },
  {
    "name": "admin-dns-hosts-update",
    "path": "/api/admin/dns-hosts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dns-hosts.php"
  },
  {
    "name": "admin-dns-hosts-test",
    "path": "/api/admin/dns-hosts/{id}/test",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "dns-hosts.php"
  },
  {
    "name": "admin-featherpanel-premium-get",
    "path": "/api/admin/featherpanel-premium",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-featherpanel-premium-post",
    "path": "/api/admin/featherpanel-premium",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-featherpanel-premium-free-claim",
    "path": "/api/admin/featherpanel-premium/free-claim",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud.php"
  },
  {
    "name": "admin-featherzerotrust-config",
    "path": "/api/admin/featherzerotrust/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-config-update",
    "path": "/api/admin/featherzerotrust/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes",
    "path": "/api/admin/featherzerotrust/hashes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes-add",
    "path": "/api/admin/featherzerotrust/hashes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes-bulk-confirm",
    "path": "/api/admin/featherzerotrust/hashes/bulk/confirm",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes-bulk-delete",
    "path": "/api/admin/featherzerotrust/hashes/bulk/delete",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes-check",
    "path": "/api/admin/featherzerotrust/hashes/check",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes-import-malwarebazaar",
    "path": "/api/admin/featherzerotrust/hashes/import/malwarebazaar",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes-stats",
    "path": "/api/admin/featherzerotrust/hashes/stats",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes-delete",
    "path": "/api/admin/featherzerotrust/hashes/{hash}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-hashes-confirm",
    "path": "/api/admin/featherzerotrust/hashes/{hash}/confirm",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-logs",
    "path": "/api/admin/featherzerotrust/logs",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-logs-details",
    "path": "/api/admin/featherzerotrust/logs/{executionId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-scan",
    "path": "/api/admin/featherzerotrust/scan",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-featherzerotrust-scan-batch",
    "path": "/api/admin/featherzerotrust/scan/batch",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "featherzerotrust.php"
  },
  {
    "name": "admin-file-manager-browse",
    "path": "/api/admin/file-manager/browse",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "file-manager.php"
  },
  {
    "name": "admin-file-manager-create",
    "path": "/api/admin/file-manager/create",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "file-manager.php"
  },
  {
    "name": "admin-file-manager-delete",
    "path": "/api/admin/file-manager/delete",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "file-manager.php"
  },
  {
    "name": "admin-file-manager-read",
    "path": "/api/admin/file-manager/read",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "file-manager.php"
  },
  {
    "name": "admin-file-manager-save",
    "path": "/api/admin/file-manager/save",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "file-manager.php"
  },
  {
    "name": "admin-health",
    "path": "/api/admin/health",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "health.php"
  },
  {
    "name": "admin-hosting-packages",
    "path": "/api/admin/hosting-packages",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "hosting-packages.php"
  },
  {
    "name": "admin-hosting-packages-create",
    "path": "/api/admin/hosting-packages",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "hosting-packages.php"
  },
  {
    "name": "admin-hosting-packages-delete",
    "path": "/api/admin/hosting-packages/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "hosting-packages.php"
  },
  {
    "name": "admin-hosting-packages-show",
    "path": "/api/admin/hosting-packages/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "hosting-packages.php"
  },
  {
    "name": "admin-hosting-packages-update",
    "path": "/api/admin/hosting-packages/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "hosting-packages.php"
  },
  {
    "name": "admin-images",
    "path": "/api/admin/images",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "images.php"
  },
  {
    "name": "admin-images-create",
    "path": "/api/admin/images",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "images.php"
  },
  {
    "name": "admin-images-upload",
    "path": "/api/admin/images/upload",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "images.php"
  },
  {
    "name": "admin-images-delete",
    "path": "/api/admin/images/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "images.php"
  },
  {
    "name": "admin-images-show",
    "path": "/api/admin/images/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "images.php"
  },
  {
    "name": "admin-images-update",
    "path": "/api/admin/images/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "images.php"
  },
  {
    "name": "admin-inactive-cleanup-archives",
    "path": "/api/admin/inactive-cleanup/archives",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_SERVERS_VIEW",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-inactive-cleanup-preview",
    "path": "/api/admin/inactive-cleanup/preview",
    "methods": [
      "POST"
    ],
    "permission": "ADMIN_SERVERS_VIEW",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-inactive-cleanup-run",
    "path": "/api/admin/inactive-cleanup/run",
    "methods": [
      "POST"
    ],
    "permission": "ADMIN_SERVERS_DELETE",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-inactive-cleanup-server",
    "path": "/api/admin/inactive-cleanup/servers/{id}",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_SERVERS_VIEW",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-inactive-cleanup-server-exempt",
    "path": "/api/admin/inactive-cleanup/servers/{id}/exempt",
    "methods": [
      "PUT"
    ],
    "permission": "ADMIN_SERVERS_EDIT",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-inactive-cleanup-settings",
    "path": "/api/admin/inactive-cleanup/settings",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_SERVERS_VIEW",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-inactive-cleanup-settings-update",
    "path": "/api/admin/inactive-cleanup/settings",
    "methods": [
      "PUT"
    ],
    "permission": "ADMIN_SERVERS_DELETE",
    "file": "inactive-cleanup.php"
  },
  {
    "name": "admin-integrity-baseline",
    "path": "/api/admin/integrity/baseline",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "integrity.php"
  },
  {
    "name": "admin-integrity-check",
    "path": "/api/admin/integrity/check",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "integrity.php"
  },
  {
    "name": "admin-knowledgebase-articles",
    "path": "/api/admin/knowledgebase/articles",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-create",
    "path": "/api/admin/knowledgebase/articles",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-reorder",
    "path": "/api/admin/knowledgebase/articles/reorder",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-delete",
    "path": "/api/admin/knowledgebase/articles/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-show",
    "path": "/api/admin/knowledgebase/articles/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-update",
    "path": "/api/admin/knowledgebase/articles/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-attachments",
    "path": "/api/admin/knowledgebase/articles/{id}/attachments",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-delete-attachment",
    "path": "/api/admin/knowledgebase/articles/{id}/attachments/{attachmentId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-create-tag",
    "path": "/api/admin/knowledgebase/articles/{id}/tags",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-tags",
    "path": "/api/admin/knowledgebase/articles/{id}/tags",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-delete-tag",
    "path": "/api/admin/knowledgebase/articles/{id}/tags/{tagId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-articles-upload-attachment",
    "path": "/api/admin/knowledgebase/articles/{id}/upload-attachment",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-categories",
    "path": "/api/admin/knowledgebase/categories",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-categories-create",
    "path": "/api/admin/knowledgebase/categories",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-categories-delete",
    "path": "/api/admin/knowledgebase/categories/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-categories-show",
    "path": "/api/admin/knowledgebase/categories/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-categories-update",
    "path": "/api/admin/knowledgebase/categories/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-knowledgebase-upload-icon",
    "path": "/api/admin/knowledgebase/upload-icon",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "knowledgebase.php"
  },
  {
    "name": "admin-ldap-providers-create",
    "path": "/api/admin/ldap/providers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "ldap.php"
  },
  {
    "name": "admin-ldap-providers-index",
    "path": "/api/admin/ldap/providers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "ldap.php"
  },
  {
    "name": "admin-ldap-providers-delete",
    "path": "/api/admin/ldap/providers/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "ldap.php"
  },
  {
    "name": "admin-ldap-providers-update",
    "path": "/api/admin/ldap/providers/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "ldap.php"
  },
  {
    "name": "admin-ldap-providers-test",
    "path": "/api/admin/ldap/providers/{uuid}/test",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "ldap.php"
  },
  {
    "name": "admin-locations",
    "path": "/api/admin/locations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "locations.php"
  },
  {
    "name": "admin-locations-create",
    "path": "/api/admin/locations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "locations.php"
  },
  {
    "name": "admin-locations-delete",
    "path": "/api/admin/locations/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "locations.php"
  },
  {
    "name": "admin-locations-show",
    "path": "/api/admin/locations/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "locations.php"
  },
  {
    "name": "admin-locations-update",
    "path": "/api/admin/locations/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "locations.php"
  },
  {
    "name": "admin-log-viewer-clear",
    "path": "/api/admin/log-viewer/clear",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "log-viewer.php"
  },
  {
    "name": "admin-log-viewer-files",
    "path": "/api/admin/log-viewer/files",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "log-viewer.php"
  },
  {
    "name": "admin-log-viewer-get",
    "path": "/api/admin/log-viewer/get",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "log-viewer.php"
  },
  {
    "name": "admin-log-viewer-upload",
    "path": "/api/admin/log-viewer/upload",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "log-viewer.php"
  },
  {
    "name": "admin-mail-hosts",
    "path": "/api/admin/mail-hosts",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-hosts.php"
  },
  {
    "name": "admin-mail-hosts-create",
    "path": "/api/admin/mail-hosts",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-hosts.php"
  },
  {
    "name": "admin-mail-hosts-ensure-node",
    "path": "/api/admin/mail-hosts/ensure-node/{webNodeId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-hosts.php"
  },
  {
    "name": "admin-mail-hosts-delete",
    "path": "/api/admin/mail-hosts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-hosts.php"
  },
  {
    "name": "admin-mail-hosts-show",
    "path": "/api/admin/mail-hosts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-hosts.php"
  },
  {
    "name": "admin-mail-hosts-update",
    "path": "/api/admin/mail-hosts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-hosts.php"
  },
  {
    "name": "admin-mail-templates",
    "path": "/api/admin/mail-templates",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mail-templates-create",
    "path": "/api/admin/mail-templates",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mail-templates-mass-email",
    "path": "/api/admin/mail-templates/mass-email",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mail-templates-test-email",
    "path": "/api/admin/mail-templates/test-email",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mail-templates-delete",
    "path": "/api/admin/mail-templates/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mail-templates-show",
    "path": "/api/admin/mail-templates/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mail-templates-update",
    "path": "/api/admin/mail-templates/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mail-templates-hard-delete",
    "path": "/api/admin/mail-templates/{id}/hard-delete",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mail-templates-restore",
    "path": "/api/admin/mail-templates/{id}/restore",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mail-templates.php"
  },
  {
    "name": "admin-mounts",
    "path": "/api/admin/mounts",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-mounts-create",
    "path": "/api/admin/mounts",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-mounts-delete",
    "path": "/api/admin/mounts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-mounts-show",
    "path": "/api/admin/mounts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-mounts-update",
    "path": "/api/admin/mounts/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-mounts-set-links",
    "path": "/api/admin/mounts/{id}/links",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-mounts-set-nodes",
    "path": "/api/admin/mounts/{id}/nodes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-mounts-set-servers",
    "path": "/api/admin/mounts/{id}/servers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-mounts-set-spells",
    "path": "/api/admin/mounts/{id}/spells",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "mounts.php"
  },
  {
    "name": "admin-node-alerts-evaluate",
    "path": "/api/admin/node-alerts/evaluate",
    "methods": [
      "POST"
    ],
    "permission": "ADMIN_NODES_EDIT",
    "file": "node-alerts.php"
  },
  {
    "name": "admin-node-alerts-history",
    "path": "/api/admin/node-alerts/history",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_NODES_VIEW",
    "file": "node-alerts.php"
  },
  {
    "name": "admin-node-alerts-overview",
    "path": "/api/admin/node-alerts/overview",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_NODES_VIEW",
    "file": "node-alerts.php"
  },
  {
    "name": "admin-node-alerts-settings",
    "path": "/api/admin/node-alerts/settings",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_NODES_VIEW",
    "file": "node-alerts.php"
  },
  {
    "name": "admin-node-alerts-settings-update",
    "path": "/api/admin/node-alerts/settings",
    "methods": [
      "PUT"
    ],
    "permission": "ADMIN_SETTINGS_EDIT",
    "file": "node-alerts.php"
  },
  {
    "name": "admin-node-alerts-test",
    "path": "/api/admin/node-alerts/test",
    "methods": [
      "POST"
    ],
    "permission": "ADMIN_SETTINGS_EDIT",
    "file": "node-alerts.php"
  },
  {
    "name": "admin-node-alerts-resolve",
    "path": "/api/admin/node-alerts/{id}/resolve",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "node-alerts.php"
  },
  {
    "name": "admin-nodes",
    "path": "/api/admin/nodes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-create",
    "path": "/api/admin/nodes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-status-global",
    "path": "/api/admin/nodes/status/global",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-delete",
    "path": "/api/admin/nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-show",
    "path": "/api/admin/nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-update",
    "path": "/api/admin/nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-config-get",
    "path": "/api/admin/nodes/{id}/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-config-put",
    "path": "/api/admin/nodes/{id}/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-config-patch",
    "path": "/api/admin/nodes/{id}/config/patch",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-config-schema",
    "path": "/api/admin/nodes/{id}/config/schema",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-diagnostics",
    "path": "/api/admin/nodes/{id}/diagnostics",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-mass-transfer",
    "path": "/api/admin/nodes/{id}/mass-transfer",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-mass-transfer-preview",
    "path": "/api/admin/nodes/{id}/mass-transfer/preview",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-reset-key",
    "path": "/api/admin/nodes/{id}/reset-key",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-self-update",
    "path": "/api/admin/nodes/{id}/self-update",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-setup-command",
    "path": "/api/admin/nodes/{id}/setup-command",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-system-logs",
    "path": "/api/admin/nodes/{id}/system-logs",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-system-log-file",
    "path": "/api/admin/nodes/{id}/system-logs/{file}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-terminal-exec",
    "path": "/api/admin/nodes/{id}/terminal/exec",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-version-status",
    "path": "/api/admin/nodes/{id}/version-status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-wings-config-get",
    "path": "/api/admin/nodes/{id}/wings/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-nodes-wings-config-put",
    "path": "/api/admin/nodes/{id}/wings/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "nodes.php"
  },
  {
    "name": "admin-notifications",
    "path": "/api/admin/notifications",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "notifications.php"
  },
  {
    "name": "admin-notifications-create",
    "path": "/api/admin/notifications",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "notifications.php"
  },
  {
    "name": "admin-notifications-delete",
    "path": "/api/admin/notifications/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "notifications.php"
  },
  {
    "name": "admin-notifications-show",
    "path": "/api/admin/notifications/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "notifications.php"
  },
  {
    "name": "admin-notifications-update",
    "path": "/api/admin/notifications/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "notifications.php"
  },
  {
    "name": "admin-oidc-providers",
    "path": "/api/admin/oidc/providers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "oidc.php"
  },
  {
    "name": "admin-oidc-providers-create",
    "path": "/api/admin/oidc/providers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "oidc.php"
  },
  {
    "name": "admin-oidc-providers-delete",
    "path": "/api/admin/oidc/providers/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "oidc.php"
  },
  {
    "name": "admin-oidc-providers-update",
    "path": "/api/admin/oidc/providers/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "oidc.php"
  },
  {
    "name": "admin-permissions",
    "path": "/api/admin/permissions",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "permissions.php"
  },
  {
    "name": "admin-permissions-create",
    "path": "/api/admin/permissions",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "permissions.php"
  },
  {
    "name": "admin-permissions-delete",
    "path": "/api/admin/permissions/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "permissions.php"
  },
  {
    "name": "admin-permissions-show",
    "path": "/api/admin/permissions/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "permissions.php"
  },
  {
    "name": "admin-permissions-update",
    "path": "/api/admin/permissions/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "permissions.php"
  },
  {
    "name": "admin-plugin-manager-create",
    "path": "/api/admin/plugin-manager",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugin-manager-list",
    "path": "/api/admin/plugin-manager",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugin-manager-flags",
    "path": "/api/admin/plugin-manager/flags",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugin-manager-get",
    "path": "/api/admin/plugin-manager/{identifier}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugin-manager-update",
    "path": "/api/admin/plugin-manager/{identifier}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugin-manager-settings",
    "path": "/api/admin/plugin-manager/{identifier}/settings",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugin-manager-validate",
    "path": "/api/admin/plugin-manager/{identifier}/validate",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugin-create-file",
    "path": "/api/admin/plugin-tools/create-file",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugin-creation-options",
    "path": "/api/admin/plugin-tools/creation-options",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugin-manager.php"
  },
  {
    "name": "admin-plugins",
    "path": "/api/admin/plugins",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-cloud-plugins-install",
    "path": "/api/admin/plugins/online/install",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud-plugins.php"
  },
  {
    "name": "admin-cloud-plugins-list",
    "path": "/api/admin/plugins/online/list",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud-plugins.php"
  },
  {
    "name": "admin-cloud-plugins-popular",
    "path": "/api/admin/plugins/online/popular",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud-plugins.php"
  },
  {
    "name": "admin-cloud-plugins-tag",
    "path": "/api/admin/plugins/online/tag/{tag}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud-plugins.php"
  },
  {
    "name": "admin-cloud-plugins-show",
    "path": "/api/admin/plugins/online/{identifier}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud-plugins.php"
  },
  {
    "name": "admin-cloud-plugins-check",
    "path": "/api/admin/plugins/online/{identifier}/check",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "cloud-plugins.php"
  },
  {
    "name": "admin-plugins-previously-installed",
    "path": "/api/admin/plugins/previously-installed",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-upload-install",
    "path": "/api/admin/plugins/upload/install",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-upload-install-url",
    "path": "/api/admin/plugins/upload/install-url",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-config",
    "path": "/api/admin/plugins/{identifier}/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-export",
    "path": "/api/admin/plugins/{identifier}/export",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-resync-symlinks",
    "path": "/api/admin/plugins/{identifier}/resync-symlinks",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-settings-remove",
    "path": "/api/admin/plugins/{identifier}/settings/remove",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-settings-set",
    "path": "/api/admin/plugins/{identifier}/settings/set",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-spell-restrictions",
    "path": "/api/admin/plugins/{identifier}/spell-restrictions",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-uninstall",
    "path": "/api/admin/plugins/{identifier}/uninstall",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-plugins-visibility",
    "path": "/api/admin/plugins/{identifier}/visibility",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "plugins.php"
  },
  {
    "name": "admin-pterodactyl-importer-import",
    "path": "/api/admin/pterodactyl-importer/import",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-allocation",
    "path": "/api/admin/pterodactyl-importer/import-allocation",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-backup",
    "path": "/api/admin/pterodactyl-importer/import-backup",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-egg",
    "path": "/api/admin/pterodactyl-importer/import-egg",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-node",
    "path": "/api/admin/pterodactyl-importer/import-node",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-schedule",
    "path": "/api/admin/pterodactyl-importer/import-schedule",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-server",
    "path": "/api/admin/pterodactyl-importer/import-server",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-server-database",
    "path": "/api/admin/pterodactyl-importer/import-server-database",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-ssh-key",
    "path": "/api/admin/pterodactyl-importer/import-ssh-key",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-subuser",
    "path": "/api/admin/pterodactyl-importer/import-subuser",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-task",
    "path": "/api/admin/pterodactyl-importer/import-task",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-import-user",
    "path": "/api/admin/pterodactyl-importer/import-user",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-pterodactyl-importer-prerequisites",
    "path": "/api/admin/pterodactyl-importer/prerequisites",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "pterodactyl-importer.php"
  },
  {
    "name": "admin-rate-limits",
    "path": "/api/admin/rate-limits",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "rate-limits.php"
  },
  {
    "name": "admin-rate-limits-bulk-update",
    "path": "/api/admin/rate-limits/bulk",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "rate-limits.php"
  },
  {
    "name": "admin-rate-limits-global",
    "path": "/api/admin/rate-limits/global",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "rate-limits.php"
  },
  {
    "name": "admin-rate-limits-delete",
    "path": "/api/admin/rate-limits/{routeName}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "rate-limits.php"
  },
  {
    "name": "admin-rate-limits-show",
    "path": "/api/admin/rate-limits/{routeName}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "rate-limits.php"
  },
  {
    "name": "admin-rate-limits-update",
    "path": "/api/admin/rate-limits/{routeName}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "rate-limits.php"
  },
  {
    "name": "admin-realms",
    "path": "/api/admin/realms",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "realms.php"
  },
  {
    "name": "admin-realms-create",
    "path": "/api/admin/realms",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "realms.php"
  },
  {
    "name": "admin-realms-delete",
    "path": "/api/admin/realms/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "realms.php"
  },
  {
    "name": "admin-realms-show",
    "path": "/api/admin/realms/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "realms.php"
  },
  {
    "name": "admin-realms-update",
    "path": "/api/admin/realms/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "realms.php"
  },
  {
    "name": "admin-roles",
    "path": "/api/admin/roles",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "roles.php"
  },
  {
    "name": "admin-roles-create",
    "path": "/api/admin/roles",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "roles.php"
  },
  {
    "name": "admin-roles-upload-badge-icon",
    "path": "/api/admin/roles/upload-badge-icon",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "roles.php"
  },
  {
    "name": "admin-roles-delete",
    "path": "/api/admin/roles/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "roles.php"
  },
  {
    "name": "admin-roles-show",
    "path": "/api/admin/roles/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "roles.php"
  },
  {
    "name": "admin-roles-update",
    "path": "/api/admin/roles/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "roles.php"
  },
  {
    "name": "admin-security-center",
    "path": "/api/admin/security-center",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "security-center.php"
  },
  {
    "name": "admin-security-center-update",
    "path": "/api/admin/security-center",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "security-center.php"
  },
  {
    "name": "admin-server-activities",
    "path": "/api/admin/server-activities",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers",
    "path": "/api/admin/servers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-create",
    "path": "/api/admin/servers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-show-by-external-id",
    "path": "/api/admin/servers/external/{externalId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-by-node",
    "path": "/api/admin/servers/node/{nodeId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-by-owner",
    "path": "/api/admin/servers/owner/{ownerId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-by-realm",
    "path": "/api/admin/servers/realm/{realmId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-by-spell",
    "path": "/api/admin/servers/spell/{spellId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-all-with-relations",
    "path": "/api/admin/servers/with-relations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-delete",
    "path": "/api/admin/servers/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-show",
    "path": "/api/admin/servers/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-update",
    "path": "/api/admin/servers/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-server-activities-by-server",
    "path": "/api/admin/servers/{id}/activities",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-allocations",
    "path": "/api/admin/servers/{id}/allocations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-allocations-assign",
    "path": "/api/admin/servers/{id}/allocations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-custom-variable-create",
    "path": "/api/admin/servers/{id}/custom-variables",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-custom-variable-delete",
    "path": "/api/admin/servers/{id}/custom-variables/{variableId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-hard-delete",
    "path": "/api/admin/servers/{id}/hard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-mounts-assignable",
    "path": "/api/admin/servers/{id}/mounts/assignable",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-reconcile",
    "path": "/api/admin/servers/{id}/reconcile",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-runtime",
    "path": "/api/admin/servers/{id}/runtime",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-suspend",
    "path": "/api/admin/servers/{id}/suspend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-transfer-cancel",
    "path": "/api/admin/servers/{id}/transfer",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-transfer-initiate",
    "path": "/api/admin/servers/{id}/transfer",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-transfer-status",
    "path": "/api/admin/servers/{id}/transfer",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-unsuspend",
    "path": "/api/admin/servers/{id}/unsuspend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-variables",
    "path": "/api/admin/servers/{id}/variables",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-warn",
    "path": "/api/admin/servers/{id}/warn",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-with-relations",
    "path": "/api/admin/servers/{id}/with-relations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-allocations-delete",
    "path": "/api/admin/servers/{serverId}/allocations/{allocationId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-servers-allocations-set-primary",
    "path": "/api/admin/servers/{serverId}/allocations/{allocationId}/primary",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "servers.php"
  },
  {
    "name": "admin-settings",
    "path": "/api/admin/settings",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-update",
    "path": "/api/admin/settings",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-backup-storage-test",
    "path": "/api/admin/settings/backup-storage/test",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-categories",
    "path": "/api/admin/settings/categories",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-category",
    "path": "/api/admin/settings/category/{category}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-chatbot-system-prompt",
    "path": "/api/admin/settings/chatbot/system-prompt",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-docker-update",
    "path": "/api/admin/settings/docker/update",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-email-test",
    "path": "/api/admin/settings/email/test",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-telemetry-status",
    "path": "/api/admin/settings/telemetry/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-upload-image",
    "path": "/api/admin/settings/upload-image",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-settings-show",
    "path": "/api/admin/settings/{setting}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "settings.php"
  },
  {
    "name": "admin-setup-complete",
    "path": "/api/admin/setup/complete",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "setup.php"
  },
  {
    "name": "admin-setup-reset",
    "path": "/api/admin/setup/reset",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "setup.php"
  },
  {
    "name": "admin-setup-status",
    "path": "/api/admin/setup/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "setup.php"
  },
  {
    "name": "admin-spell-variables-delete",
    "path": "/api/admin/spell-variables/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spell-variables-update",
    "path": "/api/admin/spell-variables/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells",
    "path": "/api/admin/spells",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-create",
    "path": "/api/admin/spells",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-import",
    "path": "/api/admin/spells/import",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-online-install",
    "path": "/api/admin/spells/online/install",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-online-list",
    "path": "/api/admin/spells/online/list",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-by-realm",
    "path": "/api/admin/spells/realm/{realmId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-reorder",
    "path": "/api/admin/spells/reorder",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-delete",
    "path": "/api/admin/spells/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-show",
    "path": "/api/admin/spells/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-update",
    "path": "/api/admin/spells/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spells-export",
    "path": "/api/admin/spells/{id}/export",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spell-variables-create",
    "path": "/api/admin/spells/{spellId}/variables",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-spell-variables-list",
    "path": "/api/admin/spells/{spellId}/variables",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "spells.php"
  },
  {
    "name": "admin-storage-sense-summary",
    "path": "/api/admin/storage-sense",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "storage-sense.php"
  },
  {
    "name": "admin-storage-sense-purge",
    "path": "/api/admin/storage-sense/purge",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "storage-sense.php"
  },
  {
    "name": "admin-storage-sense-purge-batch",
    "path": "/api/admin/storage-sense/purge-batch",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "storage-sense.php"
  },
  {
    "name": "admin-subdomains-create",
    "path": "/api/admin/subdomains",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "subdomains.php"
  },
  {
    "name": "admin-subdomains-index",
    "path": "/api/admin/subdomains",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "subdomains.php"
  },
  {
    "name": "admin-subdomains-settings",
    "path": "/api/admin/subdomains/settings",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "subdomains.php"
  },
  {
    "name": "admin-subdomains-spells",
    "path": "/api/admin/subdomains/spells",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "subdomains.php"
  },
  {
    "name": "admin-subdomains-delete",
    "path": "/api/admin/subdomains/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "subdomains.php"
  },
  {
    "name": "admin-subdomains-show",
    "path": "/api/admin/subdomains/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "subdomains.php"
  },
  {
    "name": "admin-subdomains-update",
    "path": "/api/admin/subdomains/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "subdomains.php"
  },
  {
    "name": "admin-subdomains-subdomain-list",
    "path": "/api/admin/subdomains/{uuid}/subdomains",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "subdomains.php"
  },
  {
    "name": "admin-tickets",
    "path": "/api/admin/tickets",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-tickets-create",
    "path": "/api/admin/tickets",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-categories",
    "path": "/api/admin/tickets/categories",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-categories-create",
    "path": "/api/admin/tickets/categories",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-categories-upload-icon",
    "path": "/api/admin/tickets/categories/upload-icon",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-categories-delete",
    "path": "/api/admin/tickets/categories/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-categories-show",
    "path": "/api/admin/tickets/categories/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-categories-update",
    "path": "/api/admin/tickets/categories/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-priorities",
    "path": "/api/admin/tickets/priorities",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-priorities-create",
    "path": "/api/admin/tickets/priorities",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-priorities-delete",
    "path": "/api/admin/tickets/priorities/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-priorities-show",
    "path": "/api/admin/tickets/priorities/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-priorities-update",
    "path": "/api/admin/tickets/priorities/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-statuses",
    "path": "/api/admin/tickets/statuses",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-statuses-create",
    "path": "/api/admin/tickets/statuses",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-statuses-delete",
    "path": "/api/admin/tickets/statuses/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-statuses-show",
    "path": "/api/admin/tickets/statuses/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-statuses-update",
    "path": "/api/admin/tickets/statuses/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-tickets-delete",
    "path": "/api/admin/tickets/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-tickets-show",
    "path": "/api/admin/tickets/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-tickets-update",
    "path": "/api/admin/tickets/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-attachments-index",
    "path": "/api/admin/tickets/{uuid}/attachments",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-attachments-upload",
    "path": "/api/admin/tickets/{uuid}/attachments",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-attachments-delete",
    "path": "/api/admin/tickets/{uuid}/attachments/{attachmentId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-tickets-close",
    "path": "/api/admin/tickets/{uuid}/close",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-messages",
    "path": "/api/admin/tickets/{uuid}/messages",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-messages-create",
    "path": "/api/admin/tickets/{uuid}/messages",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-messages-delete",
    "path": "/api/admin/tickets/{uuid}/messages/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-messages-show",
    "path": "/api/admin/tickets/{uuid}/messages/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-ticket-messages-update",
    "path": "/api/admin/tickets/{uuid}/messages/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-tickets-reopen",
    "path": "/api/admin/tickets/{uuid}/reopen",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-tickets-reply",
    "path": "/api/admin/tickets/{uuid}/reply",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "tickets.php"
  },
  {
    "name": "admin-translations-list",
    "path": "/api/admin/translations",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-enabled-get",
    "path": "/api/admin/translations/enabled",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-enabled-set",
    "path": "/api/admin/translations/enabled",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-upload",
    "path": "/api/admin/translations/upload",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-create",
    "path": "/api/admin/translations/{lang}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-delete",
    "path": "/api/admin/translations/{lang}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-get",
    "path": "/api/admin/translations/{lang}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-update",
    "path": "/api/admin/translations/{lang}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-disable",
    "path": "/api/admin/translations/{lang}/disable",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-download",
    "path": "/api/admin/translations/{lang}/download",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-translations-enable",
    "path": "/api/admin/translations/{lang}/enable",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "translations.php"
  },
  {
    "name": "admin-users",
    "path": "/api/admin/users",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-create",
    "path": "/api/admin/users",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-alt-detection-reset",
    "path": "/api/admin/users/alt-detection/reset",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-show-by-external-id",
    "path": "/api/admin/users/external/{externalId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-server-request",
    "path": "/api/admin/users/serverRequest/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-delete",
    "path": "/api/admin/users/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-show",
    "path": "/api/admin/users/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-update",
    "path": "/api/admin/users/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-ban",
    "path": "/api/admin/users/{uuid}/ban",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-clear-devices",
    "path": "/api/admin/users/{uuid}/devices",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-impersonate",
    "path": "/api/admin/users/{uuid}/impersonate",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "impersonation.php"
  },
  {
    "name": "admin-users-resend-mail",
    "path": "/api/admin/users/{uuid}/mails/{id}/resend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-potential-alts",
    "path": "/api/admin/users/{uuid}/potential-alts",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-send-email",
    "path": "/api/admin/users/{uuid}/send-email",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-owned-servers",
    "path": "/api/admin/users/{uuid}/servers",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-user-sessions",
    "path": "/api/admin/users/{uuid}/sessions",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "user-sessions.php"
  },
  {
    "name": "admin-user-sessions-revoke-all",
    "path": "/api/admin/users/{uuid}/sessions/revoke-all",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "user-sessions.php"
  },
  {
    "name": "admin-user-session-revoke",
    "path": "/api/admin/users/{uuid}/sessions/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "user-sessions.php"
  },
  {
    "name": "admin-users-sso-token",
    "path": "/api/admin/users/{uuid}/sso-token",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-unban",
    "path": "/api/admin/users/{uuid}/unban",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-verify-email",
    "path": "/api/admin/users/{uuid}/verify-email",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-users-owned-vm-instances",
    "path": "/api/admin/users/{uuid}/vm-instances",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "users.php"
  },
  {
    "name": "admin-vm-capacity",
    "path": "/api/admin/vm-capacity",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_VM_INSTANCES_VIEW",
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-create",
    "path": "/api/admin/vm-instances",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-index",
    "path": "/api/admin/vm-instances",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-backup-status",
    "path": "/api/admin/vm-instances/backup-status/{backupId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-creation-status",
    "path": "/api/admin/vm-instances/creation-status/{creationId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-reinstall-status",
    "path": "/api/admin/vm-instances/reinstall-status/{reinstallId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-restore-status",
    "path": "/api/admin/vm-instances/restore-status/{restoreId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-task-status",
    "path": "/api/admin/vm-instances/task-status/{taskId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-delete",
    "path": "/api/admin/vm-instances/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-show",
    "path": "/api/admin/vm-instances/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-update",
    "path": "/api/admin/vm-instances/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-activities",
    "path": "/api/admin/vm-instances/{id}/activities",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-backup-limit",
    "path": "/api/admin/vm-instances/{id}/backup-limit",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-backup-create",
    "path": "/api/admin/vm-instances/{id}/backups",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-backup-delete",
    "path": "/api/admin/vm-instances/{id}/backups",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-backups-list",
    "path": "/api/admin/vm-instances/{id}/backups",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-restore-backup",
    "path": "/api/admin/vm-instances/{id}/backups/restore",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-backup-recover",
    "path": "/api/admin/vm-instances/{id}/backups/{backupId}/recover",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-config",
    "path": "/api/admin/vm-instances/{id}/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-create-disk",
    "path": "/api/admin/vm-instances/{id}/disks",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-delete-disk",
    "path": "/api/admin/vm-instances/{id}/disks/{key}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-hard-delete",
    "path": "/api/admin/vm-instances/{id}/hard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-migrate",
    "path": "/api/admin/vm-instances/{id}/migrate",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-power",
    "path": "/api/admin/vm-instances/{id}/power",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-reinstall",
    "path": "/api/admin/vm-instances/{id}/reinstall",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-resize-disk",
    "path": "/api/admin/vm-instances/{id}/resize-disk",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-status",
    "path": "/api/admin/vm-instances/{id}/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-suspend",
    "path": "/api/admin/vm-instances/{id}/suspend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-unsuspend",
    "path": "/api/admin/vm-instances/{id}/unsuspend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-instances-vnc-ticket",
    "path": "/api/admin/vm-instances/{id}/vnc-ticket",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-instances.php"
  },
  {
    "name": "admin-vm-isos-create",
    "path": "/api/admin/vm-isos",
    "methods": [
      "POST"
    ],
    "permission": "ADMIN_VM_NODES_EDIT",
    "file": "vm-isos.php"
  },
  {
    "name": "admin-vm-isos-index",
    "path": "/api/admin/vm-isos",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_VM_NODES_VIEW",
    "file": "vm-isos.php"
  },
  {
    "name": "admin-vm-isos-scan",
    "path": "/api/admin/vm-isos/scan",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_VM_NODES_VIEW",
    "file": "vm-isos.php"
  },
  {
    "name": "admin-vm-isos-delete",
    "path": "/api/admin/vm-isos/{id}",
    "methods": [
      "DELETE"
    ],
    "permission": "ADMIN_VM_NODES_EDIT",
    "file": "vm-isos.php"
  },
  {
    "name": "admin-vm-isos-update",
    "path": "/api/admin/vm-isos/{id}",
    "methods": [
      "PATCH"
    ],
    "permission": "ADMIN_VM_NODES_EDIT",
    "file": "vm-isos.php"
  },
  {
    "name": "admin-vm-isos-approve",
    "path": "/api/admin/vm-isos/{id}/approve",
    "methods": [
      "POST"
    ],
    "permission": "ADMIN_VM_NODES_EDIT",
    "file": "vm-isos.php"
  },
  {
    "name": "admin-vm-isos-reject",
    "path": "/api/admin/vm-isos/{id}/reject",
    "methods": [
      "POST"
    ],
    "permission": "ADMIN_VM_NODES_EDIT",
    "file": "vm-isos.php"
  },
  {
    "name": "admin-vm-nodes",
    "path": "/api/admin/vm-nodes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-create",
    "path": "/api/admin/vm-nodes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-delete",
    "path": "/api/admin/vm-nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-show",
    "path": "/api/admin/vm-nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-update",
    "path": "/api/admin/vm-nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-backup-storage",
    "path": "/api/admin/vm-nodes/{id}/backup-storage",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-bridges",
    "path": "/api/admin/vm-nodes/{id}/bridges",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-cluster-nodes",
    "path": "/api/admin/vm-nodes/{id}/cluster-nodes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-feathertail-leases-assign",
    "path": "/api/admin/vm-nodes/{id}/feathertail/leases",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-feathertail-leases-list",
    "path": "/api/admin/vm-nodes/{id}/feathertail/leases",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-feathertail-leases-delete",
    "path": "/api/admin/vm-nodes/{id}/feathertail/leases/vm/{vmid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-feathertail-reset-token",
    "path": "/api/admin/vm-nodes/{id}/feathertail/reset-token",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-feathertail-test",
    "path": "/api/admin/vm-nodes/{id}/feathertail/test",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-firewall",
    "path": "/api/admin/vm-nodes/{id}/firewall",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-firewall-options",
    "path": "/api/admin/vm-nodes/{id}/firewall/options",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-firewall-rules-create",
    "path": "/api/admin/vm-nodes/{id}/firewall/rules",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-firewall-rules-delete",
    "path": "/api/admin/vm-nodes/{id}/firewall/rules/{pos}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-free-ips",
    "path": "/api/admin/vm-nodes/{id}/free-ips",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-info",
    "path": "/api/admin/vm-nodes/{id}/info",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-ips-create",
    "path": "/api/admin/vm-nodes/{id}/ips",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-ips-index",
    "path": "/api/admin/vm-nodes/{id}/ips",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-ips-delete",
    "path": "/api/admin/vm-nodes/{id}/ips/{ipId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-ips-update",
    "path": "/api/admin/vm-nodes/{id}/ips/{ipId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-ips-set-primary",
    "path": "/api/admin/vm-nodes/{id}/ips/{ipId}/primary",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-iso-storage",
    "path": "/api/admin/vm-nodes/{id}/iso-storage",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-proxmox-vms",
    "path": "/api/admin/vm-nodes/{id}/proxmox-vms",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-setup-command",
    "path": "/api/admin/vm-nodes/{id}/setup-command",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-storage",
    "path": "/api/admin/vm-nodes/{id}/storage",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-templates",
    "path": "/api/admin/vm-nodes/{id}/templates",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-templates-create",
    "path": "/api/admin/vm-nodes/{id}/templates",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-nodes-test-connection",
    "path": "/api/admin/vm-nodes/{id}/test-connection",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-nodes.php"
  },
  {
    "name": "admin-vm-templates-delete",
    "path": "/api/admin/vm-templates/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-templates.php"
  },
  {
    "name": "admin-vm-templates-update",
    "path": "/api/admin/vm-templates/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "vm-templates.php"
  },
  {
    "name": "admin-web-nodes",
    "path": "/api/admin/web-nodes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-create",
    "path": "/api/admin/web-nodes",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-delete",
    "path": "/api/admin/web-nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-show",
    "path": "/api/admin/web-nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-update",
    "path": "/api/admin/web-nodes/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-config",
    "path": "/api/admin/web-nodes/{id}/config",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-diagnostics",
    "path": "/api/admin/web-nodes/{id}/diagnostics",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-health",
    "path": "/api/admin/web-nodes/{id}/health",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-packages",
    "path": "/api/admin/web-nodes/{id}/packages",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-packages-socket",
    "path": "/api/admin/web-nodes/{id}/packages/socket",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-packages-install",
    "path": "/api/admin/web-nodes/{id}/packages/{packageId}/install",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-packages-remove",
    "path": "/api/admin/web-nodes/{id}/packages/{packageId}/remove",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-reset-token",
    "path": "/api/admin/web-nodes/{id}/reset-token",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-self-update",
    "path": "/api/admin/web-nodes/{id}/self-update",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-setup-command",
    "path": "/api/admin/web-nodes/{id}/setup-command",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-system",
    "path": "/api/admin/web-nodes/{id}/system",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-system-logs",
    "path": "/api/admin/web-nodes/{id}/system-logs",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-system-log-file",
    "path": "/api/admin/web-nodes/{id}/system-logs/{file}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-utilization",
    "path": "/api/admin/web-nodes/{id}/utilization",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-web-nodes-version-status",
    "path": "/api/admin/web-nodes/{id}/version-status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "web-nodes.php"
  },
  {
    "name": "admin-webplates",
    "path": "/api/admin/webplates",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webplates.php"
  },
  {
    "name": "admin-webplates-create",
    "path": "/api/admin/webplates",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webplates.php"
  },
  {
    "name": "admin-webplates-delete",
    "path": "/api/admin/webplates/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webplates.php"
  },
  {
    "name": "admin-webplates-show",
    "path": "/api/admin/webplates/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webplates.php"
  },
  {
    "name": "admin-webplates-update",
    "path": "/api/admin/webplates/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webplates.php"
  },
  {
    "name": "admin-webspaces",
    "path": "/api/admin/webspaces",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-create",
    "path": "/api/admin/webspaces",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-hosting-maturity",
    "path": "/api/admin/webspaces/hosting-maturity",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-hosting-setup-wizard",
    "path": "/api/admin/webspaces/hosting-setup/wizard",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-infrastructure-readiness",
    "path": "/api/admin/webspaces/infrastructure-readiness",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-panel-webmail-install",
    "path": "/api/admin/webspaces/panel-webmail/install",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-delete",
    "path": "/api/admin/webspaces/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-show",
    "path": "/api/admin/webspaces/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-update",
    "path": "/api/admin/webspaces/{uuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-backup-create",
    "path": "/api/admin/webspaces/{uuid}/backup",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-backups",
    "path": "/api/admin/webspaces/{uuid}/backups",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-backup-import",
    "path": "/api/admin/webspaces/{uuid}/backups/import",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-backups-reconcile",
    "path": "/api/admin/webspaces/{uuid}/backups/reconcile",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-backup-delete",
    "path": "/api/admin/webspaces/{uuid}/backups/{backupUuid}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-backup-download",
    "path": "/api/admin/webspaces/{uuid}/backups/{backupUuid}/download",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-backup-files",
    "path": "/api/admin/webspaces/{uuid}/backups/{backupUuid}/files",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-backup-restore",
    "path": "/api/admin/webspaces/{uuid}/backups/{backupUuid}/restore",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-bandwidth-reset",
    "path": "/api/admin/webspaces/{uuid}/bandwidth/reset",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-check-dns",
    "path": "/api/admin/webspaces/{uuid}/dns-check",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-hosts",
    "path": "/api/admin/webspaces/{uuid}/dns/hosts",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-provision",
    "path": "/api/admin/webspaces/{uuid}/dns/provision",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-zones",
    "path": "/api/admin/webspaces/{uuid}/dns/zones",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-zones-link",
    "path": "/api/admin/webspaces/{uuid}/dns/zones",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-zones-unlink",
    "path": "/api/admin/webspaces/{uuid}/dns/zones/{zoneId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-records",
    "path": "/api/admin/webspaces/{uuid}/dns/zones/{zoneId}/records",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-records-create",
    "path": "/api/admin/webspaces/{uuid}/dns/zones/{zoneId}/records",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-records-delete",
    "path": "/api/admin/webspaces/{uuid}/dns/zones/{zoneId}/records/{recordId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-dns-records-update",
    "path": "/api/admin/webspaces/{uuid}/dns/zones/{zoneId}/records/{recordId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-install-abort",
    "path": "/api/admin/webspaces/{uuid}/install/abort",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-jwt",
    "path": "/api/admin/webspaces/{uuid}/jwt",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-logs",
    "path": "/api/admin/webspaces/{uuid}/logs",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-install-logs",
    "path": "/api/admin/webspaces/{uuid}/logs/install",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-power",
    "path": "/api/admin/webspaces/{uuid}/power",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-recreate-runtime",
    "path": "/api/admin/webspaces/{uuid}/recreate-runtime",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-reinstall",
    "path": "/api/admin/webspaces/{uuid}/reinstall",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-ssl",
    "path": "/api/admin/webspaces/{uuid}/ssl",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-ssl-custom",
    "path": "/api/admin/webspaces/{uuid}/ssl/custom",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-ssl-custom-delete",
    "path": "/api/admin/webspaces/{uuid}/ssl/custom",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-ssl-custom-upload",
    "path": "/api/admin/webspaces/{uuid}/ssl/custom",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-ssl-renew",
    "path": "/api/admin/webspaces/{uuid}/ssl/renew",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-status",
    "path": "/api/admin/webspaces/{uuid}/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-suspend",
    "path": "/api/admin/webspaces/{uuid}/suspend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-sync",
    "path": "/api/admin/webspaces/{uuid}/sync",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-transfer",
    "path": "/api/admin/webspaces/{uuid}/transfer",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-transfer-status",
    "path": "/api/admin/webspaces/{uuid}/transfer/status",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-webspaces-unsuspend",
    "path": "/api/admin/webspaces/{uuid}/unsuspend",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "webspaces.php"
  },
  {
    "name": "admin-wings-backups-destinations",
    "path": "/api/admin/wings-backups/destinations",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_WINGS_BACKUPS_VIEW",
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-destinations-create",
    "path": "/api/admin/wings-backups/destinations",
    "methods": [
      "PUT"
    ],
    "permission": "ADMIN_WINGS_BACKUPS_MANAGE",
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-destinations-delete",
    "path": "/api/admin/wings-backups/destinations/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-destinations-update",
    "path": "/api/admin/wings-backups/destinations/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-destinations-purge",
    "path": "/api/admin/wings-backups/destinations/{id}/purge",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-destinations-test",
    "path": "/api/admin/wings-backups/destinations/{id}/test",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-policies",
    "path": "/api/admin/wings-backups/policies",
    "methods": [
      "GET"
    ],
    "permission": "ADMIN_WINGS_BACKUPS_VIEW",
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-policies-create",
    "path": "/api/admin/wings-backups/policies",
    "methods": [
      "PUT"
    ],
    "permission": "ADMIN_WINGS_BACKUPS_MANAGE",
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-policies-delete",
    "path": "/api/admin/wings-backups/policies/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-policies-show",
    "path": "/api/admin/wings-backups/policies/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-policies-update",
    "path": "/api/admin/wings-backups/policies/{id}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-policies-run",
    "path": "/api/admin/wings-backups/policies/{id}/run",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-policies-runs",
    "path": "/api/admin/wings-backups/policies/{id}/runs",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  },
  {
    "name": "admin-wings-backups-policies-run-show",
    "path": "/api/admin/wings-backups/policies/{id}/runs/{runId}",
    "methods": [
      "GET"
    ],
    "permission": null,
    "file": "wings-backups.php"
  }
] as const;
