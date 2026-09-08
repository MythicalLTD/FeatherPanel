/**
 * Resolve the public panel origin from reverse-proxy headers.
 */

import type { Request } from 'express';

function isLocalHost(host: string): boolean {
    const hostname = host.split(':')[0].toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

export function publicOriginFromRequest(req: Request): string {
    const env = process.env.MCP_PUBLIC_URL?.trim().replace(/\/+$/, '');
    if (env) {
        return env;
    }

    let proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
        .split(',')[0]
        .trim()
        .toLowerCase();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost')
        .split(',')[0]
        .trim();

    // Panel OAuth rejects non-localhost http callbacks. Upstream proxies sometimes
    // drop X-Forwarded-Proto — prefer https for real hostnames.
    if (proto === 'http' && !isLocalHost(host)) {
        proto = 'https';
    }
    if (!proto) {
        proto = isLocalHost(host) ? 'http' : 'https';
    }

    return `${proto}://${host}`;
}

export function mcpResourceUrlFromRequest(req: Request): string {
    return `${publicOriginFromRequest(req)}/mcp`;
}

export function issuerUrlFromRequest(req: Request): URL {
    return new URL(publicOriginFromRequest(req));
}
