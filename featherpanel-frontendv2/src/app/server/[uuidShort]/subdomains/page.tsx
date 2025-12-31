"use client"

import * as React from "react"
import { useParams, useRouter, usePathname } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    Globe,
    Plus,
    Trash2,
    RefreshCw,
    AlertTriangle,
    Lock,
    Loader2
} from "lucide-react"

import { PageHeader } from "@/components/featherui/PageHeader"
import { EmptyState } from "@/components/featherui/EmptyState"
import { Button } from "@/components/featherui/Button"
import { HeadlessModal } from "@/components/ui/headless-modal"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import { cn } from "@/lib/utils"
import type { SubdomainOverview, SubdomainEntry } from "@/types/server"

export default function ServerSubdomainsPage() {
    const { uuidShort } = useParams() as { uuidShort: string }
    const router = useRouter()
    const pathname = usePathname()
    const { t } = useTranslation()
    const { loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    
    // Using generic manage permission or control.start as fallback
    const canManage = hasPermission("subdomains.manage") || hasPermission("control.start")
    const canDelete = hasPermission("subdomains.delete") || canManage

    // State
    const [overview, setOverview] = React.useState<SubdomainOverview | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [subdomains, setSubdomains] = React.useState<SubdomainEntry[]>([])
    
    // Delete Modal State
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [selectedSubdomain, setSelectedSubdomain] = React.useState<SubdomainEntry | null>(null)
    const [deleting, setDeleting] = React.useState(false)

    // Fetch Data
    const fetchData = React.useCallback(async () => {
        if (!uuidShort) return
        setLoading(true)
        try {
            const { data } = await axios.get<{data: { overview: SubdomainOverview, subdomains: SubdomainEntry[] }}>(`/api/user/servers/${uuidShort}/subdomains`)
            if (data?.data?.overview) {
                setOverview(data.data.overview)
                if (data.data.overview.subdomains) {
                     setSubdomains(data.data.overview.subdomains)
                }
            }
        } catch (error) {
            console.error("Failed to fetch subdomains:", error)
            toast.error(t("serverSubdomains.loadFailed"))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, t])

    React.useEffect(() => {
        if (canManage) {
            fetchData()
        } else {
            setLoading(false)
        }
    }, [fetchData, canManage])

    const handleDelete = async () => {
        if (!selectedSubdomain) return
        setDeleting(true)
        try {
            await axios.delete(`/api/user/servers/${uuidShort}/subdomains/${selectedSubdomain.uuid}`)
            toast.success(t("serverSubdomains.deleted"))
            setIsDeleteOpen(false)
            fetchData()
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t("serverSubdomains.deleteFailed")
            toast.error(msg)
        } finally {
            setDeleting(false)
        }
    }

    if (permissionsLoading || settingsLoading) return null

    if (loading && subdomains.length === 0) {
        return (
            <div key={pathname} className="flex flex-col items-center justify-center py-24 ">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-muted-foreground font-medium animate-pulse">{t("common.loading")}</p>
            </div>
        )
    }

    if (!canManage) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                    <Lock className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{t("common.accessDenied")}</h1>
                <p className="text-muted-foreground mt-2">{t("common.noPermission")}</p>
                <Button variant="outline" className="mt-8" onClick={() => router.back()}>
                    {t("common.goBack")}
                </Button>
            </div>
        )
    }

    const limitReached = (overview?.current_total ?? 0) >= (overview?.max_allowed ?? 0)

    return (
        <div key={pathname} className="space-y-8 pb-12 ">
            {/* Header Section */}
            <PageHeader
                title={t("serverSubdomains.title")}
                description={t("serverSubdomains.description")}
                actions={
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="glass" 
                            size="default" 
                            onClick={fetchData} 
                            disabled={loading} 
                        >
                            <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                            {t("common.refresh")}
                        </Button>
                        
                        <Button 
                            size="default" 
                            variant="default"
                            onClick={() => router.push(`/server/${uuidShort}/subdomains/new`)}
                            disabled={limitReached || loading}
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            {t("serverSubdomains.createButton")}
                        </Button>
                    </div>
                }
            />


            {/* Limit Warning */}
            {limitReached && (
                <div className="relative overflow-hidden p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl animate-in slide-in-from-top duration-500 shadow-sm">
                    <div className="relative z-10 flex items-start gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shrink-0">
                            <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-yellow-500 leading-none uppercase tracking-tight">{t("serverSubdomains.limitReached")}</h3>
                            <p className="text-sm text-yellow-500/80 leading-relaxed font-medium">
                                {t("serverSubdomains.limitReachedDescription", { limit: String(overview?.max_allowed) })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {subdomains.length === 0 ? (
                 <EmptyState
                    title={t("serverSubdomains.noSubdomains")}
                    description={t("serverSubdomains.noSubdomainsDescription")}
                    icon={Globe}
                    action={
                        <Button 
                            size="default" 
                            variant="default"
                            onClick={() => router.push(`/server/${uuidShort}/subdomains/new`)}
                            disabled={limitReached}
                        >
                            <Plus className="h-6 w-6 mr-2" />
                            {t("serverSubdomains.createButton")}
                        </Button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {subdomains.map((sub) => (
                        <div 
                            key={sub.uuid}
                            className={cn(
                                "group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-md border border-border/40 transition-all duration-300 shadow-sm",
                                "hover:border-primary/40 hover:bg-card/50 hover:shadow-lg hover:shadow-primary/5"
                            )}
                        >
                            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 shadow-inner">
                                    <Globe className="h-8 w-8 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-xl font-black tracking-tight select-all group-hover:text-primary transition-colors duration-300">
                                            {sub.subdomain}.{sub.domain}
                                        </h3>
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40 shadow-sm opacity-80">
                                            {sub.record_type}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        {sub.port && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60 bg-black/10 px-2 py-0.5 rounded-md border border-white/5">Port {sub.port}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-muted-foreground ml-auto sm:ml-0 opacity-60">
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">{new Date(sub.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {canDelete && (
                                    <div className="flex items-center gap-3 sm:self-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedSubdomain(sub)
                                                setIsDeleteOpen(true)
                                            }}
                                            className="group/btn relative px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-red-500 hover:text-white hover:border-red-500 hover:shadow-xl hover:shadow-red-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="h-4 w-4 inline-block mr-1.5" />
                                            {t("common.delete")}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Modal */}
            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t("serverSubdomains.deleteTitle")}
                description={t("serverSubdomains.deleteDescription", { subdomain: selectedSubdomain ? `${selectedSubdomain.subdomain}.${selectedSubdomain.domain}` : "" })}
            >
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleting}>
                        {t("common.cancel")}
                    </Button>
                    <Button 
                        variant="destructive" 
                        onClick={handleDelete} 
                        disabled={deleting}
                    >
                        {deleting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {t("common.delete")}
                    </Button>
                </div>
            </HeadlessModal>
        </div>
    )
}
