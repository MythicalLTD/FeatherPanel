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
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full outline-none',
                className,
            )}
            {...props}
        />
    ),
);
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
    ({ className, src, onError, onLoad, ...props }, ref) => {
        const [error, setError] = React.useState(false);
        const [loaded, setLoaded] = React.useState(false);
        const hasValidSrc = src && typeof src === 'string' && src.trim() !== '';

        // Don't render img when no valid src or when load failed – avoids Firefox broken-image icon (grey dot)
        if (!hasValidSrc || error) {
            return null;
        }

        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                ref={ref}
                src={src}
                className={cn(
                    'aspect-square h-full w-full object-cover object-center outline-none transition-opacity duration-150',
                    loaded ? 'opacity-100' : 'opacity-0',
                    className,
                )}
                alt={props.alt || 'Avatar'}
                onLoad={(e) => {
                    setLoaded(true);
                    onLoad?.(e);
                }}
                onError={(e) => {
                    setError(true);
                    onError?.(e);
                }}
                {...props}
            />
        );
    },
);
AvatarImage.displayName = 'AvatarImage';

export { Avatar, AvatarImage };
