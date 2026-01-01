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

import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from '@/contexts/TranslationContext'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RefreshCw, Server, Check, AlertTriangle, Cpu, MemoryStick, HardDrive } from 'lucide-react'
import { WidgetRenderer } from '@/components/server/WidgetRenderer'
import { usePluginWidgets } from '@/hooks/usePluginWidgets'
import { formatBytes } from '@/lib/format'

interface GlobalStats {
    total_nodes: number
    healthy_nodes: number
    unhealthy_nodes: number
    total_memory: number
    used_memory: number
    total_disk: number
    used_disk: number
    avg_cpu_percent: number
}

interface NodeUtilization {
    memory_total: number
    memory_used: number
    disk_total: number
    disk_used: number
    swap_total: number
    swap_used: number
    cpu_percent: number
    load_average1: number
    load_average5: number
    load_average15: number
}

interface NodeStatus {
    id: number
    uuid: string
    name: string
    fqdn: string
    location_id: number
    status: 'healthy' | 'unhealthy'
    utilization: NodeUtilization | null
    error: string | null
}

export default function NodeStatusPage() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
    const [nodes, setNodes] = useState<NodeStatus[]>([])
    
    // Plugin Widgets
    const { getWidgets } = usePluginWidgets('admin-nodes-status')
    
    const fetchData = useCallback(async (background = false) => {
        if (!background) setLoading(true)
        setError(null)
        try {
            const res = await api.get('/admin/nodes/status/global')
            if (res.data.success) {
                setGlobalStats(res.data.data.global)
                setNodes(res.data.data.nodes)
            } else {
                setError(res.data.message || t('admin.nodes.error'))
            }
        } catch (err) {
             console.error('Failed to fetch node status:', err)
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const errorMessage = (err as any).response?.data?.message || t('admin.nodes.error')
             setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        // Initial fetch
        fetchData(false)
        
        // Background refresh
        const interval = setInterval(() => {
            fetchData(true)
        }, 10000)
        
        return () => clearInterval(interval)
    }, [fetchData])

    const getMemoryUsagePercent = () => {
        if (!globalStats || globalStats.total_memory === 0) return 0
        return (globalStats.used_memory / globalStats.total_memory) * 100
    }

    const getDiskUsagePercent = () => {
        if (!globalStats || globalStats.total_disk === 0) return 0
        return (globalStats.used_disk / globalStats.total_disk) * 100
    }

    if (loading && !globalStats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">{t('admin.nodes.loading')}</span>
                </div>
            </div>
        )
    }

    if (error && !globalStats) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <Alert variant="destructive" className="max-w-md w-full mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('admin.nodes.error')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => fetchData(false)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('admin.nodes.retry')}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'top-of-page')} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('admin.nodes.title')}</h1>
                    <p className="text-muted-foreground">{t('admin.nodes.subtitle')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData(false)} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('admin.nodes.refresh')}
                </Button>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'after-header')} />

            {globalStats && (
                <>
                <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'before-global-stats')} />
                
                {/* Global Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('admin.nodes.total')}
                             </CardTitle>
                             <Server className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold">{globalStats.total_nodes}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('admin.nodes.healthy')}
                             </CardTitle>
                             <div className="h-4 w-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check className="h-3 w-3 text-green-500" />
                             </div>
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold text-green-500">{globalStats.healthy_nodes}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('admin.nodes.unhealthy')}
                             </CardTitle>
                             <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                             </div>
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold text-red-500">{globalStats.unhealthy_nodes}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <CardTitle className="text-sm font-medium text-muted-foreground">
                                {t('admin.nodes.avg_cpu')}
                             </CardTitle>
                             <Cpu className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                             <div className="text-2xl font-bold">{globalStats.avg_cpu_percent.toFixed(1)}%</div>
                        </CardContent>
                    </Card>
                </div>

                <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'after-global-stats')} />

                {/* Global Resource Usage */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MemoryStick className="h-5 w-5 text-primary" />
                                {t('admin.nodes.memory_usage')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{t('admin.nodes.used_total')}</span>
                                <span className="font-medium">
                                    {formatBytes(globalStats.used_memory)} / {formatBytes(globalStats.total_memory)}
                                </span>
                            </div>
                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${
                                        getMemoryUsagePercent() > 90 ? 'bg-red-500' : 
                                        getMemoryUsagePercent() > 75 ? 'bg-orange-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${getMemoryUsagePercent()}%` }}
                                />
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                {t('admin.nodes.used_percent', { percent: getMemoryUsagePercent().toFixed(1) })}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5 text-primary" />
                                {t('admin.nodes.disk_usage')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{t('admin.nodes.used_total')}</span>
                                <span className="font-medium">
                                    {formatBytes(globalStats.used_disk)} / {formatBytes(globalStats.total_disk)}
                                </span>
                            </div>
                            <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all duration-500 rounded-full ${
                                        getDiskUsagePercent() > 90 ? 'bg-red-500' : 
                                        getDiskUsagePercent() > 75 ? 'bg-orange-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${getDiskUsagePercent()}%` }}
                                />
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                {t('admin.nodes.used_percent', { percent: getDiskUsagePercent().toFixed(1) })}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'after-resource-usage')} />

                {/* Individual Nodes */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight">{t('admin.nodes.individual_nodes')}</h2>
                    <div className="grid gap-6 xl:grid-cols-2">
                        {nodes.map((node) => (
                            <Card key={node.id} className="overflow-hidden border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                                <CardHeader className={`border-l-4 ${node.status === 'healthy' ? 'border-l-green-500' : 'border-l-red-500'} bg-secondary/10`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                             <CardTitle className="flex items-center gap-2">
                                                <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${node.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {node.name}
                                             </CardTitle>
                                             <CardDescription className="font-mono text-xs mt-1">
                                                {node.fqdn}
                                             </CardDescription>
                                        </div>
                                        <Badge variant={node.status === 'healthy' ? 'default' : 'destructive'}>
                                            {node.status === 'healthy' ? t('admin.nodes.online') : t('admin.nodes.offline')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {node.status === 'healthy' && node.utilization ? (
                                        <div className="space-y-6">
                                            {/* CPU */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium">{t('admin.nodes.cpu_usage')}</span>
                                                    <span className="text-muted-foreground">{node.utilization.cpu_percent.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary rounded-full transition-all duration-300"
                                                        style={{ width: `${Math.min(100, node.utilization.cpu_percent)}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                                                     <span>{t('admin.nodes.load')}: {node.utilization.load_average1}</span>
                                                     <span>{node.utilization.load_average5}</span>
                                                     <span>{node.utilization.load_average15}</span>
                                                </div>
                                            </div>

                                            {/* Memory */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium">{t('admin.nodes.memory')}</span>
                                                    <span className="text-muted-foreground">
                                                        {formatBytes(node.utilization.memory_used)} / {formatBytes(node.utilization.memory_total)}
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                        style={{ width: `${(node.utilization.memory_used / node.utilization.memory_total) * 100}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Disk */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium">{t('admin.nodes.disk')}</span>
                                                    <span className="text-muted-foreground">
                                                        {formatBytes(node.utilization.disk_used)} / {formatBytes(node.utilization.disk_total)}
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                                                        style={{ width: `${(node.utilization.disk_used / node.utilization.disk_total) * 100}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Swap */}
                                            {node.utilization.swap_total > 0 && (
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="font-medium">{t('admin.nodes.swap')}</span>
                                                        <span className="text-muted-foreground">
                                                            {formatBytes(node.utilization.swap_used)} / {formatBytes(node.utilization.swap_total)}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-orange-500 rounded-full transition-all duration-300"
                                                            style={{ width: `${(node.utilization.swap_used / node.utilization.swap_total) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <div className="ml-2">
                                                <AlertTitle>{t('admin.nodes.offline')}</AlertTitle>
                                                <AlertDescription>
                                                    {node.error || 'Cannot connect to Wings daemon'}
                                                </AlertDescription>
                                            </div>
                                        </Alert>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'after-individual-nodes')} />
                </>
            )}

            <WidgetRenderer widgets={getWidgets('admin-nodes-status', 'bottom-of-page')} />
        </div>
    )
}
