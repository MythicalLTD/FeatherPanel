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

import { useState, type RefObject } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Camera,
    ClipboardPaste,
    Disc3,
    DiscAlbum,
    Keyboard,
    LifeBuoy,
    Loader2,
    MoreHorizontal,
    Undo2,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { VncConsoleHandle } from '@/components/vds/VncConsole';
import type { VdsFeatures } from '@/hooks/useVdsFeatures';
import { VdsIsoDialog } from '@/components/vds/VdsIsoDialog';

interface VdsConsoleActionsProps {
    vmId: number;
    features: VdsFeatures | null;
    vncRef: RefObject<VncConsoleHandle | null>;
    connected: boolean;
    canPower: boolean;
    canSettings: boolean;
    hostname?: string;
}

const apiError = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) && (err.response?.data?.message as string | undefined)) || fallback;

/**
 * Console "Actions" menu: Ctrl+Alt+Del, paste clipboard, screenshot, ISO mount/unmount and rescue boot.
 * Each entry is hidden when its admin toggle is off and disabled without the matching VDS permission.
 */
export function VdsConsoleActions({
    vmId,
    features,
    vncRef,
    connected,
    canPower,
    canSettings,
    hostname,
}: VdsConsoleActionsProps) {
    const { t } = useTranslation();
    const [pasteOpen, setPasteOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [typing, setTyping] = useState<{ done: number; total: number } | null>(null);
    const [isoOpen, setIsoOpen] = useState(false);
    const [rescueActive, setRescueActive] = useState<boolean | null>(null);
    const [rescueConfirm, setRescueConfirm] = useState(false);
    const [rescueBusy, setRescueBusy] = useState(false);

    const c = features?.console;
    const maxChars = c?.paste_max_chars ?? 2000;
    const showCad = c?.ctrl_alt_del_enabled ?? true;
    const showPaste = c?.paste_enabled ?? false;
    const showShot = c?.screenshot_enabled ?? false;
    const showIso = features?.iso.enabled ?? false;
    const showRescue = features?.rescue.enabled ?? false;

    const onMenuOpen = () => {
        if (showRescue && canPower && rescueActive === null) {
            axios
                .get(`/api/user/vm-instances/${vmId}/rescue`)
                .then(({ data }) => setRescueActive(Boolean(data?.data?.active)))
                .catch(() => setRescueActive(false));
        }
    };

    const openPaste = async () => {
        setPasteText('');
        setPasteOpen(true);
        // Clipboard read needs a secure context + permission; the textarea is the fallback.
        try {
            if (navigator.clipboard?.readText) {
                const text = await navigator.clipboard.readText();
                if (text) setPasteText(text.slice(0, maxChars));
            }
        } catch {
            // Permission denied or unsupported: user pastes into the textarea instead.
        }
    };

    const sendPaste = async () => {
        if (!pasteText || !vncRef.current) return;
        setTyping({ done: 0, total: pasteText.length });
        const ok = await vncRef.current.typeText(pasteText.slice(0, maxChars), (done, total) =>
            setTyping({ done, total }),
        );
        setTyping(null);
        if (ok) {
            setPasteOpen(false);
            vncRef.current?.focus();
            toast.success(t('vds.console.actions.paste_done'));
        } else {
            toast.error(t('vds.console.actions.paste_failed'));
        }
    };

    const takeScreenshot = () => {
        const url = vncRef.current?.screenshot();
        if (!url) {
            toast.error(t('vds.console.actions.screenshot_failed'));
            return;
        }
        const a = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.href = url;
        a.download = `${(hostname || `vds-${vmId}`).replace(/[^a-zA-Z0-9._-]/g, '_')}-${stamp}.png`;
        a.click();
    };

    const unmountIso = async () => {
        try {
            await axios.post(`/api/user/vm-instances/${vmId}/iso-unmount`);
            toast.success(t('vds.console.actions.iso_unmounted'));
            setRescueActive(null);
        } catch (err) {
            toast.error(apiError(err, t('vds.console.actions.iso_unmount_failed')));
        }
    };

    const toggleRescue = async () => {
        setRescueBusy(true);
        const action = rescueActive ? 'exit' : 'enter';
        try {
            await axios.post(`/api/user/vm-instances/${vmId}/rescue`, { action }, { timeout: 120_000 });
            toast.success(t(`vds.console.actions.rescue_${action}_done`));
            setRescueActive(action === 'enter');
            setRescueConfirm(false);
        } catch (err) {
            toast.error(apiError(err, t('vds.console.actions.rescue_failed')));
        } finally {
            setRescueBusy(false);
        }
    };

    if (!showCad && !showPaste && !showShot && !showIso && !showRescue) return null;

    return (
        <>
            <DropdownMenu as='div' className='relative'>
                <DropdownMenuTrigger
                    as={Button}
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 rounded-lg px-2 text-xs'
                    title={t('vds.console.actions.title')}
                    aria-label={t('vds.console.actions.title')}
                    onClick={onMenuOpen}
                >
                    <MoreHorizontal className='h-3.5 w-3.5 sm:mr-1.5' />
                    <span className='hidden sm:inline'>{t('vds.console.actions.title')}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-64'>
                    <DropdownMenuLabel>{t('vds.console.actions.keyboard')}</DropdownMenuLabel>
                    {showCad && (
                        <DropdownMenuItem disabled={!connected} onClick={() => vncRef.current?.sendCtrlAltDel()}>
                            <Keyboard className='mr-2 h-4 w-4' />
                            {t('vds.console.screen.ctrl_alt_del')}
                        </DropdownMenuItem>
                    )}
                    {showPaste && (
                        <DropdownMenuItem disabled={!connected} onClick={() => void openPaste()}>
                            <ClipboardPaste className='mr-2 h-4 w-4' />
                            {t('vds.console.actions.paste')}
                        </DropdownMenuItem>
                    )}
                    {showShot && (
                        <DropdownMenuItem disabled={!connected} onClick={takeScreenshot}>
                            <Camera className='mr-2 h-4 w-4' />
                            {t('vds.console.actions.screenshot')}
                        </DropdownMenuItem>
                    )}
                    {(showIso || showRescue) && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>{t('vds.console.actions.boot_media')}</DropdownMenuLabel>
                        </>
                    )}
                    {showIso && (
                        <>
                            <DropdownMenuItem disabled={!canSettings} onClick={() => setIsoOpen(true)}>
                                <Disc3 className='mr-2 h-4 w-4' />
                                {t('vds.console.actions.iso_mount')}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!canSettings} onClick={() => void unmountIso()}>
                                <DiscAlbum className='mr-2 h-4 w-4' />
                                {t('vds.console.actions.iso_unmount')}
                            </DropdownMenuItem>
                        </>
                    )}
                    {showRescue && (
                        <DropdownMenuItem
                            disabled={!canPower || rescueActive === null}
                            onClick={() => setRescueConfirm(true)}
                            className={cn(!rescueActive && 'text-amber-600 dark:text-amber-400')}
                        >
                            {rescueActive ? <Undo2 className='mr-2 h-4 w-4' /> : <LifeBuoy className='mr-2 h-4 w-4' />}
                            {rescueActive === null
                                ? t('vds.console.actions.rescue_checking')
                                : rescueActive
                                  ? t('vds.console.actions.rescue_exit')
                                  : t('vds.console.actions.rescue_enter')}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
                open={pasteOpen}
                onOpenChange={(open) => !typing && setPasteOpen(open)}
                className='max-w-lg space-y-4'
            >
                <DialogHeader>
                    <DialogTitle>{t('vds.console.actions.paste_title')}</DialogTitle>
                    <DialogDescription>
                        {t('vds.console.actions.paste_description', { max: String(maxChars) })}
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value.slice(0, maxChars))}
                    rows={8}
                    className='font-mono text-xs'
                    placeholder={t('vds.console.actions.paste_placeholder')}
                    disabled={typing !== null}
                    autoFocus
                />
                <p className='text-muted-foreground text-xs'>
                    {typing
                        ? t('vds.console.actions.paste_progress', {
                              done: String(typing.done),
                              total: String(typing.total),
                          })
                        : `${pasteText.length} / ${maxChars} · ${t('vds.console.actions.paste_layout_hint')}`}
                </p>
                <DialogFooter>
                    <Button variant='outline' onClick={() => setPasteOpen(false)} disabled={typing !== null}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={() => void sendPaste()} disabled={!pasteText || typing !== null || !connected}>
                        {typing && <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />}
                        {t('vds.console.actions.paste_send')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <VdsIsoDialog vmId={vmId} features={features} open={isoOpen} onOpenChange={setIsoOpen} />

            <ConfirmDialog
                open={rescueConfirm}
                onOpenChange={setRescueConfirm}
                title={rescueActive ? t('vds.console.actions.rescue_exit') : t('vds.console.actions.rescue_enter')}
                description={
                    rescueActive
                        ? t('vds.console.actions.rescue_exit_confirm')
                        : t('vds.console.actions.rescue_enter_confirm')
                }
                confirmLabel={
                    rescueActive ? t('vds.console.actions.rescue_exit') : t('vds.console.actions.rescue_enter')
                }
                cancelLabel={t('common.cancel')}
                onConfirm={toggleRescue}
                loading={rescueBusy}
                destructive={!rescueActive}
            />
        </>
    );
}
