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

import { EyeOff } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { HideIpsToggle } from '@/components/preferences/HideIpsToggle';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { HIDDEN_IP_PLACEHOLDER } from '@/lib/ip-mask';

/**
 * Account-wide privacy settings. Kept separate from the appearance panel so
 * the switch is easy to find when a user gets ready to stream or record.
 */
export default function PrivacySettingsPanel() {
    const { t } = useTranslation();
    const { hideServerIps } = usePreferences();

    return (
        <PageCard title={t('privacy.title')} description={t('privacy.description')} icon={EyeOff}>
            <div className='space-y-4'>
                <HideIpsToggle />

                <div className='border-border/40 bg-card/40 rounded-xl border p-4'>
                    <p className='text-muted-foreground mb-2 text-[10px] font-black tracking-widest uppercase'>
                        {t('privacy.example')}
                    </p>
                    <div className='text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-sm'>
                        <span>
                            {t('privacy.exampleAddress')}:{' '}
                            <span className='text-foreground/80 font-bold'>
                                {hideServerIps ? HIDDEN_IP_PLACEHOLDER : '203.0.113.10:25565'}
                            </span>
                        </span>
                        <span>
                            {t('privacy.exampleHost')}:{' '}
                            <span className='text-foreground/80 font-bold'>
                                {hideServerIps ? HIDDEN_IP_PLACEHOLDER : '203.0.113.10'}
                            </span>
                        </span>
                    </div>
                </div>

                <p className='text-muted-foreground text-xs leading-relaxed'>{t('privacy.onlyYouHint')}</p>
            </div>
        </PageCard>
    );
}
