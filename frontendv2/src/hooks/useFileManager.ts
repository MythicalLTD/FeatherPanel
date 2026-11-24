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

import { reportPanelInteraction } from '@/lib/panel-analytics';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFileManagerApi } from '@/contexts/FileManagerApiContext';
import { filterFeatherTrashFiles, isHiddenServerEntry } from '@/lib/feather-trash';
import { FileObject } from '@/types/server';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage, getApiErrorCode } from '@/lib/api-errors';
import axios from 'axios';

function sanitizeDirectoryPath(path: string | null): string | null {
    if (!path) return null;

    const normalized = ('/' + path).replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
    return normalized === '' ? '/' : normalized;
}

function parentDirectory(path: string): string {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}

/** The daemon answered that the listed folder does not exist (not a missing server or route). */
function isDirectoryNotFound(err: unknown): boolean {
    const code = getApiErrorCode(err);
    if (code === 'FILES_DIRECTORY_NOT_FOUND') return true;
    // WebSpace listings pass the daemon status through with this code.
    return code === 'DAEMON_LIST_FAILED' && axios.isAxiosError(err) && err.response?.status === 404;
}

export interface UseFileManagerOptions {
    /** Skip loading (for example while permissions are still loading or missing). */
    enabled?: boolean;
    /** Poll remote download (pull) progress. Off when the daemon does not support it. */
    pullProgress?: boolean;
}

/**
 * Directory listing, selection, search and pull progress for a file manager. The API comes from
 * FileManagerApiContext, so the same hook drives game server files and WebSpace files.
 */
export function useFileManager(serverUuid: string, options: UseFileManagerOptions = {}) {
    const { enabled = true, pullProgress = true } = options;
    const filesApi = useFileManagerApi();
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
    // Directory the loaded `files` belong to. Rows are only shown while it matches the URL, so a
    // click on a row from the previous folder can never be joined onto the new path.
    const [listedDirectory, setListedDirectory] = useState<string | null>(null);
    const requestSeqRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);

    // Current directory from URL or default to /
    const currentDirectory = sanitizeDirectoryPath(searchParams?.get('path'));

    // Keep users out of panel-managed folders (trash, database dumps)
    useEffect(() => {
        if (!currentDirectory || currentDirectory === '/') return;
        if (!isHiddenServerEntry(currentDirectory.replace(/^\//, ''))) return;
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.delete('path');
        const qs = params.toString();
        router.replace(qs ? `?${qs}` : '?', { scroll: false });
    }, [currentDirectory, router, searchParams]);

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
        if (!serverUuid || !enabled) return;

        const directory = currentDirectory || '/';
        // Only the newest request may update the list; older ones are cancelled and ignored.
        const seq = ++requestSeqRef.current;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        let timeout: ReturnType<typeof setTimeout> | undefined;

        setLoading(true);
        setError(null);
        try {
            const data = await Promise.race([
                filesApi.getFiles(serverUuid, directory, debouncedSearch || undefined, { signal: controller.signal }),
                new Promise<never>((_, reject) => {
                    timeout = setTimeout(() => {
                        controller.abort();
                        reject(new Error('Request timeout'));
                    }, 15000);
                }),
            ]);
            if (seq !== requestSeqRef.current) return;

            const sorted = sortFiles(data.contents);
            setFiles(sorted);
            setListedDirectory(directory);
            setListLimited(data.limited);
            setListLimit(data.limit);
            setListTotal(data.total);
            setSelectedFiles([]);
        } catch (err) {
            if (seq !== requestSeqRef.current) return;
            console.error(err);

            if (directory !== '/' && !debouncedSearch && isDirectoryNotFound(err)) {
                // The folder is gone (deleted, renamed or a stale link): go up instead of failing.
                const parent = parentDirectory(directory);
                toast.info(t('files.messages.directory_not_found', { directory, parent }));
                const params = new URLSearchParams(searchParams?.toString() ?? '');
                if (parent === '/') {
                    params.delete('path');
                } else {
                    params.set('path', parent);
                }
                const qs = params.toString();
                router.replace(qs ? `?${qs}` : '?', { scroll: false });
                return;
            }

            if (err instanceof Error && err.message === 'Request timeout') {
                const message = t('errors.codes.REQUEST_TIMEOUT');
                setError(message);
                toast.error(message);
            } else if (getApiErrorCode(err) === 'WINGS_CONNECTION_UNAVAILABLE') {
                const message = getApiErrorMessage(err, t, 'files.messages.wings_connection_unavailable');
                setError(message);
                toast.error(message);
            } else {
                const message = getApiErrorMessage(err, t, 'files.messages.load_error');
                setError(message);
                toast.error(message);
            }
        } finally {
            if (timeout) clearTimeout(timeout);
            if (seq === requestSeqRef.current) {
                setLoading(false);
            }
        }
    }, [serverUuid, enabled, filesApi, currentDirectory, debouncedSearch, t, router, searchParams]);

    useEffect(() => {
        return () => {
            requestSeqRef.current += 1;
            abortRef.current?.abort();
        };
    }, []);

    // Refresh when directory or server-side search changes
    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverUuid, enabled, currentDirectory, debouncedSearch]);

    // Filtering logic - name search is server-side; only apply local ignore rules here
    const currentFiles = useMemo(
        () => (listedDirectory === (currentDirectory || '/') ? files : []),
        [files, listedDirectory, currentDirectory],
    );

    const filteredFiles = useMemo(() => {
        let result = filterFeatherTrashFiles(currentFiles);

        if (ignoredPatterns.length > 0) {
            result = result.filter((file) => {
                return !ignoredPatterns.some((pattern) => file.name.includes(pattern));
            });
        }

        return result;
    }, [currentFiles, ignoredPatterns]);

    const navigate = (path: string) => {
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        const sanitizedPath = sanitizeDirectoryPath(path) || '/';
        const segment = sanitizedPath.split('/').filter(Boolean).pop() ?? '';
        if (isHiddenServerEntry(segment) || isHiddenServerEntry(sanitizedPath.replace(/^\//, ''))) {
            return;
        }
        setSearchQuery('');
        setDebouncedSearch('');
        // Double-clicks and repeated clicks land on the folder we are already in: no extra history entry.
        if (sanitizedPath === (currentDirectory || '/')) {
            return;
        }
        if (sanitizedPath === '/') {
            params.delete('path');
        } else {
            params.set('path', sanitizedPath);
        }
        reportPanelInteraction('panel.file.browse', 'files');
        // scroll: false - Next's default scroll-to-segment uses scrollIntoView(), which also scrolls the
        // app shell and could push the mobile top bar out of view. Reset the page's own scroller instead.
        router.push(`?${params.toString()}`, { scroll: false });
        if (typeof document !== 'undefined') {
            document.querySelector<HTMLElement>('.fp-shell-main')?.scrollTo({ top: 0 });
        }
    };

    const toggleSelect = (name: string) => {
        reportPanelInteraction('panel.file.select', 'single');
        setSelectedFiles((prev) => (prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]));
    };

    const selectAll = () => {
        reportPanelInteraction(
            'panel.file.select',
            selectedFiles.length === filteredFiles.length ? 'clear-selection' : 'select-all',
        );
        if (selectedFiles.length === filteredFiles.length) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(filteredFiles.map((f) => f.name));
        }
    };

    const [activePulls, setActivePulls] = useState<{ Identifier: string; Progress: number }[]>([]);

    const refreshPulls = useCallback(async () => {
        if (!serverUuid || !enabled || !pullProgress) return;
        try {
            const pulls = await filesApi.getPullFiles(serverUuid);
            setActivePulls(pulls.filter((p) => p.Progress < 100));

            // If any pull is active, refresh file list to see newly created files
            if (pulls.length > 0) {
                // Debounced or conditional refresh might be better, but for now:
                // refresh();
            }
        } catch {
            setActivePulls([]);
        }
    }, [serverUuid, enabled, pullProgress, filesApi]);

    useEffect(() => {
        refreshPulls();
    }, [refreshPulls]);

    // Only poll while downloads are active; otherwise avoid a 5s timer for the whole visit
    useEffect(() => {
        if (activePulls.length === 0) {
            return;
        }
        const interval = setInterval(refreshPulls, 5000);
        return () => clearInterval(interval);
    }, [activePulls.length, refreshPulls]);

    const cancelPull = async (id: string) => {
        try {
            await filesApi.deletePullFile(serverUuid, id);
            toast.success(t('files.messages.download_cancelled'));
            refreshPulls();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'files.messages.cancel_download_failed'));
        }
    };

    return {
        files: filteredFiles, // Return filtered files
        rawFiles: currentFiles,
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
        refreshPulls,
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
