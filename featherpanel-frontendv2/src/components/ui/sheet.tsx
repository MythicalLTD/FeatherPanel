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
import { Dialog as HeadlessDialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface SheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
    className?: string
}

export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
    return (
        <Transition show={open} as={React.Fragment}>
            <HeadlessDialog as="div" className="relative z-50" onClose={() => onOpenChange(false)}>
                <TransitionChild
                    as={React.Fragment}
                    enter="ease-in-out duration-500"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-500"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                            <TransitionChild
                                as={React.Fragment}
                                enter="transform transition ease-in-out duration-500 sm:duration-700"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-500 sm:duration-700"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <DialogPanel className={cn("pointer-events-auto w-screen max-w-2xl transform transition-all", className)}>
                                    <div className="flex h-full flex-col overflow-y-scroll bg-background/95 backdrop-blur-xl py-6 shadow-2xl border-l border-border/50">
                                        <div className="px-4 sm:px-6">
                                            <div className="flex items-start justify-between">
                                                <div className="ml-3 flex h-7 items-center absolute right-6 top-6 z-20">
                                                    <button
                                                        type="button"
                                                        className="relative rounded-xl bg-muted/50 p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-all focus:outline-hidden"
                                                        onClick={() => onOpenChange(false)}
                                                    >
                                                        <span className="absolute -inset-2.5" />
                                                        <span className="sr-only">Close panel</span>
                                                        <X className="h-5 w-5" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative mt-6 flex-1 px-4 sm:px-8">
                                            {children}
                                        </div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </div>
            </HeadlessDialog>
        </Transition>
    )
}

export function SheetHeader({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn('mb-6', className)}>{children}</div>
}

export function SheetTitle({ children, className }: { children: React.ReactNode, className?: string }) {
    return <h2 className={cn('text-2xl font-bold tracking-tight', className)}>{children}</h2>
}

export function SheetDescription({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn('mt-2 text-muted-foreground', className)}>{children}</div>
}

export function SheetFooter({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={cn('mt-auto pt-6 border-t border-border/50 flex gap-4', className)}>{children}</div>
}
