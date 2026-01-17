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
import { Save, Loader2, FileCode, Lock, CheckCircle2 } from 'lucide-react';
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
    const [useRawEditor, setUseRawEditor] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editorRef = useRef<any>(null);

    const { hasPermission } = useServerPermissions(uuidShort);
    const canEdit = hasPermission('file.update');

    // Plugin Widgets
    const { fetchWidgets, getWidgets } = usePluginWidgets('server-file-editor');

    // Detect if this is a Minecraft server.properties file
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

    // Detect if this is a Spigot spigot.yml file
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

    // Detect Ops, Banned Players, Banned IPs, and Whitelist files
    const isOpsFile = useMemo(() => fileName.trim().toLowerCase() === 'ops.json', [fileName]);
    const isBannedPlayersFile = useMemo(() => fileName.trim().toLowerCase() === 'banned-players.json', [fileName]);
    const isBannedIpsFile = useMemo(() => fileName.trim().toLowerCase() === 'banned-ips.json', [fileName]);
    const isWhitelistFile = useMemo(() => fileName.trim().toLowerCase() === 'whitelist.json', [fileName]);

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

    // Auto-enable visual editor when content is loaded and it's a supported file
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
        useRawEditor,
    ]);

    const fetchContent = useCallback(async () => {
        setLoading(true);
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

    const handleSave = async (newContent?: string) => {
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
    };

    const handleSwitchToRawEditor = () => {
        setUseMinecraftEditor(false);
        setUseSpigotEditor(false);
        setUseOpsEditor(false);
        setUseBannedPlayersEditor(false);
        setUseBannedIpsEditor(false);
        setUseWhitelistEditor(false);
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
            <div className='flex flex-col gap-6 relative min-h-screen pb-20 overflow-hidden'>
                <div className='animate-pulse'>
                    <div className='h-8 w-48 bg-white/5 rounded-lg mb-2' />
                    <div className='h-4 w-96 bg-white/5 rounded-lg' />
                </div>

                <div className='flex-1 rounded-4xl border border-border/50 bg-card/50 backdrop-blur-3xl p-1 flex items-center justify-center relative overflow-hidden min-h-[600px]'>
                    <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-30' />
                    <div className='flex flex-col items-center gap-6 relative z-10'>
                        <div className='relative'>
                            <div className='h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse'>
                                <Loader2 className='h-10 w-10 text-primary animate-spin' />
                            </div>
                            <div className='absolute -top-4 -right-4 h-12 w-12 rounded-full bg-primary/5 blur-xl animate-pulse' />
                            <div className='absolute -bottom-4 -left-4 h-12 w-12 rounded-full bg-primary/5 blur-xl animate-pulse delay-700' />
                        </div>
                        <div className='text-center space-y-2'>
                            <h3 className='text-lg font-bold tracking-tight text-foreground'>
                                {t('files.editor.loading_title')}
                            </h3>
                            <p className='text-xs text-muted-foreground uppercase tracking-[0.3em] font-medium animate-pulse'>
                                {t('files.editor.loading_description')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='flex flex-col gap-6 relative h-[calc(100vh-6rem)] pb-4'>
            <WidgetRenderer widgets={getWidgets('server-file-editor', 'top-of-page')} />
            <PageHeader
                title={t('files.editor.title', { file: fileName })}
                description={t('files.editor.description', { path: fullPath })}
            />
            <WidgetRenderer widgets={getWidgets('server-file-editor', 'after-header')} />

            {/* Visual Editors */}
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
            ) : (
                <div className='flex-1 rounded-4xl border border-border/50 bg-card/50 shadow-2xl backdrop-blur-3xl overflow-hidden p-1 flex flex-col group transition-all hover:border-border/80 relative min-h-0'>
                    <div className='flex items-center justify-between p-3 border-b border-border/10 bg-muted/30 shrink-0'>
                        <div className='flex items-center gap-3'>
                            <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/5'>
                                <FileCode className='h-5 w-5' />
                            </div>
                            <div className='flex flex-col'>
                                <span className='text-xs font-bold uppercase tracking-widest text-foreground/80'>
                                    {fileName}
                                </span>
                                <span className='text-[10px] text-muted-foreground font-medium uppercase tracking-tighter'>
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
                                <div className='bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-3 py-1 rounded-lg border border-yellow-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-2'>
                                    <Lock className='h-3 w-3' />
                                    {t('files.editor.read_only')}
                                </div>
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
                                className='bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 active:scale-95 transition-all'
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
                    <div className='flex-1 relative w-full h-full min-h-0'>
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
