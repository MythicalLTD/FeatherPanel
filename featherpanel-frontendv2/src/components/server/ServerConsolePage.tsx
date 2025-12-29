'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useWingsWebSocket } from '@/hooks/useWingsWebSocket'
import ServerHeader from '@/components/server/ServerHeader'
import ServerInfoCards from '@/components/server/ServerInfoCards'
import ServerTerminal, { ServerTerminalRef } from '@/components/server/ServerTerminal'
import ServerPerformance from '@/components/server/ServerPerformance'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Wifi, WifiOff, Loader2 } from 'lucide-react'
import axios from 'axios'

import type { Server } from '@/types/server'
import { useTranslation } from '@/contexts/TranslationContext'

export default function ServerConsolePage() {
  const { t } = useTranslation()
  const params = useParams()
  const serverUuid = params.uuidShort as string
  const terminalRef = useRef<ServerTerminalRef>(null)

  const [server, setServer] = useState<Server | null>(null)
  const [loading, setLoading] = useState(true)
  const [serverStatus, setServerStatus] = useState('offline')
  const [wingsUptime, setWingsUptime] = useState<string>('')

  // Performance data
  const [cpuData, setCpuData] = useState<Array<{ timestamp: number; value: number }>>([])
  const [memoryData, setMemoryData] = useState<Array<{ timestamp: number; value: number }>>([])
  const [diskData, setDiskData] = useState<Array<{ timestamp: number; value: number }>>([])
  const [networkData, setNetworkData] = useState<Array<{ timestamp: number; value: number }>>([])
  const maxDataPoints = 60 // Keep last 60 data points

  // Current resource usage
  const [currentCpu, setCurrentCpu] = useState(0)
  const [currentMemory, setCurrentMemory] = useState(0)
  const [currentDisk, setCurrentDisk] = useState(0)

  // Wings WebSocket connection
  const {
    connectionStatus,
    ping,
    sendCommand,
    sendPowerAction,
    requestStats,
  } = useWingsWebSocket({
    serverUuid,
    onConsoleOutput: (output) => {
      // Write to terminal
      if (terminalRef.current) {
        terminalRef.current.writeln(output)
      }
    },
    onStatus: (status) => {
      setServerStatus(status)
    },
    onStats: (stats) => {
      const timestamp = Date.now()
      
      // Update uptime
      if (stats.uptime) {
        setWingsUptime(formatUptime(stats.uptime))
      }

      // Update CPU data
      if (stats.cpu_absolute !== undefined && stats.cpu_absolute !== null) {
        const cpuValue = Number(stats.cpu_absolute) || 0
        setCurrentCpu(cpuValue)
        setCpuData(prev => {
          const newData = [...prev, { timestamp, value: cpuValue }]
          return newData.slice(-maxDataPoints)
        })
      }

      // Update Memory data (convert bytes to MiB)
      if (stats.memory_bytes !== undefined && stats.memory_bytes !== null) {
        const memoryMiB = Number(stats.memory_bytes) / (1024 * 1024)
        setCurrentMemory(memoryMiB)
        setMemoryData(prev => {
          const newData = [...prev, { timestamp, value: memoryMiB }]
          return newData.slice(-maxDataPoints)
        })
      }

      // Update Disk data (convert bytes to MiB)
      if (stats.disk_bytes !== undefined && stats.disk_bytes !== null) {
        const diskMiB = Number(stats.disk_bytes) / (1024 * 1024)
        setCurrentDisk(diskMiB)
        setDiskData(prev => {
          const newData = [...prev, { timestamp, value: diskMiB }]
          return newData.slice(-maxDataPoints)
        })
      }

      // Update Network data (total rx + tx bytes)
      if (stats.network && stats.network.rx_bytes !== undefined && stats.network.tx_bytes !== undefined) {
        const totalBytes = Number(stats.network.rx_bytes) + Number(stats.network.tx_bytes)
        setNetworkData(prev => {
          const newData = [...prev, { timestamp, value: totalBytes }]
          return newData.slice(-maxDataPoints)
        })
      }
    },
  })

  // Fetch server details
  useEffect(() => {
    const fetchServer = async () => {
      try {
        setLoading(true)
        const { data } = await axios.get(`/api/user/servers/${serverUuid}`)
        if (data.success) {
          setServer(data.data)
          setServerStatus(data.data.status || 'offline')
        }
      } catch (error) {
        console.error('Failed to fetch server:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServer()
  }, [serverUuid])

  const formatUptime = (uptimeMs: number): string => {
    // Wings sends uptime in milliseconds, convert to seconds
    const seconds = Math.floor(uptimeMs / 1000)
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    const parts: string[] = []
    if (days > 0) parts.push(`${days}d`)
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

    return parts.join(' ')
  }

  // Request stats periodically for ping measurement
  useEffect(() => {
    if (connectionStatus !== 'connected' || !requestStats) return

    // Request stats immediately on connect
    requestStats()

    // Then request every 5 seconds for ping measurement
    const interval = setInterval(() => {
      requestStats()
    }, 5000)

    return () => clearInterval(interval)
  }, [connectionStatus, requestStats])

  // Initialize charts with zero data point
  useEffect(() => {
    const timestamp = Date.now()
    setCpuData([{ timestamp, value: 0 }])
    setMemoryData([{ timestamp, value: 0 }])
    setDiskData([{ timestamp, value: 0 }])
    setNetworkData([{ timestamp, value: 0 }])
  }, [])

  const getConnectionStatusInfo = () => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: Loader2,
          message: t('servers.console.connection.connecting'),
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10 border-blue-500/20',
          iconClass: 'animate-spin',
        }
      case 'connected':
        return {
          icon: Wifi,
          message: t('servers.console.connection.connected'),
          color: 'text-green-500',
          bgColor: 'bg-green-500/10 border-green-500/20',
          iconClass: '',
        }
      case 'error':
        return {
          icon: AlertTriangle,
          message: t('servers.console.connection.error'),
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10 border-yellow-500/20',
          iconClass: '',
        }
      default:
        return {
          icon: WifiOff,
          message: t('servers.console.connection.disconnected'),
          color: 'text-red-500',
          bgColor: 'bg-red-500/10 border-red-500/20',
          iconClass: '',
        }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('servers.console.loading')}</p>
        </div>
      </div>
    )
  }

  if (!server) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('servers.console.not_found.title')}</h2>
          <p className="text-muted-foreground">{t('servers.console.not_found.message')}</p>
        </div>
      </div>
    )
  }

  const connectionInfo = getConnectionStatusInfo()

  return (
    <div className="space-y-6 pb-8">
      {/* Server Header */}
      <ServerHeader
        serverName={server.name}
        serverStatus={serverStatus}
        serverUuid={server.uuid}
        serverUuidShort={server.uuidShort}
        nodeLocation={server.location?.name || server.node?.name}
        nodeLocationFlag={server.location?.flag_code}
        canStart={true}
        canStop={true}
        canRestart={true}
        canKill={true}
        onStart={() => sendPowerAction('start')}
        onStop={() => sendPowerAction('stop')}
        onRestart={() => sendPowerAction('restart')}
        onKill={() => sendPowerAction('kill')}
      />

      {/* Wings Connection Status (only show if not connected) */}
      {connectionStatus !== 'connected' && (
        <Card className={`border-2 ${connectionInfo.bgColor}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${connectionInfo.bgColor}`}>
                <connectionInfo.icon className={`h-6 w-6 ${connectionInfo.color} ${connectionInfo.iconClass}`} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${connectionInfo.color}`}>
                  {connectionInfo.message}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('servers.console.connection.info')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Server Info Cards */}
      <ServerInfoCards
        serverIp={server.allocation?.ip || server.allocation?.ip_alias || ''}
        serverPort={server.allocation?.port || 0}
        cpuLimit={server.cpu || 0}
        memoryLimit={server.memory || 0}
        diskLimit={server.disk || 0}
        wingsUptime={wingsUptime}
        ping={ping}
        cpuUsage={currentCpu}
        memoryUsage={currentMemory}
        diskUsage={currentDisk}
      />

      {/* Terminal Console */}
      <ServerTerminal 
        ref={terminalRef}
        onSendCommand={sendCommand}
        canSendCommands={connectionStatus === 'connected'}
        serverStatus={serverStatus}
      />

      {/* Performance Monitoring */}
      {server && (
        <ServerPerformance
          cpuData={cpuData}
          memoryData={memoryData}
          diskData={diskData}
          networkData={networkData}
          cpuLimit={server.cpu || 0}
          memoryLimit={server.memory || 0}
          diskLimit={server.disk || 0}
        />
      )}
    </div>
  )
}
