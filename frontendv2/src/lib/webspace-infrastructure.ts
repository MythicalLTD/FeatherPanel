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

import type { InfrastructureCheck, InfrastructureReadiness } from '@/hooks/useWebSpaceInfrastructure';

export type InfrastructureCategory = 'core' | 'proxy' | 'runtime' | 'services' | 'console';

export interface InfrastructureNodeInfo {
    id?: number;
    fqdn?: string | null;
    expected_ips?: string[];
    proxy_provider?: string | null;
    behind_proxy?: boolean;
}

export interface InfrastructureSummary {
    total: number;
    ok: number;
    warn: number;
    fail: number;
}

export interface EnrichedInfrastructureReadiness extends InfrastructureReadiness {
    summary?: InfrastructureSummary;
    node?: InfrastructureNodeInfo;
}

const CHECK_CATEGORY: Record<string, InfrastructureCategory> = {
    web_nodes: 'core',
    webplates: 'core',
    web_node: 'core',
    daemon: 'core',
    daemon_diagnostics: 'core',
    daemon_panel_credentials: 'core',
    daemon_proxy_binary: 'proxy',
    daemon_acme_email: 'proxy',
    panel_acme_email: 'proxy',
    proxy_provider: 'proxy',
    domains: 'proxy',
    behind_proxy: 'console',
    daemon_docker: 'runtime',
    daemon_docker_network: 'runtime',
    database_hosts: 'services',
    mail_hosts: 'services',
};

export function infrastructureCategory(id: string): InfrastructureCategory {
    return CHECK_CATEGORY[id] ?? 'core';
}

export function infrastructureSummary(checks: InfrastructureCheck[]): InfrastructureSummary {
    return checks.reduce<InfrastructureSummary>(
        (acc, check) => {
            acc.total += 1;
            if (check.status === 'ok') acc.ok += 1;
            else if (check.status === 'warn') acc.warn += 1;
            else acc.fail += 1;
            return acc;
        },
        { total: 0, ok: 0, warn: 0, fail: 0 },
    );
}

export function groupInfrastructureChecks(
    checks: InfrastructureCheck[],
): Record<InfrastructureCategory, InfrastructureCheck[]> {
    const groups: Record<InfrastructureCategory, InfrastructureCheck[]> = {
        core: [],
        proxy: [],
        runtime: [],
        services: [],
        console: [],
    };
    for (const check of checks) {
        groups[infrastructureCategory(check.id)].push(check);
    }
    return groups;
}

export function infrastructureIssues(checks: InfrastructureCheck[]): InfrastructureCheck[] {
    return checks.filter((c) => c.status !== 'ok');
}

export function checkTranslationKey(id: string): string {
    return `webSpaces.infrastructure.checks.${id}`;
}
