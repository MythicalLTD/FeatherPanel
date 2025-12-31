"use client"

import * as React from "react"
import { useParams, useRouter, usePathname } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    Calendar,
    Plus,
    RefreshCw,
    Pencil,
    Trash2,
    Power,
    ListTodo,
    Clock,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Lock,
    Loader2
} from "lucide-react"

import { PageHeader } from "@/components/featherui/PageHeader"
import { EmptyState } from "@/components/featherui/EmptyState"
import { Button } from "@/components/featherui/Button"
import { Badge } from "@/components/ui/badge"
import { HeadlessModal } from "@/components/ui/headless-modal"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import { cn, isEnabled } from "@/lib/utils"
import type { Schedule, SchedulePagination } from "@/types/server"

export default function ServerSchedulesPage() {
    const { uuidShort } = useParams() as { uuidShort: string }
    const router = useRouter()
    const pathname = usePathname()
	const { settings } = useSettings() 
    const { t } = useTranslation()
    const { loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    
    // Permission checks
    const canRead = hasPermission("schedule.read")
    const canCreate = hasPermission("schedule.create")
    const canUpdate = hasPermission("schedule.update")
    const canDelete = hasPermission("schedule.delete")

    // State
    const [schedules, setSchedules] = React.useState<Schedule[]>([])
    const [loading, setLoading] = React.useState(true)
    const [pagination, setPagination] = React.useState<SchedulePagination>({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0
    })
    
    // Delete Modal State
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [selectedSchedule, setSelectedSchedule] = React.useState<Schedule | null>(null)
    const [deleting, setDeleting] = React.useState(false)

    // Fetch Data
    const fetchData = React.useCallback(async (page = 1) => {
        if (!uuidShort || !isEnabled(settings?.server_allow_schedules)) return
        setLoading(true)
        try {
            const { data } = await axios.get<{success: boolean, data: {data: Schedule[], pagination: SchedulePagination}}>(`/api/user/servers/${uuidShort}/schedules`, {
                params: { page, per_page: 20 }
            })
            if (data?.success && data?.data) {
                setSchedules(data.data.data || [])
                setPagination(data.data.pagination)
            }
        } catch (error) {
            console.error("Failed to fetch schedules:", error)
            toast.error(t("serverSchedules.failedToFetch"))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, settings?.server_allow_schedules, t])

    React.useEffect(() => {
        if (canRead) {
            fetchData()
        } else if (!permissionsLoading && !canRead) {
            toast.error(t("serverSchedules.noSchedulePermission"))
            router.push(`/server/${uuidShort}`)
        } else {
            setLoading(false)
        }
    }, [canRead, permissionsLoading, fetchData, router, uuidShort, t])

    const handleDelete = async () => {
        if (!selectedSchedule) return
        setDeleting(true)
        try {
            const { data } = await axios.delete(`/api/user/servers/${uuidShort}/schedules/${selectedSchedule.id}`)
            if (data?.success) {
                toast.success(t("serverSchedules.deleteSuccess"))
                setIsDeleteOpen(false)
                fetchData(pagination.current_page)
            } else {
                toast.error(data?.message || t("serverSchedules.deleteFailed"))
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t("serverSchedules.deleteFailed")
            toast.error(msg)
        } finally {
            setDeleting(false)
        }
    }

    const handleToggle = async (schedule: Schedule) => {
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/schedules/${schedule.id}/toggle`)
            if (data?.success) {
                toast.success(t("serverSchedules.toggleSuccess"))
                fetchData(pagination.current_page)
            } else {
                toast.error(data?.message || t("serverSchedules.toggleFailed"))
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t("serverSchedules.toggleFailed")
            toast.error(msg)
        }
    }

    const formatCronExpression = (schedule: Schedule): string => {
        return `${schedule.cron_minute} ${schedule.cron_hour} ${schedule.cron_day_of_month} ${schedule.cron_month} ${schedule.cron_day_of_week}`
    }

    const getStatusVariant = (schedule: Schedule): "default" | "destructive" | "outline" => {
        if (schedule.is_processing) return "outline"
        if (schedule.is_active) return "default"
        return "destructive"
    }

    const getStatusText = (schedule: Schedule): string => {
        if (schedule.is_processing) return t("serverSchedules.statusProcessing")
        if (schedule.is_active) return t("serverSchedules.statusActive")
        return t("serverSchedules.statusInactive")
    }

    if (permissionsLoading || settingsLoading) return null

    if (!isEnabled(settings?.server_allow_schedules)) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 ">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3">
                        <Lock className="h-16 w-16 text-red-500" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t("serverSchedules.featureDisabled")}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {t("serverSchedules.featureDisabledDescription")}
                    </p>
                </div>
                <Button variant="outline" size="default" className="mt-8 rounded-2xl h-14 px-10" onClick={() => router.push(`/server/${uuidShort}`)}>
                    {t("common.goBack")}
                </Button>
            </div>
        )
    }

    if (loading && schedules.length === 0) {
        return (
            <div key={pathname} className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-muted-foreground font-medium animate-pulse">{t("common.loading")}</p>
            </div>
        )
    }

    if (!canRead) {
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

    return (
        <div key={pathname} className="space-y-8 pb-12">
             {/* Header Section */}
            <PageHeader
                title={t("serverSchedules.title")}
                description={t("serverSchedules.description")}
                actions={
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="glass" 
                            size="default" 
                            onClick={() => fetchData(pagination.current_page)} 
                            disabled={loading}
                        >
                            <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                            {t("common.refresh")}
                        </Button>
                        {canCreate && (
                            <Button 
                                size="default" 
                                variant="default"
                                onClick={() => router.push(`/server/${uuidShort}/schedules/new`)}
                                disabled={loading}
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                {t("serverSchedules.createSchedule")}
                            </Button>
                        )}
                    </div>
                }
            />

            {/* List */}
            {schedules.length === 0 ? (
                 <EmptyState
                    title={t("serverSchedules.noSchedules")}
                    description={t("serverSchedules.noSchedulesDescription")}
                    icon={Calendar}
                    action={
                        canCreate ? (
                            <Button 
                                size="default" 
                                variant="default"
                                onClick={() => router.push(`/server/${uuidShort}/schedules/new`)}
                            >
                                <Plus className="h-6 w-6 mr-2" />
                                {t("serverSchedules.createSchedule")}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="flex flex-col gap-4">
                    {schedules.map((schedule) => (
                        <div 
                            key={schedule.id}
                            className="group relative flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0A0A0A]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 transition-all hover:bg-white/5 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
                        >
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex items-center justify-center border transition-colors shrink-0",
                                    schedule.is_processing ? "bg-blue-500/10 border-blue-500/20" :
                                    schedule.is_active ? "bg-emerald-500/10 border-emerald-500/20" :
                                    "bg-gray-500/10 border-gray-500/20"
                                )}>
                                    <Calendar className={cn(
                                        "h-7 w-7",
                                        schedule.is_processing ? "text-blue-500" :
                                        schedule.is_active ? "text-emerald-500" :
                                        "text-gray-500"
                                    )} />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-black text-xl tracking-tight">
                                            {schedule.name}
                                        </h3>
                                        <Badge variant={getStatusVariant(schedule)} className="text-[10px] font-black uppercase tracking-wider">
                                            {getStatusText(schedule)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                        <span className="flex items-center gap-1.5 font-mono bg-white/5 px-2 py-1 rounded-lg">
                                            <Clock className="h-3 w-3" />
                                            {formatCronExpression(schedule)}
                                        </span>
                                        {schedule.next_run_at && (
                                            <span className="flex items-center gap-1.5 px-2 py-1">
                                                <CalendarClock className="h-3 w-3" />
                                                Next: {new Date(schedule.next_run_at).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 pl-4 md:pl-0 border-l md:border-l-0 border-white/5">
                                {canUpdate && (
                                    <Button
                                        variant="glass"
                                        size="sm"
                                        onClick={() => router.push(`/server/${uuidShort}/schedules/${schedule.id}/edit`)}
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                                        <span className="hidden sm:inline">{t("common.edit")}</span>
                                    </Button>
                                )}
                                <Button
                                    variant="glass"
                                    size="sm"
                                    onClick={() => router.push(`/server/${uuidShort}/schedules/${schedule.id}/tasks`)}
                                >
                                    <ListTodo className="h-3.5 w-3.5 mr-1.5" />
                                    <span className="hidden sm:inline">{t("serverSchedules.tasks")}</span>
                                </Button>
                                {canUpdate && (
                                    <Button
                                        variant={schedule.is_active ? "warning" : "default"}
                                        size="sm"
                                        onClick={() => handleToggle(schedule)}
                                    >
                                        <Power className="h-3.5 w-3.5 mr-1.5" />
                                        <span className="hidden sm:inline">
                                            {schedule.is_active ? t("common.disable") : t("common.enable")}
                                        </span>
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedSchedule(schedule)
                                            setIsDeleteOpen(true)
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        <span className="hidden sm:inline">{t("common.delete")}</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {pagination.total > pagination.per_page && (
                        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/5">
                            <div className="text-xs text-muted-foreground">
                                Showing {pagination.from}-{pagination.to} of {pagination.total}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page <= 1 || loading}
                                    onClick={() => fetchData(pagination.current_page - 1)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-sm px-2">{pagination.current_page} / {pagination.last_page}</div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page >= pagination.last_page || loading}
                                    onClick={() => fetchData(pagination.current_page + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Modal */}
            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t("serverSchedules.confirmDeleteTitle")}
                description={t("serverSchedules.confirmDeleteDescription", { scheduleName: selectedSchedule?.name || "" })}
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
