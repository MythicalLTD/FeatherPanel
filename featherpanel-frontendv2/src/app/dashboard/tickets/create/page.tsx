/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import {
    Paperclip,
    X,
    Upload,
    ChevronLeft,
    ChevronsUpDown,
    Trash2,
    Server as ServerIcon
} from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { HeadlessSelect } from '@/components/ui/headless-select'
import { ServerSelectionModal } from '@/components/dashboard/ServerSelectionModal'
import { toast } from 'sonner'

// Types
interface Category {
    id: number
    name: string
    icon?: string
}

interface Priority {
    id: number
    name: string
}

interface Server {
    id: number
    uuid: string
    uuidShort: string
    name: string
}

interface CreateTicketResponse {
    success: boolean
    data: {
        ticket: {
            uuid: string
        }
        message_id: number
    }
    message?: string
}

interface ServerResponse {
    success: boolean
    data: {
        servers: Server[]
    }
    // Backward compatibility or alternative structure
    items?: Server[]
}

export default function CreateTicketPage() {
    const { t } = useTranslation()
    const router = useRouter()
    
    // State
    const [isLoading, setIsLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [categories, setCategories] = useState<Category[]>([])
    const [priorities, setPriorities] = useState<Priority[]>([])
    const [servers, setServers] = useState<Server[]>([])
    
    // Form
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [categoryId, setCategoryId] = useState<string | number>('')
    const [priorityId, setPriorityId] = useState<string | number>('')
    const [serverId, setServerId] = useState<string | number>('')
    
    // Attachments
    const [files, setFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [serverModalOpen, setServerModalOpen] = useState(false)

    // Initial Fetch
    const [serversLoading, setServersLoading] = useState(false)

    // using useCallback to prevent infinite loops in the modal's useEffect
    const fetchServers = useCallback(async (query = '') => {
        setServersLoading(true)
        try {
            const params = query ? { search: query } : {}
            const res = await axios.get<ServerResponse>('/api/user/tickets/servers', { params })
            
            // Handle potentially different response structures depending on API version
            // API response: { success: true, data: { servers: [] } }
            const data = res.data
            // Prioritize data.servers, then data.items (legacy?), then root items (legacy?)
            const items = data.data?.servers || (data.data as unknown as { items: Server[] })?.items || (data as { items: Server[] })?.items || []
            setServers(items)
        } catch (error) {
            console.error('Failed to search servers', error)
        } finally {
            setServersLoading(false)
        }
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Using unknown cast for safety
                const [catsRes, priosRes] = await Promise.all([
                    axios.get('/api/user/tickets/categories').catch(() => ({ data: { data: { categories: [] } } })),
                    axios.get('/api/user/tickets/priorities').catch(() => ({ data: { data: { priorities: [] } } }))
                ])
                
                // Fetch servers initially
                fetchServers()
                
                const cats = (catsRes.data as { data: { categories: Category[] } })?.data?.categories || []
                const prios = (priosRes.data as { data: { priorities: Priority[] } })?.data?.priorities || []

                setCategories(cats)
                setPriorities(prios)
            } catch (error: unknown) {
                console.error('Failed to fetch form data', error)
                toast.error(t('tickets.failedToLoadCategories'))
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [t, fetchServers])

    // File Handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            addFiles(Array.from(e.target.files))
        }
    }

    const addFiles = (newFiles: File[]) => {
        const maxSize = 50 * 1024 * 1024 // 50MB
        const validFiles = newFiles.filter(file => {
             if (file.size > maxSize) {
                 toast.error(t('tickets.fileTooLarge').replace('{name}', file.name))
                 return false
             }
             return true
        })
        setFiles(prev => [...prev, ...validFiles])
    }

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files) {
            addFiles(Array.from(e.dataTransfer.files))
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!title.trim() || !description.trim() || !categoryId || !priorityId) {
            toast.error(t('tickets.fillRequiredFields'))
            return
        }

        setCreating(true)
        try {
            const payload = {
                title: title.trim(),
                description: description.trim(),
                category_id: Number(categoryId),
                priority_id: Number(priorityId),
                server_id: serverId ? Number(serverId) : undefined
            }

            const { data } = await axios.put<CreateTicketResponse>('/api/user/tickets', payload)
            
            if (data.success && data.data.ticket) {
                const ticketUuid = data.data.ticket.uuid
                const messageId = data.data.message_id

                // Upload files
                if (files.length > 0 && messageId) {
                    for (const file of files) {
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('message_id', String(messageId))
                        
                        try {
                            await axios.post(`/api/user/tickets/${ticketUuid}/attachments`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                            })
                        } catch (err: unknown) {
                            console.error('Failed to upload attachment', err)
                        }
                    }
                }

                toast.success(t('tickets.ticketCreated'))
                router.push(`/dashboard/tickets/${ticketUuid}`)
            } else {
                throw new Error(data.message || 'Failed to create ticket')
            }

        } catch (error: unknown) {
            console.error('Failed to create ticket', error)
            const err = error as { response?: { data?: { message?: string } }, message?: string }
            const msg = err?.response?.data?.message || err?.message || t('tickets.failedToCreate')
            toast.error(msg)
        } finally {
            setCreating(false)
        }
    }

    // Prepare Options for Selects
    const categoryOptions = [
        { id: '', name: t('tickets.selectCategory') },
        ...categories.map(c => ({ id: c.id, name: c.name, image: c.icon }))
    ]
    const priorityOptions = [
        { id: '', name: t('tickets.selectPriority') },
        ...priorities.map(p => ({ id: p.id, name: p.name }))
    ]


    return (
        <div className="max-w-4xl mx-auto pb-12">
             <div className="flex items-start gap-4 mb-8">
                 <Link href="/dashboard/tickets">
                     <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 border border-border/50 hover:bg-card hover:text-foreground">
                         <ChevronLeft className="h-5 w-5" />
                     </Button>
                 </Link>
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">{t('tickets.createTicket')}</h1>
                    <p className="text-muted-foreground text-lg">{t('tickets.createTicketDescription')}</p>
                 </div>
             </div>

             <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
                 <form onSubmit={handleSubmit} className="p-8 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Title */}
                         <div className="md:col-span-2">
                             <Input 
                                id="title"
                                label={t('tickets.titleLabel')}
                                description={t('tickets.titleDescription') || "Enter a concise summary of the issue you are facing."}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('tickets.titlePlaceholder')}
                                required
                                className="h-11"
                             />
                         </div>

                         {/* Category */}
                         <div className="space-y-2.5">
                             <HeadlessSelect
                                label={t('tickets.categoryLabel')}
                                description={t('tickets.categoryDescription') || "Select the category that best describes your issue."}
                                value={categoryId}
                                onChange={setCategoryId}
                                options={categoryOptions}
                                placeholder={t('tickets.selectCategory')}
                             />
                         </div>

                         {/* Priority */}
                         <div className="space-y-2.5">
                             <HeadlessSelect
                                label={t('tickets.priorityLabel')}
                                description={t('tickets.priorityDescription') || "Choose the urgency of your request."}
                                value={priorityId}
                                onChange={setPriorityId}
                                options={priorityOptions}
                                placeholder={t('tickets.selectPriority')}
                             />
                         </div>

                         {/* Description */}
                         <div className="md:col-span-2">
                             <Textarea 
                                id="description"
                                label={t('tickets.descriptionLabel')}
                                description={t('tickets.descriptionDetail') || "Please provide as much detail as possible so we can assist you better."}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('tickets.descriptionPlaceholder')}
                                rows={6}
                                required
                                className="resize-y min-h-[120px]"
                             />
                         </div>

                         {/* Server (Optional) */}
                         <div className="md:col-span-2 space-y-2.5">
                             <div className="flex justify-between items-center">
                                 <Label className="text-sm font-medium">{t('tickets.serverLabel')}</Label>
                                 <span className="text-xs text-muted-foreground capitalize">{t('common.optional')}</span>
                             </div>
                             
                             <div className="flex gap-2">
                                 <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 justify-between h-auto py-3 px-4 rounded-xl border-border/50 hover:bg-card hover:border-primary/50 text-left font-normal"
                                    onClick={() => setServerModalOpen(true)}
                                 >
                                     <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1 rounded bg-muted/50">
                                            <ServerIcon className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <span className={serverId ? "text-foreground font-medium" : "text-muted-foreground"}>
                                            {serverId 
                                                ? servers.find(s => s.id === Number(serverId))?.name || t('tickets.selectServer')
                                                : t('tickets.selectServer')
                                            }
                                        </span>
                                     </div>
                                     <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-50 ml-2 shrink-0" />
                                 </Button>
                                 
                                 {serverId && (
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-auto w-12 rounded-xl border border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                        onClick={() => setServerId('')}
                                        title={t('tickets.clearServerSelection') || "Clear server selection"}
                                     >
                                         <Trash2 className="h-5 w-5" />
                                     </Button>
                                 )}
                             </div>
                             
                             <p className="text-xs text-muted-foreground">{t('tickets.serverHint')}</p>
                         </div>

                         {/* Attachments */}
                         <div className="md:col-span-2 space-y-4">
                             <Label className="text-sm font-medium">{t('tickets.attachmentsOptional')}</Label>
                             <div
                                className={`group border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50 hover:bg-muted/50'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                             >
                                 <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    multiple 
                                    onChange={handleFileSelect}
                                 />
                                 <div className="flex flex-col items-center gap-3">
                                     <div className={`p-3 rounded-full transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary '}`}>
                                         <Upload className="h-6 w-6" />
                                     </div>
                                     <div className="space-y-1">
                                         <p className="text-sm font-medium text-foreground">
                                             <span className="text-primary hover:underline">{t('tickets.clickToUpload')}</span> {t('tickets.orDragAndDrop')}
                                         </p>
                                         <p className="text-xs text-muted-foreground">{t('tickets.maxFileSize')}</p>
                                     </div>
                                 </div>
                             </div>
                             
                             {/* File List */}
                             {files.length > 0 && (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                     {files.map((file, idx) => (
                                         <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors group">
                                             <div className="flex items-center gap-3 min-w-0">
                                                 <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                                                 <div className="min-w-0">
                                                     <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                                                     <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                                 </div>
                                             </div>
                                             <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeFile(idx)}
                                             >
                                                 <X className="h-4 w-4" />
                                             </Button>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                     </div>

                     <div className="pt-4 flex justify-end gap-3">
                         <Link href="/dashboard/tickets">
                             <Button type="button" variant="outline" size="lg" className="border-border/50">
                                 {t('common.cancel')}
                             </Button>
                         </Link>
                         <Button type="submit" size="lg" className="px-8 shadow-md shadow-primary/20" loading={creating} disabled={isLoading}>
                             {creating ? t('tickets.creating') : t('tickets.createTicketButton')}
                         </Button>
                     </div>
                 </form>

             </div>

             <ServerSelectionModal
                isOpen={serverModalOpen}
                onClose={() => setServerModalOpen(false)}
                servers={servers}
                selectedServerId={serverId}
                onSelect={(server) => setServerId(server.id)}
                loading={serversLoading}
                onSearch={fetchServers}
             />
        </div>
    )
}
