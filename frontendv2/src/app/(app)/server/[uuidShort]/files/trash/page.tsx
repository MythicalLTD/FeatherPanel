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

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { filesApi } from '@/lib/files-api';
import { formatBytes } from '@/lib/format';
import { isEnabled } from '@/lib/utils';
import { toast } from 'sonner';
import { TrashList } from '../components/trash/TrashList';
import { TrashActionToolbar } from '../components/trash/TrashActionToolbar';
import { EmptyTrashDialog } from '../components/dialogs/EmptyTrashDialog';
import { RestoreTrashDialog } from '../components/dialogs/RestoreTrashDialog';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';

export default function ServerTrashPage({ params }: { params: Promise<{ uuidShort: string }> }) {
    const { uuidShort } = use(params);
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { hasPermission } = useServerPermissions(uuidShort);

    const [entries, setEntries] = useState<Awaited<ReturnType<typeof filesApi.listTrash>>['entries']>([]);
    const [totalSize, setTotalSize] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<string[]>([]);
    const [emptyOpen, setEmptyOpen] = useState(false);
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const trashEnabled = isEnabled(settings?.file_trash_enabled);
    const canUpdate = hasPermission('file.update');
    const canDelete = hasPermission('file.delete');

    const refresh = useCallback(async () => {
        if (!uuidShort || !trashEnabled) return;
        setLoading(true);
        try {
            const data = await filesApi.listTrash(uuidShort);
            setEntries(data.entries ?? []);
            setTotalSize(data.total_size ?? 0);
            setSelected([]);
        } catch {
            toast.error(t('files.trash.messages.load_error'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, trashEnabled, t]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const headerDescription = useMemo(() => {
        if (entries.length === 0 && !loading) {
            return t('files.trash.empty');
        }
        return t('files.trash.description', {
            count: String(entries.length),
            size: formatBytes(totalSize),
        });
    }, [entries.length, loading, t, totalSize]);

    const toggleSelect = (id: string) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSelectAll = () => {
        if (selected.length === entries.length) {
            setSelected([]);
        } else {
            setSelected(entries.map((e) => e.id));
        }
    };

    const handleRestore = async (overwrite: boolean) => {
        if (!selected.length) return;
        setBusy(true);
        try {
            await filesApi.restoreTrash(uuidShort, selected, overwrite);
            toast.success(t('files.trash.messages.restored'));
            setRestoreOpen(false);
            await refresh();
        } catch (err) {
            const message =
                axios.isAxiosError(err) && err.response?.data?.message
                    ? String(err.response.data.message)
                    : t('files.trash.messages.restore_error');
            toast.error(message);
        } finally {
            setBusy(false);
        }
    };

    const handleDeletePermanent = async () => {
        if (!selected.length) return;
        setBusy(true);
        try {
            await filesApi.deleteTrashEntries(uuidShort, selected);
            toast.success(t('files.trash.messages.deleted'));
            await refresh();
        } catch {
            toast.error(t('files.trash.messages.delete_error'));
        } finally {
            setBusy(false);
        }
    };

    const handleEmpty = async () => {
        setBusy(true);
        try {
            await filesApi.emptyTrash(uuidShort);
            toast.success(t('files.trash.messages.emptied'));
            setEmptyOpen(false);
            await refresh();
        } catch {
            toast.error(t('files.trash.messages.empty_error'));
        } finally {
            setBusy(false);
        }
    };

    if (!trashEnabled) {
        return (
            <div className='relative flex min-h-screen flex-col gap-6 pb-20'>
                <PageHeader title={t('files.trash.title')} description={t('files.trash.disabled')} />
                <Button asChild variant='outline'>
                    <Link href={`/server/${uuidShort}/files`}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('files.trash.back_to_files')}
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className='relative flex min-h-screen flex-col gap-6 pb-20'>
            <PageHeader title={t('files.trash.title')} description={headerDescription} />

            <TrashActionToolbar
                serverUuid={uuidShort}
                loading={loading}
                selectedCount={selected.length}
                canUpdate={canUpdate}
                canDelete={canDelete}
                hasEntries={entries.length > 0}
                busy={busy}
                onRefresh={refresh}
                onClearSelection={() => setSelected([])}
                onRestore={() => setRestoreOpen(true)}
                onDeletePermanent={handleDeletePermanent}
                onEmpty={() => setEmptyOpen(true)}
            />

            <TrashList
                entries={entries}
                loading={loading}
                selectedIds={selected}
                onToggle={toggleSelect}
                onToggleAll={toggleSelectAll}
            />

            <RestoreTrashDialog
                open={restoreOpen}
                onOpenChange={setRestoreOpen}
                count={selected.length}
                onConfirm={handleRestore}
                loading={busy}
            />

            <EmptyTrashDialog
                open={emptyOpen}
                onOpenChange={setEmptyOpen}
                onConfirm={handleEmpty}
                loading={busy}
                disabled={entries.length === 0}
            />
        </div>
    );
}
