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

import api from '../api';

export const passkeysApi = {
    list: async () => {
        const response = await api.get('/user/passkeys');
        return response.data;
    },

    registrationOptions: async () => {
        const response = await api.post('/user/passkeys/registration/options', {});
        return response.data;
    },

    registrationVerify: async (data: { challenge_token: string; credential: unknown; label?: string }) => {
        const response = await api.post('/user/passkeys/registration/verify', data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete(`/user/passkeys/${id}`);
        return response.data;
    },

    updateLabel: async (id: number, label: string | null) => {
        const response = await api.patch(`/user/passkeys/${id}`, { label });
        return response.data;
    },
};
