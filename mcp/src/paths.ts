/**
 * FeatherPanel / Wings file paths are relative to the server volume root ("/").
 * Inside the Docker container that root is /home/container — models often confuse
 * the two and write to /home/container/..., which creates literal home/container
 * folders on the volume.
 */

const CONTAINER_HOME = "/home/container";

/**
 * Normalize a panel/Wings filesystem path.
 * Strips a mistaken /home/container prefix and ensures a leading slash.
 */
export function normalizeServerPath(path: string | undefined | null): string {
  if (path == null || path === "") {
    return "/";
  }

  let p = path.trim().replace(/\\/g, "/");
  if (!p.startsWith("/")) {
    p = `/${p}`;
  }

  // Collapse duplicate slashes except we only need a clean absolute path
  p = p.replace(/\/+/g, "/");

  const lower = p.toLowerCase();
  if (lower === CONTAINER_HOME || lower === `${CONTAINER_HOME}/`) {
    return "/";
  }
  if (lower.startsWith(`${CONTAINER_HOME}/`)) {
    p = p.slice(CONTAINER_HOME.length) || "/";
    if (!p.startsWith("/")) {
      p = `/${p}`;
    }
  }

  // Also catch relative mistaken prefixes
  if (/^\/?home\/container(\/|$)/i.test(p)) {
    p = p.replace(/^\/?home\/container/i, "") || "/";
    if (!p.startsWith("/")) {
      p = `/${p}`;
    }
  }

  if (p === "") {
    return "/";
  }

  return p.replace(/\/+/g, "/") || "/";
}
