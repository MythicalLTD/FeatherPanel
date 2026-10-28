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

import * as React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { fetchStorageDestinations, type StorageDestination } from '@/lib/storage-destinations';

type Props = {
    value: number | null;
    onChange: (value: number | null) => void;
    disabled?: boolean;
    /** Extra help line under the picker (e.g. schedules use the server owner's storage). */
    hint?: string;
    /** The admin made backups on users' own storage count toward the server backup limit. */
    countsTowardLimit?: boolean;
};

/**
 * Where a backup is stored: the panel default or one of the user's own storage destinations.
 * Renders nothing when bring-your-own storage is disabled.
 */
export function BackupDestinationPicker({ value, onChange, disabled = false, hint, countsTowardLimit = false }: Props) {
    const { t } = useTranslation();
    const [enabled, setEnabled] = React.useState(false);
    const [destinations, setDestinations] = React.useState<StorageDestination[]>([]);

    React.useEffect(() => {
        let cancelled = false;
        fetchStorageDestinations()
            .then((res) => {
                if (cancelled) return;
                setEnabled(res.capabilities.byo_enabled);
                setDestinations(res.destinations);
            })
            .catch(() => {
                if (!cancelled) setEnabled(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!enabled) return null;

    const selected = destinations.find((d) => d.id === value);

    return (
        <div className='space-y-2.5'>
            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                {t('serverBackups.storageTarget.label')}
            </Label>
            <HeadlessSelect
                value={value ?? 0}
                onChange={(val) => onChange(Number(val) > 0 ? Number(val) : null)}
                options={[
                    { id: 0, name: t('serverBackups.storageTarget.default') },
                    ...destinations.map((d) => ({
                        id: d.id,
                        name:
                            d.status === 'active'
                                ? `${d.name} (${d.config ? d.config.bucket : t(`account.storage.providers.${d.provider}`)})`
                                : `${d.name} (${t(`account.storage.status.${d.status}`)})`,
                    })),
                ]}
                disabled={disabled}
            />
            {selected && selected.status !== 'active' ? (
                <p className='ml-1 text-xs text-red-600 dark:text-red-400'>
                    {t('serverBackups.storageTarget.unhealthy', { error: selected.last_error ?? '' })}
                </p>
            ) : null}
            <p className='text-muted-foreground ml-1 text-xs'>
                {destinations.length === 0 ? (
                    <>
                        {t('serverBackups.storageTarget.none')}{' '}
                        <Link href='/dashboard/account?tab=storage' className='text-primary hover:underline'>
                            {t('serverBackups.storageTarget.addLink')}
                        </Link>
                    </>
                ) : (
                    (hint ??
                    t(
                        countsTowardLimit
                            ? 'serverBackups.storageTarget.helpCounted'
                            : 'serverBackups.storageTarget.help',
                    ))
                )}
            </p>
        </div>
    );
}
