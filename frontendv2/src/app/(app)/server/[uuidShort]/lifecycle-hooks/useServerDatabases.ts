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

import * as React from 'react';
import axios from 'axios';
import type { Database } from '@/types/server';

/** Loads the server's databases (for the database / full backup step options). Fails silently. */
export function useServerDatabases(uuidShort: string): Database[] {
    const [databases, setDatabases] = React.useState<Database[]>([]);

    React.useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!uuidShort) return;
            try {
                const { data } = await axios.get<{ success: boolean; data: { data: Database[] } }>(
                    `/api/user/servers/${uuidShort}/databases`,
                    { params: { page: 1, per_page: 100 } },
                );
                if (!cancelled && data?.success && data?.data) {
                    setDatabases(data.data.data || []);
                }
            } catch {
                // Missing database.read permission or no databases: only the files backup kind is usable.
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [uuidShort]);

    return databases;
}
