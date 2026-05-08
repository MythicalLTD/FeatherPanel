/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

'use client';

import { useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';

export interface CreatedRealm {
    id: number;
    name: string;
    description?: string;
}

interface RealmCreateFormProps {
    onCreated: (realm: CreatedRealm) => void;
    onCancel?: () => void;
    showFooter?: boolean;
}

export function RealmCreateForm({ onCreated, onCancel, showFooter = true }: RealmCreateFormProps) {
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async () => {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            toast.error(t('admin.marketplace.spells.dialog.new_realm_name_error'));
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await axios.put('/api/admin/realms', {
                name: trimmed,
                description: description.trim() || undefined,
            });
            const realm = data?.data?.realm as CreatedRealm | undefined;
            if (!realm?.id) {
                toast.error(t('admin.marketplace.spells.dialog.create_realm_failed'));
                return;
            }
            toast.success(t('admin.realms.messages.created'));
            onCreated(realm);
        } catch (error) {
            console.error('Realm create:', error);
            let msg = t('admin.realms.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className='space-y-4'>
            <div className='space-y-2'>
                <Label className='text-sm font-semibold'>{t('admin.realms.form.name')}</Label>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className='h-11'
                    maxLength={255}
                    placeholder={t('admin.realms.form.name')}
                />
            </div>
            <div className='space-y-2'>
                <Label className='text-sm font-semibold'>{t('admin.realms.form.description')}</Label>
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className='min-h-22 resize-y rounded-xl'
                    maxLength={65535}
                    placeholder={t('admin.realms.form.description')}
                />
            </div>
            {showFooter && (
                <SheetFooter className='px-0 sm:px-0'>
                    {onCancel && (
                        <Button type='button' variant='outline' onClick={onCancel}>
                            {t('common.cancel')}
                        </Button>
                    )}
                    <Button type='button' onClick={() => void handleSubmit()} loading={submitting}>
                        {t('admin.realms.form.submit_create')}
                    </Button>
                </SheetFooter>
            )}
        </div>
    );
}
