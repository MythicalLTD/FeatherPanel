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
import { SimplePieChart, SimpleBarChart } from '@/components/admin/analytics/ContentCharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Box, Layers, Image as ImageIcon, ExternalLink } from 'lucide-react'

interface ContentOverview {
    realms: { total: number; with_spells: number }
    spells: { total: number; in_use: number; percentage_in_use: number }
    images: { total: number; in_use: number }
    redirects: { total: number; active: number }
}

interface RealmStats {
    name: string
    value: number
}

interface VariableTypeStats {
    name: string
    value: number
}

interface RealmDetail {
    name: string
    value: number
}

export default function ContentAnalyticsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [overview, setOverview] = useState<ContentOverview | null>(null)
  const [spellsByRealm, setSpellsByRealm] = useState<RealmStats[]>([])
  const [variableTypes, setVariableTypes] = useState<VariableTypeStats[]>([])
  const [realmDetails, setRealmDetails] = useState<RealmDetail[]>([])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, spellsByRealmRes, variableTypesRes, realmDetailsRes] = await Promise.all([
        api.get('/admin/analytics/content/dashboard'), // Was overview
        api.get('/admin/analytics/spells/by-realm'),
        api.get('/admin/analytics/spells/variables'), 
        api.get('/admin/analytics/realms/overview'),
      ])

      const d = overviewRes.data.data
      setOverview({
        realms: { total: d.realms.total_realms, with_spells: d.realms.with_spells },
        spells: { total: d.spells.total_spells, in_use: d.spells.in_use, percentage_in_use: d.spells.percentage_in_use },
        images: { total: d.images.total_images, in_use: 0 }, // API doesn't return in_use
        redirects: { total: d.redirect_links.total_links, active: 0 } // API doesn't return active
      })

      setSpellsByRealm((spellsByRealmRes.data.data.realms || []).map((r: { realm_name: string; spell_count: number }) => ({
        name: r.realm_name,
        value: r.spell_count
      })))

      setVariableTypes((variableTypesRes.data.data.by_field_type || []).map((v: { field_type: string; count: number }) => ({
        name: v.field_type,
        value: v.count
      })))

      // Map realm summary stats to chart data
      const rStats = realmDetailsRes.data.data
      setRealmDetails([
        { name: t('admin.analytics.content.total_realms'), value: rStats.total_realms },
        { name: t('admin.analytics.content.with_spells'), value: rStats.with_spells },
        { name: t('admin.analytics.content.with_servers'), value: rStats.with_servers },
        { name: t('admin.analytics.content.empty_realms'), value: rStats.empty_realms }
      ])
    } catch (err) {
      console.error('Failed to fetch content analytics:', err)
      setError(t('admin.analytics.content.error'))
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.analytics.content.title')}</h1>
        <p className="text-muted-foreground">{t('admin.analytics.content.subtitle')}</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.content.realms')}
              </CardTitle>
              <Box className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.realms.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.content.with_spells', { count: String(overview.realms.with_spells) })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.content.spells')}
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.spells.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.content.in_use', { percentage: String(overview.spells.percentage_in_use) })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.content.images')}
              </CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.images.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.content.library')}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.content.redirects')}
              </CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.redirects.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.content.active_links')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <SimplePieChart
          title={t('admin.analytics.content.spells_by_realm')}
          description={t('admin.analytics.content.spells_by_realm_desc')}
          data={spellsByRealm}
        />
        <SimplePieChart
          title={t('admin.analytics.content.variable_types')}
          description={t('admin.analytics.content.variable_types_desc')}
          data={variableTypes}
        />
      </div>

       <div className="grid gap-4 md:grid-cols-1">
        <SimpleBarChart
            title={t('admin.analytics.content.realm_details')}
            description={t('admin.analytics.content.realm_details_desc')}
            data={realmDetails}
            color="#ec4899"
        />
       </div>

    </div>
  )
}
