/**
 * Turn panel/Wings failures into actionable guidance for AI clients.
 * Operational failures (bad URL, corrupt jar, offline container) must not
 * look like "the panel/node is broken" — that causes Claude to give up.
 */

export type ToolErrorContext = {
  tool?: string;
  url?: string;
  server_id?: string;
  action?: string;
  path?: string;
};

type Guidance = {
  diagnosis: string;
  next_steps: string[];
};

type ApiErrorLike = {
  message: string;
  status: number;
  body: unknown;
};

function asApiError(error: unknown): ApiErrorLike | null {
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: string }).name === "FeatherPanelApiError" &&
    "message" in error &&
    "status" in error &&
    "body" in error
  ) {
    return error as ApiErrorLike;
  }
  return null;
}

function extractBodyFields(body: unknown): {
  error_code?: string;
  hint?: string;
  wings_request_id?: string;
  wings_status?: number | string;
  next_steps?: string[];
  requested_url?: string;
} {
  if (!body || typeof body !== "object") {
    return {};
  }
  const obj = body as Record<string, unknown>;
  const data =
    obj.data && typeof obj.data === "object"
      ? (obj.data as Record<string, unknown>)
      : {};

  const nextSteps = Array.isArray(data.next_steps)
    ? data.next_steps.filter((s): s is string => typeof s === "string")
    : undefined;

  return {
    error_code: typeof obj.error_code === "string" ? obj.error_code : undefined,
    hint: typeof data.hint === "string" ? data.hint : undefined,
    wings_request_id:
      data.wings_request_id != null ? String(data.wings_request_id) : undefined,
    wings_status:
      data.wings_status != null
        ? (data.wings_status as number | string)
        : undefined,
    next_steps: nextSteps?.length ? nextSteps : undefined,
    requested_url:
      typeof data.requested_url === "string" ? data.requested_url : undefined,
  };
}

function guidanceForMessage(
  message: string,
  ctx: ToolErrorContext,
): Guidance | null {
  const m = message.toLowerCase();
  const url = ctx.url ?? "";

  if (
    m.includes("no such host") ||
    m.includes("name or service not known") ||
    m.includes("could not resolve") ||
    (m.includes("dns") && m.includes("failure")) ||
    m.includes("network/dns/tls failure") ||
    m.includes("dns lookup failed")
  ) {
    const steps = [
      "The Wings node could not resolve or reach the hostname in the URL — this is almost always a bad/dead download host, not a FeatherPanel outage.",
      "Retry pull_file with a different direct file URL (CDN object URL, fill-data.papermc.io object URL, GitHub release asset, etc.).",
    ];
    if (url.includes("download.getbukkit.org")) {
      steps.push(
        "download.getbukkit.org often does not resolve. Prefer https://cdn.getbukkit.org/spigot/spigot-<version>.jar (pinned version), or better: Paper via fill.papermc.io / fill-data.papermc.io.",
      );
    }
    if (url.includes("getbukkit.org") || ctx.tool === "pull_file") {
      steps.push(
        'For Paper: resolve a jar URL from https://fill.papermc.io/v3/projects/paper/versions/<mc>/builds/latest (downloads["server:default"].url) then pull that URL. Do NOT use api.papermc.io/v2 (sunset).',
      );
    }
    steps.push(
      "After a successful pull, verify with get_files that server.jar is large (tens of MB), not a tiny JSON/HTML error body.",
    );
    return {
      diagnosis:
        "Remote hostname DNS/network failure from the Wings node (bad URL/dead host). Panel and node are fine.",
      next_steps: steps,
    };
  }

  if (
    m.includes("tls") ||
    m.includes("certificate") ||
    m.includes("x509") ||
    m.includes("handshake")
  ) {
    return {
      diagnosis:
        "TLS/certificate failure talking to the remote download host (not a Wings crash).",
      next_steps: [
        "Use an HTTPS URL with a valid public certificate.",
        "Try an alternate mirror/CDN URL for the same file.",
      ],
    };
  }

  if (m.includes("html page") || m.includes("content-length")) {
    return {
      diagnosis:
        "URL returned an HTML page or omitted Content-Length — not a direct binary download.",
      next_steps: [
        "Use a final CDN/object URL that serves the real file type with Content-Length.",
        "Avoid browser landing pages and /download buttons that only work in a browser.",
        "Pass fileName explicitly (e.g. server.jar).",
      ],
    };
  }

  if (
    m.includes("remote url returned an error status") ||
    m.includes("bad response status")
  ) {
    return {
      diagnosis:
        "The remote host responded with an HTTP error for this URL (dead link / wrong path / API sunset).",
      next_steps: [
        "Pick a different direct URL. For Paper, api.papermc.io/v2 is sunset — use fill.papermc.io v3 and pull the downloads['server:default'].url.",
        "If you already pulled a tiny server.jar, delete it and pull again; a JSON error body saved as .jar will crash the server.",
      ],
    };
  }

  if (
    m.includes("no such container") ||
    m.includes("container is not running") ||
    m.includes("crashed or not started")
  ) {
    return {
      diagnosis:
        "Docker container is not running (often exited immediately after start). Not a power-API failure by itself.",
      next_steps: [
        "Call get_server_logs / get_install_logs to see why the process exited (e.g. Invalid or corrupt jarfile).",
        "If server.jar is tiny JSON/HTML, delete it and pull a real jar, then start again.",
        "Power start can succeed then crash — check logs before assuming Wings is broken.",
      ],
    };
  }

  if (
    m.includes("corrupt jar") ||
    m.includes("invalid or corrupt") ||
    m.includes("paper-null-null")
  ) {
    return {
      diagnosis:
        "Minecraft jar is missing or corrupt (often a failed install saved an API error JSON as server.jar).",
      next_steps: [
        "Delete the bad server.jar, pull a real jar from a working mirror, then start.",
        "Paper egg installs that still call api.papermc.io/v2 will fail (API sunset) — pull via fill.papermc.io instead of relying on reinstall alone.",
      ],
    };
  }

  if (
    m.includes("internal") &&
    (m.includes("blocked") || m.includes("denied"))
  ) {
    return {
      diagnosis:
        "URL resolved to a private/internal address blocked by Wings SSRF protection.",
      next_steps: [
        "Only pull public https URLs. Do not use localhost, RFC1918, or link-local addresses.",
      ],
    };
  }

  if (m.includes("denylist") || m.includes("cannot be modified")) {
    return {
      diagnosis: "Path is blocked by the egg file denylist.",
      next_steps: [
        "Choose a different destination path/filename allowed by the egg.",
      ],
    };
  }

  if (ctx.tool === "pull_file") {
    return {
      diagnosis:
        "pull_file failed for this specific URL/path. Treat as a download-URL problem unless the message clearly says auth/permission/node unreachable.",
      next_steps: [
        "Retry with another direct file URL.",
        "Confirm with get_files that the destination directory exists.",
        "Do not conclude the panel or Wings node is down from a single pull failure.",
      ],
    };
  }

  if (ctx.tool === "update_server") {
    return {
      diagnosis:
        "Server settings update was rejected by the panel API (permissions, admin flags, or invalid image/variable).",
      next_steps: [
        "Call get_server_startup and only use allowed_docker_images for image / Java version changes.",
        "Only change editable_variables; name/startup/image need the matching subuser permissions.",
        "If error is INVALID_DOCKER_IMAGE or STARTUP_CHANGE_DISABLED, pick an allowed image or skip startup edits — do not invent custom tags.",
      ],
    };
  }

  if (ctx.tool === "server_power_action") {
    return {
      diagnosis:
        "Power action request failed or a follow-up status/logs call failed. Start can still have been accepted.",
      next_steps: [
        "Check get_server_details / get_server_logs for current state and crash reason.",
        "If the jar is corrupt, fix files first, then start again.",
      ],
    };
  }

  if (
    m.includes("invalid_docker_image") ||
    m.includes("must be one of the images")
  ) {
    return {
      diagnosis:
        "Docker image is not in the spell allow-list (Java/runtime yolks).",
      next_steps: [
        "Call get_server_startup and set image to one of allowed_docker_images.",
        "Do not invent image tags unless the panel admin enabled custom Docker images.",
      ],
    };
  }

  return null;
}

/**
 * Format an error for MCP tool results so Claude sees cause + recovery path.
 */
export function formatToolError(
  error: unknown,
  ctx: ToolErrorContext = {},
): string {
  const lines: string[] = [];
  lines.push("TOOL_ERROR (operational — read diagnosis and keep going)");
  lines.push(
    "Do NOT tell the user FeatherPanel/Wings is broken unless the error explicitly says the node/daemon is unreachable or unauthorized.",
  );

  const apiErr = asApiError(error);
  let message: string;
  const fields = apiErr ? extractBodyFields(apiErr.body) : {};

  if (apiErr) {
    message = apiErr.message;
    lines.push(`error: ${message}`);
    lines.push(`http_status: ${apiErr.status}`);
    if (fields.error_code) {
      lines.push(`error_code: ${fields.error_code}`);
    }
    if (fields.wings_request_id) {
      lines.push(`wings_request_id: ${fields.wings_request_id}`);
    }
    if (fields.wings_status != null) {
      lines.push(`wings_status: ${fields.wings_status}`);
    }
    if (fields.hint) {
      lines.push(`panel_hint: ${fields.hint}`);
    }
  } else if (error instanceof Error) {
    message = error.message;
    lines.push(`error: ${message}`);
  } else {
    message = String(error);
    lines.push(`error: ${message}`);
  }

  if (ctx.tool) {
    lines.push(`tool: ${ctx.tool}`);
  }
  if (ctx.server_id) {
    lines.push(`server_id: ${ctx.server_id}`);
  }
  const requestedUrl = ctx.url || fields.requested_url;
  if (requestedUrl) {
    lines.push(`requested_url: ${requestedUrl}`);
  }
  if (ctx.action) {
    lines.push(`action: ${ctx.action}`);
  }
  if (ctx.path) {
    lines.push(`path: ${ctx.path}`);
  }

  const guidance = guidanceForMessage(message, {
    ...ctx,
    url: requestedUrl,
  });
  if (guidance) {
    lines.push("");
    lines.push(`diagnosis: ${guidance.diagnosis}`);
    lines.push("next_steps:");
    for (const step of guidance.next_steps) {
      lines.push(`- ${step}`);
    }
  } else {
    lines.push("");
    lines.push(
      `diagnosis: ${fields.hint || "Request failed. Use the error text to adjust arguments and retry."}`,
    );
    lines.push("next_steps:");
    const steps = fields.next_steps ?? [
      "Adjust the request based on the error text and retry.",
      "Prefer alternate URLs/paths before assuming infrastructure failure.",
    ];
    for (const step of steps) {
      lines.push(`- ${step}`);
    }
  }

  lines.push("");
  lines.push(
    "If you can fix this by retrying with different arguments or another tool, do that now and report the outcome.",
  );

  return lines.join("\n");
}
