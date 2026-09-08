/**
 * OAuth HTTP routes: discovery, DCR, authorize, token, consent UI, panel callback.
 */

import express, { type Express, type Request, type Response } from "express";
import { authorizationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/authorize.js";
import { clientRegistrationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/register.js";
import { revocationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/revoke.js";
import { tokenHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/token.js";
import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import { oauthProvider } from "./provider.js";
import {
  issuerUrlFromRequest,
  mcpResourceUrlFromRequest,
  publicOriginFromRequest,
} from "./public-url.js";

const SCOPES = ["mcp:tools"];

function buildAsMetadata(req: Request): OAuthMetadata {
  const issuer = issuerUrlFromRequest(req);
  return {
    issuer: issuer.href.replace(/\/$/, ""),
    authorization_endpoint: new URL("/authorize", issuer).href,
    token_endpoint: new URL("/token", issuer).href,
    registration_endpoint: new URL("/register", issuer).href,
    revocation_endpoint: new URL("/revoke", issuer).href,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    revocation_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    scopes_supported: SCOPES,
    service_documentation: "https://github.com/mythicalltd/FeatherPanel",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pmaShellCss(): string {
  return `
    :root {
      --background: 0 0% 100%;
      --foreground: 0 0% 9%;
      --card: 0 0% 100%;
      --card-foreground: 0 0% 9%;
      --muted-foreground: 0 0% 45%;
      --border: 0 0% 90%;
      --primary: 262 83% 58%;
      --destructive: 0 84% 60%;
      --app-font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --background: 220 15% 6%;
        --foreground: 210 20% 98%;
        --card: 220 15% 9%;
        --card-foreground: 210 20% 98%;
        --muted-foreground: 0 0% 64%;
        --border: 220 15% 14%;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      font-family: var(--app-font-family);
      -webkit-font-smoothing: antialiased;
    }
    .shell { width: 100%; max-width: 28rem; }
    .brand-block { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .app-name { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; text-align: center; color: hsl(var(--foreground)); text-decoration: none; }
    .brand-subtitle { font-size: 0.8125rem; color: hsl(var(--muted-foreground)); text-align: center; margin-top: 0.25rem; }
    .card {
      background: hsl(var(--card) / 0.92);
      color: hsl(var(--card-foreground));
      border: 1px solid hsl(var(--border));
      border-radius: 1.5rem;
      padding: 2rem 1.75rem;
      box-shadow: 0 24px 48px hsl(var(--background) / 0.35);
    }
    .heading { font-size: 1.0625rem; font-weight: 600; margin-bottom: 0.5rem; letter-spacing: -0.01em; text-align: center; }
    .message { font-size: 0.875rem; color: hsl(var(--muted-foreground)); line-height: 1.55; text-align: center; margin-bottom: 1.25rem; }
    .fieldset { border: 1px solid hsl(var(--border)); border-radius: 1rem; padding: 0.85rem 1rem 1rem; margin: 0 0 0.85rem; }
    .fieldset legend { font-size: 0.75rem; font-weight: 600; padding: 0 0.35rem; color: hsl(var(--muted-foreground)); }
    table.form { width: 100%; border-collapse: collapse; }
    table.form th, table.form td { text-align: left; vertical-align: top; padding: 0.4rem 0; font-size: 0.8125rem; }
    table.form th { width: 6.5rem; color: hsl(var(--muted-foreground)); font-weight: 500; }
    input[type=password], input[type=text] {
      width: 100%;
      font: inherit;
      padding: 0.55rem 0.7rem;
      border-radius: 0.65rem;
      border: 1px solid hsl(var(--border));
      background: hsl(var(--background));
      color: hsl(var(--foreground));
    }
    .btn {
      display: inline-block;
      width: 100%;
      text-align: center;
      font: inherit;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0.7rem 1rem;
      border-radius: 0.75rem;
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
      margin-top: 0.5rem;
    }
    .btn-primary { background: hsl(var(--primary)); color: #fff; }
    .btn-primary:hover { filter: brightness(1.05); }
    .btn-secondary { background: transparent; color: hsl(var(--foreground)); border-color: hsl(var(--border)); }
    .note { font-size: 0.75rem; color: hsl(var(--muted-foreground)); margin-top: 0.65rem; line-height: 1.45; }
    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid hsl(var(--border));
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      text-align: center;
    }
    .footer a { color: hsl(var(--foreground)); text-decoration: underline; text-underline-offset: 2px; }
    .spinner {
      width: 2.75rem; height: 2.75rem; margin: 0 auto 1.25rem;
      border: 2px solid hsl(var(--border)); border-top-color: hsl(var(--primary));
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
}

function consentPageHtml(opts: {
  txn: string;
  clientName: string;
  panelAuthorizeUrl: string;
}): string {
  const clientName = escapeHtml(opts.clientName);
  const txn = escapeHtml(opts.txn);
  const panelUrl = escapeHtml(opts.panelAuthorizeUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MCP authorization - FeatherPanel</title>
  <style>${pmaShellCss()}</style>
</head>
<body>
  <div class="shell">
    <div class="brand-block">
      <div>
        <a class="app-name" href="/">FeatherPanel</a>
        <p class="brand-subtitle">MCP authorization</p>
      </div>
    </div>
    <div class="card">
      <h1 class="heading">${clientName}</h1>
      <p class="message">This client wants to manage servers through your FeatherPanel account via MCP.</p>

      <div class="fieldset">
        <legend>Option 1 — create API key</legend>
        <p class="note">Sign in to FeatherPanel if needed, approve, then return here.</p>
        <a class="btn btn-primary" href="${panelUrl}">Continue to FeatherPanel</a>
      </div>

      <div class="fieldset">
        <legend>Option 2 — existing API key</legend>
        <form method="post" action="/oauth/consent/complete">
          <input type="hidden" name="txn" value="${txn}" />
          <table class="form">
            <tr>
              <th><label for="api_key">API key</label></th>
              <td><input id="api_key" name="api_key" type="password" autocomplete="off" placeholder="fp_…" required /></td>
            </tr>
          </table>
          <button class="btn btn-secondary" type="submit">Authorize</button>
        </form>
        <p class="note">Create keys under Account → API Keys.</p>
      </div>

      <div class="footer">
        Powered by <a href="https://featherpanel.com" target="_blank" rel="noopener noreferrer">FeatherPanel</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function panelCallbackHtml(txn: string): string {
  const safeTxn = escapeHtml(txn);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Completing authorization - FeatherPanel</title>
  <style>${pmaShellCss()}</style>
</head>
<body>
  <div class="shell">
    <div class="brand-block">
      <div>
        <a class="app-name" href="/">FeatherPanel</a>
        <p class="brand-subtitle">MCP authorization</p>
      </div>
    </div>
    <div class="card">
      <div class="spinner" role="status" aria-label="Loading"></div>
      <h2 class="heading" id="msg">Completing authorization…</h2>
      <p class="message">Please wait while we finish connecting Claude to FeatherPanel.</p>
      <div class="footer">
        Powered by <a href="https://featherpanel.com" target="_blank" rel="noopener noreferrer">FeatherPanel</a>
      </div>
    </div>
  </div>
  <script>
    (async () => {
      const txn = ${JSON.stringify(txn)};
      const hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
      const err = hash.get('error');
      const msg = document.getElementById('msg');
      if (err) {
        msg.textContent = 'Denied: ' + (hash.get('error_description') || err);
        return;
      }
      const publicKey = hash.get('public_key');
      if (!publicKey) {
        msg.textContent = 'Missing API key in callback. Close this tab and try Connect again.';
        return;
      }
      const res = await fetch('/oauth/consent/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({ txn, api_key: publicKey }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.redirect_url) {
        location.href = data.redirect_url;
        return;
      }
      msg.textContent =
        (data && data.error_description) || (data && data.error) || ('Failed (' + res.status + ')');
    })().catch((e) => {
      document.getElementById('msg').textContent = String(e);
    });
  </script>
  <noscript><p style="padding:12px;text-align:center">JavaScript is required (txn ${safeTxn}).</p></noscript>
</body>
</html>`;
}

async function handleConsentComplete(
  req: Request,
  res: Response,
): Promise<void> {
  const txn = String(req.body?.txn || req.query.txn || "").trim();
  const apiKey = String(req.body?.api_key || req.body?.public_key || "").trim();
  const wantsJson =
    String(req.headers.accept || "").includes("application/json") ||
    String(req.query.format || "") === "json";

  if (!txn || !apiKey) {
    if (wantsJson) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "Missing txn or api_key",
      });
      return;
    }
    res.status(400).send("Missing txn or api_key");
    return;
  }
  if (!oauthProvider.getPending(txn)) {
    const msg =
      "This authorization request expired or is invalid. Try Connect again in Claude.";
    if (wantsJson) {
      res.status(400).json({ error: "invalid_grant", error_description: msg });
      return;
    }
    res.status(400).send(msg);
    return;
  }
  try {
    await oauthProvider.validateApiKey(apiKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid API key";
    if (wantsJson) {
      res
        .status(401)
        .json({ error: "invalid_grant", error_description: message });
      return;
    }
    res.status(401).send(`Invalid API key: ${message}`);
    return;
  }

  try {
    const redirectUrl = oauthProvider.finishConsent(txn, apiKey, req);
    if (wantsJson) {
      res.status(200).json({ redirect_url: redirectUrl });
      return;
    }
    res.redirect(302, redirectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Consent failed";
    if (wantsJson) {
      res
        .status(400)
        .json({ error: "server_error", error_description: message });
      return;
    }
    res.status(400).send(message);
  }
}

function sendCorsJson(res: Response, body: unknown): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(body);
}

export function mountOAuthRoutes(app: Express): void {
  // Dynamic discovery (issuer follows reverse-proxy Host)
  app.get("/.well-known/oauth-authorization-server", (req, res) => {
    sendCorsJson(res, buildAsMetadata(req));
  });

  app.get(
    [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
    ],
    (req, res) => {
      const resource = mcpResourceUrlFromRequest(req);
      const issuer = issuerUrlFromRequest(req).href.replace(/\/$/, "");
      sendCorsJson(res, {
        resource,
        authorization_servers: [issuer],
        scopes_supported: SCOPES,
        resource_name: "FeatherPanel MCP",
        bearer_methods_supported: ["header"],
      });
    },
  );

  // Standard OAuth endpoints (SDK handlers)
  app.use(
    "/authorize",
    authorizationHandler({
      provider: oauthProvider,
      rateLimit: false,
    }),
  );
  app.use(
    "/token",
    tokenHandler({
      provider: oauthProvider,
      rateLimit: false,
    }),
  );
  app.use(
    "/register",
    clientRegistrationHandler({
      clientsStore: oauthProvider.clientsStore,
      rateLimit: false,
      clientSecretExpirySeconds: 0, // no expiry for registered secrets
    }),
  );
  app.use(
    "/revoke",
    revocationHandler({
      provider: oauthProvider,
      rateLimit: false,
    }),
  );

  // Consent UI
  app.get("/oauth/consent", (req, res) => {
    const txn = String(req.query.txn || "").trim();
    const pending = txn ? oauthProvider.getPending(txn) : undefined;
    if (!pending) {
      res.status(400).type("html")
        .send(`<!DOCTYPE html><html><body style="font:12px Verdana;background:#f3f3f3;padding:24px">
        <p>Invalid or expired authorization request.</p>
        <p>Close this tab and click <strong>Connect</strong> again in Claude.</p>
      </body></html>`);
      return;
    }
    const origin = publicOriginFromRequest(req);
    // Path-based txn avoids nested ?query in callbackurl (breaks some clients / PHP parsing)
    const callback = `${origin}/oauth/panel-callback/${encodeURIComponent(txn)}`;

    const panelAuthorize = new URL("/dashboard/account/oauth2/api/new", origin);
    panelAuthorize.searchParams.set("name", "MCP");
    panelAuthorize.searchParams.set(
      "appName",
      pending.client.client_name || "MCP Client",
    );
    panelAuthorize.searchParams.set(
      "description",
      "FeatherPanel MCP connector",
    );
    panelAuthorize.searchParams.set("callbackurl", callback);
    panelAuthorize.searchParams.set("mode", "user");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(
      consentPageHtml({
        txn,
        clientName: pending.client.client_name || pending.client.client_id,
        panelAuthorizeUrl: panelAuthorize.toString(),
      }),
    );
  });

  app.post(
    "/oauth/consent/complete",
    express.urlencoded({ extended: false }),
    (req, res) => {
      void handleConsentComplete(req, res);
    },
  );

  const sendPanelCallback = (txn: string, res: Response) => {
    if (!txn || !oauthProvider.getPending(txn)) {
      res.status(400).type("html")
        .send(`<!DOCTYPE html><html><body style="font:12px Verdana;background:#f3f3f3;padding:24px">
        <p>Invalid or expired authorization request.</p>
        <p>Close this tab and click <strong>Connect</strong> again in Claude.</p>
      </body></html>`);
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(panelCallbackHtml(txn));
  };

  // Prefer path param (no nested query string in panel callbackurl)
  app.get("/oauth/panel-callback/:txn", (req, res) => {
    sendPanelCallback(String(req.params.txn || "").trim(), res);
  });

  // Back-compat for older consent links
  app.get("/oauth/panel-callback", (req, res) => {
    sendPanelCallback(String(req.query.txn || "").trim(), res);
  });
}
