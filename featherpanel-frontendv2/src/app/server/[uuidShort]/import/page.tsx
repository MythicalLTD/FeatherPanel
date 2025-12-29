'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { 
    Plus, 
    Upload, 
    RefreshCw, 
    Info, 
    User, 
    FolderUp, 
    FolderDown, 
    Calendar, 
    AlertTriangle, 
    Loader2,
    Check,
    X,
    Globe,
    Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useServerPermissions } from '@/hooks/useServerPermissions'
import { Button } from '@/components/ui/button'
import { isEnabled } from '@/lib/utils'
import { 
    Dialog
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ImportItem, ImportsResponse } from '@/types/server'

export default function ServerImportPage() {
    const { uuidShort } = useParams() as { uuidShort: string }
    const router = useRouter()
    const { t } = useTranslation()
    const { settings, loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    
    const [loading, setLoading] = useState(true)
    const [imports, setImports] = useState<ImportItem[]>([])
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)

    const canRead = hasPermission('import.read')
    const canManage = hasPermission('import.manage')

    // Handle success dialog from query param
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('success') === 'true') {
            setShowSuccessDialog(true)
            // Remove the query param without refreshing
            const newUrl = window.location.pathname
            window.history.replaceState({}, '', newUrl)
        }
    }, [])

    const fetchImports = useCallback(async () => {
        if (!uuidShort || settingsLoading || !isEnabled(settings?.server_allow_user_made_import)) return
        
        try {
            setLoading(true)
            const response = await axios.get<ImportsResponse>(`/api/user/servers/${uuidShort}/imports`)
            if (response.data.success) {
                setImports(response.data.data.imports || [])
            }
        } catch (error) {
            console.error('Error fetching imports:', error)
            toast.error(t('serverImport.failedToFetch'))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, t, settingsLoading, settings?.server_allow_user_made_import])

    useEffect(() => {
        if (!permissionsLoading && !settingsLoading && canRead && isEnabled(settings?.server_allow_user_made_import)) {
            fetchImports()
        }
    }, [canRead, permissionsLoading, settingsLoading, settings?.server_allow_user_made_import, fetchImports])

    // Auto-refresh when imports are in-progress
    useEffect(() => {
        const hasInProgress = imports.some(i => i.status === 'pending' || i.status === 'importing')
        if (hasInProgress) {
            const interval = setInterval(() => {
                fetchImports()
            }, 3000)
            return () => clearInterval(interval)
        }
    }, [imports, fetchImports])

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-500/5'
            case 'failed': return 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-500/5'
            case 'importing': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-lg shadow-blue-500/5'
            default: return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-lg shadow-yellow-500/5'
        }
    }

    const isImportEnabled = isEnabled(settings?.server_allow_user_made_import)

    if (permissionsLoading || settingsLoading) return null
    if (!canRead) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                    <Lock className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{t('common.accessDenied')}</h1>
                <p className="text-muted-foreground mt-2">{t('common.noPermission')}</p>
                <Button variant="outline" className="mt-8" onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        )
    }

    if (!isImportEnabled) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3">
                        <Lock className="h-16 w-16 text-red-500" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t('serverImport.featureDisabled')}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {t('serverImport.featureDisabledDescription')}
                    </p>
                </div>
                <Button variant="outline" size="lg" className="mt-8 rounded-2xl h-14 px-10" onClick={() => router.push(`/server/${uuidShort}`)}>
                    {t('common.goBack')}
                </Button>
            </div>
        )
    }

    if (loading && imports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-muted-foreground font-medium animate-pulse">{t('common.loading')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight uppercase">{t('serverImport.title')}</h1>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <p className="text-lg opacity-80">{t('serverImport.description')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => fetchImports()}
                        disabled={loading}
                        className="bg-background/50 backdrop-blur-md border-border/40 hover:bg-background/80"
                    >
                        <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                        {t('common.refresh')}
                    </Button>
                    {canManage && (
                        <Button 
                            size="lg" 
                            onClick={() => router.push(`/server/${uuidShort}/import/new`)}
                            className="shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all h-14"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            {t('serverImport.createImport')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Info Alert */}
            <div className="relative overflow-hidden p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl animate-in slide-in-from-top duration-500 shadow-sm">
                <div className="relative z-10 flex items-start gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                        <Info className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-blue-500 leading-none uppercase tracking-tight">{t('serverImport.infoTitle')}</h3>
                        <p className="text-sm text-blue-500/80 leading-relaxed font-medium">
                            {t('serverImport.infoDescription')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content List */}
            {imports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/10 rounded-[3rem] border border-dashed border-border/60 backdrop-blur-sm">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                            <Upload className="h-16 w-16 text-primary" />
                        </div>
                    </div>
                    <div className="max-w-md space-y-3 px-4">
                        <h2 className="text-3xl font-black uppercase tracking-tight">{t('serverImport.noImportsTitle')}</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                            {t('serverImport.noImportsDescription')}
                        </p>
                    </div>
                    {canManage && (
                        <Button 
                            size="lg" 
                            onClick={() => router.push(`/server/${uuidShort}/import/new`)}
                            className="h-14 px-10 text-lg shadow-2xl shadow-primary/20"
                        >
                            <Plus className="h-6 w-6 mr-2" />
                            {t('serverImport.createImport')}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {imports.map((item) => (
                        <div 
                            key={item.id}
                            className="group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-md border border-border/40 hover:border-primary/40 hover:bg-card/50 transition-all duration-300 shadow-sm"
                        >
                            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                                <div className={cn(
                                    "h-16 w-16 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 shadow-inner",
                                    item.status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20" : 
                                    item.status === 'failed' ? "bg-red-500/10 border-red-500/20" : 
                                    item.status === 'importing' ? "bg-blue-500/10 border-blue-500/20 animate-pulse" :
                                    "bg-yellow-500/10 border-yellow-500/20"
                                )}>
                                    <Upload className={cn(
                                        "h-8 w-8",
                                        item.status === 'completed' ? "text-emerald-500" : 
                                        item.status === 'failed' ? "text-red-500" : 
                                        item.status === 'importing' ? "text-blue-500" :
                                        "text-yellow-500"
                                    )} />
                                </div>

                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors duration-300">
                                            {item.host}:{item.port}
                                        </h3>
                                        <span className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none shadow-sm",
                                            getStatusStyles(item.status)
                                        )}>
                                            {t(`serverImport.status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`)}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40 shadow-sm flex items-center gap-1.5">
                                            <Globe className="h-3 w-3 opacity-60" />
                                            {item.type}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <User className="h-4 w-4 opacity-50" />
                                            <span className="text-sm font-bold truncate max-w-[120px]">{item.user}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FolderUp className="h-4 w-4 opacity-50" />
                                            <span className="text-sm font-bold truncate max-w-[180px]">{item.source_location}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <FolderDown className="h-4 w-4 opacity-50" />
                                            <span className="text-sm font-bold truncate max-w-[180px]">{item.destination_location}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground ml-auto sm:ml-0 opacity-60">
                                            <Calendar className="h-4 w-4 opacity-50" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">{new Date(item.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {item.status === 'failed' && item.error && (
                                        <div className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold leading-relaxed shadow-inner">
                                            <div className="flex items-start gap-3">
                                                <X className="h-5 w-5 shrink-0 mt-0.5" />
                                                <span>{item.error}</span>
                                            </div>
                                        </div>
                                    )}

                                    {(item.wipe || item.wipe_all_files) && (
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {item.wipe && (
                                                <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {t('serverImport.wipe')}
                                                </span>
                                            )}
                                            {item.wipe_all_files && (
                                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 leading-none shadow-lg shadow-red-500/5">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    {t('serverImport.wipeAllFiles')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Success Dialog */}
            <Dialog open={showSuccessDialog} onClose={() => setShowSuccessDialog(false)} className="max-w-md p-0">
                <div className="p-10 text-center space-y-6">
                    <div className="mx-auto h-24 w-24 rounded-4xl bg-emerald-500/20 flex items-center justify-center border-2 border-emerald-500/20 shadow-2xl shadow-emerald-500/20 animate-bounce">
                        <Check className="h-12 w-12 text-emerald-500 stroke-3" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-black tracking-tight uppercase">{t('serverImport.importStarted')}</h3>
                        <p className="text-muted-foreground font-medium text-lg leading-relaxed">{t('serverImport.importStartedDescription')}</p>
                    </div>
                    <Button 
                        size="lg" 
                        onClick={() => setShowSuccessDialog(false)}
                        className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/20 rounded-2xl"
                    >
                        {t('common.close')}
                    </Button>
                </div>
            </Dialog>
        </div>
    )
}
