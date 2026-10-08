/**
 * Thin HTTP client for the FeatherPanel user API.
 */

import { getApiKey } from "./auth.js";
import { formatToolError, type ToolErrorContext } from "./errors.js";

export class FeatherPanelApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "FeatherPanelApiError";
  }
}

export type { ToolErrorContext };

export type ApiEnvelope<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: boolean;
  error_message?: string | null;
  error_code?: string | null;
};

function panelBaseUrl(): string {
  const raw = process.env.FEATHERPANEL_URL?.trim() || "http://localhost:4831";
  return raw.replace(/\/+$/, "");
}

export class FeatherPanelClient {
  constructor(private readonly apiKey: string) {}

  async request<T = unknown>(
    method: string,
    path: string,
    options: {
      query?: Record<string, string | number | boolean | undefined | null>;
      body?: unknown;
      rawBody?: string;
      rawResponse?: boolean;
      contentType?: string;
    } = {},
  ): Promise<T> {
    const url = new URL(
      path.startsWith("http") ? path : `${panelBaseUrl()}${path}`,
    );

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined || value === null || value === "") {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    headers.set("Accept", "application/json");

    let body: BodyInit | undefined;

    if (options.rawBody !== undefined) {
      body = options.rawBody;
      headers.set(
        "Content-Type",
        options.contentType || "text/plain; charset=utf-8",
      );
    } else if (options.body !== undefined) {
      body = JSON.stringify(options.body);
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (options.rawResponse) {
      if (!response.ok) {
        const text = await response.text();
        throw new FeatherPanelApiError(
          `HTTP ${response.status}: ${text.slice(0, 500)}`,
          response.status,
          text,
        );
      }
      return (await response.text()) as T;
    }

    const json = (await response
      .json()
      .catch(() => null)) as ApiEnvelope<T> | null;

    if (!response.ok || (json && json.success === false)) {
      const message =
        json?.error_message ||
        json?.message ||
        `FeatherPanel API error (${response.status})`;
      throw new FeatherPanelApiError(message, response.status, json);
    }

    return (json?.data ?? json) as T;
  }

  get<T = unknown>(
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
  ) {
    return this.request<T>("GET", path, { query });
  }

  post<T = unknown>(
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined | null>,
  ) {
    return this.request<T>("POST", path, { body, query });
  }

  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body });
  }

  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, { body });
  }

  delete<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("DELETE", path, { body });
  }

  getRaw(
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
  ) {
    return this.request<string>("GET", path, { query, rawResponse: true });
  }

  postRaw(
    path: string,
    rawBody: string,
    query?: Record<string, string | number | boolean | undefined | null>,
  ) {
    return this.request<unknown>("POST", path, {
      query,
      rawBody,
      contentType: "text/plain; charset=utf-8",
    });
  }
}

export function createClient(sessionId?: string): FeatherPanelClient {
  return new FeatherPanelClient(getApiKey(sessionId));
}

export function toolText(data: unknown): {
  content: [{ type: "text"; text: string }];
} {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function toolError(
  error: unknown,
  ctx: ToolErrorContext = {},
): {
  content: [{ type: "text"; text: string }];
  isError: true;
} {
  return {
    content: [{ type: "text", text: formatToolError(error, ctx) }],
    isError: true,
  };
}
