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

'use client';

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Activity, Server, Users, HardDrive, Settings, FileText, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { useRouter } from 'next/navigation';

export default function AnalyticsDashboardPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const analyticsModules = [
        {
            title: t('admin.analytics.users.title'),
            description: t('admin.analytics.nav.users_desc'),
            icon: Users,
            href: '/admin/analytics/users',
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
        },
        {
            title: t('admin.analytics.activity.title'),
            description: t('admin.analytics.nav.activity_desc'),
            icon: Activity,
            href: '/admin/analytics/activity',
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20',
        },
        {
            title: t('admin.analytics.infrastructure.title'),
            description: t('admin.analytics.nav.infrastructure_desc'),
            icon: HardDrive,
            href: '/admin/analytics/infrastructure',
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20',
        },
        {
            title: t('admin.analytics.servers.title'),
            description: t('admin.analytics.nav.servers_desc'),
            icon: Server,
            href: '/admin/analytics/servers',
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/20',
        },
        {
            title: t('admin.analytics.content.title'),
            description: t('admin.analytics.nav.content_desc'),
            icon: FileText,
            href: '/admin/analytics/content',
            color: 'text-indigo-500',
            bgColor: 'bg-indigo-500/10',
            borderColor: 'border-indigo-500/20',
        },
        {
            title: t('admin.analytics.system.title'),
            description: t('admin.analytics.nav.system_desc'),
            icon: Settings,
            href: '/admin/analytics/system',
            color: 'text-red-500',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20',
        },
    ];

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.analytics.title')}
                description={t('admin.analytics.subtitle')}
                icon={Activity}
            />

            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
                {analyticsModules.map((module) => (
                    <ResourceCard
                        key={module.href}
                        icon={module.icon}
                        title={module.title}
                        description={<p className='text-sm text-muted-foreground line-clamp-2'>{module.description}</p>}
                        onClick={() => router.push(module.href)}
                        iconWrapperClassName={module.bgColor + ' ' + module.borderColor}
                        iconClassName={module.color}
                        actions={
                            <ArrowRight className='w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0' />
                        }
                        className='shadow-none! bg-card/50 backdrop-blur-sm'
                    />
                ))}
            </div>
        </div>
    );
}
