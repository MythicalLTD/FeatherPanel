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

import { Save } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { cn } from '@/lib/utils';

interface UnsavedChangesBarProps {
    /** Show the bar and arm the leave-page warning. */
    dirty: boolean;
    onSave: () => void;
    onDiscard?: () => void;
    saving?: boolean;
    /** Block saving (e.g. validation errors) while still showing that edits are pending. */
    saveDisabled?: boolean;
    /** Optional hint shown instead of the default description (e.g. "Fix the highlighted fields"). */
    description?: string;
    /** Label for the save button (e.g. "Create" on create pages). */
    saveLabel?: string;
    className?: string;
}

/**
 * Sticky bar for forms with an explicit save step. Place it as the last child of the page so it
 * stays pinned to the bottom of the viewport while the page scrolls.
 */
export function UnsavedChangesBar({
    dirty,
    onSave,
    onDiscard,
    saving = false,
    saveDisabled = false,
    description,
    saveLabel,
    className,
}: UnsavedChangesBarProps) {
    const { t } = useTranslation();
    useUnsavedChangesGuard(dirty && !saving, t('common.unsavedChanges.leaveConfirm'));

    if (!dirty) return null;

    return (
        <div
            role='region'
            aria-label={t('common.unsavedChanges.title')}
            className={cn(
                'animate-in fade-in slide-in-from-bottom-2 sticky bottom-3 z-30 mt-6 duration-200 sm:bottom-4',
                className,
            )}
        >
            <div className='border-border bg-card/95 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:px-4'>
                <div className='flex min-w-0 flex-1 items-start gap-3' aria-live='polite'>
                    <span className='mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500' aria-hidden='true' />
                    <div className='min-w-0'>
                        <p className='text-foreground text-sm font-semibold'>{t('common.unsavedChanges.title')}</p>
                        <p className='text-muted-foreground text-xs'>
                            {description ?? t('common.unsavedChanges.description')}
                        </p>
                    </div>
                </div>
                <div className='flex shrink-0 gap-2'>
                    {onDiscard && (
                        <Button
                            type='button'
                            variant='ghost'
                            className='h-10 flex-1 px-4 sm:flex-none'
                            onClick={onDiscard}
                            disabled={saving}
                        >
                            {t('common.unsavedChanges.discard')}
                        </Button>
                    )}
                    <Button
                        type='button'
                        className='h-10 flex-1 px-4 sm:flex-none'
                        onClick={onSave}
                        disabled={saving || saveDisabled}
                        loading={saving}
                    >
                        {!saving && <Save className='mr-2 h-4 w-4' aria-hidden='true' />}
                        {saving ? t('common.saving') : (saveLabel ?? t('common.saveChanges'))}
                    </Button>
                </div>
            </div>
        </div>
    );
}
