'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import type { AppSettings, CoreInfo, SettingsResponse } from '@/types/settings'

interface SettingsContextType {
  settings: AppSettings | null
  core: CoreInfo | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const CACHE_KEY = 'app_settings'
const CACHE_VERSION = '1.0'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [core, setCore] = useState<CoreInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, version } = JSON.parse(cached)
        if (version === CACHE_VERSION) {
          setSettings(data.settings)
          setCore(data.core)
          setLoading(false)
        }
      }

      // Fetch fresh data
      const response = await fetch('/api/system/settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const result: SettingsResponse = await response.json()
      
      if (result.success && result.data) {
        setSettings(result.data.settings)
        setCore(result.data.core)
        setError(null)
        
        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: result.data,
          version: CACHE_VERSION,
          timestamp: Date.now()
        }))
      } else {
        throw new Error(result.error_message || 'Failed to load settings')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings'
      setError(errorMessage)
      console.error('Settings fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const refetch = useCallback(async () => {
    setLoading(true)
    await fetchSettings()
  }, [fetchSettings])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        core,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
