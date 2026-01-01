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
import { SimplePieChart, SimpleBarChart, NodeResourceChart } from '@/components/admin/analytics/InfrastructureCharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Server, Network, Database } from 'lucide-react'

interface InfrastructureOverview {
    locations: { total: number; with_nodes: number }
    nodes: { total: number; public: number; percentage_public: number }
    allocations: { total: number; in_use: number; percentage_in_use: number }
    databases: { total: number; hosts: number }
}

interface StatsItem {
    name: string
    value: number
}

interface NodeResourceStats {
    name: string
    memory_usage: number
    disk_usage: number
}

export default function InfrastructureAnalyticsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [overview, setOverview] = useState<InfrastructureOverview | null>(null)
  const [nodesByLocation, setNodesByLocation] = useState<StatsItem[]>([])
  const [allocationUsage, setAllocationUsage] = useState<StatsItem[]>([])
  const [serversByNode, setServersByNode] = useState<StatsItem[]>([])
  const [dbTypes, setDbTypes] = useState<StatsItem[]>([])
  const [nodeResources, setNodeResources] = useState<NodeResourceStats[]>([])

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [overviewRes, nodesByLocationRes, allocationUsageRes, serversByNodeRes, dbOverviewRes, nodeResourcesRes] = await Promise.all([
        api.get('/admin/analytics/infrastructure/dashboard'), // Use dashboard endpoint or combine overviews
        api.get('/admin/analytics/nodes/by-location'),
        api.get('/admin/analytics/allocations/overview'), // Check if this gives usage
        api.get('/admin/analytics/servers/by-node'),
        api.get('/admin/analytics/databases/overview'),
        api.get('/admin/analytics/nodes/resources'),
      ])

      setOverview(overviewRes.data.data)
      setNodesByLocation((nodesByLocationRes.data.data.locations || []).map((l: { location_name: string; node_count: number }) => ({
        name: l.location_name,
        value: l.node_count
      })))
      
      const allocData = allocationUsageRes.data.data
      setAllocationUsage([
        { name: t('admin.analytics.infrastructure.assigned'), value: allocData.assigned },
        { name: t('admin.analytics.infrastructure.available'), value: allocData.available }
      ])
      
      setServersByNode((serversByNodeRes.data.data.nodes || []).map((n: { node_name: string; server_count: number }) => ({
        name: n.node_name,
        value: n.server_count
      })))
      
      setDbTypes((dbOverviewRes.data.data.by_type || []).map((d: { database_type: string; count: number }) => ({
        name: d.database_type,
        value: d.count
      })))
      
      setNodeResources(nodeResourcesRes.data.data.nodes || [])
    } catch (err) {
      console.error('Failed to fetch infrastructure analytics:', err)
      setError(t('admin.analytics.infrastructure.error'))
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
        <h1 className="text-3xl font-bold tracking-tight">{t('admin.analytics.infrastructure.title')}</h1>
        <p className="text-muted-foreground">{t('admin.analytics.infrastructure.subtitle')}</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.infrastructure.locations')}
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.locations.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.infrastructure.with_nodes', { count: String(overview.locations.with_nodes) })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.infrastructure.nodes')}
              </CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.nodes.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.infrastructure.public', { percentage: String(overview.nodes.percentage_public ?? 0) })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.infrastructure.allocations')}
              </CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.allocations.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.infrastructure.in_use', { percentage: String(overview.allocations.percentage_in_use ?? 0) })}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('admin.analytics.infrastructure.db_hosts')}
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.databases.hosts}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.analytics.infrastructure.across_nodes')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <SimplePieChart
          title={t('admin.analytics.infrastructure.nodes_by_location')}
          description={t('admin.analytics.infrastructure.nodes_by_location_desc')}
          data={nodesByLocation}
        />
        <SimplePieChart
          title={t('admin.analytics.infrastructure.allocation_usage')}
          description={t('admin.analytics.infrastructure.allocation_usage_desc')}
          data={allocationUsage}
        />
      </div>

       <div className="grid gap-4 md:grid-cols-1">
        <NodeResourceChart
            title={t('admin.analytics.infrastructure.node_resources')}
            description={t('admin.analytics.infrastructure.node_resources_desc')}
            data={nodeResources}
        />
       </div>

       <div className="grid gap-4 md:grid-cols-2">
        <SimpleBarChart
            title={t('admin.analytics.infrastructure.servers_by_node')}
            description={t('admin.analytics.infrastructure.servers_by_node_desc')}
            data={serversByNode}
        />
        <SimplePieChart
            title={t('admin.analytics.infrastructure.db_types')}
            description={t('admin.analytics.infrastructure.db_types_desc')}
            data={dbTypes}
        />
       </div>

    </div>
  )
}
