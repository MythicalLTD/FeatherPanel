/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import Link from 'next/link';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSetupStatus } from '@/lib/setup-wizard';

/** "Finish later" reminder on Admin Home until the first-install wizard is completed. */
export function SetupBanner() {
    const { t } = useTranslation();
    const { pending } = useSetupStatus();
    if (!pending) return null;

    return (
        <section className='fp-surface border-border flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5'>
            <div className='fp-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-xl'>
                <Rocket className='h-5 w-5' />
            </div>
            <div className='min-w-0 flex-1'>
                <h2 className='font-semibold'>{t('setup_wizard.banner.title')}</h2>
                <p className='text-muted-foreground text-sm'>{t('setup_wizard.banner.body')}</p>
            </div>
            <Button asChild className='shrink-0'>
                <Link href='/setup'>{t('setup_wizard.banner.action')}</Link>
            </Button>
        </section>
    );
}
