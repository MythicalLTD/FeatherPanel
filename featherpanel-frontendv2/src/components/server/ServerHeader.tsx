'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Square, RotateCw, Skull, Loader2 } from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'
import { useState } from 'react'

interface ServerHeaderProps {
  serverName: string
  serverStatus: string
  serverUuid?: string
  serverUuidShort?: string
  nodeLocation?: string
  nodeLocationFlag?: string
  canStart?: boolean
  canStop?: boolean
  canRestart?: boolean
  canKill?: boolean
  onStart?: () => void
  onStop?: () => void
  onRestart?: () => void
  onKill?: () => void
}

export default function ServerHeader({
  serverName,
  serverStatus,
  serverUuid,
  serverUuidShort,
  nodeLocation,
  nodeLocationFlag,
  canStart = false,
  canStop = false,
  canRestart = false,
  canKill = false,
  onStart,
  onStop,
  onRestart,
  onKill,
}: ServerHeaderProps) {
  const { t } = useTranslation()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAction = async (action: string, callback?: () => void) => {
    if (!callback) return
    setActionLoading(action)
    try {
      await callback()
    } finally {
      setTimeout(() => setActionLoading(null), 1000)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'starting':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'stopping':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'offline':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-red-500/10 text-red-500 border-red-500/20'
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{serverName}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Badge className={getStatusColor(serverStatus)}>
                    {serverStatus.toUpperCase()}
                </Badge>
                {serverUuidShort && (
                    <span className="flex items-center gap-1">
                        <span className="opacity-50">#</span>
                        <code className="bg-muted px-1 rounded font-mono text-xs">{serverUuidShort}</code>
                    </span>
                )}
                {nodeLocation && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50">
                        {nodeLocationFlag ? (
                             /* eslint-disable-next-line @next/next/no-img-element */
                             <img
                                 src={`https://flagcdn.com/16x12/${nodeLocationFlag}.png`}
                                 srcSet={`https://flagcdn.com/32x24/${nodeLocationFlag}.png 2x, https://flagcdn.com/48x36/${nodeLocationFlag}.png 3x`}
                                 alt={nodeLocation}
                                 className="h-3 w-4 object-cover rounded-[1px]"
                             />
                        ) : (
                             <span className="opacity-50">@</span>
                        )}
                        <span className="font-medium">{nodeLocation}</span>
                    </span>
                )}
            </div>
            {serverUuid && (
               <p className="text-xs text-muted-foreground/50 font-mono hidden sm:block">
                   {t('servers.console.uuid')}: {serverUuid}
               </p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <Button
                variant="outline"
                size="sm"
                disabled={serverStatus === 'running' || serverStatus === 'starting' || actionLoading === 'start'}
                onClick={() => handleAction('start', onStart)}
                className="flex items-center gap-2"
              >
                {actionLoading === 'start' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>{t('servers.start')}</span>
              </Button>
            )}
            
            {canRestart && (
              <Button
                variant="outline"
                size="sm"
                disabled={serverStatus === 'offline' || actionLoading === 'restart'}
                onClick={() => handleAction('restart', onRestart)}
                className="flex items-center gap-2"
              >
                {actionLoading === 'restart' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                <span>{t('servers.restart')}</span>
              </Button>
            )}
            
            {canStop && (
              <Button
                variant="outline"
                size="sm"
                disabled={serverStatus === 'offline' || serverStatus === 'stopping' || actionLoading === 'stop'}
                onClick={() => handleAction('stop', onStop)}
                className="flex items-center gap-2"
              >
                {actionLoading === 'stop' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>{t('servers.stop')}</span>
              </Button>
            )}
            
            {canKill && (
              <Button
                variant="destructive"
                size="sm"
                disabled={serverStatus === 'offline' || actionLoading === 'kill'}
                onClick={() => handleAction('kill', onKill)}
                className="flex items-center gap-2"
              >
                {actionLoading === 'kill' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Skull className="h-4 w-4" />
                )}
                <span>{t('servers.console.kill')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
