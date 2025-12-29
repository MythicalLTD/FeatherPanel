'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useTranslation } from '@/contexts/TranslationContext'
import { useServerPermissions } from '@/hooks/useServerPermissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
// Use HeadlessSelect instead of ShadCN Select
import { HeadlessSelect } from '@/components/ui/headless-select'
import {
    Avatar,
    AvatarImage,
    AvatarFallback
} from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
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
    Terminal,
    FileText,
    Server,
    Database,
    Users,
    Settings,
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
    Hash,
    User,
    Globe
} from 'lucide-react'
import { toast } from 'sonner'


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

    const fetchActivities = async (page = 1) => {
        try {
            setLoading(true)
            const params: Record<string, string | number> = {
                page,
                per_page: pagination.per_page,
            }
            if (searchQuery.trim()) {
                params.search = searchQuery.trim()
            }

            const { data } = await axios.get(`/api/user/servers/${uuidShort}/activities`, { params })

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
            setPagination({
                current_page: p.current_page || 1,
                per_page: p.per_page || 10,
                total_records: p.total || p.total_records || 0,
                total_pages: p.total_pages || p.last_page || 1,
                has_next: (p.current_page || 1) < (p.total_pages || p.last_page || 1),
                has_prev: (p.current_page || 1) > 1,
                from: p.from || 0,
                to: p.to || 0,
            })

        } catch (error) {
           console.error(error)
           toast.error(t('serverActivities.failedToFetch'))
        } finally {
            setLoading(false)
        }
    }

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!loading) { // Avoid initial double fetch
                fetchActivities(1)
            }
        }, 500)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery])

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuidShort, permissionsLoading, hasPermission])

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
        if (['setting', 'updated'].some(x => eventLower.includes(x))) return Edit
        if (['delete', 'deleted'].some(x => eventLower.includes(x))) return Trash2
        if (eventLower.includes('lock')) return Lock
        if (eventLower.includes('unlock')) return Unlock
        return Server
    }

    function getEventIconClass(event: string) {
        const eventLower = event.toLowerCase()
        if (eventLower.includes('backup')) return 'text-blue-500 bg-blue-500/5'
        if (['start', 'play'].some(x => eventLower.includes(x))) return 'text-green-500 bg-green-500/5'
        if (['stop', 'kill'].some(x => eventLower.includes(x))) return 'text-red-500 bg-red-500/5'
        if (eventLower.includes('restart')) return 'text-yellow-500 bg-yellow-500/5'
        if (eventLower.includes('power')) return 'text-green-500 bg-green-500/5'
        if (eventLower.includes('file')) return 'text-orange-500 bg-orange-500/5'
        if (eventLower.includes('database')) return 'text-indigo-500 bg-indigo-500/5'
        if (eventLower.includes('schedule')) return 'text-purple-500 bg-purple-500/5'
        if (eventLower.includes('task')) return 'text-pink-500 bg-pink-500/5'
        if (['subuser', 'user'].some(x => eventLower.includes(x))) return 'text-cyan-500 bg-cyan-500/5'
        if (eventLower.includes('allocation')) return 'text-emerald-500 bg-emerald-500/5'
        if (eventLower.includes('delete')) return 'text-red-500 bg-red-500/5'
        if (eventLower.includes('lock')) return 'text-amber-500 bg-amber-500/5'
        if (eventLower.includes('unlock')) return 'text-emerald-500 bg-emerald-500/5'
        return 'text-primary bg-primary/5'
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

    // Prepare events for select
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

    return (
        <div className="space-y-6 pb-20">
            {/* Header Section */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                            {t('serverActivities.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground/80 font-medium">
                            {t('serverActivities.description')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                            <Activity className="h-3.5 w-3.5" />
                            <span>{pagination.total_records} {t('serverActivities.events')}</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() => fetchActivities(pagination.current_page)}
                            className="h-9 px-4 border-border/40 hover:bg-secondary/80 bg-background/50 backdrop-blur-sm transition-all"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('common.refresh')}
                        </Button>
                    </div>
                </div>

                {/* Filter Bar - Floating Glass Design */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 transition-colors group-hover:text-primary/60" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('serverActivities.searchPlaceholder')}
                            disabled={loading}
                            className="pl-10 h-11 bg-card/40 border-border/40 hover:border-primary/30 hover:bg-card/60 focus:bg-card/80 transition-all rounded-xl shadow-sm backdrop-blur-sm"
                        />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="w-full sm:w-56">
                            <HeadlessSelect
                                value={selectedEventFilter}
                                onChange={(val: string | number) => {
                                    setSelectedEventFilter(String(val))
                                    setTimeout(() => fetchActivities(1), 0)
                                }}
                                options={filterOptions}
                                placeholder={t('serverActivities.events')}
                                className="h-11 mt-0"
                                buttonClassName="h-11 bg-card/40 border-border/40 hover:border-primary/30 hover:bg-card/60 rounded-xl shadow-sm backdrop-blur-sm"
                            />
                        </div>
                        { (searchQuery || selectedEventFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 rounded-xl border border-dashed border-border/40 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-all"
                                onClick={() => {
                                    setSearchQuery('')
                                    setSelectedEventFilter('all')
                                    setTimeout(() => fetchActivities(1), 0)
                                }}
                                title={t('common.clear')}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            {loading && activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
                     <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                        <div className="relative bg-background rounded-full p-4 border border-border/50 shadow-lg">
                            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                        </div>
                     </div>
                     <span className="mt-6 text-sm font-medium text-muted-foreground animate-pulse">{t('common.loading')}</span>
                </div>
            ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/40 rounded-2xl bg-card/20">
                    <div className="bg-secondary/50 p-6 rounded-full mb-4 ring-1 ring-border/50">
                        <Activity className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground/80">{t('serverActivities.noActivitiesFound')}</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                        {searchQuery || selectedEventFilter !== 'all' 
                            ? t('serverActivities.noActivitiesSearchDescription') 
                            : t('serverActivities.noActivitiesDescription')}
                    </p>
                    {(searchQuery || selectedEventFilter !== 'all') && (
                        <Button 
                            variant="ghost" 
                            onClick={() => {
                                setSearchQuery('')
                                setSelectedEventFilter('all')
                                setTimeout(() => fetchActivities(1), 0)
                            }}
                            className="mt-4 text-primary hover:bg-primary/5 underline-offset-4 hover:underline"
                        >
                            {t('common.clear')}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {activities.map((activity, index) => {
                        const Icon = getEventIcon(activity.event)
                        return (
                            <div 
                                key={activity.id} 
                                className="group relative flex items-start sm:items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/20 hover:bg-card/40 hover:border-border/60 transition-all duration-300"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Icon */}
                                <div className={`shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-colors ${getEventIconClass(activity.event)} bg-opacity-10`}>
                                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-sm sm:text-base text-foreground/90 group-hover:text-primary transition-colors">
                                                {formatEvent(activity.event)}
                                            </h3>
                                        </div>
                                        <p className="text-sm text-muted-foreground/70 line-clamp-1 font-medium">
                                            {displayMessage(activity)}
                                        </p>
                                        
                                        {/* Mobile Metadata Row */}
                                        <div className="flex sm:hidden items-center gap-3 text-xs text-muted-foreground/60 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3 w-3" />
                                                <span>{activity.timestamp ? formatRelativeTime(activity.timestamp) : ''}</span>
                                            </div>
                                            <div className="w-0.5 h-0.5 rounded-full bg-border"></div>
                                            {activity.user ? (
                                                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{activity.user.username}</span>
                                            ) : (
                                                <span className="text-sm font-bold text-muted-foreground/60 italic">{t('serverActivities.details.system')}</span>
                                            )}
                                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{t('serverActivities.details.executingUser')}</span>
                                        </div>
                                    </div>

                                    {/* Desktop Metadata & Actions */}
                                    <div className="hidden sm:flex items-center gap-6 justify-end">
                                        {/* User Info */}
                                        <div className="flex flex-col items-end gap-0.5 text-right min-w-[100px]">
                                            {activity.user ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-foreground/80">{activity.user.username}</span>
                                                        <Avatar className="h-5 w-5 border border-border/50">
                                                            <AvatarImage src={activity.user.avatar || undefined} alt={activity.user.username} />
                                                            <AvatarFallback className="text-[9px] bg-secondary text-secondary-foreground">{activity.user.username.substring(0,2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                                                    <Server className="h-3.5 w-3.5" />
                                                    <span className="text-xs font-medium italic">{t('serverActivities.details.system')}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Time */}
                                        <div className="flex flex-col items-end min-w-[100px]">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-medium">
                                                <Clock className="h-3 w-3" />
                                                {activity.timestamp ? formatRelativeTime(activity.timestamp) : ''}
                                            </div>
                                        </div>

                                        {/* View Button */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setSelectedItem(activity)
                                                setDetailsOpen(true)
                                            }}
                                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300"
                                        >
                                            <Eye className="h-4 w-4" />
                                            <span className="sr-only">{t('serverActivities.viewDetails')}</span>
                                        </Button>
                                    </div>
                                </div>
                                
                                {/* Mobile Click Target overlay for easier tapping */}
                                <div 
                                    className="sm:hidden absolute inset-0 z-10 block"
                                    onClick={() => {
                                        setSelectedItem(activity)
                                        setDetailsOpen(true)
                                    }}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination footer */}
            {activities.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t border-dashed border-border/40">
                    <p className="text-xs text-muted-foreground font-medium">
                        {t('serverActivities.pagination.showing', { from: String(pagination.from), to: String(pagination.to), total: String(pagination.total_records) })}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.has_prev || loading}
                            onClick={() => changePage(pagination.current_page - 1)}
                            className="h-8 px-3 border-border/40 bg-transparent hover:bg-secondary/50 text-xs gap-1"
                        >
                            <ChevronLeft className="h-3 w-3" />
                            {t('serverActivities.pagination.prev')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!pagination.has_next || loading}
                            onClick={() => changePage(pagination.current_page + 1)}
                            className="h-8 px-3 border-border/40 bg-transparent hover:bg-secondary/50 text-xs gap-1"
                        >
                            {t('serverActivities.pagination.next')}
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Details Dialog - High Contrast & Ultra Wide */}
            <Dialog 
                open={detailsOpen} 
                onOpenChange={setDetailsOpen}
                className="max-w-[1400px] w-[95vw]"
            >
                <DialogContent className="overflow-hidden flex flex-col p-10 gap-10 border-border/40 bg-background/95 backdrop-blur-3xl shadow-2xl rounded-2xl">
                    <DialogHeader className="space-y-6 pb-0 border-b-0">
                        <DialogTitle className="flex items-center gap-6 text-3xl">
                            {selectedItem && (
                                <div className={`p-3.5 rounded-2xl ${getEventIconClass(selectedItem.event)} ring-2 ring-primary/20`}>
                                    {React.createElement(getEventIcon(selectedItem.event), { className: "h-8 w-8" })}
                                </div>
                            )}
                            <span className="font-extrabold tracking-tight text-white">{selectedItem ? formatEvent(selectedItem.event) : t('serverActivities.details.title')}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xl text-muted-foreground/90 pl-1 leading-relaxed max-w-4xl">
                            {selectedItem?.message || t('serverActivities.details.description')}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedItem && (
                        <div className="flex-1 space-y-12">
                            {/* Key Info Row - High Contrast */}
                            <div className="flex flex-wrap items-center gap-x-16 gap-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40">
                                        <Clock className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{t('serverActivities.details.timestamp')}</span>
                                        <span className="text-xl font-bold text-white mt-1">{selectedItem.timestamp ? new Date(selectedItem.timestamp).toLocaleString() : '-'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40">
                                        <User className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{t('serverActivities.details.executingUser')}</span>
                                        <span className="text-xl font-bold text-white mt-1">{selectedItem.user?.username || t('serverActivities.details.system')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40">
                                        <Globe className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{t('serverActivities.details.originIp')}</span>
                                        <span className="text-xl font-black font-mono text-white mt-1">{selectedItem.ip || t('serverActivities.details.localConsole')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-secondary/50 border border-border/40">
                                        <Hash className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">{t('serverActivities.details.entryId')}</span>
                                        <span className="text-xl font-black font-mono text-white mt-1">#{selectedItem.id}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Section - Ultra High Contrast */}
                            {detailsPairs.length > 0 && (
                                <div className="space-y-8">
                                    <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                                        <Settings className="h-6 w-6 text-primary" />
                                        <h4 className="text-xl font-black uppercase tracking-widest text-white">{t('serverActivities.details.metadataPayload')}</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {detailsPairs.map((pair) => (
                                            <div key={pair.key} className="flex flex-col gap-2 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-white/10 transition-all group">
                                                <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest">{pair.key}</span>
                                                <span className="text-lg text-white font-mono break-all leading-tight">{pair.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                             {/* Raw JSON - Massive Code Block */}
                             <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Terminal className="h-6 w-6 text-primary" />
                                        <h4 className="text-xl font-black uppercase tracking-widest text-white">{t('serverActivities.details.diagnosticOutput')}</h4>
                                    </div>
                                    <Button variant="outline" size="sm" className="h-10 px-6 font-black uppercase tracking-wider border-border/40 hover:border-primary text-xs" onClick={() => {
                                        navigator.clipboard.writeText(rawJson)
                                        toast.success(t('serverActivities.details.payloadCopied'))
                                    }}>
                                        <Copy className="h-4 w-4 mr-2" /> {t('serverActivities.details.copyPayload')}
                                    </Button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-3xl -z-10 group-hover:bg-primary/10 transition-colors"></div>
                                    <pre className="bg-black/60 text-emerald-400 p-8 rounded-3xl overflow-x-auto font-mono text-base border border-white/10 max-h-[500px] custom-scrollbar transition-all hover:bg-black/80 hover:border-primary/30 shadow-2xl leading-relaxed">
                                        {rawJson}
                                    </pre>
                                </div>
                             </div>
                        </div>
                    )}
                    
                    <DialogFooter className="pt-4 mt-0 border-t border-border/40">
                        <Button 
                            variant="default" 
                            onClick={() => setDetailsOpen(false)} 
                            className="w-full sm:w-auto h-12 px-10 text-base font-black uppercase tracking-widest shadow-primary/20"
                        >
                            {t('serverActivities.details.closeEntry')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
