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

import { useId } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface WebHostingAlphaNoticeProps {
    accepted: boolean;
    onAcceptedChange: (accepted: boolean) => void;
}

export function WebHostingAlphaNotice({ accepted, onAcceptedChange }: WebHostingAlphaNoticeProps) {
    const { t } = useTranslation();
    const checkboxId = useId();

    return (
        <div role='note' className='flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
            <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400' aria-hidden='true' />
            <div className='min-w-0 space-y-1'>
                <p className='text-sm font-bold text-amber-900 dark:text-amber-200'>
                    {t('admin.locations.form.webhosting_alpha_title')}
                </p>
                <p className='text-sm leading-relaxed text-amber-900/85 dark:text-amber-100/85'>
                    {t('admin.locations.form.webhosting_alpha_description')}
                </p>
                <div className='mt-3 flex items-start gap-2.5 border-t border-amber-500/20 pt-3'>
                    <Checkbox
                        id={checkboxId}
                        checked={accepted}
                        onCheckedChange={onAcceptedChange}
                        aria-label={t('admin.locations.form.webhosting_alpha_consent')}
                    />
                    <Label
                        htmlFor={checkboxId}
                        onClick={() => onAcceptedChange(!accepted)}
                        className='cursor-pointer text-xs leading-relaxed text-amber-950 dark:text-amber-100'
                    >
                        {t('admin.locations.form.webhosting_alpha_consent')}
                    </Label>
                </div>
            </div>
        </div>
    );
}
