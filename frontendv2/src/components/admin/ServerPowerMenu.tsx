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
import axios, { isAxiosError } from 'axios';
import { Play, Square, RotateCw, Skull, Power, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

interface ServerPowerMenuProps {
    uuidShort: string;
    serverName?: string;
    disabled?: boolean;
}

export async function sendServerPowerAction(uuidShort: string, action: PowerAction): Promise<void> {
    await axios.post(`/api/user/servers/${uuidShort}/power/${action}`);
}

export function ServerPowerMenu({ uuidShort, serverName, disabled = false }: ServerPowerMenuProps) {
    const { t } = useTranslation();
    const [actionLoading, setActionLoading] = useState<PowerAction | null>(null);
    const [showKillConfirm, setShowKillConfirm] = useState(false);
    const [dontAskAgain, setDontAskAgain] = useState(false);
    const [skipKillConfirm, setSkipKillConfirm] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('featherpanel_skip_kill_confirm');
            setSkipKillConfirm(saved === 'true');
        }
    }, []);

    const runPowerAction = async (action: PowerAction) => {
        setActionLoading(action);
        try {
            await sendServerPowerAction(uuidShort, action);
            toast.success(
                t('admin.servers.messages.power_success', {
                    name: serverName || uuidShort,
                }),
            );
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.servers.messages.power_failed'));
            }
        } finally {
            setActionLoading(null);
        }
    };

    const handleAction = (action: PowerAction) => {
        if (action === 'kill' && !skipKillConfirm) {
            setShowKillConfirm(true);
            return;
        }

        void runPowerAction(action);
    };

    const handleKillConfirm = async () => {
        if (dontAskAgain && typeof window !== 'undefined') {
            localStorage.setItem('featherpanel_skip_kill_confirm', 'true');
            setSkipKillConfirm(true);
        }

        setShowKillConfirm(false);
        await runPowerAction('kill');
    };

    const isLoading = actionLoading !== null;

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    disabled={disabled || isLoading}
                    title={t('admin.servers.actions.power')}
                    className='text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-50'
                >
                    {isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Power className='h-4 w-4' />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-48'>
                    <DropdownMenuItem disabled={isLoading} onClick={() => handleAction('start')} className='gap-2'>
                        <Play className='h-4 w-4 text-emerald-500' />
                        {t('servers.start')}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isLoading} onClick={() => handleAction('restart')} className='gap-2'>
                        <RotateCw className='h-4 w-4 text-amber-500' />
                        {t('servers.restart')}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={isLoading} onClick={() => handleAction('stop')} className='gap-2'>
                        <Square className='h-4 w-4 text-orange-500' />
                        {t('servers.stop')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={isLoading}
                        onClick={() => handleAction('kill')}
                        className='text-destructive focus:text-destructive gap-2'
                    >
                        <Skull className='h-4 w-4' />
                        {t('servers.console.kill')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmDialog
                open={showKillConfirm}
                onOpenChange={setShowKillConfirm}
                title={t('servers.console.kill_confirm_title')}
                description={t('servers.console.kill_confirm_description')}
                confirmLabel={t('servers.console.kill_confirm')}
                cancelLabel={t('common.cancel')}
                onConfirm={handleKillConfirm}
            >
                <div className='flex items-center space-x-2 py-4'>
                    <Checkbox
                        id={`kill-confirm-${uuidShort}`}
                        checked={dontAskAgain}
                        onCheckedChange={(checked) => setDontAskAgain(checked === true)}
                    />
                    <Label htmlFor={`kill-confirm-${uuidShort}`} className='cursor-pointer text-sm font-normal'>
                        {t('servers.console.kill_dont_ask_again')}
                    </Label>
                </div>
            </ConfirmDialog>
        </>
    );
}
