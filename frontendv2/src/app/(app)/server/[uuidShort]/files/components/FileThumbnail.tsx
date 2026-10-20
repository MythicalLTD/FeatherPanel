/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useEffect, useRef, useState } from 'react';
import { filesApi } from '@/lib/files-api';

/** Session cache of object URLs so tiles do not refetch while browsing. */
const cache = new Map<string, string>();
const MAX_BYTES = 3 * 1024 * 1024;

/** Lazy image thumbnail for grid tiles; loads only when scrolled into view. */
export function FileThumbnail({
    serverUuid,
    path,
    size,
    fallback,
}: {
    serverUuid: string;
    path: string;
    size: number;
    fallback: React.ReactNode;
}) {
    const key = `${serverUuid}:${path}`;
    const [src, setSrc] = useState<string | null>(cache.get(key) ?? null);
    const [failed, setFailed] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (src || failed || size > MAX_BYTES || !ref.current) return;
        const el = ref.current;
        let cancelled = false;
        const io = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;
                io.disconnect();
                void (async () => {
                    try {
                        const url = await filesApi.getDownloadUrl(serverUuid, path);
                        const blob = await (await fetch(url)).blob();
                        const objectUrl = URL.createObjectURL(blob);
                        cache.set(key, objectUrl);
                        if (!cancelled) setSrc(objectUrl);
                    } catch {
                        if (!cancelled) setFailed(true);
                    }
                })();
            },
            { rootMargin: '200px' },
        );
        io.observe(el);
        return () => {
            cancelled = true;
            io.disconnect();
        };
    }, [src, failed, size, serverUuid, path, key]);

    return (
        <div ref={ref} className='flex h-20 w-full items-center justify-center overflow-hidden rounded-lg'>
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt='' className='h-full w-full object-cover' loading='lazy' />
            ) : (
                fallback
            )}
        </div>
    );
}
