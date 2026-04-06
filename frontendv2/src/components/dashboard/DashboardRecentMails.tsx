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
            <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl p-6 space-y-4'>
                <div className='flex items-center justify-between'>
                    <div className='h-6 w-36 bg-muted animate-pulse rounded' />
                    <div className='h-4 w-24 bg-muted animate-pulse rounded' />
                </div>
                <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className='h-16 bg-muted/50 animate-pulse rounded-lg' />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className='rounded-xl border border-border/50 bg-card/50 backdrop-blur-xl'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b border-border min-w-0'>
                <div className='flex items-center gap-2 min-w-0'>
                    <Mail className='h-5 w-5 text-muted-foreground' />
                    <h2 className='text-base sm:text-lg font-bold truncate'>{t('dashboard.recent_mails.title')}</h2>
                </div>
                <div className='flex items-center gap-3 self-start sm:self-auto'>
                    <button
                        type='button'
                        onClick={() => fetchMails()}
                        title={t('account.mail.refresh')}
                        className='inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap'
                    >
                        <RefreshCw className='h-4 w-4' />
                        <span className='hidden sm:inline'>{t('account.mail.refresh')}</span>
                    </button>
                    <Link
                        href='/dashboard/account?tab=mail'
                        className='text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap'
                    >
                        {t('dashboard.recent_mails.view_all')} &rarr;
                    </Link>
                </div>
            </div>

            <div className='divide-y divide-border'>
                {mails.length > 0 ? (
                    mails.map((mail) => (
                        <button
                            key={mail.id}
                            type='button'
                            onClick={() => openMailModal(mail)}
                            className='w-full text-left p-4 hover:bg-muted/50 transition-colors group'
                        >
                            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0'>
                                <div className='flex items-start gap-3 sm:gap-4 min-w-0'>
                                    <div className='p-2 rounded-full bg-primary/5 text-primary shrink-0 mt-1 sm:mt-0'>
                                        <Mail className='h-5 w-5' />
                                    </div>
                                    <div className='min-w-0'>
                                        <h4
                                            className='font-medium text-foreground group-hover:text-primary transition-colors text-sm sm:text-base wrap-break-word line-clamp-2'
                                            title={mail.subject}
                                        >
                                            {mail.subject}
                                        </h4>
                                        <div className='flex items-center gap-2 mt-1 text-xs text-muted-foreground'>
                                            <Clock className='h-3 w-3' />
                                            <span>{formatDate(mail.created_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={cn(
                                        'px-2 py-1 rounded text-[10px] font-medium shrink-0 max-w-36 truncate',
                                        getStatusVariant(mail.status),
                                    )}
                                >
                                    {t(`account.mail.status.${mail.status}`)}
                                </div>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className='p-8 text-center text-muted-foreground'>
                        <Mail className='h-8 w-8 mx-auto mb-2 opacity-50' />
                        <p>{t('account.mail.noMails')}</p>
                        <Link
                            href='/dashboard/account?tab=mail'
                            className='mt-4 inline-flex items-center text-sm text-primary hover:underline'
                        >
                            {t('dashboard.recent_mails.open_mail_tab')}
                        </Link>
                    </div>
                )}
            </div>

            <Dialog open={mailModalOpen} onClose={() => setMailModalOpen(false)} className='relative z-50'>
                <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
                <div className='fixed inset-0 flex items-center justify-center p-4'>
                    <DialogPanel className='w-full max-w-5xl max-h-[90vh] rounded-xl bg-card/50 backdrop-blur-xl border border-border/50 p-6 flex flex-col'>
                        <DialogTitle className='text-xl font-semibold text-foreground mb-2'>
                            {selectedMail?.subject}
                        </DialogTitle>
                        <DialogDescription className='flex items-center gap-4 text-sm text-muted-foreground mb-4'>
                            <div className='flex items-center gap-2'>
                                <Clock className='h-4 w-4' />
                                <span>{selectedMail ? formatDate(selectedMail.created_at) : ''}</span>
                            </div>
                            <div
                                className={cn(
                                    'px-2 py-1 rounded text-xs font-medium',
                                    getStatusVariant(selectedMail?.status || 'pending'),
                                )}
                            >
                                {selectedMail ? t(`account.mail.status.${selectedMail.status}`) : ''}
                            </div>
                        </DialogDescription>

                        <div className='flex-1 overflow-y-auto min-h-0'>
                            {selectedMail && (
                                <iframe
                                    srcDoc={getIframeContent(selectedMail.body)}
                                    className='w-full min-h-[50vh] border-0 bg-white rounded'
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
