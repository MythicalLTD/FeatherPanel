'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

export interface ResourceBadge {
    label: string
    className?: string
}

interface ResourceCardProps {
    icon: LucideIcon
    title: string
    badges?: ReactNode | ResourceBadge[]
    description?: ReactNode
    actions?: ReactNode
    className?: string
    style?: React.CSSProperties
    iconWrapperClassName?: string
    iconClassName?: string
    onClick?: () => void
}

export function ResourceCard({
    icon: Icon,
    title,
    badges,
    description,
    actions,
    className,
    style,
    iconWrapperClassName,
    iconClassName,
    onClick
}: ResourceCardProps) {
    const renderBadges = () => {
        if (!badges) return null
        
        // Check if badges is an array of ResourceBadge objects (has label property)
        if (Array.isArray(badges) && badges.length > 0 && typeof badges[0] === 'object' && badges[0] && 'label' in badges[0]) {
            return (badges as ResourceBadge[]).map((badge, i) => (
                <span 
                    key={i} 
                    className={cn(
                        "px-2 py-1 rounded-md text-xs font-medium border", 
                        badge.className || "bg-secondary text-secondary-foreground border-transparent"
                    )}
                >
                    {badge.label}
                </span>
            ))
        }

        return badges as ReactNode
    }

    return (
        <div 
            onClick={onClick}
            style={style}
            className={cn(
                "group relative overflow-hidden rounded-3xl bg-card border border-border/50 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 shadow-sm",
                onClick && "cursor-pointer",
                className
            )}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="p-6 flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                <div className={cn(
                    "h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 shadow-inner",
                    iconWrapperClassName
                )}>
                    <Icon className={cn("h-8 w-8 text-primary", iconClassName)} />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-bold truncate tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {title}
                        </h3>
                        {renderBadges()}
                    </div>

                    {description && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            {description}
                        </div>
                    )}
                </div>

                {actions && (
                    <div className="flex items-center gap-2 md:self-center">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    )
}
