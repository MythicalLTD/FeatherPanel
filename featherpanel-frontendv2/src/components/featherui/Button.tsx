"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"

// Manual variant mapping instead of cva
const variants = {
    default: "bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 hover:shadow-primary/30",
    destructive: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 shadow-lg shadow-red-500/10 hover:scale-[1.02] active:scale-95",
    outline: "border border-white/10 bg-white/5 hover:bg-white/10 text-foreground backdrop-blur-sm",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    warning: "bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 shadow-lg shadow-red-500/10 hover:scale-[1.02] active:scale-95",
    glass: "bg-background/50 backdrop-blur-md border border-border/40 hover:bg-background/80",
    plain: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
}

const sizes = {
    default: "h-11 px-6",
    sm: "h-9 rounded-xl px-4 text-xs tracking-wide uppercase",
    lg: "h-14 rounded-2xl px-10 text-base uppercase tracking-widest",
    icon: "h-11 w-11",
}

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof variants
    size?: keyof typeof sizes
    asChild?: boolean
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, loading, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 overflow-hidden relative"
        
        return (
            <Comp
                className={cn(
                    baseStyles,
                    variants[variant],
                    sizes[size],
                    className
                )}
                ref={ref}
                disabled={disabled || loading}
                {...props}
            >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button }
