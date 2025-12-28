import { useState, useEffect, useRef, useCallback } from 'react'
import { serversApi } from '@/lib/servers-api'

// WebSocket message types
interface WebSocketMessage {
  event: string
  data?: string
  args?: string[]
  timestamp?: number
}

// Server stats from Wings
interface WingsStats {
  memory_bytes: number
  memory_limit_bytes: number
  cpu_absolute: number
  cpu_limit: number
  disk_bytes: number
  disk_limit_bytes: number
  network?: {
    rx_bytes: number
    tx_bytes: number
  }
  state: string
  uptime: number
}

// Connection state for each server
interface ServerConnectionState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  wingsStatus: 'unknown' | 'healthy' | 'error'
  websocket: WebSocket | null
  jwtToken: string
  jwtExpiresAt: number
  reconnectAttempts: number
  reconnectTimeout: NodeJS.Timeout | null
  tokenExpirationTimer: NodeJS.Timeout | null
  statsInterval: NodeJS.Timeout | null
  isRefreshingToken: boolean
}

// Live server data
export interface ServerLiveData {
  status: string | null
  stats: {
    cpuUsage: number // Percentage
    memoryUsage: number // Bytes
    diskUsage: number // Bytes
    networkRx: number // Bytes
    networkTx: number // Bytes
    state: string
    uptime: number
  } | null
  lastUpdate: number | null
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 5000 // 5 seconds
const STATS_REQUEST_INTERVAL = 5000 // Request stats every 5 seconds

export function useServersWebSocket() {
  const [serverLiveData, setServerLiveData] = useState<Record<string, ServerLiveData>>({})
  const connectionsRef = useRef<Map<string, ServerConnectionState>>(new Map())

  // Get live data for a specific server
  const getServerLiveData = useCallback((serverUuid: string): ServerLiveData | undefined => {
    return serverLiveData[serverUuid]
  }, [serverLiveData])

  // Check if server is connected
  const isServerConnected = useCallback((serverUuid: string): boolean => {
    const state = connectionsRef.current.get(serverUuid)
    return state?.connectionStatus === 'connected'
  }, [])

  // Check if server is connecting
  const isServerConnecting = useCallback((serverUuid: string): boolean => {
    const state = connectionsRef.current.get(serverUuid)
    return state?.connectionStatus === 'connecting'
  }, [])

  // Check if Wings daemon is healthy
  const isWingsHealthy = useCallback((serverUuid: string): boolean => {
    const state = connectionsRef.current.get(serverUuid)
    return state?.wingsStatus === 'healthy'
  }, [])

  // Update server live data
  const updateServerLiveData = useCallback((serverUuid: string, updates: Partial<ServerLiveData>) => {
    setServerLiveData(prev => ({
      ...prev,
      [serverUuid]: {
        status: updates.status !== undefined ? updates.status : prev[serverUuid]?.status || null,
        stats: updates.stats !== undefined ? updates.stats : prev[serverUuid]?.stats || null,
        lastUpdate: updates.lastUpdate !== undefined ? updates.lastUpdate : Date.now(),
      }
    }))
  }, [])

  // Request server stats
  const requestServerStats = useCallback((serverUuid: string) => {
    const state = connectionsRef.current.get(serverUuid)
    if (!state || !state.websocket || state.websocket.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      state.websocket.send(JSON.stringify({
        event: 'send stats',
        args: [],
      }))
    } catch (error) {
      console.warn(`Failed to request stats for server ${serverUuid}:`, error)
    }
  }, [])

  // Setup stats interval
  const setupStatsInterval = useCallback((serverUuid: string) => {
    const state = connectionsRef.current.get(serverUuid)
    if (!state) return

    // Clear existing interval
    if (state.statsInterval) {
      clearInterval(state.statsInterval)
      state.statsInterval = null
    }

    // Only request stats if server is running/starting
    const liveData = serverLiveData[serverUuid]
    if (liveData?.status === 'running' || liveData?.status === 'starting') {
      state.statsInterval = setInterval(() => {
        if (isServerConnected(serverUuid)) {
          requestServerStats(serverUuid)
        }
      }, STATS_REQUEST_INTERVAL)
    }
  }, [serverLiveData, isServerConnected, requestServerStats])

  // Declare all functions first, then define them
  const refreshTokenRef = useRef<((serverUuid: string) => Promise<void>) | null>(null)
  const connectServerInternalRef = useRef<((serverUuid: string, connectionString: string, state: ServerConnectionState) => Promise<void>) | null>(null)
  const scheduleReconnectRef = useRef<((serverUuid: string) => void) | null>(null)
  const connectServerRef = useRef<((serverUuid: string) => Promise<void>) | null>(null)

  // Setup token expiration timer
  const setupTokenExpirationTimer = useCallback((serverUuid: string) => {
    const state = connectionsRef.current.get(serverUuid)
    if (!state) return

    // Clear any existing timer
    if (state.tokenExpirationTimer) {
      clearTimeout(state.tokenExpirationTimer)
      state.tokenExpirationTimer = null
    }

    if (!state.jwtExpiresAt) return

    // Calculate time until expiration
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = state.jwtExpiresAt
    const timeUntilExpiration = (expiresAt - now) * 1000

    if (timeUntilExpiration <= 0) {
      return
    }

    // Refresh 1 minute before expiration
    const refreshTime = Math.max(timeUntilExpiration - 60000, 5000)
    state.tokenExpirationTimer = setTimeout(async () => {
      const currentState = connectionsRef.current.get(serverUuid)
      if (currentState && currentState.connectionStatus === 'connected' && refreshTokenRef.current) {
        await refreshTokenRef.current(serverUuid)
      }
    }, refreshTime)
  }, [])

  // Refresh token
  const refreshToken = useCallback(async (serverUuid: string) => {
    const state = connectionsRef.current.get(serverUuid)
    if (!state) return

    try {
      state.isRefreshingToken = true

      // Close current WebSocket
      if (state.websocket) {
        state.websocket.close()
        state.websocket = null
      }

      // Clear stats interval
      if (state.statsInterval) {
        clearInterval(state.statsInterval)
        state.statsInterval = null
      }

      state.connectionStatus = 'connecting'

      // Get new JWT token
      const tokenData = await serversApi.getWebSocketToken(serverUuid)
      state.jwtToken = tokenData.token
      state.jwtExpiresAt = tokenData.expires_at

      // Setup new token expiration timer
      setupTokenExpirationTimer(serverUuid)

      // Reconnect WebSocket
      if (connectServerInternalRef.current) {
        await connectServerInternalRef.current(serverUuid, tokenData.connection_string, state)
      }
      state.isRefreshingToken = false
    } catch (error) {
      console.error(`Token refresh error for server ${serverUuid}:`, error)
      state.connectionStatus = 'disconnected'
      state.wingsStatus = 'error'
      state.isRefreshingToken = false
    }
  }, [setupTokenExpirationTimer])

  // Store in ref
  useEffect(() => {
    refreshTokenRef.current = refreshToken
  }, [refreshToken])

  // Internal connect function
  const connectServerInternal = useCallback(async (
    serverUuid: string,
    connectionString: string,
    state: ServerConnectionState
  ) => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(connectionString)
      state.websocket = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({
          event: 'auth',
          args: [state.jwtToken],
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)

          if (data.event === 'auth success') {
            state.connectionStatus = 'connected'
            state.reconnectAttempts = 0
            state.wingsStatus = 'healthy'
            requestServerStats(serverUuid)
            setupStatsInterval(serverUuid)
            resolve()
          } else if (data.event === 'auth_error') {
            state.connectionStatus = 'disconnected'
            state.wingsStatus = 'error'
            ws.close()
            reject(new Error('Authentication failed'))
          } else if (data.event === 'status') {
            const newStatus = data.args?.[0] || null
            updateServerLiveData(serverUuid, { status: newStatus })
            state.wingsStatus = 'healthy'
            setupStatsInterval(serverUuid)
            if (newStatus === 'running') {
              requestServerStats(serverUuid)
            }
          } else if (data.event === 'stats') {
            try {
              const stats: WingsStats = JSON.parse(data.args?.[0] || '{}')
              updateServerLiveData(serverUuid, {
                status: stats.state,
                stats: {
                  cpuUsage: Math.round(stats.cpu_absolute || 0),
                  memoryUsage: stats.memory_bytes || 0,
                  diskUsage: stats.disk_bytes || 0,
                  networkRx: stats.network?.rx_bytes || 0,
                  networkTx: stats.network?.tx_bytes || 0,
                  state: stats.state || '',
                  uptime: stats.uptime || 0,
                },
              })
              state.wingsStatus = 'healthy'
            } catch (parseError) {
              console.warn(`Failed to parse stats for server ${serverUuid}:`, parseError)
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }

      ws.onclose = () => {
        state.connectionStatus = 'disconnected'
        state.websocket = null

        if (state.statsInterval) {
          clearInterval(state.statsInterval)
          state.statsInterval = null
        }

        if (!state.isRefreshingToken && state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && scheduleReconnectRef.current) {
          scheduleReconnectRef.current(serverUuid)
        }
      }

      ws.onerror = () => {
        state.connectionStatus = 'disconnected'
        state.websocket = null

        if (state.statsInterval) {
          clearInterval(state.statsInterval)
          state.statsInterval = null
        }

        reject(new Error('WebSocket error'))
      }
    })
  }, [requestServerStats, setupStatsInterval, updateServerLiveData])

  // Store in ref
  useEffect(() => {
    connectServerInternalRef.current = connectServerInternal
  }, [connectServerInternal])

  // Schedule reconnect
  const scheduleReconnect = useCallback((serverUuid: string) => {
    const state = connectionsRef.current.get(serverUuid)
    if (!state || state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return

    state.reconnectAttempts++
    state.connectionStatus = 'disconnected'

    if (state.reconnectTimeout) {
      clearTimeout(state.reconnectTimeout)
    }

    state.reconnectTimeout = setTimeout(() => {
      if (connectServerRef.current) {
        connectServerRef.current(serverUuid)
      }
    }, RECONNECT_DELAY * state.reconnectAttempts)
  }, [])

  // Store in ref
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect
  }, [scheduleReconnect])

  // Connect to a server
  const connectServer = useCallback(async (serverUuid: string) => {
    let state = connectionsRef.current.get(serverUuid)
    
    if (!state) {
      state = {
        connectionStatus: 'disconnected',
        wingsStatus: 'unknown',
        websocket: null,
        jwtToken: '',
        jwtExpiresAt: 0,
        reconnectAttempts: 0,
        reconnectTimeout: null,
        tokenExpirationTimer: null,
        statsInterval: null,
        isRefreshingToken: false,
      }
      connectionsRef.current.set(serverUuid, state)
    }

    if (state.connectionStatus === 'connected' || state.connectionStatus === 'connecting') {
      return
    }

    try {
      state.connectionStatus = 'connecting'

      // Get JWT token
      const tokenData = await serversApi.getWebSocketToken(serverUuid)
      state.jwtToken = tokenData.token
      state.jwtExpiresAt = tokenData.expires_at

      // Setup token expiration timer
      setupTokenExpirationTimer(serverUuid)

      // Connect WebSocket
      if (connectServerInternalRef.current) {
        await connectServerInternalRef.current(serverUuid, tokenData.connection_string, state)
      }
    } catch (error) {
      state.connectionStatus = 'disconnected'
      state.wingsStatus = 'error'
      console.error(`Connection error for server ${serverUuid}:`, error)

      if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && scheduleReconnectRef.current) {
        scheduleReconnectRef.current(serverUuid)
      }
    }
  }, [setupTokenExpirationTimer])

  // Store in ref
  useEffect(() => {
    connectServerRef.current = connectServer
  }, [connectServer])

  // Disconnect from a server
  const disconnectServer = useCallback((serverUuid: string) => {
    const state = connectionsRef.current.get(serverUuid)
    if (!state) return

    if (state.reconnectTimeout) {
      clearTimeout(state.reconnectTimeout)
      state.reconnectTimeout = null
    }

    if (state.tokenExpirationTimer) {
      clearTimeout(state.tokenExpirationTimer)
      state.tokenExpirationTimer = null
    }

    if (state.statsInterval) {
      clearInterval(state.statsInterval)
      state.statsInterval = null
    }

    if (state.websocket) {
      state.websocket.close()
      state.websocket = null
    }

    state.connectionStatus = 'disconnected'
    state.wingsStatus = 'unknown'
    state.reconnectAttempts = 0
    state.isRefreshingToken = false
  }, [])

  // Connect to multiple servers
  const connectServers = useCallback(async (serverUuids: string[]) => {
    await Promise.all(serverUuids.map(uuid => connectServer(uuid)))
  }, [connectServer])

  // Disconnect from all servers
  const disconnectAll = useCallback(() => {
    connectionsRef.current.forEach((_, serverUuid) => {
      disconnectServer(serverUuid)
    })
  }, [disconnectServer])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectAll()
    }
  }, [disconnectAll])

  return {
    serverLiveData,
    getServerLiveData,
    isServerConnected,
    isServerConnecting,
    isWingsHealthy,
    connectServer,
    disconnectServer,
    connectServers,
    disconnectAll,
    requestServerStats,
  }
}
