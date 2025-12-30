import api from "./api";
import type { Server } from "@/types/server";

// API Response types
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: boolean;
  error_message: string | null;
  error_code: string | null;
}

interface JWTResponse {
  token: string;
  expires_at: number;
  server_uuid: string;
  user_uuid: string;
  permissions: string[];
  connection_string: string;
}

interface ServersResponse {
  servers: Server[];
  pagination: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
  };
}

// Servers API
export const serversApi = {
  // Get all servers
  getServers: async (
    viewAll = false,
    page = 1,
    perPage = 10
  ): Promise<ServersResponse> => {
    const response = await api.get<ApiResponse<ServersResponse>>(
      "/user/servers",
      {
        params: { view_all: viewAll, page, per_page: perPage },
      }
    );
    return response.data.data;
  },

  // Get single server
  getServer: async (identifier: string): Promise<Server> => {
    const response = await api.get<ApiResponse<Server>>(
      `/user/servers/${identifier}`
    );
    return response.data.data;
  },

  // Get WebSocket JWT token
  getWebSocketToken: async (serverUuid: string): Promise<JWTResponse> => {
    const response = await api.post<ApiResponse<JWTResponse>>(
      `/user/servers/${serverUuid}/jwt`
    );
    return response.data.data;
  },
};

export default serversApi;
