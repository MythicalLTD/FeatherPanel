/*
This file is part of FeatherPanel.
 */

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
import { WebSpaceContext } from '@/contexts/WebSpaceContext';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useWebSpacePermissions(_uuidShort: string) {
    const context = useContext(WebSpaceContext);
    if (context) {
        return context;
    }

    return {
        webspace: null,
        loading: false,
        error: null,
        refreshWebSpace: async () => {},
        hasPermission: () => false,
    };
}
