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

import { useEffect, useMemo, useState } from 'react';
import { Icon, iconLoaded, loadIcon } from '@iconify/react';
import { CircleHelp } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';
import type { IconLibrary } from '@/lib/iconLibrary';
import { type PanelIconSource, type PanelIconSpec, resolvePanelIconFallbacks } from '@/lib/panelIcon';
import { useSidebarPreferences } from '@/hooks/useSidebarPreferences';
import { cn } from '@/lib/utils';

export type PanelIconProps = {
    source: PanelIconSource;
    className?: string;
    size?: number;
    /** Passed to img alt when rendering image icons. */
    label?: string;
    /** Override the user's preferred icon library. */
    iconLibrary?: IconLibrary;
};

function iconifyIdForSpec(spec: PanelIconSpec): string | null {
    if (spec.type === 'iconify') return spec.icon;
    if (spec.type === 'lucide') return `lucide:${spec.name}`;
    return null;
}

async function canRenderSpec(spec: PanelIconSpec): Promise<boolean> {
    if (spec.type === 'component' || spec.type === 'emoji' || spec.type === 'image') return true;
    const iconId = iconifyIdForSpec(spec);
    if (!iconId) return false;
    if (iconLoaded(iconId)) return true;
    try {
        await loadIcon(iconId);
        return iconLoaded(iconId);
    } catch {
        return false;
    }
}

function usePanelIconSpec(source: PanelIconSource, library: IconLibrary): PanelIconSpec {
    const specs = useMemo(() => resolvePanelIconFallbacks(source, { iconLibrary: library }), [source, library]);
    const [spec, setSpec] = useState<PanelIconSpec>(specs[0] ?? { type: 'lucide', name: 'circle-help' });

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            for (const candidate of specs) {
                if (cancelled) return;
                if (await canRenderSpec(candidate)) {
                    setSpec(candidate);
                    return;
                }
            }
            if (!cancelled) {
                setSpec({ type: 'lucide', name: 'circle-help' });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [specs]);

    return spec;
}

function RenderPanelIconSpec({
    spec,
    className,
    size,
    label,
}: {
    spec: PanelIconSpec;
    className?: string;
    size: number;
    label?: string;
}) {
    const dimensionStyle = { width: size, height: size };

    switch (spec.type) {
        case 'lucide':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return <DynamicIcon name={spec.name as any} className={cn('shrink-0', className)} style={dimensionStyle} />;
        case 'iconify':
            return <Icon icon={spec.icon} className={cn('shrink-0', className)} width={size} height={size} />;
        case 'emoji':
            return (
                <span
                    className={cn('inline-flex shrink-0 items-center justify-center leading-none', className)}
                    style={{ fontSize: Math.round(size * 0.88), width: size, height: size }}
                    aria-hidden
                >
                    {spec.char}
                </span>
            );
        case 'image':
            return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={spec.src}
                    alt={label ?? ''}
                    className={cn('shrink-0 object-contain', className)}
                    width={size}
                    height={size}
                    loading='lazy'
                    decoding='async'
                    onError={(event) => {
                        event.currentTarget.style.display = 'none';
                    }}
                />
            );
        case 'component': {
            const IconComponent = spec.Icon;
            return <IconComponent className={cn('shrink-0', className)} style={dimensionStyle} />;
        }
        default:
            return <CircleHelp className={cn('shrink-0 opacity-70', className)} style={dimensionStyle} aria-hidden />;
    }
}

export function PanelIcon({ source, className, size = 18, label, iconLibrary }: PanelIconProps) {
    const { iconLibrary: preferredLibrary } = useSidebarPreferences();
    const library = iconLibrary ?? preferredLibrary;
    const spec = usePanelIconSpec(source, library);

    return <RenderPanelIconSpec spec={spec} className={className} size={size} label={label} />;
}
