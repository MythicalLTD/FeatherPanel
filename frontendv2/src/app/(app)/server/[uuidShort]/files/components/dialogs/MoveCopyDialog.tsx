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

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { toast } from 'sonner';
import { filesApi } from '@/lib/files-api';
import { Move, Copy } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface MoveCopyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    files: string[];
    action: 'move' | 'copy';
    onSuccess: () => void;
}

export function MoveCopyDialog({ open, onOpenChange, uuid, root, files, action, onSuccess }: MoveCopyDialogProps) {
    const { t } = useTranslation();
    const [destination, setDestination] = useState(root);
    const [newName, setNewName] = useState('');
    const [showAdvancedPath, setShowAdvancedPath] = useState(false);
    const [loading, setLoading] = useState(false);
    const singleFile = files.length === 1 ? files[0] : '';

    const normalizePath = (value: string): string => {
        const withLeading = value.startsWith('/') ? value : `/${value}`;
        const collapsed = withLeading.replace(/\/+/g, '/');
        return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
    };

    const joinPath = (base: string, name: string): string => {
        const cleanBase = normalizePath(base || '/');
        const cleanName = (name || '').replace(/^\/+/, '');
        return cleanBase === '/' ? `/${cleanName}` : `${cleanBase}/${cleanName}`;
    };

    const getParentPath = (path: string): string => {
        const normalized = normalizePath(path || '/');
        if (normalized === '/') return '/';
        const idx = normalized.lastIndexOf('/');
        if (idx <= 0) return '/';
        return normalized.slice(0, idx);
    };

    const pathSegments = (path: string): string[] => {
        const normalized = normalizePath(path || '/');
        if (normalized === '/') return ['/'];
        const parts = normalized.split('/').filter(Boolean);
        const segments = ['/'];
        let current = '';
        for (const part of parts) {
            current += `/${part}`;
            segments.push(current);
        }
        return segments;
    };

    const currentPath = normalizePath(root || '/');
    const parentPath = getParentPath(currentPath);
    const destinationOptions = ['/', parentPath, currentPath].filter((path, index, all) => all.indexOf(path) === index);

    useEffect(() => {
        if (open) {
            setDestination(root || '/');
            setNewName('');
            setShowAdvancedPath(false);
        }
    }, [open, root]);

    const handleAction = async () => {
        setLoading(true);
        const normalizedDestination = destination.trim() ? destination.trim() : '/';
        const toastId = toast.loading(
            action === 'move' ? t('files.dialogs.move_copy.moving') : t('files.dialogs.move_copy.copying'),
        );
        try {
            if (action === 'copy') {
                if (files.length === 1) {
                    await filesApi.copyFile(uuid, root, files[0], newName.trim() || undefined);
                } else {
                    for (const file of files) {
                        await filesApi.copyFile(uuid, root, file);
                    }
                }
            } else {
                const updates = files.map((f) => ({
                    from: joinPath(root || '/', f),
                    to: joinPath(normalizedDestination, f),
                }));
                await filesApi.moveFile(uuid, '/', updates);
            }
            toast.success(
                action === 'move'
                    ? t('files.dialogs.move_copy.move_success')
                    : t('files.dialogs.move_copy.copy_success'),
                { id: toastId },
            );
            onSuccess();
            onOpenChange(false);
        } catch {
            toast.error(
                action === 'move' ? t('files.dialogs.move_copy.move_error') : t('files.dialogs.move_copy.copy_error'),
                { id: toastId },
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <div className='flex items-center gap-3'>
                        <div className='bg-primary/10 text-primary border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            {action === 'move' ? <Move className='h-5 w-5' /> : <Copy className='h-5 w-5' />}
                        </div>
                        <div>
                            <DialogTitle className='capitalize'>
                                {action === 'move'
                                    ? t('files.dialogs.move_copy.move_title')
                                    : t('files.dialogs.move_copy.copy_title')}
                            </DialogTitle>
                            <DialogDescription>
                                {action === 'move'
                                    ? t('files.dialogs.move_copy.move_description', { count: String(files.length) })
                                    : t('files.dialogs.move_copy.copy_description', { count: String(files.length) })}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className='flex flex-col gap-4 py-4'>
                    {action === 'move' ? (
                        <div className='space-y-3'>
                            <label className='text-muted-foreground ml-1 text-xs font-semibold tracking-wider uppercase'>
                                {t('files.dialogs.move_copy.destination_label')}
                            </label>
                            <div className='flex flex-wrap gap-2'>
                                {destinationOptions.map((path) => (
                                    <Button
                                        key={path}
                                        type='button'
                                        variant={destination === path ? 'default' : 'ghost'}
                                        onClick={() => setDestination(path)}
                                        className='animate-in fade-in zoom-in-95 duration-200'
                                    >
                                        {path === currentPath
                                            ? t('files.dialogs.move_copy.destination_current')
                                            : path === parentPath
                                              ? t('files.dialogs.move_copy.destination_parent')
                                              : t('files.dialogs.move_copy.destination_root')}
                                    </Button>
                                ))}
                                <Button
                                    type='button'
                                    variant='ghost'
                                    onClick={() => setShowAdvancedPath((prev) => !prev)}
                                >
                                    {showAdvancedPath
                                        ? t('files.dialogs.move_copy.hide_advanced')
                                        : t('files.dialogs.move_copy.show_advanced')}
                                </Button>
                            </div>
                            <p className='text-muted-foreground text-xs'>
                                {t('files.dialogs.move_copy.destination_selected', { path: destination })}
                            </p>
                            <div className='bg-muted/30 animate-in fade-in slide-in-from-top-1 rounded-lg border border-white/10 p-2 duration-200'>
                                <p className='text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase'>
                                    {t('files.dialogs.move_copy.path_quick_pick')}
                                </p>
                                <div className='flex flex-wrap gap-2'>
                                    {pathSegments(destination).map((segment) => (
                                        <button
                                            key={segment}
                                            type='button'
                                            onClick={() => setDestination(segment)}
                                            className={`rounded-md border px-2 py-1 text-xs transition-all ${
                                                destination === segment
                                                    ? 'bg-primary/20 text-primary border-primary/30'
                                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                            }`}
                                        >
                                            {segment}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {showAdvancedPath && (
                                <div className='animate-in fade-in slide-in-from-top-1 duration-200'>
                                    <Input
                                        placeholder='/'
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        className='border-white/10 bg-white/5'
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className='space-y-2'>
                            <label className='text-muted-foreground ml-1 text-xs font-semibold tracking-wider uppercase'>
                                {t('files.dialogs.move_copy.new_name_label')}
                            </label>
                            {files.length === 1 ? (
                                <Input
                                    placeholder={t('files.dialogs.move_copy.new_name_placeholder', {
                                        name: `${singleFile} - copy`,
                                    })}
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className='border-white/10 bg-white/5'
                                />
                            ) : (
                                <p className='text-muted-foreground rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm'>
                                    {t('files.dialogs.move_copy.new_name_multi_hint')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant='ghost' onClick={() => onOpenChange(false)}>
                        {t('files.dialogs.move_copy.cancel')}
                    </Button>
                    <Button
                        variant='default'
                        onClick={handleAction}
                        disabled={loading || (action === 'move' && !destination)}
                        className='h-10 px-6 capitalize'
                    >
                        {action === 'move' ? t('files.dialogs.move_copy.move') : t('files.dialogs.move_copy.copy')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
