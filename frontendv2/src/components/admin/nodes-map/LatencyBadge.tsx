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

import { useTranslation } from '@/contexts/TranslationContext';

function latencyTone(ms: number | null | undefined): string {
    if (ms == null) return 'text-muted-foreground';
    if (ms < 80) return 'text-green-600 dark:text-green-400';
    if (ms < 200) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

export function LatencyBadge({ ms }: { ms: number | null | undefined }) {
    const { t } = useTranslation();
    if (ms == null) {
        return (
            <span className='text-muted-foreground text-xs tabular-nums'>{t('admin.nodes.latency_unknown')}</span>
        );
    }
    return (
        <span className={`text-xs font-medium tabular-nums ${latencyTone(ms)}`}>
            {t('admin.nodes.latency_value', { ms: String(ms) })}
        </span>
    );
}
