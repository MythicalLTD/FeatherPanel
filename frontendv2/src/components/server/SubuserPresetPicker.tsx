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
import { SUBUSER_PRESETS, resolvePreset } from '@/lib/subuser-presets';

export function SubuserPresetPicker({
    available,
    onApply,
}: {
    available: string[];
    onApply: (permissions: string[]) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className='space-y-2'>
            <p className='text-muted-foreground text-xs font-semibold'>{t('serverSubusers.presets.title')}</p>
            <div className='flex flex-wrap gap-2'>
                {SUBUSER_PRESETS.map((preset) => {
                    const perms = resolvePreset(preset, available);
                    return (
                        <Button
                            key={preset.id}
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={perms.length === 0}
                            onClick={() => onApply(perms)}
                            title={t(`serverSubusers.presets.${preset.id}.description`)}
                        >
                            {t(`serverSubusers.presets.${preset.id}.name`)}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
