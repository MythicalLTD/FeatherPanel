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
import api from './api';
import { getFeatherpanelApiErrorMessage } from './api';
import type { FileObject } from '@/types/server';
import type {
    AdvancedFileSearchFilters,
    ArchiveListData,
    FileHashesResponse,
    ShareFileResponse,
    ShareJob,
    TrashEntry,
} from './files-api';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    error?: boolean;
}

const normalizePath = (path: string): string => {
    const withLeading = path.startsWith('/') ? path : `/${path}`;
    const collapsed = withLeading.replace(/\/+/g, '/');
    return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
};

const joinPath = (root: string, name: string): string => {
    const cleanRoot = normalizePath(root || '/');
    const cleanName = (name || '').replace(/^\/+/, '');
    if (!cleanName) return cleanRoot;
    return cleanRoot === '/' ? `/${cleanName}` : `${cleanRoot}/${cleanName}`;
};

const basenameOf = (absolutePath: string): string => {
    const normalized = normalizePath(absolutePath);
    if (normalized === '/') return '';
    const idx = normalized.lastIndexOf('/');
    return idx === -1 ? normalized : normalized.slice(idx + 1);
};

const toAbsolutePath = (root: string, path: string): string => {
    if (path.startsWith('/')) return normalizePath(path);
    return joinPath(root || '/', path);
};

const unsupported = (feature: string): never => {
    throw new Error(`WebSpace file manager does not support ${feature}`);
};

/** Feature flags for WebSpace file manager UI. */
export const webspaceFileManagerCapabilities = {
    trash: true,
    share: true,
    wipeAll: true,
    directoryDownload: true,
    archiveBrowse: true,
    archiveExtractSelection: true,
    advancedSearch: true,
    abortInstall: false,
    pullProgress: true,
    signedUploadUrl: true,
} as const;

const quilldUploadClient = axios.create();

type RawFileEntry = {
    name?: string;
    path?: string;
    directory?: boolean;
    file?: boolean;
    isFile?: boolean;
    size?: number;
    modified?: string;
    modified_at?: string;
    created?: string;
    created_at?: string;
    mode?: string;
    mode_bits?: string;
    mime?: string;
    mimetype?: string;
    symlink?: boolean;
};

const mapFileObject = (f: RawFileEntry): FileObject => {
    const isFile =
        f.file !== undefined ? Boolean(f.file) : f.isFile !== undefined ? Boolean(f.isFile) : !Boolean(f.directory);
    const name = (f.name || '').replace(/\/$/, '') || basenameOf(f.path || '') || '';
    return {
        name,
        mode: f.mode || '0644',
        mode_bits: f.mode_bits || f.mode || '0644',
        size: typeof f.size === 'number' ? f.size : 0,
        isFile,
        directory: !isFile,
        file: isFile,
        symlink: Boolean(f.symlink),
        mimetype: f.mimetype || f.mime || (isFile ? 'application/octet-stream' : 'inode/directory'),
        mime: f.mime || f.mimetype,
        created_at: f.created_at || f.created || '',
        modified_at: f.modified_at || f.modified || '',
        created: f.created || f.created_at,
        modified: f.modified || f.modified_at,
    };
};

const extractList = (payload: unknown): RawFileEntry[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload as RawFileEntry[];
    if (typeof payload !== 'object') return [];
    const body = payload as Record<string, unknown>;
    const candidates = [body.contents, body.files, body.data];
    for (const c of candidates) {
        if (Array.isArray(c)) return c as RawFileEntry[];
    }
    return [];
};

const extractContentsString = (payload: unknown): string => {
    if (typeof payload === 'string') return payload;
    if (!payload || typeof payload !== 'object') return '';
    const body = payload as Record<string, unknown>;
    if (typeof body.contents === 'string') return body.contents;
    if (typeof body.content === 'string') return body.content;
    if (typeof body.data === 'string') return body.data;
    try {
        return JSON.stringify(payload, null, 2);
    } catch {
        return '';
    }
};

export const webspaceFilesApi = {
    getFiles: async (
        uuid: string,
        directory: string = '/',
        search?: string,
    ): Promise<{ contents: FileObject[]; limited: boolean; limit: number; total: number }> => {
        const response = await api.get<ApiResponse<unknown>>(`/user/webspaces/${uuid}/files/list`, {
            params: { directory: normalizePath(directory || '/') },
        });
        let mapped = extractList(response.data.data).map(mapFileObject);
        const q = search?.trim().toLowerCase();
        if (q) {
            mapped = mapped.filter((f) => f.name.toLowerCase().includes(q));
        }
        return {
            contents: mapped,
            limited: false,
            limit: mapped.length,
            total: mapped.length,
        };
    },

    searchFiles: async (uuid: string, filters: AdvancedFileSearchFilters): Promise<FileObject[]> => {
        const response = await api.get<ApiResponse<{ data?: RawFileEntry[] } | RawFileEntry[]>>(
            `/user/webspaces/${uuid}/files/search-advanced`,
            { params: filters },
        );
        const payload = response.data.data;
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray((payload as { data?: RawFileEntry[] })?.data)
              ? ((payload as { data?: RawFileEntry[] }).data ?? [])
              : extractList(payload);
        return rows.map(mapFileObject);
    },

    listArchiveDirectory: async (
        uuid: string,
        serverDirectory: string,
        archiveFileName: string,
        archiveInnerPath = '',
    ): Promise<ArchiveListData> => {
        const response = await api.get<ApiResponse<ArchiveListData>>(`/user/webspaces/${uuid}/files/archive-list`, {
            params: {
                directory: serverDirectory,
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
        const response = await api.get<ApiResponse<unknown>>(`/user/webspaces/${uuid}/files/contents`, {
            params: { file: normalizePath(path) },
        });
        return extractContentsString(response.data.data);
    },

    getFileHashes: async (uuid: string, path: string): Promise<FileHashesResponse> => {
        const normalized = normalizePath(path);
        const fp = await webspaceFilesApi.getFingerprints(uuid, [normalized], 'sha256');
        const map =
            fp && typeof fp === 'object' && 'files' in (fp as object)
                ? ((fp as { files?: Record<string, string> }).files ?? {})
                : ((fp as Record<string, string>) ?? {});
        const hash =
            map[normalized] ||
            map[basenameOf(normalized)] ||
            map[`/${basenameOf(normalized)}`] ||
            Object.values(map)[0] ||
            '';
        return {
            md5: '',
            sha1: '',
            sha256: String(hash),
            size: 0,
            path: normalized,
        };
    },

    saveFileContent: async (uuid: string, path: string, content: string): Promise<void> => {
        await api.post(`/user/webspaces/${uuid}/files/write`, {
            file: normalizePath(path),
            contents: content,
        });
    },

    createFolder: async (uuid: string, root: string, name: string): Promise<void> => {
        const fullPath = joinPath(root || '/', name);
        await api.post(`/user/webspaces/${uuid}/files/create-directory`, { name: fullPath });
    },

    renameFile: async (uuid: string, root: string, files: { from: string; to: string }[]): Promise<void> => {
        for (const entry of files) {
            const from = toAbsolutePath(root || '/', entry.from);
            const to = toAbsolutePath(root || '/', entry.to);
            await api.put(`/user/webspaces/${uuid}/files/rename`, { from, to });
        }
    },

    copyFile: async (uuid: string, root: string, file: string, newName?: string, destRoot?: string): Promise<void> => {
        const from = toAbsolutePath(root || '/', file);
        const destinationRoot = normalizePath(destRoot || root || '/');
        const targetName = (newName || '').trim() || basenameOf(from);
        const to = joinPath(destinationRoot, targetName);
        await api.post(`/user/webspaces/${uuid}/files/copy`, { from, to });
    },

    moveFile: async (uuid: string, root: string, files: { from: string; to: string }[]): Promise<void> => {
        if (files.length === 0) return;
        const sourceRoot = normalizePath(root || '/');
        for (const entry of files) {
            const from = toAbsolutePath(sourceRoot, entry.from);
            const to = toAbsolutePath(sourceRoot, entry.to);
            if (from === to) continue;
            await api.put(`/user/webspaces/${uuid}/files/rename`, { from, to });
        }
    },

    deleteFiles: async (uuid: string, root: string, files: string[], permanent = false): Promise<void> => {
        const paths = files.map((f) => toAbsolutePath(root || '/', f));
        await api.post(`/user/webspaces/${uuid}/files/delete`, {
            files: paths,
            permanent,
            use_trash: !permanent,
        });
    },

    listTrash: async (uuid: string): Promise<{ entries: TrashEntry[]; total_size: number }> => {
        const res = await api.get<ApiResponse<{ entries: TrashEntry[]; total_size: number }>>(
            `/user/webspaces/${uuid}/files/trash`,
        );
        return res.data.data;
    },

    restoreTrash: async (uuid: string, ids: string[], overwrite = false): Promise<void> => {
        await api.post(`/user/webspaces/${uuid}/files/trash/restore`, { ids, overwrite });
    },

    deleteTrashEntries: async (uuid: string, ids: string[]): Promise<void> => {
        await api.post(`/user/webspaces/${uuid}/files/trash/delete`, { ids });
    },

    emptyTrash: async (uuid: string): Promise<void> => {
        await api.post(`/user/webspaces/${uuid}/files/trash/empty`);
    },

    wipeAllFiles: async (uuid: string): Promise<void> => {
        await api.post(`/user/webspaces/${uuid}/files/wipe`);
    },

    getDownloadUrl: async (uuid: string, path: string): Promise<string> => {
        return `/api/user/webspaces/${uuid}/files/download?file=${encodeURIComponent(normalizePath(path))}`;
    },

    downloadDirectory: async (uuid: string, path: string, archiveFormat?: string): Promise<string> => {
        const params = new URLSearchParams({
            path: normalizePath(path || '/'),
            ...(archiveFormat ? { format: archiveFormat } : {}),
        });
        return `/api/user/webspaces/${uuid}/files/download-directory?${params.toString()}`;
    },

    abortInstall: async (): Promise<void> => {
        if (!webspaceFileManagerCapabilities.abortInstall) return;
        unsupported('abort install');
    },

    getFingerprints: async (
        uuid: string,
        files: string[],
        algorithm: string = 'sha256',
    ): Promise<Record<string, string> | { files?: Record<string, string>; algorithm?: string }> => {
        const response = await api.get<ApiResponse<unknown>>(`/user/webspaces/${uuid}/files/fingerprints`, {
            params: { files, algorithm },
        });
        const data = response.data.data;
        if (!data || typeof data !== 'object') return {};
        if (Array.isArray(data)) {
            const map: Record<string, string> = {};
            for (const row of data as { file?: string; hash?: string; path?: string }[]) {
                const key = row.file || row.path;
                if (key && row.hash) map[key] = String(row.hash);
            }
            return { files: map, algorithm };
        }
        const body = data as Record<string, unknown>;
        if (body.files && typeof body.files === 'object') {
            return body as { files?: Record<string, string>; algorithm?: string };
        }
        if (Array.isArray(body.data)) {
            const map: Record<string, string> = {};
            for (const row of body.data as { file?: string; hash?: string; path?: string }[]) {
                const key = row.file || row.path;
                if (key && row.hash) map[key] = String(row.hash);
            }
            return { files: map, algorithm };
        }
        return data as Record<string, string>;
    },

    compressFiles: async (
        uuid: string,
        root: string,
        files: string[],
        name?: string,
        extension: string = 'tar.gz',
    ): Promise<void> => {
        await api.post(`/user/webspaces/${uuid}/files/compress`, {
            root: normalizePath(root || '/'),
            files,
            name,
            extension,
        });
    },

    decompressFile: async (uuid: string, root: string, file: string): Promise<void> => {
        const filePath = file.startsWith('/') ? normalizePath(file) : joinPath(root || '/', file);
        await api.post(`/user/webspaces/${uuid}/files/decompress`, {
            root: normalizePath(root || '/'),
            file: filePath,
        });
    },

    extractArchiveSelection: async (
        uuid: string,
        root: string,
        file: string,
        destination: string,
        entries: string[],
    ): Promise<void> => {
        await api.post(`/user/webspaces/${uuid}/files/extract-archive-selection`, {
            root,
            file,
            destination,
            entries,
        });
    },

    changePermissions: async (uuid: string, root: string, files: { file: string; mode: string }[]): Promise<void> => {
        const normalized = files.map((entry) => ({
            file: toAbsolutePath(root || '/', entry.file),
            mode: entry.mode,
        }));
        await api.post(`/user/webspaces/${uuid}/files/chmod`, { files: normalized });
    },

    pullFile: async (uuid: string, directory: string, url: string, filename?: string): Promise<void> => {
        await api.post(`/user/webspaces/${uuid}/files/pull`, {
            url,
            directory: normalizePath(directory || '/'),
            file_name: filename,
            filename,
            background: true,
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
        void options.background;
        const response = await api.post<ApiResponse<ShareFileResponse>>(`/user/webspaces/${uuid}/files/share`, {
            file: options.file,
            ttl_days: options.ttl_days,
            password: options.password,
            delete_key: options.delete_key,
        });
        return response.data.data;
    },

    getShareJobs: async (uuid: string): Promise<ShareJob[]> => {
        const response = await api.get<ApiResponse<{ shares?: ShareJob[] } | ShareJob[]>>(
            `/user/webspaces/${uuid}/files/share-jobs`,
        );
        const data = response.data.data;
        if (Array.isArray(data)) return data;
        return data?.shares || [];
    },

    deleteShareJob: async (uuid: string, id: string): Promise<void> => {
        await api.delete(`/user/webspaces/${uuid}/files/share-jobs/${id}`);
    },

    getPullFiles: async (uuid: string): Promise<{ Identifier: string; Progress: number }[]> => {
        const response = await api.get<
            ApiResponse<{
                downloads?: { Identifier?: string; identifier?: string; Progress?: number; progress?: number }[];
            }>
        >(`/user/webspaces/${uuid}/files/pull-jobs`);
        const rows = response.data.data?.downloads ?? [];
        return rows.map((row) => ({
            Identifier: String(row.Identifier ?? row.identifier ?? ''),
            Progress: Number(row.Progress ?? row.progress ?? 0),
        }));
    },

    deletePullFile: async (uuid: string, id: string): Promise<void> => {
        await api.delete(`/user/webspaces/${uuid}/files/pull-jobs/${id}`);
    },

    uploadFile: async (
        uuid: string,
        root: string,
        file: File,
        onProgress?: (percent: number) => void,
    ): Promise<void> => {
        if (webspaceFileManagerCapabilities.signedUploadUrl) {
            const signed = await api.get<ApiResponse<{ upload_url: string; expires_in: number }>>(
                `/user/webspaces/${uuid}/files/upload-url`,
                { params: { directory: normalizePath(root || '/') } },
            );
            const uploadUrl = signed.data.data?.upload_url;
            if (!uploadUrl) {
                throw new Error('Failed to get upload URL');
            }
            const formData = new FormData();
            formData.append('files', file);
            try {
                await quilldUploadClient.post(uploadUrl, formData, {
                    onUploadProgress:
                        onProgress &&
                        ((e) => {
                            const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
                            onProgress(Math.min(percent, 100));
                        }),
                });
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new Error(getFeatherpanelApiErrorMessage(error) || 'Upload failed');
                }
                throw error;
            }
            return;
        }

        const formData = new FormData();
        formData.append('files', file);
        await api.post(`/user/webspaces/${uuid}/files/upload`, formData, {
            params: { directory: normalizePath(root || '/') },
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress:
                onProgress &&
                ((e) => {
                    const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
                    onProgress(Math.min(percent, 100));
                }),
        });
    },

    getUploadUrl: async (uuid: string, directory = '/'): Promise<string> => {
        const signed = await api.get<ApiResponse<{ upload_url: string }>>(`/user/webspaces/${uuid}/files/upload-url`, {
            params: { directory: normalizePath(directory || '/') },
        });
        return signed.data.data?.upload_url ?? '';
    },

    fileExists: async (uuid: string, path: string): Promise<boolean | null> => {
        const normalized = normalizePath(path || '/');
        if (!normalized || normalized === '/') return false;

        const lastSlash = normalized.lastIndexOf('/');
        const directory = lastSlash <= 0 ? '/' : normalized.slice(0, lastSlash) || '/';
        const name = lastSlash < 0 ? normalized.replace(/^\//, '') : normalized.slice(lastSlash + 1);
        if (!name) return false;

        try {
            const { contents, limited } = await webspaceFilesApi.getFiles(uuid, directory);
            const found = contents.some((f) => f.name === name && (f.isFile ?? !f.directory));
            if (found) return true;
            if (limited) return null;
            return false;
        } catch {
            return null;
        }
    },
};
