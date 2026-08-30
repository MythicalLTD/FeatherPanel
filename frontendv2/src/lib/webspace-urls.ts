/*
This file is part of FeatherPanel.
 */

/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

export interface WebSpacePublicUrl {
    domain: string;
    url: string;
}

export interface WebSpaceAccessUrls {
    public: WebSpacePublicUrl[];
    /** Direct HTTP URL on the web node (node IP + backend port). */
    internal_url: string | null;
    /** Loopback URL on the node — only when a routable host differs from localhost. */
    loopback_url: string | null;
    node_fqdn: string | null;
    node_ip?: string | null;
    backend_port: number | null;
}

export function buildWebSpaceAccessUrls(options: {
    domains?: string[];
    ssl?: boolean;
    backendPort?: number | null;
    nodeFqdn?: string | null;
    nodeIp?: string | null;
}): WebSpaceAccessUrls {
    const domains = Array.isArray(options.domains) ? options.domains : [];
    const ssl = !!options.ssl;
    const backendPort = options.backendPort && options.backendPort > 0 ? options.backendPort : null;
    const nodeFqdn = options.nodeFqdn?.trim() || null;
    const nodeIp = options.nodeIp?.trim() || null;
    const directHost = nodeIp || nodeFqdn;

    const scheme = ssl ? 'https' : 'http';
    const publicUrls: WebSpacePublicUrl[] = domains
        .map((d) => d.trim())
        .filter(Boolean)
        .map((domain) => ({ domain, url: `${scheme}://${domain}` }));

    const directUrl = backendPort && directHost ? `http://${directHost}:${backendPort}` : null;
    const loopbackUrl = backendPort ? `http://127.0.0.1:${backendPort}` : null;

    return {
        public: publicUrls,
        internal_url: directUrl ?? loopbackUrl,
        loopback_url: directUrl && loopbackUrl && directHost !== '127.0.0.1' ? loopbackUrl : null,
        node_fqdn: nodeFqdn,
        node_ip: nodeIp,
        backend_port: backendPort,
    };
}
