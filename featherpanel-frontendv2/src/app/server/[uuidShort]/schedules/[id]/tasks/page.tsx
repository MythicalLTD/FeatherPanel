"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    ListCheck,
    Plus,
    Pencil,
    Trash2,
    ChevronUp,
    ChevronDown,
    ChevronLeft as ArrowLeft,
    Loader2,
    Lock
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HeadlessSelect } from "@/components/ui/headless-select"
import { HeadlessModal } from "@/components/ui/headless-modal"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import { cn } from "@/lib/utils"
import type { Task, TaskCreateRequest, TaskUpdateRequest, Schedule, SchedulePagination } from "@/types/server"

export default function ServerTasksPage() {
    const { uuidShort, id: scheduleId } = useParams() as { uuidShort: string, id: string }
    const router = useRouter()
    const { t } = useTranslation()
    const { loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    
    // Permission checks (tasks use schedule permissions)
    const canRead = hasPermission("schedule.read")
    const canUpdate = hasPermission("schedule.update")
    const canDelete = hasPermission("schedule.delete")

    // State
    const [tasks, setTasks] = React.useState<Task[]>([])
    const [schedule, setSchedule] = React.useState<Schedule | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [pagination, setPagination] = React.useState<SchedulePagination>({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0
    })
    
    // Modal States
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
    const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)
    const [saving, setSaving] = React.useState(false)
    const [deleting, setDeleting] = React.useState(false)

    // Form States
    const [createForm, setCreateForm] = React.useState<TaskCreateRequest>({
        action: "",
        payload: "",
        time_offset: 0,
        continue_on_failure: 0
    })

    const [editForm, setEditForm] = React.useState<TaskUpdateRequest & {sequence_id: number}>({
        action: "",
        payload: "",
        time_offset: 0,
        continue_on_failure: 0,
        sequence_id: 1
    })

    // Sorted tasks
    const sortedTasks = React.useMemo(() => {
        return [...tasks].sort((a, b) => a.sequence_id - b.sequence_id)
    }, [tasks])

    // Fetch schedule
    const fetchSchedule = React.useCallback(async () => {
        try {
            const { data } = await axios.get<{success: boolean, data: Schedule}>(`/api/user/servers/${uuidShort}/schedules/${scheduleId}`)
            if (data?.success && data?.data) {
                setSchedule(data.data)
            }
        } catch (error) {
            console.error("Failed to fetch schedule:", error)
        }
    }, [uuidShort, scheduleId])

    // Fetch tasks
    const fetchTasks = React.useCallback(async (page = 1) => {
        if (!uuidShort || !scheduleId) return
        setLoading(true)
        try {
            const { data } = await axios.get<{success: boolean, data: {data: Task[], pagination: SchedulePagination}}>(`/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks`, {
                params: { page, per_page: 20 }
            })
            if (data?.success && data?.data) {
                setTasks(data.data.data || [])
                setPagination(data.data.pagination)
            }
        } catch (error) {
            console.error("Failed to fetch tasks:", error)
            toast.error(t("serverTasks.failedToFetch"))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, scheduleId, t])

    React.useEffect(() => {
        fetchSchedule()
        if (canRead) {
            fetchTasks()
        } else if (!permissionsLoading && !canRead) {
            toast.error(t("serverTasks.noSchedulePermission"))
            router.push(`/server/${uuidShort}/schedules`)
        } else {
            setLoading(false)
        }
    }, [canRead, permissionsLoading, fetchTasks, fetchSchedule, router, uuidShort, t])

    // Create task
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks`, createForm)
            if (data?.success) {
                toast.success(t("serverTasks.createSuccess"))
                setIsCreateOpen(false)
                fetchTasks(pagination.current_page)
            } else {
                toast.error(data?.message || t("serverTasks.createFailed"))
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t("serverTasks.createFailed"))
        } finally {
            setSaving(false)
        }
    }

    // Update task
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedTask) return
        setSaving(true)
        try {
            const { data } = await axios.put(`/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${selectedTask.id}`, editForm)
            if (data?.success) {
                toast.success(t("serverTasks.updateSuccess"))
                setIsEditOpen(false)
                fetchTasks(pagination.current_page)
            } else {
                toast.error(data?.message || t("serverTasks.updateFailed"))
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t("serverTasks.updateFailed"))
        } finally {
            setSaving(false)
        }
    }

    // Delete task
    const handleDelete = async () => {
        if (!selectedTask) return
        setDeleting(true)
        try {
            const { data } = await axios.delete(`/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${selectedTask.id}`)
            if (data?.success) {
                toast.success(t("serverTasks.deleteSuccess"))
                setIsDeleteOpen(false)
                fetchTasks(pagination.current_page)
            } else {
                toast.error(data?.message || t("serverTasks.deleteFailed"))
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t("serverTasks.deleteFailed"))
        } finally {
            setDeleting(false)
        }
    }

    // Move task up
    const handleMoveUp = async (task: Task) => {
        if (task.sequence_id <= 1) return
        try {
            const { data } = await axios.put(`/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${task.id}/sequence`, {
                sequence_id: task.sequence_id - 1
            })
            if (data?.success) {
                toast.success(t("serverTasks.moveUpSuccess"))
                fetchTasks(pagination.current_page)
            } else {
                toast.error(data?.message || t("serverTasks.moveUpFailed"))
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t("serverTasks.moveUpFailed"))
        }
    }

    // Move task down
    const handleMoveDown = async (task: Task) => {
        if (task.sequence_id >= sortedTasks.length) return
        try {
            const { data } = await axios.put(`/api/user/servers/${uuidShort}/schedules/${scheduleId}/tasks/${task.id}/sequence`, {
                sequence_id: task.sequence_id + 1
            })
            if (data?.success) {
                toast.success(t("serverTasks.moveDownSuccess"))
                fetchTasks(pagination.current_page)
            } else {
                toast.error(data?.message || t("serverTasks.moveDownFailed"))
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || t("serverTasks.moveDownFailed"))
        }
    }

    const getActionVariant = (action: string): "default" | "outline" | "secondary" => {
        switch (action) {
            case "power": return "default"
            case "backup": return "secondary"
            case "command": return "outline"
            default: return "outline"
        }
    }

    const getPayloadPlaceholder = (action: string): string => {
        switch (action) {
            case "power": return t("serverTasks.selectPowerActionFromDropdown")
            case "backup": return t("serverTasks.backupIgnoredFilesPlaceholder")
            case "command": return t("serverTasks.enterCommand")
            default: return t("serverTasks.payloadValue")
        }
    }

    const getPayloadHelp = (action: string): string => {
        switch (action) {
            case "power": return t("serverTasks.selectPowerActionHelp")
            case "backup": return t("serverTasks.backupIgnoredFilesHelp")
            case "command": return t("serverTasks.commandHelp")
            default: return t("serverTasks.additionalDataHelp")
        }
    }

    if (permissionsLoading || settingsLoading || loading) return null

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
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("common.back")}
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-black uppercase tracking-tight">{t("serverTasks.title")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("serverTasks.description", { scheduleName: schedule?.name || "" })}
                    </p>
                </div>
                {canUpdate && (
                    <Button onClick={() => {
                        setCreateForm({ action: "", payload: "", time_offset: 0, continue_on_failure: 0 })
                        setIsCreateOpen(true)
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("serverTasks.createTask")}
                    </Button>
                )}
            </div>

            {/* Task List */}
            {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
                        <div className="relative h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 -rotate-3">
                            <ListCheck className="h-12 w-12 text-primary" />
                        </div>
                    </div>
                    <div className="max-w-md space-y-2">
                        <h2 className="text-2xl font-black uppercase tracking-tight">{t("serverTasks.noTasks")}</h2>
                        <p className="text-muted-foreground font-medium leading-relaxed">
                            {t("serverTasks.noTasksDescription")}
                        </p>
                    </div>
                    {canUpdate && (
                        <Button 
                            size="lg" 
                            onClick={() => {
                                setCreateForm({ action: "", payload: "", time_offset: 0, continue_on_failure: 0 })
                                setIsCreateOpen(true)
                            }}
                            className="rounded-2xl h-12 px-8 font-bold"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            {t("serverTasks.createTask")}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedTasks.map((task) => (
                        <div 
                            key={task.id}
                            className="border border-white/5 rounded-2xl p-4 bg-[#0A0A0A]/40 backdrop-blur-xl hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <Badge variant="outline" className="text-xs">
                                        {task.sequence_id}
                                    </Badge>
                                    <Badge variant={getActionVariant(task.action)} className="capitalize">
                                        {task.action}
                                    </Badge>
                                    {task.is_queued === 1 && (
                                        <Badge variant="secondary">
                                            {t("serverTasks.queued")}
                                        </Badge>
                                    )}
                                    <div className="text-sm text-muted-foreground">
                                        {task.payload || t("serverTasks.noPayload")}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {canUpdate && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={task.sequence_id <= 1}
                                                onClick={() => handleMoveUp(task)}
                                            >
                                                <ChevronUp className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={task.sequence_id >= sortedTasks.length}
                                                onClick={() => handleMoveDown(task)}
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedTask(task)
                                                    setEditForm({
                                                        action: task.action,
                                                        payload: task.payload,
                                                        time_offset: task.time_offset,
                                                        continue_on_failure: task.continue_on_failure,
                                                        sequence_id: task.sequence_id
                                                    })
                                                    setIsEditOpen(true)
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                    {canDelete && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => {
                                                setSelectedTask(task)
                                                setIsDeleteOpen(true)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {(task.time_offset > 0 || task.continue_on_failure === 1) && (
                                <div className="mt-3 text-xs text-muted-foreground flex items-center gap-4">
                                    {task.time_offset > 0 && (
                                        <span>{t("serverTasks.timeOffset")}: {task.time_offset}s</span>
                                    )}
                                    {task.continue_on_failure === 1 && (
                                        <span>{t("serverTasks.continueOnFailure")}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <HeadlessModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title={t("serverTasks.createTask")}
                description={t("serverTasks.createTaskDescription")}
            >
                <form onSubmit={handleCreate} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>{t("serverTasks.action")}</Label>
                        <HeadlessSelect
                            value={createForm.action}
                            onChange={(val) => setCreateForm({...createForm, action: String(val), payload: ""})} 
                            options={[
                                { id: "power", name: t("serverTasks.actionPower") },
                                { id: "backup", name: t("serverTasks.actionBackup") },
                                { id: "command", name: t("serverTasks.actionCommand") }
                            ]}
                            placeholder={t("serverTasks.selectActionType")}
                        />
                        <p className="text-xs text-muted-foreground">{t("serverTasks.actionHelp")}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t("serverTasks.payload")}</Label>
                        {createForm.action === "power" ? (
                            <HeadlessSelect
                                value={createForm.payload}
                                onChange={(val) => setCreateForm({...createForm, payload: String(val)})}
                                options={[
                                    { id: "start", name: t("serverTasks.startServer") },
                                    { id: "stop", name: t("serverTasks.stopServer") },
                                    { id: "restart", name: t("serverTasks.restartServer") },
                                    { id: "kill", name: t("serverTasks.killServer") }
                                ]}
                                placeholder={t("serverTasks.selectPowerAction")}
                            />
                        ) : (
                            <Input
                                value={createForm.payload}
                                onChange={(e) => setCreateForm({...createForm, payload: e.target.value})}
                                placeholder={getPayloadPlaceholder(createForm.action)}
                                required={createForm.action === "command"}
                            />
                        )}
                        <p className="text-xs text-muted-foreground">{getPayloadHelp(createForm.action)}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t("serverTasks.timeOffset")}</Label>
                        <Input
                            type="number"
                            min="0"
                            value={createForm.time_offset}
                            onChange={(e) => setCreateForm({...createForm, time_offset: Number(e.target.value)})}
                        />
                        <p className="text-xs text-muted-foreground">{t("serverTasks.timeOffsetHelp")}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t("serverTasks.continueOnFailure")}</Label>
                        <HeadlessSelect
                            value={String(createForm.continue_on_failure)}
                            onChange={(val) => setCreateForm({...createForm, continue_on_failure: Number(val)})}
                            options={[
                                { id: "0", name: t("serverTasks.stopOnFailure") },
                                { id: "1", name: t("serverTasks.continueOnFailure") }
                            ]}
                        />
                        <p className="text-xs text-muted-foreground">{t("serverTasks.continueOnFailureHelp")}</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={saving}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {t("serverTasks.create")}
                        </Button>
                    </div>
                </form>
            </HeadlessModal>

            {/* Edit Modal */}
            <HeadlessModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                title={t("serverTasks.editTask")}
                description={t("serverTasks.editTaskDescription")}
            >
                <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>{t("serverTasks.action")}</Label>
                        <HeadlessSelect
                            value={editForm.action}
                            onChange={(val) => setEditForm({...editForm, action: String(val), payload: ""})}
                            options={[
                                { id: "power", name: t("serverTasks.actionPower") },
                                { id: "backup", name: t("serverTasks.actionBackup") },
                                { id: "command", name: t("serverTasks.actionCommand") }
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t("serverTasks.sequenceId")}</Label>
                        <Input
                            type="number"
                            min="1"
                            max={Math.max(sortedTasks.length, editForm.sequence_id)}
                            value={editForm.sequence_id}
                            onChange={(e) => setEditForm({...editForm, sequence_id: Number(e.target.value)})}
                        />
                        <p className="text-xs text-muted-foreground">{t("serverTasks.sequenceIdHelp")}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t("serverTasks.payload")}</Label>
                        {editForm.action === "power" ? (
                            <HeadlessSelect
                                value={editForm.payload}
                                onChange={(val) => setEditForm({...editForm, payload: String(val)})}
                                options={[
                                    { id: "start", name: t("serverTasks.startServer") },
                                    { id: "stop", name: t("serverTasks.stopServer") },
                                    { id: "restart", name: t("serverTasks.restartServer") },
                                    { id: "kill", name: t("serverTasks.killServer") }
                                ]}
                            />
                        ) : (
                            <Input
                                value={editForm.payload}
                                onChange={(e) => setEditForm({...editForm, payload: e.target.value})}
                                placeholder={getPayloadPlaceholder(editForm.action)}
                                required={editForm.action === "command"}
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t("serverTasks.timeOffset")}</Label>
                        <Input
                            type="number"
                            min="0"
                            value={editForm.time_offset}
                            onChange={(e) => setEditForm({...editForm, time_offset: Number(e.target.value)})}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t("serverTasks.continueOnFailure")}</Label>
                        <HeadlessSelect
                            value={String(editForm.continue_on_failure)}
                            onChange={(val) => setEditForm({...editForm, continue_on_failure: Number(val)})}
                            options={[
                                { id: "0", name: t("serverTasks.stopOnFailure") },
                                { id: "1", name: t("serverTasks.continueOnFailure") }
                            ]}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={saving}>
                            {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("serverTasks.update")}
                        </Button>
                    </div>
                </form>
            </HeadlessModal>

            {/* Delete Modal */}
            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t("serverTasks.confirmDeleteTitle")}
                description={t("serverTasks.confirmDeleteDescription", { 
                    action: selectedTask?.action || "", 
                    payload: selectedTask?.payload || t("serverTasks.noPayload")
                })}
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
                        {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {t("serverTasks.confirmDelete")}
                    </Button>
                </div>
            </HeadlessModal>
        </div>
    )
}
