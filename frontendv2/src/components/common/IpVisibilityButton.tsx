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
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

/**
 * Compact eye button that flips the account-wide "hide IP addresses"
 * preference - meant to sit right next to a rendered server address so the
 * user can hide it in one click before sharing their screen.
 */
export function IpVisibilityButton({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { hideServerIps, setHideServerIps } = usePreferences();
    const [saving, setSaving] = useState(false);

    const toggle = async () => {
        setSaving(true);
        const ok = await setHideServerIps(!hideServerIps);
        setSaving(false);
        if (!ok) toast.error(t('privacy.saveFailed'));
    };

    const label = hideServerIps ? t('privacy.showIpsButton') : t('privacy.hideIpsButton');

    return (
        <button
            type='button'
            onClick={toggle}
            disabled={saving}
            title={label}
            aria-label={label}
            aria-pressed={hideServerIps}
            className={cn(
                'text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors disabled:opacity-50',
                hideServerIps && 'text-emerald-600 dark:text-emerald-400',
                className,
            )}
        >
            {saving ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : hideServerIps ? (
                <EyeOff className='h-3.5 w-3.5' />
            ) : (
                <Eye className='h-3.5 w-3.5' />
            )}
        </button>
    );
}
