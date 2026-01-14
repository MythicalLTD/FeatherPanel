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

import { useContext } from 'react';
import { ServerContext } from '@/contexts/ServerContext';

// uuidShort is used to identify the server but we now get it from context.
// However, the hook signature expects it. I'll keep it as _uuidShort to silence linter.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useServerPermissions(_uuidShort: string) {
    // Attempt to consume the context
    const context = useContext(ServerContext);

    // If context exists, return it
    if (context) {
        return context;
    }

    // If we are NOT in a ServerProvider (e.g., Dashboard page), return a safe fallback.
    // This effectively means "no server selected, no permissions".
    // This avoids errors when useNavigation calls this hook on global pages.
    return {
        server: null,
        loading: false,
        error: null,
        refreshServer: async () => {},
        hasPermission: () => false,
    };
}
