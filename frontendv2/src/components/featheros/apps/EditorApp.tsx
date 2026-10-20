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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, type OnMount } from '@monaco-editor/react';
import dynamic from 'next/dynamic';
import {
    X,
    Save,
    SaveAll,
    Loader2,
    FolderOpen,
    Lock,
    AlertTriangle,
    FileCode2,
    Folder,
    RefreshCw,
    Search,
    WrapText,
    Map as MapIcon,
    ChevronRight,
    ArrowUp,
    ArrowLeft,
    Check,
    Server,
    SquareTerminal,
    PanelBottom,
    ChevronsDownUp,
    Maximize2,
    Minimize2,
    Settings2,
    Files,
    Replace,
    AlignLeft,
    CornerDownLeft,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { EditorTreeEntry } from './EditorTreeEntry';
import { EditorSettingsPane } from './EditorSettingsPane';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { filesApi } from '@/lib/files-api';
import { APP_MONO_FONT_STACK } from '@/lib/mono-font';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import { useFeatherOsEditorPrefs } from '../editorPrefs';
import { ServerPicker } from '../ServerPicker';
import { baseName, monacoLanguage, normalizeDir } from '../utils';
import type { FileObject } from '@/types/server';
import type { OsAppProps } from './index';

type SidePane = 'explorer' | 'search' | 'settings';

interface EditorTab {
    serverUuid: string;
    path: string;
}
interface TabState {
    loading: boolean;
    error: string | null;
    original: string;
    current: string;
    saving: boolean;
}
const keyOf = (tab: EditorTab) => `${tab.serverUuid}:${tab.path}`;
const parentDir = (path: string) => normalizeDir(path.slice(0, path.lastIndexOf('/')) || '/');
const EmbeddedConsole = dynamic(() => import('./TerminalApp').then((module) => module.ConsoleSession), { ssr: false });

export default function EditorApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const {
        updateWindowProps,
        getServer,
        can,
        isDark,
        confirm,
        prompt,
        errorMessage,
        emitFilesChanged,
        onFilesChanged,
        settings,
    } = useFeatherOs();
    const tabs = useMemo(
        () =>
            (Array.isArray(win.props?.tabs) ? (win.props.tabs as EditorTab[]) : []).filter(
                (tab) => tab && typeof tab.serverUuid === 'string' && typeof tab.path === 'string',
            ),
        [win.props?.tabs],
    );
    const active = tabs.find((tab) => keyOf(tab) === win.props?.active) ?? tabs[0];
    const workspace = win.props?.workspace as Partial<EditorTab> | undefined;
    const workspaceServerUuid = typeof workspace?.serverUuid === 'string' ? workspace.serverUuid : active?.serverUuid;
    const workspaceDir =
        typeof workspace?.path === 'string' ? normalizeDir(workspace.path) : active ? parentDir(active.path) : '/';
    const { prefs, setPrefs, resetPrefs } = useFeatherOsEditorPrefs();
    const [state, setState] = useState<Record<string, TabState>>({});
    const stateRef = useRef(state);
    stateRef.current = state;
    const [cursor, setCursor] = useState({ line: 1, col: 1 });
    const [selectionChars, setSelectionChars] = useState(0);
    const [picking, setPicking] = useState<'file' | 'folder' | null>(null);
    const [sidePane, setSidePane] = useState<SidePane>('explorer');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [filter, setFilter] = useState('');
    const [collapseRevision, setCollapseRevision] = useState(0);
    const [consoleOpen, setConsoleOpen] = useState(false);
    const [consoleUuid, setConsoleUuid] = useState<string | null>(null);
    const [consoleMaximized, setConsoleMaximized] = useState(false);
    const [consoleSize, setConsoleSize] = useState(40);
    const [autoSaveFlash, setAutoSaveFlash] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    const [workspaceFiles, setWorkspaceFiles] = useState<FileObject[]>([]);
    const [workspaceLoading, setWorkspaceLoading] = useState(false);
    const [workspaceError, setWorkspaceError] = useState<string | null>(null);
    const [refresh, setRefresh] = useState(0);
    const workspaceIdentity = useRef('');
    const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
    const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
    const cursorSubscription = useRef<{ dispose: () => void } | null>(null);
    const selectionSubscription = useRef<{ dispose: () => void } | null>(null);
    const requests = useRef(new globalThis.Map<string, symbol>());
    const saving = useRef(new Set<string>());
    const saveRef = useRef<(quiet?: boolean) => void>(() => {});
    const saveAllRef = useRef<() => void>(() => {});
    const formatRef = useRef<() => void>(() => {});
    const goToLineRef = useRef<() => void>(() => {});
    const prefsRef = useRef(prefs);
    prefsRef.current = prefs;
    const modelPrefix = `fos://${encodeURIComponent(win.id)}/`;

    const selectSidePane = (pane: SidePane) => {
        if (sidebarOpen && sidePane === pane) {
            setSidebarOpen(false);
            return;
        }
        setSidePane(pane);
        setSidebarOpen(true);
    };

    useEffect(() => {
        let cancelled = false;
        const identity = `${workspaceServerUuid}:${workspaceDir}`;
        if (workspaceIdentity.current !== identity) setWorkspaceFiles([]);
        workspaceIdentity.current = identity;
        setWorkspaceError(null);
        if (!workspaceServerUuid) return;
        setWorkspaceLoading(true);
        filesApi
            .getFiles(workspaceServerUuid, workspaceDir)
            .then((result) => {
                if (!cancelled)
                    setWorkspaceFiles(
                        result.contents
                            .filter((file) => !file.isTrashShortcut)
                            .sort(
                                (a, b) =>
                                    Number(a.isFile) - Number(b.isFile) ||
                                    a.name.localeCompare(b.name, undefined, { numeric: true }),
                            ),
                    );
            })
            .catch((error) => {
                if (!cancelled) setWorkspaceError(errorMessage(error));
            })
            .finally(() => {
                if (!cancelled) setWorkspaceLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [workspaceServerUuid, workspaceDir, refresh, errorMessage]);

    useEffect(
        () =>
            onFilesChanged((serverUuid) => {
                if (serverUuid === workspaceServerUuid) setRefresh((n) => n + 1);
            }),
        [onFilesChanged, workspaceServerUuid, workspaceDir],
    );

    const loadTab = useCallback(
        (tab: EditorTab) => {
            const key = keyOf(tab);
            const request = Symbol(key);
            requests.current.set(key, request);
            setState((s) => ({
                ...s,
                [key]: { loading: true, error: null, original: '', current: '', saving: false },
            }));
            filesApi
                .getFileContent(tab.serverUuid, tab.path)
                .then((content) => {
                    if (requests.current.get(key) !== request) return;
                    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
                    setState((s) => ({
                        ...s,
                        [key]: { loading: false, error: null, original: text, current: text, saving: false },
                    }));
                })
                .catch((error) => {
                    if (requests.current.get(key) !== request) return;
                    setState((s) => ({
                        ...s,
                        [key]: { loading: false, error: errorMessage(error), original: '', current: '', saving: false },
                    }));
                });
        },
        [errorMessage],
    );

    useEffect(() => {
        tabs.forEach((tab) => {
            if (!requests.current.has(keyOf(tab))) loadTab(tab);
        });
    }, [tabs, loadTab]);

    useEffect(
        () => () => {
            cursorSubscription.current?.dispose();
            selectionSubscription.current?.dispose();
            monacoRef.current?.editor
                .getModels()
                .forEach((model: { uri: { toString: () => string }; dispose: () => void }) => {
                    if (model.uri.toString().startsWith(modelPrefix)) model.dispose();
                });
        },
        [modelPrefix],
    );

    const dirtyCount = tabs.filter((tab) => {
        const s = state[keyOf(tab)];
        return s && s.current !== s.original;
    }).length;
    const activeName = active ? baseName(active.path) : '';
    useEffect(() => {
        updateWindowProps(win.id, { title: activeName ? `${dirtyCount ? '● ' : ''}${activeName}` : '' });
    }, [activeName, dirtyCount, win.id, updateWindowProps]);
    useEffect(() => {
        if (!dirtyCount) return;
        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirtyCount]);

    const saveTab = useCallback(
        async (tab: EditorTab, opts?: { quiet?: boolean }) => {
            const key = keyOf(tab);
            let s = stateRef.current[key];
            if (!s || s.loading || s.error || saving.current.has(key) || s.current === s.original) return false;
            if (!can(tab.serverUuid, 'file.update')) {
                if (!opts?.quiet) toast.error(t('featheros.errors.no_permission'));
                return false;
            }

            if (prefsRef.current.formatOnSave && editorRef.current && active && keyOf(active) === key) {
                try {
                    await editorRef.current.getAction('editor.action.formatDocument')?.run();
                    const formatted = editorRef.current.getValue();
                    setState((cur) => (cur[key] ? { ...cur, [key]: { ...cur[key], current: formatted } } : cur));
                    s = { ...s, current: formatted };
                    stateRef.current = { ...stateRef.current, [key]: { ...s, current: formatted } };
                } catch {
                    // Format is best-effort; continue with unformatted content.
                }
            }

            saving.current.add(key);
            setState((cur) => ({ ...cur, [key]: { ...cur[key], saving: true } }));
            try {
                await filesApi.saveFileContent(tab.serverUuid, tab.path, s.current);
                setState((cur) =>
                    cur[key] ? { ...cur, [key]: { ...cur[key], saving: false, original: s.current } } : cur,
                );
                emitFilesChanged(tab.serverUuid, parentDir(tab.path));
                if (opts?.quiet) {
                    setAutoSaveFlash(true);
                    window.setTimeout(() => setAutoSaveFlash(false), 1600);
                }
                return true;
            } catch (error) {
                setState((cur) => (cur[key] ? { ...cur, [key]: { ...cur[key], saving: false } } : cur));
                toast.error(errorMessage(error));
                return false;
            } finally {
                saving.current.delete(key);
            }
        },
        [active, can, t, errorMessage, emitFilesChanged],
    );
    const save = async (quiet = false) => {
        if (!active) return;
        if (await saveTab(active, { quiet })) {
            if (!quiet) toast.success(t('featheros.editor.saved', { name: baseName(active.path) }));
        }
    };
    const saveAll = async () => {
        let count = 0;
        for (const tab of tabs) if (await saveTab(tab)) count++;
        if (count) toast.success(t('featheros.editor.saved_all', { count: String(count) }));
    };
    const formatDocument = () => {
        editorRef.current?.focus();
        void editorRef.current?.getAction('editor.action.formatDocument')?.run();
    };
    const goToLine = async () => {
        const value = await prompt({
            title: t('featheros.editor.go_to_line'),
            defaultValue: String(cursor.line),
            placeholder: '1',
        });
        if (!value?.trim() || !editorRef.current) return;
        const line = Math.max(1, Number.parseInt(value.trim(), 10) || 1);
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
        editorRef.current.focus();
    };
    saveRef.current = (quiet) => void save(Boolean(quiet));
    saveAllRef.current = () => void saveAll();
    formatRef.current = () => formatDocument();
    goToLineRef.current = () => void goToLine();

    const closeTab = async (tab: EditorTab) => {
        const key = keyOf(tab);
        const s = stateRef.current[key];
        if (saving.current.has(key)) return;
        if (
            s &&
            s.current !== s.original &&
            !(await confirm({
                title: t('featheros.editor.unsaved_title', { name: baseName(tab.path) }),
                message: t('featheros.editor.unsaved_message'),
                confirmLabel: t('featheros.editor.discard'),
                danger: true,
            }))
        )
            return;
        requests.current.delete(key);
        const next = tabs.filter((item) => keyOf(item) !== key);
        const replacement = next[Math.min(tabs.indexOf(tab), next.length - 1)];
        updateWindowProps(win.id, {
            tabs: next,
            active: active && keyOf(active) !== key ? keyOf(active) : replacement ? keyOf(replacement) : '',
        });
        setState((cur) => {
            const copy = { ...cur };
            delete copy[key];
            return copy;
        });
    };

    const openTab = (tab: EditorTab) => {
        updateWindowProps(win.id, {
            tabs: tabs.some((item) => keyOf(item) === keyOf(tab)) ? tabs : [...tabs, tab],
            active: keyOf(tab),
            ...(!workspace?.serverUuid
                ? { workspace: { serverUuid: workspaceServerUuid ?? tab.serverUuid, path: workspaceDir } }
                : {}),
        });
    };
    const choosePath = async (serverUuid: string) => {
        const folder = picking === 'folder';
        setPicking(null);
        const path = await prompt({
            title: t(folder ? 'featheros.editor.open_folder' : 'featheros.editor.open_path'),
            defaultValue: '/',
            placeholder: folder ? '/config' : '/server.properties',
        });
        if (!path?.trim()) return;
        const target = { serverUuid, path: normalizeDir(path.trim()) };
        if (folder) {
            updateWindowProps(win.id, { workspace: target });
            setSidePane('explorer');
            setSidebarOpen(true);
            setFilter('');
        } else openTab(target);
    };
    const navigate = (path: string) => {
        updateWindowProps(win.id, { workspace: { serverUuid: workspaceServerUuid, path: normalizeDir(path) } });
        setFilter('');
    };
    const onMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () =>
            saveAllRef.current(),
        );
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI, () =>
            formatRef.current(),
        );
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => goToLineRef.current());
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
            setPrefs({ fontSize: Math.min(22, prefsRef.current.fontSize + 1) });
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
            setPrefs({ fontSize: Math.max(11, prefsRef.current.fontSize - 1) });
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0, () => {
            setPrefs({ fontSize: 13 });
        });
        cursorSubscription.current?.dispose();
        selectionSubscription.current?.dispose();
        const updateCursor = () => {
            const position = editor.getPosition();
            if (position) setCursor({ line: position.lineNumber, col: position.column });
        };
        const updateSelection = () => {
            const model = editor.getModel();
            const sel = editor.getSelection();
            if (!model || !sel) {
                setSelectionChars(0);
                return;
            }
            setSelectionChars(model.getValueLengthInRange(sel));
        };
        cursorSubscription.current = editor.onDidChangeCursorPosition(updateCursor);
        selectionSubscription.current = editor.onDidChangeCursorSelection(updateSelection);
        updateCursor();
        updateSelection();
    };
    const activeState = active ? state[keyOf(active)] : undefined;
    const readOnly = !active || !can(active.serverUuid, 'file.update');
    const visibleFiles = workspaceFiles.filter(
        (file) => !file.isFile || file.name.toLowerCase().includes(filter.toLowerCase()),
    );
    const ready = !!activeState && !activeState.loading && !activeState.error;
    const dirty = !!(activeState && activeState.current !== activeState.original);

    useEffect(() => {
        if (!prefs.autoSave || readOnly || !active || !dirty || !ready) return;
        const tab = active;
        const timer = window.setTimeout(() => {
            void saveTab(tab, { quiet: true });
        }, prefs.autoSaveDelayMs);
        return () => window.clearTimeout(timer);
    }, [
        prefs.autoSave,
        prefs.autoSaveDelayMs,
        readOnly,
        ready,
        dirty,
        active?.serverUuid,
        active?.path,
        activeState?.current,
        saveTab,
    ]);

    if (picking)
        return (
            <div className='fos-editor flex h-full flex-col'>
                <div className='fos-editor-toolbar'>
                    <button type='button' onClick={() => setPicking(null)}>
                        <ArrowLeft size={15} />
                        {t('featheros.files.back')}
                    </button>
                </div>
                <div className='min-h-0 flex-1'>
                    <ServerPicker
                        permission={picking === 'file' ? 'file.read-content' : 'file.read'}
                        onPick={(uuid) => void choosePath(uuid)}
                        title={t(
                            picking === 'file' ? 'featheros.editor.pick_server' : 'featheros.editor.pick_folder_server',
                        )}
                    />
                </div>
            </div>
        );

    return (
        <div className='fos-editor'>
            <div className='fos-editor-toolbar'>
                <button type='button' onClick={() => setPicking('file')} title={t('featheros.editor.open_file')}>
                    <FileCode2 size={15} />
                    <span>{t('featheros.editor.open_file')}</span>
                </button>
                <button type='button' onClick={() => setPicking('folder')} title={t('featheros.editor.open_folder')}>
                    <FolderOpen size={15} />
                    <span>{t('featheros.editor.open_folder')}</span>
                </button>
                <span className='fos-editor-toolbar-divider' />
                <button
                    type='button'
                    disabled={!ready}
                    aria-label={t('featheros.editor.find_in_file')}
                    title={t('featheros.editor.find_in_file')}
                    onClick={() => {
                        editorRef.current?.focus();
                        void editorRef.current?.getAction('actions.find')?.run();
                    }}
                >
                    <Search size={15} />
                </button>
                <button
                    type='button'
                    disabled={!ready || readOnly}
                    aria-label={t('featheros.editor.replace_in_file')}
                    title={t('featheros.editor.replace_in_file')}
                    onClick={() => {
                        editorRef.current?.focus();
                        void editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
                    }}
                >
                    <Replace size={15} />
                </button>
                <button
                    type='button'
                    disabled={!ready}
                    aria-label={t('featheros.editor.go_to_line')}
                    title={t('featheros.editor.go_to_line')}
                    onClick={() => void goToLine()}
                >
                    <CornerDownLeft size={15} />
                </button>
                <button
                    type='button'
                    disabled={!ready || readOnly}
                    aria-label={t('featheros.editor.format_document')}
                    title={t('featheros.editor.format_document')}
                    onClick={() => formatDocument()}
                >
                    <AlignLeft size={15} />
                </button>
                <div className='ml-auto flex items-center gap-1'>
                    <button
                        type='button'
                        disabled={!active?.serverUuid && !workspaceServerUuid && !consoleUuid}
                        aria-label={t('featheros.editor.toggle_console')}
                        title={t('featheros.editor.toggle_console')}
                        aria-pressed={consoleOpen}
                        onClick={() => {
                            if (!consoleUuid) setConsoleUuid(active?.serverUuid ?? workspaceServerUuid ?? null);
                            setConsoleOpen(!consoleOpen);
                        }}
                    >
                        <PanelBottom size={16} />
                    </button>
                    <button
                        type='button'
                        aria-label={t('featheros.editor.word_wrap')}
                        title={t('featheros.editor.word_wrap')}
                        aria-pressed={prefs.wordWrap}
                        onClick={() => setPrefs({ wordWrap: !prefs.wordWrap })}
                    >
                        <WrapText size={16} />
                    </button>
                    <button
                        type='button'
                        aria-label={t('featheros.editor.minimap')}
                        title={t('featheros.editor.minimap')}
                        aria-pressed={prefs.minimap}
                        onClick={() => setPrefs({ minimap: !prefs.minimap })}
                    >
                        <MapIcon size={15} />
                    </button>
                    <button
                        type='button'
                        aria-label={t('featheros.editor.zoom_out')}
                        title={t('featheros.editor.zoom_out')}
                        onClick={() => setPrefs({ fontSize: Math.max(11, prefs.fontSize - 1) })}
                    >
                        <ZoomOut size={15} />
                    </button>
                    <button
                        type='button'
                        aria-label={t('featheros.editor.zoom_in')}
                        title={t('featheros.editor.zoom_in')}
                        onClick={() => setPrefs({ fontSize: Math.min(22, prefs.fontSize + 1) })}
                    >
                        <ZoomIn size={15} />
                    </button>
                    <span className='fos-editor-toolbar-divider' />
                    <button
                        type='button'
                        disabled={!dirtyCount || tabs.some((tab) => state[keyOf(tab)]?.saving)}
                        onClick={() => void saveAll()}
                        aria-label={t('featheros.editor.save_all')}
                        title={t('featheros.editor.save_all')}
                    >
                        <SaveAll size={15} />
                    </button>
                    <button
                        type='button'
                        className='fos-editor-save'
                        disabled={readOnly || !ready || !dirty || activeState?.saving}
                        onClick={() => void save()}
                    >
                        {activeState?.saving ? <Loader2 size={14} className='animate-spin' /> : <Save size={14} />}
                        <span>{t('featheros.editor.save')}</span>
                    </button>
                </div>
            </div>
            <div className='fos-editor-workspace'>
                <nav className='fos-editor-activity' aria-label={t('featheros.editor.activity_bar')}>
                    <button
                        type='button'
                        aria-label={t('featheros.editor.explorer')}
                        title={t('featheros.editor.explorer')}
                        aria-pressed={sidebarOpen && sidePane === 'explorer'}
                        onClick={() => selectSidePane('explorer')}
                    >
                        <Files size={18} />
                    </button>
                    <button
                        type='button'
                        aria-label={t('featheros.editor.search')}
                        title={t('featheros.editor.search')}
                        aria-pressed={sidebarOpen && sidePane === 'search'}
                        onClick={() => selectSidePane('search')}
                    >
                        <Search size={18} />
                    </button>
                    <button
                        type='button'
                        className='mt-auto'
                        aria-label={t('featheros.editor.settings')}
                        title={t('featheros.editor.settings')}
                        aria-pressed={sidebarOpen && sidePane === 'settings'}
                        onClick={() => selectSidePane('settings')}
                    >
                        <Settings2 size={18} />
                    </button>
                </nav>
                {sidebarOpen && (
                    <aside className='fos-editor-sidebar'>
                        {sidePane === 'settings' ? (
                            <EditorSettingsPane prefs={prefs} setPrefs={setPrefs} resetPrefs={resetPrefs} />
                        ) : sidePane === 'search' ? (
                            <div className='fos-editor-search-pane'>
                                <div className='fos-editor-sidebar-heading'>
                                    <span>{t('featheros.editor.search')}</span>
                                </div>
                                <p className='fos-editor-sidebar-message'>{t('featheros.editor.search_pane_hint')}</p>
                                <div className='fos-editor-search-actions'>
                                    <button
                                        type='button'
                                        disabled={!ready}
                                        onClick={() => {
                                            editorRef.current?.focus();
                                            void editorRef.current?.getAction('actions.find')?.run();
                                        }}
                                    >
                                        <Search size={15} />
                                        {t('featheros.editor.find_in_file')}
                                    </button>
                                    <button
                                        type='button'
                                        disabled={!ready || readOnly}
                                        onClick={() => {
                                            editorRef.current?.focus();
                                            void editorRef.current
                                                ?.getAction('editor.action.startFindReplaceAction')
                                                ?.run();
                                        }}
                                    >
                                        <Replace size={15} />
                                        {t('featheros.editor.replace_in_file')}
                                    </button>
                                    <button type='button' disabled={!ready} onClick={() => void goToLine()}>
                                        <CornerDownLeft size={15} />
                                        {t('featheros.editor.go_to_line')}
                                    </button>
                                </div>
                                <div className='fos-editor-shortcuts'>
                                    <span>{t('featheros.editor.shortcut_find')}</span>
                                    <span>{t('featheros.editor.shortcut_replace')}</span>
                                    <span>{t('featheros.editor.shortcut_goto')}</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className='fos-editor-sidebar-heading'>
                                    <span>{t('featheros.editor.explorer')}</span>
                                    <button
                                        type='button'
                                        aria-label={t('featheros.editor.collapse_folders')}
                                        title={t('featheros.editor.collapse_folders')}
                                        onClick={() => setCollapseRevision((n) => n + 1)}
                                    >
                                        <ChevronsDownUp size={14} />
                                    </button>
                                    <button
                                        type='button'
                                        disabled={!workspaceServerUuid || workspaceLoading}
                                        onClick={() => setRefresh((n) => n + 1)}
                                        aria-label={t('featheros.editor.refresh_files')}
                                    >
                                        <RefreshCw size={14} className={cn(workspaceLoading && 'animate-spin')} />
                                    </button>
                                </div>
                                {workspaceServerUuid ? (
                                    <>
                                        <div className='fos-editor-location'>
                                            <Server size={13} />
                                            <span>{getServer(workspaceServerUuid)?.name ?? workspaceServerUuid}</span>
                                        </div>
                                        <div className='fos-editor-folder-heading'>
                                            <FolderOpen size={14} />
                                            <span title={workspaceDir}>{workspaceDir}</span>
                                            <button
                                                type='button'
                                                disabled={workspaceDir === '/'}
                                                onClick={() => navigate(parentDir(workspaceDir))}
                                                aria-label={t('featheros.editor.parent_folder')}
                                            >
                                                <ArrowUp size={14} />
                                            </button>
                                        </div>
                                        <label className='fos-editor-filter'>
                                            <Search size={13} />
                                            <input
                                                value={filter}
                                                onChange={(e) => setFilter(e.target.value)}
                                                placeholder={t('featheros.editor.filter_files')}
                                                aria-label={t('featheros.editor.filter_files')}
                                            />
                                        </label>
                                        <div
                                            className='fos-scroll min-h-0 flex-1 overflow-auto'
                                            aria-busy={workspaceLoading}
                                        >
                                            {workspaceLoading && workspaceFiles.length === 0 ? (
                                                <div className='fos-editor-sidebar-message'>
                                                    <Loader2 size={16} className='animate-spin' />
                                                    <span>{t('common.loading')}</span>
                                                </div>
                                            ) : workspaceError ? (
                                                <div className='fos-editor-sidebar-message' role='alert'>
                                                    <AlertTriangle size={16} />
                                                    <p>{workspaceError}</p>
                                                    <button type='button' onClick={() => setRefresh((n) => n + 1)}>
                                                        {t('featheros.editor.retry')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <ul
                                                    className='fos-editor-tree'
                                                    aria-label={t('featheros.editor.explorer')}
                                                    onKeyDown={(event) => {
                                                        if (
                                                            !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(
                                                                event.key,
                                                            )
                                                        )
                                                            return;
                                                        const rows = Array.from(
                                                            event.currentTarget.querySelectorAll<HTMLButtonElement>(
                                                                '.fos-editor-file',
                                                            ),
                                                        );
                                                        const index = rows.indexOf(event.target as HTMLButtonElement);
                                                        if (index < 0) return;
                                                        event.preventDefault();
                                                        const next =
                                                            event.key === 'Home'
                                                                ? 0
                                                                : event.key === 'End'
                                                                  ? rows.length - 1
                                                                  : index + (event.key === 'ArrowDown' ? 1 : -1);
                                                        rows[
                                                            Math.max(0, Math.min(rows.length - 1, next))
                                                        ]?.focus();
                                                    }}
                                                >
                                                    {visibleFiles.map((file) => (
                                                        <EditorTreeEntry
                                                            key={`${workspaceServerUuid}:${workspaceDir}/${file.name}`}
                                                            file={file}
                                                            path={`${workspaceDir === '/' ? '' : workspaceDir}/${file.name}`}
                                                            serverUuid={workspaceServerUuid}
                                                            activePath={
                                                                active?.serverUuid === workspaceServerUuid
                                                                    ? active.path
                                                                    : undefined
                                                            }
                                                            filter={filter}
                                                            revision={refresh}
                                                            collapseRevision={collapseRevision}
                                                            onOpen={(path) =>
                                                                openTab({ serverUuid: workspaceServerUuid, path })
                                                            }
                                                        />
                                                    ))}
                                                </ul>
                                            )}
                                            {!workspaceLoading && !workspaceError && visibleFiles.length === 0 && (
                                                <p className='fos-editor-sidebar-message'>
                                                    {t(
                                                        filter
                                                            ? 'featheros.files.no_match'
                                                            : 'featheros.editor.no_files',
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className='fos-editor-sidebar-message'>
                                        <p>{t('featheros.editor.welcome_explorer')}</p>
                                        <button type='button' onClick={() => setPicking('folder')}>
                                            <FolderOpen size={15} />
                                            {t('featheros.editor.open_folder')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </aside>
                )}
                <main ref={mainRef} className='fos-editor-main'>
                    <div className='fos-editor-document' data-hidden={consoleOpen && consoleMaximized}>
                        {tabs.length > 0 ? (
                            <>
                                <div
                                    className='fos-editor-tabs fos-scroll'
                                    aria-label={t('featheros.editor.open_files')}
                                >
                                    {tabs.map((tab) => {
                                        const key = keyOf(tab),
                                            s = state[key];
                                        const selected = !!active && keyOf(active) === key;
                                        const modified = s && s.current !== s.original;
                                        return (
                                            <div
                                                key={key}
                                                className={cn('fos-editor-tab', selected && 'is-active')}
                                                onAuxClick={(e) => {
                                                    if (e.button === 1) {
                                                        e.preventDefault();
                                                        void closeTab(tab);
                                                    }
                                                }}
                                            >
                                                <button
                                                    type='button'
                                                    className='fos-editor-tab-select'
                                                    aria-pressed={selected}
                                                    title={`${getServer(tab.serverUuid)?.name ?? tab.serverUuid}: ${tab.path}`}
                                                    onClick={() => updateWindowProps(win.id, { active: key })}
                                                >
                                                    <FileCode2 size={14} />
                                                    <span>{baseName(tab.path)}</span>
                                                    {modified && (
                                                        <span
                                                            className='fos-editor-dirty'
                                                            aria-label={t('featheros.editor.unsaved')}
                                                        />
                                                    )}
                                                </button>
                                                <button
                                                    type='button'
                                                    className='fos-editor-tab-close'
                                                    disabled={s?.saving}
                                                    aria-label={t('featheros.editor.close_file', {
                                                        name: baseName(tab.path),
                                                    })}
                                                    onClick={() => void closeTab(tab)}
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className='fos-editor-breadcrumb' title={active?.path}>
                                    <Folder size={12} />
                                    <span>{active ? parentDir(active.path) : '/'}</span>
                                    <ChevronRight size={12} />
                                    <strong>{activeName}</strong>
                                    {readOnly && <Lock size={12} aria-label={t('featheros.editor.read_only')} />}
                                </div>
                                <div className='fos-editor-code'>
                                    {!activeState || activeState.loading ? (
                                        <div className='fos-editor-message' role='status'>
                                            <Loader2 size={23} className='animate-spin' />
                                            {t('common.loading')}
                                        </div>
                                    ) : activeState.error ? (
                                        <div className='fos-editor-message' role='alert'>
                                            <AlertTriangle size={26} />
                                            <p>{activeState.error}</p>
                                            <button type='button' onClick={() => active && loadTab(active)}>
                                                {t('featheros.editor.retry')}
                                            </button>
                                        </div>
                                    ) : (
                                        active && (
                                            <Editor
                                                path={`${modelPrefix}${active.serverUuid}${active.path}`}
                                                value={activeState.current}
                                                language={monacoLanguage(activeName)}
                                                theme={isDark ? 'vs-dark' : 'light'}
                                                onMount={onMount}
                                                loading={
                                                    <div className='fos-editor-message'>
                                                        <Loader2 size={22} className='animate-spin' />
                                                        {t('common.loading')}
                                                    </div>
                                                }
                                                onChange={(value) => {
                                                    const key = keyOf(active);
                                                    setState((cur) =>
                                                        cur[key]
                                                            ? { ...cur, [key]: { ...cur[key], current: value ?? '' } }
                                                            : cur,
                                                    );
                                                }}
                                                options={{
                                                    readOnly,
                                                    automaticLayout: true,
                                                    fontFamily: APP_MONO_FONT_STACK,
                                                    fontSize: prefs.fontSize,
                                                    fontLigatures: prefs.fontLigatures,
                                                    lineHeight: Math.round(prefs.fontSize * 1.65),
                                                    minimap: {
                                                        enabled: prefs.minimap,
                                                        renderCharacters: false,
                                                        size: 'proportional',
                                                    },
                                                    wordWrap: prefs.wordWrap ? 'on' : 'off',
                                                    lineNumbers: prefs.lineNumbers ? 'on' : 'off',
                                                    smoothScrolling: !settings.reduceMotion,
                                                    cursorSmoothCaretAnimation:
                                                        settings.reduceMotion || !prefs.smoothCaret ? 'off' : 'on',
                                                    cursorStyle: prefs.cursorStyle,
                                                    scrollBeyondLastLine: false,
                                                    renderWhitespace: prefs.renderWhitespace,
                                                    tabSize: prefs.tabSize,
                                                    insertSpaces: prefs.insertSpaces,
                                                    detectIndentation: false,
                                                    padding: { top: 12, bottom: 12 },
                                                    lineNumbersMinChars: 3,
                                                    glyphMargin: false,
                                                    folding: true,
                                                    bracketPairColorization: {
                                                        enabled: prefs.bracketPairColorization,
                                                    },
                                                    guides: {
                                                        bracketPairs: prefs.bracketPairColorization,
                                                        indentation: true,
                                                    },
                                                    stickyScroll: { enabled: prefs.stickyScroll },
                                                    rulers: prefs.rulers ? [80, 120] : [],
                                                    renderLineHighlight: 'all',
                                                    matchBrackets: 'always',
                                                    overviewRulerBorder: false,
                                                    hideCursorInOverviewRuler: true,
                                                    scrollbar: {
                                                        verticalScrollbarSize: 10,
                                                        horizontalScrollbarSize: 10,
                                                    },
                                                }}
                                            />
                                        )
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className='fos-editor-welcome'>
                                <FileCode2 className='fos-editor-welcome-icon' size={46} strokeWidth={1.3} />
                                <h1>{t('featheros.editor.welcome_title')}</h1>
                                <p>{t('featheros.editor.welcome_description')}</p>
                                <div className='fos-editor-welcome-actions'>
                                    <button type='button' onClick={() => setPicking('file')}>
                                        <FileCode2 size={18} />
                                        <span>{t('featheros.editor.open_file')}</span>
                                        <ChevronRight size={15} />
                                    </button>
                                    <button type='button' onClick={() => setPicking('folder')}>
                                        <FolderOpen size={18} />
                                        <span>{t('featheros.editor.open_folder')}</span>
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                                <div className='fos-editor-shortcuts'>
                                    <span>{t('featheros.editor.shortcut_save')}</span>
                                    <span>{t('featheros.editor.shortcut_format')}</span>
                                    <span>{t('featheros.editor.shortcut_goto')}</span>
                                    <span>{t('featheros.editor.multi_file_hint')}</span>
                                    {prefs.autoSave && <span>{t('featheros.editor.auto_save_welcome')}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                    {consoleUuid && (
                        <section
                            className='fos-editor-console'
                            aria-label={t('featheros.editor.console')}
                            hidden={!consoleOpen}
                            style={{ height: consoleMaximized ? '100%' : `${consoleSize}%` }}
                        >
                            {!consoleMaximized && (
                                <div
                                    className='fos-editor-console-resize'
                                    role='separator'
                                    tabIndex={0}
                                    aria-orientation='horizontal'
                                    aria-label={t('featheros.editor.resize_console')}
                                    aria-valuemin={20}
                                    aria-valuemax={75}
                                    aria-valuenow={consoleSize}
                                    onKeyDown={(event) => {
                                        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                                            event.preventDefault();
                                            setConsoleSize((size) =>
                                                Math.max(20, Math.min(75, size + (event.key === 'ArrowUp' ? 5 : -5))),
                                            );
                                        }
                                    }}
                                    onPointerDown={(event) => {
                                        event.preventDefault();
                                        event.currentTarget.setPointerCapture(event.pointerId);
                                    }}
                                    onPointerMove={(event) => {
                                        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                                        const rect = mainRef.current?.getBoundingClientRect();
                                        if (rect)
                                            setConsoleSize(
                                                Math.round(
                                                    Math.max(
                                                        20,
                                                        Math.min(
                                                            75,
                                                            ((rect.bottom - event.clientY) / rect.height) * 100,
                                                        ),
                                                    ),
                                                ),
                                            );
                                    }}
                                    onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
                                />
                            )}
                            <div className='fos-editor-console-heading'>
                                <SquareTerminal size={14} />
                                <strong>{t('featheros.editor.console')}</strong>
                                <span
                                    className='fos-console-target'
                                    title={getServer(consoleUuid)?.name ?? consoleUuid}
                                >
                                    {getServer(consoleUuid)?.name ?? consoleUuid}
                                </span>
                                <button
                                    type='button'
                                    disabled={!active?.serverUuid || active.serverUuid === consoleUuid}
                                    onClick={() => active && setConsoleUuid(active.serverUuid)}
                                    title={t('featheros.editor.console_use_active')}
                                    aria-label={t('featheros.editor.console_use_active')}
                                >
                                    <Server size={14} />
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setConsoleMaximized(!consoleMaximized)}
                                    aria-label={t(
                                        consoleMaximized
                                            ? 'featheros.editor.restore_console'
                                            : 'featheros.editor.maximize_console',
                                    )}
                                >
                                    {consoleMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setConsoleOpen(false)}
                                    aria-label={t('featheros.editor.hide_console')}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className='fos-editor-console-body'>
                                <EmbeddedConsole key={consoleUuid} uuid={consoleUuid} active={consoleOpen} embedded />
                            </div>
                        </section>
                    )}
                </main>
            </div>
            <footer className='fos-editor-status'>
                <span className='fos-editor-save-state'>
                    {readOnly && active ? (
                        <>
                            <Lock size={12} />
                            {t('featheros.editor.read_only')}
                        </>
                    ) : activeState?.saving ? (
                        <>
                            <Loader2 size={12} className='animate-spin' />
                            {prefs.autoSave ? t('featheros.editor.auto_saving') : t('featheros.editor.saving')}
                        </>
                    ) : autoSaveFlash ? (
                        <>
                            <Check size={13} />
                            {t('featheros.editor.auto_saved')}
                        </>
                    ) : dirty ? (
                        <>
                            <span className='fos-editor-dirty' />
                            {prefs.autoSave ? t('featheros.editor.pending_auto_save') : t('featheros.editor.unsaved')}
                        </>
                    ) : ready ? (
                        <>
                            <Check size={13} />
                            {t('featheros.editor.up_to_date')}
                        </>
                    ) : (
                        <FileCode2 size={13} />
                    )}
                </span>
                {prefs.autoSave && (
                    <button
                        type='button'
                        className='fos-editor-status-action'
                        onClick={() => selectSidePane('settings')}
                        title={t('featheros.editor.auto_save')}
                    >
                        {t('featheros.editor.auto_save_badge')}
                    </button>
                )}
                {active && (
                    <>
                        <span className='ml-auto whitespace-nowrap tabular-nums'>
                            {t('featheros.editor.position', { line: String(cursor.line), col: String(cursor.col) })}
                            {selectionChars > 0
                                ? ` (${t('featheros.editor.selection_chars', { count: String(selectionChars) })})`
                                : ''}
                        </span>
                        <button
                            type='button'
                            className='fos-editor-status-action'
                            title={t('featheros.editor.tab_size')}
                            onClick={() => {
                                const next = prefs.tabSize === 2 ? 4 : prefs.tabSize === 4 ? 8 : 2;
                                setPrefs({ tabSize: next });
                            }}
                        >
                            {prefs.insertSpaces
                                ? t('featheros.editor.spaces_n', { n: String(prefs.tabSize) })
                                : t('featheros.editor.tabs_n', { n: String(prefs.tabSize) })}
                        </button>
                        <span className='fos-editor-status-meta'>{prefs.fontSize}px</span>
                        <span className='fos-editor-status-meta'>UTF-8</span>
                        <span className='fos-editor-language'>{monacoLanguage(activeName)}</span>
                    </>
                )}
            </footer>
        </div>
    );
}
