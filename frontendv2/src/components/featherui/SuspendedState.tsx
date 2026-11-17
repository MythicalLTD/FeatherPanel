/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { cn } from '@/lib/utils';

export interface SuspendedStateDetail {
    label: ReactNode;
    value: ReactNode;
}

interface SuspendedStateProps {
    /** Short status label shown in the badge, e.g. "Suspended". */
    statusLabel: ReactNode;
    title: ReactNode;
    description: ReactNode;
    /** Name of the suspended resource, shown next to the badge. */
    resourceName?: string | null;
    details?: SuspendedStateDetail[];
    backHref: string;
    backLabel: ReactNode;
    supportUrl?: string | null;
    supportLabel: ReactNode;
    className?: string;
}

/**
 * Full-page state shown in place of a resource (server, VDS, WebSpace) that has been suspended.
 * Deliberately quiet: neutral card, a small status badge as the only accent.
 */
export function SuspendedState({
    statusLabel,
    title,
    description,
    resourceName,
    details,
    backHref,
    backLabel,
    supportUrl,
    supportLabel,
    className,
}: SuspendedStateProps) {
    const visibleDetails = (details ?? []).filter((detail) => detail.value !== null && detail.value !== '');

    return (
        <div className={cn('flex min-h-[60vh] items-center justify-center px-4 py-10', className)}>
            <section className='border-border bg-card text-card-foreground w-full max-w-lg overflow-hidden rounded-xl border'>
                <div className='p-6 sm:p-8'>
                    <div className='flex min-w-0 items-center gap-2.5'>
                        <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400'>
                            <span className='h-1.5 w-1.5 rounded-full bg-red-500' aria-hidden='true' />
                            {statusLabel}
                        </span>
                        {resourceName && (
                            <span className='text-muted-foreground min-w-0 truncate font-mono text-xs'>
                                {resourceName}
                            </span>
                        )}
                    </div>

                    <h2 className='mt-4 text-xl font-semibold tracking-tight'>{title}</h2>
                    <p className='text-muted-foreground mt-2 text-sm leading-relaxed whitespace-pre-line'>
                        {description}
                    </p>

                    {visibleDetails.length > 0 && (
                        <dl className='border-border divide-border mt-6 divide-y rounded-lg border text-sm'>
                            {visibleDetails.map((detail, index) => (
                                <div key={index} className='flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4'>
                                    <dt className='text-muted-foreground shrink-0 sm:w-28'>{detail.label}</dt>
                                    <dd className='min-w-0 break-words'>{detail.value}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </div>

                <div className='border-border bg-muted/30 flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end sm:px-8'>
                    {supportUrl && (
                        <Button asChild variant='outline' size='sm'>
                            <a href={supportUrl} target='_blank' rel='noopener noreferrer'>
                                {supportLabel}
                                <ExternalLink className='ml-1.5 h-3.5 w-3.5' aria-hidden='true' />
                            </a>
                        </Button>
                    )}
                    <Button asChild size='sm'>
                        <Link href={backHref}>
                            <ArrowLeft className='mr-1.5 h-3.5 w-3.5' aria-hidden='true' />
                            {backLabel}
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
