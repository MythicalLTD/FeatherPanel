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
            <div className='bg-border absolute top-0 bottom-0 left-6 w-0.5'></div>

            <div className='space-y-4'>
                {activities.map((activity) => (
                    <div key={activity.id} className='relative flex gap-4'>
                        <div className='bg-primary/10 border-primary/20 relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2'>
                            <div className='bg-primary h-3 w-3 rounded-full'></div>
                        </div>

                        <div className='min-w-0 flex-1 space-y-2 pb-4'>
                            <div className='flex flex-col justify-between gap-1 sm:flex-row sm:items-start sm:gap-2'>
                                <div className='min-w-0 flex-1'>
                                    <h4 className='text-foreground text-sm font-medium wrap-break-word'>
                                        {activity.name}
                                    </h4>
                                    {activity.context && (
                                        <p className='text-muted-foreground mt-0.5 text-sm wrap-break-word'>
                                            {activity.context}
                                        </p>
                                    )}
                                </div>
                                <div className='text-muted-foreground mt-1 flex shrink-0 items-center gap-1 text-xs sm:mt-0'>
                                    <Clock className='h-3 w-3' />
                                    {formatDate(activity.created_at)}
                                </div>
                            </div>

                            {activity.ip_address && (
                                <div className='text-muted-foreground flex items-center gap-1 text-xs'>
                                    <Globe className='h-3 w-3 shrink-0' />
                                    <span className='font-mono blur-sm transition-all duration-200 hover:blur-none'>
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
