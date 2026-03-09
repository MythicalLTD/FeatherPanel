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

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { History, Loader2 } from 'lucide-react';

export interface VmActivity {
    id: number;
    user_uuid: string;
    name: string;
    context: string | null;
    ip_address: string | null;
    created_at: string;
}

interface HistoryTabProps {
    instanceId: number;
}

function formatActivityName(name: string): string {
    if (name === 'vm_instance_create') return 'Created';
    if (name === 'vm_instance_update') return 'Updated';
    if (name === 'vm_instance_delete') return 'Deleted';
    return name.replace(/^vm_instance_/, '').replace(/_/g, ' ');
}

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        return d.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return iso;
    }
}

export function HistoryTab({ instanceId }: HistoryTabProps) {
    const { t } = useTranslation();
    const [activities, setActivities] = useState<VmActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        axios
            .get(`/api/admin/vm-instances/${instanceId}/activities`, { params: { limit: 50 } })
            .then((res) => {
                if (!cancelled) {
                    setActivities((res.data?.data?.activities ?? []) as VmActivity[]);
                }
            })
            .catch(() => {
                if (!cancelled) setActivities([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [instanceId]);

    return (
        <PageCard
            title={t('admin.vmInstances.edit_tabs.history') ?? 'Task history'}
            icon={History}
            description={t('admin.vmInstances.history_desc') ?? 'Recent create, update, and delete events for this instance'}
        >
            {loading ? (
                <div className='flex items-center justify-center py-12'>
                    <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
            ) : activities.length === 0 ? (
                <p className='text-muted-foreground py-6 text-center'>
                    {t('admin.vmInstances.no_task_history') ?? 'No activity recorded yet.'}
                </p>
            ) : (
                <ul className='space-y-3'>
                    {activities.map((a) => (
                        <li
                            key={a.id}
                            className='flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border/50 bg-muted/20 px-4 py-3'
                        >
                            <span className='font-medium text-foreground tabular-nums'>
                                {formatDate(a.created_at)}
                            </span>
                            <span className='rounded-md bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary'>
                                {formatActivityName(a.name)}
                            </span>
                            {a.context && (
                                <span className='text-sm text-muted-foreground'>{a.context}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </PageCard>
    );
}
