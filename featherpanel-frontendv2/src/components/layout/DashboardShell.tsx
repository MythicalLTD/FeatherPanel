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

'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import { cn } from '@/lib/utils'
import BackgroundWrapper from '@/components/theme/BackgroundWrapper'

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

  // Check if current path starts with any built-in path (supports subpages like /dashboard/tickets/create)
  // const isCoreFeaturePage = pathname === '/dashboard' || builtInPaths.some(corePath => pathname.startsWith(corePath))
  
  // Check if current path starts with any plugin path
  const isActualPluginPage = pluginPaths.some(pluginPath => {
    // If it's a server page, we need to handle UUID matching
    if (pathname.startsWith('/server/')) {
        const uuid = pathname.split('/')[2]
        if (uuid) {
            // Check if this plugin path is intended for server activity
            // The plugin path from getPluginPaths might be absolute like /minecraftpluginmanager
            // We need to see if the current path matches /server/[uuid][pluginPath]
            
            // Clean up the plugin path to ensure it doesn't duplicate /server prefix
            let cleanPluginPath = pluginPath
            if (cleanPluginPath.startsWith('/server')) {
                cleanPluginPath = cleanPluginPath.replace('/server', '')
            }
            if (!cleanPluginPath.startsWith('/')) {
                cleanPluginPath = '/' + cleanPluginPath
            }
            
            const constructedPath = `/server/${uuid}${cleanPluginPath}`
            return pathname.startsWith(constructedPath)
        }
    }
    return pathname.startsWith(pluginPath)
  })
  
  // Only apply full-width mode to actual plugin pages (as determined by the backend configuration)
  const isFullWidthMode = isActualPluginPage

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
