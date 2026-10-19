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
import Link from 'next/link';
import { Search, Wand2, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

interface SpellRow {
    id: number;
    name: string;
    description?: string;
    author?: string;
    banner?: string;
    realm?: { name?: string };
}

export default function SpellsApp({ win }: OsAppProps) {
    void win;
    const { t } = useTranslation();
    const { errorMessage } = useFeatherOs();
    const [spells, setSpells] = useState<SpellRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        axios
            .get('/api/user/spells', { params: { per_page: 100 } })
            .then(({ data }) => setSpells(data?.data?.spells ?? data?.data?.data ?? []))
            .catch((e) => toast.error(errorMessage(e)))
            .finally(() => setLoading(false));
    }, [errorMessage]);

    const filtered = spells.filter(
        (s) => !query.trim() || `${s.name} ${s.description ?? ''}`.toLowerCase().includes(query.toLowerCase()),
    );

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 items-center gap-2 border-b px-3'>
                <Wand2 className='text-muted-foreground h-4 w-4' />
                <div className='relative flex-1'>
                    <Search className='text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2' />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('featheros.spells.search')}
                        className='bg-muted/70 h-7 w-full rounded-md pr-2 pl-7 text-[12px] outline-none'
                    />
                </div>
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto p-3'>
                {loading && <Loader2 className='text-muted-foreground mx-auto mt-10 h-5 w-5 animate-spin' />}
                <div className='grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3'>
                    {filtered.map((s) => (
                        <div key={s.id} className='bg-muted/40 flex flex-col rounded-xl border p-3'>
                            <div className='text-[13px] font-semibold'>{s.name}</div>
                            <div className='text-muted-foreground mt-1 line-clamp-3 flex-1 text-[11px]'>
                                {s.description || t('featheros.spells.no_description')}
                            </div>
                            <div className='text-muted-foreground mt-2 flex items-center gap-1 text-[10px]'>
                                <span className='truncate'>{s.realm?.name || s.author || ''}</span>
                                <Link
                                    href='/dashboard/servers'
                                    className='hover:text-foreground ml-auto'
                                    title={t('featheros.spells.use_in_panel')}
                                >
                                    <ExternalLink className='h-3 w-3' />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
                {!loading && filtered.length === 0 && (
                    <p className='text-muted-foreground py-12 text-center text-sm'>{t('featheros.spells.empty')}</p>
                )}
            </div>
            <div className='text-muted-foreground border-t px-3 py-2 text-[11px]'>{t('featheros.spells.hint')}</div>
        </div>
    );
}
