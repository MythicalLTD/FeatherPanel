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

import { cn } from '@/lib/utils';
import { MODULE_BADGES, type PanelModule } from '@/lib/modules';

const MODULE_TONES: Record<PanelModule, string> = {
    game: 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300',
    web: 'bg-sky-500/12 text-sky-600 ring-sky-500/25 dark:text-sky-300',
    vds: 'bg-violet-500/12 text-violet-600 ring-violet-500/25 dark:text-violet-300',
};

/** Small GAME / WEB / VDS tag. Same look in sidebars, command palette and dashboard. */
export function ModuleBadge({ module, className }: { module: PanelModule; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-wide ring-1',
                MODULE_TONES[module],
                className,
            )}
        >
            {MODULE_BADGES[module]}
        </span>
    );
}
