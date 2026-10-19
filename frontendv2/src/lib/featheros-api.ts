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

import api from './api';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export type FeatherOsNoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange' | 'gray';

export interface FeatherOsNote {
    id: number;
    title: string;
    content: string;
    color: FeatherOsNoteColor;
    pinned: boolean;
    created_at: string;
    updated_at: string;
}

export interface FeatherOsTrashEntry {
    id: string;
    server_uuid: string;
    original_root: string;
    original_name: string;
    is_directory: boolean;
    size: number;
    deleted_at: string;
    trash_path: string;
}

export interface FeatherOsStateResponse<T> {
    state: T | null;
    revision: number;
    updated_at: string | null;
}

/** Client for the FeatherOS endpoints (desktop state + notes). Server actions use the normal server APIs. */
export const featherOsApi = {
    getState: async <T>(): Promise<FeatherOsStateResponse<T>> => {
        const res = await api.get<ApiResponse<FeatherOsStateResponse<T>>>('/user/featheros/state');
        return res.data.data;
    },

    saveState: async <T>(state: T): Promise<{ revision: number; updated_at: string }> => {
        const res = await api.put<ApiResponse<{ revision: number; updated_at: string }>>('/user/featheros/state', {
            state,
        });
        return res.data.data;
    },

    /** Best-effort save while the tab is closing (axios cannot outlive the page). */
    saveStateOnUnload: <T>(state: T): void => {
        try {
            void fetch('/api/user/featheros/state', {
                method: 'PUT',
                credentials: 'include',
                keepalive: true,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state }),
            });
        } catch {
            // ignore: the debounced save already ran for most changes
        }
    },

    resetState: async (): Promise<void> => {
        await api.delete('/user/featheros/state');
    },

    listNotes: async (): Promise<FeatherOsNote[]> => {
        const res = await api.get<ApiResponse<{ notes: FeatherOsNote[] }>>('/user/featheros/notes');
        return res.data.data.notes ?? [];
    },

    createNote: async (note: Partial<Pick<FeatherOsNote, 'title' | 'content' | 'color' | 'pinned'>>) => {
        const res = await api.post<ApiResponse<{ note: FeatherOsNote }>>('/user/featheros/notes', note);
        return res.data.data.note;
    },

    updateNote: async (id: number, note: Partial<Pick<FeatherOsNote, 'title' | 'content' | 'color' | 'pinned'>>) => {
        const res = await api.put<ApiResponse<{ note: FeatherOsNote }>>(`/user/featheros/notes/${id}`, note);
        return res.data.data.note;
    },

    deleteNote: async (id: number): Promise<void> => {
        await api.delete(`/user/featheros/notes/${id}`);
    },

    /** Upload a wallpaper image; returns a URL under /attachments/featheros-wallpapers/. */
    uploadWallpaper: async (file: File): Promise<string> => {
        const body = new FormData();
        body.append('wallpaper', file);
        const res = await api.post<ApiResponse<{ wallpaper_url: string }>>('/user/featheros/wallpaper', body, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data.data.wallpaper_url;
    },

    listTrash: async (): Promise<FeatherOsTrashEntry[]> => {
        const res = await api.get<ApiResponse<{ entries: FeatherOsTrashEntry[] }>>('/user/featheros/trash');
        return res.data.data.entries ?? [];
    },

    registerTrash: async (
        entries: Array<{
            uuid: string;
            server_uuid: string;
            original_root: string;
            original_name: string;
            is_directory: boolean;
            size: number;
        }>,
    ): Promise<FeatherOsTrashEntry[]> => {
        const res = await api.post<ApiResponse<{ entries: FeatherOsTrashEntry[] }>>('/user/featheros/trash', {
            entries,
        });
        return res.data.data.entries ?? [];
    },

    forgetTrash: async (ids: string[]): Promise<number> => {
        const res = await api.post<ApiResponse<{ deleted: number }>>('/user/featheros/trash/forget', { ids });
        return res.data.data.deleted ?? 0;
    },
};

export default featherOsApi;
