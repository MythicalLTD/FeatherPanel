/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
