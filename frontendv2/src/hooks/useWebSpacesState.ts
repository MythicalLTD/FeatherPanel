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

export type WebSpacesLayout = 'grid' | 'list';
export type WebSpacesSort = 'name' | 'status' | 'node';

export function useWebSpacesState() {
    const [selectedLayout, setSelectedLayout] = useState<WebSpacesLayout>(() => {
        if (typeof window === 'undefined') return 'list';
        const saved = localStorage.getItem('featherpanel_webspaces_layout');
        return (saved as WebSpacesLayout) || 'list';
    });

    const [selectedSort, setSelectedSort] = useState<WebSpacesSort>(() => {
        if (typeof window === 'undefined') return 'name';
        const saved = localStorage.getItem('featherpanel_webspaces_sort');
        return (saved as WebSpacesSort) || 'name';
    });

    const [showOnlyRunning, setShowOnlyRunning] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('featherpanel_webspaces_running_only') === 'true';
    });

    const updateLayout = useCallback((layout: WebSpacesLayout) => {
        setSelectedLayout(layout);
        if (typeof window !== 'undefined') {
            localStorage.setItem('featherpanel_webspaces_layout', layout);
        }
    }, []);

    const updateSort = useCallback((sort: WebSpacesSort) => {
        setSelectedSort(sort);
        if (typeof window !== 'undefined') {
            localStorage.setItem('featherpanel_webspaces_sort', sort);
        }
    }, []);

    const updateShowOnlyRunning = useCallback((show: boolean) => {
        setShowOnlyRunning(show);
        if (typeof window !== 'undefined') {
            localStorage.setItem('featherpanel_webspaces_running_only', show ? 'true' : 'false');
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
