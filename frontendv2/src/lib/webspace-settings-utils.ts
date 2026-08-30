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

import type { DomainRoute } from '@/components/webspace/WebSpaceDomainsManager';

export function formatWebSpaceBytes(n?: number | null): string {
    if (n == null) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function apexFromDomain(domain: string): string {
    const d = domain.trim().toLowerCase().replace(/\.$/, '');
    return d.startsWith('www.') ? d.slice(4) : d;
}

export function detectWwwPreference(routes: DomainRoute[]): 'apex' | 'www' | 'none' {
    const primary = routes.find((r) => r.type === 'primary')?.domain || routes[0]?.domain;
    if (!primary) return 'none';
    const apex = apexFromDomain(primary);
    const www = `www.${apex}`;
    const redirects = routes.filter((r) => r.type === 'redirect');
    const wwwToApex = redirects.some(
        (r) => r.domain === www && (r.redirect_target || '').includes(apex) && !(r.redirect_target || '').includes(www),
    );
    const apexToWww = redirects.some((r) => r.domain === apex && (r.redirect_target || '').includes(www));
    if (primary === apex && wwwToApex) return 'apex';
    if (primary === www && apexToWww) return 'www';
    return 'none';
}

export function domainRoutesFromWebSpace(webspace: {
    domain_routes?: DomainRoute[];
    domains?: string[];
}): DomainRoute[] {
    if (webspace.domain_routes?.length) {
        return webspace.domain_routes;
    }
    return (webspace.domains || []).map((domain, index) => ({
        domain,
        type: (index === 0 ? 'primary' : 'alias') as DomainRoute['type'],
    }));
}
