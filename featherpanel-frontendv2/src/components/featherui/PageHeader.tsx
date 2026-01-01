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
