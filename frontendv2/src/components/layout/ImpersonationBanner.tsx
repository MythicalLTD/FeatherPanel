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

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { getApiErrorMessage } from '@/lib/api-errors';

/** Shown on every page while a staff member is viewing the panel as this user. */
export function ImpersonationBanner() {
    const { user } = useSession();
    const { t } = useTranslation();
    const [stopping, setStopping] = useState(false);
    const by = user?.impersonated_by;

    if (!by) return null;

    const stop = async () => {
        setStopping(true);
        try {
            await axios.delete('/api/user/impersonation');
            // Full reload so every cached view goes back to the staff account.
            window.location.href = `/admin/users/${user.uuid}/edit`;
        } catch (e) {
            toast.error(getApiErrorMessage(e, t, 'impersonation.stopFailed'));
            setStopping(false);
        }
    };

    return (
        <div className='mb-5 flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm'>
            <Eye className='h-4 w-4 shrink-0 text-red-500' />
            <div className='min-w-0 flex-1'>
                <p className='font-semibold text-red-600 dark:text-red-400'>
                    {t('impersonation.bannerTitle', { username: user.username })}
                </p>
                <p className='text-muted-foreground text-xs'>
                    {t('impersonation.bannerDescription', { admin: by.username })}
                </p>
            </div>
            <Button size='sm' variant='destructive' onClick={stop} disabled={stopping}>
                {t('impersonation.stop')}
            </Button>
        </div>
    );
}
