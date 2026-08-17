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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Code2, Download, ExternalLink, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { toast } from 'sonner';

const MARKETPLACE_URL = 'https://marketplace.visualstudio.com/items?itemName=calagopus.calagopus';
const OPENVSX_URL = 'https://open-vsx.org/extension/calagopus/calagopus';
const SCHEME_STORAGE_KEY = 'featherpanel.calagopus.uriScheme';

type EditorScheme = 'vscode' | 'vscodium';

interface OpenInCalagopusDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serverUuid: string | null | undefined;
}

export function OpenInCalagopusDialog({ open, onOpenChange, serverUuid }: OpenInCalagopusDialogProps) {
    const { t } = useTranslation();
    const [scheme, setScheme] = useState<EditorScheme>('vscode');

    useEffect(() => {
        if (!open) {
            return;
        }
        try {
            const saved = localStorage.getItem(SCHEME_STORAGE_KEY);
            if (saved === 'vscode' || saved === 'vscodium') {
                setScheme(saved);
            }
        } catch {
            // ignore storage errors
        }
    }, [open]);

    const openInEditor = () => {
        if (!serverUuid) {
            toast.error(t('files.messages.load_error'));
            return;
        }

        try {
            localStorage.setItem(SCHEME_STORAGE_KEY, scheme);
        } catch {
            // ignore storage errors
        }

        const query = `origin=${encodeURIComponent(window.location.origin)}&server=${encodeURIComponent(
            serverUuid,
        )}&console=1`;
        if (scheme === 'vscodium') {
            window.location.href = `vscodium://calagopus.calagopus/open?${query}`;
        } else {
            window.location.href = `vscode://calagopus.calagopus/open?${query}`;
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                    <div className='flex items-center gap-3'>
                        <div className='bg-primary/10 text-primary border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <Code2 className='h-5 w-5' />
                        </div>
                        <div>
                            <DialogTitle>{t('files.dialogs.calagopus.title')}</DialogTitle>
                            <DialogDescription>{t('files.dialogs.calagopus.description')}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className='space-y-4 py-1'>
                    <div className='border-border/60 bg-muted/30 rounded-xl border p-4'>
                        <div className='mb-2 flex items-center gap-2'>
                            <Download className='text-primary h-4 w-4 shrink-0' />
                            <p className='text-sm font-medium'>{t('files.dialogs.calagopus.installTitle')}</p>
                        </div>
                        <p className='text-muted-foreground mb-3 text-sm leading-relaxed'>
                            {t('files.dialogs.calagopus.installBody')}
                        </p>
                        <div className='flex flex-col gap-2 sm:flex-row'>
                            <Button
                                variant='outline'
                                size='sm'
                                className='h-9 justify-start gap-2 sm:flex-1'
                                onClick={() => window.open(MARKETPLACE_URL, '_blank', 'noopener,noreferrer')}
                            >
                                <ExternalLink className='h-3.5 w-3.5 shrink-0' />
                                <span className='truncate'>{t('files.dialogs.calagopus.marketplace')}</span>
                            </Button>
                            <Button
                                variant='outline'
                                size='sm'
                                className='h-9 justify-start gap-2 sm:flex-1'
                                onClick={() => window.open(OPENVSX_URL, '_blank', 'noopener,noreferrer')}
                            >
                                <ExternalLink className='h-3.5 w-3.5 shrink-0' />
                                <span className='truncate'>{t('files.dialogs.calagopus.openvsx')}</span>
                            </Button>
                        </div>
                    </div>

                    <div>
                        <p className='text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase'>
                            {t('files.dialogs.calagopus.editorLabel')}
                        </p>
                        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                            <button
                                type='button'
                                onClick={() => setScheme('vscode')}
                                className={cn(
                                    'hover:bg-muted/50 flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                                    scheme === 'vscode'
                                        ? 'border-primary bg-primary/5 ring-primary/30 ring-1'
                                        : 'border-border/60',
                                )}
                            >
                                <Code2 className='mt-0.5 h-4 w-4 shrink-0' />
                                <span>
                                    <span className='block text-sm font-medium'>
                                        {t('files.dialogs.calagopus.vscode')}
                                    </span>
                                    <span className='text-muted-foreground block text-xs'>
                                        {t('files.dialogs.calagopus.vscodeHint')}
                                    </span>
                                </span>
                            </button>
                            <button
                                type='button'
                                onClick={() => setScheme('vscodium')}
                                className={cn(
                                    'hover:bg-muted/50 flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                                    scheme === 'vscodium'
                                        ? 'border-primary bg-primary/5 ring-primary/30 ring-1'
                                        : 'border-border/60',
                                )}
                            >
                                <Terminal className='mt-0.5 h-4 w-4 shrink-0' />
                                <span>
                                    <span className='block text-sm font-medium'>
                                        {t('files.dialogs.calagopus.vscodium')}
                                    </span>
                                    <span className='text-muted-foreground block text-xs'>
                                        {t('files.dialogs.calagopus.vscodiumHint')}
                                    </span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                <DialogFooter className='gap-2 sm:gap-0'>
                    <Button variant='ghost' onClick={() => onOpenChange(false)}>
                        {t('files.dialogs.calagopus.cancel')}
                    </Button>
                    <Button onClick={openInEditor} disabled={!serverUuid}>
                        <ExternalLink className='mr-2 h-4 w-4' />
                        {t('files.dialogs.calagopus.open')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
