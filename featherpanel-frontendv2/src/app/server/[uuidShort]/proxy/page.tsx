"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    ArrowRightLeft,
    CheckCircle,
    Plus,
    Trash2,
    RefreshCw,
    Network,
    Shield,
    Globe,
    Info,
    Loader2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { HeadlessModal } from "@/components/ui/headless-modal"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import { cn, isEnabled } from "@/lib/utils"
import type { Proxy, ProxiesResponse } from "@/types/server"

export default function ServerProxyPage() {
    const { uuidShort } = useParams()
    const { t } = useTranslation()
    const { settings } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort as string)
    const router = useRouter()

    // State
    const [proxies, setProxies] = React.useState<Proxy[]>([])
    const [loading, setLoading] = React.useState(true)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [selectedProxy, setSelectedProxy] = React.useState<Proxy | null>(null)
    const [saving, setSaving] = React.useState(false)

    // Permissions & Feature Flag
    const canManage = hasPermission("proxy.manage")
    const canRead = hasPermission("proxy.read")
    const proxyEnabled = isEnabled(settings?.server_allow_user_made_proxy)
    const maxProxies = parseInt(settings?.server_proxy_max_per_server || "0", 10)
    const isMaxReached = proxies.length >= maxProxies && maxProxies > 0

    // Fetch Data
    const fetchData = React.useCallback(async () => {
        if (!uuidShort || !proxyEnabled) return
        setLoading(true)
        try {
            const { data } = await axios.get<ProxiesResponse>(`/api/user/servers/${uuidShort}/proxy`)

            if (data.success) {
                setProxies(data.data.proxies)
            }
        } catch (error) {
            console.error("Failed to fetch proxy data:", error)
            toast.error(t("common.error"))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, proxyEnabled, t])

    React.useEffect(() => {
        if (proxyEnabled && canRead) {
            fetchData()
        } else {
            setLoading(false)
        }
    }, [fetchData, proxyEnabled, canRead])



    const handleDelete = async () => {
        if (!selectedProxy) return
        setSaving(true)
        try {
            await axios.post(`/api/user/servers/${uuidShort}/proxy/delete`, { id: selectedProxy.id })
            toast.success(t("serverProxy.deleted"))
            setIsDeleteOpen(false)
            fetchData()
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || "Failed to delete proxy")
        } finally {
            setSaving(false)
            setSelectedProxy(null)
        }
    }

    const promptDelete = (proxy: Proxy) => {
        setSelectedProxy(proxy)
        setIsDeleteOpen(true)
    }

    if (permissionsLoading) return null

    // Access Control Views
    if (!canRead) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                    <Shield className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{t("common.accessDenied")}</h1>
                <p className="text-muted-foreground mt-2">{t("common.noPermission")}</p>
                <Button variant="outline" className="mt-8" onClick={() => window.history.back()}>
                    {t("common.goBack")}
                </Button>
            </div>
        )
    }

    if (!proxyEnabled) {
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                        <ArrowRightLeft className="h-16 w-16 text-primary" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t("serverProxy.featureDisabled")}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {t("serverProxy.featureDisabledDescription")}
                    </p>
                </div>
                <Button variant="outline" size="lg" className="mt-8 rounded-2xl h-14 px-10" onClick={() => window.history.back()}>
                    {t("common.goBack")}
                </Button>
            </div>
    }

    if (loading && proxies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="relative">
                    <div className="absolute inset-0 animate-ping opacity-20">
                        <div className="w-16 h-16 rounded-full bg-primary/20" />
                    </div>
                    <div className="relative p-4 rounded-full bg-primary/10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </div>
                <span className="mt-4 text-muted-foreground animate-pulse">{t("common.loading")}...</span>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight uppercase">{t("serverProxy.title")}</h1>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <p className="text-lg opacity-80">
                            {t("serverProxy.description")}
                            <span className="ml-2 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-sm font-bold">
                                {proxies.length} / {maxProxies > 0 ? maxProxies : '∞'}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="lg"
                        onClick={fetchData} 
                        disabled={loading}
                        className="bg-background/50 backdrop-blur-md border-border/40 hover:bg-background/80"
                    >
                        <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                        {t("serverProxy.refresh")}
                    </Button>
                    {canManage && (
                        <Button 
                            size="lg" 
                            onClick={() => router.push(`/server/${uuidShort}/proxy/new`)}
                            disabled={isMaxReached || loading}
                            className="shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all h-14"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            {t("serverProxy.createProxy")}
                        </Button>
                    )}
                </div>
            </div>

            {/* Info Banner */}
            <div className="relative overflow-hidden p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl animate-in slide-in-from-top duration-500 shadow-sm">
                <div className="relative z-10 flex items-start gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                        <Info className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-blue-500 leading-none uppercase tracking-tight">{t("serverProxy.infoTitle")}</h3>
                        <p className="text-sm text-blue-500/80 leading-relaxed font-medium">
                            {t("serverProxy.infoDescription")}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            {proxies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/10 rounded-[3rem] border border-dashed border-border/60 backdrop-blur-sm">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                            <ArrowRightLeft className="h-16 w-16 text-primary" />
                        </div>
                    </div>
                    <div className="max-w-md space-y-3 px-4">
                        <h2 className="text-3xl font-black uppercase tracking-tight">{t("serverProxy.noProxiesTitle")}</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                            {t("serverProxy.noProxiesDescription")}
                        </p>
                    </div>
                    {canManage && (
                        <Button 
                            size="lg" 
                            onClick={() => router.push(`/server/${uuidShort}/proxy/new`)}
                            disabled={isMaxReached}
                            className="h-14 px-10 text-lg shadow-2xl shadow-primary/20"
                        >
                            <Plus className="h-6 w-6 mr-2" />
                            {t("serverProxy.createProxy")}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {proxies.map(proxy => (
                        <div 
                            key={proxy.id}
                            className={cn(
                                "group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-md border border-border/40 transition-all duration-300 shadow-sm",
                                "hover:border-primary/40 hover:bg-card/50 hover:shadow-lg hover:shadow-primary/5"
                            )}
                        >
                            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                                {/* Icon Status */}
                                <div className={cn(
                                    "h-16 w-16 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 shadow-inner",
                                    proxy.ssl ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-zinc-500/10 border-zinc-500/20 text-muted-foreground"
                                )}>
                                    {proxy.ssl ? (
                                        <CheckCircle className="h-8 w-8" />
                                    ) : (
                                        <ArrowRightLeft className="h-8 w-8" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors duration-300">
                                            {proxy.domain}
                                        </h3>
                                        {proxy.ssl && (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none shadow-sm bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/5">
                                                {t("serverProxy.sslEnabled")}
                                            </span>
                                        )}
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40 shadow-sm flex items-center gap-1.5 opacity-80">
                                            :{proxy.port}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Network className="h-4 w-4 opacity-50" />
                                            <span className="text-sm font-bold text-foreground/70">{proxy.ip}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Globe className="h-4 w-4 opacity-50" />
                                            <span className="text-sm font-medium">{proxy.use_lets_encrypt ? t("serverProxy.letsEncrypt") : t("serverProxy.customCert")}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {canManage && (
                                    <div className="flex items-center gap-3 sm:self-center">
                                        <button
                                            type="button"
                                            onClick={() => promptDelete(proxy)}
                                            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                        >
                                            <Trash2 className="h-5 w-5 stroke-2" />
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
                title={t("serverProxy.deleteModalTitle")}
                description={t("serverProxy.deleteModalDescription", { domain: selectedProxy?.domain || "" })}
            >
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={saving}>
                        {t("common.cancel")}
                    </Button>
                    <Button 
                        onClick={handleDelete} 
                        variant="destructive"
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {saving ? t("serverProxy.deleting") : t("serverProxy.deleteProxy")}
                    </Button>
                </div>
            </HeadlessModal>
        </div>
    )
}
