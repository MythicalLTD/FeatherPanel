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
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

interface VarRow {
    variable_id: number;
    name?: string;
    env_variable?: string;
    description?: string;
    variable_value?: string;
}

export default function StartupApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { can, errorMessage } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const [startup, setStartup] = useState('');
    const [vars, setVars] = useState<VarRow[]>([]);
    const [values, setValues] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const canUpdate = can(uuid, 'startup.update');

    useEffect(() => {
        setLoading(true);
        axios
            .get(`/api/user/servers/${uuid}`)
            .then(({ data }) => {
                const s = data?.data;
                setStartup(s?.startup || '');
                const list: VarRow[] = s?.variables || [];
                setVars(list);
                const v: Record<number, string> = {};
                list.forEach((row) => {
                    v[row.variable_id] = row.variable_value ?? '';
                });
                setValues(v);
            })
            .catch((e) => toast.error(errorMessage(e)))
            .finally(() => setLoading(false));
    }, [uuid, errorMessage]);

    const save = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/user/servers/${uuid}`, {
                startup,
                variables: vars.map((v) => ({
                    variable_id: v.variable_id,
                    variable_value: values[v.variable_id] || '',
                })),
            });
            toast.success(t('featheros.startup.saved'));
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    if (loading)
        return (
            <div className='flex h-full items-center justify-center'>
                <Loader2 className='h-5 w-5 animate-spin' />
            </div>
        );

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 items-center border-b px-3'>
                <span className='flex-1 text-[13px] font-medium'>{t('featheros.apps.startup')}</span>
                {canUpdate && (
                    <button
                        type='button'
                        disabled={saving}
                        onClick={() => void save()}
                        className='bg-primary text-primary-foreground flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] font-medium disabled:opacity-50'
                    >
                        {saving ? <Loader2 className='h-3 w-3 animate-spin' /> : <Save className='h-3 w-3' />}
                        {t('featheros.startup.save')}
                    </button>
                )}
            </div>
            <div className='fos-scroll min-h-0 flex-1 space-y-4 overflow-auto p-4'>
                <label className='block text-[12px]'>
                    {t('featheros.startup.command')}
                    <textarea
                        value={startup}
                        disabled={!canUpdate}
                        onChange={(e) => setStartup(e.target.value)}
                        spellCheck={false}
                        className='fos-field bg-muted mt-1 h-24 w-full resize-none rounded-md p-2 font-mono text-[11px] outline-none disabled:opacity-60'
                    />
                </label>
                {vars.map((v) => (
                    <label key={v.variable_id} className='block text-[12px]'>
                        <span className='font-medium'>{v.name || v.env_variable}</span>
                        {v.description && (
                            <span className='text-muted-foreground block text-[11px]'>{v.description}</span>
                        )}
                        <input
                            value={values[v.variable_id] ?? ''}
                            disabled={!canUpdate}
                            onChange={(e) => setValues((cur) => ({ ...cur, [v.variable_id]: e.target.value }))}
                            className='fos-field bg-muted mt-1 h-8 w-full rounded-md px-2 font-mono text-[11px] outline-none disabled:opacity-60'
                        />
                    </label>
                ))}
                {vars.length === 0 && (
                    <p className='text-muted-foreground text-[12px]'>{t('featheros.startup.no_vars')}</p>
                )}
            </div>
        </div>
    );
}
