'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
    Upload, 
    ChevronLeft, 
    Globe, 
    User, 
    FolderUp, 
    FolderDown, 
    AlertTriangle, 
    ShieldAlert, 
    Loader2,
    Lock,
    Settings2,
    Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { HeadlessSelect } from '@/components/ui/headless-select'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSettings } from '@/contexts/SettingsContext'
import { useServerPermissions } from '@/hooks/useServerPermissions'
import { toast } from 'sonner'
import axios from 'axios'
import { cn, isEnabled } from '@/lib/utils'

export default function CreateServerImportPage() {
    const { uuidShort } = useParams() as { uuidShort: string }
    const router = useRouter()
    const { t } = useTranslation()
    const { settings, loading: settingsLoading } = useSettings()
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort)
    const canManage = hasPermission('import.manage')

    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        type: 'sftp' as 'sftp' | 'ftp',
        host: '',
        port: '22',
        user: '',
        password: '',
        sourceLocation: '/',
        destinationLocation: '/',
        wipe: false,
        wipeAllFiles: false
    })

    const [errors, setErrors] = useState<Record<string, string>>({})

    const validateForm = () => {
        const newErrors: Record<string, string> = {}
        if (!form.host.trim()) newErrors.host = t('serverImport.validation.hostRequired')
        if (!form.port.trim()) {
            newErrors.port = t('serverImport.validation.portRequired')
        } else {
            const p = parseInt(form.port)
            if (isNaN(p) || p < 1 || p > 65535) newErrors.port = t('serverImport.validation.portInvalid')
        }
        if (!form.user.trim()) newErrors.user = t('serverImport.validation.userRequired')
        if (!form.password.trim()) newErrors.password = t('serverImport.validation.passwordRequired')
        if (!form.sourceLocation.trim()) newErrors.sourceLocation = t('serverImport.validation.sourceLocationRequired')
        if (!form.sourceLocation.startsWith('/')) newErrors.sourceLocation = t('serverImport.validation.sourceLocationInvalid')
        if (!form.destinationLocation.trim()) newErrors.destinationLocation = t('serverImport.validation.destinationLocationRequired')
        
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleStartImport = async () => {
        if (!validateForm()) {
            toast.error(t('common.pleaseFixErrors'))
            return
        }

        try {
            setSaving(true)
            
            if (form.wipeAllFiles) {
                await axios.post(`/api/user/servers/${uuidShort}/power/kill`)
                await axios.post(`/api/user/servers/${uuidShort}/wipe-all-files`)
            }

            const { data } = await axios.post(`/api/user/servers/${uuidShort}/import`, {
                hote: form.host.trim(),
                port: parseInt(form.port),
                user: form.user.trim(),
                password: form.password.trim(),
                srclocation: form.sourceLocation.trim(),
                dstlocation: form.destinationLocation.trim(),
                type: form.type,
                wipe: form.wipe
            })

            if (data.success) {
                toast.success(t('serverImport.importStarted'))
                router.push(`/server/${uuidShort}/import?success=true`)
            } else {
                toast.error(data.message || t('serverImport.importFailed'))
            }
        } catch (error) {
            console.error('Import failed:', error)
            toast.error(t('serverImport.importFailed'))
        } finally {
            setSaving(false)
        }
    }

    const isImportEnabled = isEnabled(settings?.server_allow_user_made_import)

    if (permissionsLoading || settingsLoading) return null
    if (!canManage) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6">
                    <Lock className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight">{t('common.accessDenied')}</h1>
                <p className="text-muted-foreground mt-2">{t('common.noPermission')}</p>
                <Button variant="outline" className="mt-8" onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        )
    }

    if (!isImportEnabled) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 bg-[#0A0A0A]/40 backdrop-blur-3xl rounded-[3rem] border border-white/5 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150" />
                    <div className="relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3">
                        <Lock className="h-16 w-16 text-red-500" />
                    </div>
                </div>
                <div className="max-w-md space-y-3 px-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight">{t('serverImport.featureDisabled')}</h2>
                    <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                        {t('serverImport.featureDisabledDescription')}
                    </p>
                </div>
                <Button variant="outline" size="lg" className="mt-8 rounded-2xl h-14 px-10" onClick={() => router.push(`/server/${uuidShort}/import`)}>
                    {t('common.goBack')}
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
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('common.back')}</span>
                    </button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                                <Upload className="h-6 w-6 text-primary" />
                            </div>
                            <h1 className="text-3xl font-black tracking-tight uppercase italic leading-none">{t('serverImport.createImport')}</h1>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium opacity-60 ml-15 max-w-xl">
                            {t('serverImport.drawerDescription')}
                        </p>
                    </div>
                </div>
                
                <div className="hidden md:flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="lg" 
                        onClick={() => router.push(`/server/${uuidShort}/import`)}
                        disabled={saving}
                        className="h-12 px-8 font-black uppercase tracking-widest text-[10px] hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10"
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button 
                        size="lg" 
                        onClick={handleStartImport}
                        disabled={saving}
                        className="h-12 px-10 font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-[10px] group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-white/20 to-primary/0 -translate-x-full group-hover:animate-shimmer" />
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t('common.saving')}
                            </>
                        ) : (
                            <>
                                <Zap className="h-4 w-4 mr-2 text-primary-foreground fill-primary-foreground" />
                                {t('serverImport.createImport')}
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Forms */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Connection Section */}
                        <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/20">
                                    <Globe className="h-5 w-5 text-primary" />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-black uppercase tracking-tight italic">{t('serverImport.connection')}</h2>
                                    <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50">{t('serverImport.typeHelp')}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                        {t('serverImport.type')}
                                    </label>
                                    <HeadlessSelect 
                                        value={form.type}
                                        onChange={(val: string | number) => {
                                            setForm(prev => ({ 
                                                ...prev, 
                                                type: val as 'sftp' | 'ftp',
                                                port: val === 'sftp' ? '22' : '21'
                                            }))
                                        }}
                                        options={[
                                            { id: 'sftp', name: 'SFTP (Secure / SSH)' },
                                            { id: 'ftp', name: 'FTP (Standard)' }
                                        ]}
                                        disabled={saving}
                                        buttonClassName="h-12 bg-white/5 border-white/5 focus:border-primary/50 rounded-xl text-sm font-extrabold transition-all"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                        {t('serverImport.host')} <span className="text-primary">*</span>
                                    </label>
                                    <Input 
                                        value={form.host}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, host: e.target.value }))}
                                        placeholder="example.com"
                                        className={cn(
                                            "h-12 bg-white/5 border-white/5 focus:border-primary/50 font-extrabold px-5 rounded-xl text-base transition-all",
                                            errors.host && "border-red-500/50 bg-red-500/5"
                                        )}
                                        disabled={saving}
                                    />
                                    {errors.host && <p className="text-[9px] font-black text-red-500 ml-1 uppercase tracking-widest">{errors.host}</p>}
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                        {t('serverImport.port')} <span className="text-primary">*</span>
                                    </label>
                                    <Input 
                                        type="number"
                                        value={form.port}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, port: e.target.value }))}
                                        className={cn(
                                            "h-12 bg-white/5 border-white/5 focus:border-primary/50 font-extrabold px-5 rounded-xl text-base transition-all",
                                            errors.port && "border-red-500/50 bg-red-500/5"
                                        )}
                                        disabled={saving}
                                    />
                                    {errors.port && <p className="text-[9px] font-black text-red-500 ml-1 uppercase tracking-widest">{errors.port}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Authentication Section */}
                        <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl">
                            <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                                <div className="h-10 w-10 rounded-xl bg-blue-500/5 flex items-center justify-center border border-blue-500/20">
                                    <User className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="space-y-0.5">
                                    <h2 className="text-xl font-black uppercase tracking-tight italic">{t('serverImport.authentication')}</h2>
                                    <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50">{t('serverImport.credentialsHelp')}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                        {t('serverImport.user')} <span className="text-primary">*</span>
                                    </label>
                                    <Input 
                                        value={form.user}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, user: e.target.value }))}
                                        placeholder="sftp_user"
                                        className={cn(
                                            "h-12 bg-white/5 border-white/5 focus:border-primary/50 font-extrabold px-5 rounded-xl text-base transition-all",
                                            errors.user && "border-red-500/50 bg-red-500/5"
                                        )}
                                        disabled={saving}
                                    />
                                    {errors.user && <p className="text-[9px] font-black text-red-500 ml-1 uppercase tracking-widest">{errors.user}</p>}
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                                        {t('serverImport.password')} <span className="text-primary">*</span>
                                    </label>
                                    <Input 
                                        type="password"
                                        value={form.password}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="••••••••"
                                        className={cn(
                                            "h-12 bg-white/5 border-white/5 focus:border-primary/50 font-extrabold px-5 rounded-xl text-base transition-all",
                                            errors.password && "border-red-500/50 bg-red-500/5"
                                        )}
                                        disabled={saving}
                                    />
                                    {errors.password && <p className="text-[9px] font-black text-red-500 ml-1 uppercase tracking-widest">{errors.password}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Paths Section */}
                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] pointer-events-none" />
                        <div className="flex items-center gap-5 border-b border-white/5 pb-8">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/20">
                                <FolderUp className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase tracking-tight italic leading-none">{t('serverImport.paths')}</h2>
                                <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50 italic">{t('serverImport.pathsHelp')}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5 ml-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                        {t('serverImport.sourceLocation')}
                                    </label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40 group-focus-within:text-emerald-500 transition-colors">
                                        <FolderUp className="h-4 w-4" />
                                    </div>
                                    <Input 
                                        value={form.sourceLocation}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, sourceLocation: e.target.value }))}
                                        placeholder="/path/to/files"
                                        className={cn(
                                            "h-14 bg-white/5 border-white/5 focus:border-emerald-500/50 font-extrabold pl-12 pr-6 rounded-2xl shadow-inner text-lg transition-all",
                                            errors.sourceLocation && "border-red-500/50 bg-red-500/5"
                                        )}
                                        disabled={saving}
                                    />
                                </div>
                                {errors.sourceLocation && <p className="text-[9px] font-black text-red-500 ml-2 uppercase tracking-widest">{errors.sourceLocation}</p>}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5 ml-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                        {t('serverImport.destinationLocation')}
                                    </label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors">
                                        <FolderDown className="h-4 w-4" />
                                    </div>
                                    <Input 
                                        value={form.destinationLocation}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, destinationLocation: e.target.value }))}
                                        placeholder="/"
                                        className={cn(
                                            "h-14 bg-white/5 border-white/5 focus:border-primary/50 font-extrabold pl-12 pr-6 rounded-2xl shadow-inner text-lg transition-all",
                                            errors.destinationLocation && "border-red-500/50 bg-red-500/5"
                                        )}
                                        disabled={saving}
                                    />
                                </div>
                                {errors.destinationLocation && <p className="text-[9px] font-black text-red-500 ml-2 uppercase tracking-widest">{errors.destinationLocation}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Options & Actions */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Options Panel */}
                    <div className="bg-[#0A0A0A]/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all duration-700" />
                        <div className="flex items-center gap-4 border-b border-white/5 pb-6 relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                <Settings2 className="h-5 w-5 text-white/70" />
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black uppercase tracking-tight italic">{t('serverImport.options')}</h2>
                                <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50 italic">Configuration</p>
                            </div>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {/* Wipe Destination Toggle */}
                            <div 
                                onClick={() => !saving && setForm(prev => ({ ...prev, wipe: !prev.wipe }))}
                                className={cn(
                                    "p-5 rounded-2xl border transition-all duration-500 cursor-pointer group/opt relative overflow-hidden",
                                    form.wipe ? "bg-primary/10 border-primary/40" : "bg-white/5 border-white/5 hover:border-white/20"
                                )}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <p className={cn(
                                            "font-black text-xs uppercase tracking-wider transition-colors",
                                            form.wipe ? "text-primary" : "text-white/80"
                                        )}>{t('serverImport.wipe')}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground leading-relaxed italic opacity-70 pr-4">{t('serverImport.wipeHelp')}</p>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full transition-all duration-500 relative shrink-0",
                                        form.wipe ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-white/10"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-500 shadow-md",
                                            form.wipe ? "left-6" : "left-1"
                                        )} />
                                    </div>
                                </div>
                            </div>

                            {/* Wipe All Toggle (Danger) */}
                            <div 
                                onClick={() => !saving && setForm(prev => ({ ...prev, wipeAllFiles: !prev.wipeAllFiles }))}
                                className={cn(
                                    "p-5 rounded-2xl border transition-all duration-500 cursor-pointer group/opt relative overflow-hidden",
                                    form.wipeAllFiles ? "bg-red-500/10 border-red-500/40" : "bg-white/5 border-white/5 hover:border-red-500/20"
                                )}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <p className={cn(
                                            "font-black text-xs uppercase tracking-wider transition-colors",
                                            form.wipeAllFiles ? "text-red-500" : "text-white/80"
                                        )}>{t('serverImport.wipeAllFiles')}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground leading-relaxed italic opacity-70 pr-4">{t('serverImport.wipeAllFilesHelp')}</p>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full transition-all duration-500 relative shrink-0",
                                        form.wipeAllFiles ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-white/10"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-500 shadow-md",
                                            form.wipeAllFiles ? "left-6" : "left-1"
                                        )} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Caution Alert */}
                        {form.wipeAllFiles && (
                            <div className="mt-4 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 animate-in zoom-in-95 duration-500 relative z-10">
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-red-500 font-black text-[10px] uppercase tracking-widest">{t('common.warning')}</h4>
                                        <p className="text-red-500/80 text-[9px] font-extrabold italic leading-relaxed">{t('serverImport.wipeAllFilesWarning')}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Information Summary */}
                    <div className="bg-blue-500/5 border border-blue-500/10 backdrop-blur-3xl rounded-3xl p-8 space-y-4 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-500/10 blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 relative z-10">
                            <ShieldAlert className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <h3 className="text-lg font-black uppercase tracking-tight text-blue-500 leading-none italic">{t('serverImport.infoTitle')}</h3>
                            <p className="text-blue-500/70 font-bold text-[11px] leading-relaxed italic">
                                {t('serverImport.infoDescription')}
                            </p>
                        </div>
                    </div>

                    {/* Mobile Only: Action Button */}
                    <div className="md:hidden pt-2">
                        <Button 
                            size="lg" 
                            onClick={handleStartImport}
                            disabled={saving}
                            className="w-full h-12 font-black uppercase tracking-widest shadow-xl shadow-primary/20 rounded-2xl text-[10px]"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {t('common.saving')}
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    {t('serverImport.createImport')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Background Effect */}
            <div className="fixed inset-0 bg-linear-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none -z-10" />
        </div>
    )
}
