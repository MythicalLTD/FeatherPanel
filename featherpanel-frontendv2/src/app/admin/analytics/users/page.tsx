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

import React, { useEffect, useState } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import api from '@/lib/api'
import { SimplePieChart, TrendChart } from '@/components/admin/analytics/UserCharts'
import { ResourceCard } from '@/components/featherui/ResourceCard'
import { PageHeader } from '@/components/featherui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, UserX, UserCheck, ShieldCheck, ArrowUpRight } from 'lucide-react'

interface UserOverview {
    total: number
    active: number
    banned: number
    verified: number
    two_fa_enabled: number
    percentage_verified: number
    percentage_banned: number
    percentage_two_fa: number
    percentage_active: number
}

interface RoleStats {
    name: string
    value: number
}

interface TrendData {
    date: string
    count: number
}

interface TopUser {
    id: number
    username: string
    email: string
    server_count: number
    avatar: string
}



interface GrowthStats {
    last_7_days: number
    previous_7_days: number
    growth_rate_7d: number
    last_30_days: number
    previous_30_days: number
    growth_rate_30d: number
}

export default function UserAnalyticsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [overview, setOverview] = useState<UserOverview | null>(null)
  const [roles, setRoles] = useState<RoleStats[]>([])
  const [registrationTrend, setRegistrationTrend] = useState<TrendData[]>([])
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [securityStats, setSecurityStats] = useState<{ name: string; value: number }[]>([])
  const [growth, setGrowth] = useState<GrowthStats | null>(null)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [
          overviewRes, 
          rolesRes, 
          regTrendRes, 
          topUsersRes, 
          securityRes,
          growthRes
        ] = await Promise.all([
        api.get('/admin/analytics/users/overview'),
        api.get('/admin/analytics/users/by-role'),
        api.get('/admin/analytics/users/registration-trend'),
        api.get('/admin/analytics/users/top-by-servers'),
        api.get('/admin/analytics/users/security'),
        api.get('/admin/analytics/users/growth'),
      ])

      setOverview(overviewRes.data.data)
      
      // Transform roles for chart
      interface RoleApiResponse {
             role_display_name: string
             user_count: number
      }

      const rolesData = (rolesRes.data.data.roles || []).map((r: RoleApiResponse) => ({
          name: r.role_display_name,
          value: r.user_count
      }))
      setRoles(rolesData)

      setRegistrationTrend(regTrendRes.data.data.data)
      setTopUsers(topUsersRes.data.data.users)
      setGrowth(growthRes.data.data)

      // Transform security for chart
      const sec = securityRes.data.data;
      const securityChartData = [
          { name: t('admin.analytics.users.security_stats.fully_secured'), value: sec.fully_secured },
          { name: t('admin.analytics.users.security_stats.email_only'), value: sec.email_verified - sec.fully_secured },
          { name: t('admin.analytics.users.security_stats.2fa_only'), value: sec.two_fa_enabled - sec.fully_secured },
          { name: t('admin.analytics.users.security_stats.not_secured'), value: sec.not_secured },
      ].filter(item => item.value > 0);
      setSecurityStats(securityChartData)

    } catch (err) {
      console.error('Failed to fetch user analytics:', err)
      setError(t('admin.analytics.users.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          {t('admin.analytics.activity.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.analytics.users.title')}
        description={t('admin.analytics.users.subtitle')}
        icon={Users}
      />

      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <ResourceCard
            title={overview.total.toString()}
            subtitle={t('admin.analytics.users.total')}
            description={t('admin.analytics.users.active_users', { count: String(overview.active) })}
            icon={Users}
            className="shadow-none! bg-card/50 backdrop-blur-sm"
          />
          <ResourceCard
            title={overview.banned.toString()}
            subtitle={t('admin.analytics.users.banned')}
            description={t('admin.analytics.users.banned_pct', { percentage: String(overview.percentage_banned) })}
            icon={UserX}
            className="shadow-none! bg-card/50 backdrop-blur-sm"
          />
          <ResourceCard
            title={overview.verified.toString()}
            subtitle={t('admin.analytics.users.verified')}
            description={t('admin.analytics.users.verified_pct', { percentage: String(overview.percentage_verified) })}
            icon={UserCheck}
            className="shadow-none! bg-card/50 backdrop-blur-sm"
          />
          <ResourceCard
            title={overview.two_fa_enabled.toString()}
            subtitle={t('admin.analytics.users.two_fa')}
            description={t('admin.analytics.users.two_fa_pct', { percentage: String(overview.percentage_two_fa) })}
            icon={ShieldCheck}
            className="shadow-none! bg-card/50 backdrop-blur-sm"
          />
        </div>
      )}

       {/* Growth Cards */}
       {growth && (
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {t('admin.analytics.users.growth_7d')}
                </CardTitle>
                <ArrowUpRight className={`h-4 w-4 ${growth.growth_rate_7d >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{growth.growth_rate_7d > 0 ? '+' : ''}{growth.growth_rate_7d}%</div>
                <p className="text-xs text-muted-foreground">
                    {t('admin.analytics.users.growth_comparison', { new: String(growth.last_7_days), previous: String(growth.previous_7_days) })}
                </p>
            </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {t('admin.analytics.users.growth_30d')}
                </CardTitle>
                <ArrowUpRight className={`h-4 w-4 ${growth.growth_rate_30d >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{growth.growth_rate_30d > 0 ? '+' : ''}{growth.growth_rate_30d}%</div>
                <p className="text-xs text-muted-foreground">
                    {t('admin.analytics.users.growth_comparison', { new: String(growth.last_30_days), previous: String(growth.previous_30_days) })}
                </p>
            </CardContent>
            </Card>
        </div>
       )}

      {/* Charts Section */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <TrendChart
          title={t('admin.analytics.users.reg_trend')}
          description={t('admin.analytics.users.reg_trend_desc')}
          data={registrationTrend}
        />
        <SimplePieChart
          title={t('admin.analytics.users.role_dist')}
          description={t('admin.analytics.users.role_dist_desc')}
          data={roles}
        />
      </div>

       <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        <div className="col-span-1">
            <SimplePieChart
            title={t('admin.analytics.users.security_stats_title')}
            description={t('admin.analytics.users.security_stats_desc')}
            data={securityStats}
            />
        </div>
        
        <Card className="col-span-1 lg:col-span-2 border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
            <CardTitle>{t('admin.analytics.users.top_users')}</CardTitle>
            <CardDescription>{t('admin.analytics.users.top_users_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
            {topUsers.length > 0 ? (
                <div className="space-y-4">
                {topUsers.map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-4">#{index + 1}</span>
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium leading-none">{user.username}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <div className="text-sm font-medium bg-secondary px-2.5 py-0.5 rounded-full">
                            {t('admin.analytics.users.servers_count', { count: String(user.server_count) })}
                        </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="flex justify-center py-8 text-muted-foreground">
                    {t('admin.analytics.activity.no_recent')}
                </div>
            )}
            </CardContent>
        </Card>
       </div>

    </div>
  )
}
