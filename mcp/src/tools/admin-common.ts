/**
 * Shared helpers for admin MCP tools.
 * Admin tools are only registered when the API key's user has at least one
 * `admin.*` permission (see resolveAdminAccess). Each /api/admin/* call is
 * still enforced by AdminMiddleware + the route's permission node.
 */

import { FeatherPanelClient } from "../client.js";

export type AdminAccess = {
  enabled: boolean;
  permissions: string[];
  hasRoot: boolean;
};

type SessionPayload = {
  permissions?: unknown;
  user?: { permissions?: unknown };
};

function asPermissionList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** True when the session has any admin.* node (including admin.root). */
export function permissionsGrantAdmin(permissions: string[]): boolean {
  return permissions.some(
    (p) => p === "admin.root" || p.startsWith("admin."),
  );
}

export async function resolveAdminAccess(
  client: FeatherPanelClient,
): Promise<AdminAccess> {
  try {
    const data = await client.get<SessionPayload>("/api/user/session");
    const permissions = asPermissionList(
      data.permissions ?? data.user?.permissions,
    );
    const hasRoot = permissions.includes("admin.root");
    return {
      enabled: permissionsGrantAdmin(permissions),
      permissions,
      hasRoot,
    };
  } catch (error) {
    console.error(
      "FeatherPanel MCP: failed to resolve admin access; admin tools disabled:",
      error instanceof Error ? error.message : error,
    );
    return { enabled: false, permissions: [], hasRoot: false };
  }
}

const ADMIN_PATH_RE = /^\/api\/admin(?:\/|$)/;

/** Normalize and validate an admin API path (no traversal / open redirects). */
export function assertAdminApiPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error("Admin API path must start with / (e.g. /api/admin/users)");
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    throw new Error("Admin API path is not valid URI encoding");
  }
  if (decoded.includes("..") || decoded.includes("\\")) {
    throw new Error("Admin API path must not contain .. or backslashes");
  }
  if (!ADMIN_PATH_RE.test(decoded)) {
    throw new Error(
      "Admin API path must be under /api/admin/ (panel admin REST only)",
    );
  }
  // Strip query/hash if the model stuffed them into path
  const noHash = decoded.split("#", 1)[0] ?? decoded;
  const pathOnly = noHash.split("?", 1)[0] ?? noHash;
  if (!ADMIN_PATH_RE.test(pathOnly)) {
    throw new Error("Admin API path must be under /api/admin/");
  }
  return pathOnly;
}

export const ADMIN_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const;

export type AdminHttpMethod = (typeof ADMIN_HTTP_METHODS)[number];
