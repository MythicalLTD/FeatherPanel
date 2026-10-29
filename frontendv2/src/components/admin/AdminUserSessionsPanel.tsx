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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { MonitorSmartphone, LogOut } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { parseApiDate } from '@/lib/dateUtils';
import Permissions from '@/lib/permissions';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface AdminSession {
    id: number;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    last_seen_at: string | null;
}

function formatDate(value: string | null): string {
    return parseApiDate(value)?.toLocaleString() ?? '-';
}

/** Admin view of a user's signed-in devices with sign-out controls. */
export function AdminUserSessionsPanel({ userUuid }: { userUuid: string }) {
    const { t } = useTranslation();
    const { hasPermission, user: me } = useSession();
    const canEdit = hasPermission(Permissions.ADMIN_USERS_EDIT) && me?.uuid !== userUuid;
    const [sessions, setSessions] = useState<AdminSession[] | null>(null);
    const [twoFa, setTwoFa] = useState<{ enabled: boolean; required: boolean } | null>(null);
    const [pending, setPending] = useState<AdminSession | 'all' | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/admin/users/${userUuid}/sessions`);
            setSessions(data.data.sessions);
            setTwoFa({ enabled: data.data.two_fa_enabled, required: data.data.two_fa_required });
        } catch (error) {
            setSessions([]);
            toast.error(getApiErrorMessage(error, t, 'admin.users.edit.sessions.loadFailed'));
        }
    }, [userUuid, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const confirm = async () => {
        if (!pending) return;
        setBusy(true);
        try {
            if (pending === 'all') {
                await axios.post(`/api/admin/users/${userUuid}/sessions/revoke-all`);
                toast.success(t('admin.users.edit.sessions.revokedAll'));
            } else {
                await axios.delete(`/api/admin/users/${userUuid}/sessions/${pending.id}`);
                toast.success(t('admin.users.edit.sessions.revoked'));
            }
            setPending(null);
            await load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin.users.edit.sessions.revokeFailed'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <PageCard
            title={t('admin.users.edit.sessions.title')}
            description={t('admin.users.edit.sessions.description')}
            icon={MonitorSmartphone}
            action={
                canEdit && sessions && sessions.length > 0 ? (
                    <Button size='sm' variant='destructive' onClick={() => setPending('all')}>
                        <LogOut className='mr-2 h-4 w-4' />
                        {t('admin.users.edit.sessions.revokeAll')}
                    </Button>
                ) : undefined
            }
        >
            {twoFa && (
                <div className='mb-4 flex flex-wrap gap-2'>
                    <Badge variant={twoFa.enabled ? 'secondary' : 'outline'}>
                        {twoFa.enabled
                            ? t('admin.users.edit.sessions.twoFaOn')
                            : t('admin.users.edit.sessions.twoFaOff')}
                    </Badge>
                    {twoFa.required && !twoFa.enabled && (
                        <Badge variant='destructive'>{t('admin.users.edit.sessions.twoFaRequired')}</Badge>
                    )}
                </div>
            )}
            {sessions === null ? (
                <p className='text-muted-foreground py-6 text-center text-sm'>{t('common.loading')}</p>
            ) : sessions.length === 0 ? (
                <p className='text-muted-foreground py-6 text-center text-sm'>{t('admin.users.edit.sessions.empty')}</p>
            ) : (
                <ul className='divide-y divide-[var(--fp-surface-border)]'>
                    {sessions.map((s) => (
                        <li key={s.id} className='flex flex-col gap-2 py-3 sm:flex-row sm:items-center'>
                            <div className='min-w-0 flex-1'>
                                <p className='truncate text-sm font-medium' title={s.user_agent ?? ''}>
                                    {s.user_agent || t('admin.users.edit.sessions.unknownDevice')}
                                </p>
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.users.edit.sessions.meta', {
                                        ip: s.ip_address || '-',
                                        lastSeen: formatDate(s.last_seen_at ?? s.created_at),
                                        created: formatDate(s.created_at),
                                    })}
                                </p>
                            </div>
                            {canEdit && (
                                <Button
                                    size='sm'
                                    variant='outline'
                                    className='self-start sm:self-auto'
                                    onClick={() => setPending(s)}
                                >
                                    {t('admin.users.edit.sessions.revoke')}
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => !open && setPending(null)}
                title={
                    pending === 'all'
                        ? t('admin.users.edit.sessions.confirmAllTitle')
                        : t('admin.users.edit.sessions.confirmTitle')
                }
                description={
                    pending === 'all'
                        ? t('admin.users.edit.sessions.confirmAllDescription')
                        : t('admin.users.edit.sessions.confirmDescription')
                }
                confirmLabel={t('admin.users.edit.sessions.revoke')}
                cancelLabel={t('common.cancel')}
                onConfirm={confirm}
                loading={busy}
                destructive
            />
        </PageCard>
    );
}
