'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { 
    Plus, 
    Trash2, 
    Loader2, 
    Archive, 
    RefreshCw, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    HardDrive, 
    Database, 
    Calendar, 
    Lock, 
    Unlock, 
    RotateCcw, 
    Download, 
    AlertTriangle, 
    Info,
    MoreVertical,
    FileX
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'
import { useServerPermissions } from '@/hooks/useServerPermissions'
import { cn, formatMib } from '@/lib/utils'

// UI Components
import { Button } from '@/components/featherui/Button'
import { Input } from '@/components/featherui/Input'
import { PageHeader } from '@/components/featherui/PageHeader'
import { EmptyState } from '@/components/featherui/EmptyState'
import { Checkbox } from '@/components/ui/checkbox'
import { 
    Dialog, 
    DialogTitle, 
    DialogDescription, 
    DialogHeader, 
    DialogFooter 
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Types
import { BackupItem, BackupsResponse, Server } from '@/types/server'

export default function ServerBackupsPage() {
    const { t } = useTranslation()
    const params = useParams()
    const router = useRouter()
    const uuidShort = params.uuidShort as string

    // Permissions
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    const canRead = hasPermission('backup.read')
    const canCreate = hasPermission('backup.create')
    const canRestore = hasPermission('backup.restore')
    const canDownload = hasPermission('backup.download')
    const canDelete = hasPermission('backup.delete')

    // State
    const [backups, setBackups] = useState<BackupItem[]>([])
    const [loading, setLoading] = useState(true)
    const [server, setServer] = useState<Server | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState({
        current_page: 1,
        total: 0,
        last_page: 1,
        per_page: 20
    })

    // Modal States
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    
    const [creating, setCreating] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)

    // Form States
    const [newBackupName, setNewBackupName] = useState('')
    const [ignoredFiles, setIgnoredFiles] = useState<string[]>([])
    const [newIgnorePattern, setNewIgnorePattern] = useState('')
    
    const [backupToRestore, setBackupToRestore] = useState<BackupItem | null>(null)
    const [truncateDirectory, setTruncateDirectory] = useState(false)
    
    const [confirmAction, setConfirmAction] = useState<{
        title: string
        description: string
        action: () => Promise<void>
        variant?: 'default' | 'destructive'
    } | null>(null)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchBackups = useCallback(async (targetPage = page) => {
        if (!uuidShort) return
        
        try {
            setLoading(true)
            const [backupsRes, serverRes] = await Promise.all([
                axios.get<BackupsResponse>(`/api/user/servers/${uuidShort}/backups`, {
                    params: {
                        page: targetPage,
                        search: debouncedSearch || undefined
                    }
                }),
                axios.get<{ success: boolean, data: Server }>(`/api/user/servers/${uuidShort}`)
            ])

            if (backupsRes.data.success) {
                setBackups(backupsRes.data.data.data)
                const p = backupsRes.data.data.pagination
                setPagination({
                    current_page: p.current_page,
                    total: p.total,
                    last_page: p.last_page,
                    per_page: p.per_page
                })
            }
            
            if (serverRes.data.success) {
                setServer(serverRes.data.data)
            }
        } catch (error) {
            console.error('Error fetching backups:', error)
            toast.error(t('serverBackups.failedToFetch'))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, debouncedSearch, page, t])

    useEffect(() => {
        if (!permissionsLoading && !canRead) {
            toast.error(t('serverBackups.noBackupPermission'))
            router.push(`/server/${uuidShort}`)
            return
        }
        
        if (canRead) {
            fetchBackups()
        }
    }, [canRead, permissionsLoading, fetchBackups, uuidShort, router, t])

    // Auto-refresh when backups are creating
    useEffect(() => {
        const hasCreating = backups.some(b => !b.completed_at && !b.is_successful)
        if (hasCreating) {
            const interval = setInterval(() => {
                fetchBackups()
            }, 3000)
            return () => clearInterval(interval)
        }
    }, [backups, fetchBackups])

    const generateBackupName = () => {
        const now = new Date()
        const formatted = now.toISOString().replace(/T/, '-').replace(/\..+/, '').replace(/:/g, '-')
        return `backup-${formatted}-${Math.random().toString(36).substring(2, 7)}`
    }

    const handleCreateBackup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newBackupName.trim()) return

        try {
            setCreating(true)
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/backups`, {
                name: newBackupName,
                ignore: JSON.stringify(ignoredFiles)
            })

            if (data.success) {
                toast.success(t('serverBackups.createSuccess'))
                setCreateDialogOpen(false)
                fetchBackups(1)
            } else {
                toast.error(data.message || t('serverBackups.createFailed'))
            }
        } catch (error) {
            console.error('Error creating backup:', error)
            toast.error(t('serverBackups.createFailed'))
        } finally {
            setCreating(false)
        }
    }

    const handleRestoreBackup = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!backupToRestore) return

        try {
            setRestoring(true)
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/backups/${backupToRestore.uuid}/restore`, {
                truncate_directory: truncateDirectory
            })

            if (data.success) {
                toast.success(t('serverBackups.restoreSuccess'))
                setRestoreDialogOpen(false)
            } else {
                toast.error(data.message || t('serverBackups.restoreFailed'))
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.data?.error === 'BACKUP_LOCKED') {
                toast.error(t('serverBackups.restoreLockedError'))
            } else {
                toast.error(t('serverBackups.restoreFailed'))
            }
        } finally {
            setRestoring(false)
        }
    }

    const handleDeleteBackup = (backup: BackupItem) => {
        setConfirmAction({
            title: t('serverBackups.confirmDeleteTitle'),
            description: t('serverBackups.deleteConfirm'),
            variant: 'destructive',
            action: async () => {
                const { data } = await axios.delete(`/api/user/servers/${uuidShort}/backups/${backup.uuid}`)
                if (data.success) {
                    toast.success(t('serverBackups.deleteSuccess'))
                    fetchBackups()
                } else {
                    toast.error(data.message || t('serverBackups.deleteFailed'))
                }
            }
        })
        setConfirmDialogOpen(true)
    }

    const handleLockBackup = (backup: BackupItem, lock: boolean) => {
        setConfirmAction({
            title: lock ? t('serverBackups.confirmLockTitle') : t('serverBackups.confirmUnlockTitle'),
            description: lock ? t('serverBackups.lockConfirm') : t('serverBackups.unlockConfirm'),
            action: async () => {
                const endpoint = lock ? 'lock' : 'unlock'
                const { data } = await axios.post(`/api/user/servers/${uuidShort}/backups/${backup.uuid}/${endpoint}`)
                if (data.success) {
                    toast.success(lock ? t('serverBackups.lockSuccess') : t('serverBackups.unlockSuccess'))
                    fetchBackups()
                } else {
                    toast.error(data.message || t('serverBackups.failedToPerformAction'))
                }
            }
        })
        setConfirmDialogOpen(true)
    }

    const handleDownloadBackup = async (backup: BackupItem) => {
        try {
            const { data } = await axios.get(`/api/user/servers/${uuidShort}/backups/${backup.uuid}/download`)
            if (data.success) {
                window.open(data.data.download_url, '_blank')
                toast.success(t('serverBackups.downloadSuccess'))
            } else {
                toast.error(data.message || t('serverBackups.downloadFailed'))
            }
        } catch {
            toast.error(t('serverBackups.downloadFailed'))
        }
    }

    const addIgnorePattern = () => {
        if (newIgnorePattern.trim() && !ignoredFiles.includes(newIgnorePattern.trim())) {
            setIgnoredFiles([...ignoredFiles, newIgnorePattern.trim()])
            setNewIgnorePattern('')
        }
    }

    const removeIgnorePattern = (pattern: string) => {
        setIgnoredFiles(ignoredFiles.filter(p => p !== pattern))
    }

    if (loading && backups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-muted-foreground font-medium animate-pulse">{t('common.loading')}</p>
            </div>
        )
    }

    const limitReached = server && backups.length >= server.backup_limit

    return (
        <div className="space-y-8 pb-12 ">
            {/* Header Section */}
            <PageHeader
                title={t('serverBackups.title')}
                description={
                    <div className="flex items-center gap-3">
                        <span>{t('serverBackups.description')}</span>
                        {server && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20">
                                {backups.length} / {server.backup_limit}
                            </span>
                        )}
                    </div>
                }
                actions={
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="glass" 
                            size="lg" 
                            onClick={() => fetchBackups()}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                            {t('serverBackups.refresh')}
                        </Button>
                        {canCreate && (
                            <Button 
                                size="lg" 
                                disabled={limitReached || loading}
                                onClick={() => {
                                    setNewBackupName(generateBackupName())
                                    setIgnoredFiles([])
                                    setCreateDialogOpen(true)
                                }}
                                className="shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                {t('serverBackups.createBackup')}
                            </Button>
                        )}
                    </div>
                }
            />

            {limitReached && (
                <div className="relative overflow-hidden p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl animate-in slide-in-from-top duration-500">
                    <div className="relative z-10 flex items-start gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                            <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-yellow-500 leading-none">{t('serverBackups.backupLimitReached')}</h3>
                            <p className="text-sm text-yellow-500/80 leading-relaxed font-medium">
                                {t('serverBackups.backupLimitReachedDescription', { limit: String(server?.backup_limit || 0) })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder={t('serverBackups.searchPlaceholder')}
                            className="pl-12 h-14 text-lg"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {backups.length === 0 ? (
                    <EmptyState
                        title={t('serverBackups.noBackups')}
                        description={server?.backup_limit === 0 
                            ? t('serverBackups.noBackupsNoLimit') 
                            : t('serverBackups.noBackupsDescription')}
                        icon={Archive}
                        action={canCreate && server && server.backup_limit > 0 ? (
                             <Button 
                                size="lg" 
                                onClick={() => {
                                    setNewBackupName(generateBackupName())
                                    setIgnoredFiles([])
                                    setCreateDialogOpen(true)
                                }}
                                className="h-14 px-10 text-lg shadow-2xl shadow-primary/20"
                            >
                                <Plus className="h-6 w-6 mr-2" />
                                {t('serverBackups.createBackup')}
                            </Button>
                        ) : undefined}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {backups.map((backup) => (
                            <div 
                                key={backup.id}
                                className="group relative overflow-hidden rounded-3xl bg-[#0A0A0A]/40 backdrop-blur-md border border-white/5 hover:border-primary/40 hover:bg-white/5 transition-all duration-300 shadow-sm"
                            >
                                <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-6">
                                    <div className={cn(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 shadow-inner",
                                        !backup.completed_at && !backup.is_successful 
                                            ? "bg-blue-500/10 border-blue-500/20" 
                                            : backup.is_successful 
                                                ? "bg-emerald-500/10 border-emerald-500/20" 
                                                : "bg-red-500/10 border-red-500/20"
                                    )}>
                                        <Archive className={cn(
                                            "h-8 w-8",
                                            !backup.completed_at && !backup.is_successful 
                                                ? "text-blue-500 animate-pulse" 
                                                : backup.is_successful 
                                                    ? "text-emerald-500" 
                                                    : "text-red-500"
                                        )} />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-bold truncate tracking-tight text-foreground group-hover:text-primary transition-colors">{backup.name}</h3>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none shadow-sm",
                                                !backup.completed_at && !backup.is_successful 
                                                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20 animate-pulse" 
                                                    : backup.is_successful 
                                                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                                                        : "bg-red-500 text-white shadow-lg shadow-red-500/20"
                                            )}>
                                                {!backup.completed_at && !backup.is_successful 
                                                    ? t('serverBackups.statusCreating') 
                                                    : backup.is_successful 
                                                        ? t('serverBackups.statusSuccessful') 
                                                        : t('serverBackups.statusFailed')}
                                            </span>
                                            {backup.is_locked === 1 && (
                                                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                                    <Lock className="h-3 w-3" />
                                                    {t('serverBackups.statusLocked')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <HardDrive className="h-4 w-4 opacity-50" />
                                                <span className="text-sm font-semibold">{formatMib(backup.bytes / 1024 / 1024)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Database className="h-4 w-4 opacity-50" />
                                                <span className="text-sm font-semibold uppercase tracking-tight">{backup.disk}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="h-4 w-4 opacity-50" />
                                                <span className="text-sm font-semibold">{new Date(backup.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 sm:self-center">
                                        {(canRestore || canDownload || canDelete) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="h-12 w-12 rounded-xl group-hover:bg-primary/10 transition-colors flex items-center justify-center outline-none">
                                                    <MoreVertical className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 bg-card/90 backdrop-blur-xl border-border/40 p-2 rounded-2xl shadow-2xl">
                                                    {canRestore && backup.is_successful === 1 && (
                                                        <DropdownMenuItem 
                                                            disabled={backup.is_locked === 1}
                                                            onClick={() => {
                                                                setBackupToRestore(backup)
                                                                setRestoreDialogOpen(true)
                                                            }}
                                                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                                                        >
                                                            <RotateCcw className="h-4 w-4 text-emerald-500" />
                                                            <span className="font-bold">{t('serverBackups.restore')}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canDownload && backup.is_successful === 1 && (
                                                        <DropdownMenuItem 
                                                            onClick={() => handleDownloadBackup(backup)}
                                                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                                                        >
                                                            <Download className="h-4 w-4 text-blue-500" />
                                                            <span className="font-bold">{t('serverBackups.download')}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canDelete && (
                                                        <DropdownMenuItem 
                                                            disabled={backup.is_locked === 1}
                                                            onClick={() => handleDeleteBackup(backup)}
                                                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="font-bold">{t('serverBackups.delete')}</span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator className="bg-border/40 my-1" />
                                                    <DropdownMenuItem 
                                                        onClick={() => handleLockBackup(backup, backup.is_locked === 0)}
                                                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                                                    >
                                                        {backup.is_locked === 1 ? (
                                                            <>
                                                                <Unlock className="h-4 w-4 text-yellow-500" />
                                                                <span className="font-bold">{t('serverBackups.unlock')}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Lock className="h-4 w-4 text-yellow-500" />
                                                                <span className="font-bold">{t('serverBackups.lock')}</span>
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.total > pagination.per_page && (
                    <div className="flex items-center justify-between py-8 border-t border-border/40 px-6">
                        <p className="text-sm font-bold opacity-40 uppercase tracking-widest">
                            {t('serverActivities.pagination.showing', { 
                                from: String((pagination.current_page - 1) * pagination.per_page + 1), 
                                to: String(Math.min(pagination.current_page * pagination.per_page, pagination.total)), 
                                total: String(pagination.total) 
                            })}
                        </p>
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="glass" 
                                size="sm" 
                                disabled={pagination.current_page === 1 || loading}
                                onClick={() => {
                                    setPage(p => p - 1)
                                    fetchBackups(pagination.current_page - 1)
                                }}
                                className="h-10 w-10 p-0 rounded-xl"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <span className="h-10 px-4 rounded-xl text-sm font-black bg-primary/5 text-primary border border-primary/20 flex items-center justify-center min-w-12">
                                {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button 
                                variant="glass" 
                                size="sm" 
                                disabled={pagination.current_page === pagination.last_page || loading}
                                onClick={() => {
                                    setPage(p => p + 1)
                                    fetchBackups(pagination.current_page + 1)
                                }}
                                className="h-10 w-10 p-0 rounded-xl"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* CREATE DIALOG */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} className="max-w-xl">
                <div className="space-y-6 p-2">
                    <DialogHeader>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                                <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold leading-none">{t('serverBackups.createBackup')}</DialogTitle>
                                <DialogDescription className="text-sm opacity-70">
                                    {t('serverBackups.createBackupDescription')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleCreateBackup} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2 px-1">
                                <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest ml-1">{t('serverBackups.name')}</label>
                                <Input 
                                    value={newBackupName} 
                                    onChange={(e) => setNewBackupName(e.target.value)}
                                    placeholder={t('serverBackups.namePlaceholder')}
                                    required
                                    className="h-12 bg-black/20 border-white/5 focus:border-primary/50 transition-all rounded-xl"
                                />
                            </div>

                            <div className="space-y-3 px-1">
                                <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest ml-1">{t('serverBackups.ignoreFiles')}</label>
                                <div className="flex gap-2">
                                    <Input 
                                        value={newIgnorePattern}
                                        onChange={(e) => setNewIgnorePattern(e.target.value)}
                                        placeholder={t('serverBackups.ignoreFilesPlaceholder')}
                                        className="h-12 bg-black/20 border-white/5 focus:border-primary/50 transition-all rounded-xl"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIgnorePattern())}
                                    />
                                    <Button type="button" variant="glass" className="h-12 px-5 rounded-xl bg-background/50 hover:bg-background border-border/40" onClick={addIgnorePattern}>
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic leading-relaxed px-1">
                                    {t('serverBackups.ignoreFilesHelp')}
                                </p>

                                {ignoredFiles.length > 0 && (
                                    <div className="space-y-2 pt-2 px-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase opacity-40 tracking-widest ml-1">
                                            <FileX className="h-3 w-3" />
                                            {t('serverBackups.ignoreFilesList')}
                                        </div>
                                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-black/20 rounded-xl border border-white/5">
                                            {ignoredFiles.map((pattern, i) => (
                                                <span key={i} className="flex items-center bg-red-500/5 text-red-500 border border-red-500/20 py-1.5 pl-3 pr-2 rounded-lg gap-2 font-mono text-[10px]">
                                                    {pattern}
                                                    <button type="button" onClick={() => removeIgnorePattern(pattern)} className="hover:bg-red-500/10 rounded-sm p-0.5 transition-colors">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="border-t border-border/40 pt-6 mt-4 px-1">
                            <Button type="button" variant="ghost" className="h-12 flex-1 rounded-xl font-bold" onClick={() => setCreateDialogOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={creating} className="h-12 flex-1 shadow-xl shadow-primary/20 rounded-xl font-bold">
                                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : t('serverBackups.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </Dialog>

            {/* RESTORE DIALOG */}
            <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} className="max-w-xl">
                <div className="space-y-6 p-2">
                    <DialogHeader>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-inner">
                                <RotateCcw className="h-6 w-6 text-orange-500" />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold leading-none">{t('serverBackups.confirmRestoreTitle')}</DialogTitle>
                                <DialogDescription className="text-sm opacity-70">
                                    {t('serverBackups.restoreBackupDescription')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 backdrop-blur-sm space-y-3 mx-1">
                        <div className="flex items-center gap-3 text-orange-500">
                            <AlertTriangle className="h-5 w-5 shadow-sm" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest leading-none">Caution</h4>
                        </div>
                        <p className="text-sm text-orange-700/80 dark:text-orange-500/80 leading-relaxed font-medium">
                            {t('serverBackups.truncateDirectoryHelp')}
                        </p>
                    </div>

                    <form onSubmit={handleRestoreBackup} className="space-y-6">
                        <div 
                            className="flex items-center gap-4 p-5 bg-black/20 rounded-3xl border border-white/5 cursor-pointer group hover:bg-black/30 transition-all mx-1"
                            onClick={() => setTruncateDirectory(!truncateDirectory)}
                        >
                            <Checkbox 
                                id="truncate-directory" 
                                checked={truncateDirectory} 
                                onCheckedChange={(checked) => setTruncateDirectory(checked === true)}
                                className="h-6 w-6"
                            />
                            <div className="space-y-0.5">
                                <label htmlFor="truncate-directory" className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors block leading-tight">
                                    {t('serverBackups.truncateDirectory')}
                                </label>
                                <p className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">This will clear the server folder before restoring</p>
                            </div>
                        </div>

                        <DialogFooter className="border-t border-border/40 pt-6 mt-4 px-1">
                            <Button type="button" variant="ghost" className="h-12 flex-1 rounded-xl font-bold" onClick={() => setRestoreDialogOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={restoring} variant="destructive" className="h-12 flex-1 shadow-xl shadow-red-500/20 rounded-xl font-bold">
                                {restoring ? <Loader2 className="h-5 w-5 animate-spin" /> : t('serverBackups.confirmRestore')}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </Dialog>

            {/* CONFIRM ACTION DIALOG */}
            <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} className="max-w-lg">
                <div className="space-y-6 p-2">
                    <DialogHeader>
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center border shadow-inner",
                                confirmAction?.variant === 'destructive' ? "bg-red-500/10 border-red-500/20" : "bg-primary/10 border-primary/20"
                            )}>
                                {confirmAction?.variant === 'destructive' ? (
                                    <Trash2 className="h-6 w-6 text-red-500" />
                                ) : (
                                    <Info className="h-6 w-6 text-primary" />
                                )}
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold leading-none">{confirmAction?.title}</DialogTitle>
                                <DialogDescription className="text-sm opacity-70">
                                    {confirmAction?.description}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <DialogFooter className="border-t border-border/40 pt-6 mt-4 px-1">
                        <Button variant="ghost" className="h-12 flex-1 font-bold rounded-xl" onClick={() => setConfirmDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button 
                            variant={confirmAction?.variant === 'destructive' ? 'destructive' : 'default'} 
                            className={cn(
                                "h-12 flex-1 shadow-xl font-bold rounded-xl",
                                confirmAction?.variant === 'destructive' ? "shadow-red-500/20" : "shadow-primary/20"
                            )}
                            onClick={async () => {
                                setActionLoading(true)
                                try {
                                    await confirmAction?.action()
                                    setConfirmDialogOpen(false)
                                } finally {
                                    setActionLoading(false)
                                }
                            }}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('common.confirm')}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>
        </div>
    )
}
