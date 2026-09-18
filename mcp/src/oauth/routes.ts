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

function classicShellCss(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: #111111;
      color: #e8e8e8;
      font: 14px/1.5 ui-sans-serif, system-ui, Segoe UI, Tahoma, sans-serif;
      padding: 40px 16px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    @media (min-height: 560px) {
      body { align-items: center; }
    }
    .shell { width: 100%; max-width: 440px; }
    .titlebar {
      background: #1a1a1a;
      color: #f0f0f0;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.04em;
      padding: 10px 14px;
      border: 1px solid #333;
      border-bottom: none;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #333;
      padding: 18px 16px 16px;
    }
    h1 { font-size: 16px; font-weight: 600; color: #f5f5f5; margin: 0 0 8px; }
    p { margin: 0 0 12px; }
    .muted { color: #a0a0a0; }
    .block {
      border: 1px solid #333;
      padding: 12px 14px;
      margin: 0 0 12px;
      background: #141414;
    }
    .block-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #888;
      margin: 0 0 8px;
    }
    label.field {
      display: block;
      font-size: 12px;
      color: #a0a0a0;
      margin-bottom: 6px;
    }
    input[type=password], input[type=text] {
      width: 100%;
      font: inherit;
      padding: 8px 10px;
      border: 1px solid #444;
      background: #111;
      color: #e8e8e8;
      outline: none;
    }
    input::placeholder { color: #666; }
    .btn {
      display: inline-block;
      font: inherit;
      font-weight: 500;
      font-size: 13px;
      padding: 8px 14px;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid #555;
      background: #1a1a1a;
      color: #e8e8e8;
    }
    .btn-primary {
      background: #e8e8e8;
      color: #111;
      border-color: #e8e8e8;
    }
    .btn + .btn { margin-left: 8px; }
    .actions { margin-top: 10px; }
    .note { font-size: 12px; color: #777; margin: 10px 0 0; }
    .err { color: #e07070; font-weight: 600; }
    a.link { color: #c8c8c8; text-decoration: underline; text-underline-offset: 2px; }
  `;
}

function errorPageHtml(message: string, hint: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>AI Connector</title>
  <style>${classicShellCss()}</style>
</head>
<body>
  <div class="shell">
    <div class="titlebar">AI Connector</div>
    <div class="card">
      <h1 class="err">${escapeHtml(message)}</h1>
      <p class="muted">${escapeHtml(hint)}</p>
    </div>
  </div>
</body>
</html>`;
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
  <meta name="color-scheme" content="dark" />
  <title>AI Connector — Authorize</title>
  <style>${classicShellCss()}</style>
</head>
<body>
  <div class="shell">
    <div class="titlebar">AI Connector</div>
    <div class="card">
      <h1>Connect ${clientName}</h1>
      <p class="muted">Allow this app to manage your servers. Pick one option below.</p>

      <div class="block">
        <p class="block-title">1 — Sign in (recommended)</p>
        <p class="muted">Log in to your panel account and approve access.</p>
        <div class="actions">
          <a class="btn btn-primary" href="${panelUrl}">Continue</a>
        </div>
      </div>

      <div class="block">
        <p class="block-title">2 — Paste an API key</p>
        <form method="post" action="/oauth/consent/complete">
          <input type="hidden" name="txn" value="${txn}" />
          <label class="field" for="api_key">API key</label>
          <input id="api_key" name="api_key" type="password" autocomplete="off" placeholder="fp_…" required />
          <div class="actions">
            <button class="btn btn-primary" type="submit">Authorize</button>
          </div>
        </form>
        <p class="note">Create keys under Account → API Keys.</p>
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
  <meta name="color-scheme" content="dark" />
  <title>AI Connector — Completing</title>
  <style>${classicShellCss()}</style>
</head>
<body>
  <div class="shell">
    <div class="titlebar">AI Connector</div>
    <div class="card">
      <h1 id="msg">Finishing connection…</h1>
      <p class="muted" id="sub">You can close this tab when Claude says connected.</p>
    </div>
  </div>
  <script>
    (async () => {
      const txn = ${JSON.stringify(txn)};
      const hash = new URLSearchParams((location.hash || '').replace(/^#/, ''));
      const err = hash.get('error');
      const msg = document.getElementById('msg');
      const sub = document.getElementById('sub');
      if (err) {
        msg.className = 'err';
        msg.textContent = 'Access denied';
        sub.textContent = hash.get('error_description') || err;
        return;
      }
      const publicKey = hash.get('public_key');
      if (!publicKey) {
        msg.className = 'err';
        msg.textContent = 'Missing API key';
        sub.textContent = 'Close this tab and click Connect again in Claude.';
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
      msg.className = 'err';
      msg.textContent = 'Could not finish';
      sub.textContent =
        (data && data.error_description) || (data && data.error) || ('Failed (' + res.status + '). Click Connect again.');
    })().catch((e) => {
      const el = document.getElementById('msg');
      const sub = document.getElementById('sub');
      el.className = 'err';
      el.textContent = 'Could not finish';
      if (sub) sub.textContent = String(e);
    });
  </script>
  <noscript><p style="padding:16px;font:14px sans-serif;background:#111;color:#e8e8e8">JavaScript is required (txn ${safeTxn}).</p></noscript>
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
        resource_name: "AI Connector",
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
      res
        .status(400)
        .type("html")
        .send(
          errorPageHtml(
            "Invalid or expired request",
            "Close this tab and click Connect again in Claude.",
          ),
        );
      return;
    }
    const origin = publicOriginFromRequest(req);
    // Path-based txn avoids nested ?query in callbackurl (breaks some clients / PHP parsing)
    const callback = `${origin}/oauth/panel-callback/${encodeURIComponent(txn)}`;

    const panelAuthorize = new URL("/dashboard/account/oauth2/api/new", origin);
    panelAuthorize.searchParams.set("name", "AI Connector");
    panelAuthorize.searchParams.set(
      "appName",
      pending.client.client_name || "AI Connector",
    );
    panelAuthorize.searchParams.set("description", "AI Connector");
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
      res
        .status(400)
        .type("html")
        .send(
          errorPageHtml(
            "Invalid or expired request",
            "Close this tab and click Connect again in Claude.",
          ),
        );
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
