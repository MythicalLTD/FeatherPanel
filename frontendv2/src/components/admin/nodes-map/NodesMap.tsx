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

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { resolveNodeCoordinates } from '@/lib/country-centroids';
import { Badge } from '@/components/ui/badge';

export type NodesMapNode = {
    id: number;
    name: string;
    fqdn?: string;
    status: 'healthy' | 'unhealthy' | string;
    location_name?: string | null;
    flag_code?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    latency_ms?: number | null;
    server_count?: number;
};

type MappedNode = NodesMapNode & {
    latitude: number;
    longitude: number;
    approximate: boolean;
};

function FitBounds({ points }: { points: LatLngExpression[] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        if (points.length === 1) {
            map.setView(points[0], 4);
            return;
        }
        map.fitBounds(points as LatLngBoundsExpression, { padding: [36, 36], maxZoom: 6 });
    }, [map, points]);
    return null;
}

function latencyTone(ms: number | null | undefined): string {
    if (ms == null) return 'text-muted-foreground';
    if (ms < 80) return 'text-green-600 dark:text-green-400';
    if (ms < 200) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

export function NodesMap({ nodes }: { nodes: NodesMapNode[] }) {
    const { t } = useTranslation();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        const sync = () => setIsDark(root.classList.contains('dark'));
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const mapped = useMemo(() => {
        const out: MappedNode[] = [];
        for (const node of nodes) {
            const resolved = resolveNodeCoordinates(node);
            if (!resolved) continue;
            out.push({
                ...node,
                latitude: resolved.latitude,
                longitude: resolved.longitude,
                approximate: resolved.approximate,
            });
        }
        return out;
    }, [nodes]);

    const unmappedCount = nodes.length - mapped.length;
    const points = useMemo(
        () => mapped.map((n) => [n.latitude, n.longitude] as LatLngExpression),
        [mapped],
    );

    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    if (nodes.length === 0) {
        return null;
    }

    return (
        <div className='fp-surface space-y-3 rounded-xl border p-3 sm:p-4'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0'>
                    <h2 className='text-base font-semibold tracking-tight sm:text-lg'>
                        {t('admin.nodes.map_title')}
                    </h2>
                    <p className='text-muted-foreground text-xs sm:text-sm'>{t('admin.nodes.map_subtitle')}</p>
                </div>
                <div className='flex flex-wrap items-center gap-2 text-xs'>
                    <Badge variant='outline' className='font-normal'>
                        {t('admin.nodes.map_mapped', { count: String(mapped.length) })}
                    </Badge>
                    {unmappedCount > 0 && (
                        <Badge variant='secondary' className='font-normal'>
                            {t('admin.nodes.map_unmapped', { count: String(unmappedCount) })}
                        </Badge>
                    )}
                </div>
            </div>

            {mapped.length === 0 ? (
                <div className='bg-muted/40 text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm'>
                    <p>{t('admin.nodes.map_empty')}</p>
                    <Link href='/admin/locations' className='text-primary mt-2 inline-block underline-offset-4 hover:underline'>
                        {t('admin.nodes.map_set_coordinates')}
                    </Link>
                </div>
            ) : (
                <div className='overflow-hidden rounded-lg border'>
                    <MapContainer
                        center={[20, 0]}
                        zoom={2}
                        minZoom={1}
                        maxZoom={10}
                        scrollWheelZoom={false}
                        className='z-0 h-[280px] w-full sm:h-[360px]'
                        attributionControl
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url={tileUrl}
                        />
                        <FitBounds points={points} />
                        {mapped.map((node) => {
                            const healthy = node.status === 'healthy';
                            const color = healthy ? '#16a34a' : '#dc2626';
                            return (
                                <CircleMarker
                                    key={node.id}
                                    center={[node.latitude, node.longitude]}
                                    radius={9}
                                    pathOptions={{
                                        color,
                                        fillColor: color,
                                        fillOpacity: 0.85,
                                        weight: 2,
                                    }}
                                >
                                    <Popup>
                                        <div className='space-y-1 text-sm'>
                                            <div className='font-semibold'>{node.name}</div>
                                            {node.location_name && (
                                                <div className='text-muted-foreground'>
                                                    {node.location_name}
                                                    {node.approximate ? ` · ${t('admin.nodes.map_approximate')}` : ''}
                                                </div>
                                            )}
                                            <div className={healthy ? 'text-green-600' : 'text-red-600'}>
                                                {healthy ? t('admin.nodes.online') : t('admin.nodes.offline')}
                                            </div>
                                            {node.latency_ms != null && (
                                                <div className={latencyTone(node.latency_ms)}>
                                                    {t('admin.nodes.latency_value', { ms: String(node.latency_ms) })}
                                                </div>
                                            )}
                                            <Link
                                                href={`/admin/nodes/${node.id}`}
                                                className='text-primary inline-block underline-offset-4 hover:underline'
                                            >
                                                {t('admin.nodes.map_open_node')}
                                            </Link>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                    </MapContainer>
                </div>
            )}
        </div>
    );
}
