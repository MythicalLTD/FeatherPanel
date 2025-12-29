'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { 
    Plus, 
    Trash2, 
    Loader2, 
    Eye, 
    EyeOff, 
    Copy, 
    AlertTriangle, 
    ChevronLeft, 
    ChevronRight, 
    Database as DatabaseIcon, 
    RefreshCw, 
    User, 
    Server as ServerIcon, 
    Info,
    Search,
    ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/contexts/TranslationContext'
import { useServerPermissions } from '@/hooks/useServerPermissions'
import { cn, copyToClipboard as copyUtil } from '@/lib/utils'

// UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
    Dialog, 
    DialogTitle, 
    DialogDescription, 
    DialogHeader, 
    DialogFooter,
    DialogContent
} from '@/components/ui/dialog'
import { HeadlessSelect } from '@/components/ui/headless-select'

// Types
import { Database, DatabaseHost, DatabasesResponse } from '@/types/server'

export default function ServerDatabasesPage() {
    const { t } = useTranslation()
    const params = useParams()
    const router = useRouter()
    const serverUuidShort = params.uuidShort as string

    // Permissions
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(serverUuidShort)
    const canRead = hasPermission('database.read')
    const canCreate = hasPermission('database.create')
    const canDelete = hasPermission('database.delete')
    const canViewPassword = hasPermission('database.view_password')

    // State
    const [databases, setDatabases] = useState<Database[]>([])
    const [availableHosts, setAvailableHosts] = useState<DatabaseHost[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [creating, setCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [serverLimit, setServerLimit] = useState<number>(0)
    const [phpMyAdminInstalled, setPhpMyAdminInstalled] = useState(false)

    // Pagination
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
    })

    // Drawer/Dialog states
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [viewDialogOpen, setViewDialogOpen] = useState(false)
    const [viewingDatabase, setViewingDatabase] = useState<Database | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showSensitiveWarning, setShowSensitiveWarning] = useState(false)
    const [rememberSensitiveChoice, setRememberSensitiveChoice] = useState(false)
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false)
    const [databaseToDelete, setDatabaseToDelete] = useState<Database | null>(null)

    // Form data
    const [createForm, setCreateForm] = useState<{
        database_host_id: string | number;
        database_name: string;
        remote: string;
        max_connections: number;
    }>({
        database_host_id: '',
        database_name: '',
        remote: '%',
        max_connections: 0,
    })

    // Memoized permission check for rendering
    useEffect(() => {
        if (!permissionsLoading && !canRead) {
            toast.error(t('serverDatabases.noDatabasePermission'))
            router.push(`/server/${serverUuidShort}`)
        }
    }, [canRead, permissionsLoading, router, serverUuidShort, t])

    const fetchDatabases = useCallback(async (page = pagination.current_page) => {
        if (!canRead) return
        
        setRefreshing(true)
        try {
            const [databasesResponse, serverResponse] = await Promise.all([
                axios.get(`/api/user/servers/${serverUuidShort}/databases`, {
                    params: { 
                        page, 
                        per_page: pagination.per_page, 
                        search: searchQuery || undefined 
                    },
                }),
                axios.get(`/api/user/servers/${serverUuidShort}`),
            ])

            if (databasesResponse.data.success) {
                setDatabases(databasesResponse.data.data.data)
                const p = databasesResponse.data.data.pagination
                setPagination({
                    current_page: p.current_page,
                    per_page: p.per_page,
                    total: p.total,
                    last_page: p.last_page,
                    from: p.from,
                    to: p.to,
                })
            }

            if (serverResponse.data.success) {
                setServerLimit(serverResponse.data.data.database_limit)
            }
        } catch (error) {
            console.error('Error fetching databases:', error)
            toast.error(t('serverDatabases.failedToFetch'))
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [canRead, pagination.current_page, pagination.per_page, searchQuery, serverUuidShort, t])

    const fetchAvailableHosts = useCallback(async () => {
        if (!canCreate) return
        try {
            const { data } = await axios.get(`/api/user/servers/${serverUuidShort}/databases/hosts`)
            if (data.success) {
                setAvailableHosts(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch available hosts:', error)
        }
    }, [canCreate, serverUuidShort])

    const checkPhpMyAdmin = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/servers/${serverUuidShort}/databases/phpmyadmin/check`)
            if (data.success) {
                setPhpMyAdminInstalled(data.data.installed || false)
            }
        } catch (error) {
            console.error('Failed to check phpMyAdmin:', error)
        }
    }, [serverUuidShort])

    useEffect(() => {
        if (canRead) {
            fetchDatabases(1)
            fetchAvailableHosts()
            checkPhpMyAdmin()
        }
    }, [canRead, fetchDatabases, fetchAvailableHosts, checkPhpMyAdmin])

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

        setCreating(true)
        try {
            const { data } = await axios.post(`/api/user/servers/${serverUuidShort}/databases`, createForm)
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
        
        setDeletingId(databaseToDelete.id)
        try {
            const { data } = await axios.delete(`/api/user/servers/${serverUuidShort}/databases/${databaseToDelete.id}`)
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
            setShowSensitiveWarning(true)
        }
    }

    const confirmSensitiveWarning = () => {
        if (rememberSensitiveChoice) {
            localStorage.setItem('featherpanel-remember-sensitive-info', 'true')
        }
        setShowPassword(rememberSensitiveChoice)
        setShowSensitiveWarning(false)
        setViewDialogOpen(true)
    }

    const handlePhpMyAdmin = async (db: Database) => {
        try {
            const { data } = await axios.post(`/api/user/servers/${serverUuidShort}/databases/${db.id}/phpmyadmin/token`)
            if (data.success) {
                window.open(data.data.url, '_blank')
                toast.success(t('serverDatabases.openingPhpMyAdmin'))
            } else {
                toast.error(data.message || t('serverDatabases.failedToOpenPhpMyAdmin'))
            }
        } catch (error) {
            console.error('Error opening phpMyAdmin:', error)
            toast.error(t('serverDatabases.failedToOpenPhpMyAdmin'))
        }
    }

    const copyToClipboard = (text: string) => copyUtil(text, t)


    if (loading || permissionsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{t('serverDatabases.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('serverDatabases.description')} 
                        <span className="ml-1 font-medium text-foreground">
                            ({databases.length}/{serverLimit})
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchDatabases()} disabled={refreshing}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                        {t('serverDatabases.refresh')}
                    </Button>
                    {canCreate && (
                        <Button 
                            onClick={() => setCreateDialogOpen(true)} 
                            disabled={databases.length >= serverLimit}
                            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('serverDatabases.createDatabase')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Limit Warning */}
            {serverLimit > 0 && databases.length >= serverLimit && (
                <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div>
                            <p className="font-bold text-yellow-500">{t('serverDatabases.databaseLimitReached')}</p>
                            <p className="text-sm text-yellow-500/80">
                                {t('serverDatabases.databaseLimitReachedDescription', { limit: String(serverLimit) })}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List Header / Search */}
            <div className="bg-card/40 backdrop-blur-sm rounded-xl border border-border/40 p-1">
                <div className="p-4">
                    <div className="relative">
                        <Input 
                            placeholder={t('serverDatabases.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchDatabases(1)}
                            className="bg-background/50 border-border/40 focus:border-primary/40 pr-10"
                        />
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-40" />
                    </div>
                </div>
            </div>

            {/* Databases List */}
            {databases.length === 0 ? (
                <Card className="bg-card/20 border-border/40 border-dashed py-20">
                    <CardContent className="flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                            <DatabaseIcon className="h-10 w-10 text-primary opacity-60" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">{t('serverDatabases.noDatabases')}</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                            {serverLimit === 0 
                                ? t('serverDatabases.noDatabasesNoLimit') 
                                : t('serverDatabases.noDatabasesDescription')}
                        </p>
                        {canCreate && serverLimit > 0 && (
                            <Button size="lg" onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="mr-2 h-5 w-5" />
                                {t('serverDatabases.createDatabase')}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {databases.map((db) => (
                        <Card 
                            key={db.id} 
                            className="bg-card/40 hover:bg-card/60 border-border/40 transition-all duration-200 group overflow-hidden"
                        >
                            <CardContent className="p-0">
                                <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                                            <DatabaseIcon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors truncate mb-1">
                                                {db.database}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5 min-w-0">
                                                    <User className="h-3.5 w-3.5 opacity-50" />
                                                    <span className="truncate">{db.username}</span>
                                                </span>
                                                <span className="flex items-center gap-1.5 min-w-0">
                                                    <ServerIcon className="h-3.5 w-3.5 opacity-50" />
                                                    <span className="font-mono text-xs opacity-70 truncate">
                                                        {db.database_host}:{db.database_port}
                                                    </span>
                                                </span>
                                                <Badge variant="outline" className="bg-background/50 border-border/40 py-0 h-5 px-1.5 font-mono text-[10px]">
                                                    {db.remote === '%' ? 'All Hosts' : db.remote}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                        {phpMyAdminInstalled && canViewPassword && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handlePhpMyAdmin(db)}
                                                className="bg-background/50 hover:bg-background border-border/40"
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                phpMyAdmin
                                            </Button>
                                        )}
                                        {canViewPassword && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => openViewDatabase(db)}
                                                className="bg-background/50 hover:bg-background border-border/40"
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                {t('serverDatabases.view')}
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                onClick={() => {
                                                    setDatabaseToDelete(db)
                                                    setConfirmDeleteDialogOpen(true)
                                                }}
                                                className="shadow-lg shadow-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* CREATE DIALOG */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} className="max-w-xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>{t('serverDatabases.createDatabase')}</DialogTitle>
                            <DialogDescription>{t('serverDatabases.createDatabaseDescription')}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <form onSubmit={handleCreateDatabase} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('serverDatabases.databaseHost')}</Label>
                        <HeadlessSelect
                            value={createForm.database_host_id}
                            onChange={(val) => setCreateForm({ ...createForm, database_host_id: val })}
                            options={availableHosts.map(h => ({
                                id: h.id,
                                name: `${h.name} (${h.database_type})`,
                            }))}
                            placeholder={availableHosts.length === 0 ? t('serverDatabases.noDatabaseHosts') : t('serverDatabases.selectDatabaseHost')}
                            disabled={availableHosts.length === 0}
                        />
                        {availableHosts.length === 0 ? (
                            <p className="text-xs text-yellow-500 flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3" />
                                {t('serverDatabases.noDatabaseHostsDescription')}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">{t('serverDatabases.databaseHostHelp')}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('serverDatabases.databaseName')}</Label>
                        <Input 
                            required
                            value={createForm.database_name}
                            onChange={(e) => setCreateForm({ ...createForm, database_name: e.target.value })}
                            placeholder={t('serverDatabases.databaseNamePlaceholder')}
                            className="bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground">{t('serverDatabases.databaseNameHelp')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('serverDatabases.remoteAccess')}</Label>
                            <Input 
                                value={createForm.remote}
                                onChange={(e) => setCreateForm({ ...createForm, remote: e.target.value })}
                                placeholder="%"
                                className="bg-background/50"
                            />
                            <p className="text-[10px] text-muted-foreground">{t('serverDatabases.remoteAccessHelp')}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('serverDatabases.maxConnections')}</Label>
                            <Input 
                                type="number"
                                min={0}
                                value={createForm.max_connections}
                                onChange={(e) => setCreateForm({ ...createForm, max_connections: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                                className="bg-background/50"
                            />
                            <p className="text-[10px] text-muted-foreground">{t('serverDatabases.maxConnectionsHelp')}</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setCreateDialogOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={creating || availableHosts.length === 0}>
                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            {t('serverDatabases.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </Dialog>

            {/* SENSITIVE INFO WARNING */}
            <Dialog open={showSensitiveWarning} onClose={() => setShowSensitiveWarning(false)} className="max-w-md">
                <DialogHeader className="text-center pt-4">
                    <div className="mx-auto h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4 border-2 border-yellow-500/20">
                        <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    </div>
                    <DialogTitle className="text-2xl text-yellow-500">{t('serverDatabases.sensitiveInfoWarning')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-base">
                        {t('serverDatabases.sensitiveInfoDescription')}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-6 flex items-start gap-3 px-2">
                    <div className="flex h-5 items-center">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                            checked={rememberSensitiveChoice}
                            onChange={(e) => setRememberSensitiveChoice(e.target.checked)}
                        />
                    </div>
                    <div className="text-sm leading-6">
                        <Label className="font-medium text-foreground">{t('serverDatabases.rememberChoice')}</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" className="flex-1" onClick={() => setShowSensitiveWarning(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button className="flex-1" onClick={confirmSensitiveWarning}>
                        {t('serverDatabases.viewDatabase')}
                    </Button>
                </DialogFooter>
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
                                    <DialogTitle className="text-xl font-bold">{viewingDatabase.database}</DialogTitle>
                                    <DialogDescription className="text-sm opacity-70">
                                        {t('serverDatabases.databaseCredentials')}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Connection Details */}
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 backdrop-blur-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-5 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-primary/30 rounded-full" />
                                    {t('serverDatabases.connectionDetails')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { label: t('serverDatabases.host'), value: viewingDatabase.database_host },
                                        { label: t('serverDatabases.port'), value: viewingDatabase.database_port?.toString() },
                                        { label: t('serverDatabases.type'), value: viewingDatabase.database_type },
                                    ].map((item, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <Label className="text-[10px] uppercase tracking-wider opacity-40 font-bold">{item.label}</Label>
                                            <div className="relative group">
                                                <code className="block w-full px-3 py-2 bg-black/20 rounded-lg text-xs font-mono border border-white/5 truncate pr-8">
                                                    {item.value || 'N/A'}
                                                </code>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="absolute right-0 top-0 h-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => copyToClipboard(item.value || '')}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Login Credentials */}
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 backdrop-blur-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-5 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-primary/30 rounded-full" />
                                    {t('serverDatabases.loginCredentials')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold opacity-40">{t('serverDatabases.username')}</Label>
                                        <div className="relative group">
                                            <code className="block w-full px-3 py-2 bg-black/20 rounded-lg text-xs font-mono border border-white/5 truncate pr-8">
                                                {viewingDatabase.username}
                                            </code>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="absolute right-0 top-0 h-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => copyToClipboard(viewingDatabase.username)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-[10px] uppercase font-bold opacity-40">{t('serverDatabases.password')}</Label>
                                            <button 
                                                className="text-[10px] uppercase font-black text-primary hover:underline"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? t('common.hide') : t('common.show')}
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <code className="block w-full px-3 py-2 bg-black/20 rounded-lg text-xs font-mono border border-white/5 truncate pr-8">
                                                {showPassword ? viewingDatabase.password : '••••••••••••••••'}
                                            </code>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="absolute right-0 top-0 h-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => copyToClipboard(viewingDatabase.password || '')}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Database Information */}
                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 backdrop-blur-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-5 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-primary/30 rounded-full" />
                                    {t('serverDatabases.databaseInformation')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold opacity-40 mb-1">{t('serverDatabases.name')}</Label>
                                        <div className="relative group">
                                            <code className="block w-full px-3 py-2 bg-black/20 rounded-lg text-xs font-mono border border-white/5 truncate pr-8">
                                                {viewingDatabase.database}
                                            </code>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="absolute right-0 top-0 h-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => copyToClipboard(viewingDatabase.database)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold opacity-40 mb-1">{t('serverDatabases.remoteAccess')}</Label>
                                        <code className="block w-full px-3 py-2 bg-black/20 rounded-lg text-xs font-mono border border-white/5">
                                            {viewingDatabase.remote}
                                        </code>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold opacity-40 mb-1">{t('serverDatabases.maxConnections')}</Label>
                                        <code className="block w-full px-3 py-2 bg-black/20 rounded-lg text-xs font-mono border border-white/5">
                                            {viewingDatabase.max_connections || 0}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="border-t border-border/40 pt-4">
                            <Button 
                                variant="ghost" 
                                onClick={() => {
                                    localStorage.removeItem('featherpanel-remember-sensitive-info')
                                    toast.success(t('serverDatabases.rememberedChoiceCleared'))
                                }}
                                className="mr-auto text-[10px] opacity-40 hover:opacity-100"
                            >
                                {t('serverDatabases.resetWarning')}
                            </Button>
                            <Button size="sm" className="px-8" onClick={() => setViewDialogOpen(false)}>
                                {t('common.close')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>

            {/* CONFIRM DELETE DIALOG */}
            <Dialog open={confirmDeleteDialogOpen} onClose={() => setConfirmDeleteDialogOpen(false)} className="max-w-md">
                <DialogHeader className="text-center pt-4">
                    <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 border-2 border-destructive/20">
                        <Trash2 className="h-8 w-8 text-destructive" />
                    </div>
                    <DialogTitle className="text-2xl font-black">{t('serverDatabases.confirmDeleteTitle')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground text-base">
                        {t('serverDatabases.confirmDeleteDescription', { database: databaseToDelete?.database || '' })}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 text-center">
                    <p className="text-xs text-destructive uppercase font-bold tracking-tighter opacity-80">
                        {t('common.actionsCannotBeUndone')}
                    </p>
                </div>
                <DialogFooter className="gap-3">
                    <Button variant="ghost" className="flex-1" onClick={() => setConfirmDeleteDialogOpen(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button 
                        variant="destructive" 
                        className="flex-1 font-bold" 
                        disabled={deletingId !== null} 
                        onClick={handleDeleteDatabase}
                    >
                        {deletingId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {t('serverDatabases.confirmDelete')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    )
}
