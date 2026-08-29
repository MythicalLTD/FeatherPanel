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

import { createContext, useContext, type ReactNode } from 'react';
import { filesApi } from '@/lib/files-api';

export type FileManagerApi = typeof filesApi;

const FileManagerApiContext = createContext<FileManagerApi>(filesApi);

export function FileManagerApiProvider({ value, children }: { value: FileManagerApi; children: ReactNode }) {
    return <FileManagerApiContext.Provider value={value}>{children}</FileManagerApiContext.Provider>;
}

export function useFileManagerApi(): FileManagerApi {
    return useContext(FileManagerApiContext);
}
