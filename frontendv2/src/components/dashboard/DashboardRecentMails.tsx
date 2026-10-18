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

import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { cn } from '@/lib/utils';
import { Mail, RefreshCw, Clock } from 'lucide-react';

interface MailItem {
    id: number;
    subject: string;
    body: string;
    status: 'pending' | 'sent' | 'failed';
    created_at: string;
}

export function DashboardRecentMails() {
    const { t } = useTranslation();
    const [mails, setMails] = useState<MailItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [mailModalOpen, setMailModalOpen] = useState(false);
    const [selectedMail, setSelectedMail] = useState<MailItem | null>(null);

    const fetchMails = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/user/mails?page=1&limit=5');
            if (data.success && data.data) {
                setMails(data.data.mails || []);
            }
        } catch (e) {
            console.error('Failed to fetch mails for dashboard', e);
            toast.error(getApiErrorMessage(e, t, 'common.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchMails();
    }, [fetchMails]);

    const openMailModal = (mail: MailItem) => {
        setSelectedMail(mail);
        setMailModalOpen(true);
    };

    const getIframeContent = (htmlContent: string): string => {
        return `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					body {
						font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
						line-height: 1.6;
						color: #333;
						margin: 0;
						padding: 20px;
						background: white;
					}
					img { max-width: 100%; height: auto; }
					table { max-width: 100%; border-collapse: collapse; }
					td, th { padding: 8px; border: 1px solid #ddd; }
					a { color: #007bff; text-decoration: none; }
					a:hover { text-decoration: underline; }
				</style>
			</head>
			<body>${htmlContent}</body>
			</html>
		`;
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'sent':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'failed':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return t('common.unknown');
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

            if (diffInHours < 1) {
                return t('account.mail.justNow');
            } else if (diffInHours < 24) {
                return t('account.mail.hoursAgo', { hours: String(diffInHours) });
            } else if (diffInHours < 48) {
                return t('account.mail.yesterday');
            } else {
                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }
        } catch {
            return t('common.unknown');
        }
    };

    if (loading) {
        return (
            <div className='fp-surface space-y-3 rounded-xl border p-4'>
                <div className='flex items-center justify-between'>
                    <div className='bg-muted h-6 w-36 animate-pulse rounded' />
                    <div className='bg-muted h-4 w-24 animate-pulse rounded' />
                </div>
                <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='bg-muted/50 h-16 animate-pulse rounded-lg' />
                    ))}
                </div>
            </div>
        );
    }

    // No mail yet: hide the widget instead of showing an empty card.
    if (mails.length === 0) {
        return null;
    }

    return (
        <section className='fp-surface min-w-0 overflow-hidden rounded-xl border'>
            <header className='flex min-w-0 items-center justify-between gap-3 px-4 pt-3.5 pb-2.5'>
                <div className='flex min-w-0 items-center gap-2'>
                    <Mail className='text-muted-foreground h-4 w-4 shrink-0' aria-hidden />
                    <h2 className='truncate text-sm font-semibold'>{t('dashboard.recent_mails.title')}</h2>
                </div>
                <div className='flex shrink-0 items-center gap-3'>
                    <button
                        type='button'
                        onClick={() => fetchMails()}
                        title={t('account.mail.refresh')}
                        aria-label={t('account.mail.refresh')}
                        className='text-muted-foreground hover:text-foreground inline-flex items-center transition-colors'
                    >
                        <RefreshCw className='h-3.5 w-3.5' />
                    </button>
                    <Link
                        href='/dashboard/account?tab=mail'
                        className='text-primary hover:text-primary/80 text-xs font-medium whitespace-nowrap'
                    >
                        {t('dashboard.recent_mails.view_all')} &rarr;
                    </Link>
                </div>
            </header>

            <div className='divide-border/50 border-border/50 divide-y border-t'>
                {mails.map((mail) => (
                    <button
                        key={mail.id}
                        type='button'
                        onClick={() => openMailModal(mail)}
                        className='hover:bg-muted/40 flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition-colors'
                    >
                        <span className='bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
                            <Mail className='h-4 w-4' />
                        </span>
                        <span className='min-w-0 flex-1'>
                            <span className='block truncate text-sm font-medium' title={mail.subject}>
                                {mail.subject}
                            </span>
                            <span className='text-muted-foreground mt-0.5 flex items-center gap-1 text-xs'>
                                <Clock className='h-3 w-3' />
                                {formatDate(mail.created_at)}
                            </span>
                        </span>
                        <span
                            className={cn(
                                'max-w-28 shrink-0 truncate rounded px-2 py-0.5 text-[10px] font-medium',
                                getStatusVariant(mail.status),
                            )}
                        >
                            {t(`account.mail.status.${mail.status}`)}
                        </span>
                    </button>
                ))}
            </div>

            <Dialog
                open={mailModalOpen}
                onClose={() => setMailModalOpen(false)}
                className='flex max-h-[90vh] max-w-5xl flex-col'
            >
                <DialogHeader>
                    <DialogTitle className='text-xl'>{selectedMail?.subject}</DialogTitle>
                    <div className='text-muted-foreground mt-2 flex items-center gap-4 text-sm'>
                        <div className='flex items-center gap-2'>
                            <Clock className='h-4 w-4' />
                            <span>{selectedMail ? formatDate(selectedMail.created_at) : ''}</span>
                        </div>
                        <div
                            className={cn(
                                'rounded px-2 py-1 text-xs font-medium',
                                getStatusVariant(selectedMail?.status || 'pending'),
                            )}
                        >
                            {selectedMail ? t(`account.mail.status.${selectedMail.status}`) : ''}
                        </div>
                    </div>
                </DialogHeader>

                <div className='min-h-0 flex-1 overflow-y-auto'>
                    {selectedMail && (
                        <iframe
                            srcDoc={getIframeContent(selectedMail.body)}
                            className='min-h-[50vh] w-full rounded border-0 bg-white'
                            sandbox='allow-same-origin'
                            title={t('account.mail.mailContent')}
                        />
                    )}
                </div>

                <DialogFooter>
                    <Button variant='outline' type='button' onClick={() => setMailModalOpen(false)}>
                        {t('account.mail.close')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </section>
    );
}
