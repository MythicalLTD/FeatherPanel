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

import React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    title: string
    description: string
    icon: LucideIcon
    action?: React.ReactNode
    className?: string
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/10 rounded-[3rem] border border-dashed border-border/60 backdrop-blur-sm",
                className
            )}
        >
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="relative h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 rotate-3">
                    <Icon className="h-16 w-16 text-primary" />
                </div>
            </div>
            <div className="max-w-md space-y-3 px-4">
                <h2 className="text-3xl font-black uppercase tracking-tight">{title}</h2>
                <p className="text-muted-foreground text-lg leading-relaxed font-medium">{description}</p>
            </div>
            {action && <div className="mt-8">{action}</div>}
        </div>
    )
}
