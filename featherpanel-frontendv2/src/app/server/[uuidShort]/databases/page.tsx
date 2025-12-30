'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import axios from 'axios'
import { 
    Plus, 
    Trash2, 
    Loader2, 
    Database as DatabaseIcon, 
    RefreshCw, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    ShieldAlert, 
    MoreVertical,
    ExternalLink,
    Eye,
    Copy,
    User,
    Server as ServerIcon,
    Globe,
    AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'
import { useServerPermissions } from '@/hooks/useServerPermissions'
import { cn, copyToClipboard as copyUtil } from '@/lib/utils'

// UI Components (Headless UI based)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { HeadlessSelect } from '@/components/ui/headless-select'
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
import { Database, DatabaseHost, DatabasesResponse, Server } from '@/types/server'

export default function ServerDatabasesPage() {
    const { t } = useTranslation()
    const params = useParams()
    const router = useRouter()
    const pathname = usePathname()
    const uuidShort = params.uuidShort as string

    // Permissions
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    const canRead = hasPermission('database.read')
    const canCreate = hasPermission('database.create')
    const canDelete = hasPermission('database.delete')
    const canViewPassword = hasPermission('database.view_password')

    // State
    const [databases, setDatabases] = useState<Database[]>([])
    const [availableHosts, setAvailableHosts] = useState<DatabaseHost[]>([])
    const [loading, setLoading] = useState(true)
    const [server, setServer] = useState<Server | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [phpMyAdminInstalled, setPhpMyAdminInstalled] = useState(false)
    
    // Pagination
    const [pagination, setPagination] = useState({
        current_page: 1,
        total: 0,
        last_page: 1,
        per_page: 20
    })

    // Modal States
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [viewDialogOpen, setViewDialogOpen] = useState(false)
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false)
    const [sensitiveWarningOpen, setSensitiveWarningOpen] = useState(false)
    
    const [creating, setCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [viewingDatabase, setViewingDatabase] = useState<Database | null>(null)
    const [databaseToDelete, setDatabaseToDelete] = useState<Database | null>(null)
    
    const [showPassword, setShowPassword] = useState(false)
    const [rememberSensitiveChoice, setRememberSensitiveChoice] = useState(false)

    // Form data
    const [createForm, setCreateForm] = useState({
        database_host_id: '',
        database_name: '',
        remote: '%',
        max_connections: 0,
    })

    const fetchDatabases = useCallback(async (page = pagination.current_page) => {
        if (!uuidShort) return
        
        try {
            setLoading(true)
            const [databasesRes, serverRes, hostsRes, pmaRes] = await Promise.all([
                axios.get<DatabasesResponse>(`/api/user/servers/${uuidShort}/databases`, {
                    params: { 
                        page, 
                        per_page: pagination.per_page, 
                        search: searchQuery || undefined 
                    },
                }),
                axios.get<{ success: boolean, data: Server }>(`/api/user/servers/${uuidShort}`),
                axios.get<{ success: boolean, data: DatabaseHost[] }>(`/api/user/servers/${uuidShort}/databases/hosts`),
                axios.get<{ success: boolean, data: { installed: boolean } }>(`/api/user/servers/${uuidShort}/databases/phpmyadmin/check`)
            ])

            if (databasesRes.data.success) {
                setDatabases(databasesRes.data.data.data)
                const p = databasesRes.data.data.pagination
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

            if (hostsRes.data.success) {
                setAvailableHosts(hostsRes.data.data || [])
            }

            if (pmaRes.data.success) {
                setPhpMyAdminInstalled(pmaRes.data.data.installed || false)
            }
        } catch (error) {
            console.error('Error fetching databases:', error)
            toast.error(t('serverDatabases.failedToFetch'))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, searchQuery, pagination.current_page, pagination.per_page, t])

    useEffect(() => {
        if (!permissionsLoading && !canRead) {
            toast.error(t('serverDatabases.noDatabasePermission'))
            router.push(`/server/${uuidShort}`)
            return
        }
        
        if (canRead) {
            fetchDatabases()
        }
    }, [canRead, permissionsLoading, fetchDatabases, uuidShort, router, t])

    const handleCreateDatabase = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!createForm.database_host_id) {
            toast.error(t('serverDatabases.noHostSelected'))
            return
        }
        if (!createForm.database_name.trim()) {
            toast.error(t('serverDatabases.databaseNameRequired'))
            return
        }

        try {
            setCreating(true)
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/databases`, createForm)
            if (data.success) {
                toast.success(t('serverDatabases.createSuccess'))
                setCreateDialogOpen(false)
                fetchDatabases(1)
            } else {
                toast.error(data.message || t('serverDatabases.createFailed'))
            }
        } catch (error) {
            console.error('Error creating database:', error)
            toast.error(t('serverDatabases.createFailed'))
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteDatabase = async () => {
        if (!databaseToDelete) return
        
        try {
            setDeletingId(databaseToDelete.id)
            const { data } = await axios.delete(`/api/user/servers/${uuidShort}/databases/${databaseToDelete.id}`)
            if (data.success) {
                toast.success(t('serverDatabases.deleteSuccess'))
                setConfirmDeleteDialogOpen(false)
                fetchDatabases()
            } else {
                toast.error(data.message || t('serverDatabases.deleteFailed'))
            }
        } catch (error) {
            console.error('Error deleting database:', error)
            toast.error(t('serverDatabases.deleteFailed'))
        } finally {
            setDeletingId(null)
        }
    }

    const openViewDatabase = (db: Database) => {
        setViewingDatabase(db)
        const remembered = localStorage.getItem('featherpanel-remember-sensitive-info') === 'true'
        
        if (remembered) {
            setShowPassword(true)
            setViewDialogOpen(true)
        } else {
            setSensitiveWarningOpen(true)
        }
    }

    const confirmSensitiveWarning = () => {
        if (rememberSensitiveChoice) {
            localStorage.setItem('featherpanel-remember-sensitive-info', 'true')
        }
        setShowPassword(rememberSensitiveChoice)
        setSensitiveWarningOpen(false)
        setViewDialogOpen(true)
    }

    const handlePhpMyAdmin = async (db: Database) => {
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/databases/${db.id}/phpmyadmin/token`)
            if (data.success) {
                window.open(data.data.url, '_blank')
                toast.success(t('serverDatabases.openingPhpMyAdmin'))
            } else {
                toast.error(data.message || t('serverDatabases.failedToOpenPhpMyAdmin'))
            }
        } catch {
            toast.error(t('serverDatabases.failedToOpenPhpMyAdmin'))
        }
    }

    const copyToClipboard = (text: string) => copyUtil(text, t)

    if (loading && databases.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-muted-foreground font-medium animate-pulse">{t('common.loading')}</p>
            </div>
        )
    }

    const limitReached = server && databases.length >= server.database_limit

    return (
        <div key={pathname} className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight uppercase">{t('serverDatabases.title')}</h1>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <p className="text-lg opacity-80">{t('serverDatabases.description')}</p>
                        {server && (
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20">
                                {databases.length} / {server.database_limit}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => fetchDatabases()}
                        disabled={loading}
                        className="bg-background/50 backdrop-blur-md border-border/40 hover:bg-background/80"
                    >
                        <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                        {t('serverDatabases.refresh')}
                    </Button>
                    {canCreate && (
                        <Button 
                            size="lg" 
                            disabled={limitReached || loading}
                            onClick={() => setCreateDialogOpen(true)}
                            className="shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            {t('serverDatabases.createDatabase')}
                        </Button>
                    )}
                </div>
            </div>

            {limitReached && (
                <div className="relative overflow-hidden p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl animate-in slide-in-from-top duration-500">
                    <div className="relative z-10 flex items-start gap-5">
                        <div className="h-12 w-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                            <AlertTriangle className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-yellow-500 leading-none">{t('serverDatabases.databaseLimitReached')}</h3>
                            <p className="text-sm text-yellow-500/80 leading-relaxed font-medium">
                                {t('serverDatabases.databaseLimitReachedDescription', { limit: String(server?.database_limit || 0) })}
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
                            placeholder={t('serverDatabases.searchPlaceholder')}
                            className="bg-background/40 backdrop-blur-md border-border/40 pl-12 h-14 text-lg rounded-2xl focus:ring-primary/20 focus:border-primary/50 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {databases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/10 rounded-[3rem] border border-dashed border-border/60 backdrop-blur-sm">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                            <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                                <DatabaseIcon className="h-16 w-16 text-primary" />
                            </div>
                        </div>
                        <div className="max-w-md space-y-3">
                            <h2 className="text-3xl font-black">{t('serverDatabases.noDatabases')}</h2>
                            <p className="text-muted-foreground text-lg px-4">
                                {server?.database_limit === 0 
                                    ? t('serverDatabases.noDatabasesNoLimit') 
                                    : t('serverDatabases.noDatabasesDescription')}
                            </p>
                        </div>
                        {canCreate && server && server.database_limit > 0 && (
                            <Button 
                                size="lg" 
                                onClick={() => setCreateDialogOpen(true)}
                                className="h-14 px-10 text-lg shadow-2xl shadow-primary/20"
                            >
                                <Plus className="h-6 w-6 mr-2" />
                                {t('serverDatabases.createDatabase')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {databases.map((db) => (
                            <div 
                                key={db.id}
                                className="group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-md border border-border/40 hover:border-primary/40 hover:bg-card/50 transition-all duration-300 shadow-sm"
                            >
                                <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 shadow-inner">
                                        <DatabaseIcon className="h-8 w-8 text-primary" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-bold truncate tracking-tight">{db.database}</h3>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-primary/10 text-primary border border-primary/20 shadow-sm">
                                                {db.database_type}
                                            </span>
                                            {db.remote === '%' ? (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
                                                    <Globe className="h-3 w-3" />
                                                    All Hosts
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40 shadow-sm font-mono">
                                                    {db.remote}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <User className="h-4 w-4 opacity-50" />
                                                <span className="text-sm font-semibold">{db.username}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <ServerIcon className="h-4 w-4 opacity-50" />
                                                <span className="text-sm font-semibold font-mono">{db.database_host}:{db.database_port}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 md:self-center">
                                        {(canViewPassword || canDelete) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="h-12 w-12 rounded-xl group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                                                    <MoreVertical className="h-6 w-6" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 bg-card/90 backdrop-blur-xl border-border/40 p-2 rounded-2xl shadow-2xl">
                                                    {canViewPassword && (
                                                        <>
                                                            <DropdownMenuItem 
                                                                onClick={() => openViewDatabase(db)}
                                                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                                                            >
                                                                <Eye className="h-4 w-4 text-primary" />
                                                                <span className="font-bold">{t('serverDatabases.view')}</span>
                                                            </DropdownMenuItem>
                                                            {phpMyAdminInstalled && (
                                                                <DropdownMenuItem 
                                                                    onClick={() => handlePhpMyAdmin(db)}
                                                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                                                                >
                                                                    <ExternalLink className="h-4 w-4 text-blue-500" />
                                                                    <span className="font-bold">phpMyAdmin</span>
                                                                </DropdownMenuItem>
                                                            )}
                                                        </>
                                                    )}
                                                    {canDelete && (
                                                        <>
                                                            <DropdownMenuSeparator className="bg-border/40 my-1" />
                                                            <DropdownMenuItem 
                                                                onClick={() => {
                                                                    setDatabaseToDelete(db)
                                                                    setConfirmDeleteDialogOpen(true)
                                                                }}
                                                                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                <span className="font-bold">{t('serverDatabases.confirmDelete')}</span>
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
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
                                variant="outline" 
                                size="sm" 
                                disabled={pagination.current_page === 1 || loading}
                                onClick={() => {
                                    setPagination(p => ({ ...p, current_page: p.current_page - 1 }))
                                    fetchDatabases(pagination.current_page - 1)
                                }}
                                className="h-10 w-10 p-0 rounded-xl"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <span className="h-10 px-4 rounded-xl text-sm font-black bg-primary/5 text-primary border border-primary/20 flex items-center justify-center min-w-12">
                                {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={pagination.current_page === pagination.last_page || loading}
                                onClick={() => {
                                    setPagination(p => ({ ...p, current_page: p.current_page + 1 }))
                                    fetchDatabases(pagination.current_page + 1)
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
                                <DialogTitle className="text-xl font-bold leading-none">{t('serverDatabases.createDatabase')}</DialogTitle>
                                <DialogDescription className="text-sm opacity-70">
                                    {t('serverDatabases.createDatabaseDescription')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleCreateDatabase} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2 px-1">
                                <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest ml-1">{t('serverDatabases.databaseHost')}</label>
                                <HeadlessSelect
                                    value={String(createForm.database_host_id)}
                                    onChange={(val) => setCreateForm({ ...createForm, database_host_id: String(val) })}
                                    options={availableHosts.map(h => ({
                                        id: h.id,
                                        name: `${h.name} (${h.database_type})`,
                                    }))}
                                    placeholder={availableHosts.length === 0 ? t('serverDatabases.noDatabaseHosts') : t('serverDatabases.selectDatabaseHost')}
                                    disabled={availableHosts.length === 0}
                                />
                                {availableHosts.length === 0 && (
                                    <p className="text-[10px] text-yellow-500 flex items-center gap-1.5 mt-1 ml-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {t('serverDatabases.noDatabaseHostsDescription')}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2 px-1">
                                <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest ml-1">{t('serverDatabases.databaseName')}</label>
                                <Input 
                                    value={createForm.database_name}
                                    onChange={(e) => setCreateForm({ ...createForm, database_name: e.target.value })}
                                    placeholder={t('serverDatabases.databaseNamePlaceholder')}
                                    required
                                    className="h-12 bg-black/20 border-white/5 focus:border-primary/50 transition-all rounded-xl"
                                />
                                <p className="text-[10px] text-muted-foreground italic px-1">{t('serverDatabases.databaseNameHelp')}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest ml-1">{t('serverDatabases.remoteAccess')}</label>
                                    <Input 
                                        value={createForm.remote}
                                        onChange={(e) => setCreateForm({ ...createForm, remote: e.target.value })}
                                        placeholder="%"
                                        className="h-12 bg-black/20 border-white/5 focus:border-primary/50 transition-all rounded-xl"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic px-1">{t('serverDatabases.remoteAccessHelp')}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest ml-1">{t('serverDatabases.maxConnections')}</label>
                                    <Input 
                                        type="number"
                                        min={0}
                                        value={createForm.max_connections}
                                        onChange={(e) => setCreateForm({ ...createForm, max_connections: parseInt(e.target.value) || 0 })}
                                        className="h-12 bg-black/20 border-white/5 focus:border-primary/50 transition-all rounded-xl"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic px-1">{t('serverDatabases.maxConnectionsHelp')}</p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="border-t border-border/40 pt-6 mt-4 px-1">
                            <Button type="button" variant="ghost" className="h-12 flex-1 rounded-xl font-bold" onClick={() => setCreateDialogOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={creating || availableHosts.length === 0} className="h-12 flex-1 shadow-xl shadow-primary/20 rounded-xl font-bold">
                                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : t('serverDatabases.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </Dialog>

            {/* SENSITIVE INFO WARNING */}
            <Dialog open={sensitiveWarningOpen} onClose={() => setSensitiveWarningOpen(false)} className="max-w-md">
                <div className="space-y-6 p-2">
                    <DialogHeader className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-3xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-inner mb-4">
                            <ShieldAlert className="h-8 w-8 text-yellow-500" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-yellow-500 leading-tight">
                            {t('serverDatabases.sensitiveInfoWarning')}
                        </DialogTitle>
                        <DialogDescription className="text-sm opacity-70 leading-relaxed px-4">
                            {t('serverDatabases.sensitiveInfoDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <div 
                        className="flex items-center gap-4 p-5 bg-black/20 rounded-3xl border border-white/5 cursor-pointer group hover:bg-black/30 transition-all mx-1"
                        onClick={() => setRememberSensitiveChoice(!rememberSensitiveChoice)}
                    >
                        <Checkbox 
                            id="remember-choice" 
                            checked={rememberSensitiveChoice} 
                            onCheckedChange={(checked) => setRememberSensitiveChoice(checked === true)}
                            className="h-6 w-6"
                        />
                        <div className="space-y-0.5">
                            <label htmlFor="remember-choice" className="text-sm font-bold cursor-pointer group-hover:text-primary transition-colors block leading-tight">
                                {t('serverDatabases.rememberChoice')}
                            </label>
                            <p className="text-[10px] opacity-40 font-bold uppercase tracking-tighter">Skip this warning in the future</p>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-border/40 pt-6 mt-4 px-1 gap-3">
                        <Button variant="ghost" className="h-12 flex-1 rounded-xl font-bold" onClick={() => setSensitiveWarningOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button className="h-12 flex-1 shadow-xl shadow-primary/20 rounded-xl font-bold" onClick={confirmSensitiveWarning}>
                            {t('serverDatabases.viewDatabase')}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>

            {/* VIEW DATABASE DIALOG */}
            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} className="max-w-2xl">
                {viewingDatabase && (
                    <div className="space-y-6 p-2">
                        <DialogHeader>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                                    <DatabaseIcon className="h-6 w-6 text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-xl font-bold leading-none">{viewingDatabase.database}</DialogTitle>
                                    <DialogDescription className="text-sm opacity-70">
                                        {t('serverDatabases.databaseCredentials')}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6 px-1">
                            {/* Connection Details */}
                            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-sm space-y-5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-primary/30 rounded-full" />
                                    {t('serverDatabases.connectionDetails')}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: t('serverDatabases.host'), value: viewingDatabase.database_host },
                                        { label: t('serverDatabases.port'), value: String(viewingDatabase.database_port) },
                                        { label: t('serverDatabases.type'), value: viewingDatabase.database_type },
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">{item.label}</label>
                                            <div className="relative group">
                                                <code className="block w-full px-4 py-2 bg-black/40 rounded-xl text-xs font-mono border border-white/5 truncate pr-10">
                                                    {item.value || 'N/A'}
                                                </code>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => copyToClipboard(item.value || '')}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Login Credentials */}
                            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-sm space-y-5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-primary/30 rounded-full" />
                                    {t('serverDatabases.loginCredentials')}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">{t('serverDatabases.username')}</label>
                                        <div className="relative group">
                                            <code className="block w-full px-4 py-2 bg-black/40 rounded-xl text-xs font-mono border border-white/5 truncate pr-10">
                                                {viewingDatabase.username}
                                            </code>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => copyToClipboard(viewingDatabase.username)}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] uppercase font-bold opacity-40 tracking-widest">{t('serverDatabases.password')}</label>
                                            <button 
                                                className="text-[10px] uppercase font-black text-primary hover:underline"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? t('common.hide') : t('common.show')}
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <code className="block w-full px-4 py-2 bg-black/40 rounded-xl text-xs font-mono border border-white/5 truncate pr-10">
                                                {showPassword ? viewingDatabase.password : '••••••••••••••••'}
                                            </code>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => copyToClipboard(viewingDatabase.password || '')}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="border-t border-border/40 pt-6 mt-4 px-1 flex-col sm:flex-row gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => {
                                    localStorage.removeItem('featherpanel-remember-sensitive-info')
                                    toast.success(t('serverDatabases.rememberedChoiceCleared'))
                                }}
                                className="sm:mr-auto text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                            >
                                {t('serverDatabases.resetWarning')}
                            </Button>
                            <Button size="lg" className="px-10 rounded-xl font-bold shadow-xl shadow-primary/20" onClick={() => setViewDialogOpen(false)}>
                                {t('common.close')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>

            {/* CONFIRM DELETE DIALOG */}
            <Dialog open={confirmDeleteDialogOpen} onClose={() => setConfirmDeleteDialogOpen(false)} className="max-w-md">
                <div className="space-y-6 p-2">
                    <DialogHeader className="text-center">
                        <div className="mx-auto h-16 w-16 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-inner mb-4">
                            <Trash2 className="h-8 w-8 text-red-500" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-red-500 leading-tight">
                            {t('serverDatabases.confirmDeleteTitle')}
                        </DialogTitle>
                        <DialogDescription className="text-sm opacity-70 leading-relaxed px-4">
                            {t('serverDatabases.confirmDeleteDescription', { database: databaseToDelete?.database || '' })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 text-center">
                        <p className="text-[10px] text-red-500 uppercase font-black tracking-[0.2em] opacity-80">
                            {t('common.actionsCannotBeUndone')}
                        </p>
                    </div>

                    <DialogFooter className="border-t border-border/40 pt-6 mt-4 px-1 gap-3">
                        <Button variant="ghost" className="h-12 flex-1 rounded-xl font-bold" onClick={() => setConfirmDeleteDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button 
                            variant="destructive" 
                            className="h-12 flex-1 shadow-xl shadow-red-500/20 rounded-xl font-bold" 
                            onClick={handleDeleteDatabase}
                            disabled={deletingId !== null}
                        >
                            {deletingId !== null ? <Loader2 className="h-5 w-5 animate-spin" /> : t('serverDatabases.confirmDelete')}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>
        </div>
    )
}
