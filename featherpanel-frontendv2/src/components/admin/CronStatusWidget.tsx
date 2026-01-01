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

import React from 'react'
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'
import { PageCard } from '@/components/featherui/PageCard'
import { cn } from '@/lib/utils'

interface CronTask {
    id: number
    task_name: string
    last_run_at: string | null
    last_run_success: boolean
    late: boolean
}

interface CronStatusWidgetProps {
    tasks?: CronTask[]
    loading?: boolean
}

export function CronStatusWidget({ tasks, loading }: CronStatusWidgetProps) {
    const { t } = useTranslation()

    return (
        <PageCard
            title={t('admin.cron.title')}
            description={t('admin.cron.description')}
            icon={Activity}
        >
            <div className="space-y-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 animate-pulse">
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-muted rounded" />
                                <div className="h-3 w-24 bg-muted rounded" />
                            </div>
                            <div className="h-6 w-16 bg-muted rounded" />
                        </div>
                    ))
                ) : tasks && tasks.length > 0 ? (
                    tasks.map((task) => (
                        <div 
                            key={task.id} 
                            className="flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-border/50 group hover:bg-muted/20 transition-all"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                    task.last_run_success && !task.late ? "bg-green-500/10 text-green-500" :
                                    task.late ? "bg-orange-500/10 text-orange-500" : "bg-red-500/10 text-red-500"
                                )}>
                                    {task.last_run_success && !task.late ? <CheckCircle2 className="h-5 w-5" /> :
                                     task.late ? <Clock className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold tracking-tight truncate">{task.task_name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold opacity-70 truncate">
                                        {t('admin.cron.last_run', { date: task.last_run_at ? new Date(task.last_run_at).toLocaleString() : t('admin.cron.never') })}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0",
                                task.last_run_success && !task.late ? "bg-green-500/20 text-green-500" :
                                task.late ? "bg-orange-500/20 text-orange-500" : "bg-red-500/20 text-red-500"
                            )}>
                                {task.last_run_success && !task.late ? t('admin.cron.healthy') : task.late ? t('admin.cron.late') : t('admin.cron.failed')}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground font-bold italic">{t('admin.cron.no_tasks')}</p>
                    </div>
                )}
            </div>
        </PageCard>
    )
}
