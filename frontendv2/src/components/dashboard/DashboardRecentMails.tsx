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

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Dialog, DialogPanel, DialogTitle, Description as DialogDescription } from '@headlessui/react';
import { Button } from '@/components/ui/button';
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
        } finally {
            setLoading(false);
        }
    }, []);

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
            <div className='border-border/50 bg-card/50 space-y-4 rounded-xl border p-6 backdrop-blur-xl'>
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

    return (
        <div className='border-border/50 bg-card/50 rounded-xl border backdrop-blur-xl'>
            <div className='border-border flex min-w-0 flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
                <div className='flex min-w-0 items-center gap-2'>
                    <Mail className='text-muted-foreground h-5 w-5' />
                    <h2 className='truncate text-base font-bold sm:text-lg'>{t('dashboard.recent_mails.title')}</h2>
                </div>
                <div className='flex items-center gap-3 self-start sm:self-auto'>
                    <button
                        type='button'
                        onClick={() => fetchMails()}
                        title={t('account.mail.refresh')}
                        className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs whitespace-nowrap transition-colors sm:text-sm'
                    >
                        <RefreshCw className='h-4 w-4' />
                        <span className='hidden sm:inline'>{t('account.mail.refresh')}</span>
                    </button>
                    <Link
                        href='/dashboard/account?tab=mail'
                        className='text-primary hover:text-primary/80 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm'
                    >
                        {t('dashboard.recent_mails.view_all')} &rarr;
                    </Link>
                </div>
            </div>

            <div className='divide-border divide-y'>
                {mails.length > 0 ? (
                    mails.map((mail) => (
                        <button
                            key={mail.id}
                            type='button'
                            onClick={() => openMailModal(mail)}
                            className='hover:bg-muted/50 group w-full p-4 text-left transition-colors'
                        >
                            <div className='flex min-w-0 flex-col justify-between gap-3 sm:flex-row sm:items-center sm:gap-4'>
                                <div className='flex min-w-0 items-start gap-3 sm:gap-4'>
                                    <div className='bg-primary/5 text-primary mt-1 shrink-0 rounded-full p-2 sm:mt-0'>
                                        <Mail className='h-5 w-5' />
                                    </div>
                                    <div className='min-w-0'>
                                        <h4
                                            className='text-foreground group-hover:text-primary line-clamp-2 text-sm font-medium wrap-break-word transition-colors sm:text-base'
                                            title={mail.subject}
                                        >
                                            {mail.subject}
                                        </h4>
                                        <div className='text-muted-foreground mt-1 flex items-center gap-2 text-xs'>
                                            <Clock className='h-3 w-3' />
                                            <span>{formatDate(mail.created_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        'max-w-36 shrink-0 truncate rounded px-2 py-1 text-[10px] font-medium',
                                        getStatusVariant(mail.status),
                                    )}
                                >
                                    {t(`account.mail.status.${mail.status}`)}
                                </div>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className='text-muted-foreground p-8 text-center'>
                        <Mail className='mx-auto mb-2 h-8 w-8 opacity-50' />
                        <p>{t('account.mail.noMails')}</p>
                        <Link
                            href='/dashboard/account?tab=mail'
                            className='text-primary mt-4 inline-flex items-center text-sm hover:underline'
                        >
                            {t('dashboard.recent_mails.open_mail_tab')}
                        </Link>
                    </div>
                )}
            </div>

            <Dialog open={mailModalOpen} onClose={() => setMailModalOpen(false)} className='relative z-50'>
                <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
                <div className='fixed inset-0 flex items-center justify-center p-4'>
                    <DialogPanel className='bg-card/50 border-border/50 flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border p-6 backdrop-blur-xl'>
                        <DialogTitle className='text-foreground mb-2 text-xl font-semibold'>
                            {selectedMail?.subject}
                        </DialogTitle>
                        <DialogDescription className='text-muted-foreground mb-4 flex items-center gap-4 text-sm'>
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
                        </DialogDescription>

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

                        <div className='mt-4 flex justify-end'>
                            <Button variant='outline' type='button' onClick={() => setMailModalOpen(false)}>
                                {t('account.mail.close')}
                            </Button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </div>
    );
}
