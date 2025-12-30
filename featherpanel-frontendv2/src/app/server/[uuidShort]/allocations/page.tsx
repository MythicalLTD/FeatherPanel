"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, usePathname } from "next/navigation"
import axios from "axios"
import { toast } from "sonner"
import { 
  Network, 
  Trash2, 
  Star, 
  Plus, 
  Search, 
  MoreVertical, 
  Copy, 
  RefreshCw, 
  AlertTriangle,
  Loader2,
  Check,
  Globe
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isEnabled } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useTranslation } from "@/contexts/TranslationContext"
import { useSettings } from "@/contexts/SettingsContext"
import { Server, AllocationItem, AllocationsResponse, AvailableAllocationsResponse } from "@/types/server"
import { copyToClipboard, cn } from "@/lib/utils"

export default function ServerAllocationsPage() {
  const { t } = useTranslation()
  const { settings, loading: settingsLoading } = useSettings()
  const params = useParams()
  const pathname = usePathname()
  const uuidShort = params.uuidShort as string

  // Permissions
  const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
  const canRead = hasPermission("allocation.read")
  const canCreate = hasPermission("allocation.create")
  const canUpdate = hasPermission("allocation.update")
  const canDelete = hasPermission("allocation.delete")

  // State
  const [server, setServer] = useState<Server | null>(null)
  const [allocations, setAllocations] = useState<AllocationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAutoAllocating, setIsAutoAllocating] = useState(false)
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAllocation, setSelectedAllocation] = useState<AllocationItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [primaryDialogOpen, setPrimaryDialogOpen] = useState(false)
  const [isSettingPrimary, setIsSettingPrimary] = useState(false)

  // Advanced Assign DB/Drawer states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [availableAllocations, setAvailableAllocations] = useState<AllocationItem[]>([])
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false)
  const [selectedAssignId, setSelectedAssignId] = useState<number | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  // Fetch allocations
  const fetchAllocations = useCallback(async () => {
    if (!uuidShort) return

    try {
      setLoading(true)
      const { data } = await axios.get<AllocationsResponse>(
        `/api/user/servers/${uuidShort}/allocations`
      )

      if (data.success) {
        setServer(data.data.server as unknown as Server)
        setAllocations(data.data.allocations)
      } else {
        toast.error(t("serverAllocations.failedToFetch"))
      }
    } catch (error) {
      console.error("Error fetching allocations:", error)
      toast.error(t("serverAllocations.failedToFetch"))
    } finally {
      setLoading(false)
    }
  }, [uuidShort, t])

  useEffect(() => {
    if (!permissionsLoading) {
      if (canRead) {
        fetchAllocations()
      } else {
        setLoading(false)
      }
    }
  }, [canRead, permissionsLoading, fetchAllocations])

  // Fetch Available Allocations (for advanced assignment)
  const fetchAvailableAllocations = async () => {
    try {
      setIsLoadingAvailable(true)
      const { data } = await axios.get<AvailableAllocationsResponse>(
        `/api/user/servers/${uuidShort}/allocations/available`
      )
      
      if (data.success) {
        // Handle different API response structures safely
        const items = data.data.allocations 
            ? data.data.allocations
            : (Array.isArray(data.data) ? data.data : []);
            
        setAvailableAllocations((items as AllocationItem[]) || []);
      } else {
        console.warn("Failed to fetch available allocations")
        setAvailableAllocations([])
      }
    } catch (error) {
      console.error("Error fetching available allocations:", error)
      setAvailableAllocations([])
    } finally {
      setIsLoadingAvailable(false)
    }
  }

  // Handle opening assign dialog
  const handleOpenAssign = () => {
    setAssignDialogOpen(true)
    fetchAvailableAllocations()
  }

  // Actions
  const handleAutoAllocate = async () => {
    try {
      setIsAutoAllocating(true)
      const { data } = await axios.post(`/api/user/servers/${uuidShort}/allocations/auto`)
      
      if (data.success) {
        toast.success(t("serverAllocations.autoAllocationCompleted"))
        fetchAllocations()
      } else {
        toast.error(data.message || t("serverAllocations.failedToAutoAllocate"))
      }
    } catch (error) {
      console.error("Error auto-allocating:", error)
      toast.error(t("serverAllocations.failedToAutoAllocate"))
    } finally {
      setIsAutoAllocating(false)
    }
  }

  const handleAssignAllocation = async () => {
    if (!selectedAssignId && !isAutoAllocating) return 

    try {
      setIsAssigning(true)
      const { data } = await axios.post(`/api/user/servers/${uuidShort}/allocations/auto`, {
        allocation_id: selectedAssignId
      })

      if (data.success) {
        toast.success(t("serverAllocations.allocationCreated"))
        fetchAllocations()
        setAssignDialogOpen(false)
        setSelectedAssignId(null)
      } else {
        toast.error(data.message || t("serverAllocations.failedToCreate"))
      }
    } catch (error) {
      console.error("Error assigning allocation:", error)
      toast.error(t("serverAllocations.failedToCreate"))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAllocation) return

    try {
      setIsDeleting(true)
      const { data } = await axios.delete(
        `/api/user/servers/${uuidShort}/allocations/${selectedAllocation.id}`
      )
      
      if (data.success) {
        toast.success(t("serverAllocations.allocationDeleted"))
        setAllocations(prev => prev.filter(a => a.id !== selectedAllocation.id))
        setDeleteDialogOpen(false)
        setSelectedAllocation(null)
        if (server) {
           setServer({...server, current_allocations: Math.max(0, (server.current_allocations || 1) - 1)})
        }
      } else {
        toast.error(data.message || t("serverAllocations.failedToDelete"))
      }
    } catch (error) {
      console.error("Error deleting allocation:", error)
      toast.error(t("serverAllocations.failedToDelete"))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSetPrimary = async () => {
    if (!selectedAllocation) return

    try {
      setIsSettingPrimary(true)
      const { data } = await axios.post(
        `/api/user/servers/${uuidShort}/allocations/${selectedAllocation.id}/primary`
      )
      
      if (data.success) {
        toast.success(t("serverAllocations.primaryUpdated"))
        setAllocations(prev => prev.map(a => ({
          ...a,
          is_primary: a.id === selectedAllocation.id
        })))
        if (server) {
          setServer({ ...server, primary_allocation_id: selectedAllocation.id })
        }
        setPrimaryDialogOpen(false)
        setSelectedAllocation(null)
      } else {
        toast.error(data.message || t("serverAllocations.failedToSetPrimary"))
      }
    } catch (error) {
      console.error("Error setting primary allocation:", error)
      toast.error(t("serverAllocations.failedToSetPrimary"))
    } finally {
      setIsSettingPrimary(false)
    }
  }

  const handleCopy = (text: string) => {
    copyToClipboard(text, t)
    toast.success(t("common.copiedToClipboard"))
  }

  // Filtering
  const filteredAllocations = allocations.filter(alloc => {
    const searchLower = searchQuery.toLowerCase()
    return (
      alloc.ip.toLowerCase().includes(searchLower) ||
      alloc.port.toString().includes(searchLower) ||
      (alloc.ip_alias?.toLowerCase().includes(searchLower)) ||
      (alloc.notes?.toLowerCase().includes(searchLower))
    )
  })

  // Permission check
  if (!permissionsLoading && !canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
        <div className="p-4 rounded-full bg-red-500/10 mb-4">
          <Network className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">{t("serverAllocations.noAllocationPermission")}</h2>
        <p className="text-muted-foreground max-w-md">
          {t("common.contactAdmin")}
        </p>
      </div>
    )
  }
  
  const limitReached = server && server.allocation_limit !== 0 && (server.current_allocations || 0) >= server.allocation_limit

  return (
    <div key={pathname} className="space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header Section Matches Backups/Databases */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight uppercase">{t("serverAllocations.title")}</h1>
          <div className="flex items-center gap-3 text-muted-foreground">
            <p className="text-lg opacity-80">{t("serverAllocations.description")}</p>
            {server && (
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20">
                {server.current_allocations || allocations.length} / {server.allocation_limit === 0 ? "∞" : server.allocation_limit}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <Button 
                variant="outline" 
                size="lg" 
                onClick={() => fetchAllocations()}
                disabled={loading}
                className="bg-background/50 backdrop-blur-md border-border/40 hover:bg-background/80"
            >
                <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                {t('serverAllocations.refresh')}
            </Button>

            {canCreate && (
                <>
                   {isEnabled(settings?.server_allow_allocation_select) && (
                     <Button 
                       variant="outline"
                       size="lg"
                       onClick={handleOpenAssign}
                       disabled={limitReached || isAutoAllocating || loading || settingsLoading}
                       className="bg-background/50 backdrop-blur-md border-border/40 hover:bg-background/80"
                     >
                       <Plus className="mr-2 h-5 w-5" />
                       {t("serverAllocations.assignAllocation")}
                     </Button>
                   )}
                   <Button 
                     size="lg"
                     onClick={handleAutoAllocate}
                     disabled={limitReached || isAutoAllocating || loading}
                     className="shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
                   >
                     {isAutoAllocating ? (
                       <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                     ) : (
                       <RefreshCw className="mr-2 h-5 w-5" />
                     )}
                     {t("serverAllocations.autoAllocate")}
                   </Button>
                </>
            )}
        </div>
      </div>

      {/* Limit Reached Warning */}
      {limitReached && (
        <div className="relative overflow-hidden p-6 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 backdrop-blur-xl animate-in slide-in-from-top duration-500">
            <div className="relative z-10 flex items-start gap-5">
                <div className="h-12 w-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-yellow-500 leading-none">{t('serverAllocations.limitReached')}</h3>
                    <p className="text-sm text-yellow-500/80 leading-relaxed font-medium">
                        {t('serverAllocations.allocationStatusDescription', { 
                            current: String(server?.current_allocations ?? allocations.length), 
                            limit: String(server?.allocation_limit) 
                        })}
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
                    placeholder={t("serverAllocations.searchAllocations")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background/40 backdrop-blur-md border-border/40 pl-12 h-14 text-lg rounded-2xl focus:ring-primary/20 focus:border-primary/50 transition-all"
                />
            </div>
        </div>

        {permissionsLoading || loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[1, 2, 3, 4, 5, 6].map((i) => (
                 <div key={i} className="h-40 rounded-3xl bg-card/20 animate-pulse" />
               ))}
            </div>
        ) : allocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/10 rounded-[3rem] border border-dashed border-border/60 backdrop-blur-sm">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                        <Network className="h-16 w-16 text-primary" />
                    </div>
                </div>
                <div className="max-w-md space-y-3">
                    <h2 className="text-3xl font-black">{t("serverAllocations.noAllocationsFound")}</h2>
                    <p className="text-muted-foreground text-lg px-4">
                        {t("serverAllocations.noAllocationsDescription")}
                    </p>
                </div>
                {canCreate && !limitReached && (
                    <Button 
                         size="lg"
                         onClick={handleAutoAllocate}
                         className="shadow-xl shadow-primary/20 hover:shadow-primary/30"
                    >
                         {t("serverAllocations.createFirstAllocation")}
                    </Button>
                )}
            </div>
        ) : (
             <div className="grid grid-cols-1 gap-4">
                {filteredAllocations.map((allocation) => (
                  <div 
                    key={allocation.id} 
                    className={cn(
                        "group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-md border border-border/40 transition-all duration-300 shadow-sm",
                        "hover:border-primary/40 hover:bg-card/50 hover:shadow-lg hover:shadow-primary/5",
                        allocation.is_primary && "bg-primary/5 border-primary/20"
                    )}
                  >
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-6">
                        {/* Icon */}
                        <div className={cn(
                            "h-16 w-16 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2",
                            allocation.is_primary ? "bg-primary/20 border-primary/30" : "bg-card/40 border-border/60"
                        )}>
                            <Globe className={cn(
                                "h-8 w-8",
                                allocation.is_primary ? "text-primary" : "text-muted-foreground"
                            )} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                             <div className="flex flex-wrap items-center gap-3">
                                 <h3 className="text-xl font-bold tracking-tight font-mono break-all">
                                    {allocation.ip_alias || allocation.ip}:{allocation.port}
                                 </h3>
                                 {allocation.is_primary && (
                                     <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest leading-none px-3 py-1">
                                         {t("serverAllocations.primary")}
                                     </Badge>
                                 )}
                             </div>

                             <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <div className="flex items-center gap-2 text-muted-foreground p-1 px-2 rounded-lg bg-black/10 border border-white/5">
                                     <span className="text-xs font-bold uppercase opacity-60">IP</span>
                                     <span className="text-sm font-mono font-bold text-foreground/80">{allocation.ip}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-muted-foreground p-1 px-2 rounded-lg bg-black/10 border border-white/5">
                                     <span className="text-xs font-bold uppercase opacity-60">Port</span>
                                      <span className="text-sm font-mono font-bold text-foreground/80">{allocation.port}</span>
                                 </div>
                                 {allocation.notes && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <div className="w-1 h-1 rounded-full bg-white/20" />
                                        <span className="text-sm italic opacity-70">&quot;{allocation.notes}&quot;</span>
                                    </div>
                                 )}
                             </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 sm:self-center">
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => handleCopy(`${allocation.ip}:${allocation.port}`)}
                                className="h-12 px-6 rounded-xl font-bold shadow-lg shadow-black/5 bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/10"
                            >
                                <Copy className="mr-2 h-4 w-4" />
                                {t("common.copy")}
                            </Button>

                            {!allocation.is_primary && (canUpdate || canDelete) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="h-12 w-12 flex items-center justify-center rounded-xl bg-card/40 border border-white/5 hover:bg-white/10 transition-all outline-none group-hover:bg-card/60">
                                    <MoreVertical className="h-6 w-6 text-muted-foreground" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-card/90 backdrop-blur-xl border-border/40 p-2 rounded-2xl shadow-2xl">
                                    {canUpdate && (
                                        <DropdownMenuItem 
                                            onClick={() => {
                                              setSelectedAllocation(allocation)
                                              setPrimaryDialogOpen(true)
                                            }}
                                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                                        >
                                            <Star className="h-4 w-4 text-yellow-400" />
                                            <span className="font-bold">{t("serverAllocations.setPrimary")}</span>
                                        </DropdownMenuItem>
                                    )}
                                    
                                    {canDelete && (
                                         <>
                                           {canUpdate && <DropdownMenuSeparator className="bg-border/40 my-1" />}
                                           <DropdownMenuItem 
                                             onClick={() => {
                                               setSelectedAllocation(allocation)
                                               setDeleteDialogOpen(true)
                                             }}
                                             className="flex items-center gap-3 p-3 rounded-xl cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                           >
                                             <Trash2 className="h-4 w-4" />
                                             <span className="font-bold">{t("common.delete")}</span>
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

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden bg-card/90 backdrop-blur-2xl border-white/10 sm:rounded-3xl">
            <div className="p-6 space-y-6">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-inner">
                             <Trash2 className="h-6 w-6 text-red-500" />
                         </div>
                         <div className="space-y-0.5">
                              <DialogTitle className="text-xl font-bold leading-none">{t("serverAllocations.confirmDeleteTitle")}</DialogTitle>
                              <DialogDescription className="text-sm opacity-70">
                                {t("serverAllocations.confirmDeleteDescription")}
                              </DialogDescription>
                         </div>
                    </div>
                </DialogHeader>

                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between font-mono text-sm">
                        <span>{selectedAllocation?.ip}:{selectedAllocation?.port}</span>
                    </div>
                </div>

                <DialogFooter className="">
                    <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="h-12 flex-1 font-bold rounded-xl">
                      {t("common.cancel")}
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="h-12 flex-1 shadow-xl shadow-red-500/20 rounded-xl font-bold"
                    >
                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("serverAllocations.confirmDelete")}
                    </Button>
                </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Set Primary Dialog */}
        <Dialog open={primaryDialogOpen} onOpenChange={setPrimaryDialogOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden bg-card/90 backdrop-blur-2xl border-white/10 sm:rounded-3xl">
            <div className="p-6 space-y-6">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-inner">
                             <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                         </div>
                         <div className="space-y-0.5">
                              <DialogTitle className="text-xl font-bold leading-none">{t("serverAllocations.confirmSetPrimaryTitle")}</DialogTitle>
                              <DialogDescription className="text-sm opacity-70">
                                {t("serverAllocations.confirmSetPrimaryDescription")}
                              </DialogDescription>
                         </div>
                    </div>
                </DialogHeader>

                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">
                      {selectedAllocation?.ip}:{selectedAllocation?.port}
                    </span>
                    <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">New Primary</Badge>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setPrimaryDialogOpen(false)} className="h-12 flex-1 font-bold rounded-xl">
                      {t("common.cancel")}
                    </Button>
                    <Button 
                      onClick={handleSetPrimary}
                      disabled={isSettingPrimary}
                      className="h-12 flex-1 shadow-xl shadow-primary/20 rounded-xl font-bold"
                    >
                      {isSettingPrimary && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("serverAllocations.confirmSetPrimary")}
                    </Button>
                </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Allocation Dialog/Drawer */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-lg p-0 overflow-hidden bg-card/90 backdrop-blur-2xl border-white/10 sm:rounded-3xl">
             <div className="p-6 space-y-6">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                             <Plus className="h-6 w-6 text-primary" />
                         </div>
                         <div className="space-y-0.5">
                              <DialogTitle className="text-xl font-bold leading-none">{t("serverAllocations.assignAllocation")}</DialogTitle>
                              <DialogDescription className="text-sm opacity-70">
                                {t("serverAllocations.selectAllocationDescription")}
                              </DialogDescription>
                         </div>
                    </div>
                </DialogHeader>
              
              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {isLoadingAvailable ? (
                   <div className="flex justify-center py-12">
                     <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                   </div>
                ) : availableAllocations.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
                     <p className="text-muted-foreground font-medium">{t("serverAllocations.noAvailableAllocations")}</p>
                   </div>
                ) : (
                   availableAllocations.map(item => (
                     <div 
                       key={item.id}
                       className={cn(
                         "p-4 rounded-2xl border cursor-pointer flex justify-between items-center transition-all duration-200",
                         selectedAssignId === item.id 
                           ? "bg-primary/10 border-primary/50 shadow-[0_0_20px_rgba(var(--primary),0.2)] scale-[1.02]" 
                           : "bg-black/20 border-white/5 hover:bg-black/40 hover:border-white/10"
                       )}
                       onClick={() => setSelectedAssignId(item.id)}
                     >
                        <div className="flex items-center gap-4">
                           <div className={cn(
                               "h-10 w-10 rounded-xl flex items-center justify-center border transition-colors",
                               selectedAssignId === item.id ? "bg-primary/20 border-primary/30" : "bg-white/5 border-white/5"
                           )}>
                               <Network className={cn("h-5 w-5", selectedAssignId === item.id ? "text-primary" : "text-muted-foreground")} />
                           </div>
                           <div className="flex flex-col">
                               <span className="font-mono text-sm font-bold tracking-tight">{item.ip}:{item.port}</span>
                               <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.ip_alias || "No Alias"}</span>
                           </div>
                        </div>
                        {selectedAssignId === item.id && (
                           <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transform scale-100 transition-transform">
                               <Check className="h-5 w-5" />
                           </div>
                        )}
                     </div>
                   ))
                )}
              </div>

              <DialogFooter className="border-t border-border/40 pt-4">
                 <Button variant="ghost" onClick={() => setAssignDialogOpen(false)} className="h-12 flex-1 font-bold rounded-xl">
                  {t("common.cancel")}
                </Button>
                <Button 
                   onClick={handleAssignAllocation}
                   disabled={isAssigning || !selectedAssignId}
                   className="h-12 flex-1 shadow-xl shadow-primary/20 rounded-xl font-bold"
                >
                  {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("serverAllocations.assignAllocation")}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
