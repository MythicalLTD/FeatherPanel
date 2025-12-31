"use client"

import * as React from "react"
import { useParams, useRouter, usePathname } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    ArrowRightLeft,
    CheckCircle,
    Plus,
    Trash2,
    RefreshCw,
    Network,
    Globe,
    Info,
    Loader2
} from "lucide-react"

import { Button } from "@/components/featherui/Button"
import { HeadlessModal } from "@/components/ui/headless-modal"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import { cn, isEnabled } from "@/lib/utils"
import type { Proxy, ProxiesResponse } from "@/types/server"
import { PageHeader } from "@/components/featherui/PageHeader"
import { EmptyState } from "@/components/featherui/EmptyState"

export default function ServerProxyPage() {
    const { uuidShort } = useParams()
    const { t } = useTranslation()
    const { settings } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort as string)
    const router = useRouter()
    const pathname = usePathname()

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
                 <EmptyState
                    title={t("common.accessDenied")}
                    description={t("common.noPermission")}
                    icon={Globe}
                    action={
                         <Button variant="secondary" onClick={() => window.history.back()}>
                            {t("common.goBack")}
                        </Button>
                    }
                />
            </div>
        )
    }

    if (!proxyEnabled) {
        return (
             <EmptyState
                title={t("serverProxy.featureDisabled")}
                description={t("serverProxy.featureDisabledDescription")}
                icon={ArrowRightLeft}
                action={
                    <Button variant="secondary" onClick={() => window.history.back()}>
                        {t("common.goBack")}
                    </Button>
                }
            />
        )
    }

    if (loading && proxies.length === 0) {
        return (
            <div key={pathname} className="flex flex-col items-center justify-center py-24 ">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-muted-foreground font-medium animate-pulse">{t("common.loading")}</p>
            </div>
        )
    }

    return (
        <div key={pathname} className="space-y-8 pb-12 ">
            {/* Header */}
            <PageHeader
                title={t("serverProxy.title")}
                description={
                    <>
                         {t("serverProxy.description")}
                         <span className="ml-2 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-sm font-bold">
                            {proxies.length} / {maxProxies > 0 ? maxProxies : '∞'}
                        </span>
                    </>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="glass"
                            size="lg"
                            onClick={fetchData}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                            {t("serverProxy.refresh")}
                        </Button>
                        {canManage && (
                            <Button
                                size="lg"
                                onClick={() => router.push(`/server/${uuidShort}/proxy/new`)}
                                disabled={isMaxReached || loading}
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                {t("serverProxy.createProxy")}
                            </Button>
                        )}
                    </div>
                }
            />

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
                 <EmptyState
                    title={t("serverProxy.noProxiesTitle")}
                    description={t("serverProxy.noProxiesDescription")}
                    icon={ArrowRightLeft}
                    action={canManage ? (
                         <Button
                            size="lg"
                            onClick={() => router.push(`/server/${uuidShort}/proxy/new`)}
                            disabled={isMaxReached}
                        >
                            <Plus className="h-6 w-6 mr-2" />
                            {t("serverProxy.createProxy")}
                        </Button>
                    ) : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {proxies.map(proxy => (
                        <div
                            key={proxy.id}
                            className={cn(
                                "group relative overflow-hidden rounded-3xl bg-[#0A0A0A]/40 backdrop-blur-xl border border-white/5 transition-all duration-300 shadow-sm",
                                "hover:border-primary/20 hover:bg-white/5 hover:shadow-2xl hover:shadow-primary/5"
                            )}
                        >
                             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                                {/* Icon Status */}
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex items-center justify-center border shrink-0 transition-colors",
                                    proxy.ssl ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/10"
                                )}>
                                    {proxy.ssl ? (
                                        <CheckCircle className="h-7 w-7 text-emerald-500" />
                                    ) : (
                                        <ArrowRightLeft className="h-7 w-7 text-muted-foreground" />
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
                                        <Button
                                            variant="destructive"
                                            onClick={() => promptDelete(proxy)}
                                            className="h-10 w-10 p-0 rounded-xl"
                                        >
                                            <Trash2 className="h-5 w-5 stroke-2" />
                                        </Button>
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
                    <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} disabled={saving}>
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
