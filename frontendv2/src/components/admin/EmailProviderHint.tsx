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

import { ExternalLink } from 'lucide-react';
import { getMailProviderPreset } from '@/lib/mail-providers';

export function EmailProviderHint({
    presetId,
    t,
}: {
    presetId: string | undefined | null;
    t: (key: string) => string;
}) {
    const preset = getMailProviderPreset(presetId);
    const note = preset.noteKey && t(preset.noteKey) !== preset.noteKey ? t(preset.noteKey) : null;

    if (!note && !preset.docsUrl && !preset.freeTier) {
        return null;
    }

    return (
        <div className='border-border/50 bg-muted/30 space-y-2 rounded-xl border p-4 text-sm'>
            <div className='flex flex-wrap items-center gap-2'>
                <span className='text-foreground font-medium'>{preset.label}</span>
                {preset.freeTier ? (
                    <span className='bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                        {t('admin.settings.mail_providers.free_tier')}
                    </span>
                ) : null}
                {preset.mode === 'api' ? (
                    <span className='bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                        {t('admin.settings.mail_providers.api_mode')}
                    </span>
                ) : (
                    <span className='bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                        {t('admin.settings.mail_providers.smtp_mode')}
                    </span>
                )}
            </div>
            {note ? <p className='text-muted-foreground'>{note}</p> : null}
            {preset.docsUrl ? (
                <a
                    href={preset.docsUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline'
                >
                    {t('admin.settings.mail_providers.docs')}
                    <ExternalLink className='h-3 w-3' />
                </a>
            ) : null}
        </div>
    );
}
