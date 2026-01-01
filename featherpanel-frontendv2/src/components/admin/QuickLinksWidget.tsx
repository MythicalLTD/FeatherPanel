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
import Link from 'next/link'
import { ExternalLink, BookOpen, MessageSquare, Settings, Zap, Trash2 } from 'lucide-react'
import { useTranslation } from '@/contexts/TranslationContext'
import { PageCard } from '@/components/featherui/PageCard'
import { cn } from '@/lib/utils'

interface QuickLinksWidgetProps {
    onClearCache: () => void
    isClearingCache: boolean
}

export function QuickLinksWidget({ onClearCache, isClearingCache }: QuickLinksWidgetProps) {
    const { t } = useTranslation()

    const links = [
        {
            name: t('admin.quick_links.system_settings'),
            icon: Settings,
            href: '/admin/settings',
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
            external: false
        },
        {
            name: t('admin.quick_links.documentation'),
            icon: BookOpen,
            href: 'https://docs.featherpanel.com',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            external: true
        },
        {
            name: t('admin.quick_links.support_discord'),
            icon: MessageSquare,
            href: 'https://discord.mythical.systems',
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            external: true
        }
    ]

    return (
        <PageCard
            title={t('admin.quick_links.title')}
            description={t('admin.quick_links.description')}
            icon={Zap}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {links.map((link) => (
                    <Link
                        key={link.name}
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-muted/10 border border-border/50 hover:bg-muted/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                    >
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border transition-all group-hover:first-letter:rotate-12", link.bg, link.color, link.border)}>
                            <link.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-widest truncate">{link.name}</p>
                            {link.external && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50 absolute top-4 right-4" />}
                        </div>
                    </Link>
                ))}

                <button
                    onClick={onClearCache}
                    disabled={isClearingCache}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all group text-start w-full"
                >
                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center border border-red-500/20 bg-red-500/10 text-red-500 transition-all",
                        isClearingCache && "animate-pulse"
                    )}>
                        <Trash2 className={cn("h-5 w-5", isClearingCache && "animate-spin")} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-widest text-red-500 truncate">{t('admin.quick_links.clear_system_cache')}</p>
                    </div>
                </button>
            </div>
        </PageCard>
    )
}
