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

'use client';

import { Cloud, HardDrive, AlertTriangle, Unlink } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { BackupItem } from '@/types/server';

/** Where a backup lives: node disk, PBS, panel S3 or one of the user's own destinations (with its health). */
export function BackupStorageBadge({ backup }: { backup: BackupItem }) {
    const { t } = useTranslation();
    const dest = backup.destination;

    if (dest) {
        const state = dest.state ?? 'active';
        const bad = state !== 'active';
        const Icon = state === 'orphaned' ? Unlink : bad ? AlertTriangle : Cloud;
        return (
            <span
                className={cn(
                    'inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                    bad
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        : 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
                )}
                title={bad ? t(`serverBackups.storageTarget.state.${state}`) : undefined}
            >
                <Icon className='h-3.5 w-3.5 shrink-0' />
                <span className='truncate'>{dest.name ?? t('serverBackups.storageTarget.unknown')}</span>
                {bad ? <span className='shrink-0'>· {t(`serverBackups.storageTarget.state.${state}`)}</span> : null}
            </span>
        );
    }

    const label =
        backup.disk === 'pbs'
            ? 'PBS'
            : backup.disk === 'wings'
              ? t('ui.server.backups.local')
              : backup.disk === 's3'
                ? t('serverBackups.storageTarget.panelS3')
                : backup.disk;

    return (
        <span className='text-muted-foreground inline-flex items-center gap-1 text-xs'>
            {backup.disk === 's3' ? <Cloud className='h-3.5 w-3.5' /> : <HardDrive className='h-3.5 w-3.5' />}
            {label}
        </span>
    );
}
