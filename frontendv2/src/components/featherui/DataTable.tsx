/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/
'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode, ComponentType, MouseEvent } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export interface DataTableColumn<T> {
    key: string;
    header: ReactNode;
    cell: (row: T) => ReactNode;
    /** Extra classes for the header and cells of this column (width, alignment, hiding below a breakpoint). */
    className?: string;
}

interface DataTableProps<T> {
    rows: T[];
    columns: DataTableColumn<T>[];
    rowKey: (row: T) => string | number;
    /** Card shown for each row on phones and small tablets. */
    mobileCard: (row: T) => ReactNode;
    /** Row actions (buttons or a menu), shown in the last column and on the mobile card. */
    actions?: (row: T) => ReactNode;
    actionsHeader?: ReactNode;
    onRowClick?: (row: T) => void;
    className?: string;
}

/** Admin list: a real table on desktop (lg and up), a stack of compact cards below. */
export function DataTable<T>({
    rows,
    columns,
    rowKey,
    mobileCard,
    actions,
    actionsHeader,
    onRowClick,
    className,
}: DataTableProps<T>) {
    return (
        <div className={className}>
            <div className='fp-surface hidden overflow-x-auto rounded-xl border lg:block'>
                <table className='w-full text-sm'>
                    <thead>
                        <tr className='border-b border-[var(--fp-surface-border)]'>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope='col'
                                    className={cn(
                                        'text-muted-foreground px-4 py-3 text-left text-xs font-medium',
                                        col.className,
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {actions ? (
                                <th
                                    scope='col'
                                    className='text-muted-foreground px-4 py-3 text-right text-xs font-medium'
                                >
                                    {actionsHeader}
                                </th>
                            ) : null}
                        </tr>
                    </thead>
                    <tbody className='divide-y divide-[var(--fp-surface-border)]'>
                        {rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                className={cn(
                                    'hover:bg-primary/[0.04] transition-colors',
                                    onRowClick && 'cursor-pointer',
                                )}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className={cn('px-4 py-3 align-middle', col.className)}>
                                        {col.cell(row)}
                                    </td>
                                ))}
                                {actions ? (
                                    <td
                                        className='px-4 py-2 text-right align-middle whitespace-nowrap'
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className='inline-flex items-center justify-end gap-1'>{actions(row)}</div>
                                    </td>
                                ) : null}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ul className='space-y-2 lg:hidden'>
                {rows.map((row) => (
                    <li
                        key={rowKey(row)}
                        className={cn('fp-surface rounded-xl border p-3.5', onRowClick && 'cursor-pointer')}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                        {mobileCard(row)}
                        {actions ? (
                            <div
                                className='mt-3 flex items-center justify-end gap-1 border-t border-[var(--fp-surface-border)] pt-2.5'
                                onClick={(e) => e.stopPropagation()}
                            >
                                {actions(row)}
                            </div>
                        ) : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Coloured pill for a status or priority that comes with its own colour. */
export function ColorPill({ color, children }: { color?: string | null; children: ReactNode }) {
    const c = color || '#94a3b8';
    return (
        <span
            className='inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap'
            style={{ backgroundColor: `${c}1f`, color: c, borderColor: `${c}40` }}
        >
            <span className='h-1.5 w-1.5 rounded-full' style={{ backgroundColor: c }} aria-hidden />
            {children}
        </span>
    );
}

export interface RowAction {
    label: string;
    icon?: ComponentType<{ className?: string }>;
    onClick?: () => void;
    href?: string;
    destructive?: boolean;
    disabled?: boolean;
    /** Draw a divider above this item. */
    separated?: boolean;
    hidden?: boolean;
}

/** Three-dot menu for a table row. */
export function RowActionsMenu({ items }: { items: RowAction[] }) {
    const { t } = useTranslation();
    const router = useRouter();
    const visible = items.filter((i) => !i.hidden);
    if (visible.length === 0) return null;
    return (
        <DropdownMenu as='div' className='relative inline-block text-left'>
            <DropdownMenuTrigger
                aria-label={t('common.more_actions')}
                title={t('common.more_actions')}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                className='text-muted-foreground hover:text-foreground hover:bg-primary/10 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none'
            >
                <MoreHorizontal className='h-4 w-4' />
            </DropdownMenuTrigger>
            <DropdownMenuContent className='min-w-44'>
                {visible.map((item, i) => {
                    const Icon = item.icon;
                    const inner = (
                        <>
                            {Icon ? <Icon className='mr-2 h-4 w-4 shrink-0' /> : null}
                            {item.label}
                        </>
                    );
                    const cls = cn(item.destructive && 'text-destructive hover:text-destructive');
                    return (
                        <div key={item.label + i}>
                            {item.separated && i > 0 ? <DropdownMenuSeparator /> : null}
                            <DropdownMenuItem
                                className={cls}
                                disabled={item.disabled}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.href) router.push(item.href);
                                    else item.onClick?.();
                                }}
                            >
                                {inner}
                            </DropdownMenuItem>
                        </div>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** First column of a row: avatar or icon, a title and a muted subtitle. */
export function TableIdentity({
    title,
    subtitle,
    avatarUrl,
    icon: Icon,
    fallback,
    rounded = 'lg',
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    avatarUrl?: string | null;
    icon?: ComponentType<{ className?: string }>;
    /** Initials shown when there is no avatar or icon. */
    fallback?: string;
    rounded?: 'lg' | 'full';
}) {
    return (
        <div className='flex min-w-0 items-center gap-3'>
            <div
                className={cn(
                    'fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden',
                    rounded === 'full' ? 'rounded-full' : 'rounded-lg',
                )}
            >
                {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt='' className='h-full w-full object-cover' />
                ) : Icon ? (
                    <Icon className='text-primary h-4 w-4' />
                ) : (
                    <span className='text-primary text-xs font-semibold uppercase'>{fallback?.slice(0, 2)}</span>
                )}
            </div>
            <div className='min-w-0'>
                <div className='text-foreground truncate font-medium'>{title}</div>
                {subtitle ? <div className='text-muted-foreground truncate text-xs'>{subtitle}</div> : null}
            </div>
        </div>
    );
}

/** Small status dot with a label, for online/offline or active/suspended style columns. */
export function StatusDot({
    tone,
    children,
}: {
    tone: 'success' | 'warning' | 'danger' | 'muted';
    children: ReactNode;
}) {
    const dot = {
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        muted: 'bg-muted-foreground/50',
    }[tone];
    return (
        <span className='inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap'>
            <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
            {children}
        </span>
    );
}
