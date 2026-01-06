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

import React from 'react';
import { cn } from '@/lib/utils';

interface ChangelogSectionProps {
    title: string;
    items: string[];
    color: 'emerald' | 'blue' | 'purple' | 'amber' | 'red';
    icon: string;
}

export function ChangelogSection({ title, items, color, icon }: ChangelogSectionProps) {
    if (!items || items.length === 0) return null;

    const colorClasses = {
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
    };

    const dotClasses = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        amber: 'bg-amber-500',
        red: 'bg-red-500',
    };

    return (
        <div className='space-y-4'>
            <div className='flex items-center gap-2'>
                <div
                    className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-md border text-xs font-bold',
                        colorClasses[color],
                    )}
                >
                    {icon}
                </div>
                <h4 className='text-sm font-bold uppercase tracking-wider text-muted-foreground'>{title}</h4>
            </div>
            <ul className='space-y-2'>
                {items.map((item, index) => (
                    <li key={index} className='flex items-start gap-3 group'>
                        <div
                            className={cn(
                                'mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 opacity-40 group-hover:opacity-100 transition-opacity',
                                dotClasses[color],
                            )}
                        />
                        <span className='text-sm leading-relaxed'>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
