"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
    DownloadCloud,
    Loader2,
    AlertTriangle,
    Clock,
    CheckCircle,
    XCircle,
    Plus,
    RefreshCw
} from "lucide-react"
import { Button } from "@/components/featherui/Button"
import { PageHeader } from "@/components/featherui/PageHeader"
import { EmptyState } from "@/components/featherui/EmptyState"
import { useTranslation } from "@/contexts/TranslationContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { formatDate } from "@/lib/utils"
import axios from "axios"
import { toast } from "sonner"
import { cn, isEnabled } from "@/lib/utils"
import type { ImportItem, ImportsResponse } from "@/types/server"

export default function ServerImportPage() {
    const { uuidShort } = useParams()
    const router = useRouter()
    const { t } = useTranslation()
    const { settings, loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort as string)
    const canManage = hasPermission("settings.import") || hasPermission("file.create")

    const [imports, setImports] = React.useState<ImportItem[]>([])
    const [loading, setLoading] = React.useState(true)

    const fetchImports = React.useCallback(async () => {
        try {
            setLoading(true)
            const { data } = await axios.get<ImportsResponse>(`/api/user/servers/${uuidShort}/imports`)
            if (data.success) {
                setImports(data.data.imports)
            }
        } catch (error) {
            console.error("Failed to fetch imports:", error)
            toast.error(t("serverImport.fetchFailed"))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, t])

    React.useEffect(() => {
        fetchImports()
    }, [fetchImports])

    const getStatusConfig = (status: ImportItem["status"]) => {
        switch (status) {
            case "completed":
                return {
                    icon: CheckCircle,
                    color: "text-emerald-500",
                    bg: "bg-emerald-500/10",
                    border: "border-emerald-500/20",
                    label: t("common.completed")
                }
            case "failed":
                return {
                    icon: XCircle,
                    color: "text-red-500",
                    bg: "bg-red-500/10",
                    border: "border-red-500/20",
                    label: t("common.failed")
                }
            case "importing":
                return {
                    icon: Loader2,
                    color: "text-blue-500",
                    bg: "bg-blue-500/10",
                    border: "border-blue-500/20",
                    label: t("common.importing"),
                    spin: true
                }
            default:
                return {
                    icon: Clock,
                    color: "text-yellow-500",
                    bg: "bg-yellow-500/10",
                    border: "border-yellow-500/20",
                    label: t("common.pending")
                }
        }
    }

    const isImportEnabled = isEnabled(settings?.server_allow_user_made_import)

    if (permissionsLoading || settingsLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <PageHeader
                title={t("serverImport.title")}
                description={t("serverImport.description")}
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="glass"
                            size="default"
                            onClick={fetchImports}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                            {t("common.refresh")}
                        </Button>
                        {isImportEnabled && canManage && (
                            <Button
                                size="default"
                                variant="default"
                                onClick={() => router.push(`/server/${uuidShort}/import/new`)}
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                {t("serverImport.createImport")}
                            </Button>
                        )}
                    </div>
                }
            />

            {!isImportEnabled && (
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                    <p className="text-sm font-medium text-yellow-500/90">
                        {t("serverImport.featureDisabledDescription")}
                    </p>
                </div>
            )}

            {imports.length === 0 ? (
                <EmptyState
                    title={t("serverImport.noImports")}
                    description={t("serverImport.noImportsDescription")}
                    icon={DownloadCloud}
                    action={
                        isImportEnabled && canManage && (
                            <Button
                                size="default"
                                variant="default"
                                onClick={() => router.push(`/server/${uuidShort}/import/new`)}
                            >
                                <Plus className="h-6 w-6 mr-2" />
                                {t("serverImport.createImport")}
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {imports.map((item) => {
                        const statusConfig = getStatusConfig(item.status)
                        const StatusIcon = statusConfig.icon

                        return (
                            <div
                                key={item.id}
                                className="group relative bg-[#0A0A0A]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 transition-all hover:bg-white/5 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                <div className="flex items-start justify-between mb-6 relative z-10">
                                    <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border transition-colors shrink-0", statusConfig.bg, statusConfig.border)}>
                                        <StatusIcon className={cn("h-7 w-7", statusConfig.color, statusConfig.spin && "animate-spin")} />
                                    </div>
                                    <div className={cn("px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest", statusConfig.bg, statusConfig.border, statusConfig.color)}>
                                        {statusConfig.label}
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                            {item.host}
                                        </h3>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider opacity-60">
                                            {item.user} @ {item.type.toUpperCase()} ({item.port})
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t border-border/50">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">{t("serverImport.source")}</span>
                                            <span className="font-mono text-foreground/80 truncate max-w-[120px]" title={item.source_location}>
                                                {item.source_location}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">{t("serverImport.destination")}</span>
                                            <span className="font-mono text-foreground/80 truncate max-w-[120px]" title={item.destination_location}>
                                                {item.destination_location}
                                            </span>
                                        </div>
                                         <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground font-medium">{t("common.date")}</span>
                                            <span className="font-mono text-foreground/80">
                                                {formatDate(item.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    {item.error && (
                                         <div className="mt-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs text-red-500/80 font-medium">
                                            {item.error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
