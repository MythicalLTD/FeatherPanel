/**
 * FeatherPanel MCP OAuth 2.1 provider (DCR + PKCE + refresh).
 *
 * Consent creates/binds a FeatherPanel API key; issued Bearer tokens map back to that key.
 */

import { randomBytes, randomUUID } from "node:crypto";
import type { Response } from "express";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import {
  InvalidGrantError,
  ServerError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { FeatherPanelClient } from "../client.js";
import { publicOriginFromRequest } from "./public-url.js";
import {
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  oauthStore,
  type OAuthStore,
} from "./store.js";

function opaqueToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString("hex")}`;
}

class ClientsStore implements OAuthRegisteredClientsStore {
  constructor(private readonly store: OAuthStore) {}

  async getClient(
    clientId: string,
  ): Promise<OAuthClientInformationFull | undefined> {
    return this.store.clients.get(clientId);
  }

  async registerClient(
    client: Omit<
      OAuthClientInformationFull,
      "client_id" | "client_id_issued_at"
    > &
      Partial<
        Pick<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
      >,
  ): Promise<OAuthClientInformationFull> {
    const full = client as OAuthClientInformationFull;
    if (!full.client_id) {
      throw new ServerError("client_id missing after registration");
    }
    this.store.clients.set(full.client_id, full);
    this.store.persist();
    return full;
  }
}

export class FeatherPanelOAuthProvider implements OAuthServerProvider {
  readonly clientsStore: OAuthRegisteredClientsStore;

  constructor(private readonly store: OAuthStore = oauthStore) {
    this.clientsStore = new ClientsStore(store);
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const txnId = randomUUID();
    this.store.pending.set(txnId, {
      txnId,
      client,
      params,
      createdAt: Date.now(),
    });

    const origin = publicOriginFromRequest(res.req);
    const consentUrl = new URL("/oauth/consent", origin);
    consentUrl.searchParams.set("txn", txnId);
    res.redirect(302, consentUrl.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const record = this.store.codes.get(authorizationCode);
    if (!record) {
      throw new InvalidGrantError("Invalid authorization code");
    }
    return record.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const record = this.store.codes.get(authorizationCode);
    if (!record) {
      throw new InvalidGrantError("Invalid authorization code");
    }
    if (record.client.client_id !== client.client_id) {
      throw new InvalidGrantError(
        "Authorization code was not issued to this client",
      );
    }

    this.store.codes.delete(authorizationCode);
    return this.issueTokens(
      client.client_id,
      record.apiKey,
      record.params.scopes || [],
      resource ?? record.params.resource,
    );
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const accessKey = this.store.refreshIndex.get(refreshToken);
    if (!accessKey) {
      throw new InvalidGrantError("Invalid refresh token");
    }
    const existing = this.store.tokens.get(accessKey);
    if (!existing || existing.refreshToken !== refreshToken) {
      throw new InvalidGrantError("Invalid refresh token");
    }
    if (existing.clientId !== client.client_id) {
      throw new InvalidGrantError(
        "Refresh token was not issued to this client",
      );
    }
    if (existing.refreshExpiresAt < Date.now()) {
      this.store.tokens.delete(accessKey);
      this.store.refreshIndex.delete(refreshToken);
      this.store.persist();
      throw new InvalidGrantError("Refresh token expired");
    }

    // Rotate refresh token
    this.store.tokens.delete(accessKey);
    this.store.refreshIndex.delete(refreshToken);

    const nextScopes = scopes?.length ? scopes : existing.scopes;
    const nextResource =
      resource ?? (existing.resource ? new URL(existing.resource) : undefined);
    return this.issueTokens(
      client.client_id,
      existing.apiKey,
      nextScopes,
      nextResource,
    );
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    // Direct FeatherPanel API keys still work as Bearer tokens
    if (token.startsWith("fp_")) {
      await this.validateApiKey(token);
      return {
        token,
        clientId: "featherpanel-api-key",
        scopes: ["mcp:tools"],
        expiresAt: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SEC,
        extra: { apiKey: token },
      };
    }

    const record = this.store.tokens.get(token);
    if (!record || record.accessExpiresAt < Date.now()) {
      throw new Error("Invalid or expired access token");
    }

    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: Math.floor(record.accessExpiresAt / 1000),
      resource: record.resource ? new URL(record.resource) : undefined,
      extra: { apiKey: record.apiKey },
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const token = request.token;
    const byAccess = this.store.tokens.get(token);
    if (byAccess) {
      this.store.tokens.delete(token);
      this.store.refreshIndex.delete(byAccess.refreshToken);
      this.store.persist();
      return;
    }
    const access = this.store.refreshIndex.get(token);
    if (access) {
      const record = this.store.tokens.get(access);
      this.store.tokens.delete(access);
      this.store.refreshIndex.delete(token);
      if (record) {
        this.store.refreshIndex.delete(record.refreshToken);
      }
      this.store.persist();
    }
  }

  /**
   * Finish consent: mint an auth code and return the client redirect URL.
   */
  finishConsent(
    txnId: string,
    apiKey: string,
    req: import("express").Request,
  ): string {
    const pending = this.store.pending.get(txnId);
    if (!pending) {
      throw new Error(
        "This authorization request expired or is invalid. Try Connect again.",
      );
    }

    this.store.pending.delete(txnId);

    const code = opaqueToken("ac_");
    this.store.codes.set(code, {
      code,
      client: pending.client,
      params: pending.params,
      apiKey,
      createdAt: Date.now(),
    });

    const redirect = new URL(pending.params.redirectUri);
    redirect.searchParams.set("code", code);
    if (pending.params.state) {
      redirect.searchParams.set("state", pending.params.state);
    }
    // RFC 9207 iss
    redirect.searchParams.set("iss", publicOriginFromRequest(req));

    return redirect.toString();
  }

  getPending(txnId: string) {
    return this.store.pending.get(txnId);
  }

  async validateApiKey(apiKey: string): Promise<void> {
    const client = new FeatherPanelClient(apiKey);
    await client.get("/api/user/session");
  }

  private issueTokens(
    clientId: string,
    apiKey: string,
    scopes: string[],
    resource?: URL,
  ): OAuthTokens {
    const accessToken = opaqueToken("atk_");
    const refreshToken = opaqueToken("rtk_");
    const now = Date.now();
    const record = {
      accessToken,
      refreshToken,
      clientId,
      apiKey,
      scopes,
      resource: resource?.href,
      accessExpiresAt: now + ACCESS_TOKEN_TTL_SEC * 1000,
      refreshExpiresAt: now + REFRESH_TOKEN_TTL_SEC * 1000,
    };
    this.store.tokens.set(accessToken, record);
    this.store.refreshIndex.set(refreshToken, accessToken);
    this.store.persist();

    return {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: ACCESS_TOKEN_TTL_SEC,
      refresh_token: refreshToken,
      scope: scopes.join(" "),
    };
  }
}

export const oauthProvider = new FeatherPanelOAuthProvider();
