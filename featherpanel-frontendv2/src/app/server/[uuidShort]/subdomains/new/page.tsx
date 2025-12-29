"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    ChevronLeft,
    Globe,
    Network,
    Lock,
    Settings2,
    Info,
    Loader2,
    Plus
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HeadlessSelect } from "@/components/ui/headless-select"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import type { SubdomainCreateRequest, SubdomainOverview } from "@/types/server"

export default function CreateSubdomainPage() {
    const { uuidShort } = useParams() as { uuidShort: string }
    const router = useRouter()
    const { t } = useTranslation()
    const { loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    
    // Using generic manage permission for now, similar to proxy
    const canManage = hasPermission("subdomains.manage") || hasPermission("control.start") // Fallback if specific perm doesn't exist

    // State
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [overview, setOverview] = React.useState<SubdomainOverview | null>(null)

    // Form State
    const [formData, setFormData] = React.useState<SubdomainCreateRequest>({
        domain_uuid: "",
        subdomain: ""
    })

    // Fetch Data
    const fetchData = React.useCallback(async () => {
        if (!uuidShort) return
        setLoading(true)
        try {
            const { data } = await axios.get<{data: { overview: SubdomainOverview }}>(`/api/user/servers/${uuidShort}/subdomains`)
             if (data?.data?.overview) {
                 setOverview(data.data.overview)
                 // Pre-select first domain if available
                 if (data.data.overview.domains && data.data.overview.domains.length > 0 && !formData.domain_uuid) {
                     setFormData(prev => ({ ...prev, domain_uuid: data.data.overview.domains[0].uuid }))
                 }
             }
        } catch (error) {
            console.error("Failed to fetch data:", error)
            // toast.error(t("serverSubdomains.loadFailed"))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, formData.domain_uuid])

    React.useEffect(() => {
        if (canManage) {
            fetchData()
        } else {
            setLoading(false)
        }
    }, [fetchData, canManage])


    // Handlers
    const handleCreate = async () => {
        if (!formData.domain_uuid || !formData.subdomain.trim()) {
            toast.error(t("serverSubdomains.subdomainRequired"))
            return
        }

        if (overview && overview.current_total >= overview.max_allowed) {
            toast.error(t("serverSubdomains.limitReached"))
            return
        }

        setSaving(true)
        try {
            await axios.put(`/api/user/servers/${uuidShort}/subdomains`, {
                domain_uuid: formData.domain_uuid,
                subdomain: formData.subdomain.trim()
            })
            toast.success(t("serverSubdomains.created"))
            router.push(`/server/${uuidShort}/subdomains`)
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t("serverSubdomains.createFailed")
            toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    if (permissionsLoading || settingsLoading || loading) return null

    if (!canManage) {
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

    const availableDomains = overview?.domains || []
    const limitReached = (overview?.current_total ?? 0) >= (overview?.max_allowed ?? 0)

    if (availableDomains.length === 0 && !loading) {
         return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                        <Globe className="h-16 w-16 text-primary" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t("serverSubdomains.noDomainsAvailable")}</h2>
                </div>
                <Button variant="outline" size="lg" className="mt-8 rounded-2xl h-14 px-10" onClick={() => router.back()}>
                    {t("common.goBack")}
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Navigation Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
                <div className="space-y-3">
                    <button 
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-all duration-300"
                    >
                        <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{t("common.back")}</span>
                    </button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                                <Network className="h-6 w-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight uppercase italic leading-none">{t("serverSubdomains.createButton")}</h1>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium opacity-60 ml-15 max-w-xl">
                            {t("serverSubdomains.newSubdomainDescription")}
                        </p>
                    </div>
                </div>
                
                <div className="hidden md:flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="lg" 
                        onClick={() => router.back()}
                        disabled={saving}
                        className="h-12 px-8 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10"
                    >
                        {t("common.cancel")}
                    </Button>
                    <Button 
                        size="lg" 
                        onClick={handleCreate}
                        disabled={saving || limitReached}
                        className="h-12 px-10 font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-[10px] group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-white/20 to-primary/0 -translate-x-full group-hover:animate-shimmer" />
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t("common.saving")}
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("serverSubdomains.createButton")}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Forms */}
                <div className="lg:col-span-8 space-y-8">
                    
                     {limitReached && (
                        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-5 flex items-start gap-4">
                             <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0 border border-yellow-500/30">
                                <Info className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-yellow-500 uppercase tracking-wide">{t("serverSubdomains.limitReached")}</h4>
                                <p className="text-xs text-yellow-500/70 leading-relaxed font-medium">
                                    {t("serverSubdomains.limitReachedDescription", { limit: String(overview?.max_allowed) })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Subdomain Configuration */}
                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/20">
                                <Globe className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black uppercase tracking-tight italic">{t("serverSubdomains.configuration")}</h2>
                                <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50">Setup</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Domain Select */}
                            <div className="space-y-2.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                    {t("serverSubdomains.domainLabel")} <span className="text-primary">*</span>
                                </label>
                                <HeadlessSelect
                                    value={formData.domain_uuid}
                                    onChange={(val) => {
                                        setFormData({...formData, domain_uuid: String(val)})
                                    }}
                                    options={availableDomains.map(d => ({
                                        id: d.uuid,
                                        name: d.domain
                                    }))}
                                    placeholder={t("serverSubdomains.domainPlaceholder")}
                                    disabled={saving}
                                    buttonClassName="h-12 bg-white/5 border-white/5 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all"
                                />
                            </div>

                            {/* Subdomain Input */}
                             <div className="space-y-2.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                    {t("serverSubdomains.subdomainLabel")} <span className="text-primary">*</span>
                                </label>
                                <Input 
                                    value={formData.subdomain}
                                    onChange={(e) => setFormData({...formData, subdomain: e.target.value})}
                                    placeholder={t("serverSubdomains.subdomainPlaceholder")}
                                    className="h-12 bg-white/5 border-white/5 focus:border-primary/50 font-extrabold px-5 rounded-xl text-base transition-all"
                                    disabled={saving}
                                />
                                <p className="text-xs text-muted-foreground ml-1">{t("serverSubdomains.subdomainHint")}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Info Panel */}
                <div className="lg:col-span-4 space-y-8">
                     <div className="bg-blue-500/5 border border-blue-500/10 backdrop-blur-3xl rounded-3xl p-8 space-y-4 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 relative z-10">
                            <Info className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <h3 className="text-lg font-black uppercase tracking-tight text-blue-500 leading-none italic">{t("serverSubdomains.helpfulTips")}</h3>
                            <p className="text-blue-500/70 font-bold text-[11px] leading-relaxed italic">
                                {t("serverSubdomains.noSubdomainsDescription")}
                            </p>
                        </div>
                    </div>

                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
                         <div className="flex items-center gap-4 border-b border-white/5 pb-6 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Settings2 className="h-5 w-5 text-white/70" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black uppercase tracking-tight italic">{t("serverSubdomains.guide")}</h2>
                                <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50 italic">Info</p>
                            </div>
                        </div>
                        <ul className="space-y-4 relative z-10">
                            <li className="flex gap-3 text-xs text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>Subdomains allow you to give your server a custom address, like <code>play.example.com</code>.</span>
                            </li>
                             <li className="flex gap-3 text-xs text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>You can create multiple subdomains for different purposes.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Mobile Only: Action Button */}
                    <div className="md:hidden pt-2">
                        <Button 
                            size="lg" 
                            onClick={handleCreate}
                            disabled={saving || limitReached}
                            className="w-full h-12 font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl text-[10px]"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t("common.saving")}
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t("serverSubdomains.createButton")}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
