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

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, Trash2, AlertTriangle, LayoutDashboard, Eye, EyeOff } from 'lucide-react'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { useSettings } from '@/contexts/SettingsContext'
import { usePluginWidgets } from '@/hooks/usePluginWidgets'
import { WidgetRenderer } from '@/components/server/WidgetRenderer'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'
import { cn } from '@/lib/utils'
import axios from 'axios'

// Components
import { WelcomeWidget } from '@/components/admin/WelcomeWidget'
import { QuickStatsWidget } from '@/components/admin/QuickStatsWidget'
import { CronStatusWidget } from '@/components/admin/CronStatusWidget'
import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget'
import { VersionInfoWidget } from '@/components/admin/VersionInfoWidget'
import { QuickLinksWidget } from '@/components/admin/QuickLinksWidget'
import { PageHeader } from '@/components/featherui/PageHeader'

export default function AdminDashboardPage() {
    const { t } = useTranslation()
    const router = useRouter()
    const { data, loading, refresh } = useAdminDashboard()
    const { settings } = useSettings()
    
    // Plugin Widgets
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-home')

    const [showAppUrlWarning, setShowAppUrlWarning] = useState(false)
    const [isClearingCache, setIsClearingCache] = useState(false)
    const [isCustomizing, setIsCustomizing] = useState(false)
    
    // Widget Visibility State (Local Storage persistent)
    const [hiddenWidgets, setHiddenWidgets] = useState<string[]>([])

    useEffect(() => {
        fetchWidgets()
        
        // Load hidden widgets from localStorage
        const stored = localStorage.getItem('admin-hidden-widgets')
        if (stored) {
            try {
                setHiddenWidgets(JSON.parse(stored))
            } catch (e) {
                console.error('Failed to parse hidden widgets', e)
            }
        }

        // APP_URL Warning Logic
        const defaultUrl = 'https://featherpanel.mythical.systems'
        const isDefault = settings?.app_url === defaultUrl
        const isDismissed = localStorage.getItem('app-url-warning-dismissed')
        
        if (isDefault && !isDismissed && !showAppUrlWarning) {
             const timer = setTimeout(() => setShowAppUrlWarning(true), 100)
             return () => clearTimeout(timer)
        }
    }, [fetchWidgets, settings, showAppUrlWarning])

    const clearCache = async () => {
        if (isClearingCache) return
        
        setIsClearingCache(true)
        const toastId = toast.loading(t('admin.dashboard.clearing_cache'))
        
        try {
            const response = await axios.post('/api/admin/dashboard/cache/clear')
            if (response.data.success) {
                toast.success(t('admin.dashboard.cache_cleared'), {
                    id: toastId
                })
                refresh()
            } else {
                toast.error(t('admin.dashboard.cache_failed'), {
                    description: response.data.message,
                    id: toastId
                })
            }
        } catch (err: unknown) {
            let message = t('admin.dashboard.cache_failed')
            if (axios.isAxiosError(err)) {
                message = err.response?.data?.message || err.message
            }
            toast.error(message, {
                id: toastId
            })
        } finally {
            setIsClearingCache(false)
        }
    }

    const dismissWarning = () => {
        localStorage.setItem('app-url-warning-dismissed', 'true')
        setShowAppUrlWarning(false)
    }

        const toggleWidgetVisibility = (widgetId: string) => {
        const newHidden = hiddenWidgets.includes(widgetId)
            ? hiddenWidgets.filter((id: string) => id !== widgetId)
            : [...hiddenWidgets, widgetId]
        
        setHiddenWidgets(newHidden)
        localStorage.setItem('admin-hidden-widgets', JSON.stringify(newHidden))
    }

    const isVisible = (widgetId: string) => !hiddenWidgets.includes(widgetId) || isCustomizing

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Plugin Widgets: Top of Page */}
            <WidgetRenderer widgets={getWidgets('admin-home', 'top-of-page')} />

            <PageHeader
                title={t('admin.dashboard.title')}
                description={t('admin.dashboard.subtitle')}
                icon={LayoutDashboard}
                actions={
                    <>
                        <button 
                            onClick={() => setIsCustomizing(!isCustomizing)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border",
                                isCustomizing 
                                    ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-lg shadow-amber-500/10" 
                                    : "bg-secondary/50 hover:bg-secondary border-border/50"
                            )}
                        >
                            <Settings className={cn("h-4 w-4", isCustomizing && "animate-spin-slow")} />
                            {isCustomizing ? t('admin.dashboard.stop_customizing') : t('admin.dashboard.customize')}
                        </button>
                        <button 
                            onClick={clearCache}
                            disabled={isClearingCache}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border/50 text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                            <Trash2 className={cn("h-4 w-4", isClearingCache && "animate-pulse")} />
                            {t('admin.dashboard.clear_cache')}
                        </button>
                        <Link 
                            href="/admin/settings"
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20"
                        >
                            <Settings className="h-4 w-4" />
                            {t('admin.dashboard.global_settings')}
                        </Link>
                    </>
                }
            />

            {/* Plugin Widgets: After Header */}
            <WidgetRenderer widgets={getWidgets('admin-home', 'after-header')} />

            {/* APP_URL Warning */}
            {showAppUrlWarning && (
                <div className="p-6 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 backdrop-blur-3xl animate-in slide-in-from-top-4 duration-500 relative group overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-red-500/20 transition-all duration-700" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/30 shadow-lg shadow-red-500/10 shrink-0">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black text-red-500 uppercase tracking-tight">{t('admin.dashboard.app_url_warning.title')}</h3>
                                <p className="text-sm text-red-500/70 font-bold leading-relaxed max-w-2xl">
                                    {t('admin.dashboard.app_url_warning.message')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={dismissWarning}
                                className="px-5 py-2.5 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                             >
                                {t('admin.dashboard.app_url_warning.remind_me')}
                             </button>
                             <button 
                                onClick={() => router.push('/admin/settings/advanced')}
                                className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-105 transition-all"
                             >
                                {t('admin.dashboard.app_url_warning.update_settings')}
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Welcome Banner */}
            <div className={cn("transition-all duration-500", !isVisible('welcome') && "hidden")}>
                <div className="relative">
                    {isCustomizing && (
                        <button 
                            onClick={() => toggleWidgetVisibility('welcome')}
                            className="absolute -top-3 -right-3 z-20 p-2 rounded-full bg-background border border-border shadow-xl hover:scale-110 transition-transform text-muted-foreground"
                        >
                            {hiddenWidgets.includes('welcome') ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                    )}
                    <div className={cn(hiddenWidgets.includes('welcome') && "opacity-30 grayscale")}>
                        <WelcomeWidget version={data?.version?.current?.version} />
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div className={cn("transition-all duration-500", !isVisible('stats') && "hidden")}>
                <div className="relative">
                    {isCustomizing && (
                        <button 
                            onClick={() => toggleWidgetVisibility('stats')}
                            className="absolute -top-3 -right-3 z-20 p-2 rounded-full bg-background border border-border shadow-xl hover:scale-110 transition-transform text-muted-foreground"
                        >
                            {hiddenWidgets.includes('stats') ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                    )}
                    <div className={cn(hiddenWidgets.includes('stats') && "opacity-30 grayscale")}>
                        <QuickStatsWidget stats={data?.count} loading={loading} />
                    </div>
                </div>
            </div>

            {/* Plugin Widgets: Before Grid */}
            <WidgetRenderer widgets={getWidgets('admin-home', 'before-widgets-grid')} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                    <div className={cn("transition-all duration-500", !isVisible('health') && "hidden")}>
                        <div className="relative">
                            {isCustomizing && (
                                <button 
                                    onClick={() => toggleWidgetVisibility('health')}
                                    className="absolute -top-3 -right-3 z-20 p-2 rounded-full bg-background border border-border shadow-xl hover:scale-110 transition-transform text-muted-foreground"
                                >
                                    {hiddenWidgets.includes('health') ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                            )}
                            <div className={cn(hiddenWidgets.includes('health') && "opacity-30 grayscale")}>
                                <SystemHealthWidget />
                            </div>
                        </div>
                    </div>

                    <div className={cn("transition-all duration-500", !isVisible('cron') && "hidden")}>
                        <div className="relative">
                            {isCustomizing && (
                                <button 
                                    onClick={() => toggleWidgetVisibility('cron')}
                                    className="absolute -top-3 -right-3 z-20 p-2 rounded-full bg-background border border-border shadow-xl hover:scale-110 transition-transform text-muted-foreground"
                                >
                                    {hiddenWidgets.includes('cron') ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                            )}
                            <div className={cn(hiddenWidgets.includes('cron') && "opacity-30 grayscale")}>
                                <CronStatusWidget tasks={data?.cron?.recent} loading={loading} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="space-y-8">
                    <div className={cn("transition-all duration-500", !isVisible('version') && "hidden")}>
                        <div className="relative">
                            {isCustomizing && (
                                <button 
                                    onClick={() => toggleWidgetVisibility('version')}
                                    className="absolute -top-3 -right-3 z-20 p-2 rounded-full bg-background border border-border shadow-xl hover:scale-110 transition-transform text-muted-foreground"
                                >
                                    {hiddenWidgets.includes('version') ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                            )}
                            <div className={cn(hiddenWidgets.includes('version') && "opacity-30 grayscale")}>
                                <VersionInfoWidget version={data?.version} />
                            </div>
                        </div>
                    </div>

                    <div className={cn("transition-all duration-500", !isVisible('links') && "hidden")}>
                        <div className="relative">
                            {isCustomizing && (
                                <button 
                                    onClick={() => toggleWidgetVisibility('links')}
                                    className="absolute -top-3 -right-3 z-20 p-2 rounded-full bg-background border border-border shadow-xl hover:scale-110 transition-transform text-muted-foreground"
                                >
                                    {hiddenWidgets.includes('links') ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                            )}
                            <div className={cn(hiddenWidgets.includes('links') && "opacity-30 grayscale")}>
                                <QuickLinksWidget 
                                    onClearCache={clearCache} 
                                    isClearingCache={isClearingCache} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plugin Widgets: After Grid */}
            <WidgetRenderer widgets={getWidgets('admin-home', 'after-widgets-grid')} />

            {/* Plugin Widgets: Bottom of Page */}
            <WidgetRenderer widgets={getWidgets('admin-home', 'bottom-of-page')} />
        </div>
    )
}
