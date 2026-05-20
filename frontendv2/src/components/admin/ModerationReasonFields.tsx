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

import { useTranslation } from '@/contexts/TranslationContext';
import { Select } from '@/components/ui/select-native';
import { Textarea } from '@/components/featherui/Textarea';

export const MODERATION_REASON_CATEGORIES = [
    'payment_overdue',
    'terms_violation',
    'abuse_harassment',
    'resource_abuse',
    'security_threat',
    'spam',
    'chargeback',
    'manual_review',
    'other',
] as const;

export type ModerationReasonCategory = (typeof MODERATION_REASON_CATEGORIES)[number];

export interface ModerationReasonValue {
    reason_category: ModerationReasonCategory | '';
    reason_details: string;
}

interface ModerationReasonFieldsProps {
    value: ModerationReasonValue;
    onChange: (value: ModerationReasonValue) => void;
    disabled?: boolean;
}

export function ModerationReasonFields({ value, onChange, disabled = false }: ModerationReasonFieldsProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-4'>
            <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('admin.moderation.reason_category_label')}</label>
                <Select
                    disabled={disabled}
                    value={value.reason_category}
                    onChange={(e) =>
                        onChange({
                            ...value,
                            reason_category: e.target.value as ModerationReasonCategory | '',
                        })
                    }
                >
                    <option value=''>{t('admin.moderation.reason_category_placeholder')}</option>
                    {MODERATION_REASON_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                            {t(`admin.moderation.categories.${category}`)}
                        </option>
                    ))}
                </Select>
            </div>
            <div className='space-y-2'>
                <label className='text-sm font-medium'>{t('admin.moderation.reason_details_label')}</label>
                <Textarea
                    disabled={disabled}
                    rows={4}
                    value={value.reason_details}
                    onChange={(e) => onChange({ ...value, reason_details: e.target.value })}
                    placeholder={t('admin.moderation.reason_details_placeholder')}
                />
                <p className='text-muted-foreground text-xs'>{t('admin.moderation.reason_details_help')}</p>
            </div>
        </div>
    );
}

export function isModerationReasonValid(value: ModerationReasonValue): boolean {
    const details = value.reason_details.trim();
    if (value.reason_category === '' && details.length < 3) {
        return false;
    }
    if (value.reason_category !== '' && details === '') {
        return true;
    }
    return details.length >= 3;
}
