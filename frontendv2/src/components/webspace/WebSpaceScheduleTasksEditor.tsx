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

import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import {
    WEBSPACE_TASK_ACTIONS,
    emptyScheduleTask,
    needsCommandPayload,
    type WebSpaceScheduleTaskDraft,
} from '@/lib/webspace-schedules';

interface Props {
    tasks: WebSpaceScheduleTaskDraft[];
    onChange: (tasks: WebSpaceScheduleTaskDraft[]) => void;
    disabled?: boolean;
}

export function WebSpaceScheduleTasksEditor({ tasks, onChange, disabled }: Props) {
    const { t } = useTranslation();

    const actionOptions = WEBSPACE_TASK_ACTIONS.map((id) => ({
        id,
        name: t(`webSpaces.schedules.actions.${id}`),
    }));

    const updateTask = (index: number, patch: Partial<WebSpaceScheduleTaskDraft>) => {
        onChange(
            tasks.map((task, i) => {
                if (i !== index) return task;
                const next = { ...task, ...patch };
                if (patch.action && !needsCommandPayload(String(patch.action))) {
                    next.payload = '';
                }
                return next;
            }),
        );
    };

    const addTask = () => {
        onChange([...tasks, emptyScheduleTask(tasks.length + 1)]);
    };

    const removeTask = (index: number) => {
        if (tasks.length <= 1) return;
        onChange(tasks.filter((_, i) => i !== index).map((task, i) => ({ ...task, sequence_id: i + 1 })));
    };

    return (
        <div className='space-y-4'>
            <div className='flex items-center justify-between gap-2'>
                <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                    {t('webSpaces.schedules.tasks')}
                </Label>
                <Button type='button' variant='glass' size='sm' onClick={addTask} disabled={disabled}>
                    <Plus className='mr-1 h-3.5 w-3.5' />
                    {t('webSpaces.schedules.addTask')}
                </Button>
            </div>

            {tasks.map((task, index) => (
                <div key={`task-${index}`} className='border-border/60 bg-muted/20 space-y-3 rounded-lg border p-3'>
                    <div className='flex items-start justify-between gap-2'>
                        <p className='text-muted-foreground text-xs font-medium'>
                            {t('webSpaces.schedules.taskNumber', { number: String(index + 1) })}
                        </p>
                        <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => removeTask(index)}
                            disabled={disabled || tasks.length <= 1}
                            aria-label={t('webSpaces.schedules.removeTask')}
                        >
                            <Trash2 className='h-4 w-4' />
                        </Button>
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                            {t('webSpaces.schedules.taskAction')}
                        </Label>
                        <HeadlessSelect
                            value={task.action}
                            onChange={(val) => updateTask(index, { action: String(val) })}
                            options={actionOptions}
                            disabled={disabled}
                        />
                    </div>

                    {needsCommandPayload(String(task.action)) && (
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                {t('webSpaces.schedules.commandPayload')}
                            </Label>
                            <Textarea
                                value={task.payload}
                                onChange={(e) => updateTask(index, { payload: e.target.value })}
                                rows={3}
                                className='font-mono text-sm'
                                placeholder={t('webSpaces.schedules.commandPlaceholder')}
                                disabled={disabled}
                            />
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.schedules.commandHelp')}</p>
                        </div>
                    )}

                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                {t('webSpaces.schedules.timeOffset')}
                            </Label>
                            <Input
                                type='number'
                                min={0}
                                value={String(task.time_offset ?? 0)}
                                onChange={(e) =>
                                    updateTask(index, {
                                        time_offset: Math.max(0, Number(e.target.value) || 0),
                                    })
                                }
                                disabled={disabled}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                {t('webSpaces.schedules.continueOnFailure')}
                            </Label>
                            <HeadlessSelect
                                value={task.continue_on_failure ? '1' : '0'}
                                onChange={(val) => updateTask(index, { continue_on_failure: String(val) === '1' })}
                                options={[
                                    { id: '0', name: t('common.no') },
                                    { id: '1', name: t('common.yes') },
                                ]}
                                disabled={disabled}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
