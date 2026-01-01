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

import * as React from 'react'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { cn } from '@/lib/utils'

export const DropdownMenu = Menu
export const DropdownMenuTrigger = MenuButton

export function DropdownMenuContent({ children, align = 'end', className }: { children: React.ReactNode, align?: 'start' | 'end', className?: string }) {
  return (
    <Transition
      as={React.Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <MenuItems
        anchor={align === 'end' ? 'bottom end' : 'bottom start'}
        className={cn(
          'z-50 min-w-32 overflow-hidden rounded-xl border border-border/40 bg-card/90 backdrop-blur-xl p-1 shadow-2xl focus:outline-none',
          className
        )}
      >
        {children}
      </MenuItems>
    </Transition>
  )
}

export function DropdownMenuItem({ children, onClick, className, disabled }: { children: React.ReactNode, onClick?: () => void, className?: string, disabled?: boolean }) {
  return (
    <MenuItem disabled={disabled}>
      {({ focus, disabled }) => (
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            focus && 'bg-primary/10 text-primary',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          {children}
        </button>
      )}
    </MenuItem>
  )
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('-mx-1 my-1 h-px bg-border/40', className)} />
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn('px-3 py-2 text-xs font-semibold text-muted-foreground', className)}>{children}</div>
}
