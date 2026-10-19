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
import {
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    FolderPlus,
    FilePlus,
    Upload,
    RefreshCw,
    List,
    LayoutGrid,
    Columns2,
    Search,
    Folder,
    FileText,
    FileCode,
    FileArchive,
    FileImage,
    File as FileIcon,
    HardDrive,
    Download,
    Pencil,
    Trash2,
    Copy,
    Scissors,
    ClipboardPaste,
    PackageOpen,
    Package,
    FileCode2,
    Monitor,
    SquareTerminal,
    Link2,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { filesApi } from '@/lib/files-api';
import { moveToFeatherOsTrash } from '@/lib/featheros-trash';
import { canFeatherOsUndo, performFeatherOsUndo, pushFeatherOsUndo, undoRefreshDirs } from '@/lib/featheros-undo';
import { triggerSignedUrlDownload } from '@/lib/trigger-signed-download';
import { copyToClipboard, cn } from '@/lib/utils';
import type { FileObject } from '@/types/server';
import { useFeatherOs } from '../FeatherOsContext';
import { OS_FILE_DRAG_MIME, type OsContextMenuItem, type OsFileDragPayload } from '../types';
import { formatBytes, isArchive, isTextLike, joinPath, normalizeDir, parentDir } from '../utils';
import type { OsAppProps } from './index';

type FinderView = 'grid' | 'list' | 'columns';

/** Cut / copy clipboard shared by every Finder window. */
type FinderClip = { payload: OsFileDragPayload; mode: 'copy' | 'cut' } | null;
let finderClipboard: FinderClip = null;
/** Clipboard shared by every Finder window (module scoped, never rendered directly). */
function setFinderClipboard(clip: FinderClip) {
    finderClipboard = clip;
}
function getFinderClipboard(): FinderClip {
    return finderClipboard;
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
const CODE_RE = /\.(js|ts|tsx|jsx|json|ya?ml|toml|php|py|java|go|rs|sh|lua|xml|html?|css|properties|cfg|conf|ini)$/i;

function FileGlyph({ file, size = 18 }: { file: FileObject; size?: number }) {
    const style = { width: size, height: size };
    if (!file.isFile)
        return (
            <Folder
                style={style}
                className='shrink-0 fill-[#4BA3F5] text-[#2B84D6] drop-shadow-sm'
                strokeWidth={1.25}
            />
        );
    if (isArchive(file.name)) return <FileArchive style={style} className='shrink-0 text-amber-500' />;
    if (IMAGE_RE.test(file.name)) return <FileImage style={style} className='shrink-0 text-pink-500' />;
    if (CODE_RE.test(file.name)) return <FileCode style={style} className='shrink-0 text-indigo-500' />;
    if (isTextLike(file.name, file.mimetype))
        return <FileText style={style} className='text-muted-foreground shrink-0' />;
    return <FileIcon style={style} className='text-muted-foreground shrink-0' />;
}

function dropModeFor(e: React.DragEvent, sameServer: boolean): 'move' | 'copy' {
    if (e.ctrlKey || e.altKey || e.metaKey) return 'copy';
    if (e.shiftKey) return 'move';
    return sameServer ? 'move' : 'copy';
}

function rectsIntersect(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

interface Marquee {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
}

export default function FinderApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const os = useFeatherOs();
    const {
        can,
        getServer,
        serversWith,
        updateWindowProps,
        setWindowServer,
        openContextMenu,
        prompt,
        confirm,
        moveOrCopyFiles,
        onFilesChanged,
        emitFilesChanged,
        openFileInEditor,
        openTerminalFor,
        upsertIcon,
        errorMessage,
        focusedId,
        openQuickLook,
    } = os;
    const uuid = win.serverUuid as string;
    const server = getServer(uuid);
    const path = normalizeDir(typeof win.props?.path === 'string' ? (win.props.path as string) : '/');
    const view: FinderView = win.props?.view === 'list' ? 'list' : win.props?.view === 'columns' ? 'columns' : 'grid';

    const [files, setFiles] = useState<FileObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [anchor, setAnchor] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const [uploads, setUploads] = useState<{ name: string; percent: number }[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [marquee, setMarquee] = useState<Marquee | null>(null);
    const [columnFiles, setColumnFiles] = useState<Record<string, FileObject[]>>({});
    const historyRef = useRef<{ back: string[]; forward: string[] }>({ back: [], forward: [] });
    const uploadRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef(new Map<string, HTMLElement>());
    const loadSeq = useRef(0);
    const dragReady = useRef(false);

    const canCreate = can(uuid, 'file.create');
    const canUpdate = can(uuid, 'file.update');
    const canDelete = can(uuid, 'file.delete');
    const canArchive = can(uuid, 'file.archive');
    const canReadContent = can(uuid, 'file.read-content');

    const load = useCallback(async () => {
        const seq = ++loadSeq.current;
        setLoading(true);
        try {
            const res = await filesApi.getFiles(uuid, path);
            if (seq !== loadSeq.current) return;
            setFiles(res.contents.filter((f) => !f.isTrashShortcut));
            setLoadError(null);
        } catch (error) {
            if (seq !== loadSeq.current) return;
            setFiles([]);
            setLoadError(errorMessage(error));
        } finally {
            if (seq === loadSeq.current) setLoading(false);
        }
    }, [uuid, path, errorMessage]);

    useEffect(() => {
        setSelected(new Set());
        void load();
    }, [load]);

    useEffect(
        () =>
            onFilesChanged((serverUuid, dir) => {
                if (serverUuid === uuid && normalizeDir(dir) === path) void load();
            }),
        [onFilesChanged, uuid, path, load],
    );

    const navigate = useCallback(
        (next: string, record = true) => {
            const target = normalizeDir(next);
            if (target === path) return;
            if (record) {
                historyRef.current.back.push(path);
                historyRef.current.forward = [];
            }
            setQuery('');
            updateWindowProps(win.id, { path: target });
        },
        [path, updateWindowProps, win.id],
    );

    const goBack = () => {
        const prev = historyRef.current.back.pop();
        if (prev === undefined) return;
        historyRef.current.forward.push(path);
        navigate(prev, false);
    };
    const goForward = () => {
        const next = historyRef.current.forward.pop();
        if (next === undefined) return;
        historyRef.current.back.push(path);
        navigate(next, false);
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return files
            .filter((f) => !q || f.name.toLowerCase().includes(q))
            .sort((a, b) => (a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1));
    }, [files, query]);

    const selectedFiles = visible.filter((f) => selected.has(f.name));

    const selectAll = () => {
        setSelected(new Set(visible.map((f) => f.name)));
        setAnchor(visible[visible.length - 1]?.name ?? null);
    };

    const clearSelection = () => {
        setSelected(new Set());
        setAnchor(null);
    };

    const payloadFor = (list: FileObject[]): OsFileDragPayload => ({
        serverUuid: uuid,
        root: path,
        files: list.map((f) => ({ name: f.name, isFile: f.isFile })),
    });

    // ---------- actions ----------
    const run = async (label: string, fn: () => Promise<void>, refreshDirs: string[] = [path]) => {
        setBusy(label);
        try {
            await fn();
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(null);
            refreshDirs.forEach((d) => emitFilesChanged(uuid, d));
        }
    };

    const openFile = (file: FileObject) => {
        if (!file.isFile) {
            navigate(joinPath(path, file.name));
            return;
        }
        if (isTextLike(file.name, file.mimetype) && canReadContent) {
            openFileInEditor(uuid, joinPath(path, file.name));
            return;
        }
        void download(file);
    };

    const download = async (file: FileObject) => {
        if (!canReadContent) {
            toast.error(t('featheros.errors.no_permission'));
            return;
        }
        try {
            const url = file.isFile
                ? await filesApi.getDownloadUrl(uuid, joinPath(path, file.name))
                : await filesApi.downloadDirectory(uuid, joinPath(path, file.name));
            triggerSignedUrlDownload(url);
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const newFolder = async () => {
        const name = await prompt({
            title: t('featheros.files.new_folder'),
            defaultValue: t('featheros.files.untitled_folder'),
        });
        if (!name?.trim()) return;
        await run('mkdir', () => filesApi.createFolder(uuid, path, name.trim()));
    };

    const newFile = async () => {
        const name = await prompt({ title: t('featheros.files.new_file'), defaultValue: 'untitled.txt' });
        if (!name?.trim()) return;
        await run('touch', async () => {
            await filesApi.saveFileContent(uuid, joinPath(path, name.trim()), '');
            if (isTextLike(name.trim())) openFileInEditor(uuid, joinPath(path, name.trim()));
        });
    };

    const undoLast = async () => {
        if (!canFeatherOsUndo()) return;
        try {
            const op = await performFeatherOsUndo();
            if (!op) return;
            const { serverUuid, dirs } = undoRefreshDirs(op);
            dirs.forEach((d) => emitFilesChanged(serverUuid, d));
            toast.success(t('featheros.files.undone', { defaultValue: 'Undone' }));
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const rename = async (file: FileObject) => {
        const name = await prompt({
            title: t('featheros.files.rename'),
            defaultValue: file.name,
            confirmLabel: t('featheros.files.rename'),
        });
        if (!name?.trim() || name.trim() === file.name) return;
        const next = name.trim();
        await run('rename', async () => {
            await filesApi.renameFile(uuid, path, [{ from: file.name, to: next }]);
            pushFeatherOsUndo({
                kind: 'rename',
                label: t('featheros.files.undo_rename', { defaultValue: 'Undo Rename' }),
                serverUuid: uuid,
                dir: path,
                from: file.name,
                to: next,
            });
            toast.success(t('featheros.files.rename'), {
                action: {
                    label: t('featheros.files.undo', { defaultValue: 'Undo' }),
                    onClick: () => void undoLast(),
                },
            });
        });
    };

    const remove = async (list: FileObject[]) => {
        if (list.length === 0) return;
        const ok = await confirm({
            title: t('featheros.files.delete_title', { count: String(list.length) }),
            message: list
                .map((f) => f.name)
                .slice(0, 10)
                .join(', '),
            confirmLabel: t('featheros.files.delete'),
            danger: true,
        });
        if (!ok) return;
        await run('delete', async () => {
            const entries = await moveToFeatherOsTrash(
                uuid,
                path,
                list.map((f) => ({
                    name: f.name,
                    directory: f.directory,
                    isFile: f.isFile ?? f.file,
                    size: f.size,
                })),
            );
            if (entries.length > 0) {
                pushFeatherOsUndo({
                    kind: 'delete',
                    label: t('featheros.files.undo_delete', { defaultValue: 'Undo Delete' }),
                    entries,
                    serverUuid: uuid,
                    dirs: [path, ...entries.map((e) => normalizeDir(e.original_root))],
                });
            }
            toast.success(t('featheros.files.deleted', { count: String(list.length) }), {
                action:
                    entries.length > 0
                        ? {
                              label: t('featheros.files.undo', { defaultValue: 'Undo' }),
                              onClick: () => void undoLast(),
                          }
                        : undefined,
            });
            setSelected(new Set());
        });
    };

    const compress = async (list: FileObject[]) => {
        if (list.length === 0) return;
        await run('compress', async () => {
            await filesApi.compressFiles(
                uuid,
                path,
                list.map((f) => f.name),
            );
            toast.success(t('featheros.files.compressed'));
        });
    };

    const extract = async (file: FileObject) => {
        await run('extract', async () => {
            await filesApi.decompressFile(uuid, path, file.name);
            toast.success(t('featheros.files.extracted'));
        });
    };

    const duplicate = async (list: FileObject[]) => {
        await run('copy', async () => {
            for (const f of list) await filesApi.copyFile(uuid, path, f.name);
        });
    };

    const paste = async () => {
        const clip = getFinderClipboard();
        if (!clip) return;
        const { payload, mode } = clip;
        if (mode === 'cut') setFinderClipboard(null);
        const ok = await moveOrCopyFiles(payload, { serverUuid: uuid, dir: path }, mode === 'cut' ? 'move' : 'copy');
        if (ok && mode === 'cut' && payload.serverUuid === uuid) {
            pushFeatherOsUndo({
                kind: 'move',
                label: t('featheros.files.undo_move', { defaultValue: 'Undo Move' }),
                serverUuid: uuid,
                fromDir: normalizeDir(payload.root),
                toDir: path,
                names: payload.files.map((f) => f.name),
            });
        }
    };

    const uploadFiles = async (list: FileList | File[]) => {
        const arr = Array.from(list);
        if (arr.length === 0) return;
        if (!canCreate) {
            toast.error(t('featheros.errors.no_permission'));
            return;
        }
        for (const file of arr) {
            setUploads((u) => [...u, { name: file.name, percent: 0 }]);
            try {
                await filesApi.uploadFile(uuid, path, file, (percent) =>
                    setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, percent } : x))),
                );
            } catch (error) {
                toast.error(`${file.name}: ${errorMessage(error)}`);
            } finally {
                setUploads((u) => u.filter((x) => x.name !== file.name));
            }
        }
        toast.success(t('featheros.files.uploaded', { count: String(arr.length) }));
        emitFilesChanged(uuid, path);
    };

    // ---------- selection ----------
    const selectFile = (file: FileObject, e: { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean }) => {
        if (e.metaKey || e.ctrlKey) {
            setSelected((s) => {
                const n = new Set(s);
                if (n.has(file.name)) n.delete(file.name);
                else n.add(file.name);
                return n;
            });
            setAnchor(file.name);
        } else if (e.shiftKey && anchor) {
            const a = visible.findIndex((f) => f.name === anchor);
            const b = visible.findIndex((f) => f.name === file.name);
            if (a < 0 || b < 0) {
                setSelected(new Set([file.name]));
                setAnchor(file.name);
                return;
            }
            const [from, to] = a < b ? [a, b] : [b, a];
            setSelected(new Set(visible.slice(from, to + 1).map((f) => f.name)));
        } else {
            setSelected(new Set([file.name]));
            setAnchor(file.name);
        }
    };

    const onItemPointerDown = (file: FileObject, e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        // Keep multi-select when starting a drag on an already-selected item.
        if (selected.has(file.name) && selected.size > 1 && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
            dragReady.current = true;
            return;
        }
        selectFile(file, e);
        dragReady.current = true;
    };

    /** Hit-test in viewport/client space — matches getBoundingClientRect of items 1:1. */
    const hitTestMarquee = (box: { x: number; y: number; w: number; h: number }) => {
        const hit = new Set<string>();
        itemRefs.current.forEach((el, name) => {
            const r = el.getBoundingClientRect();
            if (rectsIntersect(box, { x: r.left, y: r.top, w: r.width, h: r.height })) hit.add(name);
        });
        return hit;
    };

    const onCanvasPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('[data-fos-finder-item]')) return;
        if (target.closest('thead')) return;
        const canvas = listRef.current;
        if (!canvas) return;
        canvas.focus();
        // Keep marquee in client/viewport coords so overlays and hit-tests share one space.
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
            setSelected(new Set());
            setAnchor(null);
        }
        const start: Marquee = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
        setMarquee(start);
        const base = e.metaKey || e.ctrlKey || e.shiftKey ? new Set(selected) : new Set<string>();
        const onMove = (ev: PointerEvent) => {
            const m = { x0: start.x0, y0: start.y0, x1: ev.clientX, y1: ev.clientY };
            setMarquee(m);
            const box = {
                x: Math.min(m.x0, m.x1),
                y: Math.min(m.y0, m.y1),
                w: Math.abs(m.x1 - m.x0),
                h: Math.abs(m.y1 - m.y0),
            };
            if (box.w < 4 && box.h < 4) return;
            const hit = hitTestMarquee(box);
            base.forEach((n) => hit.add(n));
            setSelected(hit);
            if (hit.size) setAnchor([...hit].pop() ?? null);
        };
        const onUp = () => {
            setMarquee(null);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    };

    // ---------- menus ----------
    const rowMenu = (file: FileObject, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const list = selected.has(file.name) ? selectedFiles : [file];
        if (!selected.has(file.name)) setSelected(new Set([file.name]));
        const single = list.length === 1;
        const items: OsContextMenuItem[] = [
            {
                id: 'quicklook',
                label: t('featheros.quicklook.title'),
                shortcut: 'Space',
                onSelect: () =>
                    openQuickLook({ serverUuid: uuid, path: joinPath(path, file.name), isFile: file.isFile }),
            },
            { id: 'open', label: t('featheros.files.open'), onSelect: () => openFile(file) },
            ...(file.isFile && isTextLike(file.name, file.mimetype)
                ? [
                      {
                          id: 'edit',
                          label: t('featheros.files.open_in_editor'),
                          icon: FileCode2,
                          disabled: !canReadContent,
                          onSelect: () =>
                              list
                                  .filter((f) => f.isFile)
                                  .forEach((f) => openFileInEditor(uuid, joinPath(path, f.name))),
                      },
                  ]
                : []),
            {
                id: 'download',
                label: t('featheros.files.download'),
                icon: Download,
                disabled: !canReadContent || !single,
                onSelect: () => void download(file),
            },
            { id: 's1', separator: true },
            {
                id: 'rename',
                label: t('featheros.files.rename'),
                icon: Pencil,
                disabled: !canUpdate || !single,
                onSelect: () => void rename(file),
            },
            {
                id: 'dup',
                label: t('featheros.files.duplicate'),
                icon: Copy,
                disabled: !canCreate,
                onSelect: () => void duplicate(list),
            },
            {
                id: 'copy',
                label: t('featheros.files.copy'),
                icon: Copy,
                shortcut: '⌘C',
                onSelect: () => setFinderClipboard({ payload: payloadFor(list), mode: 'copy' }),
            },
            {
                id: 'cut',
                label: t('featheros.files.cut'),
                icon: Scissors,
                shortcut: '⌘X',
                disabled: !canUpdate,
                onSelect: () => setFinderClipboard({ payload: payloadFor(list), mode: 'cut' }),
            },
            { id: 's2', separator: true },
            {
                id: 'compress',
                label: t('featheros.files.compress'),
                icon: Package,
                disabled: !canArchive,
                onSelect: () => void compress(list),
            },
            ...(single && file.isFile && isArchive(file.name)
                ? [
                      {
                          id: 'extract',
                          label: t('featheros.files.extract'),
                          icon: PackageOpen,
                          disabled: !canArchive,
                          onSelect: () => void extract(file),
                      },
                  ]
                : []),
            {
                id: 'desktop',
                label: t('featheros.files.add_to_desktop'),
                icon: Monitor,
                onSelect: () =>
                    list.forEach((f, i) =>
                        upsertIcon({
                            id: `${f.isFile ? 'file' : 'folder'}:${uuid}:${joinPath(path, f.name)}`,
                            kind: f.isFile ? 'file' : 'folder',
                            serverUuid: uuid,
                            path: joinPath(path, f.name),
                            label: f.name,
                            x: 24 + (i % 6) * 96,
                            y: 24 + Math.floor(i / 6) * 100,
                        }),
                    ),
            },
            {
                id: 'path',
                label: t('featheros.files.copy_path'),
                icon: Link2,
                onSelect: () => void copyToClipboard(joinPath(path, file.name)),
            },
            { id: 's3', separator: true },
            {
                id: 'delete',
                label: t('featheros.files.delete'),
                icon: Trash2,
                danger: true,
                disabled: !canDelete,
                onSelect: () => void remove(list),
            },
        ];
        openContextMenu({ x: e.clientX, y: e.clientY }, items);
    };

    const backgroundMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setSelected(new Set());
        openContextMenu({ x: e.clientX, y: e.clientY }, [
            {
                id: 'folder',
                label: t('featheros.files.new_folder'),
                icon: FolderPlus,
                disabled: !canCreate,
                onSelect: () => void newFolder(),
            },
            {
                id: 'file',
                label: t('featheros.files.new_file'),
                icon: FilePlus,
                disabled: !canCreate,
                onSelect: () => void newFile(),
            },
            {
                id: 'upload',
                label: t('featheros.files.upload'),
                icon: Upload,
                disabled: !canCreate,
                onSelect: () => uploadRef.current?.click(),
            },
            {
                id: 'paste',
                label: t('featheros.files.paste'),
                icon: ClipboardPaste,
                shortcut: '⌘V',
                disabled: !getFinderClipboard(),
                onSelect: () => void paste(),
            },
            { id: 's', separator: true },
            {
                id: 'term',
                label: t('featheros.desktop.open_terminal'),
                icon: SquareTerminal,
                disabled: !can(uuid, 'websocket.connect'),
                onSelect: () => openTerminalFor(uuid),
            },
            { id: 'refresh', label: t('featheros.common.refresh'), icon: RefreshCw, onSelect: () => void load() },
        ]);
    };

    // ---------- keyboard ----------
    const onKeyDown = (e: React.KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        const mod = e.metaKey || e.ctrlKey;
        if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            e.preventDefault();
            void undoLast();
        } else if (mod && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            selectAll();
        } else if (mod && e.key.toLowerCase() === 'c' && selectedFiles.length) {
            setFinderClipboard({ payload: payloadFor(selectedFiles), mode: 'copy' });
            toast.info(t('featheros.files.copied_clipboard', { count: String(selectedFiles.length) }));
        } else if (mod && e.key.toLowerCase() === 'x' && selectedFiles.length && canUpdate) {
            setFinderClipboard({ payload: payloadFor(selectedFiles), mode: 'cut' });
            toast.info(t('featheros.files.cut_clipboard', { count: String(selectedFiles.length) }));
        } else if (mod && e.key.toLowerCase() === 'v') {
            void paste();
        } else if (e.key === 'Delete' || (mod && e.key === 'Backspace')) {
            if (canDelete) void remove(selectedFiles);
        } else if (e.key === 'Escape') {
            clearSelection();
        } else if (e.key === ' ' && selectedFiles.length === 1) {
            e.preventDefault();
            const f = selectedFiles[0];
            openQuickLook({ serverUuid: uuid, path: joinPath(path, f.name), isFile: f.isFile });
        } else if (e.key === 'Enter' && selectedFiles.length === 1) {
            openFile(selectedFiles[0]);
        } else if (e.key === 'F2' && selectedFiles.length === 1 && canUpdate) {
            void rename(selectedFiles[0]);
        } else if (e.key === 'Backspace' && !mod) {
            navigate(parentDir(path));
        } else if (
            visible.length > 0 &&
            (e.key === 'ArrowDown' ||
                e.key === 'ArrowUp' ||
                e.key === 'ArrowLeft' ||
                e.key === 'ArrowRight' ||
                e.key === 'PageDown' ||
                e.key === 'PageUp' ||
                e.key === 'Home' ||
                e.key === 'End')
        ) {
            e.preventDefault();
            const el = listRef.current;
            const cols = view === 'grid' ? Math.max(1, Math.floor(((el?.clientWidth ?? 400) - 28) / 116)) : 1;
            const rowH = view === 'grid' ? 108 : view === 'list' ? 28 : 26;
            const pageRows = Math.max(1, Math.floor((el?.clientHeight ?? 320) / rowH) - 1);
            const pageJump = view === 'grid' ? pageRows * cols : pageRows;
            const cur = Math.max(
                0,
                visible.findIndex((f) => f.name === (anchor ?? selectedFiles[0]?.name)),
            );
            let next = cur;
            if (e.key === 'ArrowDown') next = Math.min(visible.length - 1, cur + cols);
            if (e.key === 'ArrowUp') next = Math.max(0, cur - cols);
            if (e.key === 'ArrowRight') next = Math.min(visible.length - 1, cur + 1);
            if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
            if (e.key === 'PageDown') next = Math.min(visible.length - 1, cur + pageJump);
            if (e.key === 'PageUp') next = Math.max(0, cur - pageJump);
            if (e.key === 'Home') next = 0;
            if (e.key === 'End') next = visible.length - 1;
            const file = visible[next];
            if (!file) return;
            if (e.shiftKey && anchor) {
                selectFile(file, { shiftKey: true });
            } else {
                setSelected(new Set([file.name]));
                setAnchor(file.name);
            }
            itemRefs.current.get(file.name)?.scrollIntoView({ block: 'nearest' });
        }
    };

    // ---------- drag & drop ----------
    const onDragStart = (file: FileObject, e: React.DragEvent) => {
        if (!dragReady.current && !selected.has(file.name)) {
            e.preventDefault();
            return;
        }
        const list = selected.has(file.name) ? selectedFiles : [file];
        if (!selected.has(file.name)) setSelected(new Set([file.name]));
        e.dataTransfer.setData(OS_FILE_DRAG_MIME, JSON.stringify(payloadFor(list)));
        e.dataTransfer.setData('text/plain', list.map((f) => joinPath(path, f.name)).join('\n'));
        e.dataTransfer.effectAllowed = 'copyMove';
        const el = e.currentTarget as HTMLElement;
        const r = el.getBoundingClientRect();
        // Anchor the drag ghost to the cursor so the icon tracks under the pointer.
        try {
            e.dataTransfer.setDragImage(el, e.clientX - r.left, e.clientY - r.top);
        } catch {
            /* some browsers reject custom drag images */
        }
    };

    const allowDrop = (key: string) => (e: React.DragEvent) => {
        const types = e.dataTransfer.types;
        const internal = types.includes(OS_FILE_DRAG_MIME);
        if (!internal && !types.includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = internal ? (e.ctrlKey || e.altKey || e.metaKey ? 'copy' : 'move') : 'copy';
        setDropTarget(key);
    };

    const dropInto =
        (dir: string, targetUuid = uuid) =>
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget(null);
            const raw = e.dataTransfer.getData(OS_FILE_DRAG_MIME);
            if (raw) {
                try {
                    const payload = JSON.parse(raw) as OsFileDragPayload;
                    if (
                        payload.files.some((f) => joinPath(payload.root, f.name) === dir) &&
                        payload.serverUuid === targetUuid
                    )
                        return;
                    const mode = dropModeFor(e, payload.serverUuid === targetUuid);
                    void moveOrCopyFiles(payload, { serverUuid: targetUuid, dir }, mode).then((ok) => {
                        if (ok && mode === 'move' && payload.serverUuid === targetUuid) {
                            pushFeatherOsUndo({
                                kind: 'move',
                                label: t('featheros.files.undo_move', { defaultValue: 'Undo Move' }),
                                serverUuid: targetUuid,
                                fromDir: normalizeDir(payload.root),
                                toDir: normalizeDir(dir),
                                names: payload.files.map((f) => f.name),
                            });
                        }
                    });
                } catch {
                    // ignore malformed drags
                }
                return;
            }
            if (e.dataTransfer.files.length && targetUuid === uuid) {
                if (dir !== path) {
                    // Uploading into a sub folder: go there first so the progress is visible.
                    navigate(dir);
                }
                void (async () => {
                    const list = Array.from(e.dataTransfer.files);
                    for (const file of list) {
                        setUploads((u) => [...u, { name: file.name, percent: 0 }]);
                        try {
                            await filesApi.uploadFile(uuid, dir, file, (percent) =>
                                setUploads((u) => u.map((x) => (x.name === file.name ? { ...x, percent } : x))),
                            );
                        } catch (error) {
                            toast.error(`${file.name}: ${errorMessage(error)}`);
                        } finally {
                            setUploads((u) => u.filter((x) => x.name !== file.name));
                        }
                    }
                    emitFilesChanged(uuid, dir);
                })();
            }
        };

    const crumbs = useMemo(() => {
        const parts = path.split('/').filter(Boolean);
        return [
            { name: server?.name ?? '/', path: '/' },
            ...parts.map((p, i) => ({ name: p, path: `/${parts.slice(0, i + 1).join('/')}` })),
        ];
    }, [path, server?.name]);

    const columnDirs = useMemo(() => {
        const parts = path.split('/').filter(Boolean);
        const dirs = ['/'];
        for (let i = 0; i < parts.length; i++) {
            dirs.push(`/${parts.slice(0, i + 1).join('/')}`);
        }
        return dirs;
    }, [path]);

    useEffect(() => {
        if (view !== 'columns') return;
        let cancelled = false;
        const parents = columnDirs.slice(0, -1);
        void (async () => {
            const next: Record<string, FileObject[]> = {};
            await Promise.all(
                parents.map(async (dir) => {
                    try {
                        const res = await filesApi.getFiles(uuid, dir);
                        if (!cancelled) {
                            next[dir] = res.contents.filter((f) => !f.isTrashShortcut);
                        }
                    } catch {
                        if (!cancelled) next[dir] = [];
                    }
                }),
            );
            if (!cancelled) {
                setColumnFiles((prev) => ({ ...prev, ...next, [path]: files }));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [view, columnDirs, uuid, path, files]);

    const locations = serversWith('file.read');
    const folderTitle = crumbs[crumbs.length - 1]?.name || server?.name || 'Finder';
    const totalUpload = uploads.length ? Math.round(uploads.reduce((s, u) => s + u.percent, 0) / uploads.length) : 0;

    return (
        <div className='fos-finder select-none' onKeyDown={onKeyDown} tabIndex={-1}>
            <aside className='fos-finder-sidebar fos-scroll overflow-y-auto'>
                <div className='fos-finder-sidebar-label'>{t('featheros.files.locations')}</div>
                {locations.map((s) => (
                    <button
                        key={s.uuidShort}
                        type='button'
                        onClick={() => s.uuidShort !== uuid && setWindowServer(win.id, s.uuidShort)}
                        onDragOver={allowDrop(`srv:${s.uuidShort}`)}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={dropInto('/', s.uuidShort)}
                        className={cn(
                            'fos-finder-location',
                            s.uuidShort === uuid && 'is-active',
                            dropTarget === `srv:${s.uuidShort}` && 'bg-[#0a84ff]/15 ring-2 ring-[#0a84ff]',
                        )}
                    >
                        <HardDrive className='h-3.5 w-3.5 shrink-0 text-[#6e6e73]' strokeWidth={1.75} />
                        <span className='truncate'>{s.name}</span>
                    </button>
                ))}
            </aside>
            <div className='fos-finder-main'>
                <div className='fos-finder-toolbar' data-fos-window-drag>
                    <div className='fos-finder-toolbar-nav' data-no-drag>
                        <button
                            type='button'
                            className='fos-finder-toolbtn'
                            onClick={goBack}
                            disabled={!historyRef.current.back.length}
                            title={t('featheros.files.back')}
                        >
                            <ChevronLeft className='h-4 w-4' strokeWidth={2.25} />
                        </button>
                        <button
                            type='button'
                            className='fos-finder-toolbtn'
                            onClick={goForward}
                            disabled={!historyRef.current.forward.length}
                            title={t('featheros.files.forward')}
                        >
                            <ChevronRight className='h-4 w-4' strokeWidth={2.25} />
                        </button>
                        <button
                            type='button'
                            className='fos-finder-toolbtn'
                            onClick={() => navigate(parentDir(path))}
                            disabled={path === '/'}
                            title={t('featheros.files.up')}
                        >
                            <ArrowUp className='h-4 w-4' strokeWidth={2.25} />
                        </button>
                    </div>
                    <div
                        className='fos-finder-toolbar-title'
                        title={crumbs.map((c) => c.name).join(' / ')}
                        data-fos-window-drag
                    >
                        {folderTitle}
                    </div>
                    <div className='fos-finder-toolbar-actions' data-no-drag>
                        <button
                            type='button'
                            className={cn('fos-finder-toolbtn', view === 'grid' && 'is-on')}
                            onClick={() => updateWindowProps(win.id, { view: 'grid' })}
                            title={t('featheros.files.view_grid', { defaultValue: 'Icons' })}
                        >
                            <LayoutGrid className='h-4 w-4' strokeWidth={1.75} />
                        </button>
                        <button
                            type='button'
                            className={cn('fos-finder-toolbtn', view === 'list' && 'is-on')}
                            onClick={() => updateWindowProps(win.id, { view: 'list' })}
                            title={t('featheros.files.view_list', { defaultValue: 'List' })}
                        >
                            <List className='h-4 w-4' strokeWidth={1.75} />
                        </button>
                        <button
                            type='button'
                            className={cn('fos-finder-toolbtn', view === 'columns' && 'is-on')}
                            onClick={() => updateWindowProps(win.id, { view: 'columns' })}
                            title={t('featheros.files.view_columns', { defaultValue: 'Columns' })}
                        >
                            <Columns2 className='h-4 w-4' strokeWidth={1.75} />
                        </button>
                        <button
                            type='button'
                            className='fos-finder-toolbtn'
                            onClick={() => void newFolder()}
                            disabled={!canCreate}
                            title={t('featheros.files.new_folder')}
                        >
                            <FolderPlus className='h-4 w-4' strokeWidth={1.75} />
                        </button>
                        <button
                            type='button'
                            className='fos-finder-toolbtn'
                            onClick={() => void newFile()}
                            disabled={!canCreate}
                            title={t('featheros.files.new_file')}
                        >
                            <FilePlus className='h-4 w-4' strokeWidth={1.75} />
                        </button>
                        <button
                            type='button'
                            className='fos-finder-toolbtn'
                            onClick={() => uploadRef.current?.click()}
                            disabled={!canCreate}
                            title={t('featheros.files.upload')}
                        >
                            <Upload className='h-4 w-4' strokeWidth={1.75} />
                        </button>
                        <button
                            type='button'
                            className='fos-finder-toolbtn'
                            onClick={() => void load()}
                            title={t('featheros.common.refresh')}
                        >
                            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} strokeWidth={1.75} />
                        </button>
                        {selectedFiles.length > 0 && (
                            <>
                                <button
                                    type='button'
                                    className='fos-finder-toolbtn'
                                    onClick={() => {
                                        setFinderClipboard({ payload: payloadFor(selectedFiles), mode: 'copy' });
                                        toast.info(
                                            t('featheros.files.copied_clipboard', {
                                                count: String(selectedFiles.length),
                                            }),
                                        );
                                    }}
                                    title={t('featheros.common.copy')}
                                >
                                    <Copy className='h-3.5 w-3.5' strokeWidth={1.75} />
                                </button>
                                <button
                                    type='button'
                                    className='fos-finder-toolbtn'
                                    disabled={!canUpdate}
                                    onClick={() => {
                                        setFinderClipboard({ payload: payloadFor(selectedFiles), mode: 'cut' });
                                        toast.info(
                                            t('featheros.files.cut_clipboard', {
                                                count: String(selectedFiles.length),
                                            }),
                                        );
                                    }}
                                    title={t('featheros.files.cut')}
                                >
                                    <Scissors className='h-3.5 w-3.5' strokeWidth={1.75} />
                                </button>
                                <button
                                    type='button'
                                    className='fos-finder-toolbtn'
                                    disabled={!canDelete}
                                    onClick={() => void remove(selectedFiles)}
                                    title={t('featheros.files.delete')}
                                >
                                    <Trash2 className='h-3.5 w-3.5' strokeWidth={1.75} />
                                </button>
                            </>
                        )}
                        <div className='fos-finder-filter-wrap'>
                            <Search className='pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--fos-secondary)]' />
                            <input
                                type='search'
                                name='fos-finder-filter'
                                autoComplete='off'
                                autoCorrect='off'
                                spellCheck={false}
                                data-1p-ignore='true'
                                data-lpignore='true'
                                data-form-type='other'
                                data-bwignore='true'
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t('featheros.files.filter')}
                                className='fos-finder-filter'
                            />
                        </div>
                    </div>
                    <input
                        ref={uploadRef}
                        type='file'
                        multiple
                        className='hidden'
                        onChange={(e) => {
                            if (e.target.files) void uploadFiles(e.target.files);
                            e.target.value = '';
                        }}
                    />
                </div>

                <nav className='fos-finder-pathbar' aria-label={t('files.info.path')}>
                    {crumbs.map((c, i) => (
                        <span key={c.path} className='fos-finder-pathbar-seg'>
                            {i > 0 && <span className='fos-finder-pathbar-sep'>/</span>}
                            <button
                                type='button'
                                className={cn('fos-finder-pathbar-btn', c.path === path && 'is-current')}
                                onClick={() => navigate(c.path)}
                                title={c.path}
                            >
                                {c.name}
                            </button>
                        </span>
                    ))}
                </nav>

                <div
                    ref={listRef}
                    tabIndex={0}
                    className={cn(
                        'fos-finder-canvas fos-scroll relative min-h-0 flex-1 overflow-auto outline-none',
                        view === 'columns' && 'fos-finder-canvas-columns',
                        dropTarget === 'here' && 'is-drop-target',
                    )}
                    onContextMenu={backgroundMenu}
                    onPointerDown={view === 'columns' ? undefined : onCanvasPointerDown}
                    onDragOver={allowDrop('here')}
                    onDragLeave={(e) => {
                        if (!listRef.current?.contains(e.relatedTarget as Node)) setDropTarget(null);
                    }}
                    onDrop={dropInto(path)}
                >
                    {loadError ? (
                        <div className='fos-finder-error'>
                            <AlertTriangle className='h-7 w-7 text-amber-500' aria-hidden />
                            <p className='fos-finder-error-title'>{loadError}</p>
                            {(loadError.includes('node') ||
                                loadError.includes('Wings') ||
                                loadError.includes('offline')) && (
                                <p>
                                    {t('featheros.errors.node_unreachable_hint', {
                                        defaultValue: 'Files stay on the node. Try again once the node is back online.',
                                    })}
                                </p>
                            )}
                            <button type='button' className='fos-finder-error-action' onClick={() => void load()}>
                                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                                {t('common.retry', { defaultValue: 'Try Again' })}
                            </button>
                        </div>
                    ) : view === 'columns' ? (
                        <div className='fos-finder-columns'>
                            {columnDirs.map((dir, colIdx) => {
                                const listing =
                                    dir === path
                                        ? visible
                                        : (columnFiles[dir] ?? [])
                                              .filter(
                                                  (f) =>
                                                      !query.trim() ||
                                                      f.name.toLowerCase().includes(query.trim().toLowerCase()),
                                              )
                                              .sort((a, b) =>
                                                  a.isFile === b.isFile
                                                      ? a.name.localeCompare(b.name)
                                                      : a.isFile
                                                        ? 1
                                                        : -1,
                                              );
                                const nextDir = columnDirs[colIdx + 1];
                                const selectedChild = nextDir
                                    ? nextDir.slice(dir === '/' ? 1 : dir.length + 1).split('/')[0]
                                    : null;
                                return (
                                    <div
                                        key={dir}
                                        className='fos-finder-column fos-scroll'
                                        onDragOver={allowDrop(`col:${dir}`)}
                                        onDrop={dropInto(dir)}
                                    >
                                        {listing.map((f) => {
                                            const isSel =
                                                dir === path ? selected.has(f.name) : selectedChild === f.name;
                                            const key = `col:${dir}:${f.name}`;
                                            return (
                                                <button
                                                    key={f.name}
                                                    type='button'
                                                    ref={(el) => {
                                                        if (dir === path) {
                                                            if (el) itemRefs.current.set(f.name, el);
                                                            else itemRefs.current.delete(f.name);
                                                        }
                                                    }}
                                                    data-fos-finder-item={dir === path ? f.name : undefined}
                                                    className={cn(
                                                        'fos-finder-column-item',
                                                        isSel && 'is-selected',
                                                        dropTarget === key && 'is-drop',
                                                    )}
                                                    draggable={dir === path}
                                                    onPointerDown={
                                                        dir === path ? (e) => onItemPointerDown(f, e) : undefined
                                                    }
                                                    onDragStart={dir === path ? (e) => onDragStart(f, e) : undefined}
                                                    onClick={() => {
                                                        if (!f.isFile) {
                                                            navigate(joinPath(dir, f.name));
                                                            return;
                                                        }
                                                        if (dir !== path) {
                                                            navigate(dir);
                                                        }
                                                        setSelected(new Set([f.name]));
                                                        setAnchor(f.name);
                                                    }}
                                                    onDoubleClick={() => {
                                                        if (dir === path) openFile(f);
                                                        else if (!f.isFile) navigate(joinPath(dir, f.name));
                                                        else {
                                                            navigate(dir);
                                                            openFile(f);
                                                        }
                                                    }}
                                                    onContextMenu={dir === path ? (e) => rowMenu(f, e) : undefined}
                                                    onDragOver={f.isFile ? undefined : allowDrop(key)}
                                                    onDrop={f.isFile ? undefined : dropInto(joinPath(dir, f.name))}
                                                >
                                                    <FileGlyph file={f} size={16} />
                                                    <span className='truncate'>{f.name}</span>
                                                    {!f.isFile && (
                                                        <ChevronRight
                                                            className='fos-finder-column-chevron ml-auto h-3.5 w-3.5 shrink-0 opacity-40'
                                                            strokeWidth={2}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                        {!loading && listing.length === 0 && (
                                            <div className='fos-finder-column-empty'>{t('featheros.files.empty')}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : view === 'list' ? (
                        <table className='fos-finder-list'>
                            <thead>
                                <tr>
                                    <th>{t('featheros.files.name')}</th>
                                    <th className='fos-finder-list-size'>{t('featheros.files.size')}</th>
                                    <th className='fos-finder-list-modified'>{t('featheros.files.modified')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((f, i) => {
                                    const isSel = selected.has(f.name);
                                    const key = `row:${f.name}`;
                                    return (
                                        <tr
                                            key={f.name}
                                            ref={(el) => {
                                                if (el) itemRefs.current.set(f.name, el);
                                                else itemRefs.current.delete(f.name);
                                            }}
                                            data-fos-finder-item={f.name}
                                            aria-selected={isSel}
                                            tabIndex={-1}
                                            draggable
                                            onPointerDown={(e) => onItemPointerDown(f, e)}
                                            onDragStart={(e) => onDragStart(f, e)}
                                            onDragEnd={() => {
                                                setDropTarget(null);
                                                dragReady.current = false;
                                            }}
                                            onDoubleClick={() => openFile(f)}
                                            onContextMenu={(e) => rowMenu(f, e)}
                                            onDragOver={f.isFile ? undefined : allowDrop(key)}
                                            onDragLeave={f.isFile ? undefined : () => setDropTarget('here')}
                                            onDrop={f.isFile ? undefined : dropInto(joinPath(path, f.name))}
                                            className={cn(
                                                isSel && 'is-selected',
                                                isSel && focusedId === win.id && 'is-focused',
                                                !isSel && i % 2 === 1 && 'is-alt',
                                                dropTarget === key && 'is-drop',
                                            )}
                                        >
                                            <td>
                                                <span className='fos-finder-list-name'>
                                                    <FileGlyph file={f} size={16} />
                                                    <span>{f.name}</span>
                                                </span>
                                            </td>
                                            <td className='fos-finder-list-size'>
                                                {f.isFile ? formatBytes(f.size) : '—'}
                                            </td>
                                            <td className='fos-finder-list-modified'>
                                                {f.modified_at ? new Date(f.modified_at).toLocaleString() : ''}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className='fos-finder-grid'>
                            {visible.map((f) => {
                                const isSel = selected.has(f.name);
                                const key = `row:${f.name}`;
                                return (
                                    <div
                                        key={f.name}
                                        ref={(el) => {
                                            if (el) itemRefs.current.set(f.name, el);
                                            else itemRefs.current.delete(f.name);
                                        }}
                                        data-fos-finder-item={f.name}
                                        aria-selected={isSel}
                                        tabIndex={-1}
                                        draggable
                                        onPointerDown={(e) => onItemPointerDown(f, e)}
                                        onDragStart={(e) => onDragStart(f, e)}
                                        onDragEnd={() => {
                                            setDropTarget(null);
                                            dragReady.current = false;
                                        }}
                                        onDoubleClick={() => openFile(f)}
                                        onContextMenu={(e) => rowMenu(f, e)}
                                        onDragOver={f.isFile ? undefined : allowDrop(key)}
                                        onDragLeave={f.isFile ? undefined : () => setDropTarget('here')}
                                        onDrop={f.isFile ? undefined : dropInto(joinPath(path, f.name))}
                                        className={cn(
                                            'fos-finder-icon',
                                            isSel && 'is-selected',
                                            dropTarget === key && 'is-drop',
                                        )}
                                    >
                                        <div className='fos-finder-icon-glyph'>
                                            <FileGlyph file={f} size={52} />
                                        </div>
                                        <span className='fos-finder-icon-name'>{f.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {marquee &&
                        (() => {
                            const canvasRect = listRef.current?.getBoundingClientRect();
                            if (!canvasRect) return null;
                            return (
                                <div
                                    className='fos-finder-marquee'
                                    style={{
                                        left: Math.min(marquee.x0, marquee.x1) - canvasRect.left,
                                        top: Math.min(marquee.y0, marquee.y1) - canvasRect.top,
                                        width: Math.abs(marquee.x1 - marquee.x0),
                                        height: Math.abs(marquee.y1 - marquee.y0),
                                    }}
                                />
                            );
                        })()}
                    {!loading && !loadError && view !== 'columns' && visible.length === 0 && (
                        <div className='fos-finder-empty'>
                            {query ? t('featheros.files.no_match') : t('featheros.files.empty')}
                        </div>
                    )}
                </div>
                <div className='fos-finder-footer'>
                    <span>
                        {selectedFiles.length
                            ? t('featheros.files.status', {
                                  count: String(visible.length),
                                  selected: String(selectedFiles.length),
                              })
                            : `${visible.length} ${visible.length === 1 ? 'item' : 'items'}`}
                    </span>
                    {busy && (
                        <span className='flex items-center gap-1'>
                            <Loader2 className='h-3 w-3 animate-spin' />
                            {t('featheros.files.working')}
                        </span>
                    )}
                    {uploads.length > 0 && (
                        <span className='flex items-center gap-2'>
                            <Upload className='h-3 w-3' />
                            {t('featheros.files.uploading', {
                                count: String(uploads.length),
                                percent: String(totalUpload),
                            })}
                            <span className='h-1 w-28 overflow-hidden rounded-full bg-black/10'>
                                <span
                                    className='block h-full bg-[#0a84ff] transition-all'
                                    style={{ width: `${totalUpload}%` }}
                                />
                            </span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
