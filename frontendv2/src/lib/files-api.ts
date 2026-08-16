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

import api, { getFeatherpanelApiErrorMessage } from './api';
import axios from 'axios';
import { filterFeatherTrashFiles } from '@/lib/feather-trash';
import { FileObject, FilesResponse } from '@/types/server';

/** Bare client for signed Wings URLs — no panel cookies / X-FP-UI-* headers (CORS). */
const wingsUploadClient = axios.create({
    withCredentials: false,
});

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    error?: boolean;
}

export interface FileHashesResponse {
    md5: string;
    sha1: string;
    sha256: string;
    size: number;
    path: string;
}

export interface ArchiveListEntry {
    name: string;
    path: string;
    size: number;
    directory: boolean;
    modified?: string;
}

export interface ArchiveListData {
    contents: ArchiveListEntry[];
    truncated: boolean;
}

export interface TrashEntry {
    id: string;
    original_root: string;
    original_name: string;
    deleted_at: string;
    size: number;
    is_directory: boolean;
}

/** DataTransfer type for dragging paths out of the archive browser into the file list. */
export const ARCHIVE_EXTRACT_DRAG_MIME = 'application/x-featherpanel-archive-extract' as const;

export interface ArchiveExtractDragPayload {
    /** Server directory that contains the archive (same as decompress `root`). */
    root: string;
    /** Archive file name only. */
    file: string;
    /** Paths inside the archive (files and/or directories). */
    entries: string[];
}

export interface ShareFileResult {
    public_id: string;
    url: string;
    delete_key: string;
    expires_at?: string;
    password_protected?: boolean;
    size?: number;
    filename?: string;
}

export interface ShareFileResponse extends Partial<ShareFileResult> {
    background?: boolean;
    identifier?: string | null;
}

export interface ShareJob {
    identifier: string;
    file: string;
    status: string;
    progress: number;
    error?: string;
    result?: ShareFileResult;
}

export interface AdvancedFileSearchFilters {
    directory?: string;
    pattern?: string;
    include?: string;
    exclude?: string;
    case_insensitive?: boolean;
    content?: string;
    content_case_insensitive?: boolean;
    min_size?: number;
    max_size?: number;
    max_content_size?: number;
    include_oversized?: boolean;
}

const normalizePath = (path: string): string => {
    const withLeading = path.startsWith('/') ? path : `/${path}`;
    const collapsed = withLeading.replace(/\/+/g, '/');
    return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
};

const splitNameAndExtension = (name: string): { base: string; extension: string } => {
    const tarCompound = ['.tar.gz', '.tar.bz2', '.tar.xz'];
    const lower = name.toLowerCase();
    const compound = tarCompound.find((ext) => lower.endsWith(ext));
    if (compound) {
        return {
            base: name.slice(0, name.length - compound.length),
            extension: name.slice(name.length - compound.length),
        };
    }
    const lastDot = name.lastIndexOf('.');
    if (lastDot <= 0) {
        return { base: name, extension: '' };
    }
    return { base: name.slice(0, lastDot), extension: name.slice(lastDot) };
};

const inferNextCopyName = (sourceName: string, existingNames: Set<string>): string => {
    const { base, extension } = splitNameAndExtension(sourceName);
    for (let i = 1; i <= 50; i++) {
        let suffix = '';
        if (i === 1) {
            suffix = ' - copy';
        } else if (i === 50) {
            suffix = ` - copy.${new Date().toISOString()}`;
        } else {
            suffix = ` - copy ${i}`;
        }
        const candidate = `${base}${suffix}${extension}`;
        if (!existingNames.has(candidate)) {
            return candidate;
        }
    }
    return `${base} - copy${extension}`;
};

const dirnameOf = (absolutePath: string): string => {
    const normalized = normalizePath(absolutePath);
    if (normalized === '/') return '/';
    const idx = normalized.lastIndexOf('/');
    if (idx <= 0) return '/';
    return normalized.slice(0, idx);
};

const basenameOf = (absolutePath: string): string => {
    const normalized = normalizePath(absolutePath);
    if (normalized === '/') return '';
    const idx = normalized.lastIndexOf('/');
    return idx === -1 ? normalized : normalized.slice(idx + 1);
};

const toAbsolutePath = (root: string, path: string): string => {
    if (path.startsWith('/')) return normalizePath(path);
    return normalizePath(`${root || '/'}${root.endsWith('/') ? '' : '/'}${path}`);
};

export const filesApi = {
    getFiles: async (
        uuid: string,
        directory: string = '/',
        search?: string,
    ): Promise<{ contents: FileObject[]; limited: boolean; limit: number; total: number }> => {
        const response = await api.get<ApiResponse<FilesResponse>>(`/user/servers/${uuid}/files`, {
            params: {
                path: directory,
                ...(search?.trim() ? { search: search.trim() } : {}),
            },
        });

        const payload = response.data.data;
        // Map fields for UI consistency; never expose the internal trash directory in the UI
        const mapped = (payload.contents ?? []).map((f) => {
            const isFile = f.file !== undefined ? f.file : f.isFile !== undefined ? f.isFile : !f.directory;
            return {
                ...f,
                isFile,
                modified_at: f.modified || f.modified_at,
                created_at: f.created || f.created_at,
                mimetype: f.mime || f.mimetype,
            };
        });
        return {
            contents: filterFeatherTrashFiles(mapped),
            limited: Boolean(payload.limited),
            limit: payload.limit ?? 250,
            total: payload.total ?? mapped.length,
        };
    },

    searchFiles: async (uuid: string, filters: AdvancedFileSearchFilters): Promise<FileObject[]> => {
        const response = await api.get<ApiResponse<FileObject[]>>(`/user/servers/${uuid}/search-files`, {
            params: filters,
        });

        const mapped = response.data.data.map((f) => {
            const isFile = f.file !== undefined ? f.file : f.isFile !== undefined ? f.isFile : !f.directory;
            return {
                ...f,
                isFile,
                modified_at: f.modified || f.modified_at,
                created_at: f.created || f.created_at,
                mimetype: f.mime || f.mimetype,
            };
        });
        return filterFeatherTrashFiles(mapped);
    },

    listArchiveDirectory: async (
        uuid: string,
        serverDirectory: string,
        archiveFileName: string,
        archiveInnerPath = '',
    ): Promise<ArchiveListData> => {
        const response = await api.get<ApiResponse<ArchiveListData>>(`/user/servers/${uuid}/archive-list`, {
            params: {
                path: serverDirectory,
                file: archiveFileName,
                archive_path: archiveInnerPath,
            },
        });
        const d = response.data.data;
        if (!d.contents) {
            return { contents: [], truncated: Boolean(d.truncated) };
        }
        return d;
    },

    getFileContent: async (uuid: string, path: string): Promise<string> => {
        const response = await api.get<string>(`/user/servers/${uuid}/file`, {
            params: { path },
            responseType: 'text', // Force raw text to prevent axios from parsing JSON files
        });

        return response.data;
    },

    getFileHashes: async (uuid: string, path: string): Promise<FileHashesResponse> => {
        const response = await api.get<ApiResponse<FileHashesResponse>>(`/user/servers/${uuid}/file-hash`, {
            params: { path },
        });
        return response.data.data;
    },

    saveFileContent: async (uuid: string, path: string, content: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/write-file`, content, {
            params: { path: normalizePath(path) },
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    },

    createFolder: async (uuid: string, root: string, name: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/create-directory`, {
            path: root,
            name,
        });
    },

    renameFile: async (uuid: string, root: string, files: { from: string; to: string }[]): Promise<void> => {
        await api.put(`/user/servers/${uuid}/rename`, {
            root,
            files,
        });
    },

    copyFile: async (uuid: string, root: string, file: string, newName?: string): Promise<void> => {
        const sourcePath = normalizePath(`${root || '/'}/${file}`);
        const targetName = (newName || '').trim();
        let expectedCopiedName: string | null = null;

        if (targetName) {
            const siblings = await filesApi.getFiles(uuid, root || '/');
            expectedCopiedName = inferNextCopyName(file, new Set(siblings.contents.map((entry) => entry.name)));
        }

        await api.post(`/user/servers/${uuid}/copy-files`, {
            location: sourcePath,
            files: [sourcePath],
            ...(targetName ? { name: targetName } : {}),
        });

        if (targetName && expectedCopiedName && expectedCopiedName !== targetName) {
            const siblings = await filesApi.getFiles(uuid, root || '/');
            const names = new Set(siblings.contents.map((entry) => entry.name));
            // Skip rename when the daemon already honored `name`
            if (names.has(targetName) || !names.has(expectedCopiedName)) {
                return;
            }
            await api.put(`/user/servers/${uuid}/rename`, {
                root: normalizePath(root || '/'),
                files: [{ from: expectedCopiedName, to: targetName }],
            });
        }
    },

    moveFile: async (uuid: string, root: string, files: { from: string; to: string }[]): Promise<void> => {
        if (files.length === 0) return;

        const sourceRoot = normalizePath(root || '/');
        const absoluteUpdates = files
            .map((entry) => ({
                from: toAbsolutePath(sourceRoot, entry.from),
                to: toAbsolutePath(sourceRoot, entry.to),
            }))
            .filter((entry) => entry.from !== entry.to);

        if (absoluteUpdates.length === 0) return;

        const destinationDirectories = Array.from(new Set(absoluteUpdates.map((entry) => dirnameOf(entry.to))));
        const existingByDirectory = new Map<string, Set<string>>();
        for (const directory of destinationDirectories) {
            const siblings = await filesApi.getFiles(uuid, directory);
            existingByDirectory.set(directory, new Set(siblings.contents.map((item) => item.name)));
        }

        const normalizedUpdates = absoluteUpdates.map((entry) => {
            const destinationDir = dirnameOf(entry.to);
            const currentName = basenameOf(entry.to);
            const sourceName = basenameOf(entry.from);
            const existing = existingByDirectory.get(destinationDir) ?? new Set<string>();

            let finalName = currentName;
            const sameNameMove = basenameOf(entry.from) === currentName && dirnameOf(entry.from) === destinationDir;
            if (!sameNameMove && existing.has(currentName)) {
                finalName = inferNextCopyName(currentName || sourceName, existing);
            }

            existing.add(finalName);
            return {
                from: entry.from,
                to: destinationDir === '/' ? `/${finalName}` : `${destinationDir}/${finalName}`,
            };
        });

        await api.put(`/user/servers/${uuid}/rename`, {
            root: '/',
            files: normalizedUpdates,
        });
    },

    deleteFiles: async (uuid: string, root: string, files: string[], permanent = false): Promise<void> => {
        await api.delete(`/user/servers/${uuid}/delete-files`, {
            data: {
                root,
                files,
                ...(permanent ? { permanent: true } : {}),
            },
        });
    },

    listTrash: async (uuid: string): Promise<{ entries: TrashEntry[]; total_size: number }> => {
        const res = await api.get<ApiResponse<{ entries: TrashEntry[]; total_size: number }>>(
            `/user/servers/${uuid}/trash`,
        );
        return res.data.data;
    },

    restoreTrash: async (uuid: string, ids: string[], overwrite = false): Promise<void> => {
        await api.post(`/user/servers/${uuid}/trash/restore`, { ids, overwrite });
    },

    deleteTrashEntries: async (uuid: string, ids: string[]): Promise<void> => {
        await api.post(`/user/servers/${uuid}/trash/delete`, { ids });
    },

    emptyTrash: async (uuid: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/trash/empty`);
    },

    wipeAllFiles: async (uuid: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/wipe-all-files`);
    },

    getDownloadUrl: async (uuid: string, path: string): Promise<string> => {
        const res = await api.get<ApiResponse<{ download_url: string; expires_in: number }>>(
            `/user/servers/${uuid}/download-file`,
            { params: { path } },
        );
        return res.data.data.download_url;
    },

    downloadDirectory: async (uuid: string, path: string, archiveFormat?: string): Promise<string> => {
        const res = await api.get<ApiResponse<{ download_url: string; expires_in: number }>>(
            `/user/servers/${uuid}/download-directory`,
            {
                params: {
                    path: normalizePath(path || '/'),
                    ...(archiveFormat ? { format: archiveFormat } : {}),
                },
            },
        );
        return res.data.data.download_url;
    },

    abortInstall: async (uuid: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/install/abort`);
    },

    getFingerprints: async (
        uuid: string,
        files: string[],
        algorithm: string = 'sha256',
    ): Promise<Record<string, string> | { files?: Record<string, string>; algorithm?: string }> => {
        const response = await api.get<
            ApiResponse<Record<string, string> | { files?: Record<string, string>; algorithm?: string }>
        >(`/user/servers/${uuid}/file-fingerprints`, {
            params: {
                files,
                algorithm,
            },
        });
        return response.data.data;
    },

    compressFiles: async (
        uuid: string,
        root: string,
        files: string[],
        name?: string,
        extension: string = 'tar.gz',
    ): Promise<void> => {
        await api.post(`/user/servers/${uuid}/compress-files`, {
            root,
            files,
            name,
            extension,
        });
    },

    decompressFile: async (uuid: string, root: string, file: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/decompress-archive`, {
            root,
            file,
        });
    },

    extractArchiveSelection: async (
        uuid: string,
        root: string,
        file: string,
        destination: string,
        entries: string[],
    ): Promise<void> => {
        await api.post(`/user/servers/${uuid}/extract-archive-selection`, {
            root,
            file,
            destination,
            entries,
        });
    },

    changePermissions: async (uuid: string, root: string, files: { file: string; mode: string }[]): Promise<void> => {
        await api.post(`/user/servers/${uuid}/change-permissions`, {
            root,
            files,
        });
    },

    pullFile: async (uuid: string, directory: string, url: string, filename?: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/pull-file`, {
            root: directory,
            url,
            fileName: filename,
            foreground: false,
            useHeader: true,
        });
    },

    shareFile: async (
        uuid: string,
        options: {
            file: string;
            ttl_days: 1 | 5;
            password?: string;
            delete_key?: string;
            background?: boolean;
        },
    ): Promise<ShareFileResponse> => {
        const response = await api.post<ApiResponse<ShareFileResponse>>(`/user/servers/${uuid}/share-file`, options);
        return response.data.data;
    },

    getShareJobs: async (uuid: string): Promise<ShareJob[]> => {
        const response = await api.get<ApiResponse<{ shares?: ShareJob[] } | ShareJob[]>>(
            `/user/servers/${uuid}/share-jobs`,
        );
        const data = response.data.data;
        if (Array.isArray(data)) {
            return data;
        }
        return data?.shares || [];
    },

    deleteShareJob: async (uuid: string, id: string): Promise<void> => {
        await api.delete(`/user/servers/${uuid}/share-jobs/${id}`);
    },

    getPullFiles: async (uuid: string): Promise<{ Identifier: string; Progress: number }[]> => {
        const response = await api.get<{
            success: boolean;
            data: { downloads: { Identifier: string; Progress: number }[] };
        }>(`/user/servers/${uuid}/downloads-list`);
        return response.data.data?.downloads || [];
    },

    deletePullFile: async (uuid: string, id: string): Promise<void> => {
        await api.delete(`/user/servers/${uuid}/delete-pull-process/${id}`);
    },

    uploadFile: async (
        uuid: string,
        root: string,
        file: File,
        onProgress?: (percent: number) => void,
    ): Promise<void> => {
        // Same pattern as downloads: signed Wings URL, then upload direct to the node.
        // Avoids buffering the whole file through PHP (memory, post_max_size, 30s Guzzle timeout).
        const signed = await api.get<ApiResponse<{ upload_url: string; expires_in: number }>>(
            `/user/servers/${uuid}/upload-file`,
        );
        const uploadUrl = signed.data.data?.upload_url;
        if (!uploadUrl) {
            throw new Error('Failed to get upload URL');
        }

        const formData = new FormData();
        formData.append('files', file);

        try {
            await wingsUploadClient.post(uploadUrl, formData, {
                params: {
                    directory: root || '/',
                },
                onUploadProgress:
                    onProgress &&
                    ((e) => {
                        const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
                        onProgress(Math.min(percent, 100));
                    }),
            });
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const wingsError =
                    typeof error.response?.data?.error === 'string' ? error.response.data.error.trim() : '';
                const panelMessage = getFeatherpanelApiErrorMessage(error);
                let message = wingsError || panelMessage;
                if (!message && !error.response) {
                    message =
                        'Could not reach the node to upload. Check that the node FQDN is publicly reachable from your browser and that Wings CORS allows this panel URL.';
                }
                if (message) {
                    const wrapped = new Error(message) as Error & {
                        response?: { data?: { message?: string } };
                    };
                    wrapped.response = { data: { message } };
                    throw wrapped;
                }
            }
            throw error;
        }
    },

    getUploadUrl: async (uuid: string): Promise<string> => {
        const res = await api.get<ApiResponse<{ upload_url: string; expires_in: number }>>(
            `/user/servers/${uuid}/upload-file`,
        );
        return res.data.data.upload_url;
    },
};
