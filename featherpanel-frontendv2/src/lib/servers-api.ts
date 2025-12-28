import api from './api'
import type { Server } from '@/types/server'

// API Response types
interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  error: boolean
  error_message: string | null
  error_code: string | null
}

interface JWTResponse {
  token: string
  expires_at: number
  server_uuid: string
  user_uuid: string
  permissions: string[]
  connection_string: string
}

// Servers API
export const serversApi = {
  // Get all servers
  getServers: async (viewAll = false): Promise<Server[]> => {
    const response = await api.get<ApiResponse<{ servers: Server[] }>>('/user/servers', {
      params: { view_all: viewAll }
    })
    // Extract servers from nested data.servers
    return response.data.data.servers || []
  },

  // Get single server
  getServer: async (identifier: string): Promise<Server> => {
    const response = await api.get<ApiResponse<Server>>(`/user/servers/${identifier}`)
    return response.data.data
  },

  // Get WebSocket JWT token
  getWebSocketToken: async (serverUuid: string): Promise<JWTResponse> => {
    const response = await api.post<ApiResponse<JWTResponse>>(`/user/servers/${serverUuid}/jwt`)
    return response.data.data
  },
}

export default serversApi
