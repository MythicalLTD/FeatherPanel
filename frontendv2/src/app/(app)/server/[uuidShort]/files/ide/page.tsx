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
import { useRouter } from 'next/navigation';
import { Editor, OnMount } from '@monaco-editor/react';
import {
    Save,
    Loader2,
    FileText,
    Folder,
    ChevronLeft,
    ChevronRight,
    Lock,
    Search as SearchIcon,
    X,
} from 'lucide-react';
import { filesApi } from '@/lib/files-api';
import type { FileObject } from '@/types/server';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import { Button } from '@/components/featherui/Button';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

function joinPath(directory: string, name: string): string {
    if (!directory || directory === '/') return `/${name}`;
    return directory.endsWith('/') ? `${directory}${name}` : `${directory}/${name}`;
}

function getParentDirectory(path: string): string {
    if (!path || path === '/') return '/';
    const normalized = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
    const idx = normalized.lastIndexOf('/');
    if (idx <= 0) return '/';
    return normalized.slice(0, idx) || '/';
}

function getLanguageFromFileName(name: string | null): string {
    if (!name) return 'plaintext';
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'json':
            return 'json';
        case 'html':
            return 'html';
        case 'css':
            return 'css';
        case 'md':
            return 'markdown';
        case 'py':
            return 'python';
        case 'sh':
            return 'shell';
        case 'yml':
        case 'yaml':
            return 'yaml';
        default:
            return 'plaintext';
    }
}

export default function ServerFilesIDEPage({
    params,
    searchParams,
}: {
    params: Promise<{ uuidShort: string }>;
    searchParams: Promise<{ file?: string; directory?: string }>;
}) {
    const { t } = useTranslation();
    const router = useRouter();

    const { uuidShort } = use(params);
    const { file: initialFile, directory: initialDirectory } = use(searchParams);

    const [currentDirectory, setCurrentDirectory] = useState<string>(initialDirectory || '/');
    const [currentFileName, setCurrentFileName] = useState<string | null>(initialFile || null);

    const [files, setFiles] = useState<FileObject[]>([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [fileFilter, setFileFilter] = useState('');

    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loadingContent, setLoadingContent] = useState(false);
    const [saving, setSaving] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    const { hasPermission } = useServerPermissions(uuidShort);
    const canEdit = hasPermission('file.update');
    const canRead = hasPermission('file.read');

    const { fetchWidgets, getWidgets } = usePluginWidgets('server-file-editor');
    const { theme } = useTheme();
    const { settings } = useSettings();

    const appName = settings?.app_name || 'FeatherPanel';
    const appLogo = settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png';

    const fullPath = useMemo(
        () => (currentFileName ? joinPath(currentDirectory || '/', currentFileName) : ''),
        [currentDirectory, currentFileName],
    );

    const hasUnsavedChanges = useMemo(() => content !== originalContent, [content, originalContent]);

    const filteredFiles = useMemo(() => {
        if (!fileFilter.trim()) return files;
        const lower = fileFilter.toLowerCase();
        return files.filter((f) => f.name.toLowerCase().includes(lower));
    }, [files, fileFilter]);

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileObject } | null>(null);

    const fetchDirectory = useCallback(
        async (directory: string) => {
            if (!uuidShort || !canRead) return;
            setFilesLoading(true);
            try {
                const data = await filesApi.getFiles(uuidShort, directory || '/');
                const sorted = [...data].sort((a, b) => {
                    if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
                    return a.isFile ? 1 : -1; // folders first
                });
                setFiles(sorted);
            } catch (error) {
                console.error(error);
                toast.error(t('files.editor.load_error'));
            } finally {
                setFilesLoading(false);
            }
        },
        [uuidShort, canRead, t],
    );

    const fetchContent = useCallback(async () => {
        if (!uuidShort || !currentFileName || !fullPath) return;
        setLoadingContent(true);
        try {
            const data = await filesApi.getFileContent(uuidShort, fullPath);
            setContent(data);
            setOriginalContent(data);
        } catch (error) {
            console.error(error);
            toast.error(t('files.editor.load_error'));
        } finally {
            setLoadingContent(false);
        }
    }, [uuidShort, currentFileName, fullPath, t]);

    const confirmNavigationIfDirty = useCallback(() => {
        if (!hasUnsavedChanges) return true;
        if (typeof window === 'undefined') return true;
        const ok = window.confirm(t('files.editor.unsaved_prompt'));
        return ok;
    }, [hasUnsavedChanges, t]);

    useEffect(() => {
        if (!uuidShort || !canRead) return;
        fetchDirectory(currentDirectory || '/');
    }, [uuidShort, canRead, currentDirectory, fetchDirectory]);

    useEffect(() => {
        if (!uuidShort || !currentFileName) return;
        fetchContent();
    }, [uuidShort, currentFileName, fetchContent]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    // Ctrl/Cmd+S save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (canEdit && hasUnsavedChanges && !saving) {
                    void handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canEdit, hasUnsavedChanges, saving, content, fullPath]);

    // Warn on browser/tab close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!hasUnsavedChanges) return;
            e.preventDefault();
            e.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleSave = useCallback(async () => {
        if (!canEdit || !uuidShort || !fullPath) return;
        setSaving(true);
        const toastId = toast.loading(t('files.editor.saving'));
        try {
            await filesApi.saveFileContent(uuidShort, fullPath, content);
            setOriginalContent(content);
            toast.success(t('files.editor.save_success'), { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error(t('files.editor.save_error'), { id: toastId });
        } finally {
            setSaving(false);
        }
    }, [canEdit, uuidShort, fullPath, content, t]);

    const handleEditorMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const handleOpenFile = async (file: FileObject) => {
        setContextMenu(null);
        if (!file.isFile) {
            // Navigate into folder
            if (!confirmNavigationIfDirty()) return;
            setCurrentDirectory(joinPath(currentDirectory || '/', file.name));
            setCurrentFileName(null);
            setContent('');
            setOriginalContent('');
            return;
        }

        if (!confirmNavigationIfDirty()) return;
        setCurrentFileName(file.name);
    };

    const handleGoUp = () => {
        if (!confirmNavigationIfDirty()) return;
        setContextMenu(null);
        setCurrentDirectory((prev) => getParentDirectory(prev || '/'));
        setCurrentFileName(null);
        setContent('');
        setOriginalContent('');
    };

    const handleBackToFiles = () => {
        if (!confirmNavigationIfDirty()) return;
        setContextMenu(null);
        router.push(`/server/${uuidShort}/files`);
    };

    const handleCloseWindow = () => {
        if (!confirmNavigationIfDirty()) return;
        // Try to close the tab (works if opened via window.open)
        window.close();
        // Fallback to navigating back to regular file manager
        router.push(`/server/${uuidShort}/files`);
    };

    if (!canRead) {
        return (
            <div className='fixed inset-0 z-40 bg-gradient-to-br from-[#060112] via-[#110429] to-[#050115] flex items-center justify-center'>
                <p className='text-muted-foreground'>{t('files.list.empty_description')}</p>
            </div>
        );
    }

    return (
        <div className='fixed inset-0 z-40 bg-gradient-to-br from-[#060112] via-[#110429] to-[#050115] flex flex-col gap-3 p-4'>
            <div className='flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-xl'>
                <div className='flex items-center gap-3'>
                    <div className='h-8 w-8 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center overflow-hidden'>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={appLogo} alt={appName} className='h-6 w-6 object-contain' />
                    </div>
                    <div className='flex flex-col'>
                        <span className='text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground'>
                            {appName}
                        </span>
                        <span className='text-sm font-semibold text-foreground'>
                            {t('files.editor.window_title', { defaultValue: 'File Editor' })}
                        </span>
                    </div>
                </div>
                <div className='flex items-center gap-3'>
                    {currentFileName && (
                        <span className='max-w-[220px] truncate text-xs text-muted-foreground'>
                            {currentFileName}
                        </span>
                    )}
                    <Button
                        variant='ghost'
                        size='icon'
                        onClick={handleCloseWindow}
                        className='h-8 w-8 rounded-full hover:bg-red-500/20 hover:text-red-400'
                        title={t('files.editor.cancel')}
                    >
                        <X className='h-4 w-4' />
                    </Button>
                </div>
            </div>

            <div className='flex flex-1 min-h-0 gap-4'>
                {/* Sidebar file tree */}
                <aside className='w-64 shrink-0 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl flex flex-col overflow-hidden'>
                    <div className='px-3 py-2 border-b border-border/50 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <Folder className='h-4 w-4 text-primary' />
                            <span className='text-xs font-semibold uppercase tracking-widest'>
                                {t('files.breadcrumbs.home')}
                            </span>
                        </div>
                        <Button
                            size='icon'
                            variant='ghost'
                            className='h-7 w-7'
                            onClick={handleGoUp}
                            disabled={currentDirectory === '/' || filesLoading}
                            title={t('common.previous')}
                        >
                            <ChevronLeft className='h-4 w-4' />
                        </Button>
                    </div>
                    <div className='px-3 py-2 border-b border-border/30 flex flex-col gap-1'>
                        <div className='text-[11px] text-muted-foreground truncate'>
                            {currentDirectory || '/'}
                        </div>
                        <div className='flex items-center gap-2'>
                            <div className='relative flex-1'>
                                <input
                                    type='text'
                                    value={fileFilter}
                                    onChange={(e) => setFileFilter(e.target.value)}
                                    placeholder={t('files.search.files_placeholder')}
                                    className='w-full rounded-lg bg-background/70 border border-border/60 px-2 py-1 text-[11px] pr-7 focus:outline-none focus:ring-1 focus:ring-primary'
                                />
                                <SearchIcon className='h-3.5 w-3.5 text-muted-foreground absolute right-2 top-1.5' />
                            </div>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 text-muted-foreground hover:text-foreground'
                                onClick={async () => {
                                    const root = currentDirectory || '/';
                                    const name = window.prompt(t('files.toolbar.new_file'), 'new-file.txt');
                                    if (!name) return;
                                    const path = joinPath(root, name);
                                    try {
                                        await filesApi.saveFileContent(uuidShort, path, '');
                                        setCurrentFileName(name);
                                        await fetchDirectory(root);
                                    } catch (error) {
                                        console.error(error);
                                        toast.error(t('files.editor.save_error'));
                                    }
                                }}
                                title={t('files.toolbar.new_file')}
                            >
                                <FileText className='h-3.5 w-3.5' />
                            </Button>
                            <Button
                                variant='ghost'
                                size='icon'
                                className='h-7 w-7 text-muted-foreground hover:text-foreground'
                                onClick={async () => {
                                    const name = window.prompt(t('files.toolbar.new_folder'), 'new-folder');
                                    if (!name) return;
                                    const root = currentDirectory || '/';
                                    try {
                                        await filesApi.createFolder(uuidShort, root, name);
                                        await fetchDirectory(root);
                                    } catch (error) {
                                        console.error(error);
                                        toast.error(t('files.messages.upload_failed'));
                                    }
                                }}
                                title={t('files.toolbar.new_folder')}
                            >
                                <Folder className='h-3.5 w-3.5' />
                            </Button>
                        </div>
                    </div>
                    <div className='flex-1 overflow-auto custom-scrollbar'>
                        {filesLoading ? (
                            <div className='p-4 text-xs text-muted-foreground flex items-center gap-2'>
                                <Loader2 className='h-3 w-3 animate-spin' />
                                {t('servers.loading')}
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className='p-4 text-xs text-muted-foreground'>
                                {t('files.list.empty_description')}
                            </div>
                        ) : (
                            <ul className='p-2 space-y-0.5 text-sm'>
                                {filteredFiles.map((file) => {
                                    const isActive = file.isFile && file.name === currentFileName;
                                    const isFolder = !file.isFile;
                                    return (
                                        <li key={file.name}>
                                            <button
                                                type='button'
                                                onClick={() => handleOpenFile(file)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    setContextMenu({
                                                        x: e.clientX,
                                                        y: e.clientY,
                                                        file,
                                                    });
                                                }}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer?.setData('text/plain', file.name);
                                                }}
                                                onDragOver={(e) => {
                                                    if (isFolder) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const draggedName = e.dataTransfer?.getData('text/plain');
                                                    if (!draggedName || !isFolder || draggedName === file.name) return;
                                                    // Move dragged item into this folder
                                                    void (async () => {
                                                        try {
                                                            const root = currentDirectory || '/';
                                                            await filesApi.moveFile(uuidShort, root, [
                                                                {
                                                                    from: draggedName,
                                                                    to: `${file.name}/${draggedName}`.replace(
                                                                        /\/\//g,
                                                                        '/',
                                                                    ),
                                                                },
                                                            ]);
                                                            if (draggedName === currentFileName) {
                                                                setCurrentFileName(null);
                                                                setContent('');
                                                                setOriginalContent('');
                                                            }
                                                            await fetchDirectory(root);
                                                        } catch (error) {
                                                            console.error(error);
                                                            toast.error(t('files.editor.save_error'));
                                                        }
                                                    })();
                                                }}
                                                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                                    isActive
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'hover:bg-muted text-foreground'
                                                }`}
                                            >
                                                {file.isFile ? (
                                                    <FileText className='h-4 w-4 text-muted-foreground' />
                                                ) : (
                                                    <Folder className='h-4 w-4 text-muted-foreground' />
                                                )}
                                                <span className='truncate flex-1'>{file.name}</span>
                                                {!file.isFile && <ChevronRight className='h-3 w-3 opacity-40' />}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                    <div className='px-3 py-2 border-t border-border/50 flex items-center justify-between'>
                        <Button
                            variant='ghost'
                            size='sm'
                            className='text-xs text-muted-foreground hover:text-foreground'
                            onClick={handleBackToFiles}
                        >
                            {t('files.toolbar.refresh')}
                        </Button>
                    </div>
                </aside>

                {/* Editor area */}
                <section className='flex-1 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-3xl overflow-hidden flex flex-col'>
                    <div className='flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30'>
                        <div className='flex items-center gap-3'>
                            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 '>
                                <FileText className='h-5 w-5' />
                            </div>
                            <div className='flex flex-col'>
                                <span className='text-xs font-bold uppercase tracking-widest text-foreground/80'>
                                    {currentFileName || t('files.list.empty_title')}
                                </span>
                                {hasUnsavedChanges && currentFileName && (
                                    <span className='text-[10px] text-yellow-500 font-medium uppercase tracking-[0.2em]'>
                                        {t('files.editor.unsaved_prompt')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className='flex items-center gap-2'>
                            {!canEdit && (
                                <div className='bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-lg border border-yellow-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-2'>
                                    <Lock className='h-3 w-3' />
                                    {t('files.editor.read_only')}
                                </div>
                            )}
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={handleBackToFiles}
                                className='text-muted-foreground hover:text-foreground'
                            >
                                {t('files.editor.cancel')}
                            </Button>
                            <Button
                                className='bg-primary hover:bg-primary/90 text-primary-foreground active:scale-95 transition-all'
                                size='sm'
                                onClick={() => handleSave()}
                                disabled={saving || !hasUnsavedChanges || !currentFileName}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        {t('files.editor.encrypting')}
                                    </>
                                ) : (
                                    <>
                                        <Save className='mr-2 h-4 w-4' />
                                        {t('files.editor.save_changes')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className='flex-1 relative min-h-0'>
                        {!currentFileName ? (
                            <div className='flex h-full items-center justify-center text-sm text-muted-foreground px-4 text-center'>
                                {t('files.list.empty_description')}
                            </div>
                        ) : loadingContent ? (
                            <div className='flex h-full items-center justify-center gap-3 text-sm text-muted-foreground'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('files.editor.loading_title')}
                            </div>
                        ) : (
                            <Editor
                                height='100%'
                                defaultLanguage={getLanguageFromFileName(currentFileName)}
                                value={content}
                                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                onMount={handleEditorMount}
                                onChange={(value) => {
                                    if (value !== undefined) {
                                        setContent(value);
                                    }
                                }}
                                options={{
                                    minimap: { enabled: true },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    readOnly: !canEdit,
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    padding: { top: 20 },
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    fontLigatures: true,
                                    cursorSmoothCaretAnimation: 'on',
                                    cursorBlinking: 'expand',
                                    smoothScrolling: true,
                                }}
                            />
                        )}
                    </div>
                </section>
            </div>

            <WidgetRenderer widgets={getWidgets('server-file-editor', 'bottom-of-page')} />

            {contextMenu && (
                <div
                    className='fixed z-50 min-w-[160px] rounded-md border border-border bg-card shadow-lg text-sm py-1'
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onMouseLeave={() => setContextMenu(null)}
                >
                    <button
                        type='button'
                        className='w-full px-3 py-1.5 text-left hover:bg-muted'
                        onClick={() => handleOpenFile(contextMenu.file)}
                    >
                        {contextMenu.file.isFile ? t('common.open') : t('common.open')}
                    </button>
                    <button
                        type='button'
                        className='w-full px-3 py-1.5 text-left hover:bg-muted'
                        onClick={async () => {
                            const root = currentDirectory || '/';
                            const name = window.prompt(
                                t('files.dialogs.rename.title'),
                                contextMenu.file.name,
                            );
                            setContextMenu(null);
                            if (!name || name === contextMenu.file.name) return;
                            try {
                                await filesApi.renameFile(uuidShort, root, [
                                    { from: contextMenu.file.name, to: name },
                                ]);
                                if (currentFileName === contextMenu.file.name) {
                                    setCurrentFileName(name);
                                    await fetchContent();
                                } else {
                                    await fetchDirectory(root);
                                }
                            } catch (error) {
                                console.error(error);
                                toast.error(t('files.editor.save_error'));
                            }
                        }}
                    >
                        {t('files.dialogs.rename.rename')}
                    </button>
                    <button
                        type='button'
                        className='w-full px-3 py-1.5 text-left text-destructive hover:bg-destructive/10'
                        onClick={async () => {
                            const root = currentDirectory || '/';
                            const ok = window.confirm(
                                t('files.dialogs.delete.confirm_single', { name: contextMenu.file.name }),
                            );
                            setContextMenu(null);
                            if (!ok) return;
                            try {
                                await filesApi.deleteFiles(uuidShort, root, [contextMenu.file.name]);
                                if (currentFileName === contextMenu.file.name) {
                                    setCurrentFileName(null);
                                    setContent('');
                                    setOriginalContent('');
                                }
                                await fetchDirectory(root);
                            } catch (error) {
                                console.error(error);
                                toast.error(t('files.messages.upload_failed'));
                            }
                        }}
                    >
                        {t('files.toolbar.delete', { defaultValue: 'Delete' })}
                    </button>
                    <button
                        type='button'
                        className='w-full px-3 py-1.5 text-left hover:bg-muted'
                        onClick={async () => {
                            const root = contextMenu.file.isFile
                                ? currentDirectory || '/'
                                : joinPath(currentDirectory || '/', contextMenu.file.name);
                            setContextMenu(null);
                            const name = window.prompt(t('files.toolbar.new_folder'), 'new-folder');
                            if (!name) return;
                            try {
                                await filesApi.createFolder(uuidShort, root, name);
                                await fetchDirectory(currentDirectory || '/');
                            } catch (error) {
                                console.error(error);
                                toast.error(t('files.messages.upload_failed'));
                            }
                        }}
                    >
                        {t('files.toolbar.new_folder')}
                    </button>
                </div>
            )}
        </div>
    );
}

