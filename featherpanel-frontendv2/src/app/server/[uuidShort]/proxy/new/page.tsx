"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    ArrowRightLeft,
    ChevronLeft,
    Globe,
    ShieldCheck,
    Lock,
    Settings2,
    Info,
    Loader2,
    CheckCircle,
    XCircle,
    Server,
    Mail
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HeadlessSelect } from "@/components/ui/headless-select"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import { cn, isEnabled } from "@/lib/utils"
import type { AllocationItem, AllocationsResponse, ProxyCreateRequest, DnsVerifyResponse } from "@/types/server"

export default function CreateProxyPage() {
    const { uuidShort } = useParams() as { uuidShort: string }
    const router = useRouter()
    const { t } = useTranslation()
    const { settings, loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    
    const canManage = hasPermission("proxy.manage")
    const proxyEnabled = isEnabled(settings?.server_allow_user_made_proxy)

    // State
    const [allocations, setAllocations] = React.useState<AllocationItem[]>([])
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [verifyingDns, setVerifyingDns] = React.useState(false)
    const [dnsVerified, setDnsVerified] = React.useState(false)
    const [dnsError, setDnsError] = React.useState<string | null>(null)
    const [targetIp, setTargetIp] = React.useState<string | null>(null)

    // Form State
    const [formData, setFormData] = React.useState<ProxyCreateRequest>({
        domain: "",
        port: "",
        ssl: false,
        use_lets_encrypt: false,
        client_email: "",
        ssl_cert: "",
        ssl_key: ""
    })

    // Fetch Data
    const fetchData = React.useCallback(async () => {
        if (!uuidShort || !proxyEnabled) return
        setLoading(true)
        try {
            const { data } = await axios.get<AllocationsResponse>(`/api/user/servers/${uuidShort}/allocations`)
            if (data.success) {
                const allocs = data.data.allocations || []
                setAllocations(allocs)
                if (allocs.length > 0 && !formData.port) {
                    setFormData(prev => ({ ...prev, port: String(allocs[0].port) }))
                }
            }
        } catch (error) {
            console.error("Failed to fetch data:", error)
            toast.error(t("common.error"))
        } finally {
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuidShort, proxyEnabled, t]) // formData.port excluded to prevent loop

    React.useEffect(() => {
        if (proxyEnabled && canManage) {
            fetchData()
        } else {
            setLoading(false)
        }
    }, [fetchData, proxyEnabled, canManage])

    // DNS Verification
    const handleVerifyDns = async () => {
        if (!formData.domain || !formData.port) return
        setVerifyingDns(true)
        setDnsError(null)
        try {
            const { data } = await axios.post<DnsVerifyResponse>(`/api/user/servers/${uuidShort}/proxy/verify-dns`, {
                domain: formData.domain,
                port: formData.port
            })

            if (data.success && data.data) {
                setDnsVerified(data.data.verified)
                setTargetIp(data.data.expected_ip || null)
                
                if (data.data.verified) {
                    toast.success(data.data.message || t("serverProxy.dnsVerifiedSuccess"))
                } else {
                    setDnsError(data.data.message || t("serverProxy.verificationFailed"))
                }
            } else {
                setDnsVerified(false)
                setDnsError(data.message || t("serverProxy.verificationFailed"))
            }
        } catch (error) {
            setDnsVerified(false)
            const axiosError = error as AxiosError<{ message: string }>;
            setDnsError(axiosError.response?.data?.message || t("serverProxy.failedToVerify"))
        } finally {
            setVerifyingDns(false)
        }
    }

    // Handlers
    const handleCreate = async () => {
        if (!formData.domain || !formData.port) {
            toast.error(t("serverProxy.domainRequired"))
            return
        }
        if (!dnsVerified) {
            toast.error(t("serverProxy.verifyFirst"))
            return
        }

        setSaving(true)
        try {
            await axios.post(`/api/user/servers/${uuidShort}/proxy/create`, formData)
            toast.success(t("serverProxy.created"))
            router.push(`/server/${uuidShort}/proxy`)
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t("serverProxy.createFailed")
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

    if (!proxyEnabled) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                        <ArrowRightLeft className="h-16 w-16 text-primary" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t("serverProxy.featureDisabled")}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {t("serverProxy.featureDisabledDescription")}
                    </p>
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
                                <ArrowRightLeft className="h-6 w-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight uppercase italic leading-none">{t("serverProxy.createProxy")}</h1>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium opacity-60 ml-15 max-w-xl">
                            {t("serverProxy.createModalDescription")}
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
                        disabled={saving || !dnsVerified}
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
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                {t("serverProxy.createProxy")}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Forms */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Domain & Port Configuration */}
                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                            <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/20">
                                <Globe className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black uppercase tracking-tight italic">{t("serverProxy.domain")} & {t("serverProxy.targetPort")}</h2>
                                <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50">{t("serverProxy.configuration")}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                    {t("serverProxy.domain")} <span className="text-primary">*</span>
                                </label>
                                <Input 
                                    value={formData.domain}
                                    onChange={(e) => {
                                        setFormData({...formData, domain: e.target.value})
                                        setDnsVerified(false)
                                    }}
                                    placeholder="play.example.com"
                                    className="h-12 bg-white/5 border-white/5 focus:border-primary/50 font-extrabold px-5 rounded-xl text-base transition-all"
                                    disabled={saving}
                                />
                                <p className="text-xs text-muted-foreground ml-1">{t("serverProxy.domainDescription")}</p>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                    {t("serverProxy.targetPort")} <span className="text-primary">*</span>
                                </label>
                                <HeadlessSelect
                                    value={formData.port}
                                    onChange={(val) => {
                                        setFormData({...formData, port: String(val)})
                                        setDnsVerified(false)
                                    }}
                                    options={allocations.map(a => ({
                                        id: String(a.port),
                                        name: `${a.ip}:${a.port} ${a.is_primary ? t("serverProxy.primary") : ''}`
                                    }))}
                                    placeholder={t("serverProxy.selectPort")}
                                    disabled={saving}
                                    buttonClassName="h-12 bg-white/5 border-white/5 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all"
                                />
                            </div>

                             {/* DNS Verification Block inside the form for logical flow */}
                             <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                                        <Info className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-primary uppercase tracking-wide">{t("serverProxy.verifyDns")}</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {t("serverProxy.pointDomain", { domain: formData.domain || "domain" })}
                                        </p>
                                    </div>
                                </div>

                                {targetIp && (
                                     <div className="flex items-center gap-2 text-xs p-3 bg-background/50 rounded-xl border border-dashed border-primary/30 mx-1">
                                         <Server className="h-3 w-3 text-primary opacity-50" />
                                         <span className="font-bold text-primary/80">{t("serverProxy.aRecord")}</span>
                                         <span className="font-mono text-foreground font-bold bg-white/5 px-2 py-0.5 rounded">{targetIp}</span>
                                     </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <Button 
                                        onClick={handleVerifyDns}
                                        disabled={!formData.domain || !formData.port || verifyingDns || dnsVerified || saving}
                                        size="sm"
                                        className={cn(
                                            "w-full h-10 font-bold tracking-wide uppercase text-[10px] rounded-xl shadow-lg transition-all",
                                            dnsVerified 
                                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20 text-white" 
                                                : "bg-primary hover:bg-primary/90 shadow-primary/20"
                                        )}
                                    >
                                        {verifyingDns ? (
                                            <>
                                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                                {t("serverProxy.verifying")}
                                            </>
                                        ) : dnsVerified ? (
                                            <>
                                                <CheckCircle className="h-3 w-3 mr-2" />
                                                {t("serverProxy.verified")}
                                            </>
                                        ) : (
                                            t("serverProxy.verifyDns")
                                        )}
                                    </Button>

                                    {dnsError && (
                                        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-in slide-in-from-top-2">
                                            <XCircle className="h-4 w-4 shrink-0" />
                                            <p className="text-xs font-bold">{dnsError}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SSL Configuration */}
                     <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black uppercase tracking-tight italic">{t("serverProxy.enableSsl")}</h2>
                                <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50">{t("serverProxy.secureWithHttps")}</p>
                            </div>
                             <div className="ml-auto">
                                <Button
                                    size="sm"
                                    variant={formData.ssl ? "default" : "outline"}
                                    onClick={() => setFormData({...formData, ssl: !formData.ssl})}
                                    className={cn("rounded-lg font-bold", formData.ssl && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                                    disabled={saving}
                                >
                                    {formData.ssl ? t("serverProxy.on") : t("serverProxy.off")}
                                </Button>
                            </div>
                        </div>

                        {formData.ssl && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                {/* Let's Encrypt Toggle */}
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="space-y-0.5">
                                        <h4 className="font-bold text-sm text-foreground">{t("serverProxy.letsEncrypt")}</h4>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{t("serverProxy.autoGenerate")}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={formData.use_lets_encrypt ? "default" : "outline"}
                                        onClick={() => setFormData({...formData, use_lets_encrypt: !formData.use_lets_encrypt})}
                                        disabled={saving}
                                        className={cn("rounded-lg font-bold", formData.use_lets_encrypt && "bg-blue-600 hover:bg-blue-700 text-white")}
                                    >
                                        {formData.use_lets_encrypt ? t("serverProxy.on") : t("serverProxy.off")}
                                    </Button>
                                </div>

                                {formData.use_lets_encrypt ? (
                                    <div className="space-y-2.5">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                            {t("serverProxy.email")} <span className="text-primary">*</span>
                                        </label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <Input 
                                                type="email" 
                                                value={formData.client_email || ""} 
                                                onChange={e => setFormData({...formData, client_email: e.target.value})}
                                                placeholder="admin@example.com"
                                                className="h-12 bg-white/5 border-white/5 focus:border-primary/50 font-extrabold pl-11 rounded-xl text-base transition-all"
                                                disabled={saving}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                                {t("serverProxy.certificate")}
                                            </label>
                                            <Textarea 
                                                value={formData.ssl_cert || ""}
                                                onChange={e => setFormData({...formData, ssl_cert: e.target.value})}
                                                disabled={saving}
                                                className="font-mono text-xs min-h-[150px] bg-white/5 border-white/5 focus:border-primary/50 rounded-xl leading-relaxed"
                                                placeholder="-----BEGIN CERTIFICATE-----..."
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                                {t("serverProxy.privateKey")}
                                            </label>
                                            <Textarea 
                                                value={formData.ssl_key || ""}
                                                onChange={e => setFormData({...formData, ssl_key: e.target.value})}
                                                disabled={saving}
                                                className="font-mono text-xs min-h-[150px] bg-white/5 border-white/5 focus:border-primary/50 rounded-xl leading-relaxed"
                                                placeholder="-----BEGIN PRIVATE KEY-----..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
                            <h3 className="text-lg font-black uppercase tracking-tight text-blue-500 leading-none italic">{t("serverProxy.infoTitle")}</h3>
                            <p className="text-blue-500/70 font-bold text-[11px] leading-relaxed italic">
                                {t("serverProxy.infoDescription")}
                            </p>
                        </div>
                    </div>

                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
                         <div className="flex items-center gap-4 border-b border-white/5 pb-6 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Settings2 className="h-5 w-5 text-white/70" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black uppercase tracking-tight italic">{t("serverProxy.helpfulTips")}</h2>
                                <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50 italic">{t("serverProxy.guide")}</p>
                            </div>
                        </div>
                        <ul className="space-y-4 relative z-10">
                            <li className="flex gap-3 text-xs text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>{t("serverProxy.tipDns")}</span>
                            </li>
                            <li className="flex gap-3 text-xs text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>{t("serverProxy.tipPorts")}</span>
                            </li>
                            <li className="flex gap-3 text-xs text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>{t("serverProxy.tipSsl")}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Mobile Only: Action Button */}
                    <div className="md:hidden pt-2">
                        <Button 
                            size="lg" 
                            onClick={handleCreate}
                            disabled={saving || !dnsVerified}
                            className="w-full h-12 font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl text-[10px]"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t("common.saving")}
                                </>
                            ) : (
                                <>
                                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                                    {t("serverProxy.createProxy")}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
