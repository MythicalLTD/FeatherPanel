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

import { useEffect, useState, useRef, useCallback, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Editor, OnMount } from '@monaco-editor/react';
import { filesApi } from '@/lib/files-api';
import { toast } from 'sonner';
import { Save, Loader2, FileCode, Lock, CheckCircle2, Boxes } from 'lucide-react';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/featherui/Button';
import { PageHeader } from '@/components/featherui/PageHeader';
import { useTranslation } from '@/contexts/TranslationContext';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { MinecraftServerPropertiesEditor } from '@/components/server/files/editors/MinecraftServerPropertiesEditor';
import { SpigotConfigurationEditor } from '@/components/server/files/editors/SpigotConfigurationEditor';
import { OpsEditor } from '@/components/server/files/editors/OpsEditor';
import { BannedPlayersEditor } from '@/components/server/files/editors/BannedPlayersEditor';
import { BannedIpsEditor } from '@/components/server/files/editors/BannedIpsEditor';
import { WhitelistEditor } from '@/components/server/files/editors/WhitelistEditor';
import { BukkitConfigurationEditor } from '@/components/server/files/editors/BukkitConfigurationEditor';
import { CommandsEditor } from '@/components/server/files/editors/CommandsEditor';
import { isBinaryLikeFileName } from '@/lib/binary-like-file-names';

export default function FileEditorPage({
    params,
    searchParams,
}: {
    params: Promise<{ uuidShort: string }>;
    searchParams: Promise<{ file?: string; directory?: string }>;
}) {
    const { t } = useTranslation();
    const { uuidShort } = use(params);
    const { file: fileName = 'file.txt', directory = '/' } = use(searchParams);
    const router = useRouter();
    const { theme } = useTheme();
    const fullPath = directory.endsWith('/') ? `${directory}${fileName}` : `${directory}/${fileName}`;

    const [content, setContent] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [useMinecraftEditor, setUseMinecraftEditor] = useState(false);
    const [useSpigotEditor, setUseSpigotEditor] = useState(false);
    const [useOpsEditor, setUseOpsEditor] = useState(false);
    const [useBannedPlayersEditor, setUseBannedPlayersEditor] = useState(false);
    const [useBannedIpsEditor, setUseBannedIpsEditor] = useState(false);
    const [useWhitelistEditor, setUseWhitelistEditor] = useState(false);
    const [useBukkitEditor, setUseBukkitEditor] = useState(false);
    const [useCommandsEditor, setUseCommandsEditor] = useState(false);
    const [useRawEditor, setUseRawEditor] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    const { hasPermission } = useServerPermissions(uuidShort);
    const canEdit = hasPermission('file.update');

    const { fetchWidgets, getWidgets } = usePluginWidgets('server-file-editor');

    const isMinecraftProperties = useMemo(() => fileName.trim().toLowerCase() === 'server.properties', [fileName]);

    const looksLikeMinecraftProperties = useMemo(() => {
        if (!content) return false;
        const signatureKeys = ['motd=', 'gamemode=', 'difficulty=', 'level-name=', 'online-mode='];
        return signatureKeys.every((signature) => content.includes(signature));
    }, [content]);

    const shouldOfferMinecraftEditor = useMemo(
        () => isMinecraftProperties && looksLikeMinecraftProperties,
        [isMinecraftProperties, looksLikeMinecraftProperties],
    );

    const isSpigotConfiguration = useMemo(() => fileName.trim().toLowerCase() === 'spigot.yml', [fileName]);

    const looksLikeSpigotConfiguration = useMemo(() => {
        if (!content) return false;
        const signatureKeys = ['settings:', 'messages:', 'world-settings:', 'commands:'];
        return signatureKeys.some((signature) => content.includes(signature));
    }, [content]);

    const shouldOfferSpigotEditor = useMemo(
        () => isSpigotConfiguration && looksLikeSpigotConfiguration,
        [isSpigotConfiguration, looksLikeSpigotConfiguration],
    );

    const isOpsFile = useMemo(() => fileName.trim().toLowerCase() === 'ops.json', [fileName]);
    const isBannedPlayersFile = useMemo(() => fileName.trim().toLowerCase() === 'banned-players.json', [fileName]);
    const isBannedIpsFile = useMemo(() => fileName.trim().toLowerCase() === 'banned-ips.json', [fileName]);
    const isWhitelistFile = useMemo(() => fileName.trim().toLowerCase() === 'whitelist.json', [fileName]);
    const isBukkitFile = useMemo(() => fileName.trim().toLowerCase() === 'bukkit.yml', [fileName]);
    const isCommandsFile = useMemo(() => fileName.trim().toLowerCase() === 'commands.yml', [fileName]);

    const ideOpenBlocked = useMemo(() => isBinaryLikeFileName(fileName), [fileName]);

    const looksLikeOpsFile = useMemo(() => {
        if (!isOpsFile || !content) return false;
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) && parsed.every((item) => item && typeof item === 'object' && 'uuid' in item);
        } catch {
            return false;
        }
    }, [isOpsFile, content]);

    const looksLikeBannedPlayersFile = useMemo(() => {
        if (!isBannedPlayersFile || !content) return false;
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) && parsed.every((item) => item && typeof item === 'object' && 'uuid' in item);
        } catch {
            return false;
        }
    }, [isBannedPlayersFile, content]);

    const looksLikeBannedIpsFile = useMemo(() => {
        if (!isBannedIpsFile || !content) return false;
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) && parsed.every((item) => item && typeof item === 'object' && 'ip' in item);
        } catch {
            return false;
        }
    }, [isBannedIpsFile, content]);

    const shouldOfferOpsEditor = useMemo(() => isOpsFile && looksLikeOpsFile, [isOpsFile, looksLikeOpsFile]);
    const shouldOfferBannedPlayersEditor = useMemo(
        () => isBannedPlayersFile && looksLikeBannedPlayersFile,
        [isBannedPlayersFile, looksLikeBannedPlayersFile],
    );
    const shouldOfferBannedIpsEditor = useMemo(
        () => isBannedIpsFile && looksLikeBannedIpsFile,
        [isBannedIpsFile, looksLikeBannedIpsFile],
    );

    const looksLikeWhitelistFile = useMemo(() => {
        if (!isWhitelistFile || !content) return false;
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string');
        } catch {
            return false;
        }
    }, [isWhitelistFile, content]);

    const shouldOfferWhitelistEditor = useMemo(
        () => isWhitelistFile && looksLikeWhitelistFile,
        [isWhitelistFile, looksLikeWhitelistFile],
    );

    const looksLikeBukkitFile = useMemo(() => {
        if (!isBukkitFile || !content) return false;
        const signatureKeys = ['settings:', 'spawn-limits:', 'chunk-gc:', 'ticks-per:'];
        return signatureKeys.some((signature) => content.includes(signature));
    }, [isBukkitFile, content]);

    const shouldOfferBukkitEditor = useMemo(
        () => isBukkitFile && looksLikeBukkitFile,
        [isBukkitFile, looksLikeBukkitFile],
    );

    const looksLikeCommandsFile = useMemo(() => {
        if (!isCommandsFile || !content) return false;
        const signatureKeys = ['command-block-overrides:', 'ignore-vanilla-permissions:', 'aliases:'];
        return signatureKeys.some((signature) => content.includes(signature));
    }, [isCommandsFile, content]);

    const shouldOfferCommandsEditor = useMemo(
        () => isCommandsFile && looksLikeCommandsFile,
        [isCommandsFile, looksLikeCommandsFile],
    );

    useEffect(() => {
        if (!loading && content && !useRawEditor) {
            if (shouldOfferMinecraftEditor) {
                setUseMinecraftEditor(true);
            } else if (shouldOfferSpigotEditor) {
                setUseSpigotEditor(true);
            } else if (shouldOfferOpsEditor) {
                setUseOpsEditor(true);
            } else if (shouldOfferBannedPlayersEditor) {
                setUseBannedPlayersEditor(true);
            } else if (shouldOfferBannedIpsEditor) {
                setUseBannedIpsEditor(true);
            } else if (shouldOfferWhitelistEditor) {
                setUseWhitelistEditor(true);
            } else if (shouldOfferBukkitEditor) {
                setUseBukkitEditor(true);
            } else if (shouldOfferCommandsEditor) {
                setUseCommandsEditor(true);
            }
        }
    }, [
        loading,
        content,
        shouldOfferMinecraftEditor,
        shouldOfferSpigotEditor,
        shouldOfferOpsEditor,
        shouldOfferBannedPlayersEditor,
        shouldOfferBannedIpsEditor,
        shouldOfferWhitelistEditor,
        shouldOfferBukkitEditor,
        shouldOfferCommandsEditor,
        useRawEditor,
    ]);

    const fetchContent = useCallback(async () => {
        setLoading(true);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const data = await Promise.race([
                filesApi.getFileContent(uuidShort, fullPath),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 30000)),
            ]);

            clearTimeout(timeoutId);
            setContent(data);
            setOriginalContent(data);
        } catch (error) {
            console.error(error);
            if (error instanceof Error && error.message === 'Request timeout') {
                toast.error(t('files.editor.load_timeout'));
            } else {
                toast.error(t('files.editor.load_error'));
            }
        } finally {
            setLoading(false);
        }
    }, [uuidShort, fullPath, t]);

    useEffect(() => {
        if (uuidShort && fileName && directory) {
            fetchContent();
        }
    }, [uuidShort, fileName, directory, fetchContent]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

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
            } catch (error) {
                console.error(error);
                toast.error(t('files.editor.save_error'), { id: toastId });
            } finally {
                setSaving(false);
            }
        },
        [canEdit, content, uuidShort, fullPath, t],
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                // Only save if we can edit and there are changes
                if (canEdit && content !== originalContent && !saving) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canEdit, content, originalContent, saving, handleSave]);

    const handleSwitchToRawEditor = () => {
        setUseMinecraftEditor(false);
        setUseSpigotEditor(false);
        setUseOpsEditor(false);
        setUseBannedPlayersEditor(false);
        setUseBannedIpsEditor(false);
        setUseWhitelistEditor(false);
        setUseBukkitEditor(false);
        setUseCommandsEditor(false);
        setUseRawEditor(true);
    };

    const handleSwitchToVisualEditor = () => {
        setUseRawEditor(false);
        if (shouldOfferMinecraftEditor) {
            setUseMinecraftEditor(true);
        } else if (shouldOfferSpigotEditor) {
            setUseSpigotEditor(true);
        } else if (shouldOfferOpsEditor) {
            setUseOpsEditor(true);
        } else if (shouldOfferBannedPlayersEditor) {
            setUseBannedPlayersEditor(true);
        } else if (shouldOfferBannedIpsEditor) {
            setUseBannedIpsEditor(true);
        } else if (shouldOfferWhitelistEditor) {
            setUseWhitelistEditor(true);
        } else if (shouldOfferBukkitEditor) {
            setUseBukkitEditor(true);
        } else if (shouldOfferCommandsEditor) {
            setUseCommandsEditor(true);
        }
    };

    const handleEditorMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const getLanguage = (name: string) => {
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
    };

    if (loading) {
        return (
            <div className='relative flex min-h-screen flex-col gap-6 overflow-hidden pb-20'>
                <div className='animate-pulse'>
                    <div className='mb-2 h-8 w-48 rounded-lg bg-white/5' />
                    <div className='h-4 w-96 rounded-lg bg-white/5' />
                </div>

                <div className='border-border/50 bg-card/50 relative flex min-h-[600px] flex-1 items-center justify-center overflow-hidden rounded-4xl border p-1 backdrop-blur-3xl'>
                    <div className='from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-30' />
                    <div className='relative z-10 flex flex-col items-center gap-6'>
                        <div className='relative'>
                            <div className='bg-primary/10 border-primary/20 flex h-20 w-20 animate-pulse items-center justify-center rounded-3xl border'>
                                <Loader2 className='text-primary h-10 w-10 animate-spin' />
                            </div>
                            <div className='bg-primary/5 absolute -top-4 -right-4 h-12 w-12 animate-pulse rounded-full blur-xl' />
                            <div className='bg-primary/5 absolute -bottom-4 -left-4 h-12 w-12 animate-pulse rounded-full blur-xl delay-700' />
                        </div>
                        <div className='space-y-2 text-center'>
                            <h3 className='text-foreground text-lg font-bold tracking-tight'>
                                {t('files.editor.loading_title')}
                            </h3>
                            <p className='text-muted-foreground animate-pulse text-xs font-medium tracking-[0.3em] uppercase'>
                                {t('files.editor.loading_description')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='relative flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4'>
            <WidgetRenderer widgets={getWidgets('server-file-editor', 'top-of-page')} />
            <PageHeader
                title={t('files.editor.title', { file: fileName })}
                description={t('files.editor.description', { path: fullPath })}
            />
            <WidgetRenderer widgets={getWidgets('server-file-editor', 'after-header')} />

            {!loading && content && useMinecraftEditor && shouldOfferMinecraftEditor ? (
                <MinecraftServerPropertiesEditor
                    content={content}
                    readonly={!canEdit}
                    saving={saving}
                    onSave={handleSave}
                    onSwitchToRaw={handleSwitchToRawEditor}
                />
            ) : !loading && content && useSpigotEditor && shouldOfferSpigotEditor ? (
                <SpigotConfigurationEditor
                    content={content}
                    readonly={!canEdit}
                    saving={saving}
                    onSave={handleSave}
                    onSwitchToRaw={handleSwitchToRawEditor}
                />
            ) : !loading && content && useOpsEditor && shouldOfferOpsEditor ? (
                <OpsEditor
                    content={content}
                    readonly={!canEdit}
                    saving={saving}
                    onSave={handleSave}
                    onSwitchToRaw={handleSwitchToRawEditor}
                />
            ) : !loading && content && useBannedPlayersEditor && shouldOfferBannedPlayersEditor ? (
                <BannedPlayersEditor
                    content={content}
                    readonly={!canEdit}
                    saving={saving}
                    onSave={handleSave}
                    onSwitchToRaw={handleSwitchToRawEditor}
                />
            ) : !loading && content && useBannedIpsEditor && shouldOfferBannedIpsEditor ? (
                <BannedIpsEditor
                    content={content}
                    readonly={!canEdit}
                    saving={saving}
                    onSave={handleSave}
                    onSwitchToRaw={handleSwitchToRawEditor}
                />
            ) : !loading && content && useWhitelistEditor && shouldOfferWhitelistEditor ? (
                <WhitelistEditor
                    content={content}
                    readonly={!canEdit}
                    saving={saving}
                    onSave={handleSave}
                    onSwitchToRaw={handleSwitchToRawEditor}
                />
            ) : !loading && content && useBukkitEditor && shouldOfferBukkitEditor ? (
                <BukkitConfigurationEditor
                    content={content}
                    readonly={!canEdit}
                    saving={saving}
                    onSave={handleSave}
                    onSwitchToRaw={handleSwitchToRawEditor}
                />
            ) : !loading && content && useCommandsEditor && shouldOfferCommandsEditor ? (
                <CommandsEditor
                    content={content}
                    readonly={!canEdit}
                    saving={saving}
                    onSave={handleSave}
                    onSwitchToRaw={handleSwitchToRawEditor}
                />
            ) : (
                <div className='border-border/50 bg-card/50 group hover:border-border/80 relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-4xl border p-1 backdrop-blur-3xl transition-all'>
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
                                    Monaco Editor Engine v0.34.1
                                </span>
                            </div>
                        </div>
                        <div className='flex items-center gap-3'>
                            {shouldOfferMinecraftEditor && useRawEditor && (
                                <Button
                                    size='sm'
                                    className='gap-2'
                                    variant='outline'
                                    onClick={handleSwitchToVisualEditor}
                                >
                                    <CheckCircle2 className='h-4 w-4' />
                                    {t('files.editors.minecraftProperties.prompt.useGui')}
                                </Button>
                            )}
                            {!canEdit && (
                                <div className='flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-xs font-bold tracking-wider text-yellow-600 uppercase dark:text-yellow-400'>
                                    <Lock className='h-3 w-3' />
                                    {t('files.editor.read_only')}
                                </div>
                            )}
                            {!ideOpenBlocked && (
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => {
                                        const idePath = `/server/${uuidShort}/files/ide?file=${encodeURIComponent(
                                            fileName,
                                        )}&directory=${encodeURIComponent(directory || '/')}`;
                                        window.open(idePath, '_blank', 'noopener');
                                    }}
                                >
                                    <Boxes className='mr-2 size-6 h-4 w-4 rounded-full' />
                                    {t('files.editor.open_in_ide')}
                                </Button>
                            )}
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => router.back()}
                                className='text-muted-foreground hover:text-foreground'
                            >
                                {t('files.editor.cancel')}
                            </Button>
                            <Button
                                className='bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-95'
                                size='sm'
                                onClick={() => handleSave()}
                                disabled={saving || content === originalContent}
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
                    <div className='relative h-full min-h-0 w-full flex-1'>
                        <div className='absolute inset-0'>
                            <Editor
                                height='100%'
                                defaultLanguage={getLanguage(fileName)}
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
                        </div>
                    </div>
                </div>
            )}
            <WidgetRenderer widgets={getWidgets('server-file-editor', 'bottom-of-page')} />
        </div>
    );
}
