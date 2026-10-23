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

import * as React from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Link2, Copy, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SubuserPresetPicker } from '@/components/server/SubuserPresetPicker';
import { cn } from '@/lib/utils';

interface Invite {
    id: number;
    permissions: string[];
    max_uses: number;
    uses: number;
    expires_at: string;
    created_by_username: string | null;
}

/** "Invite link" button with a dialog to create, copy and revoke subuser invite links. */
export function SubuserInviteManager({ uuidShort, disabled }: { uuidShort: string; disabled?: boolean }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [available, setAvailable] = React.useState<string[]>([]);
    const [selected, setSelected] = React.useState<string[]>([]);
    const [hours, setHours] = React.useState('72');
    const [maxUses, setMaxUses] = React.useState('1');
    const [invites, setInvites] = React.useState<Invite[]>([]);
    const [creating, setCreating] = React.useState(false);
    const [link, setLink] = React.useState<string | null>(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const [perms, list] = await Promise.all([
                axios.get(`/api/user/servers/${uuidShort}/subusers/permissions`),
                axios.get(`/api/user/servers/${uuidShort}/subuser-invites`),
            ]);
            setAvailable(perms.data?.data?.permissions ?? []);
            setInvites(list.data?.data?.invites ?? []);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'serverSubusers.invites.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    const openDialog = () => {
        setLink(null);
        setOpen(true);
        void load();
    };

    const toggle = (perm: string) =>
        setSelected((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));

    const create = async () => {
        setCreating(true);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/subuser-invites`, {
                permissions: selected,
                expires_in_hours: Number(hours),
                max_uses: Number(maxUses),
            });
            const url = `${window.location.origin}/dashboard/invites/${data.data.token}`;
            setLink(url);
            toast.success(t('serverSubusers.invites.created'));
            void load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'serverSubusers.invites.createFailed'));
        } finally {
            setCreating(false);
        }
    };

    const revoke = async (id: number) => {
        try {
            await axios.delete(`/api/user/servers/${uuidShort}/subuser-invites/${id}`);
            setInvites((prev) => prev.filter((i) => i.id !== id));
            toast.success(t('serverSubusers.invites.revoked'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'serverSubusers.invites.revokeFailed'));
        }
    };

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t('serverSubusers.invites.copied'));
        } catch {
            toast.error(t('serverSubusers.invites.copyFailed'));
        }
    };

    return (
        <>
            <Button
                variant='glass'
                size='default'
                onClick={openDialog}
                disabled={disabled}
                className='order-2 sm:order-1'
            >
                <Link2 className='h-5 w-5 sm:mr-2' />
                <span className='hidden sm:inline'>{t('serverSubusers.invites.button')}</span>
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} className='max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>{t('serverSubusers.invites.title')}</DialogTitle>
                    <DialogDescription>{t('serverSubusers.invites.description')}</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className='flex justify-center py-10'>
                        <Loader2 className='text-primary h-8 w-8 animate-spin' />
                    </div>
                ) : (
                    <div className='space-y-5 pt-4'>
                        {link && (
                            <div className='bg-primary/5 border-primary/20 space-y-2 rounded-xl border p-4'>
                                <p className='text-sm font-semibold'>{t('serverSubusers.invites.linkReady')}</p>
                                <div className='flex gap-2'>
                                    <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
                                    <Button variant='outline' onClick={() => copy(link)}>
                                        <Copy className='h-4 w-4' />
                                    </Button>
                                </div>
                                <p className='text-muted-foreground text-xs'>{t('serverSubusers.invites.linkOnce')}</p>
                            </div>
                        )}
                        <SubuserPresetPicker available={available} onApply={setSelected} />
                        <div className='max-h-56 overflow-y-auto rounded-xl border p-3'>
                            <div className='grid gap-1 sm:grid-cols-2'>
                                {available.map((perm) => (
                                    <label key={perm} className='flex cursor-pointer items-center gap-2 text-xs'>
                                        <input
                                            type='checkbox'
                                            checked={selected.includes(perm)}
                                            onChange={() => toggle(perm)}
                                        />
                                        <span className='font-mono'>{perm}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className='grid gap-3 sm:grid-cols-2'>
                            <label className='space-y-1 text-xs font-semibold'>
                                <span>{t('serverSubusers.invites.expiresIn')}</span>
                                <select
                                    className='bg-background w-full rounded-lg border p-2 text-sm'
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                >
                                    {['1', '24', '72', '168', '720'].map((h) => (
                                        <option key={h} value={h}>
                                            {t('serverSubusers.invites.hours', { hours: h })}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className='space-y-1 text-xs font-semibold'>
                                <span>{t('serverSubusers.invites.maxUses')}</span>
                                <Input
                                    type='number'
                                    min={1}
                                    max={50}
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(e.target.value)}
                                />
                            </label>
                        </div>
                        <Button onClick={create} disabled={creating || selected.length === 0} className='w-full'>
                            {creating && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                            {t('serverSubusers.invites.create')}
                        </Button>
                        <div className='space-y-2'>
                            <p className='text-sm font-semibold'>{t('serverSubusers.invites.active')}</p>
                            {invites.length === 0 ? (
                                <p className='text-muted-foreground text-xs'>{t('serverSubusers.invites.none')}</p>
                            ) : (
                                invites.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className={cn(
                                            'flex items-center justify-between rounded-xl border p-3 text-xs',
                                        )}
                                    >
                                        <div>
                                            <p className='font-semibold'>
                                                {t('serverSubusers.invites.summary', {
                                                    count: String(inv.permissions.length),
                                                    uses: String(inv.uses),
                                                    max: String(inv.max_uses),
                                                })}
                                            </p>
                                            <p className='text-muted-foreground'>
                                                {t('serverSubusers.invites.expires', {
                                                    date: new Date(inv.expires_at.replace(' ', 'T')).toLocaleString(),
                                                })}
                                            </p>
                                        </div>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => revoke(inv.id)}
                                            aria-label={t('serverSubusers.invites.revoke')}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
}
