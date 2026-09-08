/**
 * In-memory OAuth state (clients, codes, tokens, pending consent).
 * Optionally persists to disk so Docker restarts keep Claude connections working.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";

export type PendingConsent = {
  txnId: string;
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  createdAt: number;
};

export type AuthCodeRecord = {
  code: string;
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  apiKey: string;
  createdAt: number;
};

export type TokenRecord = {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  apiKey: string;
  scopes: string[];
  resource?: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
};

type PersistedShape = {
  clients: Record<string, OAuthClientInformationFull>;
  tokens: Record<string, TokenRecord>;
  refreshIndex: Record<string, string>;
};

const PENDING_TTL_MS = 15 * 60 * 1000;
const CODE_TTL_MS = 5 * 60 * 1000;
export const ACCESS_TOKEN_TTL_SEC = 24 * 60 * 60; // 24h — Claude.ai is flaky with short-lived tokens
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

function storePath(): string | undefined {
    const raw = process.env.MCP_OAUTH_STORE_PATH?.trim();
    if (raw) {
        return raw;
    }
    // Default persistence so MCP restarts (tsx watch / docker) keep Claude OAuth tokens.
    return '/tmp/featherpanel-mcp-oauth.json';
}

export class OAuthStore {
  readonly clients = new Map<string, OAuthClientInformationFull>();
  readonly pending = new Map<string, PendingConsent>();
  readonly codes = new Map<string, AuthCodeRecord>();
  readonly tokens = new Map<string, TokenRecord>();
  /** refresh_token → access_token */
  readonly refreshIndex = new Map<string, string>();

  constructor() {
    this.load();
    // Periodic cleanup
    setInterval(() => this.cleanup(), 60_000).unref?.();
  }

  private load(): void {
    const path = storePath();
    if (!path) {
      return;
    }
    try {
      const raw = readFileSync(path, "utf8");
      const data = JSON.parse(raw) as PersistedShape;
      for (const [id, client] of Object.entries(data.clients || {})) {
        this.clients.set(id, client);
      }
      for (const [access, token] of Object.entries(data.tokens || {})) {
        this.tokens.set(access, token);
      }
      for (const [refresh, access] of Object.entries(data.refreshIndex || {})) {
        this.refreshIndex.set(refresh, access);
      }
    } catch {
      // Missing or corrupt store — start empty
    }
  }

  persist(): void {
    const path = storePath();
    if (!path) {
      return;
    }
    try {
      mkdirSync(dirname(path), { recursive: true });
      const data: PersistedShape = {
        clients: Object.fromEntries(this.clients),
        tokens: Object.fromEntries(this.tokens),
        refreshIndex: Object.fromEntries(this.refreshIndex),
      };
      writeFileSync(path, JSON.stringify(data), { mode: 0o600 });
    } catch (error) {
      console.error("Failed to persist MCP OAuth store:", error);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, pending] of this.pending) {
      if (now - pending.createdAt > PENDING_TTL_MS) {
        this.pending.delete(id);
      }
    }
    for (const [code, record] of this.codes) {
      if (now - record.createdAt > CODE_TTL_MS) {
        this.codes.delete(code);
      }
    }
    let changed = false;
    for (const [access, token] of this.tokens) {
      if (token.refreshExpiresAt < now) {
        this.tokens.delete(access);
        this.refreshIndex.delete(token.refreshToken);
        changed = true;
      }
    }
    if (changed) {
      this.persist();
    }
  }
}

export const oauthStore = new OAuthStore();
