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

import { useEffect, useRef, useState } from 'react';
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
import { Select } from '@/components/ui/select-native';
import { toast } from 'sonner';
import { filesApi, ShareFileResult } from '@/lib/files-api';
import { Share2, Copy, Check } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { copyToClipboard } from '@/lib/utils';

interface ShareFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    filePath: string;
    fileName: string;
}

export function ShareFileDialog({ open, onOpenChange, uuid, filePath, fileName }: ShareFileDialogProps) {
    const { t } = useTranslation();
    const [ttlDays, setTtlDays] = useState<1 | 5>(1);
    const [password, setPassword] = useState('');
    const [deleteKey, setDeleteKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ShareFileResult | null>(null);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!open) {
            setTtlDays(1);
            setPassword('');
            setDeleteKey('');
            setLoading(false);
            setResult(null);
            setCopiedUrl(false);
            setCopiedKey(false);
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        }
    }, [open]);

    useEffect(() => {
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
            }
        };
    }, []);

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    const applyResult = (share: ShareFileResult) => {
        setResult(share);
        setLoading(false);
        toast.success(t('files.dialogs.share.success'));
    };

    const pollShareJob = (identifier: string) => {
        stopPolling();
        pollRef.current = setInterval(async () => {
            try {
                const jobs = await filesApi.getShareJobs(uuid);
                const job = jobs.find((j) => j.identifier === identifier);
                if (!job) {
                    return;
                }
                if (job.status === 'completed' && job.result) {
                    stopPolling();
                    applyResult(job.result);
                    return;
                }
                if (job.status === 'failed' || job.status === 'cancelled') {
                    stopPolling();
                    setLoading(false);
                    toast.error(job.error || t('files.dialogs.share.error'));
                }
            } catch {
                // keep polling through transient errors
            }
        }, 2000);
    };

    const handleShare = async () => {
        if (password && password.length < 4) {
            toast.error(t('files.dialogs.share.password_min'));
            return;
        }
        if (deleteKey && deleteKey.length < 8) {
            toast.error(t('files.dialogs.share.delete_key_min'));
            return;
        }

        setLoading(true);
        setResult(null);
        const toastId = toast.loading(t('files.dialogs.share.starting'));
        try {
            const response = await filesApi.shareFile(uuid, {
                file: filePath,
                ttl_days: ttlDays,
                password: password || undefined,
                delete_key: deleteKey || undefined,
            });

            if (response.background && response.identifier) {
                toast.success(t('files.dialogs.share.background'), { id: toastId });
                pollShareJob(response.identifier);
                return;
            }

            if (response.public_id && response.url) {
                toast.dismiss(toastId);
                applyResult({
                    public_id: response.public_id,
                    url: response.url,
                    delete_key: response.delete_key || '',
                    expires_at: response.expires_at,
                    password_protected: response.password_protected,
                    size: response.size,
                    filename: response.filename || fileName,
                });
                return;
            }

            toast.error(t('files.dialogs.share.error'), { id: toastId });
            setLoading(false);
        } catch {
            toast.error(t('files.dialogs.share.error'), { id: toastId });
            setLoading(false);
        }
    };

    const handleCopy = async (value: string, kind: 'url' | 'key') => {
        await copyToClipboard(value, t);
        if (kind === 'url') {
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        } else {
            setCopiedKey(true);
            setTimeout(() => setCopiedKey(false), 2000);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <div className='flex items-center gap-3'>
                        <div className='bg-primary/10 text-primary border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <Share2 className='h-5 w-5' />
                        </div>
                        <div>
                            <DialogTitle>{t('files.dialogs.share.title')}</DialogTitle>
                            <DialogDescription>
                                {t('files.dialogs.share.description', { name: fileName })}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {!result ? (
                    <div className='flex flex-col gap-4 py-4'>
                        <div className='space-y-2'>
                            <label className='text-muted-foreground ml-1 text-xs font-semibold tracking-wider uppercase'>
                                {t('files.dialogs.share.ttl_label')}
                            </label>
                            <Select
                                value={String(ttlDays)}
                                onChange={(e) => setTtlDays(Number(e.target.value) === 5 ? 5 : 1)}
                                className='focus:border-primary/50 border-white/10 bg-white/5'
                                disabled={loading}
                            >
                                <option value='1'>{t('files.dialogs.share.ttl_1')}</option>
                                <option value='5'>{t('files.dialogs.share.ttl_5')}</option>
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <label className='text-muted-foreground ml-1 text-xs font-semibold tracking-wider uppercase'>
                                {t('files.dialogs.share.password_label')}
                            </label>
                            <Input
                                type='password'
                                placeholder={t('files.dialogs.share.password_placeholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className='focus:border-primary/50 border-white/10 bg-white/5'
                                disabled={loading}
                            />
                        </div>
                        <div className='space-y-2'>
                            <label className='text-muted-foreground ml-1 text-xs font-semibold tracking-wider uppercase'>
                                {t('files.dialogs.share.delete_key_label')}
                            </label>
                            <Input
                                placeholder={t('files.dialogs.share.delete_key_placeholder')}
                                value={deleteKey}
                                onChange={(e) => setDeleteKey(e.target.value)}
                                className='focus:border-primary/50 border-white/10 bg-white/5'
                                disabled={loading}
                            />
                        </div>
                    </div>
                ) : (
                    <div className='flex flex-col gap-4 py-4'>
                        <p className='text-muted-foreground text-sm'>{t('files.dialogs.share.result_hint')}</p>
                        <div className='space-y-2'>
                            <label className='text-muted-foreground ml-1 text-xs font-semibold tracking-wider uppercase'>
                                {t('files.dialogs.share.url_label')}
                            </label>
                            <div className='flex gap-2'>
                                <Input
                                    readOnly
                                    value={result.url}
                                    className='focus:border-primary/50 border-white/10 bg-white/5'
                                />
                                <Button
                                    type='button'
                                    variant='secondary'
                                    size='icon'
                                    onClick={() => handleCopy(result.url, 'url')}
                                    aria-label={t('files.dialogs.share.copy_url')}
                                >
                                    {copiedUrl ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
                                </Button>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <label className='text-muted-foreground ml-1 text-xs font-semibold tracking-wider uppercase'>
                                {t('files.dialogs.share.delete_key_result_label')}
                            </label>
                            <div className='flex gap-2'>
                                <Input
                                    readOnly
                                    value={result.delete_key}
                                    className='focus:border-primary/50 border-white/10 bg-white/5'
                                />
                                <Button
                                    type='button'
                                    variant='secondary'
                                    size='icon'
                                    onClick={() => handleCopy(result.delete_key, 'key')}
                                    aria-label={t('files.dialogs.share.copy_delete_key')}
                                >
                                    {copiedKey ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant='ghost'
                        onClick={() => {
                            stopPolling();
                            onOpenChange(false);
                        }}
                    >
                        {result ? t('files.dialogs.share.close') : t('files.dialogs.share.cancel')}
                    </Button>
                    {!result && (
                        <Button variant='default' onClick={handleShare} disabled={loading || !filePath}>
                            {loading ? t('files.dialogs.share.sharing') : t('files.dialogs.share.share_button')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
