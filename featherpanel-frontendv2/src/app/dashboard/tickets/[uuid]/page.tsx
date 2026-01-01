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

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import axios, { AxiosError } from 'axios'
import ReactMarkdown from 'react-markdown'
import {
    ArrowLeft,
    Paperclip,
    Trash2,
    Send,
    AlertCircle,
    X,
    Server as ServerIcon,
    XCircle,
} from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'
import { useSession } from '@/contexts/SessionContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle 
} from '@/components/ui/card'
import { toast } from 'sonner'
import clsx from 'clsx'
import { usePluginWidgets } from '@/hooks/usePluginWidgets'
import { WidgetRenderer } from '@/components/server/WidgetRenderer'

// Types
interface ApiTicket {
    id: number
    uuid: string
    title: string
    description: string
    created_at: string
    closed_at?: string
    status?: {
        id: number
        name: string
        color?: string
    }
    priority?: {
        id: number
        name: string
        color?: string
    }
    category?: {
        id: number
        name: string
        icon?: string
    }
    server?: {
        id: number
        name: string
    }
}

interface ApiTicketMessage {
    id: number
    message: string
    is_internal: boolean | number
    created_at: string
    user?: {
        uuid: string
        username: string
        avatar?: string
        first_name?: string
        last_name?: string
        role?: {
            id: number
            name: string
            color?: string
        }
    }
    attachments?: Array<{
        id: number
        file_name: string;
        file_size: number;
        url: string;
    }>
}

interface TicketResponse {
    success: boolean
    data: {
        ticket: ApiTicket
        messages: ApiTicketMessage[]
    }
    message?: string
}

interface ReplyResponse {
    success: boolean
    data: {
        message_id: number
    }
}

export default function TicketViewPage() {
    const { uuid } = useParams()
    const { t } = useTranslation()
    const { user: currentUser } = useSession()
    
    // State
    const [loading, setLoading] = useState(true)
    const [ticket, setTicket] = useState<ApiTicket | null>(null)
    const [messages, setMessages] = useState<ApiTicketMessage[]>([])
    const [error, setError] = useState<string | null>(null)
    
    // Reply Form
    const [replyMessage, setReplyMessage] = useState('')
    const [replying, setReplying] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    
    // Scroll Ref
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Initial Fetch
    const fetchTicketDetails = async () => {
        try {
            const { data } = await axios.get<TicketResponse>(`/api/user/tickets/${uuid}`)
            if (data.success) {
                setTicket(data.data.ticket)
                // Sort messages by created_at OLD -> NEW (Ascending)
                const sortedMessages = [...(data.data.messages || [])].sort((a, b) => {
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                })
                setMessages(sortedMessages)
            } else {
                setError(t('tickets.failedToLoad'))
            }
        } catch (err: unknown) {
            console.error('Failed to load ticket', err)
            const error = err as AxiosError<{ message: string }>
            setError(error.response?.data?.message || t('tickets.failedToLoad'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (uuid) {
            fetchTicketDetails()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uuid])

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    // File Handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFiles(Array.from(e.target.files))
    }

    const addFiles = (newFiles: File[]) => {
        const maxSize = 50 * 1024 * 1024
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
    
    // Reply Submit
    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!replyMessage.trim() && files.length === 0) return

        setReplying(true)
        try {
            const { data } = await axios.post<ReplyResponse>(`/api/user/tickets/${uuid}/reply`, {
                message: replyMessage
            })

            const messageId = data.data?.message_id
            
            // Upload attachments
            if (files.length > 0 && messageId) {
                for (const file of files) {
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append('message_id', String(messageId))
                    await axios.post(`/api/user/tickets/${uuid}/attachments`, formData)
                }
            }

            toast.success(t('tickets.replySent'))
            setReplyMessage('')
            setFiles([])
            fetchTicketDetails()
        } catch (err: unknown) {
             console.error('Failed to send reply', err)
             const error = err as AxiosError<{ message: string }>
             toast.error(error.response?.data?.message || t('tickets.failedToSendReply'))
        } finally {
            setReplying(false)
        }
    }

    const { getWidgets, fetchWidgets } = usePluginWidgets('dashboard-tickets-view')

    useEffect(() => {
        fetchWidgets()
    }, [fetchWidgets])

    const deleteMessage = async (messageId: number) => {
        if (!confirm(t('tickets.deleteMessageConfirm'))) return 
        
        try {
            await axios.delete(`/api/user/tickets/${uuid}/messages/${messageId}`)
            toast.success(t('tickets.messageDeleted'))
            fetchTicketDetails()
        } catch (err) {
             console.error('Failed to delete message', err)
             toast.error(t('tickets.failedToDeleteMessage'))
        }
    }

    const canDeleteMessage = (message: ApiTicketMessage) => {
        if (!currentUser || !message.user) return false
        return currentUser.uuid === message.user.uuid && !ticket?.closed_at
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
        )
    }

    if (error || !ticket) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive opacity-50" />
                <h3 className="text-xl font-medium">{error || t('tickets.ticketNotFound')}</h3>
                <Link href="/dashboard/tickets">
                    <Button variant="outline">{t('tickets.backToTickets')}</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-6rem)] flex flex-col pt-2 pb-6">
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'top-of-page')} />
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0 px-1">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/tickets">
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                         <h1 className="text-xl font-bold tracking-tight line-clamp-1">{ticket.title}</h1>
                         <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <span className="font-mono">#{ticket.id}</span>
                             <span>•</span>
                             <span>{new Date(ticket.created_at).toLocaleString()}</span>
                         </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Actions if needed, e.g. Close Ticket Button */}
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'after-header')} />

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Chat Area (Left) */}
                <div className="lg:col-span-8 flex flex-col bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden h-full">
                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-8">
                         {/* Original Ticket Description as first message */}
                        <div className="flex gap-4 group">
                             <Avatar className="h-10 w-10 mt-1 ring-2 ring-border/50">
                                <AvatarFallback>OP</AvatarFallback>
                             </Avatar>
                             <div className="flex-1 space-y-1 max-w-[85%]">
                                 <div className="flex items-center gap-2">
                                     <span className="font-semibold text-sm">{t('tickets.originalRequest')}</span>
                                     <span className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString()}</span>
                                 </div>
                                <div className="p-4 rounded-2xl rounded-tl-sm bg-muted/30 border border-border/30 text-sm leading-relaxed whitespace-pre-wrap">
                                    <ReactMarkdown>{ticket.description}</ReactMarkdown>
                                </div>
                             </div>
                        </div>

                        {/* Divider */}
                        {messages.length > 0 && (
                            <div className="relative flex items-center py-2">
                                <div className="grow border-t border-border/50"></div>
                                <span className="shrink-0 mx-4 text-xs font-medium text-muted-foreground uppercase">{t('tickets.conversation')}</span>
                                <div className="grow border-t border-border/50"></div>
                            </div>
                        )}

                        {/* Messages List */}
                        {messages.map((msg) => {
                            const isMe = currentUser?.uuid === msg.user?.uuid
                            const isInternal = msg.is_internal === 1 || msg.is_internal === true // Handle both number and boolean safely
                            
                            return (
                                <div 
                                    key={msg.id} 
                                    className={clsx(
                                        "flex gap-4 group", 
                                        isMe ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    <Avatar className="h-10 w-10 mt-1 ring-2 ring-border/50 shrink-0">
                                        <AvatarImage src={msg.user?.avatar} />
                                        <AvatarFallback>{msg.user?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                                    </Avatar>
                                    
                                    <div className={clsx(
                                        "flex flex-col max-w-[85%] lg:max-w-[75%]", 
                                        isMe ? "items-end" : "items-start"
                                    )}>
                                        {!isMe && (
                                             <div className="flex items-center gap-2 px-1 mb-1">
                                                 <span className="font-semibold text-sm">{msg.user?.username || t('tickets.system')}</span>
                                                {msg.user?.role && (
                                                    <Badge 
                                                        variant="secondary" 
                                                        className="text-[10px] h-4 px-1 leading-none border-0"
                                                        style={{ 
                                                            backgroundColor: msg.user.role.color ? `${msg.user.role.color}15` : undefined,
                                                            color: msg.user.role.color
                                                        }}
                                                    >
                                                        {msg.user.role.name}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}

                                        <div className={clsx(
                                            "relative px-4 py-3 text-sm shadow-sm w-fit min-w-[140px]",
                                            isInternal 
                                                ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-dashed rounded-xl"
                                                : isMe
                                                    ? "bg-primary/10 border border-primary/20 text-foreground rounded-2xl rounded-tr-sm"
                                                    : "bg-muted/80 text-foreground rounded-2xl rounded-tl-sm border border-border/50"
                                        )}>
                                            {isInternal && (
                                                 <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider opacity-80 pb-2 border-b border-yellow-500/20">
                                                     <AlertCircle className="h-3 w-3" />
                                                     {t('tickets.internalNote')}
                                                 </div>
                                            )}
                                            
                                            <div className={clsx(
                                                "prose prose-sm max-w-none wrap-break-word leading-normal text-left dark:prose-invert",
                                            )}>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({children}) => <p className="mb-1 last:mb-0 whitespace-pre-wrap">{children}</p>,
                                                        hr: () => <hr className={clsx("my-4 border-t", isMe ? "border-primary/20 dashed" : "border-border/60 dashed")} />,
                                                        ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                                        ol: ({children}) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                                        li: ({children}) => <li className="mb-0.5">{children}</li>
                                                    }}
                                                >
                                                    {msg.message
                                                        .replace(/\n---\n-\n/g, '\n---\n')
                                                        .replace(/\n---\n---\n/g, '\n---\n')
                                                        .replace(/\n\s*\n\s*\n/g, '\n\n') // Collapse excessive newlines
                                                    }
                                                </ReactMarkdown>
                                            </div>

                                            {/* Message Footer: Timestamp & Attachments */}
                                            <div className={clsx(
                                                "flex items-center gap-2 mt-1 select-none justify-end text-muted-foreground/70"
                                            )}>
                                                 <span className="text-[10px]">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>

                                            {/* Options Dropdown could go here, putting delete button for now */}
                                            {canDeleteMessage(msg) && (
                                                <button 
                                                    onClick={() => deleteMessage(msg.id)}
                                                    className={clsx(
                                                        "absolute -right-8 top-2 p-1.5 opacity-0 group-hover:opacity-100 transition-all",
                                                        "text-muted-foreground hover:text-destructive"
                                                    )}
                                                    title={t('tickets.deleteMessage')}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Attachments outside bubble for cleaner look, or inside? Screenshot shows signature inside. Attachments usually look good as separate bubbles or cards. Let's keep them below for now but right aligned. */}
                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="flex flex-wrap justify-end gap-2 mt-1">
                                                {msg.attachments.map(att => (
                                                    <a 
                                                        key={att.id} 
                                                        href={att.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50 text-xs hover:border-primary/50 transition-colors shadow-sm"
                                                    >
                                                        <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                                                            <Paperclip className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-medium truncate max-w-[120px]">{att.file_name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{formatFileSize(att.file_size)}</span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Area (Sticky Bottom) */}
                    <div className="p-4 bg-background/50 backdrop-blur-sm border-t border-border/50">
                        {ticket.closed_at ? (
                             <div className="flex items-center justify-center p-4 rounded-xl bg-muted/50 border border-dashed text-muted-foreground gap-2">
                                <XCircle className="h-5 w-5" />
                                <span className="font-medium">{t('tickets.ticketClosed')}</span>
                             </div>
                        ) : (
                            <form onSubmit={handleReply} className="relative flex flex-col gap-2">
                                {files.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/30 rounded-lg">
                                        {files.map((file, idx) => (
                                            <Badge key={idx} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-background border border-border">
                                                <span className="truncate max-w-[150px]">{file.name}</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 ml-1 transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className={clsx("shrink-0 h-[44px] w-[44px] rounded-xl text-muted-foreground hover:bg-muted font-normal", isDragging && "bg-primary/10 text-primary")}
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            setIsDragging(false)
                                            if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files))
                                        }}
                                        title={t('tickets.attachFiles')}
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </Button>

                                    <div className="relative flex-1">
                                        <Textarea 
                                            value={replyMessage}
                                            onChange={(e) => setReplyMessage(e.target.value)}
                                            placeholder={t('tickets.typeReply')}
                                            className="min-h-[44px] max-h-[200px] py-3 pr-12 resize-none rounded-xl border-border/50 bg-background hover:border-primary/50 focus:border-primary focus:ring-primary/20 shadow-sm"
                                            rows={1}
                                            style={{ height: '44px' }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = '44px';
                                                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleReply(e);
                                                }
                                            }}
                                        />
                                        <Button 
                                            type="submit" 
                                            size="icon"
                                            className="absolute right-1 top-1 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all rounded-lg"
                                            loading={replying}
                                            disabled={!replyMessage.trim() && files.length === 0}
                                        >
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    multiple 
                                    onChange={handleFileSelect} 
                                />
                            </form>
                        )}
                    </div>
                    <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'after-messages')} />
                </div>

                {/* Sidebar (Right) */}
                <div className="lg:col-span-4 space-y-4 h-full overflow-y-auto custom-scrollbar pb-6">
                    <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'sidebar-top')} />
                    {/* Status Card */}
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-2">
                             <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('tickets.details')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border/50">
                                <span className="text-sm font-medium">{t('tickets.statusLabel')}</span>
                                <Badge 
                                    className="h-6 px-2.5 text-xs uppercase"
                                    style={{ 
                                        backgroundColor: ticket.status?.color ? `${ticket.status.color}20` : undefined,
                                        color: ticket.status?.color,
                                        borderColor: ticket.status?.color ? `${ticket.status.color}40` : undefined
                                    }}
                                    variant="outline"
                                >
                                    {ticket.status?.name}
                                </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border/50">
                                <span className="text-sm font-medium">{t('tickets.priority')}</span>
                                <Badge variant="secondary" className="h-6 px-2.5 text-xs font-semibold">
                                    {ticket.priority?.name}
                                </Badge>
                            </div>

                            <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border/50">
                                <span className="text-sm font-medium">{t('tickets.category')}</span>
                                <div className="flex items-center gap-2">
                                     {ticket.category?.icon && (
                                         <div className="relative h-4 w-4 opacity-75">
                                             <Image 
                                                 src={ticket.category.icon} 
                                                 alt="" 
                                                 fill 
                                                 className="object-contain" 
                                                 sizes="16px"
                                             />
                                         </div>
                                     )}
                                     <span className="text-sm text-muted-foreground">{ticket.category?.name}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Server Info Card */}
                    {ticket.server && (
                        <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t('tickets.server')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="p-3 rounded-lg bg-background border border-border/50 flex items-center gap-3">
                                    <div className="p-2 rounded bg-muted">
                                        <ServerIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                     <div className="min-w-0 flex-1">
                                         <div className="font-medium text-sm truncate" title={ticket.server.name}>{ticket.server.name}</div>
                                         <div className="text-xs text-muted-foreground">{t('tickets.serverId')}: {ticket.server.id}</div>
                                     </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'sidebar-bottom')} />
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('dashboard-tickets-view', 'bottom-of-page')} />
        </div>
    )
}
