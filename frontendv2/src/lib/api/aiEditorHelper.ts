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

export type AiHelperRequest = {
    console_log?: string;
    file_path?: string;
    file_content?: string;
    question?: string;
};

export type AiHelperResponse = {
    explanation: string;
    file_path: string | null;
    suggested_content: string | null;
    unified_diff: string | null;
    model: string;
    redacted: boolean;
};

export async function requestAiHelper(uuidShort: string, body: AiHelperRequest): Promise<AiHelperResponse> {
    const { data } = await axios.post(`/api/user/servers/${encodeURIComponent(uuidShort)}/ai/helper`, body);
    if (!data?.success) {
        throw new Error(data?.message || 'AI helper failed');
    }
    return data.data as AiHelperResponse;
}
