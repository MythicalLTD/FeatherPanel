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

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Download, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { FileManagerApiProvider, useFileManagerApi } from '@/contexts/FileManagerApiContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import {
    webspaceFilesApi,
    resolveWebSpaceFileCapabilities,
    type WebSpaceFileCapabilitiesMap,
} from '@/lib/webspace-files-api';
import { getFeatherpanelApiErrorMessage } from '@/lib/api';
import { triggerSignedUrlDownload } from '@/lib/trigger-signed-download';
import { isBinaryLikeFileName } from '@/lib/binary-like-file-names';
import {
    filterSelectableFiles,
    createTrashFolderEntry,
    FEATHER_TRASH_DIR,
    isTrashShortcut,
    trashStatsFromList,
    type TrashFolderStats,
} from '@/lib/feather-trash';
import { ARCHIVE_EXTRACT_DRAG_MIME } from '@/lib/files-api';
import { useSettings } from '@/contexts/SettingsContext';
import { isEnabled } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileObject } from '@/types/server';
import { FileActionToolbar } from '@/app/(app)/server/[uuidShort]/files/components/FileActionToolbar';
import { FileBreadcrumbs } from '@/app/(app)/server/[uuidShort]/files/components/FileBreadcrumbs';
import { FileList } from '@/app/(app)/server/[uuidShort]/files/components/FileList';
import {
    CreateFolderDialog,
    CreateFileDialog,
    DeleteDialog,
    RenameDialog,
    ImagePreviewDialog,
    PermissionsDialog,
    MoveCopyDialog,
    PullFileDialog,
    CompressDialog,
    FileHashDialog,
    ShareFileDialog,
    WipeAllDialog,
    EmptyTrashDialog,
    ArchiveBrowsePanel,
} from '@/app/(app)/server/[uuidShort]/files/components/dialogs';

type FileWithPath = { file: File; relativePath: string };

type UploadQueueItem = {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'done' | 'error';
    error?: string;
    targetDirectory: string;
    batchId?: string;
};

const DRAG_MIME = 'application/x-featherpanel-files';

function normalizePath(p: string): string {
    const withLeading = p.startsWith('/') ? p : `/${p}`;
    const collapsed = withLeading.replace(/\/+/g, '/');
    return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

function joinPath(dir: string, name: string): string {
    return normalizePath(`${dir}/${name}`);
}

function resolveDirectoryTarget(currentDirectory: string, nameOrPath: string): string {
    if (!nameOrPath) return normalizePath(currentDirectory || '/');
    if (nameOrPath.startsWith('/')) return normalizePath(nameOrPath);
    return joinPath(currentDirectory || '/', nameOrPath);
}

function sortFiles(files: FileObject[]): FileObject[] {
    return [...files].sort((a, b) => {
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

async function collectFilesFromDataTransfer(dt: DataTransfer): Promise<FileWithPath[]> {
    const result: FileWithPath[] = [];
    const items = dt.items;
    if (!items?.length) return result;

    const readEntry = async (
        entry: FileSystemFileEntry | FileSystemDirectoryEntry,
        basePath: string,
    ): Promise<void> => {
        if (entry.isFile) {
            const file = await new Promise<File>((resolve, reject) => {
                (entry as FileSystemFileEntry).file(resolve, reject);
            });
            result.push({ file, relativePath: basePath ? `${basePath}/${file.name}` : file.name });
        } else if (entry.isDirectory) {
            const dir = entry as FileSystemDirectoryEntry;
            const reader = dir.createReader();
            const dirName = basePath ? `${basePath}/${dir.name}` : dir.name;
            while (true) {
                const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
                    reader.readEntries(resolve, reject);
                });
                if (!entries.length) break;
                for (const child of entries) {
                    await readEntry(child as FileSystemFileEntry | FileSystemDirectoryEntry, dirName);
                }
            }
        }
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry?.() ?? null;
        if (entry) {
            await readEntry(entry as FileSystemFileEntry | FileSystemDirectoryEntry, '');
        } else {
            const file = item.getAsFile();
            if (file) result.push({ file, relativePath: file.name });
        }
    }
    return result;
}

let uploadIdCounter = 0;
const generateUploadId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    uploadIdCounter += 1;
    return `upload-${Date.now()}-${uploadIdCounter}`;
};

function WebSpaceFilesPageInner({ uuidShort }: { uuidShort: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const filesApi = useFileManagerApi();
    const { hasPermission } = useWebSpacePermissions(uuidShort);
    const [fileCaps, setFileCaps] = useState<WebSpaceFileCapabilitiesMap | null>(null);

    useEffect(() => {
        void webspaceFilesApi.getFileCapabilities(uuidShort).then(setFileCaps);
    }, [uuidShort]);

    const caps = useMemo(() => resolveWebSpaceFileCapabilities(fileCaps), [fileCaps]);

    const trashEnabled = isEnabled(settings?.file_trash_enabled) && caps.trash;
    const shareEnabled = caps.share;
    const archiveBrowseEnabled = caps.archiveBrowse;
    const directoryDownloadEnabled = caps.directoryDownload;
    const fileSearchEnabled = caps.advancedSearch;
    const wipeAllEnabled = caps.wipeAll;
    const pullProgressEnabled = caps.pullProgress;
    const compressCapabilities = useMemo(() => ({ compress_7z: caps.compress7z }), [caps.compress7z]);

    const canRead = hasPermission(WebSpaceSubuserPermissions['file.read']);
    const canCreate = hasPermission(WebSpaceSubuserPermissions['file.create']);
    const canUpdate = hasPermission(WebSpaceSubuserPermissions['file.update']);
    const canDelete = hasPermission(WebSpaceSubuserPermissions['file.delete']);
    const canReadContent = hasPermission(WebSpaceSubuserPermissions['file.read-content']);
    const canArchive = hasPermission(WebSpaceSubuserPermissions['file.create']);

    const currentDirectory = normalizePath(searchParams?.get('path') || '/');
    const filesBasePath = `/webspace/${uuidShort}/files`;

    const [files, setFiles] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [actionFile, setActionFile] = useState<FileObject | null>(null);
    const [anchorName, setAnchorName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [draggingFileNames, setDraggingFileNames] = useState<string[]>([]);
    const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [createFileOpen, setCreateFileOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pullFileOpen, setPullFileOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [moveCopyOpen, setMoveCopyOpen] = useState(false);
    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [compressOpen, setCompressOpen] = useState(false);
    const [fileHashOpen, setFileHashOpen] = useState(false);
    const [shareFileOpen, setShareFileOpen] = useState(false);
    const [wipeAllOpen, setWipeAllOpen] = useState(false);
    const [archiveBrowseOpen, setArchiveBrowseOpen] = useState(false);
    const [searchFiltersOpen, setSearchFiltersOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<FileObject[] | null>(null);
    const [trashStats, setTrashStats] = useState<TrashFolderStats | null>(null);
    const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
    const [emptyTrashBusy, setEmptyTrashBusy] = useState(false);
    const [activePulls, setActivePulls] = useState<{ Identifier: string; Progress: number }[]>([]);
    const [includePattern, setIncludePattern] = useState('');
    const [excludePattern, setExcludePattern] = useState('');
    const [searchCaseInsensitive] = useState(true);
    const [contentQuery, setContentQuery] = useState('');
    const [contentCaseInsensitive] = useState(true);
    const [maxFileSizeMiB] = useState(5);
    const [includeOversized] = useState(false);
    const [minSizeBytes, setMinSizeBytes] = useState(0);
    const [maxSizeBytes, setMaxSizeBytes] = useState(0);
    const [filesToCompress, setFilesToCompress] = useState<string[]>([]);
    const [moveCopyAction, setMoveCopyAction] = useState<'move' | 'copy'>('move');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const uploadProcessingRef = useRef(false);
    const createdDirectoriesRef = useRef<Set<string>>(new Set());
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shiftPivotRef = useRef<string | null>(null);

    const navigate = useCallback(
        (path: string) => {
            const params = new URLSearchParams(searchParams?.toString() ?? '');
            const sanitized = normalizePath(path || '/');
            if (sanitized === '/') {
                params.delete('path');
            } else {
                params.set('path', sanitized);
            }
            const qs = params.toString();
            router.push(qs ? `${filesBasePath}?${qs}` : filesBasePath);
            setSelectedFiles([]);
            setSearchQuery('');
            setDebouncedSearch('');
        },
        [filesBasePath, router, searchParams],
    );

    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 250);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [searchQuery]);

    const refresh = useCallback(async () => {
        if (!uuidShort || !canRead) return;
        setLoading(true);
        try {
            const data = await filesApi.getFiles(uuidShort, currentDirectory, debouncedSearch || undefined);
            setFiles(sortFiles(data.contents));
            setSelectedFiles([]);
        } catch (error) {
            toast.error(getFeatherpanelApiErrorMessage(error) || t('files.messages.load_error'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, canRead, filesApi, currentDirectory, debouncedSearch, t]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const activeAdvancedFiltersCount = useMemo(() => {
        let count = 0;
        if (includePattern.trim()) count++;
        if (excludePattern.trim()) count++;
        if (contentQuery.trim()) count++;
        if (!searchCaseInsensitive) count++;
        if (!contentCaseInsensitive) count++;
        if (maxFileSizeMiB !== 5) count++;
        if (includeOversized) count++;
        if (minSizeBytes > 0) count++;
        if (maxSizeBytes > 0) count++;
        return count;
    }, [
        includePattern,
        excludePattern,
        contentQuery,
        searchCaseInsensitive,
        contentCaseInsensitive,
        maxFileSizeMiB,
        includeOversized,
        minSizeBytes,
        maxSizeBytes,
    ]);
    const hasAdvancedFilters = activeAdvancedFiltersCount > 0;

    const refreshTrashStats = useCallback(async () => {
        if (!trashEnabled || !uuidShort) return;
        try {
            const data = await filesApi.listTrash(uuidShort);
            setTrashStats(trashStatsFromList(data));
        } catch {
            setTrashStats({ totalSize: 0, lastModified: null, itemCount: 0 });
        }
    }, [filesApi, trashEnabled, uuidShort]);

    useEffect(() => {
        void refreshTrashStats();
    }, [refreshTrashStats]);

    const refreshPulls = useCallback(async () => {
        if (!pullProgressEnabled || !uuidShort) return;
        try {
            const pulls = await filesApi.getPullFiles(uuidShort);
            setActivePulls(pulls.filter((p) => p.Progress < 100));
        } catch {
            setActivePulls([]);
        }
    }, [filesApi, pullProgressEnabled, uuidShort]);

    useEffect(() => {
        void refreshPulls();
    }, [refreshPulls]);

    useEffect(() => {
        if (!pullProgressEnabled || activePulls.length === 0) return;
        const interval = setInterval(() => void refreshPulls(), 5000);
        return () => clearInterval(interval);
    }, [activePulls.length, pullProgressEnabled, refreshPulls]);

    const cancelPull = useCallback(
        async (id: string) => {
            try {
                await filesApi.deletePullFile(uuidShort, id);
                toast.success(t('files.messages.download_cancelled'));
                void refreshPulls();
            } catch {
                toast.error(t('files.messages.cancel_download_failed'));
            }
        },
        [filesApi, refreshPulls, t, uuidShort],
    );

    useEffect(() => {
        let cancelled = false;
        if (!hasAdvancedFilters || !fileSearchEnabled) {
            setSearchResults(null);
            setSearchLoading(false);
            return;
        }

        const timeout = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const results = await filesApi.searchFiles(uuidShort, {
                    directory: currentDirectory || '/',
                    pattern: searchQuery || undefined,
                    include: includePattern || undefined,
                    exclude: excludePattern || undefined,
                    case_insensitive: searchCaseInsensitive,
                    content: contentQuery || undefined,
                    content_case_insensitive: contentCaseInsensitive,
                    min_size: minSizeBytes || undefined,
                    max_size: maxSizeBytes || undefined,
                    max_content_size: Math.max(0, maxFileSizeMiB) * 1024 * 1024,
                    include_oversized: includeOversized,
                });
                if (!cancelled) setSearchResults(results);
            } catch {
                if (!cancelled) {
                    toast.error(t('files.search.search_failed'));
                    setSearchResults([]);
                }
            } finally {
                if (!cancelled) setSearchLoading(false);
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [
        uuidShort,
        currentDirectory,
        searchQuery,
        includePattern,
        excludePattern,
        searchCaseInsensitive,
        contentQuery,
        contentCaseInsensitive,
        minSizeBytes,
        maxSizeBytes,
        maxFileSizeMiB,
        includeOversized,
        hasAdvancedFilters,
        fileSearchEnabled,
        filesApi,
        t,
    ]);

    const closeArchiveBrowse = useCallback(() => {
        setArchiveBrowseOpen(false);
        setActionFile((file) => (file && archiveBrowseOpen ? null : file));
    }, [archiveBrowseOpen]);

    const performArchiveExtract = useCallback(
        async (payload: { root: string; file: string; entries: string[] }, destinationPath: string) => {
            const toastId = toast.loading(t('files.messages.archive_members_extracting'));
            try {
                await filesApi.extractArchiveSelection(
                    uuidShort,
                    payload.root,
                    payload.file,
                    normalizePath(destinationPath || '/'),
                    payload.entries,
                );
                toast.success(t('files.messages.archive_members_extracted'), { id: toastId });
                closeArchiveBrowse();
                void refresh();
            } catch (error) {
                toast.error(
                    getFeatherpanelApiErrorMessage(error) || t('files.messages.archive_members_extract_failed'),
                    {
                        id: toastId,
                    },
                );
            }
        },
        [closeArchiveBrowse, filesApi, refresh, t, uuidShort],
    );

    const handleEmptyTrash = async () => {
        setEmptyTrashBusy(true);
        try {
            await filesApi.emptyTrash(uuidShort);
            toast.success(t('files.trash.messages.emptied'));
            setEmptyTrashOpen(false);
            await refreshTrashStats();
            void refresh();
        } catch {
            toast.error(t('files.trash.messages.empty_error'));
        } finally {
            setEmptyTrashBusy(false);
        }
    };

    const baseFiles = searchResults ?? files;
    const selectableFiles = useMemo(() => filterSelectableFiles(baseFiles), [baseFiles]);
    const visibleFiles = useMemo(() => {
        if (!trashEnabled || searchResults !== null) return baseFiles;
        return [createTrashFolderEntry(trashStats ?? undefined), ...baseFiles];
    }, [baseFiles, trashEnabled, searchResults, trashStats]);

    const toggleSelect = (name: string) => {
        const entry = visibleFiles.find((f) => f.name === name);
        if (entry && isTrashShortcut(entry)) return;
        setSelectedFiles((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
        setAnchorName(name);
        shiftPivotRef.current = null;
    };

    const handleSelectAll = () => {
        const names = selectableFiles.map((f) => f.name);
        const allSelected = names.length > 0 && names.every((n) => selectedFiles.includes(n));
        setSelectedFiles(allSelected ? [] : names);
    };

    const handleModifierClick = (file: FileObject, event: React.MouseEvent) => {
        if (isTrashShortcut(file)) return;
        const isCtrlLike = event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;
        if (isShift && visibleFiles.length) {
            const pivot = shiftPivotRef.current || anchorName || file.name;
            const pivotIdx = visibleFiles.findIndex((f) => f.name === pivot);
            const targetIdx = visibleFiles.findIndex((f) => f.name === file.name);
            if (pivotIdx >= 0 && targetIdx >= 0) {
                const [start, end] = pivotIdx <= targetIdx ? [pivotIdx, targetIdx] : [targetIdx, pivotIdx];
                setSelectedFiles(visibleFiles.slice(start, end + 1).map((f) => f.name));
                setAnchorName(file.name);
                if (!shiftPivotRef.current) shiftPivotRef.current = pivot;
                return;
            }
        }
        if (isCtrlLike) {
            toggleSelect(file.name);
            return;
        }
        setSelectedFiles([file.name]);
        setAnchorName(file.name);
        shiftPivotRef.current = null;
    };

    const ensureDirectoryExists = useCallback(
        async (directory: string) => {
            const target = normalizePath(directory);
            if (target === '/' || createdDirectoriesRef.current.has(target)) return;
            const segments = target.replace(/^\/+|\/+$/g, '').split('/');
            let current = '/';
            for (const segment of segments) {
                const next = current === '/' ? `/${segment}` : `${current}/${segment}`;
                if (!createdDirectoriesRef.current.has(next)) {
                    try {
                        await filesApi.createFolder(uuidShort, current, segment);
                    } catch {
                        // may already exist
                    }
                    createdDirectoriesRef.current.add(next);
                }
                current = next;
            }
        },
        [filesApi, uuidShort],
    );

    const processUploadQueue = useCallback(
        async (queue: UploadQueueItem[]) => {
            if (uploadProcessingRef.current) return;
            const next = queue.find((u) => u.status === 'pending');
            if (!next) return;
            uploadProcessingRef.current = true;
            setUploadQueue((prev) =>
                prev.map((u) => (u.id === next.id ? { ...u, status: 'uploading' as const, progress: 0 } : u)),
            );
            try {
                await ensureDirectoryExists(next.targetDirectory);
                await filesApi.uploadFile(uuidShort, next.targetDirectory, next.file, (percent) => {
                    setUploadQueue((p) => p.map((u) => (u.id === next.id ? { ...u, progress: percent } : u)));
                });
                setUploadQueue((prev) =>
                    prev.map((u) => (u.id === next.id ? { ...u, status: 'done' as const, progress: 100 } : u)),
                );
                void refresh();
            } catch (error) {
                const message =
                    getFeatherpanelApiErrorMessage(error) ||
                    (error instanceof Error && error.message ? error.message : null) ||
                    t('files.messages.upload_failed');
                setUploadQueue((prev) =>
                    prev.map((u) => (u.id === next.id ? { ...u, status: 'error' as const, error: message } : u)),
                );
            } finally {
                uploadProcessingRef.current = false;
                setTimeout(() => {
                    setUploadQueue((prev) => {
                        if (prev.some((u) => u.status === 'pending')) {
                            void processUploadQueue(prev);
                        }
                        return prev;
                    });
                }, 0);
            }
        },
        [ensureDirectoryExists, filesApi, uuidShort, refresh, t],
    );

    const addToUploadQueue = useCallback(
        (incoming: File[]) => {
            const baseDirectory = currentDirectory || '/';
            const joinDirectories = (base: string, relative: string): string => {
                const baseDir = normalizePath(base || '/');
                const cleanRelative = relative.replace(/^\/+|\/+$/g, '');
                if (!cleanRelative) return baseDir;
                return baseDir === '/'
                    ? normalizePath(`/${cleanRelative}`)
                    : normalizePath(`${baseDir}/${cleanRelative}`);
            };
            const batchId = incoming.length > 1 ? `batch-${Date.now()}` : undefined;
            const newItems: UploadQueueItem[] = incoming.map((file) => {
                const fileWithPath = file as File & { webkitRelativePath?: string };
                const relativePath = fileWithPath.webkitRelativePath || '';
                let subDirectory = '';
                if (relativePath.includes('/')) {
                    subDirectory = relativePath.substring(0, relativePath.lastIndexOf('/'));
                }
                return {
                    id: generateUploadId(),
                    file,
                    progress: 0,
                    status: 'pending',
                    targetDirectory: joinDirectories(baseDirectory, subDirectory),
                    batchId,
                };
            });
            setUploadQueue((prev) => {
                const next = [...prev, ...newItems];
                setTimeout(() => void processUploadQueue(next), 0);
                return next;
            });
        },
        [currentDirectory, processUploadQueue],
    );

    const addToUploadQueueFromDrop = useCallback(
        (filesWithPaths: FileWithPath[]) => {
            const baseDirectory = currentDirectory || '/';
            const joinDirectories = (base: string, relative: string): string => {
                const baseDir = normalizePath(base || '/');
                const cleanRelative = relative.replace(/^\/+|\/+$/g, '');
                if (!cleanRelative) return baseDir;
                return baseDir === '/'
                    ? normalizePath(`/${cleanRelative}`)
                    : normalizePath(`${baseDir}/${cleanRelative}`);
            };
            const batchId = `batch-${Date.now()}`;
            const newItems: UploadQueueItem[] = filesWithPaths.map(({ file, relativePath }) => {
                let subDirectory = '';
                if (relativePath.includes('/')) {
                    subDirectory = relativePath.substring(0, relativePath.lastIndexOf('/'));
                }
                return {
                    id: generateUploadId(),
                    file,
                    progress: 0,
                    status: 'pending',
                    targetDirectory: joinDirectories(baseDirectory, subDirectory),
                    batchId,
                };
            });
            setUploadQueue((prev) => {
                const next = [...prev, ...newItems];
                setTimeout(() => void processUploadQueue(next), 0);
                return next;
            });
        },
        [currentDirectory, processUploadQueue],
    );

    useEffect(() => {
        const el = folderInputRef.current;
        if (el) {
            el.setAttribute('webkitdirectory', 'true');
            el.setAttribute('directory', 'true');
        }
    }, []);

    useEffect(() => {
        const isInternal = (e: DragEvent) => {
            const types = e.dataTransfer?.types;
            return Boolean(types?.includes(DRAG_MIME));
        };
        const handleDragOver = (e: DragEvent) => {
            if (isInternal(e)) return;
            e.preventDefault();
            if (!e.dataTransfer?.types?.includes('Files')) return;
            setIsDragging(true);
        };
        const handleDragLeave = (e: DragEvent) => {
            if (isInternal(e)) return;
            e.preventDefault();
            if (e.clientX === 0 && e.clientY === 0) setIsDragging(false);
        };
        const handleDrop = async (e: DragEvent) => {
            if (isInternal(e)) return;
            e.preventDefault();
            setIsDragging(false);
            if (!canCreate || !e.dataTransfer) return;
            const filesWithPaths = await collectFilesFromDataTransfer(e.dataTransfer);
            if (filesWithPaths.length) addToUploadQueueFromDrop(filesWithPaths);
        };
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('drop', handleDrop);
        return () => {
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('drop', handleDrop);
        };
    }, [addToUploadQueueFromDrop, canCreate]);

    const handleDownload = async (filename: string) => {
        try {
            const path = joinPath(currentDirectory || '/', filename);
            const downloadUrl = await filesApi.getDownloadUrl(uuidShort, path);
            triggerSignedUrlDownload(downloadUrl);
            setActionFile(null);
        } catch {
            toast.error(t('files.messages.failed_download'));
        }
    };

    const handleDownloadDirectory = async (folderName: string) => {
        if (!directoryDownloadEnabled) return;
        const path = joinPath(currentDirectory || '/', folderName);
        const toastId = toast.loading(t('files.messages.downloading_directory'));
        try {
            const downloadUrl = await filesApi.downloadDirectory(uuidShort, path);
            triggerSignedUrlDownload(downloadUrl);
            toast.success(t('files.messages.download_directory_started'), { id: toastId });
            setActionFile(null);
        } catch {
            toast.error(t('files.messages.failed_download_directory'), { id: toastId });
        }
    };

    const handleDecompress = async (filename: string) => {
        const toastId = toast.loading(t('files.messages.extracting'));
        try {
            await filesApi.decompressFile(uuidShort, currentDirectory || '/', filename);
            toast.success(t('files.messages.extracted'), { id: toastId });
            void refresh();
        } catch (error) {
            toast.error(getFeatherpanelApiErrorMessage(error) || t('files.messages.extract_failed'), { id: toastId });
        }
    };

    const handleAction = (action: string, file: FileObject) => {
        if (isTrashShortcut(file)) {
            switch (action) {
                case 'trash-open':
                    router.push(`${filesBasePath}/trash`);
                    return;
                case 'trash-empty':
                    setEmptyTrashOpen(true);
                    return;
            }
            return;
        }

        setActionFile(file);
        const usesSelection = selectedFiles.includes(file.name) && selectedFiles.length > 1;
        switch (action) {
            case 'rename':
                setRenameOpen(true);
                break;
            case 'delete':
                setDeleteOpen(true);
                break;
            case 'download':
                void handleDownload(file.name);
                break;
            case 'download-directory':
                void handleDownloadDirectory(file.name);
                break;
            case 'share':
                if (!shareEnabled) return;
                setShareFileOpen(true);
                break;
            case 'edit': {
                const editPath = `${filesBasePath}/edit?file=${encodeURIComponent(file.name)}&directory=${encodeURIComponent(currentDirectory || '/')}`;
                router.push(editPath);
                break;
            }
            case 'compress':
                setFilesToCompress(usesSelection ? selectedFiles : [file.name]);
                setCompressOpen(true);
                break;
            case 'decompress':
                void handleDecompress(file.name);
                break;
            case 'browse-archive':
                if (!archiveBrowseEnabled) return;
                setArchiveBrowseOpen(true);
                break;
            case 'copy':
                setMoveCopyAction('copy');
                setMoveCopyOpen(true);
                break;
            case 'move':
                setMoveCopyAction('move');
                setMoveCopyOpen(true);
                break;
            case 'permissions':
                setPermissionsOpen(true);
                break;
            case 'hash':
                setFileHashOpen(true);
                break;
            case 'preview':
                setPreviewOpen(true);
                break;
            default:
                break;
        }
    };

    const handleNavigate = (name: string) => {
        if (name === FEATHER_TRASH_DIR) {
            router.push(`${filesBasePath}/trash`);
            return;
        }
        const file = visibleFiles.find((f) => f.name === name);
        if (!file) return;
        if (!file.isFile) {
            navigate(resolveDirectoryTarget(currentDirectory || '/', file.name));
            return;
        }
        const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name);
        const isEditable = file.size < 1024 * 1024 * 5 && !isBinaryLikeFileName(file.name) && !isImage;
        if (isEditable && (canUpdate || canReadContent)) {
            router.push(
                `${filesBasePath}/edit?file=${encodeURIComponent(file.name)}&directory=${encodeURIComponent(currentDirectory || '/')}`,
            );
        } else if (isImage) {
            setActionFile(file);
            setPreviewOpen(true);
        }
    };

    const handleDropOnPath = async (destinationPath: string, event: React.DragEvent) => {
        const archiveRaw = event.dataTransfer.getData(ARCHIVE_EXTRACT_DRAG_MIME);
        if (archiveRaw) {
            if (!canArchive || !archiveBrowseEnabled) return;
            try {
                const payload = JSON.parse(archiveRaw) as { root?: string; file?: string; entries?: string[] };
                if (
                    typeof payload.root !== 'string' ||
                    typeof payload.file !== 'string' ||
                    !Array.isArray(payload.entries) ||
                    payload.entries.length === 0
                ) {
                    return;
                }
                void performArchiveExtract(
                    { root: payload.root, file: payload.file, entries: payload.entries },
                    destinationPath,
                );
            } catch {
                // ignore malformed payloads
            }
            return;
        }

        const raw = event.dataTransfer.getData(DRAG_MIME);
        if (!raw || !canUpdate) return;
        try {
            const names = JSON.parse(raw) as string[];
            if (!Array.isArray(names) || names.length === 0) return;
            const dest = normalizePath(destinationPath);
            const updates = names.map((name) => ({
                from: joinPath(currentDirectory || '/', name),
                to: joinPath(dest, name),
            }));
            await filesApi.moveFile(uuidShort, '/', updates);
            toast.success(t('files.dialogs.move_copy.move_success'));
            void refresh();
        } catch (error) {
            toast.error(getFeatherpanelApiErrorMessage(error) || t('files.dialogs.move_copy.move_error'));
        }
    };

    const handleRowDragStart = (file: FileObject, event: React.DragEvent) => {
        const names = selectedFiles.includes(file.name) ? selectedFiles : [file.name];
        setDraggingFileNames(names);
        event.dataTransfer.setData(DRAG_MIME, JSON.stringify(names));
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleRowDragEnd = () => setDraggingFileNames([]);

    const handleDropOnFolder = async (destinationFolder: FileObject, event: React.DragEvent) => {
        if (destinationFolder.isFile || !canUpdate) return;
        const archiveRaw = event.dataTransfer.getData(ARCHIVE_EXTRACT_DRAG_MIME);
        if (archiveRaw && canArchive && archiveBrowseEnabled) {
            await handleDropOnPath(joinPath(currentDirectory || '/', destinationFolder.name), event);
            return;
        }
        await handleDropOnPath(joinPath(currentDirectory || '/', destinationFolder.name), event);
    };

    const uploadBatches = useMemo(() => {
        const byBatch = new Map<string, UploadQueueItem[]>();
        for (const item of uploadQueue) {
            const key = item.batchId ?? item.id;
            if (!byBatch.has(key)) byBatch.set(key, []);
            byBatch.get(key)!.push(item);
        }
        return Array.from(byBatch.entries()).map(([batchKey, items]) => ({
            batchKey,
            batchId: items[0]?.batchId,
            items,
        }));
    }, [uploadQueue]);

    if (!canRead) {
        return (
            <div className='flex min-h-[40vh] items-center justify-center'>
                <p className='text-muted-foreground text-sm'>{t('files.editor.read_only')}</p>
            </div>
        );
    }

    return (
        <div className='relative flex min-h-screen flex-col gap-6 pb-20'>
            <PageHeader
                title={t('files.title')}
                description={t('files.manage_description', { directory: currentDirectory || '/' })}
            />

            <div className='flex flex-col gap-4'>
                <div className='flex flex-col gap-4 rounded-xl border border-black/5 bg-white/80 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5'>
                    <FileBreadcrumbs
                        currentDirectory={currentDirectory || '/'}
                        onNavigate={navigate}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onDropFilesToPath={canUpdate || canArchive ? handleDropOnPath : undefined}
                        onToggleFilters={fileSearchEnabled ? () => setSearchFiltersOpen(true) : undefined}
                        activeFiltersCount={activeAdvancedFiltersCount}
                    />
                </div>

                <FileActionToolbar
                    loading={loading}
                    selectedCount={selectedFiles.length}
                    onRefresh={() => void refresh()}
                    onCreateFile={() => setCreateFileOpen(true)}
                    onCreateFolder={() => setCreateFolderOpen(true)}
                    onUploadFiles={() => fileInputRef.current?.click()}
                    onUploadFolders={() => folderInputRef.current?.click()}
                    onDeleteSelected={() => {
                        setActionFile(null);
                        setDeleteOpen(true);
                    }}
                    onArchiveSelected={() => {
                        setFilesToCompress(selectedFiles);
                        setCompressOpen(true);
                    }}
                    onClearSelection={() => setSelectedFiles([])}
                    onPullFile={() => setPullFileOpen(true)}
                    onWipeAll={wipeAllEnabled ? () => setWipeAllOpen(true) : undefined}
                    onCopySelected={() => {
                        setActionFile(null);
                        setMoveCopyAction('copy');
                        setMoveCopyOpen(true);
                    }}
                    onMoveSelected={() => {
                        setActionFile(null);
                        setMoveCopyAction('move');
                        setMoveCopyOpen(true);
                    }}
                    onPermissionsSelected={() => {
                        setActionFile(null);
                        setPermissionsOpen(true);
                    }}
                    canCreate={canCreate}
                    canDelete={canDelete}
                    currentDirectory={currentDirectory || '/'}
                />

                <input
                    ref={fileInputRef}
                    type='file'
                    multiple
                    className='hidden'
                    onChange={(e) => {
                        if (!e.target.files?.length) return;
                        addToUploadQueue(Array.from(e.target.files));
                        e.target.value = '';
                    }}
                />
                <input
                    ref={folderInputRef}
                    type='file'
                    multiple
                    className='hidden'
                    onChange={(e) => {
                        if (!e.target.files?.length) return;
                        addToUploadQueue(Array.from(e.target.files));
                        e.target.value = '';
                    }}
                />

                {uploadBatches.length > 0 && (
                    <div className='mb-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                        {uploadBatches.flatMap(({ items }) =>
                            items.map((item) => (
                                <div
                                    key={item.id}
                                    className='rounded-2xl border border-black/5 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5'
                                >
                                    <div className='mb-2 flex items-center justify-between gap-2'>
                                        <div className='flex min-w-0 items-center gap-2'>
                                            {item.status === 'done' && (
                                                <CheckCircle2 className='h-4 w-4 text-green-500' />
                                            )}
                                            {item.status === 'error' && (
                                                <AlertCircle className='text-destructive h-4 w-4' />
                                            )}
                                            {item.status === 'uploading' && (
                                                <Upload className='text-primary h-4 w-4 animate-pulse' />
                                            )}
                                            {item.status === 'pending' && (
                                                <Upload className='text-muted-foreground h-4 w-4' />
                                            )}
                                            <span className='truncate text-sm font-medium' title={item.file.name}>
                                                {item.file.name}
                                            </span>
                                        </div>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={() =>
                                                setUploadQueue((prev) => prev.filter((u) => u.id !== item.id))
                                            }
                                            className='text-muted-foreground h-7 w-7 shrink-0 hover:text-red-500'
                                        >
                                            <X className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    {(item.status === 'uploading' || item.status === 'pending') && (
                                        <div className='space-y-1.5'>
                                            <div className='flex justify-between text-[10px] font-bold tracking-tighter text-white/40 uppercase'>
                                                <span>{t('files.toolbar.upload')}</span>
                                                <span className='text-primary'>{item.progress}%</span>
                                            </div>
                                            <div className='h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5'>
                                                <div
                                                    className='from-primary to-primary-foreground h-full bg-linear-to-r transition-all duration-300'
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {item.status === 'done' && (
                                        <p className='text-xs text-green-600 dark:text-green-400'>
                                            {t('files.messages.upload_complete')}
                                        </p>
                                    )}
                                    {item.status === 'error' && (
                                        <p className='text-destructive truncate text-xs' title={item.error}>
                                            {item.error}
                                        </p>
                                    )}
                                </div>
                            )),
                        )}
                    </div>
                )}

                {pullProgressEnabled && activePulls.length > 0 && (
                    <div className='mb-2 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                        {activePulls.map((pull) => (
                            <div
                                key={pull.Identifier}
                                className='rounded-2xl border border-black/5 bg-white/80 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/5'
                            >
                                <div className='mb-2 flex items-center justify-between gap-2'>
                                    <span className='truncate text-sm font-medium'>
                                        {t('files.messages.task_id', { id: pull.Identifier.slice(0, 8) })}...
                                    </span>
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={() => void cancelPull(pull.Identifier)}
                                        className='text-muted-foreground h-7 w-7 hover:text-red-500'
                                    >
                                        <X className='h-4 w-4' />
                                    </Button>
                                </div>
                                <div className='space-y-1.5'>
                                    <div className='flex justify-between text-[10px] font-bold tracking-tighter text-white/40 uppercase'>
                                        <span>{t('files.toolbar.pull')}</span>
                                        <span className='text-primary'>{pull.Progress}%</span>
                                    </div>
                                    <div className='h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5'>
                                        <div
                                            className='from-primary to-primary-foreground h-full bg-linear-to-r transition-all duration-500'
                                            style={{ width: `${pull.Progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <ArchiveBrowsePanel
                    open={archiveBrowseOpen}
                    onOpenChange={(open) => {
                        setArchiveBrowseOpen(open);
                        if (!open) setActionFile(null);
                    }}
                    uuid={uuidShort}
                    serverDirectory={currentDirectory || '/'}
                    archiveFileName={actionFile?.name ?? ''}
                    canExtract={canArchive}
                    onExtractEntries={(entries, destinationPath) => {
                        if (!actionFile) return;
                        void performArchiveExtract(
                            {
                                root: currentDirectory || '/',
                                file: actionFile.name,
                                entries,
                            },
                            destinationPath,
                        );
                    }}
                    onExtractComplete={() => void refresh()}
                />

                <FileList
                    files={visibleFiles}
                    loading={loading || searchLoading}
                    selectedFiles={selectedFiles}
                    onSelect={toggleSelect}
                    onSelectAll={handleSelectAll}
                    onModifierClick={handleModifierClick}
                    onNavigate={handleNavigate}
                    onAction={handleAction}
                    onRowDragStart={handleRowDragStart}
                    onRowDragEnd={handleRowDragEnd}
                    onDropFiles={canUpdate || canArchive ? handleDropOnFolder : undefined}
                    draggingFileNames={draggingFileNames}
                    canEdit={canUpdate || canReadContent}
                    canDelete={canDelete}
                    canDownload={canRead}
                    canShare={shareEnabled}
                    canBrowseArchiveFeature={archiveBrowseEnabled}
                    canDownloadDirectory={directoryDownloadEnabled}
                    acceptArchiveExtract={canArchive && archiveBrowseEnabled}
                    serverUuid={uuidShort}
                    filesBasePath={filesBasePath}
                    currentDirectory={currentDirectory || '/'}
                    anchorName={anchorName}
                    isSearching={Boolean(searchQuery.trim()) || searchResults !== null}
                />
            </div>

            <CreateFolderDialog
                open={createFolderOpen}
                onOpenChange={setCreateFolderOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                onSuccess={() => void refresh()}
            />
            <CreateFileDialog
                open={createFileOpen}
                onOpenChange={setCreateFileOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                onSuccess={() => void refresh()}
            />
            <RenameDialog
                open={renameOpen}
                onOpenChange={setRenameOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                fileName={actionFile?.name || ''}
                onSuccess={() => void refresh()}
            />
            <DeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                files={actionFile ? [actionFile.name] : selectedFiles}
                onSuccess={() => {
                    void refresh();
                    void refreshTrashStats();
                    setSelectedFiles([]);
                }}
            />
            <EmptyTrashDialog
                open={emptyTrashOpen}
                onOpenChange={setEmptyTrashOpen}
                onConfirm={handleEmptyTrash}
                loading={emptyTrashBusy}
                disabled={(trashStats?.itemCount ?? 0) === 0}
            />
            <PullFileDialog
                open={pullFileOpen}
                onOpenChange={setPullFileOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                onSuccess={() => {
                    void refresh();
                    void refreshPulls();
                }}
            />
            <ShareFileDialog
                open={shareFileOpen}
                onOpenChange={setShareFileOpen}
                uuid={uuidShort}
                filePath={actionFile ? joinPath(currentDirectory || '/', actionFile.name) : ''}
                fileName={actionFile?.name || ''}
            />
            <WipeAllDialog
                open={wipeAllOpen}
                onOpenChange={setWipeAllOpen}
                uuid={uuidShort}
                onSuccess={() => void refresh()}
            />
            <ImagePreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                uuid={uuidShort}
                file={actionFile}
                currentDirectory={currentDirectory || '/'}
                onDownload={handleDownload}
            />
            <MoveCopyDialog
                open={moveCopyOpen}
                onOpenChange={setMoveCopyOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                files={actionFile ? [actionFile.name] : selectedFiles}
                action={moveCopyAction}
                onSuccess={() => {
                    void refresh();
                    setSelectedFiles([]);
                }}
            />
            <PermissionsDialog
                open={permissionsOpen}
                onOpenChange={setPermissionsOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                files={actionFile ? [actionFile.name] : selectedFiles}
                onSuccess={() => {
                    void refresh();
                    setSelectedFiles([]);
                }}
            />
            <CompressDialog
                open={compressOpen}
                onOpenChange={setCompressOpen}
                serverUuid={uuidShort}
                directory={currentDirectory || '/'}
                files={filesToCompress}
                capabilities={compressCapabilities}
                daemonType='featherquilld'
                onSuccess={() => {
                    void refresh();
                    setSelectedFiles([]);
                }}
            />
            <FileHashDialog
                open={fileHashOpen}
                onOpenChange={setFileHashOpen}
                uuid={uuidShort}
                path={actionFile ? joinPath(currentDirectory || '/', actionFile.name) : ''}
            />

            <Dialog open={searchFiltersOpen} onOpenChange={setSearchFiltersOpen}>
                <DialogContent className='sm:max-w-4xl'>
                    <DialogHeader>
                        <DialogTitle>{t('files.search.advanced.title')}</DialogTitle>
                        <p className='text-muted-foreground text-sm'>{t('files.search.advanced.subtitle')}</p>
                    </DialogHeader>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='space-y-1'>
                            <label className='text-sm font-semibold'>{t('files.search.advanced.include_label')}</label>
                            <input
                                className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                placeholder={t('files.search.advanced.include_placeholder')}
                                value={includePattern}
                                onChange={(e) => setIncludePattern(e.target.value)}
                            />
                        </div>
                        <div className='space-y-1'>
                            <label className='text-sm font-semibold'>{t('files.search.advanced.exclude_label')}</label>
                            <input
                                className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                placeholder={t('files.search.advanced.exclude_placeholder')}
                                value={excludePattern}
                                onChange={(e) => setExcludePattern(e.target.value)}
                            />
                        </div>
                        <div className='space-y-1 md:col-span-2'>
                            <label className='text-sm font-semibold'>
                                {t('files.search.advanced.search_text_label')}
                            </label>
                            <input
                                className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                placeholder={t('files.search.advanced.search_text_placeholder')}
                                value={contentQuery}
                                onChange={(e) => setContentQuery(e.target.value)}
                            />
                        </div>
                        <div className='space-y-1'>
                            <label className='text-sm font-semibold'>
                                {t('files.search.advanced.file_size_label')}
                            </label>
                            <div className='grid grid-cols-2 gap-2'>
                                <input
                                    className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                    type='number'
                                    min={0}
                                    placeholder={t('files.search.advanced.minimum_placeholder')}
                                    value={minSizeBytes}
                                    onChange={(e) => setMinSizeBytes(Number(e.target.value || 0))}
                                />
                                <input
                                    className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                    type='number'
                                    min={0}
                                    placeholder={t('files.search.advanced.maximum_placeholder')}
                                    value={maxSizeBytes}
                                    onChange={(e) => setMaxSizeBytes(Number(e.target.value || 0))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant='default' onClick={() => setSearchFiltersOpen(false)}>
                            {t('files.search.advanced.apply_filters')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isDragging && canCreate && (
                <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm'>
                    <div className='rounded-2xl border border-dashed border-white/30 bg-white/10 px-10 py-8 text-center shadow-2xl'>
                        <Download className='text-primary mx-auto mb-3 h-10 w-10' />
                        <p className='text-lg font-semibold text-white'>{t('files.messages.drop_to_upload')}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function WebSpaceFilesPage({ params }: { params: Promise<{ uuidShort: string }> }) {
    const { uuidShort } = use(params);

    return (
        <FileManagerApiProvider value={webspaceFilesApi}>
            <WebSpacePageWidgets pageId='webspace-files'>
                <WebSpaceFilesPageInner uuidShort={uuidShort} />
            </WebSpacePageWidgets>
        </FileManagerApiProvider>
    );
}
