/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client'

import React from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Server, Users, HardDrive, Settings, FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AnalyticsDashboardPage() {
  const { t } = useTranslation()

  const analyticsModules = [
    {
      title: t('admin.analytics.users.title'),
      description: t('admin.analytics.nav.users_desc'),
      icon: Users,
      href: '/admin/analytics/users',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('admin.analytics.activity.title'),
      description: t('admin.analytics.nav.activity_desc'),
      icon: Activity,
      href: '/admin/analytics/activity',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: t('admin.analytics.infrastructure.title'),
      description: t('admin.analytics.nav.infrastructure_desc'),
      icon: HardDrive,
      href: '/admin/analytics/infrastructure',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: t('admin.analytics.servers.title'),
      description: t('admin.analytics.nav.servers_desc'),
      icon: Server,
      href: '/admin/analytics/servers',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: t('admin.analytics.content.title'),
      description: t('admin.analytics.nav.content_desc'),
      icon: FileText,
      href: '/admin/analytics/content',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: t('admin.analytics.system.title'),
      description: t('admin.analytics.nav.system_desc'),
      icon: Settings,
      href: '/admin/analytics/system',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.analytics.title')}</h1>
        <p className="text-muted-foreground">
          {t('admin.analytics.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {analyticsModules.map((module) => {
          const Icon = module.icon
          return (
            <Link key={module.href} href={module.href}>
              <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-3 rounded-xl ${module.bgColor}`}>
                      <Icon className={`w-6 h-6 ${module.color}`} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {module.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
