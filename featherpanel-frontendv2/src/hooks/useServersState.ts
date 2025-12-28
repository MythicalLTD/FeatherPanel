import { useState, useEffect, useCallback } from 'react'

// State interface
interface ServersState {
  selectedLayout: 'grid' | 'list'
  selectedSort: string
  showOnlyRunning: boolean
  viewMode: 'all' | 'folders'
}

// Default state
const DEFAULT_STATE: ServersState = {
  selectedLayout: 'grid',
  selectedSort: 'name',
  showOnlyRunning: false,
  viewMode: 'folders',
}

// LocalStorage key
const STORAGE_KEY = 'servers_preferences'

export function useServersState() {
  // Initialize state from localStorage
  const [state, setState] = useState<ServersState>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_STATE
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_STATE, ...parsed }
      }
    } catch (error) {
      console.error('Failed to load servers state from localStorage:', error)
    }

    return DEFAULT_STATE
  })

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save servers state to localStorage:', error)
    }
  }, [state])

  // Update functions
  const setSelectedLayout = useCallback((layout: 'grid' | 'list') => {
    setState(prev => ({ ...prev, selectedLayout: layout }))
  }, [])

  const setSelectedSort = useCallback((sort: string) => {
    setState(prev => ({ ...prev, selectedSort: sort }))
  }, [])

  const setShowOnlyRunning = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showOnlyRunning: show }))
  }, [])

  const setViewMode = useCallback((mode: 'all' | 'folders') => {
    setState(prev => ({ ...prev, viewMode: mode }))
  }, [])

  // Reset to defaults
  const resetState = useCallback(() => {
    setState(DEFAULT_STATE)
  }, [])

  return {
    // State
    selectedLayout: state.selectedLayout,
    selectedSort: state.selectedSort,
    showOnlyRunning: state.showOnlyRunning,
    viewMode: state.viewMode,

    // Setters
    setSelectedLayout,
    setSelectedSort,
    setShowOnlyRunning,
    setViewMode,
    resetState,
  }
}
