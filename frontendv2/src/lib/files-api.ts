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
import { FileObject, FilesResponse } from '@/types/server';

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    error?: boolean;
}

export const filesApi = {
    getFiles: async (uuid: string, directory: string = '/'): Promise<FileObject[]> => {
        const response = await api.get<ApiResponse<FilesResponse>>(`/user/servers/${uuid}/files`, {
            params: { path: directory },
        });

        // Map fields for UI consistency
        return response.data.data.contents.map((f) => {
            const isFile = f.file !== undefined ? f.file : f.isFile !== undefined ? f.isFile : !f.directory;
            return {
                ...f,
                isFile,
                modified_at: f.modified || f.modified_at,
                created_at: f.created || f.created_at,
                mimetype: f.mime || f.mimetype,
            };
        });
    },

    getFileContent: async (uuid: string, path: string): Promise<string> => {
        const response = await api.get<string>(`/user/servers/${uuid}/file`, {
            params: { path },
            responseType: 'text', // Force raw text to prevent axios from parsing JSON files
        });

        return response.data;
    },

    saveFileContent: async (uuid: string, path: string, content: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/write-file`, content, {
            params: { path },
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

    copyFile: async (uuid: string, root: string, file: string, destination: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/files/copy`, {
            location: file,
            destination: destination,
        });
    },

    moveFile: async (uuid: string, root: string, files: { from: string; to: string }[]): Promise<void> => {
        await api.put(`/user/servers/${uuid}/rename`, {
            root,
            files,
        });
    },

    deleteFiles: async (uuid: string, root: string, files: string[]): Promise<void> => {
        await api.delete(`/user/servers/${uuid}/delete-files`, {
            data: {
                root,
                files,
            },
        });
    },

    wipeAllFiles: async (uuid: string): Promise<void> => {
        await api.post(`/user/servers/${uuid}/wipe-all-files`);
    },

    getDownloadUrl: (uuid: string, path: string): string => {
        return `/api/user/servers/${uuid}/download-file?path=${encodeURIComponent(path)}`;
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
        await api.post(`/user/servers/${uuid}/upload-file`, file, {
            params: {
                path: root,
                filename: file.name,
            },
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            onUploadProgress:
                onProgress &&
                ((e) => {
                    const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
                    onProgress(Math.min(percent, 100));
                }),
        });
    },

    getUploadUrl: async (uuid: string): Promise<string> => {
        return `/api/user/servers/${uuid}/upload-file`;
    },
};
