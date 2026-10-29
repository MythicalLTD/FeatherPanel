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

import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { SUBUSER_PRESETS, resolvePreset, type SubuserPreset } from '@/lib/subuser-presets';

export function SubuserPresetPicker({
    available,
    onApply,
    presets = SUBUSER_PRESETS,
    i18nPrefix = 'serverSubusers.presets',
}: {
    available: string[];
    onApply: (permissions: string[]) => void;
    presets?: SubuserPreset[];
    i18nPrefix?: string;
}) {
    const { t } = useTranslation();
    return (
        <div className='space-y-2'>
            <p className='text-muted-foreground text-xs font-semibold'>{t('serverSubusers.presets.title')}</p>
            <div className='flex flex-wrap gap-2'>
                {presets.map((preset) => {
                    const perms = resolvePreset(preset, available);
                    return (
                        <Button
                            key={preset.id}
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={perms.length === 0}
                            onClick={() => onApply(perms)}
                            title={t(`${i18nPrefix}.${preset.id}.description`)}
                        >
                            {t(`${i18nPrefix}.${preset.id}.name`)}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
