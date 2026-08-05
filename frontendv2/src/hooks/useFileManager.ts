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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { filesApi } from '@/lib/files-api';
import { filterFeatherTrashFiles, isFeatherTrashEntry } from '@/lib/feather-trash';
import { FileObject } from '@/types/server';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';

function sanitizeDirectoryPath(path: string | null): string | null {
    if (!path) return null;

    const normalized = ('/' + path).replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
    return normalized === '' ? '/' : normalized;
}

export function useFileManager(serverUuid: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    // State
    const [files, setFiles] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [ignoredPatterns, setIgnoredPatterns] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [listLimited, setListLimited] = useState(false);
    const [listLimit, setListLimit] = useState(250);
    const [listTotal, setListTotal] = useState(0);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Current directory from URL or default to /
    const currentDirectory = sanitizeDirectoryPath(searchParams?.get('path'));

    // Debounce search so we filter on the server (full directory) instead of
    // only the first 250 client-loaded items.
    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
        searchDebounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 250);
        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [searchQuery]);

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
            const data = await Promise.race([
                filesApi.getFiles(serverUuid, currentDirectory || undefined, debouncedSearch || undefined),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 15000)),
            ]);

            const sorted = sortFiles(data.contents);
            setFiles(sorted);
            setListLimited(data.limited);
            setListLimit(data.limit);
            setListTotal(data.total);
            setSelectedFiles([]);
        } catch (err) {
            console.error(err);
            const apiError = err as {
                response?: {
                    data?: {
                        message?: string;
                        error_code?: string;
                    };
                };
            };
            const apiMessage = apiError.response?.data?.message;
            const apiErrorCode = apiError.response?.data?.error_code;

            if (apiErrorCode === 'WINGS_CONNECTION_UNAVAILABLE') {
                setError(t('files.messages.wings_connection_unavailable'));
                toast.error(apiMessage || t('files.messages.wings_connection_unavailable'));
                return;
            }

            if (err instanceof Error && err.message === 'Request timeout') {
                setError(t('files.messages.request_timed_out'));
                toast.error(t('files.messages.load_timeout_retry'));
            } else {
                setError(apiMessage || t('files.messages.load_error'));
                toast.error(apiMessage || t('files.messages.load_error'));
            }
        } finally {
            setLoading(false);
        }
    }, [serverUuid, currentDirectory, debouncedSearch, t]);

    // Refresh when directory or server-side search changes
    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverUuid, currentDirectory, debouncedSearch]);

    // Filtering logic — name search is server-side; only apply local ignore rules here
    const filteredFiles = useMemo(() => {
        let result = filterFeatherTrashFiles(files);

        if (ignoredPatterns.length > 0) {
            result = result.filter((file) => {
                return !ignoredPatterns.some((pattern) => file.name.includes(pattern));
            });
        }

        return result;
    }, [files, ignoredPatterns]);

    const navigate = (path: string) => {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        const sanitizedPath = sanitizeDirectoryPath(path) || '/';
        const segment = sanitizedPath.split('/').filter(Boolean).pop() ?? '';
        if (isFeatherTrashEntry(segment) || isFeatherTrashEntry(sanitizedPath.replace(/^\//, ''))) {
            return;
        }
        if (sanitizedPath === '/') {
            params.delete('path');
        } else {
            params.set('path', sanitizedPath);
        }
        setSearchQuery('');
        setDebouncedSearch('');
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
            toast.success(t('files.messages.download_cancelled'));
            refreshPulls();
        } catch {
            toast.error(t('files.messages.cancel_download_failed'));
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
        listLimited,
        listLimit,
        listTotal,
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
