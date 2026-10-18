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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { HIDDEN_IP_PLACEHOLDER } from '@/lib/ip-mask';
import { cn } from '@/lib/utils';

/**
 * Toggle for the per-user "hide server IP addresses" preference.
 *
 * Drop it into any settings surface (preferences page, server settings, the
 * server creation wizard) — it always writes the same account-wide preference,
 * so switching it in one place is reflected everywhere.
 */
export function HideIpsToggle({ className, hideExample = false }: { className?: string; hideExample?: boolean }) {
    const { t } = useTranslation();
    const { hideServerIps, setHideServerIps, ready } = usePreferences();
    const [saving, setSaving] = useState(false);

    const handleChange = async (next: boolean) => {
        setSaving(true);
        const ok = await setHideServerIps(next);
        setSaving(false);
        if (!ok) {
            toast.error(t('privacy.saveFailed'));
            return;
        }
        toast.success(next ? t('privacy.enabledToast') : t('privacy.disabledToast'));
    };

    return (
        <div
            className={cn(
                'bg-muted/20 border-border/50 flex items-center justify-between gap-4 rounded-xl border p-4',
                className,
            )}
        >
            <div className='min-w-0 space-y-1'>
                <p className='text-foreground text-sm font-semibold'>{t('privacy.hideIpsLabel')}</p>
                <p className='text-muted-foreground text-xs leading-relaxed'>{t('privacy.hideIpsHint')}</p>
                <p
                    className={cn(
                        'text-xs font-medium',
                        hideServerIps ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                    )}
                >
                    {hideServerIps ? t('privacy.stateHidden') : t('privacy.stateVisible')}
                    {!hideExample && hideServerIps && (
                        <span className='ml-2 font-mono opacity-70'>{HIDDEN_IP_PLACEHOLDER}</span>
                    )}
                </p>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
                {saving && <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />}
                <Switch
                    checked={hideServerIps}
                    onCheckedChange={handleChange}
                    disabled={saving || !ready}
                    aria-label={t('privacy.hideIpsLabel')}
                />
            </div>
        </div>
    );
}
