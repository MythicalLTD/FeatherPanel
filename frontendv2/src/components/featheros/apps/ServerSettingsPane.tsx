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
import axios from 'axios';
import { Loader2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

/** Server name, description and reinstall, same endpoints as the panel settings page. */
export default function ServerSettingsPane({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, errorMessage, refreshServers, confirm } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const canRename = can(uuid, 'settings.rename');
    const canReinstall = can(uuid, 'settings.reinstall');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reinstalling, setReinstalling] = useState(false);

    useEffect(() => {
        setLoading(true);
        axios
            .get(`/api/user/servers/${uuid}`)
            .then(({ data }) => {
                setName(data?.data?.name ?? '');
                setDescription(data?.data?.description ?? '');
            })
            .catch((error) => toast.error(errorMessage(error)))
            .finally(() => setLoading(false));
    }, [uuid, errorMessage]);

    const save = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/user/servers/${uuid}`, { name, description });
            toast.success(t('serverSettings.saveSuccess'));
            void refreshServers();
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const reinstall = async () => {
        const ok = await confirm({
            title: t('featheros.server_workspace.reinstall_title'),
            message: t('featheros.server_workspace.reinstall_body'),
            confirmLabel: t('featheros.server_workspace.reinstall'),
            danger: true,
        });
        if (!ok) return;
        setReinstalling(true);
        try {
            await axios.post(`/api/user/servers/${uuid}/reinstall`, { wipe_files: false });
            toast.success(t('serverSettings.reinstallSuccess'));
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setReinstalling(false);
        }
    };

    if (loading) {
        return (
            <div className='flex h-full items-center justify-center'>
                <Loader2 className='h-5 w-5 animate-spin opacity-60' />
            </div>
        );
    }

    const field =
        'w-full rounded-lg border border-[var(--fos-hairline)] bg-[var(--fos-field,transparent)] px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[var(--fos-accent,#0a84ff)]/40 disabled:opacity-50';

    return (
        <div className='fos-scroll h-full overflow-y-auto p-6 pt-14'>
            <div className='mx-auto max-w-xl space-y-6'>
                <section className='fos-server-ws-card space-y-3'>
                    <h3 className='text-[13px] font-semibold'>{t('featheros.server_workspace.general')}</h3>
                    <label className='block space-y-1 text-[12px]'>
                        <span className='text-[var(--fos-secondary)]'>{t('featheros.server_workspace.name')}</span>
                        <input
                            className={field}
                            value={name}
                            disabled={!canRename}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <label className='block space-y-1 text-[12px]'>
                        <span className='text-[var(--fos-secondary)]'>
                            {t('featheros.server_workspace.description')}
                        </span>
                        <textarea
                            className={field}
                            rows={3}
                            value={description}
                            disabled={!canRename}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </label>
                    {canRename && (
                        <button
                            type='button'
                            className='fos-server-ws-btn'
                            disabled={saving || !name.trim()}
                            onClick={() => void save()}
                        >
                            {saving ? (
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                                <Save className='h-3.5 w-3.5' />
                            )}
                            {t('featheros.server_workspace.save')}
                        </button>
                    )}
                </section>
                {canReinstall && (
                    <section className='fos-server-ws-card space-y-3'>
                        <h3 className='text-[13px] font-semibold'>{t('featheros.server_workspace.reinstall_title')}</h3>
                        <p className='text-[12px] text-[var(--fos-secondary)]'>
                            {t('featheros.server_workspace.reinstall_body')}
                        </p>
                        <button
                            type='button'
                            className='fos-server-ws-btn is-danger'
                            disabled={reinstalling}
                            onClick={() => void reinstall()}
                        >
                            {reinstalling ? (
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                                <RotateCcw className='h-3.5 w-3.5' />
                            )}
                            {t('featheros.server_workspace.reinstall')}
                        </button>
                    </section>
                )}
            </div>
        </div>
    );
}
