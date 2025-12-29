'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import { cn } from '@/lib/utils'
import BackgroundWrapper from '@/components/theme/BackgroundWrapper'
import { getAdminNavigationItems, getMainNavigationItems } from '@/config/navigation'
import { usePluginRoutes, getPluginPaths } from '@/hooks/usePluginRoutes'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Use shared plugin routes hook
  const pluginData = usePluginRoutes()
  const pluginPaths = getPluginPaths(pluginData)

  // Determine if this is a plugin page or full-width page
  // Server console (without plugin path) should NOT be treated as a plugin page
  const isServerConsolePage = pathname.match(/^\/server\/[^/]+$/)
  const isPluginPage = (pathname.startsWith('/server/') && !isServerConsolePage) || 
                       pathname.startsWith('/admin/') ||
                       pathname.match(/^\/dashboard\/.+/)

  // Get all built-in core paths from navigation config
  // Mock translation function for extracting URLs
  const mockT = (key: string) => key
  const mockHasPermission = () => true
  
  // Get all navigation items (pass null for settings to get all possible paths)
  const adminItems = getAdminNavigationItems(mockT, null)
  const mainItems = getMainNavigationItems(mockT, null, mockHasPermission)
  
  const builtInPaths: string[] = []
  // Extract URLs from all items
  adminItems.forEach(item => {
    if (item.url && !item.isPlugin) {
      builtInPaths.push(item.url)
    }
  })
  
  mainItems.forEach(item => {
    if (item.url && !item.isPlugin) {
      builtInPaths.push(item.url)
    }
  })
  
  // Check if current path starts with any plugin path
  const isActualPluginPage = pluginPaths.some(pluginPath => pathname.startsWith(pluginPath))
  
  // Check if current path starts with any built-in path (supports subpages like /dashboard/tickets/create)
  const isCoreFeaturePage = pathname === '/dashboard' || builtInPaths.some(corePath => pathname.startsWith(corePath))
  
  // Only apply full-width mode to actual plugin pages (not core features or server console)
  // Use plugin paths if available, otherwise fall back to old detection
  const isFullWidthMode = isActualPluginPage || (isPluginPage && !isCoreFeaturePage && !pathname.startsWith('/auth/'))

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    // Check authentication via cookie
    const token = getCookie('remember_token')
    if (!token) {
      router.push('/auth/login')
    }
  }, [router])

  useEffect(() => {
    const handleToggle = () => setSidebarCollapsed(prev => !prev)
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <BackgroundWrapper>
      <div className={cn(
        "min-h-screen flex flex-col",
        isFullWidthMode && "h-screen overflow-hidden"
      )}>
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}>
          <Navbar onMenuClick={() => setMobileOpen(true)} />
          
          <main className={cn(
            "flex-1",
            isFullWidthMode ? "p-0 overflow-hidden" : "py-6 px-4 sm:px-6 lg:px-8"
          )}>
            <div className={cn(
              isFullWidthMode && "h-full",
              !isFullWidthMode && "mx-auto max-w-7xl"
            )}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
