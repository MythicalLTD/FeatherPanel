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

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Copy, Webhook } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/lib/api-errors';

interface Props {
    uuidShort: string;
    scheduleId: number;
    enabled: boolean;
    onChanged: () => void;
}

/** Push-to-deploy webhook management for one schedule. */
export function WebSpaceDeployHookButton({ uuidShort, scheduleId, enabled, onChanged }: Props) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [url, setUrl] = useState<string | null>(null);
    const endpoint = `/api/user/webspaces/${uuidShort}/schedules/${scheduleId}/deploy-hook`;

    const generate = async () => {
        setBusy(true);
        try {
            const { data } = await axios.post(endpoint);
            setUrl(String(data.data?.url || ''));
            onChanged();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'webSpaces.schedules.deployHook.failed'));
        } finally {
            setBusy(false);
        }
    };

    const revoke = async () => {
        setBusy(true);
        try {
            await axios.delete(endpoint);
            setUrl(null);
            toast.success(t('webSpaces.schedules.deployHook.revoked'));
            onChanged();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'webSpaces.schedules.deployHook.failed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Button variant='glass' size='sm' onClick={() => setOpen(true)}>
                <Webhook className={`mr-1.5 h-3.5 w-3.5 ${enabled ? 'text-emerald-500' : ''}`} />
                {t('webSpaces.schedules.deployHook.button')}
            </Button>
            <Dialog
                open={open}
                onOpenChange={(o) => {
                    setOpen(o);
                    if (!o) setUrl(null);
                }}
            >
                <DialogHeader>
                    <DialogTitle>{t('webSpaces.schedules.deployHook.title')}</DialogTitle>
                    <DialogDescription>{t('webSpaces.schedules.deployHook.description')}</DialogDescription>
                </DialogHeader>
                <div className='space-y-3 py-3 text-sm'>
                    {url ? (
                        <>
                            <div className='bg-muted/40 rounded-lg p-2 font-mono text-xs break-all'>{url}</div>
                            <p className='text-muted-foreground text-xs'>
                                {t('webSpaces.schedules.deployHook.onlyOnce')}
                            </p>
                            <Button
                                size='sm'
                                variant='glass'
                                onClick={() => {
                                    void navigator.clipboard.writeText(url);
                                    toast.success(t('common.copied'));
                                }}
                            >
                                <Copy className='mr-1.5 h-3.5 w-3.5' />
                                {t('common.copy')}
                            </Button>
                        </>
                    ) : (
                        <p className='text-muted-foreground'>
                            {enabled
                                ? t('webSpaces.schedules.deployHook.active')
                                : t('webSpaces.schedules.deployHook.inactive')}
                        </p>
                    )}
                </div>
                <DialogFooter>
                    {enabled && (
                        <Button variant='destructive' loading={busy} onClick={() => void revoke()}>
                            {t('webSpaces.schedules.deployHook.revoke')}
                        </Button>
                    )}
                    <Button loading={busy} onClick={() => void generate()}>
                        {enabled
                            ? t('webSpaces.schedules.deployHook.rotate')
                            : t('webSpaces.schedules.deployHook.generate')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
