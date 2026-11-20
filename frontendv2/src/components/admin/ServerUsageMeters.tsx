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
import { UsageMeter } from '@/components/servers/UsageMeter';
import { formatCpu, formatDisk, formatMemory, getUsagePercentage } from '@/lib/server-utils';
import { cn } from '@/lib/utils';

/** Live numbers for one server; any daemon payload shape the admin endpoints return. */
export interface ServerUsageValues {
    cpu_absolute?: number;
    memory_bytes?: number;
    disk_bytes?: number;
}

/** Plan limits as stored on the server: memory and disk in MiB, CPU in percent; 0 means unlimited. */
export interface ServerUsageLimits {
    memory: number;
    disk: number;
    cpu: number;
}

const MIB = 1024 * 1024;

/**
 * CPU, RAM and disk meters (used / limit) shared by the admin servers list and the node status page.
 * Renders a muted note instead when there is no live data (node offline or server unknown to it).
 */
export function ServerUsageMeters({
    usage,
    limits,
    nodeOffline = false,
    loading = false,
    inline = true,
    className,
}: {
    usage: ServerUsageValues | null | undefined;
    limits: ServerUsageLimits;
    nodeOffline?: boolean;
    loading?: boolean;
    /** One meter per line (tables); false lays them out side by side like the dashboard rows. */
    inline?: boolean;
    className?: string;
}) {
    const { t } = useTranslation();

    if (!usage) {
        return (
            <span className={cn('text-muted-foreground block text-xs whitespace-nowrap', className)}>
                {loading
                    ? t('admin.servers.usage.loading')
                    : nodeOffline
                      ? t('admin.servers.usage.node_offline')
                      : t('admin.servers.usage.no_data')}
            </span>
        );
    }

    const unlimited = t('admin.servers.usage.unlimited');
    const cpu = usage.cpu_absolute ?? 0;
    const memory = usage.memory_bytes ?? 0;
    const disk = usage.disk_bytes ?? 0;
    const memoryLimit = limits.memory * MIB;
    const diskLimit = limits.disk * MIB;

    return (
        <div className={cn('grid min-w-0', inline ? 'gap-1.5' : 'grid-cols-3 gap-3', className)}>
            <UsageMeter
                inline={inline}
                label={t('dashboard.home.meters.cpu')}
                value={`${formatCpu(cpu)} / ${limits.cpu > 0 ? `${limits.cpu}%` : unlimited}`}
                percent={limits.cpu > 0 ? getUsagePercentage(cpu, limits.cpu) : null}
            />
            <UsageMeter
                inline={inline}
                label={t('dashboard.home.meters.ram')}
                value={`${formatMemory(memory)} / ${memoryLimit > 0 ? formatMemory(memoryLimit) : unlimited}`}
                percent={memoryLimit > 0 ? getUsagePercentage(memory, memoryLimit) : null}
            />
            <UsageMeter
                inline={inline}
                label={t('dashboard.home.meters.disk')}
                value={`${formatDisk(disk)} / ${diskLimit > 0 ? formatDisk(diskLimit) : unlimited}`}
                percent={diskLimit > 0 ? getUsagePercentage(disk, diskLimit) : null}
            />
        </div>
    );
}
