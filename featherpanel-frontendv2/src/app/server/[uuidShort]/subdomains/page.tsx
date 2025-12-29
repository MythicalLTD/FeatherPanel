"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    Network,
    Plus,
    Trash2,
    RefreshCw,
    AlertTriangle,
    Shield,
    Globe,
    Lock
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { HeadlessModal } from "@/components/ui/headless-modal"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import { cn } from "@/lib/utils"
import type { SubdomainOverview, SubdomainEntry } from "@/types/server"

export default function ServerSubdomainsPage() {
    const { uuidShort } = useParams() as { uuidShort: string }
    const router = useRouter()
    const { t } = useTranslation()
    const { loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    
    // Using generic manage permission or control.start as fallback
    const canManage = hasPermission("subdomains.manage") || hasPermission("control.start")

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

    if (permissionsLoading || settingsLoading || loading) return null

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
        <div className="space-y-8 animate-in fade-in duration-500">
             {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                            <Network className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight uppercase italic leading-none">{t("serverSubdomains.title")}</h1>
                            <p className="text-sm text-muted-foreground font-medium opacity-60 mt-1">
                                {t("serverSubdomains.description")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={fetchData} 
                        className="h-12 w-12 rounded-xl bg-white/5 hover:bg-white/10"
                    >
                        <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
                    </Button>
                    <Button 
                        size="lg" 
                        onClick={() => router.push(`/server/${uuidShort}/subdomains/new`)}
                        disabled={limitReached || loading}
                        className="h-12 px-8 font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-xs"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("serverSubdomains.createButton")}
                    </Button>
                </div>
            </div>

            {/* Limit Warning */}
            {limitReached && (
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 flex items-start gap-4 animate-in slide-in-from-top-2">
                    <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0 border border-yellow-500/30">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="space-y-1 py-1">
                        <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wide">{t("serverSubdomains.limitReached")}</h4>
                        <p className="text-xs text-yellow-500/70 leading-relaxed font-medium">
                            {t("serverSubdomains.limitReachedDescription", { limit: String(overview?.max_allowed) })}
                        </p>
                    </div>
                </div>
            )}

            {/* List */}
            {subdomains.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
                        <div className="relative h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 -rotate-3">
                            <Network className="h-12 w-12 text-primary" />
                        </div>
                    </div>
                    <div className="max-w-md space-y-2">
                        <h2 className="text-2xl font-black uppercase tracking-tight">{t("serverSubdomains.noSubdomains")}</h2>
                        <p className="text-muted-foreground font-medium leading-relaxed">
                            {t("serverSubdomains.noSubdomainsDescription")}
                        </p>
                    </div>
                    <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => router.push(`/server/${uuidShort}/subdomains/new`)}
                        disabled={limitReached}
                        className="rounded-2xl h-12 px-8 font-bold"
                    >
                        {t("serverSubdomains.createButton")}
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {subdomains.map((sub) => (
                        <div 
                            key={sub.uuid}
                            className="group relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0A0A0A]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 transition-all hover:bg-white/5 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
                        >
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors shrink-0">
                                    <Globe className="h-7 w-7 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-black text-xl tracking-tight select-all">
                                            {sub.subdomain}.{sub.domain}
                                        </h3>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                            {sub.record_type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                        {sub.port && (
                                            <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg">
                                                <Network className="h-3 w-3" />
                                                Port: <span className="text-white/70">{sub.port}</span>
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5 px-2 py-1">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {t("serverSubdomains.activeSubdomains")}: {new Date(sub.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 pl-4 md:pl-0 border-l md:border-l-0 border-white/5">
                                <Button
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                        setSelectedSubdomain(sub)
                                        setIsDeleteOpen(true)
                                    }}
                                    className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
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
