/*
 * Create user inline (admin server owner picker).
 *
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

import { useState, useEffect, useCallback } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import type { User } from '@/app/(app)/admin/servers/create/types';

interface AvailableRole {
    id: string;
    name: string;
    display_name: string;
    color: string;
}

interface OwnerCreateFormProps {
    onCreated: (user: User) => void;
    onCancel?: () => void;
    showFooter?: boolean;
}

export function OwnerCreateForm({ onCreated, onCancel, showFooter = true }: OwnerCreateFormProps) {
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
    const [form, setForm] = useState({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role_id: '',
    });

    const fetchRoles = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/roles');
            if (data.data.roles) {
                const rolesObj = data.data.roles;
                const rolesList = Array.isArray(rolesObj) ? rolesObj : Object.values(rolesObj);
                setAvailableRoles(
                    rolesList.map((r: { id: string | number; name: string; display_name: string; color: string }) => ({
                        id: String(r.id),
                        name: r.name,
                        display_name: r.display_name,
                        color: r.color,
                    })),
                );
            }
        } catch {
            toast.error(t('admin.users.messages.fetch_failed'));
        }
    }, [t]);

    useEffect(() => {
        void fetchRoles();
    }, [fetchRoles]);

    const handleSubmit = async () => {
        if (!form.username || !form.email || !form.password || !form.role_id || !form.first_name || !form.last_name) {
            toast.error(t('admin.users.create.validation'));
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await axios.put('/api/admin/users', form);
            if (!data?.success) {
                toast.error(data?.message || t('admin.users.messages.create_failed'));
                return;
            }
            const uuid = data?.data?.uuid as string | undefined;
            if (!uuid) {
                toast.error(t('admin.users.messages.create_failed'));
                return;
            }
            const userRes = await axios.get(`/api/admin/users/${uuid}`);
            const u = userRes.data?.data?.user as Record<string, unknown> | undefined;
            if (!u || u.id === undefined || !u.username || !u.email || !u.uuid) {
                toast.error(t('admin.users.messages.create_failed'));
                return;
            }
            toast.success(t('admin.users.messages.created'));
            onCreated({
                id: Number(u.id),
                uuid: String(u.uuid),
                username: String(u.username),
                email: String(u.email),
            });
        } catch (error: unknown) {
            let msg = t('admin.users.messages.create_failed');
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
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <div className='space-y-2'>
                    <Label htmlFor='owner-create-username'>{t('admin.users.create.form.username')}</Label>
                    <Input
                        id='owner-create-username'
                        value={form.username}
                        onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                        placeholder={t('admin.users.create.form.username_placeholder')}
                        autoComplete='off'
                        className='h-11'
                    />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor='owner-create-email'>{t('admin.users.create.form.email')}</Label>
                    <Input
                        id='owner-create-email'
                        type='email'
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder={t('admin.users.create.form.email_placeholder')}
                        autoComplete='off'
                        className='h-11'
                    />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor='owner-create-first'>{t('admin.users.create.form.first_name')}</Label>
                    <Input
                        id='owner-create-first'
                        value={form.first_name}
                        onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                        placeholder={t('admin.users.create.form.first_name_placeholder')}
                        className='h-11'
                    />
                </div>
                <div className='space-y-2'>
                    <Label htmlFor='owner-create-last'>{t('admin.users.create.form.last_name')}</Label>
                    <Input
                        id='owner-create-last'
                        value={form.last_name}
                        onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                        placeholder={t('admin.users.create.form.last_name_placeholder')}
                        className='h-11'
                    />
                </div>
            </div>
            <div className='space-y-2'>
                <Label htmlFor='owner-create-password'>{t('admin.users.create.form.password')}</Label>
                <Input
                    id='owner-create-password'
                    type='password'
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder={t('admin.users.create.form.password_placeholder')}
                    autoComplete='new-password'
                    className='h-11'
                />
            </div>
            <div className='space-y-2'>
                <Label htmlFor='owner-create-role'>{t('admin.users.create.form.role')}</Label>
                <Select
                    id='owner-create-role'
                    value={form.role_id}
                    onChange={(e) => setForm((p) => ({ ...p, role_id: e.target.value }))}
                    className='h-11 w-full'
                >
                    <option value=''>{t('admin.users.create.form.select_role')}</option>
                    {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                            {role.display_name}
                        </option>
                    ))}
                </Select>
            </div>
            <p className='text-muted-foreground text-xs'>{t('admin.servers.form.owner_create_password_hint')}</p>
            {showFooter && (
                <SheetFooter className='px-0 sm:px-0'>
                    {onCancel && (
                        <Button type='button' variant='outline' onClick={onCancel}>
                            {t('common.cancel')}
                        </Button>
                    )}
                    <Button type='button' onClick={() => void handleSubmit()} loading={submitting}>
                        {t('admin.users.create.submit')}
                    </Button>
                </SheetFooter>
            )}
        </div>
    );
}
