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

/** Error reporting is disabled: only server-side aggregate counts may be sent. */
export function setClientMonitoringEnabled(_allowed: boolean, _version?: string): Promise<null> {
    void _allowed;
    void _version;
    return Promise.resolve(null);
}

export function captureClientException(
    _error: Error,
    _source: 'runtime' | 'react-boundary' | 'global-boundary' = 'runtime',
): void {
    void _error;
    void _source;
}
