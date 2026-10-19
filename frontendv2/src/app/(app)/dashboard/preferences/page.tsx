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

import { Suspense } from 'react';
import { Palette } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import AppearanceSettingsPanel from '@/components/preferences/AppearanceSettingsPanel';
import PrivacySettingsPanel from '@/components/preferences/PrivacySettingsPanel';
import { useTranslation } from '@/contexts/TranslationContext';

function PreferencesContent() {
    const { t } = useTranslation();

    return (
        <div className='w-full space-y-6 pb-10'>
            <PageHeader
                title={t('appearance.settingsMenuTitle')}
                description={t('appearance.settingsMenuSubtitle')}
                icon={Palette}
            />
            <AppearanceSettingsPanel />
            <PrivacySettingsPanel />
        </div>
    );
}

export default function DashboardPreferencesPage() {
    return (
        <Suspense
            fallback={
                <div className='w-full space-y-6 pb-10'>
                    <div className='bg-muted/30 h-24 animate-pulse rounded-xl' />
                    <div className='bg-muted/30 h-96 animate-pulse rounded-xl' />
                </div>
            }
        >
            <PreferencesContent />
        </Suspense>
    );
}
