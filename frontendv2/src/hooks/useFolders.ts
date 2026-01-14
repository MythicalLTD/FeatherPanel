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

import { useState, useEffect, useCallback } from 'react';
import type { ServerFolder } from '@/types/server';

const STORAGE_KEY = 'server_folders';

export function useFolders() {
    const [folders, setFolders] = useState<ServerFolder[]>(() => {
        if (typeof window === 'undefined') return [];

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load folders from localStorage:', error);
        }

        return [];
    });

    // Save to localStorage whenever folders change
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
        } catch (error) {
            console.error('Failed to save folders to localStorage:', error);
        }
    }, [folders]);

    const [serverAssignments, setServerAssignments] = useState<Record<string, number>>(() => {
        if (typeof window === 'undefined') return {};

        try {
            const stored = localStorage.getItem('server_folder_assignments');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load server assignments from localStorage:', error);
        }

        return {};
    });

    // Save assignments to localStorage whenever they change
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem('server_folder_assignments', JSON.stringify(serverAssignments));
        } catch (error) {
            console.error('Failed to save server assignments to localStorage:', error);
        }
    }, [serverAssignments]);

    const createFolder = useCallback((name: string, description?: string) => {
        const newFolder: ServerFolder = {
            id: Date.now(),
            user_id: 1,
            name,
            description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            servers: [],
        };
        setFolders((prev) => [...prev, newFolder]);
        return newFolder;
    }, []);

    const updateFolder = useCallback((id: number, name: string, description?: string) => {
        setFolders((prev) =>
            prev.map((f) => (f.id === id ? { ...f, name, description, updated_at: new Date().toISOString() } : f)),
        );
    }, []);

    const deleteFolder = useCallback((id: number) => {
        setFolders((prev) => prev.filter((f) => f.id !== id));
        // Also remove assignments for this folder
        setServerAssignments((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (next[key] === id) {
                    delete next[key];
                }
            });
            return next;
        });
    }, []);

    const assignServerToFolder = useCallback((serverUuid: string, folderId: number) => {
        setServerAssignments((prev) => ({
            ...prev,
            [serverUuid]: folderId,
        }));
    }, []);

    const unassignServer = useCallback((serverUuid: string) => {
        setServerAssignments((prev) => {
            const next = { ...prev };
            delete next[serverUuid];
            return next;
        });
    }, []);

    return {
        folders,
        serverAssignments,
        createFolder,
        updateFolder,
        deleteFolder,
        assignServerToFolder,
        unassignServer,
    };
}
