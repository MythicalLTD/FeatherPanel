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

import dynamic from 'next/dynamic';
import type { BackgroundAnimatedVariant } from '@/lib/background-variants';
import { cn } from '@/lib/utils';

const BackgroundAnimatedLayer = dynamic(() => import('@/components/theme/BackgroundAnimatedLayer'), {
    ssr: false,
});

/** Renders a real animated background inside a clipped frame (for picker previews). */
export default function BackgroundEffectPreview({
    variant,
    accentColor,
    className,
    preview = true,
}: {
    variant: BackgroundAnimatedVariant;
    accentColor: string;
    className?: string;
    /** Lower GPU cost for thumbnails and picker tiles. */
    preview?: boolean;
}) {
    return (
        <div className={cn('bg-background relative overflow-hidden', className)}>
            <div className='pointer-events-none absolute inset-0 [&>*]:h-full [&>*]:w-full'>
                <BackgroundAnimatedLayer variant={variant} accentColor={accentColor} preview={preview} />
            </div>
        </div>
    );
}
