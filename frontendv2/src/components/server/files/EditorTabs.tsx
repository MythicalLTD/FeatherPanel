/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileCode, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface EditorTab {
    directory: string;
    file: string;
}

const tabsKey = (server: string) => `fp-editor-tabs:${server}`;
const draftKey = (server: string, path: string) => `fp-editor-draft:${server}:${path}`;
const joinTab = (tab: EditorTab) => (tab.directory.endsWith('/') ? tab.directory : `${tab.directory}/`) + tab.file;

function readTabs(server: string): EditorTab[] {
    try {
        const parsed = JSON.parse(sessionStorage.getItem(tabsKey(server)) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** Unsaved edits per file live in session storage so switching tabs keeps them. */
export const editorDrafts = {
    get(server: string, path: string): string | null {
        try {
            return sessionStorage.getItem(draftKey(server, path));
        } catch {
            return null;
        }
    },
    set(server: string, path: string, content: string | null) {
        try {
            if (content === null) sessionStorage.removeItem(draftKey(server, path));
            else sessionStorage.setItem(draftKey(server, path), content);
        } catch {
            /* storage full */
        }
    },
};

/** Tab strip for the file editor: several files open, unsaved dot per tab. */
export function EditorTabs({
    serverUuid,
    directory,
    file,
    activeDirty,
}: {
    serverUuid: string;
    directory: string;
    file: string;
    activeDirty: boolean;
}) {
    const { t } = useTranslation();
    const router = useRouter();
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const activePath = joinTab({ directory, file });

    useEffect(() => {
        if (!file) return;
        const list = readTabs(serverUuid);
        if (!list.some((tab) => joinTab(tab) === activePath)) list.push({ directory, file });
        const trimmed = list.slice(-12);
        sessionStorage.setItem(tabsKey(serverUuid), JSON.stringify(trimmed));
        setTabs(trimmed);
    }, [serverUuid, directory, file, activePath]);

    const open = (tab: EditorTab) =>
        router.push(
            `/server/${serverUuid}/files/edit?file=${encodeURIComponent(tab.file)}&directory=${encodeURIComponent(tab.directory)}`,
        );

    const close = (tab: EditorTab) => {
        const path = joinTab(tab);
        const dirty = path === activePath ? activeDirty : editorDrafts.get(serverUuid, path) !== null;
        if (dirty && !window.confirm(t('files.editor.unsaved_prompt'))) return;
        editorDrafts.set(serverUuid, path, null);
        const index = tabs.findIndex((x) => joinTab(x) === path);
        const next = tabs.filter((x) => joinTab(x) !== path);
        sessionStorage.setItem(tabsKey(serverUuid), JSON.stringify(next));
        setTabs(next);
        if (path === activePath) {
            const neighbour = next[index] ?? next[index - 1];
            if (neighbour) open(neighbour);
            else router.push(`/server/${serverUuid}/files?path=${encodeURIComponent(directory)}`);
        }
    };

    if (tabs.length < 2) return null;

    return (
        <div
            className='fp-surface no-scrollbar flex items-stretch gap-1 overflow-x-auto rounded-xl border p-1'
            role='tablist'
        >
            {tabs.map((tab) => {
                const path = joinTab(tab);
                const active = path === activePath;
                const dirty = active ? activeDirty : editorDrafts.get(serverUuid, path) !== null;
                return (
                    <div
                        key={path}
                        role='tab'
                        aria-selected={active}
                        className={cn(
                            'group flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg pr-1 pl-2.5 text-sm transition-colors',
                            active
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                        title={path}
                    >
                        <button
                            type='button'
                            className='flex items-center gap-1.5'
                            onClick={() => !active && open(tab)}
                        >
                            <FileCode className='h-3.5 w-3.5 shrink-0' />
                            <span className='max-w-[12rem] truncate'>{tab.file}</span>
                        </button>
                        {dirty && (
                            <span
                                className='h-2 w-2 shrink-0 rounded-full bg-amber-500'
                                aria-label={t('files.editor.unsaved')}
                            />
                        )}
                        <button
                            type='button'
                            onClick={() => close(tab)}
                            className='hover:bg-muted rounded-md p-1 opacity-60 group-hover:opacity-100'
                            aria-label={t('files.editor.close_tab')}
                        >
                            <X className='h-3 w-3' />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
