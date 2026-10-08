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

import { useCallback, useEffect, useState } from 'react';
import {
    clearPanelApiHistory,
    getPanelApiHistory,
    sendPanelApiRequest,
    subscribePanelApiHistory,
    type PanelApiHistoryEntry,
    type PanelApiReplayParams,
} from '@/lib/panel-api-history';

export function usePanelApiHistory() {
    const [, bump] = useState(0);

    useEffect(() => subscribePanelApiHistory(() => bump((value) => value + 1)), []);

    const entries = getPanelApiHistory();

    const clear = useCallback(() => {
        clearPanelApiHistory();
    }, []);

    const send = useCallback(async (params: PanelApiReplayParams): Promise<PanelApiHistoryEntry> => {
        return sendPanelApiRequest(params);
    }, []);

    return { entries, clear, send };
}
