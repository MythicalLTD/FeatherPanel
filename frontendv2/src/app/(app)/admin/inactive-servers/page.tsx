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

import { Hourglass } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { InactiveCleanupPanel } from '@/components/admin/inactive-cleanup/InactiveCleanupPanel';

export default function InactiveServersPage() {
    const { t } = useTranslation();
    return (
        <div className='space-y-6'>
            <PageHeader title={t('adminInactive.title')} description={t('adminInactive.subtitle')} icon={Hourglass} />
            <InactiveCleanupPanel />
        </div>
    );
}
