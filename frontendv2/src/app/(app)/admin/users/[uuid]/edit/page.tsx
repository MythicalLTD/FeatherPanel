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

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import {
    User,
    Users,
    Shield,
    Mail,
    Server as ServerIcon,
    Activity,
    Key,
    Ban,
    Unlock,
    Trash2,
    ArrowLeft,
    Edit,
    RefreshCw,
    RotateCcw,
    Copy,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select-native';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    ModerationReasonFields,
    ModerationReasonValue,
    isModerationReasonValid,
} from '@/components/admin/ModerationReasonFields';
import { ModerationStatusCard } from '@/components/admin/ModerationStatusCard';
import { copyToClipboard } from '@/lib/utils';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useSettings } from '@/contexts/SettingsContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { RoleBadge } from '@/components/RoleBadge';

interface UserRole {
    name: string;
    display_name: string;
    custom_badge?: string | null;
    color: string;
}

interface ApiUser {
    id?: number;
    uuid: string;
    avatar: string;
    username: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    external_id?: number | null;
    first_ip?: string;
    last_ip?: string;
    banned?: string;
    ban_reason?: string | null;
    banned_at?: string | null;
    banned_by?: { uuid?: string | null; username?: string | null } | null;
    two_fa_enabled?: string;
    two_fa_blocked?: string;
    deleted?: boolean | string;
    locked?: boolean | string;
    first_seen?: string;
    last_seen?: string;
    created_at?: string;
    updated_at?: string;
    role_id?: number;
    role?: UserRole;
    discord_oauth2_id?: string | null;
    discord_oauth2_linked?: string;
    discord_oauth2_username?: string | null;
    discord_oauth2_name?: string | null;
    oidc_provider?: string | null;
    oidc_subject?: string | null;
    ldap_provider_uuid?: string | null;
    ldap_dn?: string | null;
    activities?: { name: string; context: string; ip_address: string; created_at: string }[];
    mails?: { id: number; subject: string; status: string; created_at: string; body?: string }[];
}

interface EditForm {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    role_id: string;
    external_id?: number | null;
    password?: string;
}

interface Server {
    id: number;
    name: string;
    description?: string;
    status?: string;
    uuidShort: string;
    created_at: string;
}

interface VmInstance {
    id: number;
    hostname?: string;
    status?: string;
    vmid: number;
    vm_type?: 'qemu' | 'lxc';
    ip_address?: string | null;
    pve_node?: string | null;
    node_name?: string | null;
    suspended?: number;
    created_at?: string;
}

interface PotentialAlt {
    uuid: string;
    username: string;
    email?: string;
    avatar: string;
    banned?: string;
    last_seen?: string;
    first_ip?: string;
    last_ip?: string;
    role?: UserRole;
    shared_ips: string[];
    shared_devices: string[];
    match_reasons: string[];
    match_count: number;
    confidence?: 'high' | 'medium' | 'low';
}

interface AvailableRole {
    id: string;
    name: string;
    display_name: string;
    color: string;
}

export default function UserEditPage({ params }: { params: Promise<{ uuid: string }> }) {
    const { t } = useTranslation();
    const router = useRouter();
    const resolvedParams = use(params);
    const { settings } = useSettings();
    const dateOpts = useDateFormatOptions();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState<ApiUser | null>(null);
    const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
    const [ownedServers, setOwnedServers] = useState<Server[]>([]);
    const [ownedVms, setOwnedVms] = useState<VmInstance[]>([]);
    const [potentialAlts, setPotentialAlts] = useState<PotentialAlt[]>([]);
    const [altSourceIps, setAltSourceIps] = useState<string[]>([]);
    const [altSourceDevices, setAltSourceDevices] = useState<string[]>([]);
    const [clearingDevices, setClearingDevices] = useState(false);
    const [ssoGenerating, setSsoGenerating] = useState(false);
    const [ssoLink, setSsoLink] = useState<string | null>(null);
    const [mailPreview, setMailPreview] = useState<{
        subject: string;
        body?: string;
        status: string;
        created_at: string;
    } | null>(null);
    const [mailPreviewOpen, setMailPreviewOpen] = useState(false);
    const [sendEmailOpen, setSendEmailOpen] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendEmailData, setSendEmailData] = useState({ subject: '', body: '' });
    const [resendingMailId, setResendingMailId] = useState<number | null>(null);
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [banSubmitting, setBanSubmitting] = useState(false);
    const [banReason, setBanReason] = useState<ModerationReasonValue>({
        reason_category: '',
        reason_details: '',
    });

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-users-edit');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [editForm, setEditForm] = useState<EditForm>({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        role_id: '',
        external_id: undefined,
        password: '',
    });

    const fetchUser = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/users/${resolvedParams.uuid}`);
            const apiUser: ApiUser = data.data.user;
            setUser(apiUser);

            try {
                const rolesRes = await axios.get('/api/admin/roles');
                if (rolesRes.data?.data?.roles) {
                    const rolesObj = rolesRes.data.data.roles;

                    const rolesList = Array.isArray(rolesObj) ? rolesObj : Object.values(rolesObj);

                    setAvailableRoles(
                        rolesList.map(
                            (r: { id: string | number; name: string; display_name: string; color: string }) => ({
                                id: String(r.id),
                                name: r.name,
                                display_name: r.display_name,
                                color: r.color,
                            }),
                        ),
                    );
                }
            } catch (e) {
                console.error('Failed to fetch roles', e);
            }

            setEditForm({
                username: apiUser.username || '',
                first_name: apiUser.first_name || '',
                last_name: apiUser.last_name || '',
                email: apiUser.email || '',
                role_id: apiUser.role_id != null ? String(apiUser.role_id) : '',
                external_id:
                    apiUser.external_id !== null && apiUser.external_id !== undefined
                        ? Number(apiUser.external_id)
                        : undefined,
                password: '',
            });

            try {
                const serversRes = await axios.get(`/api/admin/users/${resolvedParams.uuid}/servers`, {
                    params: { limit: 50 },
                });
                setOwnedServers(serversRes.data?.data?.servers || []);
            } catch {
                setOwnedServers([]);
            }

            try {
                const vmsRes = await axios.get(`/api/admin/users/${resolvedParams.uuid}/vm-instances`, {
                    params: { limit: 50 },
                });
                setOwnedVms(vmsRes.data?.data?.instances || []);
            } catch {
                setOwnedVms([]);
            }

            try {
                const altsRes = await axios.get(`/api/admin/users/${resolvedParams.uuid}/potential-alts`);
                setPotentialAlts(altsRes.data?.data?.potential_alts || []);
                setAltSourceIps(altsRes.data?.data?.source_ips || []);
                setAltSourceDevices(altsRes.data?.data?.source_devices || []);
            } catch {
                setPotentialAlts([]);
                setAltSourceIps([]);
                setAltSourceDevices([]);
            }
        } catch {
            toast.error(t('admin.users.edit.error'));
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedParams.uuid]);

    const clearUserDevices = async () => {
        if (!user) return;
        if (
            !confirm(
                t('admin.users.edit.potential_alts.clear_user_confirm', {
                    username: user.username,
                }),
            )
        ) {
            return;
        }

        setClearingDevices(true);
        try {
            const { data } = await axios.delete(`/api/admin/users/${user.uuid}/devices`);
            if (data?.success) {
                toast.success(t('admin.users.edit.potential_alts.clear_user_success'));
                setPotentialAlts([]);
                setAltSourceDevices([]);
                await fetchUser();
            } else {
                toast.error(data?.message || t('admin.users.edit.potential_alts.clear_failed'));
            }
        } catch {
            toast.error(t('admin.users.edit.potential_alts.clear_failed'));
        } finally {
            setClearingDevices(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitting(true);
        try {
            const patchData: Partial<EditForm> = { ...editForm };

            if (!patchData.password || patchData.password.trim() === '') {
                delete patchData.password;
            }

            if (patchData.external_id === undefined || patchData.external_id === null || patchData.external_id === 0) {
                delete patchData.external_id;
            }

            const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, patchData);
            if (data?.success) {
                toast.success(t('admin.users.messages.updated'));
                await fetchUser();
            } else {
                toast.error(data?.message || t('admin.users.messages.update_failed'));
            }
        } catch (error: unknown) {
            console.error(error);
            toast.error(t('admin.users.messages.update_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const toggleBanUser = async () => {
        if (!user) return;

        const currentlyBanned = user.banned === 'true';
        if (currentlyBanned) {
            if (!confirm(t('admin.users.messages.unban_confirm'))) return;
            setBanSubmitting(true);
            try {
                const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, {
                    banned: 'false',
                });
                if (data?.success) {
                    toast.success(t('admin.users.messages.unbanned'));
                    await fetchUser();
                } else {
                    toast.error(data?.message || t('admin.users.messages.ban_failed'));
                }
            } catch (error: unknown) {
                const message =
                    axios.isAxiosError(error) && error.response?.data?.message
                        ? String(error.response.data.message)
                        : t('admin.users.messages.ban_failed');
                toast.error(message);
            } finally {
                setBanSubmitting(false);
            }
            return;
        }

        setBanReason({ reason_category: '', reason_details: '' });
        setBanDialogOpen(true);
    };

    const confirmBanUser = async () => {
        if (!user || !isModerationReasonValid(banReason)) {
            toast.error(t('admin.moderation.reason_required'));
            return;
        }

        setBanSubmitting(true);
        try {
            const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, {
                banned: 'true',
                ...banReason,
            });
            if (data?.success) {
                toast.success(t('admin.users.messages.banned'));
                setBanDialogOpen(false);
                await fetchUser();
            } else {
                toast.error(data?.message || t('admin.users.messages.ban_failed'));
            }
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : t('admin.users.messages.ban_failed');
            toast.error(message);
        } finally {
            setBanSubmitting(false);
        }
    };

    const disable2FA = async () => {
        if (!user) return;
        try {
            const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, {
                two_fa_enabled: 'false',
                two_fa_key: null,
            });
            if (data?.success) {
                toast.success(t('admin.users.messages.2fa_disabled'));
                await fetchUser();
            } else {
                toast.error(data?.message || t('admin.users.messages.2fa_failed'));
            }
        } catch {
            toast.error(t('admin.users.messages.2fa_failed'));
        }
    };

    const unlinkDiscord = async () => {
        if (!user) return;
        if (!confirm(t('admin.users.messages.discord_confirm'))) {
            return;
        }
        try {
            const { data } = await axios.patch(`/api/admin/users/${user.uuid}`, {
                discord_oauth2_linked: 'false',
                discord_oauth2_id: null,
                discord_oauth2_access_token: null,
                discord_oauth2_username: null,
                discord_oauth2_name: null,
            });
            if (data?.success) {
                toast.success(t('admin.users.messages.discord_unlinked'));
                await fetchUser();
            } else {
                toast.error(data?.message || t('admin.users.messages.discord_failed'));
            }
        } catch {
            toast.error(t('admin.users.messages.discord_failed'));
        }
    };

    const generateSsoLoginLink = async () => {
        if (!user) return;

        setSsoGenerating(true);
        try {
            const { data } = await axios.post(`/api/admin/users/${user.uuid}/sso-token`);
            if (data?.success && data.data?.token) {
                const origin = window.location.origin;
                const configuredRedirectPath = String(settings?.app_sso_redirect_path || '/').trim();
                const normalizedRedirectPath =
                    configuredRedirectPath.length > 0
                        ? configuredRedirectPath.startsWith('/')
                            ? configuredRedirectPath
                            : `/${configuredRedirectPath}`
                        : '/';

                setSsoLink(
                    `${origin}/auth/login?sso_token=${encodeURIComponent(data.data.token)}&redirect=${encodeURIComponent(normalizedRedirectPath)}`,
                );
                toast.success(t('admin.users.messages.sso_generated'));
            } else {
                toast.error(data?.message || t('admin.users.messages.sso_failed'));
            }
        } catch {
            toast.error(t('admin.users.messages.sso_failed'));
        } finally {
            setSsoGenerating(false);
        }
    };

    const showMailPreview = (mail: { subject: string; body?: string; status: string; created_at: string }) => {
        setMailPreview(mail);
        setMailPreviewOpen(true);
    };

    const handleResendMail = async (mail: { id: number; subject: string; status: string }) => {
        if (!user) return;

        setResendingMailId(mail.id);
        try {
            const { data } = await axios.post(`/api/admin/users/${user.uuid}/mails/${mail.id}/resend`);
            if (data?.success) {
                toast.success(t('admin.users.edit.mails.resend_success'));
                await fetchUser();
            } else {
                toast.error(data?.message || t('admin.users.edit.mails.resend_failed'));
            }
        } catch (error: unknown) {
            const message =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? String(error.response.data.message)
                    : t('admin.users.edit.mails.resend_failed');
            toast.error(message);
        } finally {
            setResendingMailId(null);
        }
    };

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const subject = sendEmailData.subject.trim();
        const body = sendEmailData.body.trim();

        if (!subject || !body) {
            toast.error(t('admin.users.messages.send_email_required'));
            return;
        }

        setSendingEmail(true);
        try {
            const { data } = await axios.post(`/api/admin/users/${user.uuid}/send-email`, {
                subject,
                body,
            });

            if (data?.success) {
                toast.success(t('admin.users.messages.email_sent'));
                setSendEmailOpen(false);
                setSendEmailData({ subject: '', body: '' });
                await fetchUser();
            } else {
                toast.error(data?.message || t('admin.users.messages.email_send_failed'));
            }
        } catch (error: unknown) {
            const message = axios.isAxiosError(error)
                ? (error.response?.data?.message ?? error.message)
                : t('admin.users.messages.email_send_failed');
            toast.error(message);
        } finally {
            setSendingEmail(false);
        }
    };

    if (loading) {
        return (
            <div className='flex min-h-[50vh] items-center justify-center'>
                <div className='flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                    <span className='text-muted-foreground'>{t('admin.users.edit.loading')}</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className='flex min-h-[50vh] flex-col items-center justify-center space-y-4'>
                <AlertTriangle className='text-destructive h-12 w-12' />
                <p className='text-xl font-semibold'>{t('admin.users.edit.error')}</p>
                <Button variant='outline' onClick={() => router.push('/admin/users')}>
                    <ArrowLeft className='mr-2 h-4 w-4' />
                    {t('admin.users.back_to_list')}
                </Button>
            </div>
        );
    }

    const widgetContext = {
        id: user.uuid,
        ...(user.id != null && user.id !== undefined ? { userId: user.id } : {}),
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-users-edit', 'top-of-page')} context={widgetContext} />

            <PageHeader
                title={t('admin.users.edit.title', { username: user.username })}
                description={t('admin.users.edit.description')}
                icon={User}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/users')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('admin.users.back_to_list')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-users-edit', 'after-header')} context={widgetContext} />

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
                <div className='space-y-6 lg:col-span-2'>
                    <PageCard title={t('admin.users.edit.form.title')} icon={User} className='h-full'>
                        <form onSubmit={handleSubmit} className='space-y-6'>
                            <div>
                                <Label htmlFor='edit-username'>{t('admin.users.edit.form.username')}</Label>
                                <Input
                                    id='edit-username'
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    placeholder={t('admin.users.create.form.username_placeholder')}
                                    required
                                    className='mt-2'
                                />
                            </div>

                            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                                <div>
                                    <Label htmlFor='edit-firstname'>{t('admin.users.edit.form.first_name')}</Label>
                                    <Input
                                        id='edit-firstname'
                                        value={editForm.first_name}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        placeholder={t('admin.users.create.form.first_name_placeholder')}
                                        className='mt-2'
                                    />
                                </div>
                                <div>
                                    <Label htmlFor='edit-lastname'>{t('admin.users.edit.form.last_name')}</Label>
                                    <Input
                                        id='edit-lastname'
                                        value={editForm.last_name}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        placeholder={t('admin.users.create.form.last_name_placeholder')}
                                        className='mt-2'
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor='edit-email'>{t('admin.users.edit.form.email')}</Label>
                                <Input
                                    id='edit-email'
                                    type='email'
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    placeholder={t('admin.users.create.form.email_placeholder')}
                                    required
                                    className='mt-2'
                                />
                            </div>

                            <div>
                                <Label htmlFor='edit-role'>{t('admin.users.edit.form.role')}</Label>
                                <Select
                                    id='edit-role'
                                    value={editForm.role_id}
                                    onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                                    required
                                    className='mt-2 w-full'
                                >
                                    <option value=''>{t('admin.users.create.form.select_role')}</option>
                                    {availableRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.display_name}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor='edit-externalid'>{t('admin.users.edit.form.external_id')}</Label>
                                <Input
                                    id='edit-externalid'
                                    type='number'
                                    value={editForm.external_id ?? ''}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            external_id: e.target.value === '' ? undefined : Number(e.target.value),
                                        })
                                    }
                                    placeholder={t('admin.users.edit.form.external_id_help')}
                                    className='mt-2'
                                />
                                <p className='text-muted-foreground mt-1.5 text-xs'>
                                    {t('admin.users.edit.form.external_id_help')}
                                </p>
                            </div>

                            <div>
                                <Label htmlFor='edit-password'>{t('admin.users.edit.form.password')}</Label>
                                <Input
                                    id='edit-password'
                                    type='password'
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    placeholder={t('admin.users.edit.form.password_placeholder')}
                                    className='mt-2'
                                />
                                <p className='text-muted-foreground mt-1.5 text-xs'>
                                    {t('admin.users.edit.form.password_help')}
                                </p>
                            </div>

                            <div className='border-border/50 flex justify-end border-t pt-4'>
                                <Button type='submit' disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                            {t('admin.users.messages.updating')}
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className='mr-2 h-4 w-4' />
                                            {t('admin.users.edit.form.save')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </PageCard>
                </div>

                <div className='space-y-6'>
                    <PageCard title={t('admin.users.edit.account_info.title')} icon={User}>
                        <div className='mb-6 flex flex-col items-center'>
                            <Avatar className='ring-background mb-4 h-24 w-24 shadow-lg ring-4'>
                                <AvatarImage src={user.avatar} alt={user.username} />
                            </Avatar>
                            <h2 className='text-xl font-bold'>{user.username}</h2>
                            <p className='text-muted-foreground text-sm'>{user.email}</p>

                            <div className='mt-4 flex flex-wrap justify-center gap-2'>
                                {user.role ? (
                                    <RoleBadge role={user.role} variant='solid' size='sm' />
                                ) : (
                                    <Badge variant='secondary'>-</Badge>
                                )}
                                <Badge variant={user.banned === 'true' ? 'destructive' : 'secondary'}>
                                    {user.banned === 'true'
                                        ? t('admin.users.badges.banned')
                                        : t('admin.users.badges.active')}
                                </Badge>
                                <Badge variant={user.two_fa_enabled === 'true' ? 'secondary' : 'outline'}>
                                    {user.two_fa_enabled === 'true'
                                        ? t('admin.users.badges.2fa')
                                        : t('admin.users.badges.no_2fa')}
                                </Badge>
                                {user.discord_oauth2_linked === 'true' && (
                                    <Badge className='border-[#5865F2]/20 bg-[#5865F2]/10 text-[#5865F2]'>
                                        {t('admin.users.badges.discord_linked')}
                                    </Badge>
                                )}
                                {user.ldap_provider_uuid && user.ldap_dn ? (
                                    <Badge className='border-purple-500/20 bg-purple-500/10 text-purple-600'>
                                        {t('admin.users.badges.ldap')}
                                    </Badge>
                                ) : user.oidc_provider && user.oidc_subject ? (
                                    <Badge className='border-cyan-500/20 bg-cyan-500/10 text-cyan-600'>
                                        {t('admin.users.badges.oidc')}
                                    </Badge>
                                ) : (
                                    <Badge className='border-gray-500/20 bg-gray-500/10 text-gray-600'>
                                        {t('admin.users.badges.local')}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className='border-border/50 space-y-3 border-t pt-4 text-sm'>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>
                                    {t('admin.users.edit.account_info.user_id')}
                                </span>
                                <span className='font-mono'>{user.id}</span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>{t('admin.users.edit.account_info.uuid')}</span>
                                <span className='font-mono text-xs' title={user.uuid}>
                                    {user.uuid.substring(0, 8)}...
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>
                                    {t('admin.users.edit.account_info.created')}
                                </span>
                                <span title={formatDateTimeInTz(user.created_at || user.first_seen, dateOpts)}>
                                    {formatDateTimeInTz(user.created_at || user.first_seen, dateOpts)}
                                </span>
                            </div>
                            <div className='flex justify-between'>
                                <span className='text-muted-foreground'>
                                    {t('admin.users.edit.account_info.last_seen')}
                                </span>
                                <span title={user.last_seen ? formatDateTimeInTz(user.last_seen, dateOpts) : undefined}>
                                    {user.last_seen ? formatRelativeTime(user.last_seen, dateOpts) : '-'}
                                </span>
                            </div>
                            {user.last_ip && (
                                <div className='flex justify-between'>
                                    <span className='text-muted-foreground'>
                                        {t('admin.users.edit.account_info.last_ip')}
                                    </span>
                                    <span className='font-mono'>{user.last_ip}</span>
                                </div>
                            )}
                            {user.first_ip && (
                                <div className='flex justify-between'>
                                    <span className='text-muted-foreground'>
                                        {t('admin.users.edit.account_info.first_ip')}
                                    </span>
                                    <span className='font-mono'>{user.first_ip}</span>
                                </div>
                            )}
                            {user.discord_oauth2_username && (
                                <div className='border-border/50 mt-4 flex justify-between border-t pt-4'>
                                    <span className='text-muted-foreground'>
                                        {t('admin.users.edit.account_info.discord_user')}
                                    </span>
                                    <span className='font-medium'>{user.discord_oauth2_username}</span>
                                </div>
                            )}
                            {user.discord_oauth2_id && (
                                <div className='flex justify-between'>
                                    <span className='text-muted-foreground'>
                                        {t('admin.users.edit.account_info.discord_id')}
                                    </span>
                                    <span className='font-mono text-xs'>{user.discord_oauth2_id}</span>
                                </div>
                            )}
                        </div>
                    </PageCard>

                    <PageCard title={t('admin.users.edit.actions.title')} icon={Shield} variant='default'>
                        <div className='space-y-4'>
                            <ModerationStatusCard
                                active={user.banned === 'true'}
                                reason={user.ban_reason}
                                actedAt={user.banned_at}
                                actedBy={user.banned_by}
                                title={t('admin.moderation.user_banned_title')}
                                inactiveLabel={t('admin.moderation.user_not_banned')}
                            />

                            <Button
                                variant={user.banned === 'true' ? 'default' : 'destructive'}
                                className='w-full justify-start'
                                onClick={toggleBanUser}
                                loading={banSubmitting}
                            >
                                {user.banned === 'true' ? (
                                    <>
                                        <Unlock className='mr-2 h-4 w-4' /> {t('admin.users.edit.unban_user')}
                                    </>
                                ) : (
                                    <>
                                        <Ban className='mr-2 h-4 w-4' /> {t('admin.users.edit.ban_user')}
                                    </>
                                )}
                            </Button>

                            {user.two_fa_enabled === 'true' && (
                                <Button variant='destructive' className='w-full justify-start' onClick={disable2FA}>
                                    <Shield className='mr-2 h-4 w-4' /> {t('admin.users.edit.disable_2fa')}
                                </Button>
                            )}

                            {user.discord_oauth2_linked === 'true' && (
                                <Button variant='destructive' className='w-full justify-start' onClick={unlinkDiscord}>
                                    <Trash2 className='mr-2 h-4 w-4' /> {t('admin.users.edit.unlink_discord')}
                                </Button>
                            )}
                        </div>

                        <div className='border-border/50 mt-6 border-t pt-6'>
                            <Label className='text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase'>
                                {t('admin.users.edit.actions.sso.title')}
                            </Label>
                            <div className='space-y-2'>
                                {ssoLink ? (
                                    <div className='flex gap-2'>
                                        <Input value={ssoLink} readOnly className='h-10 font-mono text-xs' />
                                        <Button size='icon' variant='outline' onClick={() => copyToClipboard(ssoLink)}>
                                            <Copy className='h-4 w-4' />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant='secondary'
                                        className='w-full'
                                        onClick={generateSsoLoginLink}
                                        disabled={ssoGenerating}
                                    >
                                        {ssoGenerating ? (
                                            <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <Key className='mr-2 h-4 w-4' />
                                        )}
                                        {t('admin.users.edit.actions.sso.generate')}
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className='border-border/50 mt-6 border-t pt-6'>
                            <Label className='text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase'>
                                {t('admin.users.edit.actions.email.title', { defaultValue: 'Direct Email' })}
                            </Label>
                            <Button variant='secondary' className='w-full' onClick={() => setSendEmailOpen(true)}>
                                <Mail className='mr-2 h-4 w-4' />
                                {t('admin.users.edit.actions.email.compose', { defaultValue: 'Compose email' })}
                            </Button>
                        </div>
                    </PageCard>
                </div>
            </div>

            <Tabs defaultValue='servers' className='w-full'>
                <div className='mb-4 flex items-center justify-between'>
                    <TabsList>
                        <TabsTrigger value='servers' className='gap-2'>
                            <ServerIcon className='h-4 w-4' />
                            {t('admin.users.edit.tabs.servers')}
                        </TabsTrigger>
                        <TabsTrigger value='activities' className='gap-2'>
                            <Activity className='h-4 w-4' />
                            {t('admin.users.edit.tabs.activities')}
                        </TabsTrigger>
                        <TabsTrigger value='potential-alts' className='gap-2'>
                            <Users className='h-4 w-4' />
                            {t('admin.users.edit.tabs.potential_alts')}
                            {potentialAlts.length > 0 && (
                                <Badge variant='secondary' className='ml-1 h-5 min-w-5 px-1.5'>
                                    {potentialAlts.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value='vds' className='gap-2'>
                            <ServerIcon className='h-4 w-4' />
                            {t('admin.users.edit.tabs.vds', { defaultValue: 'VDS' })}
                        </TabsTrigger>
                        <TabsTrigger value='mails' className='gap-2'>
                            <Mail className='h-4 w-4' />
                            {t('admin.users.edit.tabs.mails')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value='servers'>
                    <PageCard
                        title={t('admin.users.edit.servers.title')}
                        icon={ServerIcon}
                        action={
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => router.push(`/admin/users/${resolvedParams.uuid}/servers`)}
                            >
                                {t('admin.users.edit.servers.viewAll', { defaultValue: 'View all servers' })}
                            </Button>
                        }
                    >
                        <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b border-white/5 text-left'>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.servers.name')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.servers.status')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.servers.created')}
                                        </th>
                                        <th className='text-muted-foreground p-4 text-right font-medium'>
                                            {t('admin.users.edit.servers.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ownedServers.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className='text-muted-foreground p-8 text-center'>
                                                {t('admin.users.edit.servers.no_servers')}
                                            </td>
                                        </tr>
                                    ) : (
                                        ownedServers.map((server) => (
                                            <tr
                                                key={server.id}
                                                className='border-b border-white/5 transition-colors last:border-0 hover:bg-white/5'
                                            >
                                                <td className='p-4'>
                                                    <div className='font-medium'>{server.name}</div>
                                                    <div className='text-muted-foreground text-xs'>
                                                        {server.uuidShort}
                                                    </div>
                                                </td>
                                                <td className='p-4'>
                                                    <Badge
                                                        variant={
                                                            server.status === 'Online' ? 'secondary' : 'destructive'
                                                        }
                                                    >
                                                        {server.status || t('admin.users.edit.servers.offline')}
                                                    </Badge>
                                                </td>
                                                <td className='text-muted-foreground p-4'>
                                                    {formatDateTimeInTz(server.created_at, dateOpts)}
                                                </td>
                                                <td className='p-4 text-right'>
                                                    <div className='flex justify-end gap-2'>
                                                        <Button
                                                            size='sm'
                                                            variant='ghost'
                                                            onClick={() =>
                                                                (window.location.href = `/server/${server.uuidShort}`)
                                                            }
                                                        >
                                                            <ExternalLink className='h-4 w-4' />
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            variant='ghost'
                                                            onClick={() =>
                                                                (window.location.href = `/admin/servers/${server.id}/edit`)
                                                            }
                                                        >
                                                            <Edit className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='activities'>
                    <PageCard title={t('admin.users.edit.activities.title')} icon={Activity}>
                        <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b border-white/5 text-left'>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.activities.name')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.activities.context')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.activities.ip')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.activities.created')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!user.activities || user.activities.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className='text-muted-foreground p-8 text-center'>
                                                {t('admin.users.edit.activities.no_activities')}
                                            </td>
                                        </tr>
                                    ) : (
                                        user.activities.map((activity, index) => (
                                            <tr
                                                key={index}
                                                className='border-b border-white/5 transition-colors last:border-0 hover:bg-white/5'
                                            >
                                                <td className='p-4 font-medium'>{activity.name}</td>
                                                <td className='text-muted-foreground p-4'>{activity.context}</td>
                                                <td className='p-4 font-mono text-xs'>{activity.ip_address}</td>
                                                <td className='text-muted-foreground p-4'>
                                                    {formatDateTimeInTz(activity.created_at, dateOpts)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='potential-alts'>
                    <PageCard
                        title={t('admin.users.edit.potential_alts.title')}
                        icon={Users}
                        action={
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={clearUserDevices}
                                loading={clearingDevices}
                                disabled={altSourceDevices.length === 0 && potentialAlts.length === 0}
                            >
                                <Trash2 className='mr-2 h-4 w-4' />
                                {t('admin.users.edit.potential_alts.clear_user')}
                            </Button>
                        }
                    >
                        <p className='text-muted-foreground mb-4 text-sm'>
                            {t('admin.users.edit.potential_alts.description')}
                        </p>
                        {altSourceIps.length > 0 && (
                            <div className='mb-6 rounded-lg border border-white/5 bg-white/5 p-4'>
                                <p className='text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase'>
                                    {t('admin.users.edit.potential_alts.source_ips')}
                                </p>
                                <div className='flex flex-wrap gap-2'>
                                    {altSourceIps.map((ip) => (
                                        <Badge key={ip} variant='outline' className='font-mono text-xs'>
                                            {ip}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {altSourceDevices.length > 0 && (
                            <div className='mb-6 rounded-lg border border-white/5 bg-white/5 p-4'>
                                <p className='text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase'>
                                    {t('admin.users.edit.potential_alts.source_devices')}
                                </p>
                                <div className='flex flex-wrap gap-2'>
                                    {altSourceDevices.map((device) => (
                                        <Badge key={device} variant='outline' className='font-mono text-xs'>
                                            {device.slice(0, 12)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b border-white/5 text-left'>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.potential_alts.user')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.potential_alts.role')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.potential_alts.signals')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.potential_alts.confidence')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.potential_alts.last_seen')}
                                        </th>
                                        <th className='text-muted-foreground p-4 text-right font-medium'>
                                            {t('admin.users.edit.potential_alts.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {potentialAlts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className='text-muted-foreground p-8 text-center'>
                                                {t('admin.users.edit.potential_alts.empty')}
                                            </td>
                                        </tr>
                                    ) : (
                                        potentialAlts.map((alt) => (
                                            <tr
                                                key={alt.uuid}
                                                className='border-b border-white/5 transition-colors last:border-0 hover:bg-white/5'
                                            >
                                                <td className='p-4'>
                                                    <div className='flex items-center gap-3'>
                                                        <Avatar className='h-8 w-8'>
                                                            <AvatarImage src={alt.avatar} alt={alt.username} />
                                                        </Avatar>
                                                        <div>
                                                            <div className='font-medium'>{alt.username}</div>
                                                            <div className='text-muted-foreground text-xs'>
                                                                {alt.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className='p-4'>
                                                    <div className='flex flex-wrap gap-1'>
                                                        {alt.role ? (
                                                            <RoleBadge role={alt.role} variant='solid' size='sm' />
                                                        ) : (
                                                            <Badge variant='secondary'>-</Badge>
                                                        )}
                                                        {alt.banned === 'true' && (
                                                            <Badge variant='destructive'>
                                                                {t('admin.users.badges.banned')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className='p-4'>
                                                    <div className='space-y-2'>
                                                        {alt.shared_ips.length > 0 && (
                                                            <div className='flex max-w-xs flex-wrap gap-1'>
                                                                {alt.shared_ips.map((ip) => (
                                                                    <Badge
                                                                        key={`ip-${ip}`}
                                                                        variant='outline'
                                                                        className='font-mono text-xs'
                                                                        title={t(
                                                                            'admin.users.edit.potential_alts.match_ip',
                                                                        )}
                                                                    >
                                                                        {ip}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {alt.shared_devices.length > 0 && (
                                                            <div className='flex max-w-xs flex-wrap gap-1'>
                                                                {alt.shared_devices.map((device) => (
                                                                    <Badge
                                                                        key={`dev-${device}`}
                                                                        variant='secondary'
                                                                        className='font-mono text-xs'
                                                                        title={t(
                                                                            'admin.users.edit.potential_alts.match_device',
                                                                        )}
                                                                    >
                                                                        {device}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {alt.match_reasons.length > 0 && (
                                                            <div className='text-muted-foreground text-xs'>
                                                                {alt.match_reasons
                                                                    .map((reason) =>
                                                                        t(
                                                                            `admin.users.edit.potential_alts.reasons.${reason}`,
                                                                            { defaultValue: reason },
                                                                        ),
                                                                    )
                                                                    .join(' · ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className='p-4'>
                                                    <Badge
                                                        variant={
                                                            alt.confidence === 'high'
                                                                ? 'destructive'
                                                                : alt.confidence === 'medium'
                                                                  ? 'secondary'
                                                                  : 'outline'
                                                        }
                                                    >
                                                        {t(
                                                            `admin.users.edit.potential_alts.confidence_${alt.confidence || 'low'}`,
                                                            { defaultValue: alt.confidence || 'low' },
                                                        )}
                                                    </Badge>
                                                    <div className='text-muted-foreground mt-1 text-xs'>
                                                        {alt.match_count}{' '}
                                                        {t('admin.users.edit.potential_alts.match_total')}
                                                    </div>
                                                </td>
                                                <td className='text-muted-foreground p-4'>
                                                    <span
                                                        title={
                                                            alt.last_seen
                                                                ? formatDateTimeInTz(alt.last_seen, dateOpts)
                                                                : undefined
                                                        }
                                                    >
                                                        {alt.last_seen
                                                            ? formatRelativeTime(alt.last_seen, dateOpts)
                                                            : '—'}
                                                    </span>
                                                </td>
                                                <td className='p-4 text-right'>
                                                    <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        onClick={() => router.push(`/admin/users/${alt.uuid}/edit`)}
                                                    >
                                                        <ExternalLink className='h-4 w-4' />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='vds'>
                    <PageCard
                        title={t('admin.users.edit.vds.title', { defaultValue: 'Owned VDS' })}
                        icon={ServerIcon}
                        action={
                            <Button variant='outline' size='sm' onClick={() => router.push('/admin/vm-instances')}>
                                {t('admin.users.edit.vds.viewAll', { defaultValue: 'View all VDS' })}
                            </Button>
                        }
                    >
                        <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b border-white/5 text-left'>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.vds.hostname', { defaultValue: 'Hostname' })}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.vds.status', { defaultValue: 'Status' })}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.vds.ip', { defaultValue: 'IP' })}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.vds.node', { defaultValue: 'Node' })}
                                        </th>
                                        <th className='text-muted-foreground p-4 text-right font-medium'>
                                            {t('admin.users.edit.vds.actions', { defaultValue: 'Actions' })}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ownedVms.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className='text-muted-foreground p-8 text-center'>
                                                {t('admin.users.edit.vds.empty', {
                                                    defaultValue: 'This user does not own any VDS.',
                                                })}
                                            </td>
                                        </tr>
                                    ) : (
                                        ownedVms.map((vm) => (
                                            <tr
                                                key={vm.id}
                                                className='border-b border-white/5 transition-colors last:border-0 hover:bg-white/5'
                                            >
                                                <td className='p-4'>
                                                    <div className='font-medium'>{vm.hostname || `VM #${vm.id}`}</div>
                                                    <div className='text-muted-foreground text-xs'>
                                                        {vm.vm_type?.toUpperCase() || 'QEMU'} • VMID {vm.vmid}
                                                    </div>
                                                </td>
                                                <td className='p-4'>
                                                    <Badge
                                                        variant={
                                                            vm.suspended === 1 || vm.status === 'suspended'
                                                                ? 'destructive'
                                                                : vm.status === 'running'
                                                                  ? 'secondary'
                                                                  : 'outline'
                                                        }
                                                    >
                                                        {vm.suspended === 1 || vm.status === 'suspended'
                                                            ? t('vds.console.status.suspended', {
                                                                  defaultValue: 'Suspended',
                                                              })
                                                            : vm.status || t('vds.console.status.unknown')}
                                                    </Badge>
                                                </td>
                                                <td className='p-4 font-mono text-xs'>{vm.ip_address || '—'}</td>
                                                <td className='text-muted-foreground p-4'>
                                                    {vm.node_name || vm.pve_node || '—'}
                                                </td>
                                                <td className='p-4 text-right'>
                                                    <div className='flex justify-end gap-2'>
                                                        <Button
                                                            size='sm'
                                                            variant='ghost'
                                                            onClick={() => router.push(`/vds/${vm.id}`)}
                                                        >
                                                            <ExternalLink className='h-4 w-4' />
                                                        </Button>
                                                        <Button
                                                            size='sm'
                                                            variant='ghost'
                                                            onClick={() =>
                                                                router.push(`/admin/vm-instances/${vm.id}/edit`)
                                                            }
                                                        >
                                                            <Edit className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </PageCard>
                </TabsContent>

                <TabsContent value='mails'>
                    <PageCard title={t('admin.users.edit.mails.title')} icon={Mail}>
                        <div className='overflow-x-auto'>
                            <table className='w-full text-sm'>
                                <thead>
                                    <tr className='border-b border-white/5 text-left'>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.mails.subject')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.mails.status')}
                                        </th>
                                        <th className='text-muted-foreground p-4 font-medium'>
                                            {t('admin.users.edit.mails.created')}
                                        </th>
                                        <th className='text-muted-foreground p-4 text-right font-medium'>
                                            {t('admin.users.edit.mails.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {!user.mails || user.mails.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className='text-muted-foreground p-8 text-center'>
                                                {t('admin.users.edit.mails.no_mails')}
                                            </td>
                                        </tr>
                                    ) : (
                                        user.mails.map((mail) => (
                                            <tr
                                                key={mail.id}
                                                className='border-b border-white/5 transition-colors last:border-0 hover:bg-white/5'
                                            >
                                                <td className='p-4 font-medium'>{mail.subject}</td>
                                                <td className='p-4'>
                                                    <Badge
                                                        variant={
                                                            mail.status === 'sent'
                                                                ? 'secondary'
                                                                : mail.status === 'failed'
                                                                  ? 'destructive'
                                                                  : 'outline'
                                                        }
                                                    >
                                                        {mail.status}
                                                    </Badge>
                                                </td>
                                                <td className='text-muted-foreground p-4'>
                                                    {formatDateTimeInTz(mail.created_at, dateOpts)}
                                                </td>
                                                <td className='p-4 text-right'>
                                                    <div className='flex justify-end gap-2'>
                                                        <Button
                                                            size='sm'
                                                            variant='outline'
                                                            onClick={() => showMailPreview(mail)}
                                                        >
                                                            {t('admin.users.edit.mails.preview')}
                                                        </Button>
                                                        {mail.status === 'failed' && (
                                                            <Button
                                                                size='sm'
                                                                variant='outline'
                                                                disabled={resendingMailId === mail.id}
                                                                onClick={() => handleResendMail(mail)}
                                                            >
                                                                <RotateCcw
                                                                    className={`mr-1 h-4 w-4 ${resendingMailId === mail.id ? 'animate-spin' : ''}`}
                                                                />
                                                                {t('admin.users.edit.mails.resend')}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </PageCard>
                </TabsContent>
            </Tabs>

            <Dialog open={mailPreviewOpen} onOpenChange={setMailPreviewOpen}>
                <DialogContent className='max-w-2xl'>
                    <DialogHeader>
                        <DialogTitle>{mailPreview?.subject}</DialogTitle>
                        <DialogDescription>
                            {mailPreview?.created_at ? formatDateTimeInTz(mailPreview.created_at, dateOpts) : '—'} |{' '}
                            {mailPreview?.status}
                        </DialogDescription>
                    </DialogHeader>
                    <div className='bg-muted/50 mt-4 max-h-[60vh] overflow-auto rounded-xl border p-4'>
                        <div
                            className='prose prose-sm dark:prose-invert max-w-none'
                            dangerouslySetInnerHTML={{ __html: mailPreview?.body || '' }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
                <DialogContent className='max-w-2xl'>
                    <DialogHeader>
                        <DialogTitle>
                            {t('admin.users.edit.actions.email.title', { defaultValue: 'Direct Email' })}
                        </DialogTitle>
                        <DialogDescription>
                            {t('admin.users.edit.actions.email.description', {
                                defaultValue: 'Send an email directly to this user. HTML is supported in the body.',
                            })}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSendEmail} className='mt-2 space-y-4'>
                        <div>
                            <Label htmlFor='send-email-recipient'>
                                {t('admin.users.edit.actions.email.to', { defaultValue: 'To' })}
                            </Label>
                            <Input id='send-email-recipient' value={user.email || ''} readOnly className='mt-2' />
                        </div>

                        <div>
                            <Label htmlFor='send-email-subject'>
                                {t('admin.users.edit.actions.email.subject', { defaultValue: 'Subject' })}
                            </Label>
                            <Input
                                id='send-email-subject'
                                value={sendEmailData.subject}
                                onChange={(e) => setSendEmailData((v) => ({ ...v, subject: e.target.value }))}
                                placeholder={t('admin.users.edit.actions.email.subject_placeholder', {
                                    defaultValue: 'Enter subject',
                                })}
                                maxLength={255}
                                className='mt-2'
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor='send-email-body'>
                                {t('admin.users.edit.actions.email.body', { defaultValue: 'HTML Body' })}
                            </Label>
                            <Textarea
                                id='send-email-body'
                                value={sendEmailData.body}
                                onChange={(e) => setSendEmailData((v) => ({ ...v, body: e.target.value }))}
                                placeholder={t('admin.users.edit.actions.email.body_placeholder', {
                                    defaultValue: '<h1>Hello</h1><p>Your message here</p>',
                                })}
                                rows={10}
                                className='mt-2 font-mono text-sm'
                                required
                            />
                        </div>

                        <div className='flex justify-end gap-2'>
                            <Button type='button' variant='outline' onClick={() => setSendEmailOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button type='submit' disabled={sendingEmail}>
                                {sendingEmail ? (
                                    <>
                                        <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                        {t('admin.users.messages.sending_email', { defaultValue: 'Sending...' })}
                                    </>
                                ) : (
                                    <>
                                        <Mail className='mr-2 h-4 w-4' />
                                        {t('admin.users.edit.actions.email.send', { defaultValue: 'Send Email' })}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <AlertDialogContent className='max-w-lg'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='flex items-center gap-2'>
                            <AlertTriangle className='h-5 w-5 text-red-500' />
                            {t('admin.users.edit.ban_confirm_title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.users.edit.ban_confirm_description', { username: user.username })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <ModerationReasonFields value={banReason} onChange={setBanReason} disabled={banSubmitting} />
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={banSubmitting}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void confirmBanUser();
                            }}
                            className='bg-red-600 hover:bg-red-700'
                            disabled={banSubmitting || !isModerationReasonValid(banReason)}
                        >
                            {banSubmitting ? t('common.loading') : t('admin.users.edit.ban_user')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <WidgetRenderer widgets={getWidgets('admin-users-edit', 'bottom-of-page')} context={widgetContext} />
        </div>
    );
}
