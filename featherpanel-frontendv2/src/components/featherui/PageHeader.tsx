import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    description?: React.ReactNode
    actions?: React.ReactNode
    className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4", className)}>
            <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tight uppercase">{title}</h1>
                {description && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="text-lg opacity-80 font-medium">{description}</div>
                    </div>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-3">
                    {actions}
                </div>
            )}
        </div>
    )
}
