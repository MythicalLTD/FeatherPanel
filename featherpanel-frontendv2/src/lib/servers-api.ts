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
