#!/usr/bin/env node
/**
 * FeatherPanel MCP — Streamable HTTP entry (Docker Compose default).
 *
 * Auth:
 * - OAuth 2.1 (DCR + PKCE) for Claude.ai custom connectors
 * - Static API key headers: Authorization: Bearer fp_… / x-api-key / x-auth-token
 */

import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  clearSessionApiKey,
  extractApiKeyFromHeaders,
  setSessionApiKey,
} from "./auth.js";
import { FeatherPanelClient } from "./client.js";
import { createFeatherPanelMcpServer } from "./server.js";
import { mountOAuthRoutes } from "./oauth/routes.js";
import { oauthProvider } from "./oauth/provider.js";
import { mcpResourceUrlFromRequest } from "./oauth/public-url.js";

const MCP_HOST = process.env.MCP_HOST?.trim() || "0.0.0.0";
const MCP_PORT = process.env.MCP_PORT
  ? Number.parseInt(process.env.MCP_PORT, 10)
  : 3001;
const FEATHERPANEL_URL =
  process.env.FEATHERPANEL_URL?.trim() || "http://backend:80";

// Local / HTTP installs need insecure issuer URLs for OAuth metadata
if (process.env.MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL === undefined) {
  process.env.MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL = "true";
}

type SessionEntry = {
  transport: StreamableHTTPServerTransport;
};

const sessions: Record<string, SessionEntry> = {};

const app = createMcpExpressApp({ host: MCP_HOST });

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "featherpanel-mcp",
    panel_url: FEATHERPANEL_URL,
    auth: ["oauth2", "bearer_api_key"],
  });
});

mountOAuthRoutes(app);

function sendUnauthorized(
  res: import("express").Response,
  message: string,
  resourceUrl: string,
): void {
  const origin = resourceUrl.replace(/\/mcp\/?$/, "");
  res.setHeader(
    "WWW-Authenticate",
    `Bearer realm="FeatherPanel MCP", resource_metadata="${origin}/.well-known/oauth-protected-resource", scope="mcp:tools"`,
  );
  res.status(401).json({
    jsonrpc: "2.0",
    error: {
      code: -32001,
      message,
    },
    id: null,
  });
}

async function resolveApiKeyFromRequest(
  req: import("express").Request,
): Promise<string | undefined> {
  const fromHeaders = extractApiKeyFromHeaders({
    authorization: req.headers.authorization,
    "x-api-key": req.headers["x-api-key"],
    "x-auth-token": req.headers["x-auth-token"],
  });
  if (!fromHeaders) {
    return undefined;
  }

  // OAuth access tokens (atk_…) or raw fp_ keys
  try {
    const authInfo = await oauthProvider.verifyAccessToken(fromHeaders);
    const mapped = authInfo.extra?.apiKey;
    if (typeof mapped === "string" && mapped.length > 0) {
      return mapped;
    }
  } catch {
    // If it looks like an OAuth token, don't fall through as a panel key
    if (fromHeaders.startsWith("atk_") || fromHeaders.startsWith("rtk_")) {
      return undefined;
    }
  }

  if (fromHeaders.startsWith("fp_")) {
    return fromHeaders;
  }

  return fromHeaders;
}

async function validateApiKey(apiKey: string): Promise<void> {
  const client = new FeatherPanelClient(apiKey);
  await client.get("/api/user/session");
}

const mcpPostHandler = async (
  req: import("express").Request,
  res: import("express").Response,
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions[sessionId]) {
      // Claude sends Authorization on every tools/call — keep session API key fresh
      // (covers token refresh and MCP restarts that restored OAuth store but not sessions).
      const apiKey = await resolveApiKeyFromRequest(req);
      if (apiKey) {
        setSessionApiKey(sessionId, apiKey);
      }
      transport = sessions[sessionId].transport;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const apiKey = await resolveApiKeyFromRequest(req);
      if (!apiKey) {
        sendUnauthorized(
          res,
          "Unauthorized: connect via OAuth or send Authorization: Bearer <featherpanel_api_key>",
          mcpResourceUrlFromRequest(req),
        );
        return;
      }

      try {
        await validateApiKey(apiKey);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid API key";
        sendUnauthorized(
          res,
          `Unauthorized: ${message}`,
          mcpResourceUrlFromRequest(req),
        );
        return;
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          setSessionApiKey(newSessionId, apiKey);
          sessions[newSessionId] = { transport };
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && sessions[sid]) {
          clearSessionApiKey(sid);
          delete sessions[sid];
        }
      };

      const server = createFeatherPanelMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else if (sessionId && !sessions[sessionId]) {
      // Stale Claude session after MCP restart — ask client to re-initialize
      sendUnauthorized(
        res,
        "MCP session expired (server restarted). Disconnect and Connect the connector again in Claude.",
        mcpResourceUrlFromRequest(req),
      );
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
};

const mcpGetHandler = async (
  req: import("express").Request,
  res: import("express").Response,
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await sessions[sessionId].transport.handleRequest(req, res);
};

const mcpDeleteHandler = async (
  req: import("express").Request,
  res: import("express").Response,
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  try {
    await sessions[sessionId].transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling session termination:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing session termination");
    }
  }
};

app.post("/mcp", mcpPostHandler);
app.get("/mcp", mcpGetHandler);
app.delete("/mcp", mcpDeleteHandler);

app.post("/mcp/", mcpPostHandler);
app.get("/mcp/", mcpGetHandler);
app.delete("/mcp/", mcpDeleteHandler);

app.listen(MCP_PORT, MCP_HOST, (error?: Error) => {
  if (error) {
    console.error("Failed to start FeatherPanel MCP server:", error);
    process.exit(1);
  }
  console.log(
    `FeatherPanel MCP listening on http://${MCP_HOST}:${MCP_PORT}/mcp`,
  );
  console.log(`Panel API: ${FEATHERPANEL_URL}`);
  console.log("Auth: OAuth2 (DCR+PKCE) + Bearer API keys");
});

process.on("SIGINT", async () => {
  for (const sessionId of Object.keys(sessions)) {
    try {
      await sessions[sessionId].transport.close();
      clearSessionApiKey(sessionId);
      delete sessions[sessionId];
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }
  process.exit(0);
});
