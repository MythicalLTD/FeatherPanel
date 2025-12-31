"use client"

import * as React from "react"
import { useParams, useRouter, usePathname } from "next/navigation"
import axios, { AxiosError } from "axios"
import { useTranslation } from "@/contexts/TranslationContext"
import {
    Zap,
    ChevronRight,
    RefreshCw,
    Save,
    Terminal,
    Container,
    Settings,
    Info,
    Loader2,
    Lock,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useServerPermissions } from "@/hooks/useServerPermissions"
import { useSettings } from "@/contexts/SettingsContext"
import { cn, isEnabled } from "@/lib/utils"
import type { 
    Variable, 
    Server
} from "@/types/server"

interface ServerResponse {
    success: boolean
    data: Server & {
        variables: Variable[]
        image?: string // Some API endpoints use image instead of docker_image
    }
}

export default function ServerStartupPage() {
    const { uuidShort } = useParams() as { uuidShort: string }
    const router = useRouter()
    const pathname = usePathname()
    const { t } = useTranslation()
    const { settings, loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)

    // Permission checks
    const canRead = hasPermission("startup.read")
    const canUpdateStartup = hasPermission("startup.update") && isEnabled(settings?.server_allow_startup_change)
    const canUpdateDockerImage = hasPermission("startup.docker-image")
    const canChangeSpell = isEnabled(settings?.server_allow_egg_change)

    // State
    const [server, setServer] = React.useState<(Server & { variables: Variable[] }) | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [saving, setSaving] = React.useState(false)
    const [variables, setVariables] = React.useState<Variable[]>([])
    const [availableDockerImages, setAvailableDockerImages] = React.useState<string[]>([])
    const [defaultStartupCommand, setDefaultStartupCommand] = React.useState("")

    const [form, setForm] = React.useState({
        startup: "",
        image: "",
    })

    const [variableValues, setVariableValues] = React.useState<Record<number, string>>({})
    const [variableErrors, setVariableErrors] = React.useState<Record<number, string>>({})

    // Validation Logic Helpers
    const parseRules = React.useCallback((rules: string) => {
        if (!rules) return []
        const parts = rules.split("|")
        const parsed: Array<{ type: string; value?: number | string }> = []
        for (const part of parts) {
            if (["required", "nullable", "string", "numeric", "integer"].includes(part)) {
                parsed.push({ type: part })
                continue
            }
            const maxMatch = part.match(/^max:(\d+)$/)
            if (maxMatch) {
                parsed.push({ type: "max", value: Number(maxMatch[1]) })
                continue
            }
            const minMatch = part.match(/^min:(\d+)$/)
            if (minMatch) {
                parsed.push({ type: "min", value: Number(minMatch[1]) })
                continue
            }
            const regexMatch = part.match(/^regex:\/(.*)\/$/)
            if (regexMatch) {
                parsed.push({ type: "regex", value: regexMatch[1] })
                continue
            }
        }
        return parsed
    }, [])

    const normalizeRegexPattern = React.useCallback((pattern: string) => {
        try {
            return pattern.replace(/\\\\/g, "\\")
        } catch {
            return pattern
        }
    }, [])

    const validateVariableAgainstRules = React.useCallback((value: string, rules: string): string | "" => {
        const parsed = parseRules(rules || "")
        const hasNullable = parsed.some((r) => r.type === "nullable")
        const isRequired = parsed.some((r) => r.type === "required")
        const isNumeric = parsed.some((r) => r.type === "numeric" || r.type === "integer")

        const val = value ?? ""
        const trimmedForEmptyCheck = val.trim()

        if (!isRequired && hasNullable && trimmedForEmptyCheck === "") return ""
        if (isRequired && trimmedForEmptyCheck === "") return t("serverStartup.fieldRequired")
        if (!isRequired && trimmedForEmptyCheck === "") return ""

        if (isNumeric && !/^\d+$/.test(trimmedForEmptyCheck)) return t("serverStartup.fieldMustBeNumeric")

        for (const rule of parsed) {
            if (rule.type === "min" && typeof rule.value === "number") {
                if (isNumeric) {
                    const numValue = Number(trimmedForEmptyCheck)
                    if (isNaN(numValue) || numValue < rule.value) {
                        return t("serverStartup.minimumValue", { value: String(rule.value) })
                    }
                } else {
                    if (trimmedForEmptyCheck.length < rule.value) {
                        return t("serverStartup.minimumCharacters", { value: String(rule.value) })
                    }
                }
            }
            if (rule.type === "max" && typeof rule.value === "number") {
                if (isNumeric) {
                    const numValue = Number(trimmedForEmptyCheck)
                    if (isNaN(numValue) || numValue > rule.value) {
                        return t("serverStartup.maximumValue", { value: String(rule.value) })
                    }
                } else {
                    if (trimmedForEmptyCheck.length > rule.value) {
                        return t("serverStartup.maximumCharacters", { value: String(rule.value) })
                    }
                }
            }
            if (rule.type === "regex" && typeof rule.value === "string") {
                try {
                    const pattern = normalizeRegexPattern(rule.value)
                    const re = new RegExp(pattern)
                    if (!re.test(trimmedForEmptyCheck)) {
                        return t("serverStartup.valueDoesNotMatchFormat")
                    }
                } catch (err) {
                    console.error("Invalid regex pattern:", rule.value, err)
                }
            }
        }
        return ""
    }, [parseRules, normalizeRegexPattern, t])

    const validateOneVariable = React.useCallback((v: Variable, value: string) => {
        const message = validateVariableAgainstRules(value, v.rules || "")
        setVariableErrors(prev => {
            const next = { ...prev }
            if (message) {
                next[v.variable_id] = message
            } else {
                delete next[v.variable_id]
            }
            return next
        })
    }, [validateVariableAgainstRules])

    // Data Fetching
    const fetchData = React.useCallback(async () => {
        if (!uuidShort || !canRead) return
        setLoading(true)
        try {
            const { data } = await axios.get<ServerResponse>(`/api/user/servers/${uuidShort}`)
            if (data.success) {
                const s = data.data
                setServer(s)
                setForm({
                    startup: s.startup || "",
                    image: s.image || s.docker_image || "",
                })
                setDefaultStartupCommand(s.spell?.startup || "")
                const vars = s.variables || []
                setVariables(vars)
                const values: Record<number, string> = {}
                vars.forEach(v => {
                    values[v.variable_id] = v.variable_value ?? ""
                })
                setVariableValues(values)

                // Parse Docker Images
                try {
                    const dockerImages = s.spell?.docker_images
                    let images: string[] = []
                    if (dockerImages) {
                        if (typeof dockerImages === "string") {
                            const parsed = JSON.parse(dockerImages)
                            images = Object.values(parsed)
                        } else {
                            images = Object.values(dockerImages)
                        }
                    }
                    setAvailableDockerImages(images)
                    
                    // Auto-select image logic
                    const currentImage = s.image || s.docker_image
                    if (currentImage && images.includes(currentImage)) {
                        setForm(prev => ({ ...prev, image: currentImage }))
                    } else if (images.length > 0) {
                        setForm(prev => ({ ...prev, image: images[0] }))
                    }
                } catch {
                    setAvailableDockerImages([])
                }
            }
        } catch (error) {
            console.error("Failed to fetch startup data:", error)
            toast.error(t("serverStartup.failedToFetchServer"))
        } finally {
            setLoading(false)
        }
    }, [uuidShort, canRead, t])

    React.useEffect(() => {
        if (!permissionsLoading && !settingsLoading) {
            if (canRead) {
                fetchData()
            }
        }
    }, [canRead, permissionsLoading, settingsLoading, fetchData])

    // Interaction Handlers
    const handleRestoreDefault = () => {
        if (defaultStartupCommand) {
            setForm(prev => ({ ...prev, startup: defaultStartupCommand }))
            toast.info(t("serverStartup.defaultRestored"))
        }
    }

    const handleSave = async () => {
        setSaving(true)
        
        // Final Page Validation
        let hasErrors = false
        const errors: Record<number, string> = {}
        variables.forEach(v => {
            if (v.user_viewable === 1) {
                const val = variableValues[v.variable_id] || ""
                const err = validateVariableAgainstRules(val, v.rules || "")
                if (err) {
                    errors[v.variable_id] = err
                    hasErrors = true
                }
            }
        })
        setVariableErrors(errors)

        if (hasErrors) {
            setSaving(false)
            toast.error(t("serverStartup.pleaseFixErrors"))
            return
        }

        try {
            const payload = {
                startup: form.startup,
                image: form.image,
                variables: variables
                    .filter(v => v.user_editable === 1 || canUpdateStartup)
                    .map(v => ({
                        variable_id: v.variable_id,
                        variable_value: variableValues[v.variable_id] || ""
                    }))
            }

            const { data } = await axios.put<{success: boolean, message?: string}>(`/api/user/servers/${uuidShort}`, payload)
            if (data.success) {
                toast.success(t("serverStartup.saveSuccess"))
                await fetchData()
            } else {
                toast.error(data.message || t("serverStartup.saveError"))
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>
            const msg = axiosError.response?.data?.message || t("serverStartup.saveError")
            toast.error(msg)
            console.error("Save failed:", error)
        } finally {
            setSaving(false)
        }
    }

    // View Computations
    const viewableVariables = variables.filter(v => v.user_viewable === 1)
    const hasChanges = () => {
        if (!server) return false
        const startupChanged = form.startup !== (server.startup || "")
        const imageChanged = form.image !== (server.image || server.docker_image || "")
        const variablesChanged = variables
            .filter(v => v.user_editable === 1 || canUpdateStartup)
            .some(v => variableValues[v.variable_id] !== (v.variable_value ?? ""))
        return startupChanged || imageChanged || variablesChanged
    }

    if (permissionsLoading || settingsLoading) return null

    if (!canRead) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3">
                        <Lock className="h-16 w-16 text-red-500" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t("serverStartup.featureDisabled")}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {t("serverStartup.noStartupPermission")}
                    </p>
                </div>
                <Button variant="outline" size="lg" className="mt-8 rounded-2xl h-14 px-10" onClick={() => router.push(`/server/${uuidShort}`)}>
                    {t("common.goBack")}
                </Button>
            </div>
        )
    }

    if (loading && !server) {
        return (
            <div key={pathname} className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
                <p className="mt-4 text-muted-foreground font-medium">{t("common.loading")}</p>
            </div>
        )
    }

    return (
        <div key={pathname} className="max-w-6xl mx-auto space-y-8 pb-16 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black tracking-tight uppercase">{t('serverStartup.title')}</h1>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <p className="text-lg opacity-80 font-medium">{t('serverStartup.description')}</p>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="lg" 
                        onClick={() => fetchData()}
                        disabled={loading || saving}
                        className="h-12 px-8 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10"
                    >
                        <RefreshCw className={cn("h-3 w-3 mr-2", loading && "animate-spin")} />
                        {t('common.refresh')}
                    </Button>
                    <Button 
                        size="lg" 
                        onClick={handleSave}
                        disabled={saving || !hasChanges() || Object.keys(variableErrors).length > 0}
                        className="h-14 px-10 font-bold uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-lg group overflow-hidden"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t('common.saving')}
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                {t('common.saveChanges')}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Main Content */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Startup Command */}
                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
                        <div className="flex items-center justify-between border-b border-white/5 pb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/20">
                                    <Terminal className="h-5 w-5 text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-black uppercase tracking-tight">{t('serverStartup.startupCommand')}</h2>
                                    <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50">{t('serverStartup.startupHelp')}</p>
                                </div>
                            </div>
                            {canUpdateStartup && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleRestoreDefault}
                                    className="h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 border-white/10 hover:bg-white/10 transition-all"
                                >
                                    {t('serverStartup.restoreDefault')}
                                </Button>
                            )}
                        </div>

                        <div className="space-y-4 relative z-10">
                            <Textarea
                                value={form.startup}
                                onChange={(e) => setForm(prev => ({ ...prev, startup: e.target.value }))}
                                disabled={!canUpdateStartup || saving}
                                className="min-h-[140px] bg-black/40 border-white/5 rounded-2xl p-6 font-mono text-sm leading-relaxed focus:border-primary/50 transition-all scrollbar-hide"
                            />
                        </div>
                    </div>

                    {/* Variables */}
                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 blur-[80px] pointer-events-none" />
                        <div className="flex items-center justify-between border-b border-white/5 pb-8 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="h-12 w-12 rounded-2xl bg-purple-500/5 flex items-center justify-center border border-purple-500/20">
                                    <Settings className="h-6 w-6 text-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{t('serverStartup.variables')}</h2>
                                    <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50">{t('serverStartup.variablesHelp')}</p>
                                </div>
                            </div>
                            <div className="px-5 py-2 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                {viewableVariables.length} {viewableVariables.length === 1 ? t('serverStartup.variableSingular') : t('serverStartup.variablePlural')}
                            </div>
                        </div>

                        {viewableVariables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 relative z-10">
                                <Settings className="h-16 w-16 text-muted-foreground/10" />
                                <p className="text-muted-foreground font-black uppercase leading-none">{t('serverStartup.noVariablesConfigured')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                {viewableVariables.map((v) => (
                                    <div key={v.variable_id} className="space-y-3 group/var">
                                        <div className="flex items-center justify-between ml-1">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                                    variableErrors[v.variable_id] ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-purple-500/50 group-hover/var:bg-purple-500"
                                                )} />
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover/var:text-foreground transition-colors">
                                                    {v.name}
                                                </label>
                                            </div>
                                            {v.user_editable === 0 && !canUpdateStartup && (
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                                    {t('serverStartup.readOnly')}
                                                </span>
                                            )}
                                            {v.user_editable === 0 && canUpdateStartup && (
                                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-blue-500/20 bg-blue-500/5 text-blue-500">
                                                    Admin Access
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="relative">
                                            <Input
                                                value={variableValues[v.variable_id] ?? ""}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    setVariableValues(prev => ({ ...prev, [v.variable_id]: val }))
                                                    validateOneVariable(v, val)
                                                }}
                                                disabled={(v.user_editable === 0 && !canUpdateStartup) || saving}
                                                className={cn(
                                                    "h-12 bg-white/5 border-white/5 focus:border-purple-500/50 font-extrabold px-5 rounded-xl text-base transition-all",
                                                    variableErrors[v.variable_id] && "border-red-500/50 bg-red-500/5",
                                                    v.user_editable === 0 && !canUpdateStartup && "opacity-50 grayscale"
                                                )}
                                                placeholder={v.default_value || t('serverStartup.enterValue')}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground/20 opacity-0 group-hover/var:opacity-100 transition-opacity pointer-events-none">
                                                {v.env_variable}
                                            </div>
                                        </div>

                                        {variableErrors[v.variable_id] ? (
                                            <p className="text-[9px] font-black text-red-500 ml-2 uppercase tracking-widest animate-in slide-in-from-left-2">{variableErrors[v.variable_id]}</p>
                                        ) : v.description && (
                                            <p className="text-[9px] font-bold text-muted-foreground/40 ml-2 line-clamp-1 group-hover/var:line-clamp-none transition-all">{v.description}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Configuration & Actions */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Docker Image Panel */}
                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-700" />
                        <div className="flex items-center gap-4 border-b border-white/5 pb-6 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-blue-500/5 flex items-center justify-center border border-blue-500/20">
                                <Container className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black uppercase tracking-tight">{t('serverStartup.dockerImage')}</h2>
                                <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50">Containerization</p>
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="space-y-2.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                    {t('serverStartup.dockerImage')}
                                </label>
                                <Input 
                                    value={form.image}
                                    onChange={(e) => setForm(prev => ({ ...prev, image: e.target.value }))}
                                    disabled={!canUpdateDockerImage || saving}
                                    placeholder="ghcr.io/..."
                                    className="h-12 bg-white/5 border-white/5 focus:border-blue-500/50 font-extrabold px-5 rounded-xl text-xs transition-all font-mono"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                    {t('serverStartup.availableImages')}
                                </label>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                                    {availableDockerImages.map((image) => (
                                        <div 
                                            key={image}
                                            onClick={() => canUpdateDockerImage && !saving && setForm(prev => ({ ...prev, image }))}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all duration-300 cursor-pointer group/img relative overflow-hidden",
                                                form.image === image ? "bg-blue-500/10 border-blue-500/40" : "bg-white/5 border-white/5 hover:border-white/20"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3 relative z-10">
                                                <p className={cn(
                                                    "text-[10px] font-mono font-bold truncate transition-colors",
                                                    form.image === image ? "text-blue-500" : "text-white/60 group-hover/img:text-white/80"
                                                )}>{image}</p>
                                                {form.image === image && <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Software Transfer Section */}
                    {canChangeSpell && (
                        <div className="bg-primary/5 border border-primary/10 backdrop-blur-3xl rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/10 blur-3xl pointer-events-none group-hover:bg-primary/20 transition-all duration-1000" />
                            <div className="flex items-center gap-5 relative z-10">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl shadow-primary/5">
                                    <Zap className="h-6 w-6 text-primary fill-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black uppercase tracking-tight">{t('serverStartup.softwareEnvironment')}</h3>
                                    <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">{t('navigation.items.transferSpell')}</p>
                                </div>
                            </div>
                            
                            <p className="text-sm font-medium text-muted-foreground/80 leading-relaxed relative z-10">
                                {t('serverStartup.transferDescription')}
                            </p>

                            <Button 
                                onClick={() => router.push(`/server/${uuidShort}/startup/transfer/spell`)}
                                className="w-full h-14 rounded-2xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-black uppercase tracking-widest text-xs relative z-10 transition-all active:scale-95 group/btn"
                            >
                                {t('serverStartup.startTransfer')}
                                <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    )}

                    {/* Information Summary */}
                    <div className="bg-blue-500/5 border border-blue-500/10 backdrop-blur-3xl rounded-3xl p-8 space-y-4 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 relative z-10">
                            <Info className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <h3 className="text-lg font-black uppercase tracking-tight text-blue-500 leading-none">{t('serverStartup.startupSettings')}</h3>
                            <p className="text-blue-500/70 font-bold text-[11px] leading-relaxed">
                                {t('serverStartup.description')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
