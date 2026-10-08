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
import { useTranslation } from '@/contexts/TranslationContext';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';

export function SpellInheritanceField({
    realmId,
    spellId,
    value,
    onChange,
    kind,
}: {
    realmId: string;
    spellId?: string;
    value: string;
    onChange: (value: string) => void;
    kind: 'config_from' | 'copy_script_from';
}) {
    const { t } = useTranslation();
    const [spells, setSpells] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!realmId) return;
        const controller = new AbortController();
        setLoading(true);
        setFailed(false);
        const fetchSpells = async () => {
            const options: { id: number; name: string }[] = [];
            let page = 1;
            let pages = 1;
            do {
                const { data } = await axios.get('/api/admin/spells', {
                    params: { realm_id: realmId, limit: 100, page },
                    signal: controller.signal,
                });
                options.push(...(data.data.spells || []));
                pages = data.data.pagination?.total_pages || 1;
                page++;
            } while (page <= pages);
            if (!controller.signal.aborted) setSpells(options.filter((spell) => String(spell.id) !== spellId));
        };
        fetchSpells()
            .catch(() => {
                if (!controller.signal.aborted) setFailed(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [realmId, spellId]);

    const id = `spell-${kind}`;
    return (
        <div className='mb-4 space-y-2'>
            <Label htmlFor={id}>{t(`admin.spells.form.${kind}`)}</Label>
            <Select
                id={id}
                value={value}
                disabled={!realmId || loading || failed}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value=''>{t('admin.spells.form.no_inheritance')}</option>
                {value && !spells.some((spell) => String(spell.id) === value) && <option value={value}>{value}</option>}
                {spells.map((spell) => (
                    <option key={spell.id} value={spell.id}>
                        {spell.name}
                    </option>
                ))}
            </Select>
            {failed && (
                <p role='alert' className='text-destructive text-sm'>
                    {t('admin.spells.messages.fetch_failed')}
                </p>
            )}
        </div>
    );
}
