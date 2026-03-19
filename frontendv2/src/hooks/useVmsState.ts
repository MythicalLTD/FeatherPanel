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

import { useState, useCallback } from 'react';

export type VmsLayout = 'grid' | 'list';
export type VmsSort = 'name' | 'status' | 'created' | 'updated';

export function useVmsState() {
    const [selectedLayout, setSelectedLayout] = useState<VmsLayout>(() => {
        if (typeof window === 'undefined') return 'grid';
        const saved = localStorage.getItem('featherpanel_vms_layout');
        return (saved as VmsLayout) || 'grid';
    });

    const [selectedSort, setSelectedSort] = useState<VmsSort>(() => {
        if (typeof window === 'undefined') return 'name';
        const saved = localStorage.getItem('featherpanel_vms_sort');
        return (saved as VmsSort) || 'name';
    });

    const [showOnlyRunning, setShowOnlyRunning] = useState(() => {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem('featherpanel_vms_running_only');
        return saved === 'true';
    });

    const updateLayout = useCallback((layout: VmsLayout) => {
        setSelectedLayout(layout);
        if (typeof window !== 'undefined') {
            localStorage.setItem('featherpanel_vms_layout', layout);
        }
    }, []);

    const updateSort = useCallback((sort: VmsSort) => {
        setSelectedSort(sort);
        if (typeof window !== 'undefined') {
            localStorage.setItem('featherpanel_vms_sort', sort);
        }
    }, []);

    const updateShowOnlyRunning = useCallback((show: boolean) => {
        setShowOnlyRunning(show);
        if (typeof window !== 'undefined') {
            localStorage.setItem('featherpanel_vms_running_only', show ? 'true' : 'false');
        }
    }, []);

    return {
        selectedLayout,
        selectedSort,
        showOnlyRunning,
        setSelectedLayout: updateLayout,
        setSelectedSort: updateSort,
        setShowOnlyRunning: updateShowOnlyRunning,
    };
}
