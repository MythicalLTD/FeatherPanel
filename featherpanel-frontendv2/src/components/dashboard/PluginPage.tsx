'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import axios from 'axios'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSettings } from '@/contexts/SettingsContext'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { cn, isEnabled } from '@/lib/utils'
import type { PluginSidebarResponse, PluginSidebarItem } from '@/types/navigation'

interface PluginPageProps {
    context: 'admin' | 'client' | 'server'
    serverUuid?: string
}

export default function PluginPage({ context, serverUuid }: PluginPageProps) {
    const { t } = useTranslation()
    const { settings } = useSettings()
    const pathname = usePathname()
    const iframeRef = useRef<HTMLIFrameElement>(null)

    const [loading, setLoading] = useState(true)
    const [iframeLoading, setIframeLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [iframeError, setIframeError] = useState<string | null>(null)
    const [iframeSrc, setIframeSrc] = useState<string | null>(null)

    useEffect(() => {
        const fetchPluginData = async () => {
            setLoading(true)
            setError(null)

            // Set serverUuid cookie if in server context to help backend controller
            if (context === 'server' && serverUuid) {
                document.cookie = `serverUuid=${serverUuid}; path=/; max-age=3600; SameSite=Lax`
            }

            try {
                const { data } = await axios.get<PluginSidebarResponse>('/api/system/plugin-sidebar')
                if (!data.success || !data.data?.sidebar) {
                    throw new Error('Failed to load plugin data')
                }

                const sidebar = data.data.sidebar
                let sidebarSection: Record<string, PluginSidebarItem> = {}

                if (context === 'admin') {
                    sidebarSection = sidebar.admin || {}
                } else if (context === 'server') {
                    sidebarSection = sidebar.server || {}
                } else {
                    sidebarSection = sidebar.client || {}
                }

                // Determine plugin path from current pathname
                let pluginPath = ''
                if (context === 'admin') {
                    pluginPath = pathname.replace('/admin', '')
                } else if (context === 'server' && serverUuid) {
                    const serverPrefix = `/server/${serverUuid}`
                    pluginPath = pathname.replace(serverPrefix, '')
                } else if (context === 'client') {
                    // Try to handle /dashboard/ and other dashboard nested paths
                    pluginPath = pathname.replace('/dashboard', '')
                }

                // Find matching item
                let matchingItem = sidebarSection[pluginPath]
                if (!matchingItem) {
                    for (const [key, value] of Object.entries(sidebarSection)) {
                        if (
                            key === pluginPath ||
                            (value.redirect && (pluginPath === value.redirect || pluginPath.endsWith(value.redirect)))
                        ) {
                            matchingItem = value
                            break
                        }
                    }
                }

                // Loose matching if still not found
                if (!matchingItem && (context === 'client' || context === 'admin')) {
                    for (const value of Object.values(sidebarSection)) {
                        if (value.component && pathname.includes(value.plugin)) {
                            matchingItem = value
                            break
                        }
                    }
                }

                if (matchingItem && matchingItem.component) {
                    let componentUrl = `/components/${matchingItem.plugin}/${matchingItem.component}`
                    
                    // The backend might return serverUuid=notFound if cookie wasn't set yet
                    // or it might have other placeholders.
                    if (context === 'server' && serverUuid) {
                        if (componentUrl.includes('serverUuid=notFound')) {
                            componentUrl = componentUrl.replace('serverUuid=notFound', `serverUuid=${serverUuid}`)
                        } else if (!componentUrl.includes('serverUuid=')) {
                            const separator = componentUrl.includes('?') ? '&' : '?'
                            componentUrl += `${separator}serverUuid=${serverUuid}`
                        }
                    }

                    setIframeSrc(componentUrl)
                } else {
                    setError('Plugin page not found')
                }
            } catch (err) {
                console.error('Error fetching plugin data:', err)
                setError('Failed to load plugin information')
            } finally {
                setLoading(false)
            }
        }

        fetchPluginData()
    }, [pathname, context, serverUuid, t])

    const injectScrollbarStyles = () => {
        if (!iframeRef.current) return

        try {
            const iframe = iframeRef.current
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

            if (!iframeDoc) return
            if (iframeDoc.getElementById('featherpanel-custom-scrollbar')) return

            const style = iframeDoc.createElement('style')
            style.id = 'featherpanel-custom-scrollbar'
            style.textContent = `
                * {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
                }
                *::-webkit-scrollbar { width: 10px; height: 10px; }
                *::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
                *::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.5);
                    border-radius: 10px;
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                @media (prefers-color-scheme: dark) {
                    * { scrollbar-color: rgba(100, 116, 139, 0.5) transparent; }
                    *::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.5); }
                }
            `
            if (iframeDoc.head) {
                iframeDoc.head.appendChild(style)
            }
        } catch (err) {
            console.debug('Could not inject styles into iframe (cross-origin limitation):', err)
        }
    }

    const onIframeLoad = () => {
        setIframeError(null)
        setIframeLoading(false)
        setTimeout(injectScrollbarStyles, 100)
    }

    const onIframeError = () => {
        setIframeError('Failed to load content')
        setIframeLoading(false)
    }

    const retryLoad = () => {
        setIframeError(null)
        setIframeLoading(true)
        if (iframeRef.current && iframeSrc) {
            iframeRef.current.src = ''
            setTimeout(() => {
                if (iframeRef.current) iframeRef.current.src = iframeSrc
            }, 100)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    <span>{t('common.loading')}...</span>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-xl font-bold mb-2">{error}</h3>
                <p className="text-muted-foreground">This page could not be loaded or doesn&apos;t exist.</p>
            </div>
        )
    }

    return (
        <div className="relative w-full h-full overflow-hidden">
            {/* Developer Mode Reload Button */}
            {isEnabled(settings?.app_developer_mode) && (
                <div className="absolute bottom-6 right-6 z-30">
                    <button
                        onClick={retryLoad}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg hover:shadow-xl transition-all font-medium text-sm"
                        title="Reload Content"
                    >
                        <RefreshCw className={cn("h-4 w-4", iframeLoading && "animate-spin")} />
                        <span>Reload Plugin</span>
                    </button>
                </div>
            )}

            {/* Loading Overlay */}
            {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/20 backdrop-blur-sm z-20">
                    <div className="relative mb-6">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-muted border-t-primary" />
                        <div className="absolute inset-0 animate-pulse rounded-full h-16 w-16 bg-primary/20" />
                    </div>
                    <p className="text-muted-foreground text-lg font-medium">Loading content...</p>
                </div>
            )}

            {/* Error Overlay */}
            {iframeError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-md z-20 p-8 text-center">
                    <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Failed to load content</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">{iframeError}</p>
                    <button
                        onClick={retryLoad}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium"
                    >
                        Retry Loading
                    </button>
                </div>
            )}

            {/* Iframe */}
            {iframeSrc && (
                <iframe
                    ref={iframeRef}
                    src={iframeSrc}
                    className={cn(
                        "w-full h-full border-0 transition-all duration-500",
                        iframeLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
                    )}
                    onLoad={onIframeLoad}
                    onError={onIframeError}
                />
            )}
        </div>
    )
}
