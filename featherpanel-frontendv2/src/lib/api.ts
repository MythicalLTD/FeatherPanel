import axios, { AxiosError } from 'axios'

// API base configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token')
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API calls
export const authApi = {
  login: async (data: { username_or_email: string; password: string; turnstile_token?: string }) => {
    const response = await api.put('/user/auth/login', data)
    return response.data
  },

  register: async (data: {
    first_name: string
    last_name: string
    email: string
    username: string
    password: string
    turnstile_token?: string
  }) => {
    const response = await api.put('/user/auth/register', data)
    return response.data
  },

  logout: async () => {
    const response = await api.delete('/user/auth/logout')
    return response.data
  },


  forgotPassword: async (email: string, turnstile_token?: string) => {
    const payload: { email: string; turnstile_token?: string } = { email }
    if (turnstile_token) {
      payload.turnstile_token = turnstile_token
    }
    const response = await api.put('/user/auth/forgot-password', payload)
    return response.data
  },

  resetPassword: async (data: { token: string; password: string }) => {
    const response = await api.post('/user/auth/reset-password', data)
    return response.data
  },

  verify2FA: async (data: { username_or_email: string; code: string }) => {
    const response = await api.post('/user/auth/verify-2fa', data)
    return response.data
  },

  setup2FA: async () => {
    const response = await api.get('/user/auth/setup-2fa')
    return response.data
  },

  enable2FA: async (code: string) => {
    const response = await api.post('/user/auth/enable-2fa', { code })
    return response.data
  },
}

// System API calls
export const systemApi = {
  getSettings: async () => {
    const response = await api.get('/system/settings')
    return response.data
  },
}

export default api
