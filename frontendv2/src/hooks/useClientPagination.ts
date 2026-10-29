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

import { useEffect, useMemo, useState } from 'react';

/** Splits an already loaded list into pages for ListPagination. Resets to page 1 when the list shrinks. */
export function useClientPagination<T>(rows: T[], pageSize = 20) {
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

    useEffect(() => {
        if (page > totalPages) setPage(1);
    }, [page, totalPages]);

    const paged = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);

    return { page, setPage, totalPages, paged, pageSize, totalItems: rows.length };
}
