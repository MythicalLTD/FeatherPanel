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

import { useEffect, useState } from 'react';
import axios from 'axios';

export type VdsTimeframe = 'hour' | 'day' | 'week' | 'month' | 'year';

/** Admin-controlled VDS feature flags and limits (GET /api/user/vm-instances/{id}/features). */
export interface VdsFeatures {
    graphs: { enabled: boolean; timeframes: VdsTimeframe[] };
    console: {
        paste_enabled: boolean;
        paste_max_chars: number;
        screenshot_enabled: boolean;
        ctrl_alt_del_enabled: boolean;
        brand_name: string;
        brand_logo: string;
    };
    iso: {
        enabled: boolean;
        mode: 'provider' | 'provider_user' | 'disabled';
        user_isos: boolean;
        /** Present when user_isos is false: mode not provider_user, or user ISO storage unset. */
        user_isos_blocker?: 'mode' | 'storage' | null;
        user_storage_configured?: boolean;
        upload_enabled: boolean;
        url_enabled: boolean;
        max_size_mb: number;
        max_per_user: number;
        require_approval: boolean;
        url_domains: string[];
        can_upload: boolean;
    };
    rescue: { enabled: boolean };
    snapshots: { enabled: boolean; limit: number; include_ram_allowed: boolean };
    firewall: { enabled: boolean; max_rules: number; allow_policy: boolean; presets: string[] };
    schedules: { enabled: boolean; max: number; actions: string[]; allow_hourly: boolean; max_keep: number };
    reauth: { mode: 'off' | 'password' | '2fa_or_password'; actions: string[]; method: 'password' | '2fa' | null };
    bandwidth: { enabled: boolean };
}

const cache = new Map<number, VdsFeatures>();

export function useVdsFeatures(id: number | null | undefined): VdsFeatures | null {
    const [features, setFeatures] = useState<VdsFeatures | null>(() => (id ? (cache.get(id) ?? null) : null));
    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        axios
            .get(`/api/user/vm-instances/${id}/features`)
            .then(({ data }) => {
                if (cancelled || !data?.success) return;
                cache.set(id, data.data as VdsFeatures);
                setFeatures(data.data as VdsFeatures);
            })
            .catch(() => {
                // Leave features null: optional extras stay hidden.
            });
        return () => {
            cancelled = true;
        };
    }, [id]);
    return features;
}
