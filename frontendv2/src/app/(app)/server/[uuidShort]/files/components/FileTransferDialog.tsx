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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Folder, Loader2, Send } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

interface TargetServer {
    uuidShort: string;
    name: string;
    node: string | null;
    same_node: boolean;
}

interface FileTransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serverUuid: string;
    directory: string;
    files: string[];
    canMove: boolean;
    onStarted: () => void;
}

export function FileTransferDialog({
    open,
    onOpenChange,
    serverUuid,
    directory,
    files,
    canMove,
    onStarted,
}: FileTransferDialogProps) {
    const { t } = useTranslation();
    const [targets, setTargets] = useState<TargetServer[]>([]);
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [target, setTarget] = useState('');
    const [mode, setMode] = useState<'copy' | 'move'>('copy');
    const [folder, setFolder] = useState('/');
    const [folders, setFolders] = useState<string[]>([]);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoadingTargets(true);
        axios
            .get(`/api/user/servers/${serverUuid}/files/transfer-targets`)
            .then(({ data }) => {
                const list: TargetServer[] = data.data.servers || [];
                setTargets(list);
                setTarget((cur) => cur || list[0]?.uuidShort || '');
            })
            .catch(() => setTargets([]))
            .finally(() => setLoadingTargets(false));
    }, [open, serverUuid]);

    const loadFolders = useCallback(async (server: string, path: string) => {
        setLoadingFolders(true);
        try {
            const res = await filesApi.getFiles(server, path);
            setFolders(
                res.contents
                    .filter((f) => !f.isFile)
                    .map((f) => f.name)
                    .sort((a, b) => a.localeCompare(b)),
            );
        } catch {
            setFolders([]);
        } finally {
            setLoadingFolders(false);
        }
    }, []);

    useEffect(() => {
        if (open && target) void loadFolders(target, folder);
    }, [open, target, folder, loadFolders]);

    const submit = async () => {
        setSubmitting(true);
        try {
            await axios.post(`/api/user/servers/${serverUuid}/files/transfer`, {
                target,
                files,
                root: directory,
                destination: folder,
                mode,
            });
            toast.success(t('files.transfer.started'));
            onStarted();
            onOpenChange(false);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'files.transfer.failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const parent = folder === '/' ? null : folder.slice(0, folder.lastIndexOf('/')) || '/';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <Send className='text-primary h-5 w-5' />
                        {t('files.transfer.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('files.transfer.description', { count: String(files.length) })}
                    </DialogDescription>
                </DialogHeader>

                {loadingTargets ? (
                    <div className='flex justify-center py-8'>
                        <Loader2 className='text-primary h-6 w-6 animate-spin' />
                    </div>
                ) : targets.length === 0 ? (
                    <p className='text-muted-foreground py-6 text-center text-sm'>{t('files.transfer.no_targets')}</p>
                ) : (
                    <div className='space-y-4 py-2'>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground text-xs font-medium'>
                                {t('files.transfer.target')}
                            </Label>
                            <HeadlessSelect
                                value={target}
                                onChange={(v) => {
                                    setTarget(String(v));
                                    setFolder('/');
                                }}
                                options={targets.map((s) => ({
                                    id: s.uuidShort,
                                    name: s.node ? `${s.name} (${s.node})` : s.name,
                                }))}
                                buttonClassName='h-11 rounded-xl'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground text-xs font-medium'>
                                {t('files.transfer.mode')}
                            </Label>
                            <div className='fp-surface-inset flex gap-1 rounded-xl border p-1'>
                                {(['copy', 'move'] as const).map((m) => (
                                    <button
                                        key={m}
                                        type='button'
                                        disabled={m === 'move' && !canMove}
                                        onClick={() => setMode(m)}
                                        className={cn(
                                            'h-9 flex-1 rounded-lg text-sm transition-colors disabled:opacity-40',
                                            mode === m
                                                ? 'bg-primary/15 text-primary'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {t(`files.transfer.mode_${m}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground text-xs font-medium'>
                                {t('files.transfer.destination')}
                            </Label>
                            <div className='fp-surface-inset rounded-xl border'>
                                <div className='flex items-center gap-2 border-b border-[var(--fp-surface-border)] px-3 py-2 font-mono text-xs'>
                                    {parent !== null && (
                                        <button
                                            type='button'
                                            onClick={() => setFolder(parent)}
                                            className='hover:bg-muted rounded-md p-1'
                                            aria-label={t('files.shortcuts.up')}
                                        >
                                            <ArrowLeft className='h-3.5 w-3.5' />
                                        </button>
                                    )}
                                    <span className='truncate'>{folder}</span>
                                </div>
                                <div className='max-h-48 overflow-y-auto p-1'>
                                    {loadingFolders ? (
                                        <div className='flex justify-center py-4'>
                                            <Loader2 className='h-4 w-4 animate-spin' />
                                        </div>
                                    ) : folders.length === 0 ? (
                                        <p className='text-muted-foreground px-2 py-3 text-xs'>
                                            {t('files.transfer.no_folders')}
                                        </p>
                                    ) : (
                                        folders.map((name) => (
                                            <button
                                                key={name}
                                                type='button'
                                                onClick={() =>
                                                    setFolder(folder === '/' ? `/${name}` : `${folder}/${name}`)
                                                }
                                                className='hover:bg-primary/10 flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm'
                                            >
                                                <Folder className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400' />
                                                <span className='truncate'>{name}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant='outline' onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={submit} disabled={!target || submitting || files.length === 0}>
                        {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                        {mode === 'move' ? t('files.transfer.submit_move') : t('files.transfer.submit_copy')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
