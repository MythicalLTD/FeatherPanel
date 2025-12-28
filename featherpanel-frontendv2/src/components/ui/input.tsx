'use client'

import { Field, Label, Input as HeadlessInput, Description } from '@headlessui/react'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, icon, className = '', ...props }, ref) => {
    return (
      <Field>
        {label && (
          <Label className="block text-sm font-semibold text-foreground mb-2">
            {label}
          </Label>
        )}
        {description && (
          <Description className="text-sm text-muted-foreground mb-2">
            {description}
          </Description>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
              {icon}
            </div>
          )}
          <HeadlessInput
            ref={ref}
            className={`
              w-full rounded-xl border bg-background/50 backdrop-blur-sm text-sm
              transition-all duration-200
              ${icon ? 'pl-10 pr-4' : 'px-4'} py-3
              ${error 
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20' 
                : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border'
              }
              focus:outline-none focus:ring-4
              disabled:cursor-not-allowed disabled:opacity-50
              placeholder:text-muted-foreground/50
              shadow-sm hover:shadow-md focus:shadow-lg
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <Description className="text-sm text-destructive mt-2 flex items-center gap-1 animate-fade-in">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </Description>
        )}
      </Field>
    )
  }
)

Input.displayName = 'Input'

export { Input, Field, Label }
