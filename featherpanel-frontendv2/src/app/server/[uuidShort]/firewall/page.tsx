"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useTranslation } from "@/contexts/TranslationContext"
import { useSettings } from "@/contexts/SettingsContext"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HeadlessSelect } from "@/components/ui/headless-select"
import { HeadlessModal } from "@/components/ui/headless-modal"
import { 
    Info, 
    Shield, 
    RefreshCw, 
    Plus, 
    Pencil, 
    Trash2, 
    Loader2
} from "lucide-react"
import { cn, isEnabled } from "@/lib/utils"
import axios from "axios"
import { toast } from "sonner"
import type { 
    FirewallRule, 
    CreateFirewallRuleRequest, 
    FirewallRulesResponse,
    AllocationItem,
    AllocationsResponse
} from "@/types/server"

export default function ServerFirewallPage() {
  const params = useParams()
  const uuidShort = params.uuidShort as string
  const { t } = useTranslation()
  const { settings, loading: settingsLoading } = useSettings()
  
  // Permissions
  const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
  const canRead = hasPermission("allocation.read") || hasPermission("firewall.read")
  const canManage = hasPermission("allocation.update") || hasPermission("firewall.manage")

  // State
  const [rules, setRules] = React.useState<FirewallRule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [allocations, setAllocations] = React.useState<AllocationItem[]>([])
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [currentRule, setCurrentRule] = React.useState<FirewallRule | null>(null)
  
  // Form State
  const [formData, setFormData] = React.useState<CreateFirewallRuleRequest>({
      remote_ip: "",
      server_port: 0,
      priority: 1,
      type: "allow",
      protocol: "tcp"
  })
  const [selectedAllocationId, setSelectedAllocationId] = React.useState<string>("")
  const [saving, setSaving] = React.useState(false)
  
  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [ruleToDelete, setRuleToDelete] = React.useState<FirewallRule | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // Feature Flag
  const firewallEnabled = isEnabled(settings?.server_allow_user_made_firewall)

  const fetchAllocations = React.useCallback(async () => {
    if (!uuidShort) return
    try {
        const { data } = await axios.get<AllocationsResponse>(`/api/user/servers/${uuidShort}/allocations`)
        if (data.success) {
            setAllocations(data.data.allocations || [])
        }
    } catch (error) {
        console.error("Failed to fetch allocations:", error)
    }
  }, [uuidShort])

  const fetchRules = React.useCallback(async () => {
    if (!uuidShort || !firewallEnabled) return
    
    setLoading(true)
    try {
        const { data } = await axios.get<FirewallRulesResponse>(`/api/user/servers/${uuidShort}/firewall`)
        if (data.success) {
            setRules(data.data.data || [])
        }
    } catch (error) {
        console.error("Failed to fetch firewall rules:", error)
        toast.error(t("serverFirewall.fetchError"))
    } finally {
        setLoading(false)
    }
  }, [uuidShort, firewallEnabled, t])

  React.useEffect(() => {
    if (!settingsLoading && !permissionsLoading) {
        if (firewallEnabled && canRead) {
            fetchRules()
            fetchAllocations()
        } else {
            setLoading(false)
        }
    }
  }, [settingsLoading, permissionsLoading, firewallEnabled, canRead, fetchRules, fetchAllocations])

  // Helpers
  const sortedRules = React.useMemo(() => {
    return [...rules].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return b.id - a.id
    })
  }, [rules])

  const openCreateModal = () => {
    setIsEditing(false)
    setCurrentRule(null)
    
    // Default to first allocation if available
    let defaultPort = 0
    let defaultAllocId = ""
    
    if (allocations.length > 0) {
        const primary = allocations.find(a => a.is_primary)
        if (primary) {
            defaultPort = primary.port
            defaultAllocId = primary.id.toString()
        } else {
            defaultPort = allocations[0].port
            defaultAllocId = allocations[0].id.toString()
        }
    }

    setFormData({
        remote_ip: "",
        server_port: defaultPort,
        priority: 1,
        type: "allow",
        protocol: "tcp"
    })
    setSelectedAllocationId(defaultAllocId)
    setIsModalOpen(true)
  }

  const openEditModal = (rule: FirewallRule) => {
    setIsEditing(true)
    setCurrentRule(rule)
    setFormData({
        remote_ip: rule.remote_ip,
        server_port: rule.server_port,
        priority: rule.priority,
        type: rule.type,
        protocol: rule.protocol
    })
    
    // Find matching allocation for the port
    const matchingAlloc = allocations.find(a => a.port === rule.server_port)
    setSelectedAllocationId(matchingAlloc ? matchingAlloc.id.toString() : "")
    
    setIsModalOpen(true)
  }

  const handleAllocationChange = (value: string | number) => {
    const valString = value.toString()
    setSelectedAllocationId(valString)
    const alloc = allocations.find(a => a.id.toString() === valString)
    if (alloc) {
        setFormData(prev => ({ ...prev, server_port: alloc.port }))
    }
  }

  const handleSave = async () => {
    if (!formData.remote_ip) {
        toast.error(t("serverFirewall.validation.remoteIpRequired"))
        return
    }

    setSaving(true)
    try {
        if (isEditing && currentRule) {
            const { data } = await axios.put<{ success: boolean; data: { data: FirewallRule }; message?: string }>(
                `/api/user/servers/${uuidShort}/firewall/${currentRule.id}`,
                formData
            )
            if (data.success) {
                toast.success(t("serverFirewall.updateSuccess"))
                setRules(prev => prev.map(r => r.id === currentRule.id ? data.data.data : r))
                setIsModalOpen(false)
            } else {
                toast.error(data.message || t("serverFirewall.unknownError"))
            }
        } else {
            const { data } = await axios.post<{ success: boolean; data: { data: FirewallRule }; message?: string }>(
                `/api/user/servers/${uuidShort}/firewall`,
                formData
            )
            if (data.success) {
                toast.success(t("serverFirewall.createSuccess"))
                setRules(prev => [...prev, data.data.data])
                setIsModalOpen(false)
            } else {
                toast.error(data.message || t("serverFirewall.unknownError"))
            }
        }
    } catch (error) {
        console.error("Failed to save rule:", error)
        toast.error(t("serverFirewall.unknownError"))
    } finally {
        setSaving(false)
    }
  }

  const promptDelete = (rule: FirewallRule) => {
      setRuleToDelete(rule)
      setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
      if (!ruleToDelete) return
      
      setDeleting(true)
      try {
          const { data } = await axios.delete(
              `/api/user/servers/${uuidShort}/firewall/${ruleToDelete.id}`
          )
          
          if (data.success) {
              toast.success(t("serverFirewall.deleteSuccess"))
              setRules(prev => prev.filter(r => r.id !== ruleToDelete.id))
              setDeleteDialogOpen(false)
              setRuleToDelete(null)
          } else {
              toast.error(data.message || t("serverFirewall.unknownError"))
          }
      } catch (error) {
          console.error("Failed to delete rule:", error)
          toast.error(t("serverFirewall.unknownError"))
      } finally {
          setDeleting(false)
      }
  }

  // Options helpers
  const allocationOptions = React.useMemo(() => 
      allocations.map(a => ({
          id: a.id.toString(),
          name: `${a.ip}:${a.port} ${a.is_primary ? `(${t("serverAllocations.primary")})` : ''}`
      })),
  [allocations, t])

  const typeOptions = [
      { id: "allow", name: t("serverFirewall.allow") },
      { id: "block", name: t("serverFirewall.block") }
  ]

  const protocolOptions = [
      { id: "tcp", name: "TCP" },
      { id: "udp", name: "UDP" }
  ]

    if (permissionsLoading || settingsLoading) return null
    
    if (!canRead) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                    <Shield className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{t("common.accessDenied")}</h1>
                <p className="text-muted-foreground mt-2">{t("common.noPermission")}</p>
                <Button variant="outline" className="mt-8" onClick={() => window.history.back()}>
                    {t("common.goBack")}
                </Button>
            </div>
        )
    }

    if (!firewallEnabled) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3">
                        <Shield className="h-16 w-16 text-red-500" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t("serverFirewall.featureDisabled")}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {t("serverFirewall.featureDisabledDescription")}
                    </p>
                </div>
                <Button variant="outline" size="lg" className="mt-8 rounded-2xl h-14 px-10" onClick={() => window.history.back()}>
                    {t("common.goBack")}
                </Button>
            </div>
        )
    }

  if (loading && rules.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-24">
              <div className="relative">
                  <div className="absolute inset-0 animate-ping opacity-20">
                      <div className="w-16 h-16 rounded-full bg-primary/20" />
                  </div>
                  <div className="relative p-4 rounded-full bg-primary/10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              </div>
              <span className="mt-4 text-muted-foreground animate-pulse">{t("common.loading")}...</span>
          </div>
      )
  }

  return (

    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight uppercase">{t("serverFirewall.title")}</h1>
                <div className="flex items-center gap-3 text-muted-foreground">
                    <p className="text-lg opacity-80">{t("serverFirewall.description")}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <Button 
                    variant="outline" 
                    size="lg" 
                    onClick={fetchRules} 
                    disabled={loading} 
                    className="bg-background/50 backdrop-blur-md border-border/40 hover:bg-background/80"
                >
                    <RefreshCw className={cn("h-5 w-5 mr-2", loading && "animate-spin")} />
                    {t("serverFirewall.refresh")}
                </Button>
                
                {canManage && firewallEnabled && (
                    <Button 
                        size="lg" 
                        onClick={openCreateModal} 
                        disabled={loading || allocations.length === 0}
                        className="shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all h-14"
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        {t("serverFirewall.createRule")}
                    </Button>
                )}
            </div>
        </div>

        {/* Info Alert */}
        <div className="relative overflow-hidden p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl animate-in slide-in-from-top duration-500 shadow-sm">
            <div className="relative z-10 flex items-start gap-5">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                    <Info className="h-6 w-6 text-blue-500" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-bold text-blue-500 leading-none uppercase tracking-tight">{t("serverFirewall.rulesInfoTitle")}</h3>
                    <p className="text-sm text-blue-500/80 leading-relaxed font-medium">
                        {t("serverFirewall.rulesInfoDescription")}
                    </p>
                </div>
            </div>
        </div>

        {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/10 rounded-[3rem] border border-dashed border-border/60 backdrop-blur-sm">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                        <Shield className="h-16 w-16 text-primary" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t("serverFirewall.noRulesTitle")}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {t("serverFirewall.noRulesDescription")}
                    </p>
                </div>
                {canManage && (
                    <Button 
                        size="lg" 
                        onClick={openCreateModal} 
                        className="h-14 px-10 text-lg shadow-2xl shadow-primary/20"
                    >
                        <Plus className="h-6 w-6 mr-2" />
                        {t("serverFirewall.createRule")}
                    </Button>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
                {sortedRules.map(rule => (
                    <div 
                        key={rule.id}
                        className={cn(
                            "group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-md border border-border/40 transition-all duration-300 shadow-sm",
                            "hover:border-primary/40 hover:bg-card/50 hover:shadow-lg hover:shadow-primary/5"
                        )}
                    >
                        <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                            {/* Icon */}
                            <div className={cn(
                                "h-16 w-16 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 shadow-inner",
                                rule.type === "allow" 
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                    : "bg-red-500/10 border-red-500/20 text-red-500"
                            )}>
                                {rule.type === "allow" ? <Shield className="h-8 w-8" /> : <Shield className="h-8 w-8" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors duration-300">
                                        {rule.remote_ip} 
                                        <span className="mx-2 text-muted-foreground/40 font-medium">→</span>
                                        {rule.server_port}
                                    </h3>
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none shadow-sm",
                                        rule.type === "allow" 
                                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-500/5" 
                                            : "bg-red-500/10 text-red-500 border border-red-500/20 shadow-lg shadow-red-500/5"
                                    )}>
                                        {rule.type === "allow" ? t("serverFirewall.allow") : t("serverFirewall.block")}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none bg-background/50 border border-border/40 shadow-sm flex items-center gap-1.5 opacity-80">
                                        {rule.protocol.toUpperCase()}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 bg-black/10 px-2 py-0.5 rounded-md border border-white/5">{t("serverFirewall.priority")} {rule.priority}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground ml-auto sm:ml-0 opacity-60">
                                        <span className="text-[10px] font-black uppercase tracking-widest italic">{new Date(rule.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            {canManage && (
                                <div className="flex items-center gap-3 sm:self-center">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(rule)}
                                        className="h-12 w-12 flex items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-white hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Pencil className="h-5 w-5 fill-none stroke-current stroke-2" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => promptDelete(rule)}
                                        className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                    >
                                        <Trash2 className="h-5 w-5 stroke-2" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Create / Edit Modal */}
        <HeadlessModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={isEditing ? t("serverFirewall.editRule") : t("serverFirewall.createRule")}
            description={t("serverFirewall.drawerDescription")}
        >
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>{t("serverFirewall.allocation")}</Label>
                    <HeadlessSelect
                        value={selectedAllocationId}
                        onChange={handleAllocationChange}
                        options={allocationOptions}
                        placeholder={t("serverFirewall.allocationPlaceholder")}
                        disabled={saving || allocations.length === 0}
                    />
                    <p className="text-xs text-muted-foreground">{t("serverFirewall.allocationHelp")}</p>
                </div>

                <div className="space-y-2">
                    <Label>{t("serverFirewall.remoteIp")}</Label>
                    <Input 
                        value={formData.remote_ip}
                        onChange={(e) => setFormData(prev => ({ ...prev, remote_ip: e.target.value }))}
                        placeholder={t("serverFirewall.remoteIpPlaceholder")}
                        disabled={saving}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t("serverFirewall.priority")}</Label>
                        <Input 
                            type="number"
                            value={formData.priority}
                            onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                            min={1}
                            max={10000}
                            disabled={saving}
                        />
                        <p className="text-xs text-muted-foreground">{t("serverFirewall.priorityHelp")}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t("serverFirewall.type")}</Label>
                        <HeadlessSelect 
                            value={formData.type || "allow"} 
                            onChange={(val) => setFormData(prev => ({ ...prev, type: val as "allow" | "block" }))}
                            options={typeOptions}
                            disabled={saving}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t("serverFirewall.protocol")}</Label>
                    <HeadlessSelect 
                        value={formData.protocol || "tcp"} 
                        onChange={(val) => setFormData(prev => ({ ...prev, protocol: val as "tcp" | "udp" }))}
                        options={protocolOptions}
                        disabled={saving}
                    />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving} type="button">
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSave} disabled={saving} type="button">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("common.save")}
                    </Button>
                </div>
            </div>
        </HeadlessModal>

        {/* Delete Confirmation Modal */}
        <HeadlessModal 
            isOpen={deleteDialogOpen} 
            onClose={() => setDeleteDialogOpen(false)}
            title={t("serverFirewall.confirmDeleteTitle")}
            description={t("serverFirewall.confirmDeleteDescription")}
        >
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                    {t("common.cancel")}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t("serverFirewall.confirmDelete")}
                </Button>
            </div>
        </HeadlessModal>
    </div>
  )
}
