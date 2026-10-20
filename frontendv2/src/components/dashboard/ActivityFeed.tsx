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

import {
    Activity as ActivityIcon,
    Clock,
    Globe,
    KeyRound,
    LifeBuoy,
    Server,
    Settings,
    Trash2,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import type { Activity } from '@/types/activity';
import { Sensitive } from '@/components/common/Sensitive';
import { useTranslation } from '@/contexts/TranslationContext';
import { activityLabel } from '@/lib/activity-labels';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
    activities: Activity[];
    formatDate: (dateString: string) => string;
    /** Dashboard variant: tighter rows, no IP address. */
    compact?: boolean;
}

function iconFor(name: string): { icon: LucideIcon; tone: string } {
    const n = name.toLowerCase();
    if (n.includes('delete') || n.includes('deletion')) {
        return { icon: Trash2, tone: 'bg-rose-500/12 text-rose-600 dark:text-rose-400' };
    }
    if (/login|logout|password|two_fa|ssh_key|api_key|api_client|register/.test(n)) {
        return { icon: KeyRound, tone: 'bg-amber-500/12 text-amber-600 dark:text-amber-400' };
    }
    if (n.includes('ticket')) {
        return { icon: LifeBuoy, tone: 'bg-sky-500/12 text-sky-600 dark:text-sky-400' };
    }
    if (/server|allocation|node|vm_|webspace|spell|realm/.test(n)) {
        return { icon: Server, tone: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400' };
    }
    if (n.includes('setting')) {
        return { icon: Settings, tone: 'bg-violet-500/12 text-violet-600 dark:text-violet-400' };
    }
    if (n.includes('user') || n.includes('profile')) {
        return { icon: UserRound, tone: 'bg-primary/12 text-primary' };
    }
    return { icon: ActivityIcon, tone: 'bg-primary/12 text-primary' };
}

export function ActivityFeed({ activities, formatDate, compact = false }: ActivityFeedProps) {
    const { t } = useTranslation();

    return (
        <ul className={cn(compact ? 'space-y-1' : 'space-y-2')}>
            {activities.map((activity) => {
                const { icon: Icon, tone } = iconFor(activity.name);
                return (
                    <li
                        key={activity.id}
                        className={cn(
                            'flex min-w-0 items-start gap-3 rounded-lg',
                            compact ? 'px-1 py-2' : 'fp-surface-inset border p-3',
                        )}
                    >
                        <span
                            className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone)}
                            aria-hidden
                        >
                            <Icon className='h-4 w-4' />
                        </span>
                        <div className='min-w-0 flex-1'>
                            <div className='flex min-w-0 items-baseline justify-between gap-2'>
                                <p
                                    className='text-foreground min-w-0 truncate text-sm font-medium'
                                    title={activity.name}
                                >
                                    {activityLabel(activity.name, t)}
                                </p>
                                <span className='text-muted-foreground flex shrink-0 items-center gap-1 text-xs'>
                                    {!compact && <Clock className='h-3 w-3' />}
                                    {formatDate(activity.created_at)}
                                </span>
                            </div>
                            {activity.context && (
                                <p
                                    className={cn(
                                        'text-muted-foreground mt-0.5 text-xs wrap-break-word',
                                        compact && 'line-clamp-2',
                                    )}
                                >
                                    {activity.context}
                                </p>
                            )}
                            {!compact && activity.ip_address && (
                                <div className='text-muted-foreground mt-1 flex items-center gap-1 text-xs'>
                                    <Globe className='h-3 w-3 shrink-0' />
                                    <span className='font-mono blur-sm transition-all duration-200 hover:blur-none'>
                                        <Sensitive>{activity.ip_address}</Sensitive>
                                    </span>
                                </div>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
