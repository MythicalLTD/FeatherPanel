'use client'

import React, { useState, useEffect, use, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import axios from 'axios'
import { useTranslation } from '@/contexts/TranslationContext'
import { useServerPermissions } from '@/hooks/useServerPermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HeadlessSelect } from '@/components/ui/headless-select'
import { 
    Dialog, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog'
import { 
    Activity, 
    RefreshCw, 
    Search, 
    X, 
    Eye, 
    Clock, 
    ChevronLeft, 
    ChevronRight, 
    Archive, 
    FileText, 
    Server, 
    Database, 
    Users, 
    Play, 
    Pause, 
    RotateCcw, 
    Trash2, 
    Lock, 
    Unlock, 
    Copy, 
    CalendarClock, 
    ListTodo, 
    Network, 
    Edit, 
    User, 
    Globe,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Types
type ActivityMetadata = {
    message?: string;
    command?: string;
    files?: string[];
    action?: string;
    exit_code?: number | string;
    backup_name?: string;
    backup_uuid?: string;
    adapter?: string;
    truncate_directory?: boolean;
    allocation_ip?: string;
    allocation_port?: number;
    server_uuid?: string;
    path?: string;
    filename?: string;
    file_size?: number;
    content_type?: string;
    content_length?: number;
    file_exists?: boolean;
    root?: string;
    file_count?: number;
    database_id?: number;
    database_name?: string;
    username?: string;
    database_host_name?: string;
    schedule_id?: number;
    schedule_name?: string;
    new_status?: string;
    updated_fields?: string[];
    task_id?: number;
    sequence_id?: number;
    subuser_id?: number;
    subusers?: unknown[];
    schedules?: unknown[];
    [key: string]: unknown;
}

type ActivityUser = {
    username: string;
    avatar: string | null;
    role: string | null;
}

type ActivityItem = {
    id: number;
    server_id: number;
    node_id: number;
    user_id: number | null;
    event: string;
    message?: string;
    metadata?: ActivityMetadata | null;
    ip?: string | null;
    timestamp?: string;
    created_at?: string;
    updated_at?: string;
    user?: ActivityUser | null;
}

export default function ServerActivityPage({ params }: { params: Promise<{ uuidShort: string }> }) {
    const { uuidShort } = use(params)
    const router = useRouter()
    const pathname = usePathname()
    const { t } = useTranslation()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)

    // State
    const [loading, setLoading] = useState(true)
    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedEventFilter, setSelectedEventFilter] = useState('all')
    const [pagination, setPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
        from: 0,
        to: 0,
    })

    // Details Dialog State
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null)

    const fetchActivities = useCallback(async (page = 1) => {
        try {
            setLoading(true)
            const queryParams: Record<string, string | number> = {
                page,
                per_page: pagination.per_page,
            }
            if (searchQuery.trim()) {
                queryParams.search = searchQuery.trim()
            }

            const { data } = await axios.get(`/api/user/servers/${uuidShort}/activities`, { params: queryParams })

            if (!data.success) {
                toast.error(data.message || t('serverActivities.failedToFetch'))
                return
            }

            const apiItems: ActivityItem[] = (data.data.activities.data || data.data.activities || []).map((item: ActivityItem) => ({
                ...item,
                metadata: normalizeMetadata(item.metadata)
            }))

            let filteredActivities = apiItems

            if (selectedEventFilter !== 'all') {
                filteredActivities = filteredActivities.filter((a) => {
                    const eventLower = a.event.toLowerCase()
                    switch (selectedEventFilter) {
                        case 'backup': return eventLower.includes('backup')
                        case 'power': return ['power', 'start', 'stop', 'restart', 'kill'].some(x => eventLower.includes(x))
                        case 'file': return eventLower.includes('file') || eventLower.includes('download')
                        case 'database': return eventLower.includes('database')
                        case 'schedule': return eventLower.includes('schedule')
                        case 'task': return eventLower.includes('task')
                        case 'subuser': return eventLower.includes('subuser')
                        case 'allocation': return eventLower.includes('allocation')
                        case 'server': return eventLower.includes('server') && !eventLower.includes('subuser')
                        default: return true
                    }
                })
            }

            setActivities(filteredActivities)
            
            const p = data.data.pagination || {}
            const totalPages = p.total_pages || p.last_page || 1
            const currentPage = p.current_page || 1
            
            setPagination({
                current_page: currentPage,
                per_page: p.per_page || 10,
                total_records: p.total || p.total_records || 0,
                total_pages: totalPages,
                has_next: currentPage < totalPages,
                has_prev: currentPage > 1,
                from: p.from || 0,
                to: p.to || 0,
            })

        } catch (error) {
           console.error(error)
           toast.error(t('serverActivities.failedToFetch'))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, pagination.per_page, searchQuery, selectedEventFilter, t])

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!loading) {
                fetchActivities(1)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery, loading, fetchActivities])

    // Initial Load
    useEffect(() => {
        if (!permissionsLoading) {
            if (!hasPermission('activity.read')) {
                toast.error(t('serverActivities.noActivityPermission'))
                router.push(`/server/${uuidShort}`)
                return
            }
            fetchActivities(1)
        }
    }, [uuidShort, permissionsLoading, hasPermission, fetchActivities, router, t])

    function normalizeMetadata(m: unknown): ActivityMetadata | undefined {
        if (m == null) return undefined
        if (typeof m === 'object') return m as ActivityMetadata
        if (typeof m === 'string') {
            try {
                return JSON.parse(m) as ActivityMetadata
            } catch {
                return undefined
            }
        }
        return undefined
    }

    function formatEvent(event: string) {
        return event.replace(/_/g, ' ').replace(/:/g, ' ').split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }
    
    function getEventIcon(event: string) {
        const eventLower = event.toLowerCase()
        if (eventLower.includes('backup')) return Archive
        if (['power', 'start', 'play'].some(x => eventLower.includes(x))) return Play
        if (['stop', 'kill'].some(x => eventLower.includes(x))) return Pause
        if (eventLower.includes('restart')) return RotateCcw
        if (eventLower.includes('file') || eventLower.includes('download')) return FileText
        if (eventLower.includes('database')) return Database
        if (eventLower.includes('schedule')) return CalendarClock
        if (eventLower.includes('task')) return ListTodo
        if (['subuser', 'user'].some(x => eventLower.includes(x))) return Users
        if (['allocation', 'network'].some(x => eventLower.includes(x))) return Network
        if (['setting', 'updated', 'update'].some(x => eventLower.includes(x))) return Edit
        if (['delete', 'deleted'].some(x => eventLower.includes(x))) return Trash2
        if (eventLower.includes('lock')) return Lock
        if (eventLower.includes('unlock')) return Unlock
        return Server
    }

    function getEventIconClass(event: string) {
        const eventLower = event.toLowerCase()
        if (eventLower.includes('backup')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
        if (['start', 'play'].some(x => eventLower.includes(x))) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
        if (['stop', 'kill'].some(x => eventLower.includes(x))) return 'text-red-500 bg-red-500/10 border-red-500/20'
        if (eventLower.includes('restart')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
        if (eventLower.includes('power')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
        if (eventLower.includes('file')) return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
        if (eventLower.includes('database')) return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
        if (eventLower.includes('schedule')) return 'text-purple-500 bg-purple-500/10 border-purple-500/20'
        if (eventLower.includes('task')) return 'text-pink-500 bg-pink-500/10 border-pink-500/20'
        if (['subuser', 'user'].some(x => eventLower.includes(x))) return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20'
        if (eventLower.includes('allocation')) return 'text-teal-500 bg-teal-500/10 border-teal-500/20'
        if (eventLower.includes('delete')) return 'text-red-500 bg-red-500/10 border-red-500/20'
        if (eventLower.includes('lock')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
        if (eventLower.includes('unlock')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
        return 'text-primary bg-primary/10 border-primary/20'
    }

    function displayMessage(item: ActivityItem): string {
        if (item.message) return item.message
        return formatEvent(item.event)
    }

    function formatRelativeTime(timestamp?: string) {
        if (!timestamp) return ''
        const now = new Date()
        const date = new Date(timestamp)
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diffInSeconds < 60) return t('serverActivities.justNow')
        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60)
            return t('serverActivities.minutesAgo', { minutes: String(minutes) })
        }
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600)
            return t('serverActivities.hoursAgo', { hours: String(hours) })
        }
        if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400)
            return t('serverActivities.daysAgo', { days: String(days) })
        }
        return date.toLocaleDateString()
    }

    const detailsPairs = selectedItem && selectedItem.metadata ? Object.entries(selectedItem.metadata).map(([k, v]) => ({
        key: k, 
        value: typeof v === 'object' ? JSON.stringify(v) : String(v) 
    })) : []

    const rawJson = selectedItem?.metadata ? JSON.stringify(selectedItem.metadata, null, 2) : ''

    const changePage = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPagination(p => ({ ...p, current_page: newPage }))
            fetchActivities(newPage)
        }
    }

    const filterOptions = [
        { id: 'all', name: t('serverActivities.allEvents') },
        { id: 'server', name: t('serverActivities.filterNames.server') },
        { id: 'backup', name: t('serverActivities.filterNames.backup') },
        { id: 'power', name: t('serverActivities.filterNames.power') },
        { id: 'file', name: t('serverActivities.filterNames.file') },
        { id: 'database', name: t('serverActivities.filterNames.database') },
        { id: 'schedule', name: t('serverActivities.filterNames.schedule') },
        { id: 'task', name: t('serverActivities.filterNames.task') },
        { id: 'subuser', name: t('serverActivities.filterNames.subuser') },
        { id: 'allocation', name: t('serverActivities.filterNames.allocation') },
    ]

    if (permissionsLoading || (loading && activities.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-muted-foreground font-medium animate-pulse">{t('common.loading')}</p>
            </div>
        )
    }

    return (
        <div key={pathname} className="space-y-8 pb-12 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight uppercase">{t('serverActivities.title')}</h1>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <p className="text-lg opacity-80">{t('serverActivities.description')}</p>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20">
                            {pagination.total_records} {t('serverActivities.events')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => fetchActivities()}
                        disabled={loading}
                        className="bg-background/50 backdrop-blur-md border-border/40 hover:bg-background/80"
                    >
                        <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                        {t('common.refresh')}
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder={t('serverActivities.searchPlaceholder')}
                        className="bg-background/40 backdrop-blur-md border-border/40 pl-12 h-14 text-lg rounded-2xl focus:ring-primary/20 focus:border-primary/50 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-64 flex gap-2">
                    <HeadlessSelect
                        value={selectedEventFilter}
                        onChange={(val: string | number) => {
                            setSelectedEventFilter(String(val))
                            setTimeout(() => fetchActivities(1), 0)
                        }}
                        options={filterOptions}
                        placeholder={t('serverActivities.events')}
                        buttonClassName="h-14 bg-background/40 backdrop-blur-md border-border/40 rounded-2xl text-lg px-6"
                    />
                    {(searchQuery || selectedEventFilter !== 'all') && (
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-14 w-14 rounded-2xl border-border/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
                            onClick={() => {
                                setSearchQuery('')
                                setSelectedEventFilter('all')
                                setTimeout(() => fetchActivities(1), 0)
                            }}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Activities List */}
            {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/10 rounded-[3rem] border border-dashed border-border/60 backdrop-blur-sm">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                            <Activity className="h-16 w-16 text-primary" />
                        </div>
                    </div>
                    <div className="max-w-md space-y-3">
                        <h2 className="text-3xl font-black">{t('serverActivities.noActivitiesFound')}</h2>
                        <p className="text-muted-foreground text-lg px-4">
                            {searchQuery || selectedEventFilter !== 'all' 
                                ? t('serverActivities.noActivitiesSearchDescription') 
                                : t('serverActivities.noActivitiesDescription')}
                        </p>
                    </div>
                    {(searchQuery || selectedEventFilter !== 'all') && (
                        <Button 
                            variant="outline" 
                            size="lg"
                            onClick={() => {
                                setSearchQuery('')
                                setSelectedEventFilter('all')
                                setTimeout(() => fetchActivities(1), 0)
                            }}
                            className="px-8 h-12 rounded-xl"
                        >
                            {t('common.clear')}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {activities.map((activity, index) => {
                        const Icon = getEventIcon(activity.event)
                        return (
                            <div 
                                key={activity.id}
                                onClick={() => {
                                    setSelectedItem(activity)
                                    setDetailsOpen(true)
                                }}
                                className="group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-md border border-border/40 hover:border-primary/40 hover:bg-card/50 transition-all duration-300 shadow-sm cursor-pointer"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                                    <div className={cn(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 shadow-inner",
                                        getEventIconClass(activity.event)
                                    )}>
                                        <Icon className="h-8 w-8" />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h3 className="text-xl font-bold truncate tracking-tight group-hover:text-primary transition-colors">{formatEvent(activity.event)}</h3>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40 shadow-sm">
                                                {activity.id}
                                            </span>
                                        </div>

                                        <p className="text-muted-foreground font-medium line-clamp-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {displayMessage(activity)}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 border-t border-border/10">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <User className="h-4 w-4 opacity-50" />
                                                <span className="text-sm font-bold uppercase tracking-tight">
                                                    {activity.user?.username || t('serverActivities.details.system')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock className="h-4 w-4 opacity-50" />
                                                <span className="text-sm font-semibold">
                                                    {activity.timestamp ? formatRelativeTime(activity.timestamp) : '-'}
                                                </span>
                                            </div>
                                            {activity.ip && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Globe className="h-4 w-4 opacity-50" />
                                                    <span className="text-xs font-mono font-bold opacity-60 italic">{activity.ip}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 md:self-center">
                                        <div className="h-12 w-12 rounded-xl group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-all flex items-center justify-center">
                                            <Eye className="h-6 w-6" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination.total_records > pagination.per_page && (
                <div className="flex items-center justify-between py-8 border-t border-border/40 px-6">
                    <p className="text-sm font-bold opacity-40 uppercase tracking-widest">
                        {t('serverActivities.pagination.showing', { 
                            from: String(pagination.from), 
                            to: String(pagination.to), 
                            total: String(pagination.total_records) 
                        })}
                    </p>
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={!pagination.has_prev || loading}
                            onClick={() => changePage(pagination.current_page - 1)}
                            className="h-10 w-10 p-0 rounded-xl"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <span className="h-10 px-4 rounded-xl text-sm font-black bg-primary/5 text-primary border border-primary/20 flex items-center justify-center min-w-12">
                            {pagination.current_page} / {pagination.total_pages}
                        </span>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={!pagination.has_next || loading}
                            onClick={() => changePage(pagination.current_page + 1)}
                            className="h-10 w-10 p-0 rounded-xl"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* DETAILS DIALOG */}
            <Dialog 
                open={detailsOpen} 
                onOpenChange={setDetailsOpen}
            >
                {selectedItem && (
                    <div className="space-y-8 p-6 max-w-[1200px] w-full">
                        <DialogHeader>
                            <div className="flex items-center gap-6">
                                <div className={cn(
                                    "h-20 w-20 rounded-4xl flex items-center justify-center border-4 shadow-2xl transition-transform group-hover:scale-105 group-hover:rotate-2 shrink-0",
                                    getEventIconClass(selectedItem.event)
                                )}>
                                    {React.createElement(getEventIcon(selectedItem.event), { className: "h-10 w-10" })}
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-3">
                                        <DialogTitle className="text-4xl font-black uppercase tracking-tighter leading-none">
                                            {formatEvent(selectedItem.event)}
                                        </DialogTitle>
                                        <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] bg-white/10 border border-white/5 opacity-40">
                                            #{selectedItem.id}
                                        </span>
                                    </div>
                                    <DialogDescription className="text-xl font-medium opacity-70 leading-relaxed max-w-4xl">
                                        {selectedItem.message || t('serverActivities.details.description')}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* Metadata Table */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                                        {t('serverActivities.details.metadataPayload')}
                                    </h3>
                                    <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">{detailsPairs.length} Keys found</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 shrink-0">
                                        <span className="text-[10px] font-black text-primary/50 uppercase tracking-widest">{t('serverActivities.details.executingUser')}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-primary/20 flex items-center justify-center font-black text-xs border border-primary/20">
                                                {selectedItem.user?.username?.substring(0, 2).toUpperCase() || 'S'}
                                            </div>
                                            <span className="text-lg font-bold truncate">{selectedItem.user?.username || t('serverActivities.details.system')}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 shrink-0">
                                        <span className="text-[10px] font-black text-primary/50 uppercase tracking-widest">{t('serverActivities.details.timestamp')}</span>
                                        <div className="flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-primary opacity-50" />
                                            <span className="text-lg font-bold">{selectedItem.timestamp ? new Date(selectedItem.timestamp).toLocaleString() : '-'}</span>
                                        </div>
                                    </div>
                                    {detailsPairs.map((pair) => (
                                        <div key={pair.key} className="flex flex-col gap-2 p-5 rounded-3xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                                            <span className="text-[10px] font-black text-primary/50 uppercase tracking-widest underline decoration-primary/20 decoration-2 underline-offset-4">{pair.key}</span>
                                            <span className="text-base font-mono font-bold break-all leading-tight opacity-90 group-hover:opacity-100">{pair.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Raw Logs */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary flex items-center gap-3">
                                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                                        {t('serverActivities.details.diagnosticOutput')}
                                    </h3>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-4 font-black uppercase tracking-wider bg-white/5 border border-white/5 opacity-40 hover:opacity-100 hover:bg-primary/20"
                                        onClick={() => {
                                            navigator.clipboard.writeText(rawJson)
                                            toast.success(t('serverActivities.details.payloadCopied'))
                                        }}
                                    >
                                        <Copy className="h-3.5 w-3.5 mr-2" />
                                        {t('serverActivities.details.copyPayload')}
                                    </Button>
                                </div>
                                <div className="relative group h-full">
                                    <pre className="h-full max-h-[600px] bg-black/40 text-emerald-400 p-8 rounded-4xl overflow-x-auto font-mono text-base border border-white/5 custom-scrollbar leading-relaxed backdrop-blur-3xl shadow-2xl">
                                        {rawJson || '// No additional metadata available'}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="border-t border-white/5 pt-8 mt-4 flex items-center justify-end">
                            <Button 
                                size="lg" 
                                className="px-12 h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20"
                                onClick={() => setDetailsOpen(false)}
                            >
                                {t('serverActivities.details.closeEntry')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>
        </div>
    )
}
