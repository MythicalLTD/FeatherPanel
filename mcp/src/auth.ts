/**
 * Per-session API key storage for Streamable HTTP, plus env fallback for stdio.
 */

const sessionTokens = new Map<string, string>();
let defaultApiKey: string | undefined = process.env.FEATHERPANEL_API_KEY?.trim() || undefined;

export function setDefaultApiKey(apiKey: string | undefined): void {
    defaultApiKey = apiKey?.trim() || undefined;
}

export function setSessionApiKey(sessionId: string, apiKey: string): void {
    sessionTokens.set(sessionId, apiKey.trim());
}

export function clearSessionApiKey(sessionId: string): void {
    sessionTokens.delete(sessionId);
}

export function getApiKey(sessionId?: string): string {
    if (sessionId) {
        const fromSession = sessionTokens.get(sessionId);
        if (fromSession) {
            return fromSession;
        }
    }

    if (defaultApiKey) {
        return defaultApiKey;
    }

    throw new Error(
        'Missing FeatherPanel API key. For remote MCP, send Authorization: Bearer <api_key> or x-api-key. For stdio, set FEATHERPANEL_API_KEY.',
    );
}

export function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
    if (!authorizationHeader) {
        return undefined;
    }

    const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
    return match?.[1]?.trim() || undefined;
}

/**
 * Resolve API key from Claude / Cursor style headers.
 * Prefers Authorization: Bearer …, then x-api-key / x-auth-token.
 */
export function extractApiKeyFromHeaders(headers: {
    authorization?: string | string[];
    'x-api-key'?: string | string[];
    'x-auth-token'?: string | string[];
}): string | undefined {
    const pick = (value: string | string[] | undefined): string | undefined => {
        if (Array.isArray(value)) {
            return value[0]?.trim() || undefined;
        }
        return value?.trim() || undefined;
    };

    const fromBearer = extractBearerToken(pick(headers.authorization));
    if (fromBearer) {
        return fromBearer;
    }

    // Claude connector UI also allowlists these header names
    return pick(headers['x-api-key']) || pick(headers['x-auth-token']);
}
