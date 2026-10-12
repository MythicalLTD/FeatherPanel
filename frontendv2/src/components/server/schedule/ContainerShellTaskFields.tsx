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

import * as React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import {
    CONTAINER_SHELL_COMMAND_MAX,
    CONTAINER_SHELL_TIMEOUT_MAX,
    CONTAINER_SHELL_TIMEOUT_MIN,
    type ContainerShellFields,
} from './container-shell-payload';

type Props = {
    fields: ContainerShellFields;
    setFields: React.Dispatch<React.SetStateAction<ContainerShellFields>>;
    disabled?: boolean;
};

/** Command + timeout inputs for the schedule "Container Shell" (docker exec sh -c) task. */
export function ContainerShellTaskFields({ fields, setFields, disabled = false }: Props) {
    const { t } = useTranslation();

    return (
        <div className='space-y-6'>
            <div className='space-y-2.5'>
                <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                    {t('serverTasks.containerShellCommand')} <span className='text-primary'>*</span>
                </Label>
                <Textarea
                    className='min-h-[100px] font-mono text-xs font-medium'
                    value={fields.command}
                    maxLength={CONTAINER_SHELL_COMMAND_MAX}
                    onChange={(e) => setFields((prev) => ({ ...prev, command: e.target.value }))}
                    placeholder={t('serverTasks.containerShellCommandPlaceholder')}
                    required
                    disabled={disabled}
                />
                <p className='text-muted-foreground ml-1 text-xs'>{t('serverTasks.containerShellHint')}</p>
            </div>
            <div className='space-y-2.5'>
                <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                    {t('serverTasks.containerShellTimeout')}
                </Label>
                <Input
                    type='number'
                    min={CONTAINER_SHELL_TIMEOUT_MIN}
                    max={CONTAINER_SHELL_TIMEOUT_MAX}
                    step={1}
                    value={fields.timeout}
                    onChange={(e) => setFields((prev) => ({ ...prev, timeout: Number(e.target.value) }))}
                    required
                    disabled={disabled}
                />
                <p className='text-muted-foreground ml-1 text-xs'>{t('serverTasks.containerShellTimeoutHint')}</p>
            </div>
        </div>
    );
}
