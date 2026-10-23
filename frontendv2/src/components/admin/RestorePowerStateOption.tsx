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

import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/contexts/TranslationContext';

/** "Restore power state after transfer" option shared by the single and mass transfer dialogs. */
export function RestorePowerStateOption({
    checked,
    onChange,
    disabled,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    return (
        <label className='flex cursor-pointer items-start gap-3'>
            <Checkbox
                checked={checked}
                onCheckedChange={(v) => onChange(v === true)}
                disabled={disabled}
                className='mt-0.5'
            />
            <div>
                <p className='text-sm font-medium'>{t('admin.servers.transfer.restore_power_state')}</p>
                <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                    {t('admin.servers.transfer.restore_power_state_help')}
                </p>
            </div>
        </label>
    );
}
