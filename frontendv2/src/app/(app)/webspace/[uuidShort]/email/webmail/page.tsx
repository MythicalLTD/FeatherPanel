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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Select } from '@/components/ui/select-native';
import { Button } from '@/components/featherui/Button';

interface MailboxRow {
    id: number;
    local_part: string;
    domain: string;
    enabled?: number | boolean;
}

export default function WebSpaceWebmailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const uuidShort = String(params.uuidShort || '');
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<MailboxRow[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [frameUrl, setFrameUrl] = useState('');

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/mailboxes`);
            const list = (data?.data?.data || []) as MailboxRow[];
            setRows(list);
            const requested = searchParams.get('mailbox');
            const initial = list.find((r) => String(r.id) === requested) ?? list[0];
            if (initial) {
                setSelectedId(String(initial.id));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [uuidShort, searchParams]);

    useEffect(() => {
        void load();
    }, [load]);

    const openMailbox = useCallback(
        async (mailboxId: string) => {
            if (!mailboxId) return;
            setFrameUrl('');
            try {
                const { data } = await axios.post(
                    `/api/user/webspaces/${uuidShort}/mailboxes/${mailboxId}/webmail/token`,
                );
                if (data?.data?.mode === 'external') {
                    window.location.href = data.data.url;
                    return;
                }
                if (data?.data?.url) {
                    setFrameUrl(data.data.url);
                }
            } catch (err) {
                console.error(err);
            }
        },
        [uuidShort],
    );

    useEffect(() => {
        if (selectedId) {
            void openMailbox(selectedId);
        }
    }, [selectedId, openMailbox]);

    const enabledRows = useMemo(() => rows.filter((r) => r.enabled !== 0 && r.enabled !== false), [rows]);

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
            </div>
        );
    }

    return (
        <div className='space-y-4 pb-12'>
            <PageHeader
                title={t('webSpaces.email.webmail')}
                description={t('webSpaces.email.webmailEmbedHelp')}
                actions={
                    <Button variant='outline' size='sm' onClick={() => router.push(`/webspace/${uuidShort}/email`)}>
                        {t('common.back')}
                    </Button>
                }
            />
            {enabledRows.length > 1 && (
                <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className='max-w-md'>
                    {enabledRows.map((row) => (
                        <option key={row.id} value={String(row.id)}>
                            {row.local_part}@{row.domain}
                        </option>
                    ))}
                </Select>
            )}
            {frameUrl ? (
                <iframe
                    title={t('webSpaces.email.webmail')}
                    src={frameUrl}
                    className='border-border h-[min(80vh,900px)] w-full rounded-xl border bg-white'
                />
            ) : (
                <p className='text-muted-foreground text-sm'>{t('webSpaces.email.openingWebmail')}</p>
            )}
        </div>
    );
}
