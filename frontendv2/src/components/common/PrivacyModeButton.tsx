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
import { usePrivacyMode } from '@/contexts/PreferencesContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

/**
 * Hook behind every privacy-mode switch (top bar, user menu, settings): flips
 * the account preference and reports failures.
 */
export function usePrivacyModeToggle() {
    const { t } = useTranslation();
    const { enabled, ready, setEnabled } = usePrivacyMode();
    const [saving, setSaving] = useState(false);

    const toggle = async (next: boolean = !enabled, notify = true) => {
        setSaving(true);
        const ok = await setEnabled(next);
        setSaving(false);
        if (!ok) {
            toast.error(t('privacy.saveFailed'));
            return false;
        }
        if (notify) toast.success(next ? t('privacy.enabledToast') : t('privacy.disabledToast'));
        return true;
    };

    return { enabled, ready, saving, toggle };
}

/** Top bar button that turns privacy mode on or off for the signed-in user. */
export function PrivacyModeButton({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { enabled, ready, saving, toggle } = usePrivacyModeToggle();
    const label = enabled ? t('privacy.turnOff') : t('privacy.turnOn');

    return (
        <button
            type='button'
            onClick={() => void toggle()}
            disabled={saving || !ready}
            title={label}
            aria-label={label}
            aria-pressed={enabled}
            data-testid='privacy-mode-toggle'
            className={cn(
                'text-muted-foreground hover:text-foreground hover:bg-muted/50 focus-visible:ring-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60',
                enabled && 'text-primary bg-primary/10 hover:text-primary hover:bg-primary/15',
                className,
            )}
        >
            {saving ? (
                <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
            ) : enabled ? (
                <EyeOff className='h-4 w-4' aria-hidden />
            ) : (
                <Eye className='h-4 w-4' aria-hidden />
            )}
        </button>
    );
}
