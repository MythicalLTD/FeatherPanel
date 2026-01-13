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

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFileManager } from '@/hooks/useFileManager';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { PageHeader } from '@/components/featherui/PageHeader';
import { FileActionToolbar } from './components/FileActionToolbar';
import { FileBreadcrumbs } from './components/FileBreadcrumbs';
import { FileList } from './components/FileList';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import {
    CreateFolderDialog,
    CreateFileDialog,
    DeleteDialog,
    RenameDialog,
    ImagePreviewDialog,
    PermissionsDialog,
    MoveCopyDialog,
    PullFileDialog,
    WipeAllDialog,
    IgnoredContentDialog,
    CompressDialog,
} from './components/dialogs';
import { useTranslation } from '@/contexts/TranslationContext';
import { toast } from 'sonner';
import { filesApi } from '@/lib/files-api';
import { FileObject } from '@/types/server';
import { Download, X, Upload } from 'lucide-react';
import React, { use } from 'react';
import { Button } from '@/components/featherui/Button';

export default function ServerFilesPage({ params }: { params: Promise<{ uuidShort: string }> }) {
    const router = useRouter();
    const { uuidShort } = use(params);
    const { t } = useTranslation();

    // Hooks
    const {
        files,
        loading,
        currentDirectory,
        selectedFiles,
        setSelectedFiles,
        activePulls,
        searchQuery,
        setSearchQuery,
        refresh,
        refreshIgnored,
        navigate,
        toggleSelect,
        selectAll,
        cancelPull,
    } = useFileManager(uuidShort);

    const { hasPermission } = useServerPermissions(uuidShort);

    // Plugin Widgets
    const { fetchWidgets, getWidgets } = usePluginWidgets('server-files');

    // Permissions
    const canRead = hasPermission('file.read');
    const canCreate = hasPermission('file.create');
    const canUpdate = hasPermission('file.update');
    const canDelete = hasPermission('file.delete');

    // Dialog States
    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [createFileOpen, setCreateFileOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pullFileOpen, setPullFileOpen] = useState(false);
    const [wipeAllOpen, setWipeAllOpen] = useState(false);
    const [ignoredOpen, setIgnoredOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [moveCopyOpen, setMoveCopyOpen] = useState(false);
    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [compressOpen, setCompressOpen] = useState(false);
    const [filesToCompress, setFilesToCompress] = useState<string[]>([]);
    const [moveCopyAction, setMoveCopyAction] = useState<'move' | 'copy'>('move');

    // File Action State
    const [actionFile, setActionFile] = useState<FileObject | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Handlers
    const handleAction = (action: string, file: FileObject) => {
        setActionFile(file);
        switch (action) {
            case 'edit':
                router.push(
                    `/server/${uuidShort}/files/edit?file=${encodeURIComponent(file.name)}&directory=${encodeURIComponent(currentDirectory)}`,
                );
                break;
            case 'preview':
                setPreviewOpen(true);
                break;
            case 'rename':
                setRenameOpen(true);
                break;
            case 'delete':
                setDeleteOpen(true);
                break;
            case 'download':
                handleDownload(file.name);
                break;
            case 'compress':
                handleCompress([file.name]);
                break;
            case 'decompress':
                handleDecompress(file.name);
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
        }
    };

    const handleDownload = async (filename: string) => {
        try {
            // Ensure path starts with / and has no double slashes
            const path = currentDirectory.endsWith('/')
                ? `${currentDirectory}${filename}`
                : `${currentDirectory}/${filename}`;

            const url = `/api/user/servers/${uuidShort}/download-file?path=${encodeURIComponent(path)}`;
            window.open(url, '_blank');
        } catch {
            toast.error(t('files.messages.failed_download'));
        }
    };

    const handleCompress = (files: string[]) => {
        setFilesToCompress(files);
        setCompressOpen(true);
    };

    const handleDecompress = async (filename: string) => {
        const toastId = toast.loading(t('files.messages.extracting'));
        try {
            await filesApi.decompressFile(uuidShort, currentDirectory, filename);
            toast.success(t('files.messages.extracted'), { id: toastId });
            refresh();
        } catch (error) {
            const err = error as { response?: { data?: { error?: string } } };
            const errorMessage = err.response?.data?.error || t('files.messages.extract_failed');
            toast.error(errorMessage, { id: toastId });
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('file-search-input') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const uploadFile = React.useCallback(
        async (file: File) => {
            setUploading(true);
            const toastId = toast.loading(t('files.messages.uploading', { file: file.name }));

            try {
                await filesApi.uploadFile(uuidShort, currentDirectory, file);
                toast.success(t('files.messages.upload_complete'), { id: toastId });
                refresh();
            } catch (error) {
                console.error(error);
                toast.error(t('files.messages.upload_failed'), { id: toastId });
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        },
        [uuidShort, currentDirectory, refresh, t],
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        uploadFile(file);
    };

    // Drag and Drop Logic
    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
        };
        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            if (e.clientX === 0 && e.clientY === 0) {
                setIsDragging(false);
            }
        };
        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer?.files.length) {
                const files = Array.from(e.dataTransfer.files);
                for (const file of files) {
                    await uploadFile(file);
                }
            }
        };

        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('drop', handleDrop);
        };
    }, [uploadFile]);

    return (
        <div className='flex flex-col gap-6 relative min-h-screen pb-20'>
            <WidgetRenderer widgets={getWidgets('server-files', 'top-of-page')} />
            <PageHeader
                title={t('files.title')}
                description={t('files.manage_description', { directory: currentDirectory })}
            />
            <WidgetRenderer widgets={getWidgets('server-files', 'after-header')} />

            <div className='flex flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/5 bg-white/10 p-4 backdrop-blur-sm shadow-xl shadow-black/20'>
                    <FileBreadcrumbs
                        currentDirectory={currentDirectory}
                        onNavigate={navigate}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                    />
                </div>

                <WidgetRenderer widgets={getWidgets('server-files', 'after-search-bar')} />

                <FileActionToolbar
                    loading={loading || uploading}
                    selectedCount={selectedFiles.length}
                    onRefresh={refresh}
                    onCreateFile={() => setCreateFileOpen(true)}
                    onCreateFolder={() => setCreateFolderOpen(true)}
                    onUpload={handleUploadClick}
                    onDeleteSelected={() => setDeleteOpen(true)}
                    onDownloadSelected={() => selectedFiles.forEach((f) => handleDownload(f))}
                    onArchiveSelected={() => handleCompress(selectedFiles)}
                    onClearSelection={() => setSelectedFiles([])}
                    onPullFile={() => setPullFileOpen(true)}
                    onWipeAll={() => setWipeAllOpen(true)}
                    onIgnoredContent={() => setIgnoredOpen(true)}
                    onMoveSelected={() => {
                        setMoveCopyAction('move');
                        setMoveCopyOpen(true);
                    }}
                    onCopySelected={() => {
                        setMoveCopyAction('copy');
                        setMoveCopyOpen(true);
                    }}
                    onPermissionsSelected={() => setPermissionsOpen(true)}
                    canCreate={canCreate}
                    canDelete={canDelete}
                    currentDirectory={currentDirectory}
                />

                {activePulls.length > 0 && (
                    <div className='mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-500'>
                        {activePulls.map((pull) => (
                            <div
                                key={pull.Identifier}
                                className='group relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-xl transition-all hover:border-primary/40 text-left'
                            >
                                <div className='absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity' />
                                <div className='relative flex flex-col gap-3 text-left'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'>
                                            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary'>
                                                <Download className='h-4 w-4 animate-bounce' />
                                            </div>
                                            <span className='text-xs font-bold uppercase tracking-widest text-primary/80'>
                                                {t('files.messages.active_pull')}
                                            </span>
                                        </div>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                cancelPull(pull.Identifier);
                                            }}
                                            className='h-7 w-7 text-muted-foreground hover:text-red-500'
                                        >
                                            <X className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    <div className='space-y-1.5'>
                                        <div className='flex justify-between text-[10px] font-bold uppercase tracking-tighter text-white/40'>
                                            <span>
                                                {t('files.messages.task_id', { id: pull.Identifier.slice(0, 8) })}...
                                            </span>
                                            <span className='text-primary'>{pull.Progress}%</span>
                                        </div>
                                        <div className='h-1.5 w-full overflow-hidden rounded-full bg-white/5 border border-white/5'>
                                            <div
                                                className='h-full bg-linear-to-r from-primary to-primary-foreground transition-all duration-500 shadow-[0_0_10px_rgba(var(--primary),0.5)]'
                                                style={{ width: `${pull.Progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <WidgetRenderer widgets={getWidgets('server-files', 'before-files-list')} />

                <FileList
                    files={files}
                    loading={loading}
                    selectedFiles={selectedFiles}
                    onSelect={toggleSelect}
                    onSelectAll={selectAll}
                    onNavigate={(name) =>
                        navigate(currentDirectory === '/' ? `/${name}` : `${currentDirectory}/${name}`)
                    }
                    onAction={handleAction}
                    canEdit={canUpdate}
                    canDelete={canDelete}
                    canDownload={canRead}
                    serverUuid={uuidShort}
                    currentDirectory={currentDirectory}
                />

                <WidgetRenderer widgets={getWidgets('server-files', 'after-files-list')} />
            </div>

            {/* Hidden Input for Upload */}
            <input type='file' ref={fileInputRef} className='hidden' onChange={handleFileChange} />

            {/* Drag and Drop Overlay */}
            {isDragging && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-md border-4 border-dashed border-primary animate-in fade-in zoom-in duration-300 pointer-events-none'>
                    <div className='flex flex-col items-center gap-6 bg-background/80 p-12 rounded-3xl shadow-2xl border border-primary/20 scale-110'>
                        <div className='flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/40 animate-bounce'>
                            <Upload className='h-12 w-12' />
                        </div>
                        <div className='text-center'>
                            <h2 className='text-3xl font-bold mb-2'>{t('files.messages.drop_to_upload')}</h2>
                            <p className='text-muted-foreground'>
                                {t('files.messages.drop_description')}{' '}
                                <span className='text-primary font-mono'>{currentDirectory}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            <CreateFolderDialog
                open={createFolderOpen}
                onOpenChange={setCreateFolderOpen}
                uuid={uuidShort}
                root={currentDirectory}
                onSuccess={refresh}
            />
            <CreateFileDialog
                open={createFileOpen}
                onOpenChange={setCreateFileOpen}
                uuid={uuidShort}
                root={currentDirectory}
                onSuccess={refresh}
            />
            <RenameDialog
                open={renameOpen}
                onOpenChange={setRenameOpen}
                uuid={uuidShort}
                root={currentDirectory}
                fileName={actionFile?.name || ''}
                onSuccess={refresh}
            />
            <DeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                uuid={uuidShort}
                root={currentDirectory}
                files={actionFile ? [actionFile.name] : selectedFiles}
                onSuccess={() => {
                    refresh();
                    setSelectedFiles([]);
                }}
            />
            <PullFileDialog
                open={pullFileOpen}
                onOpenChange={setPullFileOpen}
                uuid={uuidShort}
                root={currentDirectory}
                onSuccess={refresh}
            />
            <WipeAllDialog open={wipeAllOpen} onOpenChange={setWipeAllOpen} uuid={uuidShort} onSuccess={refresh} />
            <IgnoredContentDialog
                open={ignoredOpen}
                onOpenChange={setIgnoredOpen}
                uuid={uuidShort}
                onSuccess={() => {
                    refreshIgnored();
                    refresh();
                }}
            />
            <ImagePreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                uuid={uuidShort}
                file={actionFile}
                currentDirectory={currentDirectory}
                onDownload={handleDownload}
            />
            <MoveCopyDialog
                open={moveCopyOpen}
                onOpenChange={setMoveCopyOpen}
                uuid={uuidShort}
                root={currentDirectory}
                files={actionFile ? [actionFile.name] : selectedFiles}
                action={moveCopyAction}
                onSuccess={() => {
                    refresh();
                    setSelectedFiles([]);
                }}
            />
            <PermissionsDialog
                open={permissionsOpen}
                onOpenChange={setPermissionsOpen}
                uuid={uuidShort}
                root={currentDirectory}
                files={actionFile ? [actionFile.name] : selectedFiles}
                onSuccess={() => {
                    refresh();
                    setSelectedFiles([]);
                }}
            />
            <CompressDialog
                open={compressOpen}
                onOpenChange={setCompressOpen}
                serverUuid={uuidShort}
                directory={currentDirectory}
                files={filesToCompress}
                onSuccess={() => {
                    refresh();
                    setSelectedFiles([]);
                }}
            />
            <WidgetRenderer widgets={getWidgets('server-files', 'bottom-of-page')} />
        </div>
    );
}
