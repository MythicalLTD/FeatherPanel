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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { ServerFormData } from './types';

export interface AssignableMountRow {
    id: number;
    name: string;
    source: string;
    target: string;
    read_only: boolean;
    user_mountable?: boolean;
}

interface MountsTabProps {
    form: ServerFormData;
    setForm: React.Dispatch<React.SetStateAction<ServerFormData>>;
    assignableMounts: AssignableMountRow[];
    loading: boolean;
}

export function MountsTab({ form, setForm, assignableMounts, loading }: MountsTabProps) {
    const { t } = useTranslation();

    const toggle = (mountId: number) => {
        setForm((prev) => {
            const set = new Set(prev.mount_ids);
            if (set.has(mountId)) set.delete(mountId);
            else set.add(mountId);
            return { ...prev, mount_ids: Array.from(set) };
        });
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.servers.edit.mounts.title')}
                description={t('admin.servers.edit.mounts.description')}
            >
                {loading ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-8'>
                        <Loader2 className='h-5 w-5 animate-spin' />
                        <span>{t('admin.servers.edit.mounts.loading')}</span>
                    </div>
                ) : assignableMounts.length === 0 ? (
                    <p className='text-muted-foreground py-4 text-sm'>{t('admin.servers.edit.mounts.empty')}</p>
                ) : (
                    <div className='space-y-3'>
                        {assignableMounts.map((m) => (
                            <div
                                key={m.id}
                                className='border-border/60 bg-muted/20 flex items-start gap-3 rounded-xl border p-4'
                            >
                                <Checkbox
                                    id={`mount-${m.id}`}
                                    checked={form.mount_ids.includes(m.id)}
                                    onCheckedChange={() => toggle(m.id)}
                                />
                                <div className='min-w-0 flex-1 space-y-1'>
                                    <Label htmlFor={`mount-${m.id}`} className='cursor-pointer text-base font-medium'>
                                        {m.name}
                                    </Label>
                                    <p className='text-muted-foreground font-mono text-xs break-all'>
                                        {m.source} → {m.target}
                                    </p>
                                    <p className='text-muted-foreground text-xs'>
                                        {m.read_only ? t('admin.mounts.read_only') : t('admin.mounts.read_write')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PageCard>
        </div>
    );
}
