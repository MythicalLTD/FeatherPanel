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
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';

export interface AbuseIPDBCategory {
    id: number;
    title: string;
    description: string;
}

export interface AbuseIPDBReportValue {
    report_to_abuseipdb: boolean;
    abuseipdb_categories: number[];
}

interface AbuseIPDBBanReportFieldsProps {
    value: AbuseIPDBReportValue;
    onChange: (value: AbuseIPDBReportValue) => void;
    disabled?: boolean;
}

export function AbuseIPDBBanReportFields({ value, onChange, disabled = false }: AbuseIPDBBanReportFieldsProps) {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<AbuseIPDBCategory[]>([]);
    const [configured, setConfigured] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await axios.get('/api/admin/abuseipdb/status');
                if (cancelled) return;
                if (data?.success && data?.data) {
                    setConfigured(Boolean(data.data.configured));
                    setCategories(Array.isArray(data.data.categories) ? data.data.categories : []);
                }
            } catch {
                if (!cancelled) {
                    setConfigured(false);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading || !configured) {
        return null;
    }

    const selectedCategory = value.abuseipdb_categories.length > 0 ? value.abuseipdb_categories[0] : undefined;

    return (
        <div className='border-border/60 space-y-3 rounded-md border p-3'>
            <div className='flex items-start gap-3'>
                <Checkbox
                    id='report-to-abuseipdb'
                    checked={value.report_to_abuseipdb}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                        onChange({
                            ...value,
                            report_to_abuseipdb: Boolean(checked),
                        })
                    }
                />
                <div className='space-y-1'>
                    <Label htmlFor='report-to-abuseipdb' className='cursor-pointer font-medium'>
                        {t('admin.abuseipdb.ban.report_label')}
                    </Label>
                    <p className='text-muted-foreground text-xs'>{t('admin.abuseipdb.ban.report_help')}</p>
                </div>
            </div>

            {value.report_to_abuseipdb && (
                <div className='space-y-2 pl-7'>
                    <Label htmlFor='abuseipdb-category'>{t('admin.abuseipdb.ban.category_label')}</Label>
                    <Select
                        id='abuseipdb-category'
                        disabled={disabled}
                        value={selectedCategory === undefined ? '' : String(selectedCategory)}
                        onChange={(e) => {
                            const next = e.target.value === '' ? [] : [Number(e.target.value)];
                            onChange({
                                ...value,
                                abuseipdb_categories: next,
                            });
                        }}
                    >
                        <option value=''>{t('admin.abuseipdb.ban.category_placeholder')}</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.id}. {category.title}
                            </option>
                        ))}
                    </Select>
                    {selectedCategory !== undefined && (
                        <p className='text-muted-foreground text-xs'>
                            {categories.find((c) => c.id === selectedCategory)?.description}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export function isAbuseIPDBReportValid(value: AbuseIPDBReportValue): boolean {
    if (!value.report_to_abuseipdb) {
        return true;
    }
    return value.abuseipdb_categories.length > 0;
}
