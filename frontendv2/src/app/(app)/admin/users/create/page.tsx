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

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorCode, getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import axios from 'axios';
import { ArrowLeft, UserPlus, RefreshCw, Eye, EyeOff, Wand2, Copy } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { UnsavedChangesBar } from '@/components/featherui/UnsavedChangesBar';
import { useFormBaseline } from '@/hooks/useFormBaseline';

interface AvailableRole {
    id: string;
    name: string;
    display_name: string;
}

type Field = 'email' | 'username' | 'first_name' | 'last_name' | 'password' | 'role_id';
type FieldErrors = Partial<Record<Field, string>>;

const FIELD_ORDER: Field[] = ['email', 'username', 'first_name', 'last_name', 'password', 'role_id'];
const FIELD_IDS: Record<Field, string> = {
    email: 'create-email',
    username: 'create-username',
    first_name: 'create-firstname',
    last_name: 'create-lastname',
    password: 'create-password',
    role_id: 'create-role',
};
// Backend codes that belong to one field; shown under it instead of as a toast.
const CODE_FIELD: Record<string, Field> = {
    EMAIL_ALREADY_EXISTS: 'email',
    INVALID_EMAIL_ADDRESS: 'email',
    USERNAME_ALREADY_EXISTS: 'username',
    INVALID_USERNAME_FORMAT: 'username',
};
// Same limits as the backend (UsersController::create).
const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%*-_';

function generatePassword(length = 16): string {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}

/** "jane.doe+test@x.io" -> "jane_doe_test", trimmed to the backend's 32 characters. */
function usernameFromEmail(email: string): string {
    const local = email.split('@')[0] ?? '';
    return local
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 32);
}

export default function CreateUserPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [creating, setCreating] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
    const [createForm, setCreateForm] = useState({
        email: '',
        username: '',
        first_name: '',
        last_name: '',
        password: '',
        role_id: '',
    });
    const { dirty: unsaved, restore: restoreForm, commit } = useFormBaseline(createForm, { trackFromStart: true });
    const [usernameEdited, setUsernameEdited] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [submitted, setSubmitted] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-users-create');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchRoles = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/roles', { params: { page: 1, limit: 100 } });
            const rolesObj = data?.data?.roles;
            if (!rolesObj) return;
            const rolesList = Array.isArray(rolesObj) ? rolesObj : Object.values(rolesObj);
            const roles: AvailableRole[] = rolesList.map(
                (r: { id: string | number; name: string; display_name: string }) => ({
                    id: String(r.id),
                    name: r.name,
                    display_name: r.display_name,
                }),
            );
            setAvailableRoles(roles);
            // Start on the regular user role (the backend default) so the common case needs no choice.
            const fallback = roles.find((r) => r.name === 'user') ?? roles.find((r) => r.id === '1');
            if (fallback) {
                setCreateForm((prev) => {
                    if (prev.role_id) return prev;
                    const next = { ...prev, role_id: fallback.id };
                    commit(next);
                    return next;
                });
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin.users.messages.fetch_failed'));
        }
    }, [t, commit]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const validate = useCallback(
        (form: typeof createForm): FieldErrors => {
            const next: FieldErrors = {};
            const v = (key: string) => t(`admin.users.create.errors.${key}`);
            if (!form.email.trim()) next.email = v('required');
            else if (!EMAIL_RE.test(form.email.trim())) next.email = v('email');
            if (!form.username) next.username = v('required');
            else if (!USERNAME_RE.test(form.username)) next.username = v('username');
            if (!form.first_name.trim()) next.first_name = v('required');
            if (!form.last_name.trim()) next.last_name = v('required');
            if (form.password.length < 8) next.password = v('password');
            if (!form.role_id) next.role_id = v('role');
            return next;
        },
        [t],
    );

    const update = (patch: Partial<typeof createForm>) => {
        const next = { ...createForm, ...patch };
        setCreateForm(next);
        if (submitted) setErrors(validate(next));
    };

    const onEmailChange = (email: string) => {
        update(usernameEdited ? { email } : { email, username: usernameFromEmail(email) });
    };

    const focusField = (field: Field) => document.getElementById(FIELD_IDS[field])?.focus();

    const handleCreateUser = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setSubmitted(true);
        const form = { ...createForm, email: createForm.email.trim() };
        const found = validate(form);
        setErrors(found);
        const firstInvalid = FIELD_ORDER.find((f) => found[f]);
        if (firstInvalid) {
            focusField(firstInvalid);
            return;
        }

        setCreating(true);
        try {
            const { data } = await axios.put('/api/admin/users', form);
            if (data?.success) {
                toast.success(t('admin.users.messages.created'));
                commit(createForm);
                const uuid = data?.data?.uuid;
                router.push(uuid ? `/admin/users/${uuid}/edit` : '/admin/users');
            } else {
                toast.error(getApiErrorMessageFromPayload(data, t, 'admin.users.messages.create_failed'));
            }
        } catch (error: unknown) {
            const message = getApiErrorMessage(error, t, 'admin.users.messages.create_failed');
            const field = CODE_FIELD[getApiErrorCode(error) ?? ''];
            if (field) {
                setErrors((prev) => ({ ...prev, [field]: message }));
                focusField(field);
            } else {
                toast.error(message);
            }
        } finally {
            setCreating(false);
        }
    };

    const fillGeneratedPassword = () => {
        update({ password: generatePassword() });
        setShowPassword(true);
    };

    const copyPassword = async () => {
        try {
            await navigator.clipboard.writeText(createForm.password);
            toast.success(t('admin.users.create.form.password_copied'));
        } catch {
            toast.error(t('common.error'));
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-users-create', 'top-of-page')} />

            <PageHeader
                title={t('admin.users.create.title')}
                description={t('admin.users.create.description')}
                icon={UserPlus}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/users')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('admin.users.back_to_list')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-users-create', 'after-header')} />

            <PageCard
                title={t('admin.users.create.form.title')}
                description={t('admin.users.create.form.description')}
                icon={UserPlus}
                className='max-w-3xl'
            >
                <form onSubmit={handleCreateUser} noValidate className='space-y-6' data-fp-save-shortcut>
                    <Input
                        id={FIELD_IDS.email}
                        type='email'
                        autoComplete='off'
                        data-fp-sensitive=''
                        label={t('admin.users.create.form.email')}
                        description={t('admin.users.create.form.email_hint')}
                        value={createForm.email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        placeholder={t('admin.users.create.form.email_placeholder')}
                        error={errors.email}
                        autoFocus
                    />

                    <Input
                        id={FIELD_IDS.username}
                        autoComplete='off'
                        label={t('admin.users.create.form.username')}
                        description={t('admin.users.create.form.username_hint')}
                        value={createForm.username}
                        onChange={(e) => {
                            setUsernameEdited(e.target.value !== '');
                            update({ username: e.target.value });
                        }}
                        placeholder={t('admin.users.create.form.username_placeholder')}
                        error={errors.username}
                        maxLength={32}
                    />

                    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                        <Input
                            id={FIELD_IDS.first_name}
                            autoComplete='off'
                            label={t('admin.users.create.form.first_name')}
                            value={createForm.first_name}
                            onChange={(e) => update({ first_name: e.target.value })}
                            placeholder={t('admin.users.create.form.first_name_placeholder')}
                            error={errors.first_name}
                            maxLength={64}
                        />
                        <Input
                            id={FIELD_IDS.last_name}
                            autoComplete='off'
                            label={t('admin.users.create.form.last_name')}
                            value={createForm.last_name}
                            onChange={(e) => update({ last_name: e.target.value })}
                            placeholder={t('admin.users.create.form.last_name_placeholder')}
                            error={errors.last_name}
                            maxLength={64}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor={FIELD_IDS.password} className='text-sm font-semibold'>
                            {t('admin.users.create.form.password')}
                        </Label>
                        <p className='text-muted-foreground text-sm'>{t('admin.users.create.form.password_hint')}</p>
                        <div className='flex flex-col gap-2 sm:flex-row'>
                            <div className='relative min-w-0 flex-1'>
                                <Input
                                    id={FIELD_IDS.password}
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete='new-password'
                                    value={createForm.password}
                                    onChange={(e) => update({ password: e.target.value })}
                                    placeholder={t('admin.users.create.form.password_placeholder')}
                                    error={Boolean(errors.password)}
                                    aria-describedby={errors.password ? 'create-password-error' : undefined}
                                    className='pr-20 font-mono'
                                />
                                <div className='absolute top-1/2 right-2 flex -translate-y-1/2 gap-1'>
                                    {createForm.password && (
                                        <Button
                                            type='button'
                                            size='icon'
                                            variant='ghost'
                                            className='h-8 w-8'
                                            onClick={() => void copyPassword()}
                                            aria-label={t('admin.users.create.form.copy_password')}
                                            title={t('admin.users.create.form.copy_password')}
                                        >
                                            <Copy className='h-4 w-4' />
                                        </Button>
                                    )}
                                    <Button
                                        type='button'
                                        size='icon'
                                        variant='ghost'
                                        className='h-8 w-8'
                                        onClick={() => setShowPassword((s) => !s)}
                                        aria-label={
                                            showPassword
                                                ? t('admin.users.create.form.hide_password')
                                                : t('admin.users.create.form.show_password')
                                        }
                                        aria-pressed={showPassword}
                                    >
                                        {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                                    </Button>
                                </div>
                            </div>
                            <Button type='button' variant='outline' className='h-12' onClick={fillGeneratedPassword}>
                                <Wand2 className='mr-2 h-4 w-4' />
                                {t('admin.users.create.form.generate_password')}
                            </Button>
                        </div>
                        {errors.password && (
                            <p id='create-password-error' className='text-destructive text-sm' role='alert'>
                                {errors.password}
                            </p>
                        )}
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor={FIELD_IDS.role_id} className='text-sm font-semibold'>
                            {t('admin.users.create.form.role')}
                        </Label>
                        <p className='text-muted-foreground text-sm'>{t('admin.users.create.form.role_hint')}</p>
                        <Select
                            id={FIELD_IDS.role_id}
                            value={createForm.role_id}
                            onChange={(e) => update({ role_id: e.target.value })}
                            className='w-full'
                            aria-invalid={Boolean(errors.role_id) || undefined}
                        >
                            <option value=''>{t('admin.users.create.form.select_role')}</option>
                            {availableRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.display_name}
                                </option>
                            ))}
                        </Select>
                        {errors.role_id && (
                            <p className='text-destructive text-sm' role='alert'>
                                {errors.role_id}
                            </p>
                        )}
                    </div>

                    <div className='flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end'>
                        <Button type='button' variant='outline' onClick={() => router.push('/admin/users')}>
                            {t('common.cancel')}
                        </Button>
                        <Button type='submit' disabled={creating}>
                            {creating ? (
                                <>
                                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                    {t('admin.users.create.creating')}
                                </>
                            ) : (
                                <>
                                    <UserPlus className='mr-2 h-4 w-4' />
                                    {t('admin.users.create.submit')}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </PageCard>

            <WidgetRenderer widgets={getWidgets('admin-users-create', 'bottom-of-page')} />

            <UnsavedChangesBar
                dirty={unsaved}
                saving={creating}
                onSave={() => void handleCreateUser()}
                onDiscard={() => {
                    const saved = restoreForm();
                    if (saved) {
                        setCreateForm(saved);
                        setErrors({});
                        setSubmitted(false);
                        setUsernameEdited(false);
                    }
                }}
                saveLabel={t('admin.users.create.submit')}
            />
        </div>
    );
}
