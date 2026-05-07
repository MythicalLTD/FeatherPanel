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

import axios from 'axios';

/**
 * Triggering a Docker self-update often stops the backend container before the HTTP response
 * finishes. Those cases should show the "update in progress" flow, not a failure toast.
 */
export function isDockerUpdateTriggerLikelyStartedError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
        if (axios.isCancel(error)) {
            return false;
        }
        if (error.response === undefined) {
            return true;
        }
        const status = error.response.status;
        return status === 502 || status === 503 || status === 504 || status === 522 || status === 524;
    }
    return false;
}
