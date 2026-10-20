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

import type { ReactNode } from 'react';
import { LucideIcon, SearchX, X } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { EmptyState } from '@/components/featherui/EmptyState';
import { useTranslation } from '@/contexts/TranslationContext';

interface ListEmptyStateProps {
    /** Icon for the "nothing here yet" state. */
    icon: LucideIcon;
    /** Title when the list is genuinely empty, e.g. "No nodes yet". */
    title: string;
    /** What this list is for and what to do first. */
    description: string;
    /** Usually the create button. Only shown when the list is genuinely empty. */
    action?: ReactNode;
    /** A search or filter is active: show "no matches" with a clear button instead. */
    filtered?: boolean;
    onClearFilters?: () => void;
    className?: string;
}

/**
 * Empty state for admin lists. Tells "nothing created yet" (explain + create) apart from
 * "nothing matches your search" (clear filters), instead of one generic "No results".
 */
export function ListEmptyState({
    icon,
    title,
    description,
    action,
    filtered = false,
    onClearFilters,
    className,
}: ListEmptyStateProps) {
    const { t } = useTranslation();

    if (filtered) {
        return (
            <EmptyState
                icon={SearchX}
                title={t('emptyStates.filtered.title')}
                description={t('emptyStates.filtered.description')}
                className={className}
                action={
                    onClearFilters ? (
                        <Button variant='outline' onClick={onClearFilters}>
                            <X className='mr-2 h-4 w-4' />
                            {t('emptyStates.filtered.clear')}
                        </Button>
                    ) : undefined
                }
            />
        );
    }

    return <EmptyState icon={icon} title={title} description={description} action={action} className={className} />;
}
