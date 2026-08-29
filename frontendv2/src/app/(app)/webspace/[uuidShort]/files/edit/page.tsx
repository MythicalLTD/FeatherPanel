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

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OnMount } from '@monaco-editor/react';
import { toast } from 'sonner';
import { FileCode, Loader2, Lock, Monitor, Save, Smartphone } from 'lucide-react';
import { FileManagerApiProvider, useFileManagerApi } from '@/contexts/FileManagerApiContext';
import { isFileNotFoundError } from '@/lib/files-api';
import { webspaceFilesApi } from '@/lib/webspace-files-api';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { useFileEditorEngine } from '@/hooks/useFileEditorEngine';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/featherui/Button';
import { PageHeader } from '@/components/featherui/PageHeader';
import { useTranslation } from '@/contexts/TranslationContext';
import { FileTextEditor } from '@/components/server/files/FileTextEditor';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { joinServerFilePath } from '@/lib/server-switch';
import { safeBack } from '@/lib/safe-back';

function WebSpaceFileEditorInner({
    uuidShort,
    fileName,
    directory,
}: {
    uuidShort: string;
    fileName: string;
    directory: string;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const { theme } = useTheme();
    const filesApi = useFileManagerApi();
    const fullPath = fileName ? joinServerFilePath(directory, fileName) : '';
    const filesBasePath = `/webspace/${uuidShort}/files`;

    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);
    const { engine, toggleEngine } = useFileEditorEngine();

    const { hasPermission } = useWebSpacePermissions(uuidShort);
    const canEdit = hasPermission(WebSpaceSubuserPermissions['file.update']);
    const canReadContent =
        hasPermission(WebSpaceSubuserPermissions['file.read-content']) ||
        hasPermission(WebSpaceSubuserPermissions['file.read']);

    const fetchContent = useCallback(async () => {
        if (!fileName || !fullPath) return;
        setLoading(true);
        try {
            const data = await Promise.race([
                filesApi.getFileContent(uuidShort, fullPath),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000)),
            ]);
            setContent(data);
            setOriginalContent(data);
        } catch (error) {
            if (isFileNotFoundError(error)) {
                router.replace(filesBasePath);
                return;
            }
            if (error instanceof Error && error.message === 'Request timeout') {
                toast.error(t('files.editor.load_timeout'));
            } else {
                toast.error(t('files.editor.load_error'));
            }
        } finally {
            setLoading(false);
        }
    }, [uuidShort, fullPath, fileName, t, router, filesApi, filesBasePath]);

    useEffect(() => {
        if (!fileName) {
            router.replace(filesBasePath);
            return;
        }
        if (!canReadContent) return;
        void fetchContent();
    }, [fileName, filesBasePath, router, fetchContent, canReadContent]);

    const handleSave = useCallback(
        async (newContent?: string) => {
            if (!canEdit) return;
            const contentToSave = newContent ?? content;
            setSaving(true);
            const toastId = toast.loading(t('files.editor.saving'));
            try {
                await filesApi.saveFileContent(uuidShort, fullPath, contentToSave);
                setContent(contentToSave);
                setOriginalContent(contentToSave);
                toast.success(t('files.editor.save_success'), { id: toastId });
            } catch {
                toast.error(t('files.editor.save_error'), { id: toastId });
            } finally {
                setSaving(false);
            }
        },
        [canEdit, content, uuidShort, fullPath, t, filesApi],
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (canEdit && content !== originalContent && !saving) {
                    void handleSave();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canEdit, content, originalContent, saving, handleSave]);

    const handleEditorMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const editorEngineLabel =
        engine === 'monaco' ? t('files.editor.engine_monaco') : t('files.editor.engine_codemirror');

    if (!canReadContent) {
        return (
            <div className='flex min-h-[40vh] items-center justify-center'>
                <p className='text-muted-foreground text-sm'>{t('files.editor.read_only')}</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className='relative flex min-h-screen flex-col gap-6 overflow-hidden pb-20'>
                <div className='animate-pulse'>
                    <div className='mb-2 h-8 w-48 rounded-lg bg-white/5' />
                    <div className='h-4 w-96 rounded-lg bg-white/5' />
                </div>
                <div className='border-border/50 bg-card/50 relative flex min-h-[600px] flex-1 items-center justify-center overflow-hidden rounded-4xl border p-1 backdrop-blur-3xl'>
                    <div className='relative z-10 flex flex-col items-center gap-6'>
                        <Loader2 className='text-primary h-10 w-10 animate-spin' />
                        <p className='text-muted-foreground text-xs font-medium tracking-[0.3em] uppercase'>
                            {t('files.editor.loading_description')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='relative flex min-h-[calc(100vh-10rem)] flex-col gap-6 pb-4'>
            <PageHeader
                title={t('files.editor.title', { file: fileName })}
                description={t('files.editor.description', { path: fullPath })}
            />

            <div className='border-border/50 bg-card/50 group hover:border-border/80 relative flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-4xl border p-1 backdrop-blur-3xl transition-all'>
                <div className='border-border/10 bg-muted/30 flex shrink-0 items-center justify-between border-b p-3'>
                    <div className='flex items-center gap-3'>
                        <div className='bg-primary/10 text-primary border-primary/20 flex h-9 w-9 items-center justify-center rounded-xl border'>
                            <FileCode className='h-5 w-5' />
                        </div>
                        <div className='flex flex-col'>
                            <span className='text-foreground/80 text-xs font-bold tracking-widest uppercase'>
                                {fileName}
                            </span>
                            <span className='text-muted-foreground text-[10px] font-medium tracking-tighter uppercase'>
                                {editorEngineLabel}
                            </span>
                        </div>
                    </div>
                    <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-3'>
                        <Button
                            size='sm'
                            variant='outline'
                            className='gap-2'
                            onClick={toggleEngine}
                            title={
                                engine === 'monaco'
                                    ? t('files.editor.switch_to_codemirror')
                                    : t('files.editor.switch_to_monaco')
                            }
                        >
                            {engine === 'monaco' ? <Smartphone className='h-4 w-4' /> : <Monitor className='h-4 w-4' />}
                            <span className='hidden sm:inline'>
                                {engine === 'monaco'
                                    ? t('files.editor.switch_to_codemirror')
                                    : t('files.editor.switch_to_monaco')}
                            </span>
                        </Button>
                        {!canEdit && (
                            <div className='flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-bold tracking-wider text-yellow-600 uppercase dark:text-yellow-400'>
                                <Lock className='h-3 w-3' />
                                {t('files.editor.read_only')}
                            </div>
                        )}
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                                const dir = directory || '/';
                                const fallback =
                                    dir === '/' ? filesBasePath : `${filesBasePath}?path=${encodeURIComponent(dir)}`;
                                safeBack(router, fallback);
                            }}
                            className='text-muted-foreground hover:text-foreground'
                        >
                            {t('files.editor.cancel')}
                        </Button>
                        <Button
                            className='bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95'
                            size='sm'
                            onClick={() => void handleSave()}
                            disabled={!canEdit || saving || content === originalContent}
                        >
                            {saving ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Save className='mr-2 h-4 w-4' />
                            )}
                            {t('files.editor.save_changes')}
                        </Button>
                    </div>
                </div>

                <div className='relative min-h-0 w-full flex-1'>
                    <div className='absolute inset-0'>
                        <FileTextEditor
                            engine={engine}
                            fileName={fileName}
                            content={content}
                            canEdit={canEdit}
                            theme={theme}
                            onChange={setContent}
                            onMonacoMount={handleEditorMount}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function WebSpaceFileEditorPage({
    params,
    searchParams,
}: {
    params: Promise<{ uuidShort: string }>;
    searchParams: Promise<{ file?: string; directory?: string }>;
}) {
    const { uuidShort } = use(params);
    const { file: rawFileName, directory = '/' } = use(searchParams);
    const fileName = rawFileName?.trim() ?? '';

    return (
        <FileManagerApiProvider value={webspaceFilesApi}>
            <WebSpacePageWidgets pageId='webspace-file-editor'>
                <WebSpaceFileEditorInner uuidShort={uuidShort} fileName={fileName} directory={directory} />
            </WebSpacePageWidgets>
        </FileManagerApiProvider>
    );
}
