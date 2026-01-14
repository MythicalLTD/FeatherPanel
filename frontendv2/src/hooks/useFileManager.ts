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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { filesApi } from '@/lib/files-api';
import { FileObject } from '@/types/server';
import { toast } from 'sonner';

export function useFileManager(serverUuid: string) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // State
    const [files, setFiles] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [ignoredPatterns, setIgnoredPatterns] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Current directory from URL or default to /
    const currentDirectory = searchParams?.get('path') || '/';

    // Load ignored patterns
    const refreshIgnored = useCallback(() => {
        const saved = localStorage.getItem(`feather_ignored_${serverUuid}`);
        if (saved) {
            try {
                setIgnoredPatterns(JSON.parse(saved));
            } catch {
                console.error('Failed to parse ignored patterns');
            }
        } else {
            setIgnoredPatterns([]);
        }
    }, [serverUuid]);

    useEffect(() => {
        refreshIgnored();
    }, [refreshIgnored]);

    const refresh = useCallback(async () => {
        if (!serverUuid) return;

        setLoading(true);
        setError(null);
        try {
            const data = await filesApi.getFiles(serverUuid, currentDirectory);
            const sorted = sortFiles(data);
            setFiles(sorted);
            setSelectedFiles([]);
        } catch (err) {
            console.error(err);
            setError('Failed to load files');
            toast.error('Failed to load files');
        } finally {
            setLoading(false);
        }
    }, [serverUuid, currentDirectory]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Filtering logic
    const filteredFiles = useMemo(() => {
        let result = files;

        // Apply ignored patterns
        if (ignoredPatterns.length > 0) {
            result = result.filter((file) => {
                return !ignoredPatterns.some((pattern) => file.name.includes(pattern));
            });
        }

        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter((file) => file.name.toLowerCase().includes(query));
        }

        return result;
    }, [files, ignoredPatterns, searchQuery]);

    const navigate = (path: string) => {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        if (path === '/') {
            params.delete('path');
        } else {
            params.set('path', path);
        }
        router.push(`?${params.toString()}`);
    };

    const toggleSelect = (name: string) => {
        setSelectedFiles((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]));
    };

    const selectAll = () => {
        if (selectedFiles.length === filteredFiles.length) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(filteredFiles.map((f) => f.name));
        }
    };

    const [activePulls, setActivePulls] = useState<{ Identifier: string; Progress: number }[]>([]);

    const refreshPulls = useCallback(async () => {
        if (!serverUuid) return;
        try {
            const pulls = await filesApi.getPullFiles(serverUuid);
            setActivePulls(pulls);

            // If any pull is active, refresh file list to see newly created files
            if (pulls.length > 0) {
                // Debounced or conditional refresh might be better, but for now:
                // refresh();
            }
        } catch {
            console.error('Failed to refresh pulls');
        }
    }, [serverUuid]);

    useEffect(() => {
        refreshPulls();
        const interval = setInterval(refreshPulls, 5000);
        return () => clearInterval(interval);
    }, [refreshPulls]);

    const cancelPull = async (id: string) => {
        try {
            await filesApi.deletePullFile(serverUuid, id);
            toast.success('Download cancelled');
            refreshPulls();
        } catch {
            toast.error('Failed to cancel download');
        }
    };

    return {
        files: filteredFiles, // Return filtered files
        rawFiles: files,
        loading,
        error,
        currentDirectory,
        selectedFiles,
        activePulls,
        searchQuery,
        setSearchQuery,
        setSelectedFiles,
        refresh,
        refreshIgnored,
        navigate,
        toggleSelect,
        selectAll,
        cancelPull,
    };
}

function sortFiles(files: FileObject[]): FileObject[] {
    return [...files].sort((a, b) => {
        if (a.isFile === b.isFile) {
            return a.name.localeCompare(b.name);
        }
        return a.isFile ? 1 : -1; // Folders first
    });
}
