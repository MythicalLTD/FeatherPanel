/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import type { ComponentType } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowLeftRight,
    Ban,
    BarChart3,
    Bot,
    Cloud,
    Code,
    Copy,
    Crown,
    Download,
    FileText,
    Gauge,
    Globe,
    HardDrive,
    Info,
    KeyRound,
    Layers,
    LayoutList,
    Lock,
    Mail,
    MailX,
    Package,
    Puzzle,
    Server,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Tags,
    Terminal,
    Ticket,
    Trash2,
    Upload,
    Users,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { TipCard, TipGrid } from '@/components/featherui/TipCard';

interface Tip {
    icon: ComponentType<{ className?: string }>;
    title: string;
    body: string;
}

const PAGE_TIPS: Record<string, Tip[]> = {
    users: [
        { icon: Users, title: 'admin.tips.users.t1_title', body: 'admin.tips.users.t1_body' },
        { icon: ShieldCheck, title: 'admin.tips.users.t2_title', body: 'admin.tips.users.t2_body' },
        { icon: KeyRound, title: 'admin.tips.users.t3_title', body: 'admin.tips.users.t3_body' },
    ],
    servers: [
        { icon: Server, title: 'admin.tips.servers.t1_title', body: 'admin.tips.servers.t1_body' },
        { icon: Layers, title: 'admin.tips.servers.t2_title', body: 'admin.tips.servers.t2_body' },
        { icon: ArrowLeftRight, title: 'admin.tips.servers.t3_title', body: 'admin.tips.servers.t3_body' },
    ],
    roles: [
        { icon: ShieldCheck, title: 'admin.tips.roles.t1_title', body: 'admin.tips.roles.t1_body' },
        { icon: Copy, title: 'admin.tips.roles.t2_title', body: 'admin.tips.roles.t2_body' },
        { icon: AlertTriangle, title: 'admin.tips.roles.t3_title', body: 'admin.tips.roles.t3_body' },
    ],
    tickets: [
        { icon: Ticket, title: 'admin.tips.tickets.t1_title', body: 'admin.tips.tickets.t1_body' },
        { icon: Tags, title: 'admin.tips.tickets.t2_title', body: 'admin.tips.tickets.t2_body' },
        { icon: Trash2, title: 'admin.tips.tickets.t3_title', body: 'admin.tips.tickets.t3_body' },
    ],
    plugins: [
        { icon: Puzzle, title: 'admin.tips.plugins.t1_title', body: 'admin.tips.plugins.t1_body' },
        { icon: Download, title: 'admin.tips.plugins.t2_title', body: 'admin.tips.plugins.t2_body' },
        { icon: AlertTriangle, title: 'admin.tips.plugins.t3_title', body: 'admin.tips.plugins.t3_body' },
    ],
    settings: [
        { icon: Settings, title: 'admin.tips.settings.t1_title', body: 'admin.tips.settings.t1_body' },
        { icon: Info, title: 'admin.tips.settings.t2_title', body: 'admin.tips.settings.t2_body' },
    ],
    'ldap-providers': [
        { icon: Server, title: 'admin.tips.ldap_providers.t1_title', body: 'admin.tips.ldap_providers.t1_body' },
        { icon: Lock, title: 'admin.tips.ldap_providers.t2_title', body: 'admin.tips.ldap_providers.t2_body' },
    ],
    'oidc-providers': [
        { icon: ShieldCheck, title: 'admin.tips.oidc_providers.t1_title', body: 'admin.tips.oidc_providers.t1_body' },
        { icon: Users, title: 'admin.tips.oidc_providers.t2_title', body: 'admin.tips.oidc_providers.t2_body' },
    ],
    logs: [
        { icon: FileText, title: 'admin.tips.logs.t1_title', body: 'admin.tips.logs.t1_body' },
        { icon: Upload, title: 'admin.tips.logs.t2_title', body: 'admin.tips.logs.t2_body' },
    ],
    'nodes-status': [
        { icon: Activity, title: 'admin.tips.nodes_status.t1_title', body: 'admin.tips.nodes_status.t1_body' },
        { icon: AlertTriangle, title: 'admin.tips.nodes_status.t2_title', body: 'admin.tips.nodes_status.t2_body' },
    ],
    'rate-limits': [
        { icon: Gauge, title: 'admin.tips.rate_limits.t1_title', body: 'admin.tips.rate_limits.t1_body' },
        { icon: Info, title: 'admin.tips.rate_limits.t2_title', body: 'admin.tips.rate_limits.t2_body' },
    ],
    'storage-sense': [
        { icon: HardDrive, title: 'admin.tips.storage_sense.t1_title', body: 'admin.tips.storage_sense.t1_body' },
        { icon: AlertTriangle, title: 'admin.tips.storage_sense.t2_title', body: 'admin.tips.storage_sense.t2_body' },
    ],
    subdomains: [
        { icon: Globe, title: 'admin.tips.subdomains.t1_title', body: 'admin.tips.subdomains.t1_body' },
        { icon: Info, title: 'admin.tips.subdomains.t2_title', body: 'admin.tips.subdomains.t2_body' },
    ],
    'pterodactyl-importer': [
        {
            icon: Upload,
            title: 'admin.tips.pterodactyl_importer.t1_title',
            body: 'admin.tips.pterodactyl_importer.t1_body',
        },
        {
            icon: AlertTriangle,
            title: 'admin.tips.pterodactyl_importer.t2_title',
            body: 'admin.tips.pterodactyl_importer.t2_body',
        },
    ],
    featherzerotrust: [
        {
            icon: ShieldCheck,
            title: 'admin.tips.featherzerotrust.t1_title',
            body: 'admin.tips.featherzerotrust.t1_body',
        },
        { icon: Info, title: 'admin.tips.featherzerotrust.t2_title', body: 'admin.tips.featherzerotrust.t2_body' },
    ],
    'ai-agent': [
        { icon: Bot, title: 'admin.tips.ai_agent.t1_title', body: 'admin.tips.ai_agent.t1_body' },
        { icon: Lock, title: 'admin.tips.ai_agent.t2_title', body: 'admin.tips.ai_agent.t2_body' },
    ],
    'dev-console': [
        { icon: Terminal, title: 'admin.tips.dev_console.t1_title', body: 'admin.tips.dev_console.t1_body' },
        { icon: AlertTriangle, title: 'admin.tips.dev_console.t2_title', body: 'admin.tips.dev_console.t2_body' },
    ],
    'dev-plugins': [
        { icon: Code, title: 'admin.tips.dev_plugins.t1_title', body: 'admin.tips.dev_plugins.t1_body' },
        { icon: Info, title: 'admin.tips.dev_plugins.t2_title', body: 'admin.tips.dev_plugins.t2_body' },
    ],
    analytics: [
        { icon: BarChart3, title: 'admin.tips.analytics.t1_title', body: 'admin.tips.analytics.t1_body' },
        { icon: Info, title: 'admin.tips.analytics.t2_title', body: 'admin.tips.analytics.t2_body' },
    ],
    abuseipdb: [
        { icon: ShieldAlert, title: 'admin.tips.abuseipdb.t1_title', body: 'admin.tips.abuseipdb.t1_body' },
        { icon: Gauge, title: 'admin.tips.abuseipdb.t2_title', body: 'admin.tips.abuseipdb.t2_body' },
    ],
    'blocked-email-domains': [
        {
            icon: MailX,
            title: 'admin.tips.blocked_email_domains.t1_title',
            body: 'admin.tips.blocked_email_domains.t1_body',
        },
        {
            icon: Info,
            title: 'admin.tips.blocked_email_domains.t2_title',
            body: 'admin.tips.blocked_email_domains.t2_body',
        },
    ],
    'blocked-ips': [
        { icon: Ban, title: 'admin.tips.blocked_ips.t1_title', body: 'admin.tips.blocked_ips.t1_body' },
        { icon: AlertTriangle, title: 'admin.tips.blocked_ips.t2_title', body: 'admin.tips.blocked_ips.t2_body' },
    ],
    'dns-hosts': [
        { icon: Globe, title: 'admin.tips.dns_hosts.t1_title', body: 'admin.tips.dns_hosts.t1_body' },
        { icon: KeyRound, title: 'admin.tips.dns_hosts.t2_title', body: 'admin.tips.dns_hosts.t2_body' },
    ],
    'hosting-packages': [
        { icon: Package, title: 'admin.tips.hosting_packages.t1_title', body: 'admin.tips.hosting_packages.t1_body' },
        { icon: Info, title: 'admin.tips.hosting_packages.t2_title', body: 'admin.tips.hosting_packages.t2_body' },
    ],
    'mail-hosts': [
        { icon: Mail, title: 'admin.tips.mail_hosts.t1_title', body: 'admin.tips.mail_hosts.t1_body' },
        { icon: Info, title: 'admin.tips.mail_hosts.t2_title', body: 'admin.tips.mail_hosts.t2_body' },
    ],
    mounts: [
        { icon: HardDrive, title: 'admin.tips.mounts.t1_title', body: 'admin.tips.mounts.t1_body' },
        { icon: Lock, title: 'admin.tips.mounts.t2_title', body: 'admin.tips.mounts.t2_body' },
    ],
    'cloud-management': [
        { icon: Cloud, title: 'admin.tips.cloud_management.t1_title', body: 'admin.tips.cloud_management.t1_body' },
        { icon: KeyRound, title: 'admin.tips.cloud_management.t2_title', body: 'admin.tips.cloud_management.t2_body' },
    ],
    premium: [
        { icon: Crown, title: 'admin.tips.premium.t1_title', body: 'admin.tips.premium.t1_body' },
        { icon: LayoutList, title: 'admin.tips.premium.t2_title', body: 'admin.tips.premium.t2_body' },
    ],
};

export type AdminTipsPage = keyof typeof PAGE_TIPS;

/** Standard tip cards shown at the bottom of an admin page. */
export function AdminPageTips({ page, className }: { page: string; className?: string }) {
    const { t } = useTranslation();
    const tips = PAGE_TIPS[page];
    if (!tips?.length) return null;
    return (
        <TipGrid className={className}>
            {tips.map((tip) => (
                <TipCard key={tip.title} icon={tip.icon} title={t(tip.title)}>
                    <p>{t(tip.body)}</p>
                </TipCard>
            ))}
        </TipGrid>
    );
}
