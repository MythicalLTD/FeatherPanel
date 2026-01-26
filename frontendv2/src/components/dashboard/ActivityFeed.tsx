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

import { Clock, Globe } from 'lucide-react';
import type { Activity } from '@/types/activity';

interface ActivityFeedProps {
    activities: Activity[];
    formatDate: (dateString: string) => string;
}

export function ActivityFeed({ activities, formatDate }: ActivityFeedProps) {
    return (
        <div className='relative'>
            <div className='absolute left-6 top-0 bottom-0 w-0.5 bg-border'></div>

            <div className='space-y-4'>
                {activities.map((activity) => (
                    <div key={activity.id} className='relative flex gap-4'>
                        <div className='relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20'>
                            <div className='h-3 w-3 rounded-full bg-primary'></div>
                        </div>

                        <div className='flex-1 space-y-2 pb-4 min-w-0'>
                            <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-2'>
                                <div className='flex-1 min-w-0'>
                                    <h4 className='text-sm font-medium text-foreground wrap-break-word'>
                                        {activity.name}
                                    </h4>
                                    {activity.context && (
                                        <p className='text-sm text-muted-foreground mt-0.5 wrap-break-word'>
                                            {activity.context}
                                        </p>
                                    )}
                                </div>
                                <div className='flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-1 sm:mt-0'>
                                    <Clock className='h-3 w-3' />
                                    {formatDate(activity.created_at)}
                                </div>
                            </div>

                            {activity.ip_address && (
                                <div className='flex items-center gap-1 text-xs text-muted-foreground group/ip'>
                                    <Globe className='h-3 w-3 shrink-0' />
                                    <span className='font-mono blur-sm group-hover/ip:blur-none transition-all duration-200'>
                                        {activity.ip_address}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
